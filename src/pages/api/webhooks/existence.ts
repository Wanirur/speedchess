import { type NextApiHandler } from "next";
import { matches, playersWaitingForMatch } from "~/server/matchmaking";
import pusher from "~/server/pusher";

const ExistenceWebhookHandler: NextApiHandler = (req, res) => {
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

    playersWaitingForMatch.forEach((tiersInTimeControl) => {
      tiersInTimeControl.forEach((gamesInTier) => {
        const index = gamesInTier.findIndex((game) => game.id === channelUuid);
        gamesInTier.splice(index, 1);
      });
    });
  }

  res.status(200).json({ message: "success" });
};

export default ExistenceWebhookHandler;
