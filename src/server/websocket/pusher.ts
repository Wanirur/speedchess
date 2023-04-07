import Pusher from "pusher";

import { env } from "~/env.mjs";

const pusher = new Pusher({
  appId: env.SOKETI_APP_ID,
  key: env.SOKETI_APP_KEY,
  secret: env.SOKETI_APP_SECRET,
  host: "127.0.0.1",
  port: "6001",
});

export default pusher;