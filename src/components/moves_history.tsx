import {
  type HTMLAttributes,
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
} from "react";
import { twMerge } from "tailwind-merge";
import type Chessgame from "~/chess/game";
import {
  type ChessgameForAnalysis,
  type ChessgameForMatch,
} from "~/chess/game";

const MovesHistory: React.FC<
  {
    chess: ChessgameForMatch | ChessgameForAnalysis;
    index: number;
    setIndex: Dispatch<SetStateAction<number>>;
  } & HTMLAttributes<HTMLDivElement>
> = ({ className, chess, index: indexToSelect, setIndex }) => {
  const moves = chess.history.first.moves;
  const lastMoveRef = useRef<HTMLDivElement>(null);
  const result = chess.gameResult;

  useEffect(() => {
    if (lastMoveRef.current) {
      lastMoveRef.current.scrollIntoView();
    }
  }, [chess.movesPlayed]);

  return (
    <div
      ref={lastMoveRef}
      className={twMerge(
        "scroll-thin flex flex-wrap content-start gap-0.5 overflow-y-auto bg-neutral-700 px-2  py-3 font-os text-white [scrollbar-width:thin]",
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
              setIndex(index);
            }}
          >
            {result}
          </div>
        );
      })}

      {result && (
        <div className="flex h-fit w-fit items-center justify-center gap-1 whitespace-nowrap rounded-sm p-1">
          {result.winner === "WHITE" && (
            <>
              <span className="font-bold">1-0</span> {`${result.reason}`}
            </>
          )}
          {result.winner === "BLACK" && (
            <>
              <span className="font-bold">0-1</span> {`${result.reason}`}
            </>
          )}
          {result.winner === "DRAW" && (
            <>
              <span className="font-bold">1/2-1/2</span> {`${result.reason}`}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MovesHistory;
