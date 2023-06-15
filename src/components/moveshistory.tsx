import { type HTMLAttributes, type Dispatch, type SetStateAction } from "react";
import { twMerge } from "tailwind-merge";
import type Chess from "~/utils/chess";

const MovesHistory: React.FC<
  {
    chess: Chess;
    index: number;
    setIndex: Dispatch<SetStateAction<number>>;
  } & HTMLAttributes<HTMLDivElement>
> = ({ className, chess, index: indexToSelect, setIndex }) => {
  const moves = chess.algebraic;

  return (
    <div
      className={twMerge(
        "font-white flex flex-wrap content-start gap-1 bg-neutral-700 p-3 font-os  text-sm text-white",
        className
      )}
    >
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
              index === indexToSelect
                ? "bg-neutral-400 text-green-800 hover:text-green-900"
                : ""
            }`}
            onClick={() => {
              const fen = chess.history[index + 1];
              if (!fen) {
                return;
              }

              setIndex(index);
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
