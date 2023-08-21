import { AlgebraicNotation, FEN } from "~/utils/notations";
import Chessgame from "../chessgame";
import { SimpleHistory } from "../history";
import type ChessPosition from "../position";
import { Coords } from "~/utils/coords";

type ChessgameForTesting = Chessgame<SimpleHistory<ChessPosition>>;

test("3-fold repetition", () => {
  const fen = FEN.fromString("4k3/8/8/8/8/8/8/3QK3 w - - 0 1");
  const game: ChessgameForTesting = new Chessgame(new SimpleHistory(), fen);
  expect(game.gameResult).toEqual(undefined);

  game.move(Coords.getInstance(3, 0)!, Coords.getInstance(3, 1)!);
  expect(game.gameResult).toEqual(undefined);

  game.move(Coords.getInstance(4, 7)!, Coords.getInstance(4, 6)!);
  expect(game.gameResult).toEqual(undefined);

  game.move(Coords.getInstance(3, 1)!, Coords.getInstance(3, 0)!);
  expect(game.gameResult).toEqual(undefined);

  game.move(Coords.getInstance(4, 6)!, Coords.getInstance(4, 7)!);
  expect(game.gameResult).toEqual(undefined);

  game.move(Coords.getInstance(3, 0)!, Coords.getInstance(3, 1)!);
  expect(game.gameResult).toEqual(undefined);

  game.move(Coords.getInstance(4, 7)!, Coords.getInstance(4, 6)!);
  expect(game.gameResult).toEqual(undefined);

  game.move(Coords.getInstance(3, 1)!, Coords.getInstance(3, 0)!);
  expect(game.gameResult).toEqual(undefined);

  game.move(Coords.getInstance(4, 6)!, Coords.getInstance(4, 7)!);
  expect(game.gameResult).toEqual({ winner: "DRAW", reason: "REPETITION" });
});

test("3-fold repetition discontinuated", () => {
  const fen = FEN.fromString("4k3/8/8/8/8/8/8/3QK3 w - - 0 1");
  const game: ChessgameForTesting = new Chessgame(new SimpleHistory(), fen);
  expect(game.gameResult).toEqual(undefined);

  game.move(Coords.getInstance(3, 0)!, Coords.getInstance(3, 1)!);
  expect(game.gameResult).toEqual(undefined);

  game.move(Coords.getInstance(4, 7)!, Coords.getInstance(4, 6)!);
  expect(game.gameResult).toEqual(undefined);

  game.move(Coords.getInstance(3, 1)!, Coords.getInstance(3, 0)!);
  expect(game.gameResult).toEqual(undefined);

  game.move(Coords.getInstance(4, 6)!, Coords.getInstance(4, 7)!);
  expect(game.gameResult).toEqual(undefined);

  game.move(Coords.getInstance(3, 0)!, Coords.getInstance(3, 2)!);
  expect(game.gameResult).toEqual(undefined);

  game.move(Coords.getInstance(4, 7)!, Coords.getInstance(5, 7)!);
  expect(game.gameResult).toEqual(undefined);

  game.move(Coords.getInstance(3, 2)!, Coords.getInstance(3, 3)!);
  expect(game.gameResult).toEqual(undefined);

  game.move(Coords.getInstance(5, 7)!, Coords.getInstance(4, 6)!);
  expect(game.gameResult).toEqual(undefined);

  game.move(Coords.getInstance(3, 3)!, Coords.getInstance(3, 1)!);
  expect(game.gameResult).toEqual(undefined);

  game.move(Coords.getInstance(4, 6)!, Coords.getInstance(5, 6)!);
  expect(game.gameResult).toEqual(undefined);

  game.move(Coords.getInstance(3, 1)!, Coords.getInstance(3, 0)!);
  expect(game.gameResult).toEqual(undefined);

  game.move(Coords.getInstance(5, 6)!, Coords.getInstance(4, 7)!);
  expect(game.gameResult).toEqual({ winner: "DRAW", reason: "REPETITION" });
});

test("50-move rule", () => {
  //timman vs lutz 1995
  const uciString = `d2d4 g8f6 c2c4 e7e6 b1c3 f8b4 e2e3 e8g8 f1d3 d7d5 g1f3 c7c5 e1g1 b8c6 a2a3 b4c3 b2c3 d5c4 d3c4 d8c7 c4b5 a7a6 b5d3 e6e5 d1c2 b7b5 e3e4 e5d4 c3d4 c5c4 d3e2 f8e8 d4d5 c6e5 c1b2 e5f3 e2f3 c8g4 d5d6 c7c6 f3g4 f6g4 h2h3 g4e5 a1d1 e5d7 f1e1 a6a5 b2c3 f7f6 c2d2 e8e4 e1e4 c6e4 c3a5 a8e8 a5b4 e8e5 f2f3 e4e3 d2e3 e5e3 g1f2 e3e8 f3f4 g8f7 d1d5 e8b8 f2e3 f7e6 d5d1 f6f5 g2g4 f5g4 h3g4 d7f6 f4f5 e6d7 g4g5 b8e8 e3f4 f6h5 f4g4 g7g6 f5g6 h7g6 d1d5 h5g7 d5b5 g7f5 b5b7 d7e6 b7c7 e8h8 g4f3 h8h3 f3f2 h3h2 f2e1 h2h1 e1f2 h1h2 f2f1 h2h1 f1g2 h1d1 g2f2 d1d4 f2e1 d4h4 e1d2 h4h2 d2c3 h2h3 c3c4 f5d6 c4c5 d6e4 c5b5 e4g5 a3a4 g5f3 a4a5 f3d4 b5c4 h3h4 b4c5 d4c6 c4b5 c6a5 b5a5 g6g5 a5b5 g5g4 c7g7 g4g3 g7g3 h4h1 b5c6 h1e1 c5d4 e1c1 d4c3 c1d1 g3e3 e6f5 c6c5 d1d8 c3e5 d8c8 c5d5 c8a8 e3f3 f5g4 f3f7 a8a5 d5e4 a5a4 e5d4 g4g5 f7g7 g5h4 e4e5 h4h3 g7g1 a4b4 d4e3 b4g4 g1a1 h3g2 e3f4 g4g8 a1a2 g2f3 a2a3 f3e2 e5e4 g8e8 f4e5 e8e7 a3a2 e2e1 e4d4 e1f1 e5f4 e7e2 a2a8 e2e7 d4d3 f1g2 a8f8 e7e6 f8f7 e6e8 f4e3 e8a8 e3c5 a8a4 d3e3 a4g4 c5d6 g4g6 f7f2 g2h3 d6e5 h3g4 e3e4 g4h5 e5f6 h5g4 f2f4 g4g3 e4e3 g3h3 f4f5 g6g3 e3f2 g3g2 f2f1 g2c2 f5g5 c2c4 f6e5 h3h4 g5g8 c4e4 e5g3 h4h5 f1f2 e4a4 f2f3 h5h6 g3e5 a4b4 e5f4 h6h7 g8g5 b4a4 f3g4 a4b4 g4f5 b4b5`;

  const game: ChessgameForTesting = new Chessgame(new SimpleHistory());
  game.playOutFromMoves(uciString);

  expect(game.gameResult).toEqual({ winner: "DRAW", reason: "FIFTY_MOVE" });
});
