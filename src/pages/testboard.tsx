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
  whiteBishop,
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
  addToTestBoard(board, blackRook, Coords.getInstance(5, 2));
  addToTestBoard(board, whitePawn, Coords.getInstance(3, 3));
  addToTestBoard(board, blackPawn, Coords.getInstance(7, 3));
  addToTestBoard(board, blackPawn, Coords.getInstance(4, 4));
  addToTestBoard(board, whitePawn, Coords.getInstance(3, 4));
  addToTestBoard(board, whiteBishop, Coords.getInstance(0, 3));
  addToTestBoard(board, blackBishop, Coords.getInstance(3, 0));
  addToTestBoard(board, whiteQueen, Coords.getInstance(0, 4));
  addToTestBoard(board, blackQueen, Coords.getInstance(0, 7));
  addToTestBoard(board, whiteKing, Coords.getInstance(2, 0));
  addToTestBoard(board, blackKing, Coords.getInstance(1, 6));
  addToTestBoard(board, whiteKnight, Coords.getInstance(2, 2));
  addToTestBoard(board, blackKnight, Coords.getInstance(1, 2));

  return (
    <div className="flex h-screen items-center justify-center bg-neutral-900">
      <Chessboard
        uuid={"test"}
        color={"white"}
        isYourTurn={true}
        board={board}
      ></Chessboard>
    </div>
  );
};

export default Test;
