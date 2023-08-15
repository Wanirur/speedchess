import { initBoard } from "~/utils/pieces";
import ChessPosition from "../position";
import { FEN } from "~/utils/notations";
import Chessgame from "../chessgame";
import { SimpleHistory } from "../history";

type ChessgameForTesting = Chessgame<SimpleHistory<ChessPosition>>;

test("fool's mate", () => {
  const fen = FEN.fromString(
    "rnbqkbnr/ppppp2p/8/5ppQ/8/4P3/PPPP1PPP/RNB1KBNR w KQkq - 0 1"
  );
  const game: ChessgameForTesting = new Chessgame(
    new SimpleHistory(),
    fen.buildBoard(),
    "WHITE"
  );
  expect(game.gameResult).toEqual({ winner: "WHITE", reason: "MATE" });
});
