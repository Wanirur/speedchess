import { type Coords } from "./coords";

/* eslint-disable @typescript-eslint/no-non-null-assertion */
export const PieceTypes = [
  "PAWN",
  "KNIGHT",
  "BISHOP",
  "ROOK",
  "QUEEN",
  "KING",
] as const;

export type PlayerColor = "WHITE" | "BLACK";
export type PieceType = (typeof PieceTypes)[number];
export const PossiblePromotions = [
  "QUEEN",
  "KNIGHT",
  "ROOK",
  "BISHOP",
] as const;

export type PromotedPieceType = (typeof PossiblePromotions)[number];
export type Piece = {
  color: PlayerColor;
  pieceType: PieceType;
};

export const whiteRook = { pieceType: "ROOK", color: "WHITE" } as Piece;
export const blackRook = { ...whiteRook, color: "BLACK" } as Piece;
export const whiteBishop = { pieceType: "BISHOP", color: "WHITE" } as Piece;
export const blackBishop = { ...whiteBishop, color: "BLACK" } as Piece;
export const whiteKnight = { pieceType: "KNIGHT", color: "WHITE" } as Piece;
export const blackKnight = { ...whiteKnight, color: "BLACK" } as Piece;
export const whiteKing = { pieceType: "KING", color: "WHITE" } as Piece;
export const blackKing = { ...whiteKing, color: "BLACK" } as Piece;
export const whiteQueen = { pieceType: "QUEEN", color: "WHITE" } as Piece;
export const blackQueen = { ...whiteQueen, color: "BLACK" } as Piece;
export const whitePawn = { pieceType: "PAWN", color: "WHITE" } as Piece;
export const blackPawn = { ...whitePawn, color: "BLACK" } as Piece;

export type Tile = Piece | null;
export type Board = Tile[][];

const finishReason = [
  "RESIGNATION",
  "MATE",
  "TIMEOUT",
  "ABANDONMENT",
  "AGREEMENT",
  "STALEMATE",
  "REPETITION",
  "FIFTY_MOVE",
] as const;

export type GameResult = {
  winner: PlayerColor | "DRAW";
  reason: (typeof finishReason)[number];
};

const pieces = new Map<string, string>();
pieces.set(JSON.stringify(whiteRook), "/white_rook.svg");
pieces.set(JSON.stringify(blackRook), "/black_rook.svg");
pieces.set(JSON.stringify(whiteBishop), "/white_bishop.svg");
pieces.set(JSON.stringify(blackBishop), "/black_bishop.svg");
pieces.set(JSON.stringify(whiteKnight), "/white_knight.svg");
pieces.set(JSON.stringify(blackKnight), "/black_knight.svg");
pieces.set(JSON.stringify(whiteKing), "/white_king.svg");
pieces.set(JSON.stringify(blackKing), "/black_king.svg");
pieces.set(JSON.stringify(whiteQueen), "/white_queen.svg");
pieces.set(JSON.stringify(blackQueen), "/black_queen.svg");
pieces.set(JSON.stringify(whitePawn), "/white_pawn.svg");
pieces.set(JSON.stringify(blackPawn), "/black_pawn.svg");

export const resolvePieceToImage = (piece: Piece) => {
  const image = pieces.get(JSON.stringify(piece));
  if (!image) {
    throw new Error("incorrect image");
  }
  return image;
};

export const buildEmptyBoard = () => {
  const board = new Array<Tile[]>(8);
  for (let i = 0; i < 8; i++) {
    board[i] = new Array<Tile>(8).fill(null);
  }
  return board as Board;
};

export const addPieceToBoard = (
  board: Tile[][],
  piece: Piece,
  coords: Coords | undefined
) => {
  if (!coords) {
    return board;
  }
  board[coords.y]![coords.x] = piece;
  return board;
};

export const initBoard = () => {
  const board = new Array<Tile[]>(8);
  for (let i = 0; i < 8; i++) {
    board[i] = new Array<Tile>(8).fill(null);
  }
  const white_row = board[0]!;
  white_row[0] = white_row[7] = whiteRook;
  white_row[1] = white_row[6] = whiteKnight;
  white_row[2] = white_row[5] = whiteBishop;
  white_row[3] = whiteQueen;
  white_row[4] = whiteKing;
  board[1]?.fill(whitePawn);

  const black_row = board[7]!;
  black_row[0] = black_row[7] = blackRook;
  black_row[1] = black_row[6] = blackKnight;
  black_row[2] = black_row[5] = blackBishop;
  black_row[3] = blackQueen;
  black_row[4] = blackKing;
  board[6]?.fill(blackPawn);
  return board;
};

export const copyBoard = (board: Board) => {
  return board.map((row) => [...row]);
};

export const copyIntoBoard = (source: Board, destination: Board) => {
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const src = source[i]![j];
      if (src !== undefined) {
        destination[i]![j] = src;
      }
    }
  }

  return destination;
};
