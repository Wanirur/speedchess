import { useSession } from "next-auth/react";
import { type GameResult, type PlayerColor } from "~/utils/pieces";
import Image from "next/image";
import { type User } from "next-auth";
import { api } from "~/utils/api";
import { calculateRatingDiff } from "~/utils/elo";
import { useMemo, useState } from "react";
import QueueDisplay from "./queue";
import { useRouter } from "next/router";

const GameSummary: React.FC<{
  gameResult: GameResult;
  color: PlayerColor;
  user: User;
  queueUpTimeControl: number;
  rating: number;
}> = ({ gameResult, color, user, queueUpTimeControl, rating }) => {
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
    <div className="flex h-[40rem] w-[40rem] flex-col items-center justify-center gap-3 rounded-xl bg-neutral-700 p-10 font-os text-white">
      {!isInQueue || !queueUpMutation.data ? (
        <>
          <div
            className={`flex ${
              color === "WHITE" ? "flex-row" : "flex-row-reverse"
            } items-center justify-center gap-10 p-6`}
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
          </div>
          <h1 className=" text-5xl font-semibold"> {msg} </h1>

          <div className="flex flex-col items-center justify-center pb-6">
            <h3 className="text-2xl"> New rating: </h3>
            <h2 className="text-3xl font-semibold">
              {rating + ratingDiff}
              <span className="text-green-500 opacity-50">
                {" "}
                {ratingDiff >= 0 && "+"}
                {ratingDiff}
              </span>
            </h2>
          </div>

          <button
            className="h-12 w-40 rounded-xl bg-green-700"
            onClick={() => {
              queueUpMutation.mutate({ timeControl: queueUpTimeControl });
            }}
          >
            Queue up next
          </button>
        </>
      ) : (
        <QueueDisplay
          gameId={queueUpMutation.data.uuid}
          setIsInQueue={setIsInQueue}
        ></QueueDisplay>
      )}
    </div>
  );
};

export default GameSummary;
