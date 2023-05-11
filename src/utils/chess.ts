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
  private _isWhiteKingChecked = false;
  private _isBlackKingChecked = false;
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
      (playerColor === "WHITE" && this._isBlackKingChecked) ||
      (playerColor === "BLACK" && this._isWhiteKingChecked)
    ) {
      if (
        this.getPossibleMoves(
          playerColor === "WHITE"
            ? this._whiteKingCoords
            : this._blackKingCoords
        ).possibleMoves.length === 0
      ) {
        this._gameResult = {
          winner: playerColor,
          reason: "MATE",
        };
      }
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
        possibleAttacks.defendedTiles.forEach((coords) => {
          tile.color === "WHITE"
            ? this._defendedPiecesOfWhite.add(coords)
            : this._defendedPiecesOfBlack.add(coords);
        });

        if (possibleAttacks.isKingAttacked) {
          if (tile.color === "WHITE") {
            isBlackKingCheckedThisTurn = true;
          } else {
            isWhiteKingCheckedThisTurn = true;
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

  public getPossibleMoves(position: Coords) {
    if (!position) {
      return {
        possibleMoves: [] as Coords[],
        defendedTiles: [] as Coords[],
        isKingAttacked: false,
      };
    }
    const piece = this._currentBoard[position.y]![position.x]!;
    if (piece === null) {
      return {
        possibleMoves: [] as Coords[],
        defendedTiles: [] as Coords[],
        isKingAttacked: false,
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
      return {
        ...this._getPossibleKingMoves(position, piece.color),
        isKingAttacked: false,
      };
    }
    if (piece.pieceType === "KNIGHT") {
      return this._getPossibleKnightMoves(position, piece.color);
    }

    return {
      possibleMoves: [] as Coords[],
      defendedTiles: [] as Coords[],
      isKingAttacked: false,
    };
  }

  private _getPossibleRookMoves(position: Coords, color: PlayerColor) {
    const possibleMoves = [] as Coords[];
    const defendedTiles = [] as Coords[];
    let isKingAttacked = false;
    let start = position.x;

    for (let i = start + 1; i < 8; i++) {
      const currentCoords = Coords.getInstance(i, position.y);
      if (!currentCoords) {
        break;
      }
      const tile = this._currentBoard[currentCoords.y]?.[currentCoords.x];
      if (tile !== null) {
        if (tile?.color !== color) {
          if (tile?.pieceType === "KING") {
            isKingAttacked = true;
          }
          possibleMoves.push(currentCoords);
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
            isKingAttacked = true;
          }
          possibleMoves.push(currentCoords);
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
            isKingAttacked = true;
          }
          possibleMoves.push(currentCoords);
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
            isKingAttacked = true;
          }
          possibleMoves.push(currentCoords);
        } else {
          defendedTiles.push(currentCoords);
        }

        break;
      }
      possibleMoves.push(currentCoords);
    }

    return {
      possibleMoves: possibleMoves,
      defendedTiles: defendedTiles,
      isKingAttacked: isKingAttacked,
    };
  }

  private _getPossiblePawnMoves(position: Coords, color: PlayerColor) {
    let coords;
    let canMoveOneTile = false;

    const attacks = this._getPossiblePawnAttacks(position, color);
    const possibleMoves = attacks.possibleMoves;

    if (color === "WHITE") {
      coords = Coords.getInstance(position.x, position.y + 1);
    } else {
      coords = Coords.getInstance(position.x, position.y - 1);
    }

    if (!coords) {
      return attacks;
    }

    if (this._currentBoard[coords.y]![coords.x] === null) {
      possibleMoves.push(coords);
      canMoveOneTile = true;
    }

    if (this._movedPawns.has(coords)) {
      return {
        possibleMoves: possibleMoves,
        defendedTiles: attacks.defendedTiles,
        isKingAttacked: attacks.isKingAttacked,
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
      defendedTiles: attacks.defendedTiles,
      isKingAttacked: attacks.isKingAttacked,
    };
  }

  private _getPossiblePawnAttacks(position: Coords, color: PlayerColor) {
    const getCaptures = (xDiff: number) => {
      const possibleMoves = [] as Coords[];
      const defendedTiles = [] as Coords[];
      let isKingAttacked = false;
      let coords;
      if (color === "WHITE") {
        coords = Coords.getInstance(position.x + xDiff, position.y + 1);
      } else {
        coords = Coords.getInstance(position.x + xDiff, position.y - 1);
      }
      if (!coords) {
        return {
          possibleMoves: possibleMoves,
          defendedTiles: defendedTiles,
          isKingAttacked: isKingAttacked,
        };
      }

      const tile = this._currentBoard[coords.y]![coords.x]!;
      if (tile === null) {
        return {
          possibleMoves: possibleMoves,
          defendedTiles: defendedTiles,
          isKingAttacked: isKingAttacked,
        };
      }
      if (tile.color !== color) {
        if (tile.pieceType === "KING") {
          isKingAttacked = true;
        }
        possibleMoves.push(coords);
      } else {
        defendedTiles.push(coords);
      }

      const enPassantCoords = Coords.getInstance(coords.x, position.y);
      if (!enPassantCoords) {
        return {
          possibleMoves: possibleMoves,
          defendedTiles: defendedTiles,
          isKingAttacked: isKingAttacked,
        };
      }

      const tilePossibleToEnPassant =
        this._currentBoard[enPassantCoords.y]![enPassantCoords.x]!;
      if (tile === null) {
        return {
          possibleMoves: possibleMoves,
          defendedTiles: defendedTiles,
          isKingAttacked: isKingAttacked,
        };
      }
      if (
        this._pawnPossibleToEnPassant == enPassantCoords &&
        tilePossibleToEnPassant.pieceType === "PAWN" &&
        tilePossibleToEnPassant.color !== color
      ) {
        possibleMoves.push(enPassantCoords);
      }
      return {
        possibleMoves: possibleMoves,
        defendedTiles: defendedTiles,
        isKingAttacked: isKingAttacked,
      };
    };

    const leftCaptures = getCaptures(-1);
    const rightCaptures = getCaptures(1);

    return {
      possibleMoves: leftCaptures.possibleMoves.concat(
        rightCaptures.possibleMoves
      ),
      defendedTiles: leftCaptures.defendedTiles.concat(
        rightCaptures.defendedTiles
      ),
      isKingAttacked:
        leftCaptures.isKingAttacked || rightCaptures.isKingAttacked,
    };
  }

  private _getPossibleBishopMoves(position: Coords, color: PlayerColor) {
    const possibleMoves = [] as Coords[];
    const defendedTiles = [] as Coords[];
    let isKingAttacked = false;
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
              isKingAttacked = true;
            }
            possibleMoves.push(coords);
          } else {
            defendedTiles.push(coords);
          }

          breaks[index] = true;
          return;
        }
        possibleMoves.push(coords);
      });
    }

    return {
      possibleMoves: possibleMoves,
      defendedTiles: defendedTiles,
      isKingAttacked: isKingAttacked,
    };
  }

  private _getPossibleQueenMoves(position: Coords, color: PlayerColor) {
    const rookResult = this._getPossibleRookMoves(position, color);

    const bishopResult = this._getPossibleBishopMoves(position, color);
    const possibleMoves = rookResult.possibleMoves.concat(
      bishopResult.possibleMoves
    );
    const defendedTiles = rookResult.defendedTiles.concat(
      bishopResult.defendedTiles
    );

    return {
      possibleMoves: possibleMoves,
      defendedTiles: defendedTiles,
      isKingAttacked: rookResult.isKingAttacked || bishopResult.isKingAttacked,
    };
  }

  private _getPossibleKnightMoves(position: Coords, color: PlayerColor) {
    let isKingAttacked = false;
    const possibleMoves = [] as Coords[];
    const defendedTiles = [] as Coords[];
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
          possibleMoves.push(coords);
          if (tile.pieceType == "KING") {
            isKingAttacked = true;
          }
        } else {
          defendedTiles.push(coords);
        }
      }
    }

    return {
      possibleMoves: possibleMoves,
      defendedTiles: defendedTiles,
      isKingAttacked: isKingAttacked,
    };
  }

  private _getPossibleKingMoves(position: Coords, color: PlayerColor) {
    const possibleMoves = [] as Coords[];
    const defendedTiles = [] as Coords[];
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
              possibleMoves.push(coords);
          } else {
            defendedTiles.push(coords);
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

    return { possibleMoves: possibleMoves, defendedTiles: defendedTiles };
  }
}

export default Chess;
