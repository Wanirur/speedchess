import { type AppType } from "next/app";
import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

import { api } from "~/utils/api";

import "~/styles/globals.css";
import { useRouter } from "next/router";
import PusherProvider from "~/context/pusher_provider";
import { CookiesProvider } from "react-cookie";

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  const router = useRouter();
  return (
    <SessionProvider session={session}>
      <CookiesProvider>
        <PusherProvider>
          <Component key={router.asPath} {...pageProps} />
        </PusherProvider>
      </CookiesProvider>
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
