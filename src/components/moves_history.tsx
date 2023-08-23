import {
  type HTMLAttributes,
  useEffect,
  useRef,
  forwardRef,
  Fragment,
} from "react";
import { twMerge } from "tailwind-merge";

import { type TrackingStrategy, type Move } from "~/chess/history";
import { GameResult } from "~/chess/utils";

const MovesHistory: React.FC<
  {
    history: TrackingStrategy;
    index: number;
    branchStartIndex?: number;
    variationIndex?: number;
    onIndexChange: (
      newIndex: number,
      isMain: boolean,
      branchStartIndex?: number,
      variationIndex?: number
    ) => void;
    gameResult?: GameResult;
  } & HTMLAttributes<HTMLDivElement>
> = ({
  className,
  history,
  index: indexToSelect,
  branchStartIndex,
  variationIndex,
  onIndexChange,
  gameResult: result,
}) => {
  const moves = history.moves;

  const lastMoveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lastMoveRef.current) {
      lastMoveRef.current.scrollIntoView();
    }
  }, [history.moves.length]);

  return (
    <div
      ref={lastMoveRef}
      className={twMerge(
        "scroll-thin flex flex-wrap content-start gap-0.5 overflow-y-auto bg-neutral-700 px-2  py-3 font-os text-white [scrollbar-width:thin]",
        className
      )}
    >
      {moves.map((move, index) => {
        return (
          <Fragment key={move.index + move.color}>
            <MoveContainer
              ref={
                index === moves.length - 1 && !move.variations
                  ? lastMoveRef
                  : undefined
              }
              move={move}
              index={index}
              className={twMerge(
                index === indexToSelect &&
                  variationIndex === undefined &&
                  branchStartIndex === undefined &&
                  "bg-neutral-400 text-green-800 hover:text-green-900"
              )}
              onClick={() => {
                onIndexChange(index, false);
              }}
            ></MoveContainer>

            {move.variations?.map((variation, currentVariationIndex) => {
              if (variation.length <= 1) {
                return;
              }

              return (
                <Fragment
                  key={
                    move.index + move.color + currentVariationIndex.toString()
                  }
                >
                  <div className="basis-full"></div>
                  <div className="w-4"></div>

                  {variation.slice(1).map((move, moveIndex) => {
                    const isHighlighted =
                      indexToSelect === moveIndex &&
                      variationIndex === currentVariationIndex &&
                      branchStartIndex === index;

                    return (
                      <MoveContainer
                        key={
                          move.index +
                          move.color +
                          currentVariationIndex.toString() +
                          moveIndex.toString()
                        }
                        move={move}
                        index={moveIndex}
                        className={twMerge(
                          !isHighlighted && "opacity-80",
                          isHighlighted &&
                            "bg-neutral-400 text-green-800 hover:text-green-900"
                        )}
                        onClick={() => {
                          onIndexChange(
                            moveIndex,
                            false,
                            index,
                            currentVariationIndex
                          );
                        }}
                      ></MoveContainer>
                    );
                  })}

                  <div className="basis-full"></div>
                </Fragment>
              );
            })}
          </Fragment>
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

const MoveContainer = forwardRef<
  HTMLDivElement,
  { move: Move; index: number } & HTMLAttributes<HTMLDivElement>
>(function MoveContainer({ move, index, className, onClick }, ref) {
  const stringifiedMove = move.move.toString();
  let result;
  if (index % 2) {
    result = stringifiedMove;
  } else {
    result = move.index + ". " + stringifiedMove;
  }

  return (
    <div
      ref={ref}
      className={twMerge(
        "h-fit w-fit cursor-pointer whitespace-nowrap rounded-sm p-1 hover:bg-neutral-500",
        className
      )}
      onClick={onClick}
    >
      {result}
    </div>
  );
});
