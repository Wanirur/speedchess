import { Coords } from "./coords";
import {
  buildEmptyBoard,
  type Board,
  type PlayerColor,
  type Tile,
  addPieceToBoard,
  whitePawn,
  blackPawn,
  blackKnight,
  whiteKnight,
  blackBishop,
  whiteBishop,
  blackRook,
  whiteRook,
  blackQueen,
  whiteQueen,
  blackKing,
  whiteKing,
} from "./pieces";

//fen notation type used for enforcing threefold repetition rule
//https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation
export class FEN {
  private _piecePlacement: string;
  private _turn: PlayerColor;
  private _castlingPrivilages: string;
  private _enPassantTarget: string;
  private _halfMoveCount: number;
  private _fullMoveCount: number;

  constructor(
    board: Board,
    turnColor: PlayerColor,
    whiteShortCastling: boolean,
    whiteLongCastling: boolean,
    blackShortCastling: boolean,
    blackLongCastling: boolean,
    lastEnPassant: Coords | undefined,
    halfMoves: number
  ) {
    let piecePlacement = "";

    for (const row of board) {
      const rowSymbols = row.map((tile) => {
        return this._resolvePieceToFenSymbol(tile);
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

    piecePlacement = piecePlacement.slice(0, -1);
    this._piecePlacement = piecePlacement;

    this._turn = turnColor;

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

    this._castlingPrivilages = castlingPrivilages;
    this._enPassantTarget = lastEnPassant
      ? String.fromCharCode("a".charCodeAt(0) + lastEnPassant.x) +
        lastEnPassant.y.toString()
      : "-";

    this._halfMoveCount = halfMoves;
    this._fullMoveCount = Math.floor(halfMoves / 2);
  }

  public buildBoardFromFEN() {
    const board = buildEmptyBoard();

    const rows = this._piecePlacement.split("/");
    let y = 0,
      x = 0;
    for (const row of rows) {
      for (const symbol of row) {
        const tile = this._resolveFenSymbolToPiece(symbol);
        if (typeof tile === "string") {
          x += Number.parseInt(tile);
          continue;
        }
        addPieceToBoard(board, tile, Coords.getInstance(x, y));
        x++;
      }
      y++;
      x = 0;
    }

    return board;
  }

  public toString() {
    return this._piecePlacement + " " + this._turn === "WHITE"
      ? "w"
      : "b" +
          " " +
          this._castlingPrivilages +
          " " +
          this._enPassantTarget +
          " " +
          this._halfMoveCount +
          " " +
          this._fullMoveCount;
  }

  private _resolvePieceToFenSymbol(piece: Tile) {
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
  }

  private _resolveFenSymbolToPiece(symbol: string) {
    if (symbol === "p") {
      return blackPawn;
    } else if (symbol === "P") {
      return whitePawn;
    } else if (symbol === "n") {
      return blackKnight;
    } else if (symbol === "N") {
      return whiteKnight;
    } else if (symbol === "b") {
      return blackBishop;
    } else if (symbol === "B") {
      return whiteBishop;
    } else if (symbol === "r") {
      return blackRook;
    } else if (symbol === "R") {
      return whiteRook;
    } else if (symbol === "q") {
      return blackQueen;
    } else if (symbol === "Q") {
      return whiteQueen;
    } else if (symbol === "k") {
      return blackKing;
    } else if (symbol === "K") {
      return whiteKing;
    } else {
      return symbol;
    }
  }
}
