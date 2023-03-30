export const PieceTypes = ["Pawn", "Knight", "Bishop", "Rook", "Queen", "King"] as const;
export type PieceType = typeof PieceTypes[number];
