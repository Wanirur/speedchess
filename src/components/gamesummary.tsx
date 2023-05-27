import { useSession } from "next-auth/react";
import { type GameResult, type PlayerColor } from "~/utils/pieces";
import Image from "next/image";
import { type User } from "next-auth";

const GameSummary: React.FC<{
  gameResult: GameResult;
  color: PlayerColor;
  user: User;
}> = ({ gameResult, color, user }) => {
  const { data: sessionData } = useSession();

  let msg = gameResult.winner;
  if (gameResult.winner !== "DRAW") {
    msg += " won";
  }

  return (
    <div className="flex h-[40rem] w-[40rem] flex-col items-center justify-center rounded-xl bg-neutral-700 font-os text-white">
      <div
        className={`flex ${
          color === "WHITE" ? "flex-row" : "flex-row-reverse"
        } items-center justify-center gap-10 p-10`}
      >
        {" "}
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
      <h1 className=" text-6xl font-semibold "> {msg} </h1>
    </div>
  );
};

export default GameSummary;
