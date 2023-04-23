import { type NextApiHandler } from "next";
import type { WebHookRequest } from "pusher";
import { playersWaitingForMatch } from "~/server/matchmaking";
import pusher from "~/server/pusher";

const WebhookHandler: NextApiHandler = (req, res) => {
  const webhookReq = req as unknown as WebHookRequest;
  const webhook = pusher.webhook(webhookReq);
  const events = webhook.getEvents();
  const vacatedChannels = events
    .filter((item) => {
      return item.event === "channel_vacated";
    })
    .map((item) => item.channel);

  vacatedChannels.forEach((channel) => {
    playersWaitingForMatch.forEach((gamesInTier) => {
      gamesInTier.findIndex((game) => game.id === channel);
    });
  });

  res.status(200);
};

export default WebhookHandler;
