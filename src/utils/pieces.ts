export const PieceTypes = [
  "Pawn",
  "Knight",
  "Bishop",
  "Rook",
  "Queen",
  "King",
] as const;
export type Piece = {
  color: "white" | "black";
  pieceType: (typeof PieceTypes)[number];
};

const whiteRook = { pieceType: "Rook", color: "white" } as Piece;
const blackRook = { ...whiteRook, color: "black" } as Piece;
const whiteBishop = { pieceType: "Bishop", color: "white" } as Piece;
const blackBishop = { ...whiteBishop, color: "black" } as Piece;
const whiteKnight = { pieceType: "Knight", color: "white" } as Piece;
const blackKnight = { ...whiteKnight, color: "black" } as Piece;
const whiteKing = { pieceType: "King", color: "white" } as Piece;
const blackKing = { ...whiteKing, color: "black" } as Piece;
const whiteQueen = { pieceType: "Queen", color: "white" } as Piece;
const blackQueen = { ...whiteQueen, color: "black" } as Piece;
const whitePawn = { pieceType: "Pawn", color: "white" } as Piece;
const blackPawn = { ...whitePawn, color: "black" } as Piece;

export type Tile = Piece | null;

const pieces = new Map<Piece, string>();
pieces.set(whiteRook, "/white_rook.svg");
pieces.set(blackRook, "/black_rook.svg");
pieces.set(whiteBishop, "/white_bishop.svg");
pieces.set(blackBishop, "/black_bishop.svg");
pieces.set(whiteKnight, "/white_knight.svg");
pieces.set(blackKnight, "/black_knight.svg");
pieces.set(whiteKing, "/white_king.svg");
pieces.set(blackKing, "/black_king.svg");
pieces.set(whiteQueen, "/white_queen.svg");
pieces.set(blackQueen, "/black_queen.svg");
pieces.set(whitePawn, "/white_pawn.svg");
pieces.set(blackPawn, "/black_pawn.svg");
export const pieceImages = pieces; 

export const initBoard = (): Tile[] => {
  let board = new Array(64) as Tile[];
  board = board.fill(null, 0, 64);

  board[0] = board[7] = whiteRook;
  board[1] = board[6] = whiteKnight;
  board[2] = board[5] = whiteBishop;
  board[3] = whiteQueen;
  board[4] = whiteKing;
  board = board.fill(whitePawn, 8, 16);

  board[63] = board[56] = blackRook;
  board[62] = board[57] = blackKnight;
  board[61] = board[58] = blackBishop;
  board[60] = blackQueen;
  board[59] = blackKing;
  board = board.fill(blackPawn, 48, 56);
  return board;
};
