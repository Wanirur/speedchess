import { useState } from "react";
import {
  resolvePieceToImage,
  type Coords,
  type PlayerColor,
  type Tile,
  getPossibleMoves,
} from "~/utils/pieces";
import Image from "next/image";
import { api } from "~/utils/api";

const Chessboard: React.FC<{
  uuid: string;
  color: PlayerColor;
  isYourTurn: boolean;
  board: Tile[][];
}> = ({ uuid, color, isYourTurn, board }) => {
  const [highlightedTile, setHighlightedTile] = useState<Coords | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Coords[] | null>(null);
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

              if (color === "white") {
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

                    if (!board[index]) {
                      return;
                    }

                    setDraggedPiece({ x: index, y: row_index });
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

                    const coords = { x: index, y: row_index };
                    setHighlightedTile(coords);
                    setPossibleMoves(getPossibleMoves(board, coords));
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
        ))}
      </div>
    </>
  );
};

export default Chessboard;
