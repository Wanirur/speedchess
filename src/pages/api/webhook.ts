import { type NextApiHandler } from "next";
import { playersWaitingForMatch } from "~/server/matchmaking";
import pusher from "~/server/pusher";

const WebhookHandler: NextApiHandler = (req, res) => {
  const webhookReq = {
    headers: req.headers,
    rawBody: JSON.stringify(req.body),
  };

  const webhook = pusher.webhook(webhookReq);
  const events = webhook.getEvents();
  const vacatedChannels = events
    .filter((item) => {
      return item.event === "channel_vacated";
    })
    .map((item) => item.channel);

  vacatedChannels.forEach((channel) => {
    playersWaitingForMatch.forEach((gamesInTier) => {
      console.log(gamesInTier);
      const index = gamesInTier.findIndex((game) => game.id === channel);
      gamesInTier.splice(index, 1);
      console.log(gamesInTier);
    });
  });

  res.status(200);
};

export default WebhookHandler;
