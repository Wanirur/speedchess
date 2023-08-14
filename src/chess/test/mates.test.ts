import { initBoard } from "~/utils/pieces";
import ChessPosition from "../position";

test("test testing", () => {
  const position = new ChessPosition(initBoard(), "WHITE");
  expect(position.board).toEqual(initBoard());
});
