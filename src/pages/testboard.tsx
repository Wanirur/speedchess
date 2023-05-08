import { type NextPage } from "next";
import Chessboard from "~/components/chessboard";
import { addToTestBoard, blackRook, testBoard, whiteRook } from "~/utils/pieces";

const Test: NextPage = () => {
    const board = testBoard();
    addToTestBoard(board, whiteRook, {x: 5, y: 5})
    addToTestBoard(board, whiteRook, {x: 2, y: 5})
    addToTestBoard(board, blackRook, {x: 5, y: 2})
  return (
    <div className="h-screen flex items-center justify-center">
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
