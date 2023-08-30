import { type NextPage } from "next";
import { useSession } from "next-auth/react";
import { api } from "~/utils/api";
import { useRouter } from "next/router";
import Queue from "~/components/queue";
import { type TimeControl } from "~/chess/utils";
import { HelpCircle } from "lucide-react";
import { type HTMLAttributes, useState, useEffect } from "react";
import { twMerge } from "tailwind-merge";
import { usePusher } from "~/context/pusher_provider";
import Login from "~/components/login";
import useGuestSession from "~/utils/use_guest";
import Layout from "~/components/layout";

const Home: NextPage = () => {
  const { data: sessionData, status } = useSession();
  const { user: guest } = useGuestSession();

  if (status === "loading") {
    return <div> loading... </div>;
  }
  return (
    <Layout title={"Home - speedchess.net"}>
      {sessionData?.user?.image || guest ? (
        <UserLoggedInView></UserLoggedInView>
      ) : (
        <Login className="h-[30rem] w-80 3xl:h-[36rem] 3xl:w-96 3xl:text-xl"></Login>
      )}
    </Layout>
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
          {`${timeControl.initialTime / 60} | ${timeControl.increment}`}
        </span>
        <div className="group absolute left-full flex items-center justify-center rounded-full bg-black font-bold">
          <HelpCircle className="h-3 w-3 stroke-green-700 md:h-5 md:w-5 3xl:h-8 3xl:w-8" />
          <div className="invisible absolute bottom-full left-full z-10 w-fit rounded-lg bg-gray-600 p-2 text-xs tabular-nums opacity-90 group-hover:visible md:text-base 3xl:text-2xl">
            {`${timeControl.initialTime / 60} minute${
              timeControl.initialTime / 60 === 1 ? "" : "s"
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
  const [queueUpTimeControl, setQueueUpTimeControl] = useState<
    TimeControl | undefined
  >();

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

      {queueUpMutation?.data && isInQueue && queueUpTimeControl ? (
        <Queue
          className="h-96 w-72 3xl:h-[36rem] 3xl:w-96 3xl:text-xl"
          gameId={queueUpMutation.data.uuid}
          setIsInQueue={setIsInQueue}
          timeControl={queueUpTimeControl}
        ></Queue>
      ) : (
        <div className="flex h-[19.25rem] w-[16.75rem] flex-wrap items-center justify-center gap-3 md:h-[24.75rem] md:w-[50rem] 3xl:h-[33rem] 3xl:w-[74rem] 3xl:gap-4">
          <QueueUpCard
            timeControl={{ initialTime: 60, increment: 0 }}
            onClick={() => {
              queueUpMutation.mutate({ initialTime: 60, increment: 0 });
              setQueueUpTimeControl({ initialTime: 60, increment: 0 });
            }}
          ></QueueUpCard>
          <QueueUpCard
            timeControl={{ initialTime: 60, increment: 1 }}
            onClick={() => {
              queueUpMutation.mutate({ initialTime: 60, increment: 1 });
              setQueueUpTimeControl({ initialTime: 60, increment: 1 });
            }}
          ></QueueUpCard>
          <QueueUpCard
            timeControl={{ initialTime: 120, increment: 1 }}
            onClick={() => {
              queueUpMutation.mutate({ initialTime: 120, increment: 1 });
              setQueueUpTimeControl({ initialTime: 120, increment: 1 });
            }}
          ></QueueUpCard>
          <QueueUpCard
            timeControl={{ initialTime: 180, increment: 0 }}
            onClick={() => {
              queueUpMutation.mutate({ initialTime: 180, increment: 0 });
              setQueueUpTimeControl({ initialTime: 180, increment: 0 });
            }}
          ></QueueUpCard>
          <QueueUpCard
            timeControl={{ initialTime: 180, increment: 2 }}
            onClick={() => {
              queueUpMutation.mutate({ initialTime: 180, increment: 2 });
              setQueueUpTimeControl({ initialTime: 180, increment: 2 });
            }}
          ></QueueUpCard>
        </div>
      )}
    </div>
  );
};

export default Home;
