import {
  type Dispatch,
  type SetStateAction,
  useState,
  type HTMLAttributes,
} from "react";
import {
  resolvePieceToImage,
  type PlayerColor,
  type Board,
  whiteQueen,
  blackQueen,
  whiteKnight,
  blackKnight,
  whiteRook,
  whiteBishop,
  blackRook,
  blackBishop,
  type PromotedPieceType,
} from "~/utils/pieces";
import Image from "next/image";
import { api } from "~/utils/api";
import type Chess from "~/utils/chess";
import { Coords } from "~/utils/coords";
import { twMerge } from "tailwind-merge";
import { on } from "events";

const Chessboard: React.FC<
  {
    uuid: string;
    color: PlayerColor;
    isYourTurn: boolean;
    chess: Chess;
    board: Board;
    locked: boolean;
    unlockFunction?: Dispatch<SetStateAction<number>>;
    mutate?: boolean;
    onMove?: () => void;
  } & HTMLAttributes<HTMLDivElement>
> = ({
  uuid,
  color,
  isYourTurn,
  chess,
  board,
  locked,
  unlockFunction,
  mutate = false,
  onMove,
  className,
}) => {
  const [highlightedTile, setHighlightedTile] = useState<Coords | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Coords[] | null>(null);
  const [draggedPiece, setDraggedPiece] = useState<Coords | null>(null);
  const [promotedPawn, setPromotedPawn] = useState<Coords | null>(null);

  const moveMutation = api.chess.movePiece.useMutation({
    onError: () => {
      chess.revertLastMove();
    },
  });

  const colOrderStyle = color === "WHITE" ? "flex-col-reverse" : "flex-col";
  const rowOrderStyle = color === "WHITE" ? "flex-row" : "flex-row-reverse";

  return (
    <div
      className={twMerge("flex h-full w-full gap-0", colOrderStyle, className)}
    >
      {board.map((row, row_index) => (
        <div
          key={-row_index}
          className={twMerge("flex h-[12.5%] w-full", rowOrderStyle)}
        >
          {row.map((tile, index) => {
            let isWhite = false;

            if (row_index % 2) {
              isWhite = !isWhite;
            }

            if (index % 2) {
              isWhite = !isWhite;
            }

            const tileBgStyle = isWhite ? "bg-white " : "bg-green-500 ";

            let highlightStyle;
            if (
              highlightedTile &&
              highlightedTile.x === index &&
              highlightedTile.y === row_index
            ) {
              highlightStyle = "w-full h-full bg-black bg-opacity-25";
            } else if (
              possibleMoves?.find(
                (tile) => tile.x === index && tile.y === row_index
              ) !== undefined
            ) {
              highlightStyle =
                "w-1/2 h-1/2 bg-black bg-opacity-25 rounded-full m-auto";
            }

            return (
              <div
                key={index * row_index + index}
                className={twMerge(
                  "relative flex h-full w-[12.5%]",
                  tileBgStyle
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrag={(e) => {
                  if (locked) {
                    unlockFunction?.(chess.algebraic.length - 1);
                    return;
                  }
                  if (!isYourTurn) {
                    return;
                  }

                  const tile = e.target;
                  if (!(tile instanceof Element)) {
                    return;
                  }

                  if (!chess.board[index]) {
                    return;
                  }
                  const coords = Coords.getInstance(index, row_index);
                  if (!coords) {
                    return;
                  }
                  setDraggedPiece(coords);
                }}
                onDrop={() => {
                  if (locked) {
                    unlockFunction?.(chess.algebraic.length - 1);
                    return;
                  }
                  if (draggedPiece === null) {
                    return;
                  }

                  const coords = draggedPiece;
                  setDraggedPiece(null);
                  const moveTo = Coords.getInstance(index, row_index);
                  if (!moveTo) {
                    return;
                  }
                  try {
                    chess.move(coords, moveTo, color);
                  } catch (e) {
                    if (e instanceof Error) {
                      console.log(e);
                    }

                    return;
                  }
                  if (
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    board[moveTo.y]![moveTo.x]?.pieceType === "PAWN" &&
                    ((color === "WHITE" && moveTo.y === 7) ||
                      (color === "BLACK" && moveTo.y === 0))
                  ) {
                    setPromotedPawn(moveTo);
                  } else {
                    onMove?.();
                  }

                  if (mutate) {
                    moveMutation.mutate({
                      uuid: uuid,
                      fromTile: {
                        x: coords.x,
                        y: coords.y,
                      },
                      toTile: {
                        x: index,
                        y: row_index,
                      },
                    });
                  }
                }}
                onClick={(e) => {
                  if (locked) {
                    unlockFunction?.(chess.algebraic.length - 1);
                    return;
                  }

                  if (!isYourTurn) {
                    return;
                  }

                  if (promotedPawn !== null) {
                    return;
                  }

                  const tileElement = e.target;
                  if (!(tileElement instanceof Element)) {
                    return;
                  }
                  //no highlighted piece and clicked tile is empty - dont highlight
                  if (
                    highlightedTile === null &&
                    (tile === null || tile.color !== color)
                  ) {
                    return;
                  }

                  if (highlightedTile !== null) {
                    const moveTo = Coords.getInstance(index, row_index);
                    if (!moveTo) {
                      return;
                    }
                    const moveFrom = highlightedTile;
                    setHighlightedTile(null);
                    setPossibleMoves(null);

                    try {
                      chess.move(moveFrom, moveTo, color);
                    } catch (e) {
                      if (e instanceof Error) {
                        console.log(e);
                      }

                      return;
                    }

                    if (
                      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                      board[moveTo.y]![moveTo.x]?.pieceType === "PAWN" &&
                      ((color === "WHITE" && moveTo.y === 7) ||
                        (color === "BLACK" && moveTo.y === 0))
                    ) {
                      setPromotedPawn(moveTo);
                    } else {
                      onMove?.();
                    }

                    if (mutate) {
                      moveMutation.mutate({
                        uuid: uuid,
                        fromTile: {
                          x: highlightedTile.x,
                          y: highlightedTile.y,
                        },
                        toTile: {
                          x: index,
                          y: row_index,
                        },
                      });
                    }

                    return;
                  }

                  const coords = Coords.getInstance(index, row_index);
                  if (!coords) {
                    return;
                  }
                  setHighlightedTile(coords);

                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  const moves = chess.getPossibleMoves(coords);
                  setPossibleMoves([
                    ...moves.possibleMoves,
                    ...moves.possibleCaptures,
                  ]);
                }}
              >
                <>
                  {highlightStyle && <div className={highlightStyle}></div>}
                  {!(
                    promotedPawn &&
                    index === promotedPawn.x &&
                    row_index === promotedPawn.y
                  ) ? (
                    tile && (
                      <Image
                        src={resolvePieceToImage(tile)}
                        alt={tile.pieceType}
                        fill
                        className="cursor-pointer"
                      ></Image>
                    )
                  ) : (
                    <PromotionPieceList
                      className="absolute z-10 h-[400%] w-full"
                      color={color}
                      uuid={uuid}
                      chess={chess}
                      setPromotedPawn={setPromotedPawn}
                      mutate={mutate}
                      onPromote={onMove}
                    ></PromotionPieceList>
                  )}
                </>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const PromotionPieceList: React.FC<
  {
    color: PlayerColor;
    uuid: string;
    chess: Chess;
    mutate: boolean;
    onPromote?: () => void;
    setPromotedPawn: Dispatch<SetStateAction<Coords | null>>;
  } & HTMLAttributes<HTMLDivElement>
> = ({ className, color, uuid, chess, mutate, onPromote, setPromotedPawn }) => {
  const promoteMutation = api.chess.promoteTo.useMutation();
  const promote = (pieceType: PromotedPieceType) => {
    chess.promote(pieceType, color);
    if (mutate) {
      promoteMutation.mutate({ uuid: uuid, promoteTo: pieceType });
    }
    onPromote?.();
    setPromotedPawn(null);
  };
  return (
    <div className={twMerge("flex flex-col bg-neutral-700", className)}>
      {color === "WHITE" ? (
        <>
          <div className="relative h-1/4 w-full">
            <Image
              src={resolvePieceToImage(whiteQueen)}
              alt={whiteQueen.pieceType}
              fill
              className="cursor-pointer"
              onClick={() => promote("QUEEN")}
            ></Image>
          </div>
          <div className="relative h-1/4 w-full">
            <Image
              src={resolvePieceToImage(whiteKnight)}
              alt={whiteKnight.pieceType}
              fill
              className="cursor-pointer"
              onClick={() => promote("KNIGHT")}
            ></Image>
          </div>
          <div className="relative h-1/4 w-full">
            <Image
              src={resolvePieceToImage(whiteRook)}
              alt={whiteRook.pieceType}
              fill
              className="cursor-pointer"
              onClick={() => promote("ROOK")}
            ></Image>
          </div>
          <div className="relative h-1/4 w-full">
            <Image
              src={resolvePieceToImage(whiteBishop)}
              alt={whiteBishop.pieceType}
              fill
              className="cursor-pointer"
              onClick={() => promote("BISHOP")}
            ></Image>
          </div>
        </>
      ) : (
        <>
          <div className="relative h-1/4 w-full">
            <Image
              src={resolvePieceToImage(blackQueen)}
              alt={blackQueen.pieceType}
              fill
              className="cursor-pointer"
              onClick={() => promote("QUEEN")}
            ></Image>
          </div>
          <div className="relative h-1/4 w-full">
            <Image
              src={resolvePieceToImage(blackKnight)}
              alt={blackKnight.pieceType}
              fill
              className="cursor-pointer"
              onClick={() => promote("KNIGHT")}
            ></Image>
          </div>
          <div className="relative h-1/4 w-full">
            <Image
              src={resolvePieceToImage(blackRook)}
              alt={blackRook.pieceType}
              fill
              className="cursor-pointer"
              onClick={() => promote("ROOK")}
            ></Image>
          </div>
          <div className="relative h-1/4 w-full">
            <Image
              src={resolvePieceToImage(blackBishop)}
              alt={blackBishop.pieceType}
              fill
              className="cursor-pointer"
              onClick={() => promote("BISHOP")}
            ></Image>
          </div>
        </>
      )}
    </div>
  );
};

export default Chessboard;
