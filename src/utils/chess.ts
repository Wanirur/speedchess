/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Coords } from "./coords";
import { AlgebraicNotation, FEN } from "./notations";
import {
  type PlayerColor,
  type Board,
  type GameResult,
  buildEmptyBoard,
  whiteKing,
  blackKing,
  type PromotedPieceType,
  copyIntoBoard,
} from "./pieces";

type KingCheck = {
  attackingPieceCoords: Coords;
  possibleBlocks: Coords[];
  cannotEscapeTo: Coords[];
};

type Pin = {
  pinnedPiece: Coords;
  possibleMoves: Coords[];
};

type PieceInteractions = {
  possibleMoves: Coords[];
  attackedTiles: Coords[];
  possibleCaptures: Coords[];
  defendedPieces: Coords[];
  kingCheck: KingCheck | undefined;
  pin: Pin | undefined;
};

class Chess {
  private _history: FEN[];
  public get history(): FEN[] {
    return this._history;
  }

  private _repetitions = new Map<FEN, number>();

  private _currentBoard: Board;
  public get board(): Board {
    return this._currentBoard;
  }
  public set board(value: Board) {
    this._currentBoard = value;
  }

  private _algebraic: AlgebraicNotation[] = [];
  public get algebraic() {
    return this._algebraic;
  }

  private _gameResult: GameResult | undefined;
  public get gameResult(): GameResult | undefined {
    return this._gameResult;
  }
  public set gameResult(value: GameResult | undefined) {
    this._gameResult = value;
  }

  private _movedPawns = new Set<Coords>();
  private _pawnPossibleToEnPassant: Coords | null = null;
  private _pawnReadyToPromote: Coords | null = null;
  public get pawnReadyToPromote(): Coords | null {
    return this._pawnReadyToPromote;
  }

  private _tilesAttackedByWhite = new Set<Coords>();
  private _tilesAttackedByBlack = new Set<Coords>();
  private _possibleMovesByWhite = new Set<Coords>();
  private _possibleMovesByBlack = new Set<Coords>();
  private _defendedPiecesOfWhite = new Set<Coords>();
  private _defendedPiecesOfBlack = new Set<Coords>();
  private _possibleCapturesOfWhite = new Set<Coords>();
  private _possibleCapturesOfBlack = new Set<Coords>();

  private _isWhiteKingChecked = false;
  private _isBlackKingChecked = false;
  private _kingChecksByWhite = new Set<KingCheck>();
  private _kingChecksByBlack = new Set<KingCheck>();
  private _pinsByWhite = new Map<Coords, Pin>();
  private _pinsByBlack = new Map<Coords, Pin>();

  private _whiteKingCoords: Coords;
  private _blackKingCoords: Coords;
  private _isWhiteShortCastlingPossible = true;
  private _isBlackShortCastlingPossible = true;
  private _isWhiteLongCastlingPossible = true;
  private _isBlackLongCastlingPossible = true;

  private _halfMovesSinceLastCaptureOrPawnMove = 0;

  constructor(board?: Board) {
    if (board) {
      this._currentBoard = board;
    } else {
      this._currentBoard = buildEmptyBoard();
    }

    this._calculateAttackedTiles();

    this._whiteKingCoords = this._findKing("WHITE");
    this._blackKingCoords = this._findKing("BLACK");

    this._history = [
      new FEN(this._currentBoard, "BLACK", true, true, true, true, null, 0),
    ];
  }

