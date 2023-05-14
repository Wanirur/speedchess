/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Coords } from "./coords";
import {
  type PlayerColor,
  type Board,
  type GameResult,
  testBoard,
  whiteKing,
  blackKing,
} from "./pieces";

type KingCheck = {
  attackingPieceCoords: Coords;
  possibleBlocks: Coords[];
};

type Pin = {
  attackingPiece: Coords;
  pinnedPiece: Coords;
};

type PieceMoves = {
  possibleMoves: Coords[];
  possibleCaptures: Coords[];
  defendedPieces: Coords[];
  kingCheck: KingCheck | undefined;
};

class Chess {
  private _history: Board[];
  public get history(): Board[] {
    return this._history;
  }

  private _currentBoard: Board;
  public get board(): Board {
    return this._currentBoard;
  }
  public set board(value: Board) {
    this._currentBoard = value;
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
  private _tilesAttackedByWhite = new Set<Coords>();
  private _tilesAttackedByBlack = new Set<Coords>();
  private _defendedPiecesOfWhite = new Set<Coords>();
  private _defendedPiecesOfBlack = new Set<Coords>();
  private _possibleCapturesOfWhite = new Set<Coords>();
  private _possibleCapturesOfBlack = new Set<Coords>();
  private _isWhiteKingChecked = false;
  private _isBlackKingChecked = false;
  private _kingChecksByWhite = new Set<KingCheck>();
  private _kingChecksByBlack = new Set<KingCheck>();
  private _pinsByWhite = new Set<Pin>();
  private _pinsByBlack = new Set<Pin>();
  private _whiteKingCoords: Coords;
  private _blackKingCoords: Coords;

  constructor(board?: Board) {
    if (board) {
      this._currentBoard = board;
    } else {
      this._currentBoard = testBoard();
    }

    let x;
    let y;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (this._currentBoard[i]![j]! === whiteKing) {
          y = i;
          x = j;
        }
      }
    }

