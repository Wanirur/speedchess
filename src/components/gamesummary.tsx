import { GameResult, PlayerColor } from "~/utils/pieces";

const GameSummary: React.FC<{
  gameResult: GameResult;
  color: PlayerColor;
}> = ({ gameResult }) => {
  let msg = gameResult.winner;
  if (gameResult.winner !== "DRAW") {
    msg += " won";
  }
  return (
    <div className="h-[40rem] w-[40rem] rounded-xl bg-neutral-700">
      <h1 className="text-white"> {msg} </h1>
    </div>
  );
};

export default GameSummary;
