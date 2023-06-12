import { Search } from "lucide-react";
import { useRouter } from "next/router";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import pusherClient from "~/utils/pusherClient";

const QueueDisplay: React.FC<{
  gameId: string;
  setIsInQueue: Dispatch<SetStateAction<boolean>>;
}> = ({ gameId, setIsInQueue }) => {
  const router = useRouter();

  const [isQueueLong, setIsQueueLong] = useState<boolean>(false);

  useEffect(() => {
    const onStart = (data: { matchId: string; timeControl: number }) => {
      void router.push(`/play/${data.matchId}`);
    };

    const channel = pusherClient.subscribe(gameId);
    channel.bind("match_start", onStart);

    return () => {
      pusherClient.unsubscribe(gameId);
    };
  }, [gameId, router]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsQueueLong(true);
    }, 5000);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="flex h-96 w-72 flex-col items-center justify-center gap-4 bg-neutral-700  p-5 font-os text-white">
      <div className="flex w-full items-center justify-center">
        <Search className="m-2 h-8 w-8 animate-pulse "></Search>
        Looking for opponent...
      </div>

      <div className="my-4 h-24 w-full">
        {isQueueLong && (
          <span>
            Looks like there are no opponents currently available in your rating
            range. Consider playing a bot instead.
          </span>
        )}
      </div>

      <button
        className={`h-12 w-24 rounded-md bg-green-700 ${
          isQueueLong ? "animate-pulse" : ""
        }`}
      >
        play a bot
      </button>
      <button
        className="h-12 w-24 rounded-md bg-red-900"
        onClick={() => {
          setIsInQueue(false);
        }}
      >
        cancel
      </button>
    </div>
  );
};

export default QueueDisplay;