    let tempKingCoords;
    if (
      x === undefined ||
      y === undefined ||
      (tempKingCoords = Coords.getInstance(x, y)) === undefined
    ) {
      throw new Error("board is missing a king");
    }
    this._whiteKingCoords = tempKingCoords;

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (this._currentBoard[i]![j]! === blackKing) {
          y = i;
          x = j;
        }
      }
    }
    if (
      x === undefined ||
      y === undefined ||
      (tempKingCoords = Coords.getInstance(x, y)) === undefined
    ) {
      throw new Error("board is missing a king");
    }
    this._blackKingCoords = tempKingCoords;

    this._calculateAttackedTiles();

    this._history = [this._currentBoard];
  }

  public move(from: Coords, to: Coords, playerColor: PlayerColor) {
    const movedPiece = this._currentBoard[from.y]![from.x]!;
    if (movedPiece === null || movedPiece.color !== playerColor) {
      return this.board;
    }

    const possibleMoves = this.getPossibleMoves(from);
    if (!possibleMoves.possibleMoves.includes(to)) {
      return this.board;
    }

    this.board[from.y]![from.x] = null;
    this.board[to.y]![to.x] = movedPiece;

    const whiteKingCoordsTemp = this._whiteKingCoords;
    const blackKingCoordsTemp = this._blackKingCoords;

    if (movedPiece === whiteKing) {
      this._whiteKingCoords = to;
    } else if (movedPiece === blackKing) {
      this._blackKingCoords = to;
    }

    const tilesAttackedByWhiteTemp = this._tilesAttackedByWhite;
    const tilesAttackedByBlackTemp = this._tilesAttackedByBlack;
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
      this._currentBoard = this._history.at(-1)!;
      this._tilesAttackedByWhite = tilesAttackedByWhiteTemp;
      this._tilesAttackedByBlack = tilesAttackedByBlackTemp;
      this._isWhiteKingChecked = whiteKingCheckedTemp;
      this._isBlackKingChecked = blackKingCheckedTemp;
      this._whiteKingCoords = whiteKingCoordsTemp;
      this._blackKingCoords = blackKingCoordsTemp;
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
    }

    //check whether checkmate has occured
    if (
      this._hasCheckmateOccured(playerColor === "WHITE" ? "BLACK" : "WHITE")
    ) {
      this._gameResult = { winner: playerColor, reason: "MATE" };
    }

    if (
      (playerColor === "WHITE" &&
        this._tilesAttackedByWhite.size === 0 &&
        this._possibleCapturesOfWhite.size === 0) ||
      (playerColor === "BLACK" &&
        this._tilesAttackedByBlack.size === 0 &&
        this._possibleCapturesOfBlack.size === 0)
    ) {
      //check stalemates
      this._gameResult = { winner: "DRAW", reason: "STALEMATE" };
    }

    return this.board;
  }

  private _calculateAttackedTiles() {
    let x = 0,
      y = 0;
    let isWhiteKingCheckedThisTurn = false;
    let isBlackKingCheckedThisTurn = false;

    for (const row of this._currentBoard) {
      for (const tile of row) {
        if (tile === null) {
          x++;
          continue;
        }
        const coords = Coords.getInstance(x, y);
        if (!coords) {
          x++;
          continue;
        }
        const possibleAttacks =
          tile.pieceType === "PAWN"
            ? this._getPossiblePawnAttacks(coords, tile.color)
            : this.getPossibleMoves(coords);
        possibleAttacks.possibleMoves.forEach((coords) =>
          tile.color === "WHITE"
            ? this._tilesAttackedByWhite.add(coords)
            : this._tilesAttackedByBlack.add(coords)
        );
        possibleAttacks.defendedPieces.forEach((coords) => {
          tile.color === "WHITE"
            ? this._defendedPiecesOfWhite.add(coords)
            : this._defendedPiecesOfBlack.add(coords);
        });
        possibleAttacks.possibleCaptures.forEach((coords) => {
          tile.color === "WHITE"
            ? this._possibleCapturesOfWhite.add(coords)
            : this._possibleCapturesOfWhite.add(coords);
        });

        if (possibleAttacks.kingCheck) {
          if (tile.color === "WHITE") {
            isBlackKingCheckedThisTurn = true;
            this._kingChecksByWhite.add(possibleAttacks.kingCheck);
          } else {
            isWhiteKingCheckedThisTurn = true;
            this._kingChecksByBlack.add(possibleAttacks.kingCheck);
          }
        }
        x++;
      }
      x = 0;
      y++;
    }

    this._isWhiteKingChecked = isWhiteKingCheckedThisTurn;
    this._isBlackKingChecked = isBlackKingCheckedThisTurn;
  }

  private _hasCheckmateOccured(kingColor: PlayerColor) {
    if (
      (kingColor === "BLACK" && !this._isBlackKingChecked) ||
      (kingColor === "WHITE" && !this._isWhiteKingChecked)
    ) {
      return false;
    }

    let kingMoves: PieceMoves,
      checks: Set<KingCheck>,
      captures: Set<Coords>,
      attacks: Set<Coords>;
    if (kingColor === "WHITE") {
      kingMoves = this.getPossibleMoves(this._whiteKingCoords);
      checks = this._kingChecksByBlack;
      captures = this._possibleCapturesOfWhite;
      attacks = this._tilesAttackedByWhite;
    } else {
      kingMoves = this.getPossibleMoves(this._blackKingCoords);
      checks = this._kingChecksByWhite;
      captures = this._possibleCapturesOfBlack;
      attacks = this._tilesAttackedByBlack;
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
        (block) => attacks.has(block) || captures.has(block)
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

    //check whether pieces that can defend the mate are pinned to the king
    //TODO: do it!
    return;
  }

  public getPossibleMoves(position: Coords): PieceMoves {
    if (!position) {
      return {
        possibleMoves: [] as Coords[],
        possibleCaptures: [] as Coords[],
        defendedPieces: [] as Coords[],
        kingCheck: undefined,
      };
    }
    const piece = this._currentBoard[position.y]![position.x]!;
    if (piece === null) {
      return {
        possibleMoves: [] as Coords[],
        possibleCaptures: [] as Coords[],
        defendedPieces: [] as Coords[],
        kingCheck: undefined,
      };
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

    return {
      possibleMoves: [] as Coords[],
      possibleCaptures: [] as Coords[],
      defendedPieces: [] as Coords[],
      kingCheck: undefined,
    };
  }

  private _getPossibleRookMoves(
    position: Coords,
    color: PlayerColor
  ): PieceMoves {
    const possibleMoves = [] as Coords[];
    const possibleCaptures = [] as Coords[];
    const defendedTiles = [] as Coords[];
    let kingCheck: KingCheck | undefined = undefined;
    let start = position.x;

    for (let i = start + 1; i < 8; i++) {
      const currentCoords = Coords.getInstance(i, position.y);
      if (!currentCoords) {
        break;
      }
      const tile = this._currentBoard[currentCoords.y]![currentCoords.x]!;
      if (tile !== null) {
        if (tile?.color !== color) {
          if (tile?.pieceType === "KING") {
            kingCheck = {
              attackingPieceCoords: position,
              possibleBlocks: possibleMoves.slice(start + 1 - i),
            };
          }
          possibleCaptures.push(currentCoords);
        } else {
          defendedTiles.push(currentCoords);
        }

        break;
      }
      possibleMoves.push(currentCoords);
    }

    for (let i = start - 1; i >= 0; i--) {
      const currentCoords = Coords.getInstance(i, position.y);
      if (!currentCoords) {
        break;
      }
      const tile = this._currentBoard[currentCoords.y]?.[currentCoords.x];
      if (tile !== null) {
        if (tile?.color !== color) {
          if (tile?.pieceType === "KING") {
            kingCheck = {
              attackingPieceCoords: position,
              possibleBlocks: possibleMoves.slice(start + 1 - i),
            };
          }
          possibleCaptures.push(currentCoords);
        } else {
          defendedTiles.push(currentCoords);
        }

        break;
      }
      possibleMoves.push(currentCoords);
    }

    start = position.y;

    for (let i = start + 1; i < 8; i++) {
      const currentCoords = Coords.getInstance(position.x, i);
      if (!currentCoords) {
        break;
      }
      const tile = this._currentBoard[currentCoords.y]?.[currentCoords.x];
      if (tile !== null) {
        if (tile?.color !== color) {
          if (tile?.pieceType === "KING") {
            kingCheck = {
              attackingPieceCoords: position,
              possibleBlocks: possibleMoves.slice(start + 1 - i),
            };
          }
          possibleCaptures.push(currentCoords);
        } else {
          defendedTiles.push(currentCoords);
        }

        break;
      }
      possibleMoves.push(currentCoords);
    }

    for (let i = start - 1; i >= 0; i--) {
      const currentCoords = Coords.getInstance(position.x, i);
      if (!currentCoords) {
        break;
      }
      const tile = this._currentBoard[currentCoords.y]?.[currentCoords.x];
      if (tile !== null) {
        if (tile?.color !== color) {
          if (tile?.pieceType === "KING") {
            kingCheck = {
              attackingPieceCoords: position,
              possibleBlocks: possibleMoves.slice(start + 1 - i),
            };
          }
          possibleCaptures.push(currentCoords);
        } else {
          defendedTiles.push(currentCoords);
        }

        break;
      }
      possibleMoves.push(currentCoords);
    }

    return {
      possibleMoves: possibleMoves,
      possibleCaptures: possibleCaptures,
      defendedPieces: defendedTiles,
      kingCheck: kingCheck,
    };
  }

  private _getPossiblePawnMoves(
    position: Coords,
    color: PlayerColor
  ): PieceMoves {
    let coords;
    let canMoveOneTile = false;

    const attacks = this._getPossiblePawnAttacks(position, color);
    const possibleMoves = [] as Coords[];
    const possibleCaptures = attacks.possibleCaptures;

    if (color === "WHITE") {
      coords = Coords.getInstance(position.x, position.y + 1);
    } else {
      coords = Coords.getInstance(position.x, position.y - 1);
    }

    if (!coords) {
      return {
        possibleMoves: possibleMoves,
        possibleCaptures: possibleCaptures,
        defendedPieces: attacks.defendedPieces,
        kingCheck: attacks.kingCheck,
      };
    }

    if (this._currentBoard[coords.y]![coords.x] === null) {
      possibleMoves.push(coords);
      canMoveOneTile = true;
    }

    if (this._movedPawns.has(coords)) {
      return {
        possibleMoves: possibleMoves,
        possibleCaptures: possibleCaptures,
        defendedPieces: attacks.defendedPieces,
        kingCheck: attacks.kingCheck,
      };
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

    return {
      possibleMoves: possibleMoves,
      possibleCaptures: possibleCaptures,
      defendedPieces: attacks.defendedPieces,
      kingCheck: attacks.kingCheck,
    };
  }

  private _getPossiblePawnAttacks(
    position: Coords,
    color: PlayerColor
  ): PieceMoves {
    const getCaptures = (xDiff: number): PieceMoves => {
      const possibleCaptures = [] as Coords[];
      const defendedPieces = [] as Coords[];
      const possibleMoves = [] as Coords[];
      let kingCheck: KingCheck | undefined = undefined;

      let coords;
      if (color === "WHITE") {
        coords = Coords.getInstance(position.x + xDiff, position.y + 1);
      } else {
        coords = Coords.getInstance(position.x + xDiff, position.y - 1);
      }
      if (!coords) {
        return {
          possibleMoves: possibleMoves,
          possibleCaptures: possibleCaptures,
          defendedPieces: defendedPieces,
          kingCheck: kingCheck,
        };
      }

      const tile = this._currentBoard[coords.y]![coords.x]!;
      if (tile === null) {
        return {
          possibleMoves: possibleMoves,
          possibleCaptures: possibleCaptures,
          defendedPieces: defendedPieces,
          kingCheck: kingCheck,
        };
      }
      if (tile.color !== color) {
        if (tile.pieceType === "KING") {
          kingCheck = {
            attackingPieceCoords: position,
            possibleBlocks: [] as Coords[],
          };
        }
        possibleCaptures.push(coords);
      } else {
        defendedPieces.push(coords);
      }

      const enPassantCoords = Coords.getInstance(coords.x, position.y);
      if (!enPassantCoords) {
        return {
          possibleMoves: possibleMoves,
          possibleCaptures: possibleCaptures,
          defendedPieces: defendedPieces,
          kingCheck: kingCheck,
        };
      }

      const tilePossibleToEnPassant =
        this._currentBoard[enPassantCoords.y]![enPassantCoords.x]!;
      if (tile === null) {
        return {
          possibleMoves: possibleMoves,
          possibleCaptures: possibleCaptures,
          defendedPieces: defendedPieces,
          kingCheck: kingCheck,
        };
      }
      if (
        this._pawnPossibleToEnPassant == enPassantCoords &&
        tilePossibleToEnPassant.pieceType === "PAWN" &&
        tilePossibleToEnPassant.color !== color
      ) {
        possibleCaptures.push(enPassantCoords);
      }
      return {
        possibleMoves: possibleMoves,
        possibleCaptures: possibleCaptures,
        defendedPieces: defendedPieces,
        kingCheck: kingCheck,
      };
    };

    const leftCaptures = getCaptures(-1);
    const rightCaptures = getCaptures(1);
    let kingCheck = undefined;
    if (leftCaptures.kingCheck) {
      kingCheck = leftCaptures.kingCheck;
    } else if (rightCaptures.kingCheck) {
      kingCheck = rightCaptures.kingCheck;
    }

    return {
      possibleMoves: [] as Coords[],

      possibleCaptures: leftCaptures.possibleCaptures.concat(
        rightCaptures.possibleCaptures
      ),
      defendedPieces: leftCaptures.defendedPieces.concat(
        rightCaptures.defendedPieces
      ),
      kingCheck: kingCheck,
    };
  }

  private _getPossibleBishopMoves(
    position: Coords,
    color: PlayerColor
  ): PieceMoves {
    const possibleMoves = [[], [], [], []] as Coords[][];
    const possibleCaptures = [[], [], [], []] as Coords[][];
    const defendedPieces = [[], [], [], []] as Coords[][];
    let kingCheck: KingCheck | undefined = undefined;
    const breaks = [false, false, false, false];

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

        if (breaks[index]) {
          return;
        }

        const tile = this._currentBoard[coords.y]![coords.x];
        if (tile !== null) {
          if (tile?.color !== color) {
            if (tile?.pieceType === "KING" && tile.color !== color) {
              kingCheck = {
                attackingPieceCoords: position,
                possibleBlocks: possibleMoves[index]!,
              };
            }
            possibleCaptures[index]!.push(coords);
          } else {
            defendedPieces[index]!.push(coords);
          }

          breaks[index] = true;
          return;
        }
        possibleMoves[index]!.push(coords);
      });
    }

    return {
      possibleMoves: possibleMoves.reduce((prev, cur) => prev.concat(cur)),
      possibleCaptures: possibleCaptures.reduce((prev, cur) =>
        prev.concat(cur)
      ),
      defendedPieces: defendedPieces.reduce((prev, cur) => prev.concat(cur)),
      kingCheck: kingCheck,
    };
  }

  private _getPossibleQueenMoves(
    position: Coords,
    color: PlayerColor
  ): PieceMoves {
    const rookResult = this._getPossibleRookMoves(position, color);

    const bishopResult = this._getPossibleBishopMoves(position, color);
    const possibleMoves = rookResult.possibleMoves.concat(
      bishopResult.possibleMoves
    );
    const defendedPieces = rookResult.defendedPieces.concat(
      bishopResult.defendedPieces
    );
    const possibleCaptures = rookResult.possibleCaptures.concat(
      bishopResult.possibleCaptures
    );

    let kingCheck = undefined;
    //there is only 1 king to check so max 1 result can have defined kingCheck
    if (bishopResult.kingCheck) {
      kingCheck = bishopResult.kingCheck;
    } else if (rookResult.kingCheck) {
      kingCheck = rookResult.kingCheck;
    }
    return {
      possibleMoves: possibleMoves,
      possibleCaptures: possibleCaptures,
      defendedPieces: defendedPieces,
      kingCheck: kingCheck,
    };
  }

  private _getPossibleKnightMoves(
    position: Coords,
    color: PlayerColor
  ): PieceMoves {
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
      } else {
        if (tile.color !== color) {
          possibleCaptures.push(coords);
          if (tile.pieceType == "KING") {
            kingCheck = {
              attackingPieceCoords: position,
              possibleBlocks: [] as Coords[],
            };
          }
        } else {
          defendedPieces.push(coords);
        }
      }
    }

    return {
      possibleMoves: possibleMoves,
      possibleCaptures: possibleCaptures,
      defendedPieces: defendedPieces,
      kingCheck: kingCheck,
    };
  }

  private _getPossibleKingMoves(
    position: Coords,
    color: PlayerColor
  ): PieceMoves {
    const possibleMoves = [] as Coords[];
    const defendedPieces = [] as Coords[];
    const possibleCaptures = [] as Coords[];

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
        if (tile !== null) {
          const tile_color = tile.color;
          if (tile_color !== color) {
            if (
              color === "WHITE"
                ? !this._defendedPiecesOfBlack.has(coords)
                : !this._defendedPiecesOfWhite.has(coords)
            )
              possibleCaptures.push(coords);
          } else {
            defendedPieces.push(coords);
          }
        }

        if (
          color === "WHITE"
            ? !this._tilesAttackedByBlack.has(coords)
            : !this._tilesAttackedByWhite.has(coords)
        ) {
          possibleMoves.push(coords);
        }
      }
    }

    return {
      possibleMoves: possibleMoves,
      possibleCaptures: possibleCaptures,
      defendedPieces: defendedPieces,
      kingCheck: undefined,
    };
  }
}

export default Chess;
