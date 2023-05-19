import { useState } from "react";
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
  const [promotedPawn, setPromotedPawn] = useState<Coords | null>(null);
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
            <div
              key={-row_index}
              className={`flex ${
                color === "WHITE" ? "flex-row" : "flex-row-reverse"
              }`}
            >
              {row.map((tile, index) => {
                let isWhite = false;

                if (row_index % 2) {
                  isWhite = !isWhite;
                }

                if (index % 2) {
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
                    {!(
                      promotedPawn &&
                      index === promotedPawn.x &&
                      row_index === promotedPawn.y
                    ) &&
                      tile && (
                        <Image
                          src={resolvePieceToImage(tile)}
                          alt={tile.pieceType}
                          width={80}
                          height={80}
                          className="cursor-pointer"
                        ></Image>
                      )}
                    {promotedPawn &&
                      index === promotedPawn.x &&
                      row_index === promotedPawn.y && (
                        <PromotionPieceList color={color}></PromotionPieceList>
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

const PromotionPieceList: React.FC<{ color: PlayerColor }> = ({ color }) => {
  return (
    <div className="absolute z-10 h-80 w-20 bg-neutral-700">
      {color === "WHITE" && (
        <>
          <Image
            src={resolvePieceToImage(whiteQueen)}
            alt={whiteQueen.pieceType}
            width={80}
            height={80}
            className="cursor-pointer"
          ></Image>
          <Image
            src={resolvePieceToImage(whiteKnight)}
            alt={whiteKnight.pieceType}
            width={80}
            height={80}
            className="cursor-pointer"
          ></Image>
          <Image
            src={resolvePieceToImage(whiteRook)}
            alt={whiteRook.pieceType}
            width={80}
            height={80}
            className="cursor-pointer"
          ></Image>
          <Image
            src={resolvePieceToImage(whiteBishop)}
            alt={whiteBishop.pieceType}
            width={80}
            height={80}
            className="cursor-pointer"
          ></Image>
        </>
      )}

      {color === "BLACK" && (
        <>
          <Image
            src={resolvePieceToImage(blackQueen)}
            alt={blackQueen.pieceType}
            width={80}
            height={80}
            className="cursor-pointer"
          ></Image>
          <Image
            src={resolvePieceToImage(blackKnight)}
            alt={blackKnight.pieceType}
            width={80}
            height={80}
            className="cursor-pointer"
          ></Image>
          <Image
            src={resolvePieceToImage(blackRook)}
            alt={blackRook.pieceType}
            width={80}
            height={80}
            className="cursor-pointer"
          ></Image>
          <Image
            src={resolvePieceToImage(blackBishop)}
            alt={blackBishop.pieceType}
            width={80}
            height={80}
            className="cursor-pointer"
          ></Image>
        </>
      )}
    </div>
  );
};

export default Chessboard;
