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
  type PieceType,
  type GameResult,
} from "./pieces";

//fen notation
//https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation
export class FEN {
  private _piecePlacement: string;
  private _turn: PlayerColor;
  private _castlingPrivilages: string;
  public get castlingPrivilages(): {
    whiteShortCastling: boolean;
    whiteLongCastling: boolean;
    blackShortCastling: boolean;
    blackLongCastling: boolean;
  } {
    return {
      whiteShortCastling: this._castlingPrivilages.includes("K"),
      whiteLongCastling: this._castlingPrivilages.includes("Q"),
      blackShortCastling: this._castlingPrivilages.includes("k"),
      blackLongCastling: this._castlingPrivilages.includes("q"),
    };
  }

  private _enPassantTarget: string;
  public get enPassantTarget(): string {
    return this._enPassantTarget;
  }

  private _halfMoveCount: number;
  private _fullMoveCount: number;

  constructor(
    board: Board,
    turnColor: PlayerColor,
    whiteShortCastling: boolean,
    whiteLongCastling: boolean,
    blackShortCastling: boolean,
    blackLongCastling: boolean,
    lastEnPassant: Coords | null,
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

      if (longestSequence !== 0) {
        piecePlacement += longestSequence.toString();
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

  public buildBoard() {
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
    return (
      this._piecePlacement +
      " " +
      (this._turn === "WHITE" ? "w" : "b") +
      " " +
      this._castlingPrivilages +
      " " +
      this._enPassantTarget +
      " " +
      this._halfMoveCount.toString() +
      " " +
      this._fullMoveCount.toString()
    );
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

//https://en.wikipedia.org/wiki/Algebraic_notation_(chess)
export class AlgebraicNotation {
  private _from: Coords;
  public get from(): Coords {
    return this._from;
  }

  private _to: Coords;
  public get to(): Coords {
    return this._to;
  }
  private _pieceType: PieceType;
  private _isCapturing: boolean;
  private _isXDisambiguous: boolean;
  private _isYDisambiguous: boolean;

  private _isCheck: boolean;
  private _isMate: boolean;

  private _promotedTo: PieceType | undefined;
  private _gameResult: GameResult | undefined;

  constructor(
    from: Coords,
    to: Coords,
    piece: PieceType,
    isCapturing: boolean,
    isXDisambiguous: boolean,
    isYDisambiguous: boolean,
    isCheck: boolean,
    isMate: boolean,
    gameResult?: GameResult,
    promotedTo?: PieceType
  ) {
    this._from = from;
    this._to = to;
    this._pieceType = piece;
    this._isCapturing = isCapturing;
    this._isXDisambiguous = isXDisambiguous;
    this._isYDisambiguous = isYDisambiguous;
    this._promotedTo = promotedTo;
    this._gameResult = gameResult;
    this._isCheck = isCheck;
    this._isMate = isMate;
  }

  public toString() {
    if (this._gameResult) {
      if (this._gameResult.winner === "DRAW") {
        return "1/2-1/2";
      } else if (this._gameResult.winner === "WHITE") {
        return "1-0";
      } else {
        return "0-1";
      }
    }

    if (this._promotedTo) {
      return this._to.toNotation() + "=" + this._promotedTo === "KNIGHT"
        ? "N"
        : this._promotedTo.charAt(0);
    }

    let result = "";
    if (this._pieceType != "PAWN") {
      result = this._pieceType === "KNIGHT" ? "N" : this._pieceType.charAt(0);
    }

    const from = this._from.toNotation();
    if (
      !this._isXDisambiguous ||
      (this._pieceType === "PAWN" && this._isCapturing)
    ) {
      result += from.charAt(0);
    }
    if (!this._isYDisambiguous) {
      result += from.charAt(1);
    }
    if (this._isCapturing) {
      result += "x";
    }
    result += this._to.toNotation();

    if (this._isMate) {
      result += "#";
    } else if (this._isCheck) {
      result += "+";
    }

    return result;
  }
}
