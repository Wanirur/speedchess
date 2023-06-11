import { type NextPage } from "next";
import Head from "next/head";
import { signIn, useSession } from "next-auth/react";
import { api } from "~/utils/api";
import { useRouter } from "next/router";
import QueueDisplay from "~/components/queue";
import { type TimeControl } from "~/utils/pieces";
import { HelpCircle } from "lucide-react";

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
        {sessionData?.user?.image ? (
          <UserLoggedInView></UserLoggedInView>
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

const QueueUpCard: React.FC<{
  timeControl: TimeControl;
  onClick: () => void;
}> = ({ timeControl, onClick }) => {
  return (
    <div className="flex h-48 w-64 flex-col items-center justify-center gap-5 bg-neutral-700 font-os text-white">
      <div className="flex items-center justify-center">
        <span className="text-6xl">
          {`${timeControl.startingTime} | ${timeControl.increment}`}
        </span>
        <div className="group flex items-center justify-center gap-3 rounded-full bg-black font-bold">
          <HelpCircle className="stroke-green-700" />
          <div className="invisible absolute z-10 -translate-y-12 translate-x-40 rounded-lg bg-gray-600 p-2 opacity-90 group-hover:visible">
            {`${timeControl.startingTime} minute${
              timeControl.startingTime === 1 ? "" : "s"
            } with ${timeControl.increment} second${
              timeControl.increment === 1 ? "" : "s"
            } increment after every move`}
          </div>
        </div>
      </div>
      <button
        className="rounded-md bg-green-700 p-4 font-os text-white"
        onClick={onClick}
      >
        Play
      </button>
    </div>
  );
};

const UserLoggedInView: React.FC = () => {
  const { data: sessionData } = useSession();
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
      {queueUpMutation.isError && (
        <p className="text-red-400">{queueUpMutation.error.message}</p>
      )}

      {queueUpMutation.isSuccess &&
      queueUpMutation.data &&
      !queueUpMutation.data.gameStarted ? (
        <QueueDisplay gameId={queueUpMutation.data.uuid}></QueueDisplay>
      ) : (
        <div className="flex h-96 w-[48rem] flex-col gap-3">
          <div className="flex h-1/2 w-full items-center justify-center gap-3">
            {" "}
            <QueueUpCard
              timeControl={{ startingTime: 1, increment: 0 }}
              onClick={() => queueUpMutation.mutate({ timeControl: 60 })}
            ></QueueUpCard>
            <QueueUpCard
              timeControl={{ startingTime: 1, increment: 1 }}
              onClick={() => queueUpMutation.mutate({ timeControl: 60 })}
            ></QueueUpCard>
            <QueueUpCard
              timeControl={{ startingTime: 2, increment: 1 }}
              onClick={() => queueUpMutation.mutate({ timeControl: 120 })}
            ></QueueUpCard>
          </div>

          <div className="flex h-1/2 w-full items-center justify-center gap-3">
            <QueueUpCard
              timeControl={{ startingTime: 3, increment: 0 }}
              onClick={() => queueUpMutation.mutate({ timeControl: 180 })}
            ></QueueUpCard>

            <QueueUpCard
              timeControl={{ startingTime: 3, increment: 2 }}
              onClick={() => queueUpMutation.mutate({ timeControl: 180 })}
            ></QueueUpCard>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
