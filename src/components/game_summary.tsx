import { useSession } from "next-auth/react";
import {
  type TimeControl,
  type GameResult,
  type PlayerColor,
} from "~/utils/pieces";
import Image from "next/image";
import { type User } from "next-auth";
import { api } from "~/utils/api";
import { calculateRatingDiff } from "~/utils/elo";
import { type HTMLAttributes, useMemo, useState } from "react";
import QueueDisplay from "./queue";
import { useRouter } from "next/router";
import { twMerge } from "tailwind-merge";
import { Cpu } from "lucide-react";

const GameSummary: React.FC<
  {
    gameResult: GameResult;
    color: PlayerColor;
    user: User;
    queueUpTimeControl: TimeControl;
    rating: number;
  } & HTMLAttributes<HTMLDivElement>
> = ({ className, gameResult, color, user, queueUpTimeControl, rating }) => {
  const { data: sessionData } = useSession();

  const [isInQueue, setIsInQueue] = useState<boolean>(false);
  const router = useRouter();

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

  let msg = gameResult.winner as string;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  msg = msg[0]! + msg.substring(1).toLowerCase();
  if (gameResult.winner !== "DRAW") {
    msg += " won";
  }

  const ratingDiff = useMemo(() => {
    const ratingDiffs = calculateRatingDiff(gameResult, 1200, 1200);
    if (color === "WHITE") {
      return ratingDiffs.white;
    } else {
      return ratingDiffs.black;
    }
  }, [gameResult, color]);

  return (
    <div
      className={twMerge(
        "flex h-full w-full flex-col items-center justify-center gap-1 rounded-xl bg-neutral-700 p-10 font-os text-white md:gap-3",
        className
      )}
    >
      {!isInQueue || !queueUpMutation.data ? (
        <>
          <div
            className={`flex items-center justify-center gap-6 p-2 md:gap-10 md:p-6 ${
              color === "WHITE" ? "flex-row" : "flex-row-reverse"
            }`}
          >
            {sessionData?.user?.image && (
              <Image
                src={sessionData.user.image}
                width={80}
                height={80}
                alt="player avatar"
              ></Image>
            )}
            vs
            {user.image && (
              <Image
                src={user.image}
                width={80}
                height={80}
                alt="player avatar"
              ></Image>
            )}
            {user.id === "bot" && (
              <Cpu className="h-20 w-20 stroke-neutral-400"></Cpu>
            )}
          </div>
          <h1 className="text-4xl font-semibold md:text-5xl"> {msg} </h1>

          <div className="flex flex-col items-center justify-center pb-3 md:pb-6">
            <h3 className="text-xl md:text-2xl"> New rating: </h3>
            <h2 className="text-2xl font-semibold md:text-3xl">
              {rating + ratingDiff}
              <span className="text-green-500 opacity-50">
                {ratingDiff >= 0 && "+"}
                {ratingDiff}
              </span>
            </h2>
          </div>

          <button
            className="h-12 w-40 rounded-xl bg-green-700 p-1 hover:bg-green-800"
            onClick={() => {
              queueUpMutation.mutate(queueUpTimeControl);
            }}
          >
            Queue up next
          </button>
        </>
      ) : (
        <QueueDisplay
          className="h-52 w-72 text-sm md:h-96 md:w-72"
          gameId={queueUpMutation.data.uuid}
          setIsInQueue={setIsInQueue}
        ></QueueDisplay>
      )}
    </div>
  );
};

export default GameSummary;
