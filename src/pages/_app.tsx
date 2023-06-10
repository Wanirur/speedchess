import { type AppType } from "next/app";
import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

import { api } from "~/utils/api";

import "~/styles/globals.css";
import { useRouter } from "next/router";
import Link from "next/link";

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  const router = useRouter();
  return (
    <SessionProvider session={session}>
      <header className="flex h-14 items-center bg-neutral-900 px-10 font-logo text-2xl font-semibold text-green-800">
        <Link href="/">
          speedchess<span className="opacity-60">.net</span>{" "}
        </Link>
      </header>
      <Component key={router.asPath} {...pageProps} />
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
