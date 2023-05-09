import { type Coords } from "./coords";

/* eslint-disable @typescript-eslint/no-non-null-assertion */
export const PieceTypes = [
  "Pawn",
  "Knight",
  "Bishop",
  "Rook",
  "Queen",
  "King",
] as const;

export type PlayerColor = "white" | "black";

export type Piece = {
  color: PlayerColor;
  pieceType: (typeof PieceTypes)[number];
};

export const whiteRook = { pieceType: "Rook", color: "white" } as Piece;
export const blackRook = { ...whiteRook, color: "black" } as Piece;
export const whiteBishop = { pieceType: "Bishop", color: "white" } as Piece;
export const blackBishop = { ...whiteBishop, color: "black" } as Piece;
export const whiteKnight = { pieceType: "Knight", color: "white" } as Piece;
export const blackKnight = { ...whiteKnight, color: "black" } as Piece;
export const whiteKing = { pieceType: "King", color: "white" } as Piece;
export const blackKing = { ...whiteKing, color: "black" } as Piece;
export const whiteQueen = { pieceType: "Queen", color: "white" } as Piece;
export const blackQueen = { ...whiteQueen, color: "black" } as Piece;
export const whitePawn = { pieceType: "Pawn", color: "white" } as Piece;
export const blackPawn = { ...whitePawn, color: "black" } as Piece;

export type Tile = Piece | null;

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
  return pieces.get(JSON.stringify(piece));
};

export const testBoard = () => {
  const board = new Array<Tile[]>(8);
  for(let i = 0; i < 8; i++) {
    board[i] = new Array<Tile>(8).fill(null);
  }
  return board;
}

export const addToTestBoard = (board: Tile[][], piece: Piece, coords: Coords | undefined) => {
  if(!coords) {
    return board;
  }
  board[coords.y]![coords.x] = piece;
  return board;
}

export const initBoard = () => {
  const board = new Array<Tile[]>(8);
  for(let i = 0; i < 8; i++) {
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
  black_row[3] = blackKing;
  black_row[4] = blackQueen;
  board[6]?.fill(blackPawn);
  return board;
};

export const movePiece = (board: Tile[][], from: Coords, to: Coords) => {
  if (!board) {
    return board;
  }

  const movedPiece = board[from.y]![from.x];
  if (!movedPiece) {
    return board;
  }

  board[from.y]![from.x] = null;
  board[to.y]![to.x] = movedPiece;
  return board;
};