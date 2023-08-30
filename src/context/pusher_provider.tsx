import {
  type ReactNode,
  createContext,
  useEffect,
  useContext,
  useState,
} from "react";

import PusherClient from "pusher-js";

import { env } from "~/env.mjs";

const getPusherInstance = () => {
  if (PusherClient.instances.length) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return PusherClient.instances[0]!;
  }

  return new PusherClient(env.NEXT_PUBLIC_SOKETI_APP_KEY, {
    cluster: "eu",
    enabledTransports: ["ws", "wss"],
    userAuthentication: {
      endpoint: "/api/pusher/user_auth",
      transport: "ajax",
    },
    channelAuthorization: {
      endpoint: "/api/pusher/channel_auth",
      transport: "ajax",
    },
  });
};

const PusherClientContext = createContext<PusherClient>(getPusherInstance());

export const usePusher = () => useContext(PusherClientContext);

const PusherProvider = ({ children }: { children: ReactNode }) => {
  const [pusherClient, setClient] = useState<PusherClient>(getPusherInstance());

  useEffect(() => {
    PusherClient.logToConsole = true;
  }, []);

  return (
    <PusherClientContext.Provider value={pusherClient}>
      {children}
    </PusherClientContext.Provider>
  );
};

export default PusherProvider;
