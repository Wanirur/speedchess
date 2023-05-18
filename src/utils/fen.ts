import { type Coords } from "./coords";
import { type Board, type PlayerColor, type Tile } from "./pieces";

export type FEN = {
  piecePlacement: string;
  turn: string;
  castlingPrivelages: string;
  enPassantTarget: string;
  halfMoveCount: string;
  fullMoveCount: string;
};

const resolvePieceToFenSymbol = (piece: Tile) => {
  if (piece === null) {
    return 1;
  }

  let result;
  if (piece.pieceType === "PAWN") {
    result = "p";
  } else if (piece.pieceType === "BISHOP") {
    result = "b";
  } else if (piece.pieceType === "KNIGHT") {
    result = "n";
  } else if (piece.pieceType === "ROOK") {
    result = "r";
  } else if (piece.pieceType === "QUEEN") {
    result = "q";
  } else {
    result = "k";
  }

  if (piece.color === "WHITE") {
    result = result.toUpperCase();
  }

  return result;
};

export const createFEN = (
  board: Board,
  turnColor: PlayerColor,
  whiteShortCastling: boolean,
  whiteLongCastling: boolean,
  blackShortCastling: boolean,
  blackLongCastling: boolean,
  lastEnPassant: Coords | undefined,
  halfMoves: number
): FEN => {
  let piecePlacement = "";

  for (const row of board) {
    const rowSymbols = row.map((tile) => {
      return resolvePieceToFenSymbol(tile);
    });

    let longestSequence = 0;
    for (const symbol of rowSymbols) {
      if (symbol === 1) {
        longestSequence++;
        continue;
      }

      if (longestSequence != 0) {
        piecePlacement += longestSequence.toString();
        longestSequence = 0;
      }

      piecePlacement += symbol;
    }

    piecePlacement += "/";
  }

  const turn = turnColor === "WHITE" ? "w" : "b";

  let castlingPrivilages = "";
  if (whiteShortCastling) {
    castlingPrivilages += "K";
  }
  if (whiteLongCastling) {
    castlingPrivilages += "Q";
  }
  if (blackShortCastling) {
    castlingPrivilages += "k";
  }
  if (blackLongCastling) {
    castlingPrivilages += "q";
  }
  if (castlingPrivilages === "") {
    castlingPrivilages = "-";
  }

  const enPassantTarget = lastEnPassant
    ? String.fromCharCode("a".charCodeAt(0) + lastEnPassant.x) +
      lastEnPassant.y.toString()
    : "-";

  const fullMoves = Math.floor(halfMoves / 2);

  return {
    piecePlacement: piecePlacement,
    turn: turn,
    castlingPrivelages: castlingPrivilages,
    enPassantTarget: enPassantTarget,
    halfMoveCount: halfMoves.toString(),
    fullMoveCount: fullMoves.toString(),
  };
};
