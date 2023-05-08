import { useState } from "react";
import { resolvePieceToImage, type Coords, type PlayerColor, type Tile } from "~/utils/pieces";
import Image from "next/image";
import { api } from "~/utils/api";

const Chessboard: React.FC<{
  uuid: string;
  color: PlayerColor;
  isYourTurn: boolean;
  board: Tile[];
}> = ({ uuid, color, isYourTurn, board}) => {
  const [highlightedTile, setHighlightedTile] = useState<Coords | null>(null);
  const [draggedPiece, setDraggedPiece] = useState<Coords | null>(null);
  const moveMutation = api.chess.movePiece.useMutation();

  return (
    <>
      {" "}
        <div
          className={`container flex h-max w-max ${
            color === "white" ? "flex-col-reverse" : "flex-col"
          } gap-0`}
        >
          {[0, 1, 2, 3, 4, 5, 6, 7].map((row) => {
            return (
              <div key={-row} className="flex flex-row">
                {board.slice(row * 8, row * 8 + 8).map((tile, index) => {
                  let isWhite = true;
                  if (row % 2) {
                    isWhite = false;
                  }

                  if (index % 2) {
                    isWhite = !isWhite;
                  }

                  if (color === "white") {
                    isWhite = !isWhite;
                  }

                  const tileBgStyle = isWhite ? "bg-white" : "bg-green-500";
                  return (
                    <div
                      key={index * row + index}
                      className={
                        "h-20 w-20 " +
                        (highlightedTile &&
                        highlightedTile.x === index &&
                        highlightedTile.y === row
                          ? "bg-red-500"
                          : tileBgStyle)
                      }
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

                        if (!board[index]) {
                          return;
                        }

                        setDraggedPiece({ x: index, y: row });
                      }}
                      onDrop={() => {
                        if (draggedPiece === null) {
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
                            y: row,
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
                          moveMutation.mutate({
                            uuid: uuid,
                            fromTile: {
                              x: highlightedTile.x,
                              y: highlightedTile.y,
                            },
                            toTile: {
                              x: index,
                              y: row,
                            },
                          });
                          setHighlightedTile(null);
                          return;
                        }

                        setHighlightedTile({ x: index, y: row });
                      }}
                    >
                      {tile && (
                        <Image
                          src={resolvePieceToImage(tile) as string}
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
            );
          })}
        </div>
    </>
  );
};

export default Chessboard;
