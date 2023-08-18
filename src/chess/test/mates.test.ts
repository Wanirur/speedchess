import type ChessPosition from "../position";
import { FEN } from "~/utils/notations";
import Chessgame from "../chessgame";
import { SimpleHistory } from "../history";

type ChessgameForTesting = Chessgame<SimpleHistory<ChessPosition>>;

test("fool's mate", () => {
  const fen = FEN.fromString(
    "rnbqkbnr/ppppp2p/8/5ppQ/8/4P3/PPPP1PPP/RNB1KBNR w KQkq - 0 1"
  );
  const game: ChessgameForTesting = new Chessgame(new SimpleHistory(), fen);
  expect(game.gameResult).toEqual({ winner: "WHITE", reason: "MATE" });
});

test("rook king endgame", () => {
  const fen = FEN.fromString("2R1k3/8/4K3/8/8/8/8/8 w - - 0 1");

  const game: ChessgameForTesting = new Chessgame(new SimpleHistory(), fen);
  expect(game.gameResult).toEqual({ winner: "WHITE", reason: "MATE" });
});

test("two rook mate", () => {
  const fen = FEN.fromString("2R1k3/1R6/8/8/8/8/8/3K4 b - - 0 1");

  const game: ChessgameForTesting = new Chessgame(new SimpleHistory(), fen);
  expect(game.gameResult).toEqual({ winner: "WHITE", reason: "MATE" });
});

test("queen stalemate", () => {
  const fen = FEN.fromString("7k/5Q2/8/8/8/8/8/3K4 b - - 0 1");

  const game: ChessgameForTesting = new Chessgame(new SimpleHistory(), fen);

  expect(game.gameResult).toEqual({ winner: "DRAW", reason: "STALEMATE" });
});

test("king bishop knight mate", () => {
  const fen = FEN.fromString("k7/8/NKB5/8/8/8/8/8 b - - 0 1");

  const game: ChessgameForTesting = new Chessgame(new SimpleHistory(), fen);

  expect(game.gameResult).toEqual({ winner: "WHITE", reason: "MATE" });
});

test("king bishop knight mate 2", () => {
  const fen = FEN.fromString("8/kBK5/2N5/8/8/8/8/8 b - - 0 1");

  const game: ChessgameForTesting = new Chessgame(new SimpleHistory(), fen);

  expect(game.gameResult).toEqual({ winner: "WHITE", reason: "MATE" });
});

test("smothered mate", () => {
  const fen = FEN.fromString("kr6/ppN5/8/8/8/8/8/7K b - - 0 1");

  const game: ChessgameForTesting = new Chessgame(new SimpleHistory(), fen);

  expect(game.gameResult).toEqual({ winner: "WHITE", reason: "MATE" });
});

test("rook queen", () => {
  const fen = FEN.fromString("8/8/8/8/8/4k3/4q3/4K3 w - - 0 1");

  const game: ChessgameForTesting = new Chessgame(new SimpleHistory(), fen);

  expect(game.gameResult).toEqual({ winner: "BLACK", reason: "MATE" });
});

test("rook queen 2", () => {
  const fen = FEN.fromString("4k3/4Q3/4K3/8/8/8/8/8 b - - 0 1");

  const game: ChessgameForTesting = new Chessgame(new SimpleHistory(), fen);

  expect(game.gameResult).toEqual({ winner: "WHITE", reason: "MATE" });
});

test("king 2 bishops", () => {
  const fen = FEN.fromString("k7/2B5/1KB5/8/8/8/8/8 b - - 0 1");

  const game: ChessgameForTesting = new Chessgame(new SimpleHistory(), fen);

  expect(game.gameResult).toEqual({ winner: "WHITE", reason: "MATE" });
});

test("2 rooks covered", () => {
  const fen = FEN.fromString("4Rn1k/3R4/1K6/8/8/8/8/8 b - - 0 1");

  const game: ChessgameForTesting = new Chessgame(new SimpleHistory(), fen);

  expect(game.gameResult).toEqual(undefined);
});

test("2 rooks possible cover", () => {
  const fen = FEN.fromString("4Rn1k/3R4/1K6/8/8/8/8/8 b - - 0 1");

  const game: ChessgameForTesting = new Chessgame(new SimpleHistory(), fen);

  expect(game.gameResult).toEqual(undefined);
});

test("2 rooks possible cover pinned", () => {
  const fen = FEN.fromString("4R2k/3R4/1K5b/8/7R/8/8/8 b - - 0 1");

  const game: ChessgameForTesting = new Chessgame(new SimpleHistory(), fen);

  expect(game.gameResult).toEqual({ winner: "WHITE", reason: "MATE" });
});

test("2 rooks covered by your own piece", () => {
  const fen = FEN.fromString("4RB1k/3R4/1K6/8/8/8/8/8 b - - 0 1");

  const game: ChessgameForTesting = new Chessgame(new SimpleHistory(), fen);

  expect(game.gameResult).toEqual(undefined);
});

test("2 rooks covered by your own piece stalemate", () => {
  const fen = FEN.fromString("4R1Bk/3R4/1K6/8/8/8/8/8 b - - 0 1");

  const game: ChessgameForTesting = new Chessgame(new SimpleHistory(), fen);

  expect(game.gameResult).toEqual({ winner: "DRAW", reason: "STALEMATE" });
});
