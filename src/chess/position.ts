/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Coords } from "~/utils/coords";
import { FEN } from "~/utils/notations";
import {
  type PlayerColor,
  type PromotedPieceType,
  blackKing,
  whiteKing,
  type Board,
  copyBoard,
  type Piece,
  type GameResult,
  oppositeColor,
} from "~/utils/pieces";
import {
  PieceAttacks,
  type KingCheck,
  type PieceInteractions,
} from "./attacks";

class ChessPosition {
  private _fen: FEN;
  public get fen(): FEN {
    return this._fen;
  }

  private _board: Board;
  public get board(): Board {
    return this._board;
  }
  public set board(value: Board) {
    this._board = value;
  }

  private _movedPawns = new Set<Coords>();
  public get movedPawns() {
    return this._movedPawns;
  }

  private _pawnPossibleToEnPassant: Coords | undefined;
  public get pawnPossibleToEnPassant(): Coords | undefined {
    return this._pawnPossibleToEnPassant;
  }

  private _pawnReadyToPromote: Coords | null = null;
  public get pawnReadyToPromote(): Coords | null {
    return this._pawnReadyToPromote;
  }

  private _whitePieceInteractions: PieceInteractions = {
    possibleMoves: [],
    attackedTiles: [],
    possibleCaptures: [],
    defendedPieces: [],
    kingChecks: [],
    pins: [],
  };
  public get whitePieceInteractions(): PieceInteractions {
    return this._whitePieceInteractions;
  }
  public set whitePieceInteractions(value: PieceInteractions) {
    this._whitePieceInteractions = value;
  }
  private _blackPieceInteractions: PieceInteractions = {
    possibleMoves: [],
    attackedTiles: [],
    possibleCaptures: [],
    defendedPieces: [],
    kingChecks: [],
    pins: [],
  };
  public get blackPieceInteractions(): PieceInteractions {
    return this._blackPieceInteractions;
  }
  public set blackPieceInteractions(value: PieceInteractions) {
    this._blackPieceInteractions = value;
  }

  private _whiteKingCoords: Coords;
  public get whiteKingCoords(): Coords {
    return this._whiteKingCoords;
  }
  private _blackKingCoords: Coords;
  public get blackKingCoords(): Coords {
    return this._blackKingCoords;
  }

  private _isWhiteShortCastlingPossible = true;
  public get isWhiteShortCastlingPossible() {
    return this._isWhiteShortCastlingPossible;
  }

  private _isBlackShortCastlingPossible = true;
  public get isBlackShortCastlingPossible() {
    return this._isBlackShortCastlingPossible;
  }

  private _isWhiteLongCastlingPossible = true;
  public get isWhiteLongCastlingPossible() {
    return this._isWhiteLongCastlingPossible;
  }

  private _isBlackLongCastlingPossible = true;
  public get isBlackLongCastlingPossible() {
    return this._isBlackLongCastlingPossible;
  }

  private _halfMovesSinceLastCaptureOrPawnMove = 0;
  private _movesPlayed = 0;

  private _lastMoveFrom: Coords | undefined;
  public get lastMoveFrom(): Coords | undefined {
    return this._lastMoveFrom;
  }

  private _lastMoveTo: Coords | undefined;
  public get lastMoveTo(): Coords | undefined {
    return this._lastMoveTo;
  }

  private _gameResult: GameResult | undefined;
  public get gameResult(): GameResult | undefined {
    return this._gameResult;
  }

  constructor(board: Board, turn: PlayerColor) {
    this._board = board;
    this._fen = new FEN(
      board,
      turn,
      this._isWhiteShortCastlingPossible,
      this._isWhiteLongCastlingPossible,
      this._isBlackShortCastlingPossible,
      this._isBlackLongCastlingPossible,
      this._pawnPossibleToEnPassant,
      this._halfMovesSinceLastCaptureOrPawnMove,
      this._movesPlayed
    );

    this._whiteKingCoords = this._findKing("WHITE");
    this._blackKingCoords = this._findKing("BLACK");
  }

