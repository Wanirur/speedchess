import { type NextPage } from "next";
import Chessboard from "~/components/chessboard";
import { addToTestBoard, blackPawn, blackRook, testBoard, whitePawn, whiteRook } from "~/utils/pieces";

const Test: NextPage = () => {
    const board = testBoard();
    addToTestBoard(board, whiteRook, {x: 5, y: 5})
    addToTestBoard(board, whiteRook, {x: 2, y: 5})
    addToTestBoard(board, blackRook, {x: 5, y: 2})
    addToTestBoard(board, whitePawn, {x: 3, y: 3})
    addToTestBoard(board, blackPawn, {x: 7, y: 3})
    addToTestBoard(board, blackPawn, {x: 4, y: 4})
    addToTestBoard(board, whitePawn, {x: 3, y: 4})


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
