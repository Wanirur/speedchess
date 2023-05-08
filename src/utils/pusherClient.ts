import PusherClient from "pusher-js";

import { env } from "~/env.mjs";

const pusherClient = new PusherClient( env.NEXT_PUBLIC_SOKETI_APP_KEY, { 
  cluster: "eu",
  enabledTransports: ["ws", "wss"],
})

PusherClient.logToConsole = true;

export default pusherClient;