  public move(from: Coords, to: Coords, playerColor: PlayerColor) {
    const movedPiece = this._board[from.y]![from.x];
    if (!movedPiece) {
      throw new Error("you tried to move empty file");
    }

    if (movedPiece.color !== playerColor) {
      throw new Error("you tried moving opponent's piece");
    }

    const toTile = this._board[to.y]![to.x];
    if (toTile === undefined) {
      throw new Error("incorrect coordinates");
    }

    const possibleMoves = PieceAttacks.getPossibleMoves(this, from);
    if (
      !possibleMoves.possibleMoves.includes(to) &&
      !possibleMoves.possibleCaptures.includes(to)
    ) {
      throw new Error("incorrect move");
    }

    const tempBoard = copyBoard(this._board);

    this.board[from.y]![from.x] = null;
    this.board[to.y]![to.x] = movedPiece;

    this._switchRookPositionWhenCastling(movedPiece, from, to);
    this._removePawnBehindWhenEnPassant(movedPiece, to, from);

    if (movedPiece === whiteKing) {
      this._whiteKingCoords = to;
    } else if (movedPiece === blackKing) {
      this._blackKingCoords = to;
    }

    const { white, black } = PieceAttacks.calculateAttackedTiles(this);

    this._whitePieceInteractions = white;
    this._blackPieceInteractions = black;

    if (
      (playerColor === "WHITE" &&
        this._blackPieceInteractions.kingChecks.length) ||
      (playerColor === "BLACK" &&
        this._whitePieceInteractions.kingChecks.length)
    ) {
      this._board = tempBoard;
      const { white, black } = PieceAttacks.calculateAttackedTiles(this);
      this._whitePieceInteractions = white;
      this._blackPieceInteractions = black;

      throw new Error("failed to defend check");
    }

    this._lastMoveFrom = from;
    this._lastMoveTo = to;

    this._setCastlingPrivileges(playerColor, movedPiece, from);

    this._pawnPossibleToEnPassant = undefined;
    if (movedPiece.pieceType === "PAWN") {
      if (this._movedPawns.has(from)) {
        this._movedPawns.delete(from);
      }

      this._movedPawns.add(to);

      if (Math.abs(from.y - to.y) === 2) {
        this._pawnPossibleToEnPassant = to;
      }

      if (
        (playerColor === "WHITE" && to.y === 7) ||
        (playerColor === "BLACK" && to.y === 0)
      ) {
        this._pawnReadyToPromote = to;
        return this._board;
      }
    }

    if (toTile === null && movedPiece.pieceType != "PAWN") {
      this._halfMovesSinceLastCaptureOrPawnMove += 1;
    } else {
      this._halfMovesSinceLastCaptureOrPawnMove = 0;
    }

    if (playerColor === "BLACK") {
      this._movesPlayed++;
    }

    this._fen = new FEN(
      this._board,
      playerColor,
      this._isWhiteShortCastlingPossible,
      this._isWhiteLongCastlingPossible,
      this._isBlackShortCastlingPossible,
      this._isBlackLongCastlingPossible,
      this.pawnPossibleToEnPassant,
      this._halfMovesSinceLastCaptureOrPawnMove,
      this._movesPlayed
    );

    if (this._isKingMated(oppositeColor(playerColor))) {
      this._gameResult = {
        winner: playerColor,
        reason: "MATE",
      };

      return this.board;
    }

    const hasStalemateOccured =
      (playerColor === "BLACK" &&
        this._whitePieceInteractions.possibleMoves.length +
          this._whitePieceInteractions.possibleCaptures.length ===
          0) ||
      (playerColor === "WHITE" &&
        this._blackPieceInteractions.possibleMoves.length +
          this._blackPieceInteractions.possibleCaptures.length ===
          0);

    if (hasStalemateOccured) {
      this._gameResult = {
        winner: "DRAW",
        reason: "STALEMATE",
      };
      return this._board;
    }

    return this.board;
  }

  public promote(promoteTo: PromotedPieceType, playerColor: PlayerColor) {
    const coords = this._pawnReadyToPromote;
    if (!coords) {
      throw new Error("no pawn ready for promotion");
    }

    const tile = this.board[coords.y]![coords.x];
    if (!tile || tile.pieceType !== "PAWN" || tile.color !== playerColor) {
      throw new Error("incorrect promotion target");
    }

    this.board[coords.y]![coords.x] = {
      pieceType: promoteTo,
      color: playerColor,
    };

    if (playerColor === "BLACK") {
      this._movesPlayed++;
    }

    PieceAttacks.calculateAttackedTiles(this);

    this._pawnReadyToPromote = null;
    if (this._isKingMated(oppositeColor(playerColor))) {
      this._gameResult = {
        winner: playerColor,
        reason: "MATE",
      };

      return this._board;
    }
    const hasStalemateOccured =
      (playerColor === "BLACK" &&
        this._whitePieceInteractions.possibleMoves.length +
          this._whitePieceInteractions.possibleCaptures.length ===
          0) ||
      (playerColor === "WHITE" &&
        this._blackPieceInteractions.possibleMoves.length +
          this._blackPieceInteractions.possibleCaptures.length ===
          0);

    if (hasStalemateOccured) {
      this._gameResult = {
        winner: "DRAW",
        reason: "STALEMATE",
      };
    }

    return this.board;
  }

  public toString() {
    return this._fen.toString();
  }

