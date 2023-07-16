import { type AppType } from "next/app";
import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

import { api } from "~/utils/api";

import "~/styles/globals.css";
import { useRouter } from "next/router";
import Header from "~/components/header";
import Head from "next/head";
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
          <Head>
            <title>Create T3 App</title>
            <meta name="description" content="Generated by create-t3-app" />
            <link rel="icon" href="/favicon.ico" />
          </Head>

          <Header className="h-14 3xl:h-28 3xl:text-6xl"></Header>
          <Component key={router.asPath} {...pageProps} />
        </PusherProvider>
      </CookiesProvider>
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
