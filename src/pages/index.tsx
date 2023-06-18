import { type NextPage } from "next";
import { signIn, useSession } from "next-auth/react";
import { api } from "~/utils/api";
import { useRouter } from "next/router";
import QueueDisplay from "~/components/queue";
import { type TimeControl } from "~/utils/pieces";
import { HelpCircle } from "lucide-react";
import { type HTMLAttributes, useState, useEffect } from "react";
import { twMerge } from "tailwind-merge";
import { usePusher } from "~/context/pusher_provider";

const Home: NextPage = () => {
  const { data: sessionData } = useSession();

  return (
    <>
      <main className="m-auto flex min-h-[calc(100vh-3.5rem)] w-screen max-w-[100vw] flex-col items-center justify-center overflow-hidden bg-neutral-900 3xl:min-h-[calc(100vh-7rem)]">
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
      </main>
    </>
  );
};

const QueueUpCard: React.FC<
  {
    timeControl: TimeControl;
    onClick: () => void;
  } & HTMLAttributes<HTMLDivElement>
> = ({ className, timeControl, onClick }) => {
  return (
    <div
      className={twMerge(
        "flex h-24 w-32 flex-col items-center justify-center gap-2 bg-neutral-700 font-os text-white md:h-48 md:w-64 md:gap-5 3xl:h-64 3xl:w-96 3xl:gap-8",
        className
      )}
    >
      <div className="relative flex items-center justify-center">
        <span className="mx-1 text-2xl md:text-6xl 3xl:text-7xl">
          {`${timeControl.startingTime} | ${timeControl.increment}`}
        </span>
        <div className="group absolute left-full flex items-center justify-center rounded-full bg-black font-bold">
          <HelpCircle className="h-3 w-3 stroke-green-700 md:h-5 md:w-5 3xl:h-8 3xl:w-8" />
          <div className="invisible absolute bottom-full left-full z-10 w-fit rounded-lg bg-gray-600 p-2 text-xs opacity-90 group-hover:visible md:text-base 3xl:text-2xl">
            {`${timeControl.startingTime} minute${
              timeControl.startingTime === 1 ? "" : "s"
            } with ${timeControl.increment} second${
              timeControl.increment === 1 ? "" : "s"
            } increment after every move`}
          </div>
        </div>
      </div>
      <button
        className="rounded-md bg-green-700 p-1 font-os text-sm text-white hover:bg-green-800 md:p-4 md:text-base 3xl:text-xl"
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
  const pusherClient = usePusher();
  const queueUpMutation = api.chess.queueUp.useMutation({
    onSuccess: (data?: { uuid: string; gameStarted: boolean }) => {
      if (!data) {
        return;
      }

      if (data.gameStarted) {
        void router.push("/play/" + data.uuid);
      } else {
        setIsInQueue(true);
      }
    },
  });

  const [isInQueue, setIsInQueue] = useState<boolean>(false);

  useEffect(() => {
    pusherClient?.signin();
  }, [pusherClient]);

  return (
    <div className="flex flex-col items-center justify-center gap-8 px-3 py-16">
      {queueUpMutation.isError && (
        <p className="text-red-400">{queueUpMutation.error.message}</p>
      )}

      {sessionData?.user?.rating && (
        <div className="flex flex-col items-center justify-center font-os text-white">
          <h3 className="3xl:text-2xl">Current rating:</h3>
          <h1 className="text-7xl font-bold 3xl:text-9xl">
            {sessionData.user.rating}
          </h1>
        </div>
      )}

      {queueUpMutation?.data && isInQueue ? (
        <QueueDisplay
          className="h-96 w-72 3xl:h-[36rem] 3xl:w-96 3xl:text-xl"
          gameId={queueUpMutation.data.uuid}
          setIsInQueue={setIsInQueue}
        ></QueueDisplay>
      ) : (
        <div className="flex h-[19.25rem] w-[16.75rem] flex-wrap items-center justify-center gap-3 md:h-[24.75rem] md:w-[50rem] 3xl:h-[33rem] 3xl:w-[74rem] 3xl:gap-4">
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
          <QueueUpCard
            timeControl={{ startingTime: 3, increment: 0 }}
            onClick={() => queueUpMutation.mutate({ timeControl: 180 })}
          ></QueueUpCard>
          <QueueUpCard
            timeControl={{ startingTime: 3, increment: 2 }}
            onClick={() => queueUpMutation.mutate({ timeControl: 180 })}
          ></QueueUpCard>
        </div>
      )}
    </div>
  );
};

export default Home;
