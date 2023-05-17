import { useState } from "react";
import {
  resolvePieceToImage,
  type PlayerColor,
  type Board,
} from "~/utils/pieces";
import Image from "next/image";
import { api } from "~/utils/api";
import type Chess from "~/utils/chess";
import { Coords } from "~/utils/coords";

const Chessboard: React.FC<{
  uuid: string;
  color: PlayerColor;
  isYourTurn: boolean;
  chess: Chess;
  board: Board;
  mutate?: boolean;
}> = ({ uuid, color, isYourTurn, chess, board, mutate = false }) => {
  const [highlightedTile, setHighlightedTile] = useState<Coords | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Coords[] | null>(null);
  const [draggedPiece, setDraggedPiece] = useState<Coords | null>(null);
  const moveMutation = api.chess.movePiece.useMutation();
  return (
    <>
      {
        <div
          className={`container flex h-max w-max ${
            color === "WHITE" ? "flex-col-reverse" : "flex-col"
          } gap-0`}
        >
          {board.map((row, row_index) => (
            <div key={-row_index} className="flex flex-row">
              {row.map((tile, index) => {
                let isWhite = true;
                if (row_index % 2) {
                  isWhite = false;
                }

                if (index % 2) {
                  isWhite = !isWhite;
                }

                if (color === "WHITE") {
                  isWhite = !isWhite;
                }

                let tileBgStyle = isWhite ? "bg-white " : "bg-green-500 ";
                if (
                  highlightedTile &&
                  highlightedTile.x === index &&
                  highlightedTile.y === row_index
                ) {
                  tileBgStyle = "bg-red-500";
                } else if (
                  possibleMoves?.find(
                    (tile) => tile.x === index && tile.y === row_index
                  ) !== undefined
                ) {
                  tileBgStyle = "bg-green-100";
                }

                return (
                  <div
                    key={index * row_index + index}
                    className={`h-20 w-20 ${tileBgStyle}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrag={(e) => {
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
                      if (draggedPiece === null) {
                        return;
                      }

                      const moveTo = Coords.getInstance(index, row_index);
                      if (!moveTo) {
                        return;
                      }
                      try {
                        chess.move(draggedPiece, moveTo, color);
                      } catch (e) {
                        if (e instanceof Error) {
                          console.log(e);
                        }

                        return;
                      }
                      moveMutation.mutate({
                        uuid: uuid,
                        fromTile: {
                          x: draggedPiece.x,
                          y: draggedPiece.y,
                        },
                        toTile: {
                          x: index,
                          y: row_index,
                        },
                      });
                      setDraggedPiece(null);
                    }}
                    onClick={(e) => {
                      if (!isYourTurn) {
                        return;
                      }
                      const tileElement = e.target;
                      if (!(tileElement instanceof Element)) {
                        return;
                      }
                      //no highlighted piece and clicked tile is empty - dont highlight
                      if (highlightedTile === null && tile === null) {
                        return;
                      }

                      if (highlightedTile !== null) {
                        const moveTo = Coords.getInstance(index, row_index);
                        if (!moveTo) {
                          return;
                        }

                        try {
                          chess.move(highlightedTile, moveTo, color);
                        } catch (e) {
                          if (e instanceof Error) {
                            console.log(e);
                          }

                          return;
                        }

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
                        setHighlightedTile(null);
                        setPossibleMoves(null);
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
                    {tile && (
                      <Image
                        src={resolvePieceToImage(tile)}
                        alt={tile.pieceType}
                        width={80}
                        height={80}
                        className="cursor-pointer"
                      ></Image>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      }{" "}
    </>
  );
};

export default Chessboard;
