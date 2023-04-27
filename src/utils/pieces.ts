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
}

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
  board[60] = blackKing;
  board[59] = blackQueen;
  board = board.fill(blackPawn, 48, 56);
  return board;
};

export const movePiece = (board: Tile[], from: number, to: number): Tile[] => {
  if(!board) {
    return board;
  }
  const movedPiece = board[from];
  if (!movedPiece) {
    return board;
  }

  board[from] = null;
  board[to] = movedPiece;
  return board;
};
