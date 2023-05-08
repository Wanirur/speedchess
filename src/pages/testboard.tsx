import { type NextPage } from "next";
import Chessboard from "~/components/chessboard";
import { addToTestBoard, blackBishop, blackPawn, blackRook, testBoard, whiteBishop, whitePawn, whiteRook } from "~/utils/pieces";

const Test: NextPage = () => {
    const board = testBoard();
    addToTestBoard(board, whiteRook, {x: 5, y: 5})
    addToTestBoard(board, whiteRook, {x: 2, y: 5})
    addToTestBoard(board, blackRook, {x: 5, y: 2})
    addToTestBoard(board, whitePawn, {x: 3, y: 3})
    addToTestBoard(board, blackPawn, {x: 7, y: 3})
    addToTestBoard(board, blackPawn, {x: 4, y: 4})
    addToTestBoard(board, whitePawn, {x: 3, y: 4})
    addToTestBoard(board, whiteBishop, {x: 0, y: 3})
    addToTestBoard(board, blackBishop, {x: 3, y: 0})

  return (
    <div className="h-screen flex items-center justify-center bg-neutral-900">
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
