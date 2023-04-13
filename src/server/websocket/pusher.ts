import Pusher from "pusher";
import PusherClient from "pusher-js";

import { env } from "~/env.mjs";

const pusher = new Pusher({
  appId: env.SOKETI_APP_ID,
  key: env.SOKETI_APP_KEY,
  secret: env.SOKETI_APP_SECRET,
  host: "127.0.0.1",
  port: "6001",
});

const pusherClient = new PusherClient( env.SOKETI_APP_KEY, { 
  cluster: "",
  wsHost: "127.0.0.1",
  wsPort: 6001,
  forceTLS: false,
  disableStats: true,
  enabledTransports: ['ws', 'wss'],
})

export default pusher;