  public move(from: Coords, to: Coords, playerColor: PlayerColor) {
    const movedPiece = this._currentBoard[from.y]![from.x];
    if (!movedPiece) {
      throw new Error("you tried to move empty file");
    }

    if (movedPiece.color !== playerColor) {
      throw new Error("you tried moving opponent's piece");
    }

    const toTile = this._currentBoard[to.y]![to.x];
    if (toTile === undefined) {
      throw new Error("incorrect coordinates");
    }

    const possibleMoves = this.getPossibleMoves(from);
    if (
      !possibleMoves.possibleMoves.includes(to) &&
      !possibleMoves.possibleCaptures.includes(to)
    ) {
      throw new Error("incorrect move");
    }

    this.board[from.y]![from.x] = null;
    this.board[to.y]![to.x] = movedPiece;

    //check whether the move is castling in order to change rook position
    if (movedPiece.pieceType === "KING" && Math.abs(from.x - to.x) === 2) {
      if (from.x - to.x < 0) {
        const rook = this.board[from.y]![7]!;
        this.board[from.y]![7] = null;
        this.board[from.y]![5] = rook;
      } else {
        const rook = this.board[from.y]![0]!;
        this.board[from.y]![0] = null;
        this.board[from.y]![2] = rook;
      }
    }

    //check whether the move is en passant capture in order to remove the pawn behind
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

    const whiteKingCoordsTemp = this._whiteKingCoords;
    const blackKingCoordsTemp = this._blackKingCoords;

    if (movedPiece === whiteKing) {
      this._whiteKingCoords = to;
    } else if (movedPiece === blackKing) {
      this._blackKingCoords = to;
    }

    const tilesAttackedByWhiteTemp = this._tilesAttackedByWhite;
    const tilesAttackedByBlackTemp = this._tilesAttackedByBlack;
    const possibleMovesByWhiteTemp = this._tilesAttackedByWhite;
    const possibleMovesByBlackTemp = this._tilesAttackedByBlack;
    const possibleCapturesOfWhiteTemp = this._possibleCapturesOfWhite;
    const possibleCapturesOfBlackTemp = this._possibleCapturesOfBlack;
    const defendedPiecesOfWhiteTemp = this._defendedPiecesOfWhite;
    const defendedPiecesOfBlackTemp = this._defendedPiecesOfBlack;
    const kingChecksByWhiteTemp = this._kingChecksByWhite;
    const kingChecksByBlackTemp = this._kingChecksByBlack;
    const pinsByWhiteTemp = this._pinsByWhite;
    const pinsByBlackTemp = this._pinsByBlack;
    const whiteKingCheckedTemp = this._isWhiteKingChecked;
    const blackKingCheckedTemp = this._isBlackKingChecked;

    this._calculateAttackedTiles();
    //check whether you checked your king or failed to defend existing check
    //if cond is true then revert last move
    if (
      (playerColor === "WHITE" && this._isWhiteKingChecked) ||
      (playerColor === "BLACK" && this._isBlackKingChecked)
    ) {
      //history cannot be empty - first element is assigned in the constructor and no elements are removed
      // - non-null assertion allowed
      const old_board = this._history.at(-1)!.buildBoard();
      copyIntoBoard(old_board, this._currentBoard);
      this._tilesAttackedByWhite = tilesAttackedByWhiteTemp;
      this._tilesAttackedByBlack = tilesAttackedByBlackTemp;
      this._possibleMovesByWhite = possibleMovesByWhiteTemp;
      this._possibleMovesByBlack = possibleMovesByBlackTemp;
      this._isWhiteKingChecked = whiteKingCheckedTemp;
      this._isBlackKingChecked = blackKingCheckedTemp;
      this._whiteKingCoords = whiteKingCoordsTemp;
      this._blackKingCoords = blackKingCoordsTemp;
      this._possibleCapturesOfWhite = possibleCapturesOfWhiteTemp;
      this._possibleCapturesOfBlack = possibleCapturesOfBlackTemp;
      this._defendedPiecesOfWhite = defendedPiecesOfWhiteTemp;
      this._defendedPiecesOfBlack = defendedPiecesOfBlackTemp;
      this._kingChecksByWhite = kingChecksByWhiteTemp;
      this._kingChecksByBlack = kingChecksByBlackTemp;
      this._pinsByWhite = pinsByWhiteTemp;
      this._pinsByBlack = pinsByBlackTemp;

      throw new Error("failed to defend check");
    }

    if (
      playerColor === "WHITE" &&
      (this._isWhiteShortCastlingPossible || this._isWhiteLongCastlingPossible)
    ) {
      if (movedPiece.pieceType === "KING") {
        this._isWhiteShortCastlingPossible = false;
        this._isWhiteLongCastlingPossible = false;
      } else if (movedPiece.pieceType === "ROOK") {
        if (from.x === 0 && from.y === 0) {
          this._isWhiteLongCastlingPossible = false;
        } else if (from.x === 7 && from.y === 0) {
          this._isWhiteShortCastlingPossible = false;
        }
      }
    } else if (
      playerColor === "BLACK" &&
      (this._isBlackShortCastlingPossible || this._isBlackLongCastlingPossible)
    ) {
      if (movedPiece.pieceType === "KING") {
        this._isBlackShortCastlingPossible = false;
        this._isBlackLongCastlingPossible = false;
      } else if (movedPiece.pieceType === "ROOK") {
        if (from.x === 0 && from.y === 7) {
          this._isBlackLongCastlingPossible = false;
        } else if (from.x === 7 && from.y === 7) {
          this._isBlackShortCastlingPossible = false;
        }
      }
    }
    this._pawnPossibleToEnPassant = null;

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
      }
    }
    if (
      this._hasCheckmateOccured(playerColor === "WHITE" ? "BLACK" : "WHITE")
    ) {
      this._gameResult = { winner: playerColor, reason: "MATE" };
      this._algebraic.push(
        new AlgebraicNotation(
          from,
          to,
          movedPiece.pieceType,
          toTile !== null,
          true,
          true,
          playerColor === "WHITE"
            ? this._isBlackKingChecked
            : this._isWhiteKingChecked,
          !!this._gameResult
        )
      );
      return this._currentBoard;
    }

    //check stalemates
    if (
      (playerColor === "BLACK" &&
        this._possibleMovesByWhite.size === 0 &&
        this._possibleCapturesOfWhite.size === 0) ||
      (playerColor === "WHITE" &&
        this._possibleMovesByBlack.size === 0 &&
        this._possibleCapturesOfBlack.size === 0)
    ) {
      this._gameResult = { winner: "DRAW", reason: "STALEMATE" };
    }

    if (toTile === null && movedPiece.pieceType != "PAWN") {
      this._halfMovesSinceLastCaptureOrPawnMove += 1;
    } else {
      this._halfMovesSinceLastCaptureOrPawnMove = 0;
    }

    if (this._halfMovesSinceLastCaptureOrPawnMove === 100) {
      this._gameResult = {
        winner: "DRAW",
        reason: "FIFTY_MOVE",
      };
    }

    this._algebraic.push(
      new AlgebraicNotation(
        from,
        to,
        movedPiece.pieceType,
        toTile !== null,
        true,
        true,
        playerColor === "WHITE"
          ? this._isBlackKingChecked
          : this._isWhiteKingChecked,
        !!this._gameResult
      )
    );

    const currentBoardFEN = new FEN(
      this._currentBoard,
      playerColor === "WHITE" ? "BLACK" : "WHITE",
      this._isWhiteShortCastlingPossible,
      this._isWhiteLongCastlingPossible,
      this._isBlackShortCastlingPossible,
      this._isBlackLongCastlingPossible,
      this._pawnPossibleToEnPassant,
      this._halfMovesSinceLastCaptureOrPawnMove
    );
    this._history.push(currentBoardFEN);

    if (this._repetitions.has(this._history.at(-1)!)) {
      const count = this._repetitions.get(this.history.at(-1)!)! + 1;
      if (count === 3) {
        this._gameResult = {
          winner: "DRAW",
          reason: "REPETITION",
        };
      } else {
        this._repetitions.set(this.history.at(-1)!, count);
      }
    } else {
      this._repetitions.set(this.history.at(-1)!, 1);
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

    this._calculateAttackedTiles();
    this._history[-1] = new FEN(
      this.board,
      playerColor === "WHITE" ? "BLACK" : "WHITE",
      this._isWhiteShortCastlingPossible,
      this._isWhiteLongCastlingPossible,
      this._isBlackShortCastlingPossible,
      this._isBlackLongCastlingPossible,
      this._pawnPossibleToEnPassant,
      this._halfMovesSinceLastCaptureOrPawnMove
    );

    this._pawnReadyToPromote = null;
    if (
      this._hasCheckmateOccured(playerColor === "WHITE" ? "BLACK" : "WHITE")
    ) {
      this._gameResult = { winner: playerColor, reason: "MATE" };
    }
    if (
      (playerColor === "BLACK" &&
        this._tilesAttackedByWhite.size === 0 &&
        this._possibleCapturesOfWhite.size === 0) ||
      (playerColor === "WHITE" &&
        this._tilesAttackedByBlack.size === 0 &&
        this._possibleCapturesOfBlack.size === 0)
    ) {
      this._gameResult = { winner: "DRAW", reason: "STALEMATE" };
    }

    return this.board;
  }

  public getPossibleMoves(position: Coords): PieceInteractions {
    const emptyMoves = {
      possibleMoves: [] as Coords[],
      attackedTiles: [] as Coords[],
      possibleCaptures: [] as Coords[],
      defendedPieces: [] as Coords[],
      kingCheck: undefined,
      pin: undefined,
    };

    if (!position) {
      return emptyMoves;
    }

    const piece = this._currentBoard[position.y]![position.x]!;
    if (piece === null) {
      return emptyMoves;
    }

    if (piece.pieceType === "ROOK") {
      return this._getPossibleRookMoves(position, piece.color);
    }
    if (piece.pieceType === "PAWN") {
      return this._getPossiblePawnMoves(position, piece.color);
    }
    if (piece.pieceType === "BISHOP") {
      return this._getPossibleBishopMoves(position, piece.color);
    }
    if (piece.pieceType === "QUEEN") {
      return this._getPossibleQueenMoves(position, piece.color);
    }
    if (piece.pieceType === "KING") {
      return this._getPossibleKingMoves(position, piece.color);
    }
    if (piece.pieceType === "KNIGHT") {
      return this._getPossibleKnightMoves(position, piece.color);
    }

    return emptyMoves;
  }

  public revertLastMove() {
    if (this.history.length < 2) {
      throw new Error("no moves to revert");
    }

    this.history.pop();
    const fen = this.history.at(-1)!;
    this._currentBoard = fen.buildBoard();
    const castling = fen.castlingPrivilages;
    this._whiteKingCoords = this._findKing("WHITE");
    this._blackKingCoords = this._findKing("BLACK");
    this._isWhiteShortCastlingPossible = castling.whiteShortCastling;
    this._isWhiteLongCastlingPossible = castling.whiteLongCastling;
    this._isBlackShortCastlingPossible = castling.blackShortCastling;
    this._isBlackLongCastlingPossible = castling.blackLongCastling;

    return this.board;
  }

  public drawAgreement() {
    this._gameResult = {
      winner: "DRAW",
      reason: "AGREEMENT",
    };
  }

  public timeExpired(color: PlayerColor) {
    this._gameResult = {
      winner: color === "WHITE" ? "BLACK" : "WHITE",
      reason: "TIMEOUT",
    };
  }

  public resign(color: PlayerColor) {
    this._gameResult = {
      winner: color === "WHITE" ? "BLACK" : "WHITE",
      reason: "RESIGNATION",
    };
  }

  public abandon(color: PlayerColor) {
    this._gameResult = {
      winner: color === "WHITE" ? "BLACK" : "WHITE",
      reason: "ABANDONMENT",
    };
  }

  public getFullAlgebraicHistory() {
    let result = "";
    this._algebraic.forEach((move) => {
      result += move.toString();
    });

    return result;
  }

  private _calculateAttackedTiles() {
    let x = 0,
      y = 0;
    let isWhiteKingCheckedThisTurn = false;
    let isBlackKingCheckedThisTurn = false;

    const tilesAttackedByWhite = new Set<Coords>();
    const tilesAttackedByBlack = new Set<Coords>();
    const possibleMovesByWhite = new Set<Coords>();
    const possibleMovesByBlack = new Set<Coords>();
    const defendedPiecesOfWhite = new Set<Coords>();
    const defendedPiecesOfBlack = new Set<Coords>();
    const possibleCapturesOfWhite = new Set<Coords>();
    const possibleCapturesOfBlack = new Set<Coords>();
    const checksByWhite = new Set<KingCheck>();
    const checksByBlack = new Set<KingCheck>();
    const pinsByWhite = new Map<Coords, Pin>();
    const pinsByBlack = new Map<Coords, Pin>();

    for (const row of this._currentBoard) {
      for (const tile of row) {
        if (tile === null) {
          x++;
          continue;
        }
        const pieceCoords = Coords.getInstance(x, y);
        if (!pieceCoords) {
          x++;
          continue;
        }
        if (tile.pieceType === "KING") {
          x++;
          continue;
        }
        const possibleAttacks = this.getPossibleMoves(pieceCoords);

        possibleAttacks.possibleMoves.forEach((possibleMove) => {
          if (tile.color === "WHITE") {
            const pin = this._pinsByBlack.get(pieceCoords);
            if (pin && !pin.possibleMoves.includes(possibleMove)) {
              return;
            }

            possibleMovesByWhite.add(possibleMove);
          } else {
            const pin = this._pinsByWhite.get(pieceCoords);
            if (pin && !pin.possibleMoves.includes(possibleMove)) {
              return;
            }
            possibleMovesByBlack.add(possibleMove);
          }
        });
        possibleAttacks.attackedTiles.forEach((possibleAttack) => {
          if (tile.color === "WHITE") {
            const pin = this._pinsByBlack.get(pieceCoords);
            if (pin && !pin.possibleMoves.includes(possibleAttack)) {
              return;
            }

            tilesAttackedByWhite.add(possibleAttack);
          } else {
            const pin = this._pinsByWhite.get(pieceCoords);
            if (pin && !pin.possibleMoves.includes(possibleAttack)) {
              return;
            }
            tilesAttackedByBlack.add(possibleAttack);
          }
        });
        possibleAttacks.defendedPieces.forEach((defendedPiece) => {
          if (tile.color === "WHITE") {
            const pin = this._pinsByBlack.get(pieceCoords);
            if (pin && !pin.possibleMoves.includes(defendedPiece)) {
              return;
            }

            defendedPiecesOfWhite.add(defendedPiece);
          } else {
            const pin = this._pinsByWhite.get(pieceCoords);
            if (pin && !pin.possibleMoves.includes(defendedPiece)) {
              return;
            }
            defendedPiecesOfBlack.add(defendedPiece);
          }
        });
        possibleAttacks.possibleCaptures.forEach((possibleCapture) => {
          if (tile.color === "WHITE") {
            const pin = this._pinsByBlack.get(pieceCoords);
            if (pin && !pin.possibleMoves.includes(possibleCapture)) {
              return;
            }

            possibleCapturesOfWhite.add(possibleCapture);
          } else {
            const pin = this._pinsByWhite.get(pieceCoords);
            if (pin && !pin.possibleMoves.includes(possibleCapture)) {
              return;
            }
            possibleCapturesOfBlack.add(possibleCapture);
          }
        });

        if (possibleAttacks.kingCheck) {
          if (tile.color === "WHITE") {
            isBlackKingCheckedThisTurn = true;
            checksByWhite.add(possibleAttacks.kingCheck);
          } else {
            isWhiteKingCheckedThisTurn = true;
            checksByBlack.add(possibleAttacks.kingCheck);
          }
        }

        if (possibleAttacks.pin) {
          if (tile.color === "WHITE") {
            pinsByWhite.set(
              possibleAttacks.pin.pinnedPiece,
              possibleAttacks.pin
            );
          } else {
            pinsByBlack.set(
              possibleAttacks.pin.pinnedPiece,
              possibleAttacks.pin
            );
          }
        }
        x++;
      }
      x = 0;
      y++;
    }

    this._isWhiteKingChecked = isWhiteKingCheckedThisTurn;
    this._isBlackKingChecked = isBlackKingCheckedThisTurn;
    this._tilesAttackedByWhite = tilesAttackedByWhite;
    this._tilesAttackedByBlack = tilesAttackedByBlack;
    this._possibleMovesByWhite = possibleMovesByWhite;
    this._possibleMovesByBlack = possibleMovesByBlack;
    this._possibleCapturesOfWhite = possibleCapturesOfWhite;
    this._possibleCapturesOfBlack = possibleCapturesOfBlack;
    this._defendedPiecesOfWhite = defendedPiecesOfWhite;
    this._defendedPiecesOfBlack = defendedPiecesOfBlack;
    this._kingChecksByWhite = checksByWhite;
    this._kingChecksByBlack = checksByBlack;
    this._pinsByWhite = pinsByWhite;
    this._pinsByBlack = pinsByBlack;

    const whiteKingInteractions = this.getPossibleMoves(this._whiteKingCoords);
    whiteKingInteractions.possibleMoves.forEach((move) => {
      this._tilesAttackedByWhite.add(move);
      this._possibleMovesByWhite.add(move);
    });
    whiteKingInteractions.possibleCaptures.forEach((move) => {
      this._possibleCapturesOfWhite.add(move);
    });
    whiteKingInteractions.defendedPieces.forEach((move) => {
      this._defendedPiecesOfWhite.add(move);
    });
    const blackKingInteractions = this.getPossibleMoves(this._blackKingCoords);
    blackKingInteractions.possibleMoves.forEach((move) => {
      this._tilesAttackedByBlack.add(move);
      this._possibleMovesByBlack.add(move);
    });
    blackKingInteractions.possibleCaptures.forEach((move) => {
      this._possibleCapturesOfBlack.add(move);
    });
    blackKingInteractions.defendedPieces.forEach((move) => {
      this._defendedPiecesOfBlack.add(move);
    });
  }

  private _hasCheckmateOccured(kingColor: PlayerColor) {
    if (
      (kingColor === "BLACK" && !this._isBlackKingChecked) ||
      (kingColor === "WHITE" && !this._isWhiteKingChecked)
    ) {
      return false;
    }

    let kingMoves: PieceInteractions,
      checks: Set<KingCheck>,
      captures: Set<Coords>,
      moves: Set<Coords>;
    if (kingColor === "WHITE") {
      kingMoves = this.getPossibleMoves(this._whiteKingCoords);
      checks = this._kingChecksByBlack;
      captures = this._possibleCapturesOfWhite;
      moves = this._possibleMovesByWhite;
    } else {
      kingMoves = this.getPossibleMoves(this._blackKingCoords);
      checks = this._kingChecksByWhite;
      captures = this._possibleCapturesOfBlack;
      moves = this._possibleMovesByBlack;
    }

    if (
      kingMoves.possibleMoves.length !== 0 ||
      kingMoves.possibleCaptures.length !== 0
    ) {
      return false;
    }

    const defendingMoves = new Array<Coords[]>(checks.size);
    for (let i = 0; i < checks.size; i++) {
      defendingMoves[i] = [];
    }

    let index = 0;
    checks.forEach((check) => {
      if (captures.has(check.attackingPieceCoords)) {
        defendingMoves[index]!.push(check.attackingPieceCoords);
      }

      const blocks = check.possibleBlocks.filter(
        (block) => moves.has(block) || captures.has(block)
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

  private _getPossibleRookMoves(
    position: Coords,
    color: PlayerColor
  ): PieceInteractions {
    const checkLine = (xDiff: number, yDiff: number) => {
      const possibleMoves = [] as Coords[];
      const possibleCaptures = [] as Coords[];
      const defendedTiles = [] as Coords[];
      let kingCheck: KingCheck | undefined = undefined;
      let pin: Pin | undefined = undefined;
      let hasPinOccured = false;

      for (let i = 1; i < 8; i++) {
        const currentCoords = Coords.getInstance(
          position.x + xDiff * i,
          position.y + yDiff * i
        );
        if (!currentCoords) {
          break;
        }
        const tile = this._currentBoard[currentCoords.y]![currentCoords.x]!;
        if (tile === null) {
          if (pin) {
            pin.possibleMoves.push(currentCoords);
          } else {
            possibleMoves.push(currentCoords);
          }

          continue;
        }

        if (!pin) {
          if (tile.color === color) {
            defendedTiles.push(currentCoords);
            break;
          }

          possibleCaptures.push(currentCoords);
          if (tile.pieceType !== "KING") {
            pin = {
              pinnedPiece: currentCoords,
              possibleMoves: [...possibleMoves],
            };
          }
        }

        if (tile.pieceType === "KING") {
          if (pin) {
            hasPinOccured = true;
          } else {
            kingCheck = {
              attackingPieceCoords: position,
              possibleBlocks: [...possibleMoves],
              cannotEscapeTo: [],
            };
            if (xDiff === 0) {
              let temp = Coords.getInstance(
                currentCoords.x,
                currentCoords.y - 1
              );
              if (temp) {
                kingCheck.cannotEscapeTo.push(temp);
              }
              temp = Coords.getInstance(currentCoords.x, currentCoords.y + 1);
              if (temp) {
                kingCheck.cannotEscapeTo.push(temp);
              }
            } else {
              let temp = Coords.getInstance(
                currentCoords.x - 1,
                currentCoords.y
              );
              if (temp) {
                kingCheck.cannotEscapeTo.push(temp);
              }
              temp = Coords.getInstance(currentCoords.x + 1, currentCoords.y);
              if (temp) {
                kingCheck.cannotEscapeTo.push(temp);
              }
            }
          }

          break;
        }
      }

      return {
        possibleMoves: possibleMoves,
        possibleCaptures: possibleCaptures,
        defendedPieces: defendedTiles,
        kingCheck: kingCheck,
        pin: hasPinOccured ? pin : undefined,
      };
    };

    const left = checkLine(-1, 0);
    const right = checkLine(1, 0);
    const down = checkLine(0, -1);
    const up = checkLine(0, 1);

    const possibleMoves = [
      ...left.possibleMoves,
      ...right.possibleMoves,
      ...down.possibleMoves,
      ...up.possibleMoves,
    ];
    const possibleCaptures = [
      ...left.possibleCaptures,
      ...right.possibleCaptures,
      ...down.possibleCaptures,
      ...up.possibleCaptures,
    ];
    const defendedPieces = [
      ...left.defendedPieces,
      ...right.defendedPieces,
      ...down.defendedPieces,
      ...up.defendedPieces,
    ];
    let kingCheck: KingCheck | undefined = undefined;
    if (left.kingCheck) {
      kingCheck = left.kingCheck;
    } else if (right.kingCheck) {
      kingCheck = right.kingCheck;
    } else if (down.kingCheck) {
      kingCheck = down.kingCheck;
    } else if (up.kingCheck) {
      kingCheck = up.kingCheck;
    }

    let pin: Pin | undefined = undefined;
    if (left.pin) {
      pin = left.pin;
    } else if (right.pin) {
      pin = right.pin;
    } else if (down.pin) {
      pin = down.pin;
    } else if (up.pin) {
      pin = up.pin;
    }

    return {
      possibleMoves: possibleMoves,
      attackedTiles: [...possibleMoves],
      possibleCaptures: possibleCaptures,
      defendedPieces: defendedPieces,
      kingCheck: kingCheck,
      pin: pin,
    };
  }

  private _getPossiblePawnMoves(
    position: Coords,
    color: PlayerColor
  ): PieceInteractions {
    let coords;
    let canMoveOneTile = false;

    const attacks = this._getPossiblePawnAttacks(position, color);
    const possibleMoves = [] as Coords[];
    const toReturn = {
      possibleMoves: possibleMoves,
      attackedTiles: attacks.attackedTiles,
      possibleCaptures: attacks.possibleCaptures,
      defendedPieces: attacks.defendedPieces,
      kingCheck: attacks.kingCheck,
      pin: undefined,
    };
    if (color === "WHITE") {
      coords = Coords.getInstance(position.x, position.y + 1);
    } else {
      coords = Coords.getInstance(position.x, position.y - 1);
    }

    if (!coords) {
      return toReturn;
    }

    if (this._currentBoard[coords.y]![coords.x] === null) {
      possibleMoves.push(coords);
      canMoveOneTile = true;
    }

    if (this._movedPawns.has(position)) {
      return toReturn;
    }

    if (color === "WHITE") {
      coords = Coords.getInstance(position.x, position.y + 2);
    } else {
      coords = Coords.getInstance(position.x, position.y - 2);
    }

    if (
      coords &&
      canMoveOneTile &&
      this._currentBoard[coords.y]![coords.x] === null
    ) {
      possibleMoves.push(coords);
    }

    return toReturn;
  }

  private _getPossiblePawnAttacks(
    position: Coords,
    color: PlayerColor
  ): PieceInteractions {
    const getCaptures = (xDiff: number): PieceInteractions => {
      const possibleCaptures = [] as Coords[];
      const defendedPieces = [] as Coords[];
      const possibleMoves = [] as Coords[];
      const attackedTiles = [] as Coords[];
      let kingCheck: KingCheck | undefined = undefined;
      const toReturn = {
        possibleMoves: possibleMoves,
        attackedTiles: attackedTiles,
        possibleCaptures: possibleCaptures,
        defendedPieces: defendedPieces,
        kingCheck: kingCheck,
        pin: undefined,
      };
      let coords;
      if (color === "WHITE") {
        coords = Coords.getInstance(position.x + xDiff, position.y + 1);
      } else {
        coords = Coords.getInstance(position.x + xDiff, position.y - 1);
      }
      if (!coords) {
        return toReturn;
      }

      const tile = this._currentBoard[coords.y]![coords.x]!;
      if (tile === null) {
        attackedTiles.push(coords);
        const enPassantCoords = Coords.getInstance(coords.x, position.y);
        if (!enPassantCoords) {
          return toReturn;
        }

        const tilePossibleToEnPassant =
          this._currentBoard[enPassantCoords.y]![enPassantCoords.x];
        if (!tilePossibleToEnPassant) {
          return toReturn;
        }

        if (
          this._pawnPossibleToEnPassant === enPassantCoords &&
          tilePossibleToEnPassant.pieceType === "PAWN" &&
          tilePossibleToEnPassant.color !== color
        ) {
          possibleCaptures.push(coords);
        }
        return toReturn;
      }
      if (tile.color !== color) {
        if (tile.pieceType === "KING") {
          kingCheck = {
            attackingPieceCoords: position,
            possibleBlocks: [] as Coords[],
            cannotEscapeTo: [],
          };
        }
        possibleCaptures.push(coords);
      } else {
        defendedPieces.push(coords);
      }

      return toReturn;
    };

    const leftCaptures = getCaptures(-1);
    const rightCaptures = getCaptures(1);
    let kingCheck = undefined;
    if (leftCaptures.kingCheck) {
      kingCheck = leftCaptures.kingCheck;
    } else if (rightCaptures.kingCheck) {
      kingCheck = rightCaptures.kingCheck;
    }

    const attackedTiles = [] as Coords[];
    if (leftCaptures.attackedTiles) {
      attackedTiles.concat(leftCaptures.attackedTiles);
    }
    if (rightCaptures.attackedTiles) {
      attackedTiles.concat(rightCaptures.attackedTiles);
    }

    return {
      possibleMoves: [] as Coords[],
      attackedTiles: attackedTiles,
      possibleCaptures: [
        ...leftCaptures.possibleCaptures,
        ...rightCaptures.possibleCaptures,
      ],
      defendedPieces: [
        ...leftCaptures.defendedPieces,
        ...rightCaptures.defendedPieces,
      ],
      kingCheck: kingCheck,
      pin: undefined,
    };
  }

  private _getPossibleBishopMoves(
    position: Coords,
    color: PlayerColor
  ): PieceInteractions {
    const possibleMoves = [[], [], [], []] as Coords[][];
    const possibleCaptures = [[], [], [], []] as Coords[][];
    const defendedPieces = [[], [], [], []] as Coords[][];
    let kingCheck: KingCheck | undefined = undefined;
    const potentialPins = [] as Pin[];
    let hasPinOccured = false;
    const isDiagonalPotentialPin = [false, false, false, false];
    const isDiagonalBlocked = [false, false, false, false];

    for (let i = 1; i < 8; i++) {
      const currentCoords = [
        Coords.getInstance(position.x + i, position.y + i),
        Coords.getInstance(position.x + i, position.y - i),
        Coords.getInstance(position.x - i, position.y - i),
        Coords.getInstance(position.x - i, position.y + i),
      ];
      currentCoords.forEach((coords, index) => {
        if (!coords) {
          return;
        }

        if (isDiagonalBlocked[index]) {
          return;
        }

        const tile = this._currentBoard[coords.y]![coords.x];
        if (tile !== null) {
          if (tile?.color !== color) {
            if (tile?.pieceType === "KING") {
              if (isDiagonalPotentialPin[index]) {
                hasPinOccured = true;
                return;
              } else {
                isDiagonalBlocked[index] = true;
              }
              kingCheck = {
                attackingPieceCoords: position,
                possibleBlocks: possibleMoves[index]!,
                cannotEscapeTo: [],
              };

              if (index === 0 || index === 2) {
                let coords = Coords.getInstance(
                  currentCoords[index]!.x - 1,
                  currentCoords[index]!.y - 1
                );
                if (coords) {
                  kingCheck.cannotEscapeTo.push(coords);
                }
                coords = Coords.getInstance(
                  currentCoords[index]!.x + 1,
                  currentCoords[index]!.y + 1
                );
              } else {
                let coords = Coords.getInstance(
                  currentCoords[index]!.x + 1,
                  currentCoords[index]!.y - 1
                );
                if (coords) {
                  kingCheck.cannotEscapeTo.push(coords);
                }
                coords = Coords.getInstance(
                  currentCoords[index]!.x - 1,
                  currentCoords[index]!.y + 1
                );
              }
            } else if (isDiagonalPotentialPin[index]) {
              isDiagonalPotentialPin[index] = false;
              isDiagonalBlocked[index] = true;
              return;
            }

            possibleCaptures[index]!.push(coords);
            isDiagonalPotentialPin[index] = true;
            potentialPins[index] = {
              pinnedPiece: coords,
              possibleMoves: [...possibleMoves[index]!],
            };
          } else {
            defendedPieces[index]!.push(coords);
            isDiagonalBlocked[index] = true;
          }

          return;
        }

        if (isDiagonalPotentialPin[index]) {
          potentialPins[index]?.possibleMoves.push(coords);
        } else {
          possibleMoves[index]!.push(coords);
        }
      });
    }

    const pinDiagonalIndex = hasPinOccured
      ? isDiagonalPotentialPin.findIndex((pinOccured) => pinOccured)
      : undefined;

    const pin = pinDiagonalIndex ? potentialPins[pinDiagonalIndex] : undefined;
    const possibleMovesMerged = possibleMoves.reduce((prev, cur) =>
      prev.concat(cur)
    );
    return {
      possibleMoves: possibleMovesMerged,
      attackedTiles: [...possibleMovesMerged],
      possibleCaptures: possibleCaptures.reduce((prev, cur) =>
        prev.concat(cur)
      ),
      defendedPieces: defendedPieces.reduce((prev, cur) => prev.concat(cur)),
      pin: pin,
      kingCheck: kingCheck,
    };
  }

  private _getPossibleQueenMoves(
    position: Coords,
    color: PlayerColor
  ): PieceInteractions {
    const rookResult = this._getPossibleRookMoves(position, color);
    const bishopResult = this._getPossibleBishopMoves(position, color);

    let kingCheck = undefined;
    //there is only 1 king to check so max 1 result can have defined kingCheck
    if (bishopResult.kingCheck) {
      kingCheck = bishopResult.kingCheck;
    } else if (rookResult.kingCheck) {
      kingCheck = rookResult.kingCheck;
    }

    let pin = undefined;
    if (bishopResult.pin) {
      pin = bishopResult.pin;
    } else if (rookResult.pin) {
      pin = rookResult.pin;
    }

    const possibleMoves = [
      ...bishopResult.possibleMoves,
      ...rookResult.possibleMoves,
    ];

    return {
      possibleMoves: possibleMoves,
      attackedTiles: [...possibleMoves],
      possibleCaptures: [
        ...bishopResult.possibleCaptures,
        ...rookResult.possibleCaptures,
      ],
      defendedPieces: [
        ...bishopResult.defendedPieces,
        ...rookResult.defendedPieces,
      ],
      pin: pin,
      kingCheck: kingCheck,
    };
  }

  private _getPossibleKnightMoves(
    position: Coords,
    color: PlayerColor
  ): PieceInteractions {
    const possibleMoves = [] as Coords[];
    const defendedPieces = [] as Coords[];
    const possibleCaptures = [] as Coords[];
    let kingCheck: KingCheck | undefined = undefined;

    const xDiff = [1, 1, -1, -1, 2, 2, -2, -2];
    const yDiff = [2, -2, 2, -2, 1, -1, 1, -1];
    for (let i = 0; i < 8; i++) {
      const coords = Coords.getInstance(
        position.x + xDiff[i]!,
        position.y + yDiff[i]!
      );
      if (!coords) {
        continue;
      }

      const tile = this._currentBoard[coords.y]![coords.x]!;
      if (tile === null) {
        possibleMoves.push(coords);
        continue;
      }

      if (tile.color === color) {
        defendedPieces.push(coords);
        continue;
      }

      possibleCaptures.push(coords);
      if (tile.pieceType == "KING") {
        kingCheck = {
          attackingPieceCoords: position,
          possibleBlocks: [] as Coords[],
          cannotEscapeTo: [],
        };
      }
    }

    return {
      possibleMoves: possibleMoves,
      attackedTiles: [...possibleMoves],
      possibleCaptures: possibleCaptures,
      defendedPieces: defendedPieces,
      kingCheck: kingCheck,
      pin: undefined,
    };
  }

  private _getPossibleKingMoves(
    position: Coords,
    color: PlayerColor
  ): PieceInteractions {
    let possibleMoves = [] as Coords[];
    const defendedPieces = [] as Coords[];
    let possibleCaptures = [] as Coords[];

    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) {
          continue;
        }

        const coords = Coords.getInstance(position.x + i, position.y + j);
        if (!coords) {
          continue;
        }
        const tile = this._currentBoard[coords.y]![coords.x]!;
        if (tile === null) {
          if (
            color === "WHITE"
              ? !this._tilesAttackedByBlack.has(coords)
              : !this._tilesAttackedByWhite.has(coords)
          ) {
            possibleMoves.push(coords);
          }
          continue;
        }

        if (tile.color !== color) {
          if (
            color === "WHITE"
              ? !this._defendedPiecesOfBlack.has(coords)
              : !this._defendedPiecesOfWhite.has(coords)
          ) {
            possibleCaptures.push(coords);
          }
        } else {
          defendedPieces.push(coords);
        }
      }
    }

    if (color === "WHITE" && this._isWhiteKingChecked) {
      this._kingChecksByBlack.forEach((check) => {
        possibleMoves = possibleMoves.filter(
          (move) => !check.cannotEscapeTo.includes(move)
        );
        possibleCaptures = possibleMoves.filter(
          (capture) => !check.cannotEscapeTo.includes(capture)
        );
      });
    } else if (color === "BLACK" && this._isBlackKingChecked) {
      this._kingChecksByWhite.forEach((check) => {
        possibleMoves = possibleMoves.filter(
          (move) => !check.cannotEscapeTo.includes(move)
        );
        possibleCaptures = possibleMoves.filter(
          (capture) => !check.cannotEscapeTo.includes(capture)
        );
      });
    }

    //short castling
    if (
      color === "WHITE" &&
      this._isWhiteShortCastlingPossible &&
      !this._isWhiteKingChecked
    ) {
      //hardcoded coords cannot be undefined so non-null assertion allowed
      const rookCoordsAfterCastling = Coords.getInstance(5, 0)!;
      const kingCoordsAfterCastling = Coords.getInstance(6, 0)!;

      const rookTileAfterCastling =
        this._currentBoard[rookCoordsAfterCastling.y]![
          rookCoordsAfterCastling.x
        ];
      const kingTileAfterCastling =
        this._currentBoard[kingCoordsAfterCastling.y]![
          kingCoordsAfterCastling.x
        ];
      if (
        rookTileAfterCastling === null &&
        !this._tilesAttackedByBlack.has(rookCoordsAfterCastling) &&
        kingTileAfterCastling === null &&
        !this._tilesAttackedByBlack.has(kingCoordsAfterCastling)
      ) {
        possibleMoves.push(kingCoordsAfterCastling);
      }
    } else if (
      color === "BLACK" &&
      this._isBlackShortCastlingPossible &&
      !this._isBlackKingChecked
    ) {
      //hardcoded coords cannot be undefined so non-null assertion allowed
      const rookCoordsAfterCastling = Coords.getInstance(5, 7)!;
      const kingCoordsAfterCastling = Coords.getInstance(6, 7)!;

      const rookTileAfterCastling =
        this._currentBoard[rookCoordsAfterCastling.y]![
          rookCoordsAfterCastling.x
        ];
      const kingTileAfterCastling =
        this._currentBoard[kingCoordsAfterCastling.y]![
          kingCoordsAfterCastling.x
        ];
      if (
        rookTileAfterCastling === null &&
        !this._tilesAttackedByWhite.has(rookCoordsAfterCastling) &&
        kingTileAfterCastling === null &&
        !this._tilesAttackedByWhite.has(kingCoordsAfterCastling)
      ) {
        possibleMoves.push(kingCoordsAfterCastling);
      }
    }
    //long castling
    if (
      color === "WHITE" &&
      this._isWhiteLongCastlingPossible &&
      !this._isWhiteKingChecked
    ) {
      //hardcoded coords cannot be undefined so non-null assertion allowed
      const rookCoordsAfterCastling = Coords.getInstance(2, 0)!;
      const kingCoordsAfterCastling = Coords.getInstance(1, 0)!;

      const rookTileAfterCastling =
        this._currentBoard[rookCoordsAfterCastling.y]![
          rookCoordsAfterCastling.x
        ];
      const kingTileAfterCastling =
        this._currentBoard[kingCoordsAfterCastling.y]![
          kingCoordsAfterCastling.x
        ];
      if (
        rookTileAfterCastling === null &&
        !this._tilesAttackedByBlack.has(rookCoordsAfterCastling) &&
        kingTileAfterCastling === null &&
        !this._tilesAttackedByBlack.has(kingCoordsAfterCastling)
      ) {
        possibleMoves.push(kingCoordsAfterCastling);
      }
    } else if (
      color === "BLACK" &&
      this._isBlackLongCastlingPossible &&
      !this._isBlackKingChecked
    ) {
      //hardcoded coords cannot be undefined so non-null assertion allowed
      const rookCoordsAfterCastling = Coords.getInstance(2, 7)!;
      const kingCoordsAfterCastling = Coords.getInstance(1, 7)!;

      const rookTileAfterCastling =
        this._currentBoard[rookCoordsAfterCastling.y]![
          rookCoordsAfterCastling.x
        ];
      const kingTileAfterCastling =
        this._currentBoard[kingCoordsAfterCastling.y]![
          kingCoordsAfterCastling.x
        ];
      if (
        rookTileAfterCastling === null &&
        !this._tilesAttackedByWhite.has(rookCoordsAfterCastling) &&
        kingTileAfterCastling === null &&
        !this._tilesAttackedByWhite.has(kingCoordsAfterCastling)
      ) {
        possibleMoves.push(kingCoordsAfterCastling);
      }
    }

    return {
      possibleMoves: possibleMoves,
      attackedTiles: [...possibleMoves],
      possibleCaptures: possibleCaptures,
      defendedPieces: defendedPieces,
      kingCheck: undefined,
      pin: undefined,
    };
  }

  private _findKing(color: PlayerColor) {
    let x;
    let y;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (
          this._currentBoard[i]![j] &&
          this._currentBoard[i]![j]!.pieceType === "KING" &&
          this._currentBoard[i]![j]!.color === color
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

export default Chess;
