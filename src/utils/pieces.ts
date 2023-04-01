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

export type Tile = Piece | null;

export const initBoard = (): Tile[] => {
  const board = [] as Tile[];
  board.fill(null, 0, 64);

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

  board[0] = board[7] = whiteRook;
  board[1] = board[6] = whiteKnight;
  board[2] = board[5] = whiteBishop;
  board[3] = whiteQueen;
  board[4] = whiteKing;
  board.fill(whitePawn, 8, 16);

  board[63] = board[56] = blackRook;
  board[62] = board[57] = blackKnight;
  board[61] = board[58] = blackBishop;
  board[60] = blackQueen;
  board[59] = blackKing;
  board.fill(blackPawn, 48, 56);
  return board;
};
