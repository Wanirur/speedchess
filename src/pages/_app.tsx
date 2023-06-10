import { type AppType } from "next/app";
import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

import { api } from "~/utils/api";

import "~/styles/globals.css";
import { useRouter } from "next/router";
import Header from "~/components/header";

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  const router = useRouter();
  return (
    <SessionProvider session={session}>
      <Header></Header>
      <Component key={router.asPath} {...pageProps} />
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
