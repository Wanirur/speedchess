import { type NextPage } from "next";
import { useRef } from "react";
import Chessboard from "~/components/chessboard";
import Chess from "~/utils/chess";
import { Coords } from "~/utils/coords";
import {
  addPieceToBoard,
  blackBishop,
  blackKing,
  blackKnight,
  blackPawn,
  blackQueen,
  blackRook,
  initBoard,
  buildEmptyBoard,
  whiteKing,
  whiteKnight,
  whitePawn,
  whiteQueen,
  whiteRook,
} from "~/utils/pieces";

const Test: NextPage = () => {
  const board = initBoard();

  const chessRef = useRef<Chess | null>(null);
  if (chessRef.current === null) {
    chessRef.current = new Chess(board);
  }

  return (
    <div className="flex h-screen items-center justify-center bg-neutral-900">
      {chessRef.current && (
        <Chessboard
          uuid={"test"}
          color={"BLACK"}
          isYourTurn={true}
          board={board}
          chess={chessRef.current}
        ></Chessboard>
      )}
    </div>
  );
};

export default Test;
