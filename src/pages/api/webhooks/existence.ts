import { type NextApiHandler } from "next";
import {
  matches,
  playersWaitingForMatch,
  playingUsers,
  queuedUpUsers,
} from "~/server/matchmaking";
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

    if (matches.has(channelUuid) && playingUsers.has(channelUuid)) {
      const match = matches.get(channelUuid);
      const white = match?.white.id;
      const black = match?.black.id;

      matches.delete(channelUuid);
      if (white) {
        playingUsers.delete(white);
      }
      if (black) {
        playingUsers.delete(black);
      }
      continue;
    }

    playersWaitingForMatch.forEach((tiersInTimeControl) => {
      tiersInTimeControl.forEach((gamesInTier) => {
        const index = gamesInTier.findIndex((game) => game.id === channelUuid);
        const matchWithOnePlayer = gamesInTier.splice(index, 1)[0];
        const playerId = matchWithOnePlayer?.white.id;
        if (playerId && queuedUpUsers.has(playerId)) {
          queuedUpUsers.delete(playerId);
        }
      });
    });
  }

  res.status(200).json({ message: "success" });
};

export default ExistenceWebhookHandler;
