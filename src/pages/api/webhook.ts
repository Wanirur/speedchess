import { type NextApiHandler } from "next";
import { matches, playersWaitingForMatch } from "~/server/matchmaking";
import pusher from "~/server/pusher";

const WebhookHandler: NextApiHandler = async (req, res) => {
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
  const vacatedChannels = events
    .filter((event) => {
      return event.name === "channel_vacated";
    })
    .map((event) => event.channel);

  for (const channelUuid of vacatedChannels) {
    if (channelUuid.startsWith("presence-")) {
      continue;
    }

    if (matches.has(channelUuid)) {
      matches.delete(channelUuid);
      continue;
    }

    playersWaitingForMatch.forEach((gamesInTier) => {
      const index = gamesInTier.findIndex((game) => game.id === channelUuid);
      gamesInTier.splice(index, 1);
    });
  }

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

    console.log("it has it!");
    const userId = event.data;
    const match = matches.get(channelUuid);
    console.log(match);

    const abandonColor = match?.white.id === userId ? "WHITE" : "BLACK";
    await match?.abandon(abandonColor);
    console.log("abandoned");
  }

  res.status(200).json({ message: "success" });
};

export default WebhookHandler;
