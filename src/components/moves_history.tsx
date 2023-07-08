import {
  type HTMLAttributes,
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
} from "react";
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
  const lastMoveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lastMoveRef.current) {
      lastMoveRef.current.scrollIntoView();
    }
  }, [moves.length]);

  return (
    <div
      ref={lastMoveRef}
      className={twMerge(
        "font-white flex flex-wrap content-start gap-0.5 overflow-y-auto bg-neutral-700 px-2 py-3  font-os text-white",
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
            ref={index === moves.length - 1 ? lastMoveRef : undefined}
            key={index}
            className={twMerge(
              "h-fit w-fit cursor-pointer whitespace-nowrap rounded-sm p-1 hover:bg-neutral-500",
              index === indexToSelect &&
                "bg-neutral-400 text-green-800 hover:text-green-900"
            )}
            onClick={() => {
              const fen = chess.history[index + 1];
              if (!fen) {
                setIndex(chess.history.length - 1);
                return;
              }

              setIndex(index);
            }}
          >
            {result}
          </div>
        );
      })}
    </div>
  );
};

export default MovesHistory;
