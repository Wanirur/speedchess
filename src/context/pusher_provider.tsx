import type Pusher from "pusher-js/types/src/core/pusher";
import {
  type ReactNode,
  createContext,
  useEffect,
  useRef,
  useContext,
} from "react";

import PusherClient from "pusher-js";

import { env } from "~/env.mjs";

const PusherClientContext = createContext<Pusher | null>(null);

export const usePusher = () => useContext(PusherClientContext);

const PusherProvider = ({ children }: { children: ReactNode }) => {
  const pusherClient = useRef<Pusher | null>(null);

  useEffect(() => {
    if (pusherClient.current !== null) {
      return;
    }

    pusherClient.current = new PusherClient(env.NEXT_PUBLIC_SOKETI_APP_KEY, {
      cluster: "eu",
      enabledTransports: ["ws", "wss"],
      userAuthentication: {
        endpoint: "/api/pusher_auth",
        transport: "ajax",
      },
    });

    PusherClient.logToConsole = true;
  }, []);

  return (
    <PusherClientContext.Provider value={pusherClient.current}>
      {children}
    </PusherClientContext.Provider>
  );
};

export default PusherProvider;
