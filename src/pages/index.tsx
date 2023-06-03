import { type NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import { signIn, signOut, useSession } from "next-auth/react";
import { api } from "~/utils/api";
import { useRouter } from "next/router";
import QueueDisplay from "~/components/queue";

const Home: NextPage = () => {
  const { data: sessionData } = useSession();

  return (
    <>
      <Head>
        <title>Create T3 App</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-900">
        {sessionData && sessionData.user && sessionData.user.image ? (
          <UserLoggedInView image={sessionData.user.image}></UserLoggedInView>
        ) : (
          <button
            className="rounded-md bg-green-700 p-4 font-os text-white"
            onClick={() => void signIn()}
          >
            Log in
          </button>
        )}

        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8"></div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-2xl text-white"></p>
          </div>
        </div>
      </main>
    </>
  );
};

const UserLoggedInView: React.FC<{ image: string }> = ({ image }) => {
  const router = useRouter();
  const queueUpMutation = api.chess.queueUp.useMutation({
    onSuccess: (data?: { uuid: string; gameStarted: boolean }) => {
      if (!data) {
        return;
      }

      if (data.gameStarted) {
        void router.push("/play/" + data.uuid);
      }
    },
  });

  return (
    <div className="container flex flex-col items-center justify-center gap-8 px-3 py-16">
      <Image
        src={image}
        alt={"avatar"}
        width={200}
        height={200}
        className="rounded-full"
      />

      {queueUpMutation.isSuccess &&
      queueUpMutation.data &&
      !queueUpMutation.data.gameStarted ? (
        <QueueDisplay gameId={queueUpMutation.data.uuid}></QueueDisplay>
      ) : (
        <button
          className="rounded-md bg-green-700 p-4 font-os text-white"
          onClick={() => queueUpMutation.mutate({ timeControl: 180 })}
        >
          {" "}
          Play{" "}
        </button>
      )}

      {queueUpMutation.isError && (
        <p className="text-red-400">{queueUpMutation.error.message}</p>
      )}
      <button
        className="rounded-md bg-green-700 p-4 font-os text-white"
        onClick={() => void signOut()}
      >
        {" "}
        Log out{" "}
      </button>
    </div>
  );
};

export default Home;
