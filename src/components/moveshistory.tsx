import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import type Chess from "~/utils/chess";
import { type Board } from "~/utils/pieces";

const MovesHistory: React.FC<{
  chess: Chess;
  setCurrentBoard: Dispatch<SetStateAction<Board | null>>;
}> = ({ chess, setCurrentBoard }) => {
  const moves = chess.algebraic;
  const [currentBoardIndex, setCurrentBoardIndex] = useState<number>(0);
  useEffect(() => {
    setCurrentBoardIndex(moves.length - 1);
  }, [moves.length]);

  return (
    <div className="font-white flex h-full w-full flex-wrap content-start gap-y-1 gap-x-1 p-3 font-os text-sm">
      {moves.map((move, index) => {
        const stringifiedMove = move.toString();
        let result;
        if (index % 2) {
          result = stringifiedMove;
        } else {
          result =
            (Math.floor(index / 2) + 1).toString() + ". " + stringifiedMove;
        }

        return (
          <div
            key={index}
            className={`h-fit w-fit cursor-pointer whitespace-nowrap rounded-sm p-1 hover:bg-neutral-500 ${
              index === currentBoardIndex
                ? "bg-neutral-400 text-green-800 hover:text-green-900"
                : ""
            }`}
            onClick={() => {
              const fen = chess.history[index + 1];
              if (!fen) {
                return;
              }

              setCurrentBoardIndex(index);
              setCurrentBoard(fen.buildBoard());
            }}
          >
            {" "}
            {result}
          </div>
        );
      })}
    </div>
  );
};

export default MovesHistory;
