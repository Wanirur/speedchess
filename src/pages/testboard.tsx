import { type NextPage } from "next";
import { useRef } from "react";
import Chessboard from "~/components/chessboard";
import Chess from "~/utils/chess";
import { Coords } from "~/utils/coords";
import {
  addToTestBoard,
  blackBishop,
  blackKing,
  blackKnight,
  blackPawn,
  blackQueen,
  blackRook,
  testBoard,
  whiteKing,
  whiteKnight,
  whitePawn,
  whiteQueen,
  whiteRook,
} from "~/utils/pieces";

const Test: NextPage = () => {
  const board = testBoard();

  addToTestBoard(board, whiteRook, Coords.getInstance(5, 5));
  addToTestBoard(board, whiteRook, Coords.getInstance(2, 5));
  addToTestBoard(board, whitePawn, Coords.getInstance(3, 3));
  addToTestBoard(board, whitePawn, Coords.getInstance(3, 4));
  addToTestBoard(board, whiteQueen, Coords.getInstance(0, 3));
  addToTestBoard(board, whiteKing, Coords.getInstance(2, 0));
  addToTestBoard(board, blackKing, Coords.getInstance(1, 6));
  addToTestBoard(board, whiteKnight, Coords.getInstance(2, 2));

  const chessRef = useRef<Chess | null>(null);
  if (chessRef.current === null) {
    chessRef.current = new Chess(board);
  }

  return (
    <div className="flex h-screen items-center justify-center bg-neutral-900">
      {chessRef.current && (
        <Chessboard
          uuid={"test"}
          color={"WHITE"}
          isYourTurn={true}
          board={board}
          chess={chessRef.current}
        ></Chessboard>
      )}
    </div>
  );
};

export default Test;
