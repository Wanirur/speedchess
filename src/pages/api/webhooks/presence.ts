import { type NextApiHandler } from "next";
import { abandonTimeouts, matches } from "~/server/matchmaking";
import pusher from "~/server/pusher";

const PresenceWebhookHandler: NextApiHandler = (req, res) => {
  const webhookReq = {
    headers: req.headers,
    rawBody: JSON.stringify(req.body),
  };

  const webhook = pusher.webhook(webhookReq);
  if (!webhook.isValid()) {
    res.status(400).json({ message: "authorization failed" });
    return;
  }

  const events = webhook.getEvents();
  const removedMembers = events
    .filter((event) => {
      return event.name === "member_removed";
    })
    .map((event) => ({
      ...event,
      channel: event.channel.replace("presence-", ""),
    }));

  for (const event of removedMembers) {
    const channelUuid = event.channel;
    if (!matches.has(channelUuid)) {
      continue;
    }

    const userId = event.data;
    const match = matches.get(channelUuid);

    const abandonColor = match?.white.id === userId ? "BLACK" : "WHITE";
    abandonTimeouts.set(
      channelUuid,
      setTimeout(() => {
        void match?.abandon(abandonColor);
      }, 10_000)
    );
  }

  const addedMembers = events
    .filter((event) => {
      return event.name === "member_added";
    })
    .map((event) => ({
      ...event,
      channel: event.channel.replace("presence-", ""),
    }));

  for (const event of addedMembers) {
    const channelUuid = event.channel;
    if (!abandonTimeouts.has(channelUuid)) {
      continue;
    }

    const timeout = abandonTimeouts.get(channelUuid);
    abandonTimeouts.delete(channelUuid);
    clearTimeout(timeout);
  }

  res.status(200).json({ message: "success" });
};

export default PresenceWebhookHandler;
