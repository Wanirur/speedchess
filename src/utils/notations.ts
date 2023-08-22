import { MoveDescriptor } from "~/chess/history";
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
  copyBoard,
  initBoard,
  type PromotedPieceType,
} from "~/chess/utils";

//fen notation
//https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation
export class FEN {
  private _board: string;
  public get board() {
    return this._board;
  }

  private _turn: PlayerColor;
  public get turn(): PlayerColor {
    return this._turn;
  }

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
  public get halfMoveCount(): number {
    return this._halfMoveCount;
  }

  private _fullMoveCount: number;
  public get fullMoveCount(): number {
    return this._fullMoveCount;
  }

  constructor(
    board: Board,
    turnColor: PlayerColor,
    whiteShortCastling: boolean,
    whiteLongCastling: boolean,
    blackShortCastling: boolean,
    blackLongCastling: boolean,
    lastEnPassant: Coords | undefined,
    halfMoves: number,
    fullMoves: number
  ) {
    let piecePlacement = "";

    const rows = copyBoard(board).reverse();
    for (const row of rows) {
      const rowSymbols = row.map((tile) => {
        return FEN._resolvePieceToFenSymbol(tile);
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

    this._board = piecePlacement.slice(0, -1);

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
    this._fullMoveCount = fullMoves;
  }

  public static startingPosition() {
    return new FEN(
      initBoard(),
      "WHITE",
      true,
      true,
      true,
      true,
      undefined,
      0,
      1
    );
  }

  public static fromString(fen: string) {
    const [
      boardString,
      turnString,
      castlingString,
      enPassantString,
      halfsString,
      movesString,
    ] = fen.split(" ");

    if (
      !boardString ||
      !turnString ||
      !castlingString ||
      !enPassantString ||
      !movesString ||
      !halfsString
    ) {
      throw new Error("incorrect fen string");
    }

    const rows = boardString.split("/").reverse();
    if (!rows) {
      throw new Error("incorrect piece placement");
    }

    const board = buildEmptyBoard();
    for (let i = 0; i < 8; i++) {
      const row = rows[i];
      if (!row) {
        throw new Error("incorrect piece placement");
      }

      const tiles = row.split("");
      let symbolIndex = 0;
      for (let j = 0; j < 8; j++, symbolIndex++) {
        const tile = tiles[symbolIndex];
        if (!tile) {
          throw new Error("incorrect piece");
        }
        const parsed = Number.parseInt(tile);
        if (!Number.isNaN(parsed)) {
          j += parsed - 1;
          continue;
        }

        const piece = FEN._resolveFenSymbolToPiece(tile);
        if (typeof piece === "string") {
          throw new Error("incorrect piece");
        }

        const coords = Coords.getInstance(j, i);

        addPieceToBoard(board, piece, coords);
      }
    }

    const turn = turnString === "w" ? "WHITE" : "BLACK";
    const whiteShort = castlingString.includes("K");
    const whiteLong = castlingString.includes("Q");

    const blackShort = castlingString.includes("k");
    const blackLong = castlingString.includes("q");

    const lastEnPassant = Coords.fromString(enPassantString) ?? undefined;
    const halfs = Number.parseInt(halfsString);
    const moves = Number.parseInt(movesString);

    const result = new FEN(
      board,
      turn,
      whiteShort,
      whiteLong,
      blackShort,
      blackLong,
      lastEnPassant,
      halfs,
      moves
    );

    return result;
  }

  public buildBoard() {
    const board = buildEmptyBoard();

    const rows = this._board.split("/").reverse();
    let y = 0,
      x = 0;
    for (const row of rows) {
      for (const symbol of row) {
        const tile = FEN._resolveFenSymbolToPiece(symbol);
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
      this._board +
      " " +
      (this._turn === "WHITE" ? "w" : "b") +
      " " +
      this._castlingPrivilages +
      " " +
      this._enPassantTarget +
      " " +
      this._fullMoveCount.toString() +
      " " +
      this._halfMoveCount.toString()
    );
  }

  private static _resolvePieceToFenSymbol(piece: Tile) {
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

  private static _resolveFenSymbolToPiece(symbol: string) {
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
export class AlgebraicNotation implements MoveDescriptor {
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

  private _isCheck: boolean;
  private _isMate: boolean;

  private _promotedTo: PromotedPieceType | undefined;

  constructor(
    from: Coords,
    to: Coords,
    piece: PieceType,
    isCapturing: boolean,
    isCheck: boolean,
    isMate: boolean,
    promotedTo?: PromotedPieceType
  ) {
    this._from = from;
    this._to = to;
    this._pieceType = piece;
    this._isCapturing = isCapturing;
    this._promotedTo = promotedTo;
    this._isCheck = isCheck;
    this._isMate = isMate;
  }

  //version used by UCI https://en.wikipedia.org/wiki/Universal_Chess_Interface
  public toLongNotationString() {
    let result = "";

    const from = this._from.toString();
    result += from.slice(0, 2);
    result += this._to.toString();

    if (this._promotedTo) {
      if (this._promotedTo === "QUEEN") {
        result += "q";
      } else if (this._promotedTo === "KNIGHT") {
        result += "n";
      } else if (this._promotedTo === "ROOK") {
        result += "r";
      } else {
        result += "b";
      }
    }

    return result;
  }

  public toString() {
    let result = "";

    if (this._pieceType === "KING") {
      const diff = Math.abs(this._from.x - this._to.x);
      if (diff === 3) {
        result += "O-O-O";

        if (this._isMate) {
          result += "#";
        } else if (this._isCheck) {
          result += "+";
        }

        return result;
      } else if (diff === 2) {
        result += "O-O";

        if (this._isMate) {
          result += "#";
        } else if (this._isCheck) {
          result += "+";
        }

        return result;
      }
    }

    if (this._pieceType !== "PAWN") {
      result = this._pieceType === "KNIGHT" ? "N" : this._pieceType.charAt(0);
    }

    if (this._isCapturing) {
      if (this._pieceType === "PAWN") {
        result += this._from.toString().at(0);
      }
      result += "x";
    }
    result += this._to.toString();

    if (this._promotedTo) {
      result += "=";
      result +=
        this._promotedTo === "KNIGHT" ? "N" : this._promotedTo.charAt(0);
    }

    if (this._isMate) {
      result += "#";
    } else if (this._isCheck) {
      result += "+";
    }

    return result;
  }

  public copy() {
    return new AlgebraicNotation(
      this._from,
      this._to,
      this._pieceType,
      this._isCapturing,
      this._isCheck,
      this._isMate,
      this._promotedTo
    );
  }

  public static getDataFromLANString(notation: string) {
    const fromCoordsString = notation.slice(0, 2);
    const toCoordsString = notation.slice(2, 4);
    const promotionSymbol = notation.charAt(4);

    const from = Coords.fromString(fromCoordsString);
    const to = Coords.fromString(toCoordsString);

    if (!from || !to) {
      throw new Error("incorrect coordinates");
    }

    let promotedTo;
    if (promotionSymbol) {
      if (promotionSymbol === "q") {
        promotedTo = "QUEEN";
      } else if (promotionSymbol === "n") {
        promotedTo = "KNIGHT";
      } else if (promotionSymbol === "r") {
        promotedTo = "ROOK";
      } else {
        promotedTo = "BISHOP";
      }
    }

    return {
      from: from,
      to: to,
      promotedTo: promotedTo as PromotedPieceType,
    };
  }
}
