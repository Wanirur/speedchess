import Pusher from "pusher";
import { env } from "~/env.mjs";

export const pusher = new Pusher({
    appId: env.SOKETI_APP_ID,
    key: env.NEXT_PUBLIC_SOKETI_APP_KEY,
    secret: env.SOKETI_APP_SECRET,
    cluster: "eu",
    useTLS: true
  });

export default pusher;