  private _setCastlingPrivileges(
    playerColor: PlayerColor,
    movedPiece: Piece,
    from: Coords
  ) {
    let shortCastlingPossible: boolean,
      longCastlingPossible: boolean,
      initialRookRowIndex: number;

    if (playerColor === "WHITE") {
      shortCastlingPossible = this._isWhiteShortCastlingPossible;
      longCastlingPossible = this._isWhiteLongCastlingPossible;
      initialRookRowIndex = 0;
    } else {
      shortCastlingPossible = this._isBlackShortCastlingPossible;
      longCastlingPossible = this._isBlackLongCastlingPossible;
      initialRookRowIndex = 7;
    }

    if (!shortCastlingPossible && !longCastlingPossible) {
      return;
    }

    if (movedPiece.pieceType === "KING") {
      shortCastlingPossible = false;
      longCastlingPossible = false;
    }

    if (movedPiece.pieceType === "ROOK") {
      if (from.x === 0 && from.y === initialRookRowIndex) {
        longCastlingPossible = false;
      } else if (from.x === 7 && from.y === initialRookRowIndex) {
        shortCastlingPossible = false;
      }
    }

    if (playerColor === "WHITE") {
      this._isWhiteShortCastlingPossible = shortCastlingPossible;
      this._isWhiteLongCastlingPossible = longCastlingPossible;
    } else {
      this._isBlackShortCastlingPossible = shortCastlingPossible;
      this._isBlackLongCastlingPossible = longCastlingPossible;
    }
  }

  private _removePawnBehindWhenEnPassant(
    movedPiece: Piece,
    to: Coords,
    from: Coords
  ) {
    if (
      this._pawnPossibleToEnPassant &&
      movedPiece.pieceType === "PAWN" &&
      to.x === this._pawnPossibleToEnPassant.x &&
      Math.abs(to.y - this._pawnPossibleToEnPassant.y) === 1 &&
      Math.abs(from.x - this._pawnPossibleToEnPassant.x) === 1
    ) {
      this.board[this._pawnPossibleToEnPassant.y]![
        this._pawnPossibleToEnPassant.x
      ] = null;
    }
  }

  private _switchRookPositionWhenCastling(
    movedPiece: Piece,
    from: Coords,
    to: Coords
  ) {
    if (movedPiece.pieceType === "KING" && Math.abs(from.x - to.x) === 2) {
      if (from.x - to.x < 0) {
        const rook = this.board[from.y]![7]!;
        this.board[from.y]![7] = null;
        this.board[from.y]![5] = rook;
      } else {
        const rook = this.board[from.y]![0]!;
        this.board[from.y]![0] = null;
        this.board[from.y]![3] = rook;
      }
    }
  }

  private _isKingMated(kingColor: PlayerColor) {
    if (
      (kingColor === "BLACK" &&
        !this._whitePieceInteractions.kingChecks.length) ||
      (kingColor === "WHITE" && !this._whitePieceInteractions.kingChecks.length)
    ) {
      return false;
    }

    let kingMoves: PieceInteractions,
      checks: KingCheck[],
      captures: Coords[],
      moves: Coords[];
    if (kingColor === "WHITE") {
      kingMoves = PieceAttacks.getPossibleMoves(this, this._whiteKingCoords);
      checks = this._blackPieceInteractions.kingChecks;
      captures = this._whitePieceInteractions.possibleCaptures;
      moves = this._whitePieceInteractions.possibleMoves;
    } else {
      kingMoves = PieceAttacks.getPossibleMoves(this, this._blackKingCoords);
      checks = this._whitePieceInteractions.kingChecks;
      captures = this._blackPieceInteractions.possibleCaptures;
      moves = this._blackPieceInteractions.possibleMoves;
    }

    if (
      kingMoves.possibleMoves.length !== 0 ||
      kingMoves.possibleCaptures.length !== 0
    ) {
      return false;
    }

    const defendingMoves = new Array<Coords[]>(checks.length);
    for (let i = 0; i < checks.length; i++) {
      defendingMoves[i] = [];
    }

    let index = 0;
    checks.forEach((check) => {
      if (captures.includes(check.attackingPieceCoords)) {
        defendingMoves[index]!.push(check.attackingPieceCoords);
      }

      const blocks = check.possibleBlocks.filter(
        (block) => moves.includes(block) || captures.includes(block)
      );
      blocks.forEach((block) => {
        defendingMoves[index]!.push(block);
      });
      index++;
    });

    const reduceResult = defendingMoves.reduce((prev, curr) =>
      prev.filter((x) => curr.includes(x))
    );

    if (reduceResult.length === 0) {
      return true;
    }

    return false;
  }

  private _findKing(color: PlayerColor) {
    let x;
    let y;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (
          this._board[i]![j] &&
          this._board[i]![j]!.pieceType === "KING" &&
          this._board[i]![j]!.color === color
        ) {
          y = i;
          x = j;
        }
      }
    }

    let kingCoords;
    if (
      x === undefined ||
      y === undefined ||
      (kingCoords = Coords.getInstance(x, y)) === undefined
    ) {
      throw new Error("board is missing a king");
    }

    return kingCoords;
  }
}

export default ChessPosition;
