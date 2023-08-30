import Head from "next/head";
import { type HTMLAttributes } from "react";
import Header from "./header";

const Layout: React.FC<{ title: string } & HTMLAttributes<HTMLDivElement>> = ({
  children,
  title,
}) => {
  return (
    <>
      <Head>
        <title> {title} </title>
        <meta name="description" content="Play short time control chess" />
        <link rel="icon" href="/favicon.svg" />
        <meta property="og:title" content="speedchess.net" />
        <meta
          property="og:description"
          content="Play short time control chess"
        />
      </Head>

      <Header className="h-14 3xl:h-28 3xl:text-6xl"></Header>
      <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] items-center justify-center 3xl:min-h-[calc(100vh-7rem)]">
        {children}
      </main>
    </>
  );
};

export default Layout;
