import { type NextPage } from "next";
import Chessboard from "~/components/chessboard";
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

  return (
    <div className="flex h-screen items-center justify-center bg-neutral-900">
      <Chessboard
        uuid={"test"}
        color={"WHITE"}
        isYourTurn={true}
        board={board}
      ></Chessboard>
    </div>
  );
};

export default Test;
