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

  let msg = gameResult.winner as string;
  msg = msg[0]! + msg.substring(1).toLowerCase();
  if (gameResult.winner !== "DRAW") {
    msg += " won";
  }

  return (
    <div className="flex h-[40rem] w-[40rem] flex-col items-center justify-center gap-3 rounded-xl bg-neutral-700 p-10 font-os text-white">
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
      <h1 className=" text-5xl font-semibold"> {msg} </h1>

      <div className="flex flex-col items-center justify-center">
        {" "}
        <h3 className="text-2xl"> New rating: </h3>
        <h2 className="text-3xl font-semibold"> 1200 </h2>
      </div>
    </div>
  );
};

export default GameSummary;
