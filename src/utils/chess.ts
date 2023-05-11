/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Coords } from "./coords";
import {
  type PlayerColor,
  testBoard,
  type Board,
  whiteKing,
  blackKing,
  type GameResult,
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

  private _movedPawns = new Array<Coords>(16);
  private _pawnsPossibleToEnPassant = new Array<Coords>(16);
  private _tilesAttackedByWhite = new Set<Coords>();
  private _tilesAttackedByBlack = new Set<Coords>();
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
    let y = this._currentBoard.findIndex(
      (row) =>
        (x =
          row.findIndex((piece) => piece != null && piece === whiteKing) !== -1)
    );
    let tempKingCoords;
    if (!x || !y || !(tempKingCoords = Coords.getInstance(x, y))) {
      throw new Error("board is missing a king");
    }
    this._whiteKingCoords = tempKingCoords;

    y = this._currentBoard.findIndex(
      (row) =>
        (x =
          row.findIndex((piece) => piece != null && piece === blackKing) !== -1)
    );
    if (!x || !y || !(tempKingCoords = Coords.getInstance(x, y))) {
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
            reason: "MATE"
        }
      }
    }

    return this.board;
  }

  public getPossibleMoves(position: Coords, includeDefendedPieces = false) {
    const possibleMoves = [] as Coords[];
    if (!position) {
      return { possibleMoves: possibleMoves, isKingAttacked: false };
    }
    const piece = this._currentBoard[position.y]![position.x]!;
    if (piece === null) {
      return { possibleMoves: possibleMoves, isKingAttacked: false };
    }

    if (piece.pieceType === "ROOK") {
      return this._getPossibleRookMoves(
        position,
        piece.color,
        includeDefendedPieces
      );
    }
    if (piece.pieceType === "PAWN") {
      return this._getPossiblePawnMoves(
        position,
        piece.color,
        includeDefendedPieces
      );
    }
    if (piece.pieceType === "BISHOP") {
      return this._getPossibleBishopMoves(
        position,
        piece.color,
        includeDefendedPieces
      );
    }
    if (piece.pieceType === "QUEEN") {
      return this._getPossibleQueenMoves(
        position,
        piece.color,
        includeDefendedPieces
      );
    }
    if (piece.pieceType === "KING") {
      return {
        possibleMoves: this._getPossibleKingMoves(
          position,
          piece.color,
          includeDefendedPieces
        ),
        isKingAttacked: false,
      };
    }
    if (piece.pieceType === "KNIGHT") {
      return this._getPossibleKnightMoves(
        position,
        piece.color,
        includeDefendedPieces
      );
    }

    return { possibleMoves: possibleMoves, isKingAttacked: false };
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
            ? this._getPossiblePawnAttacks(coords, tile.color, true)
            : this.getPossibleMoves(coords);
        possibleAttacks.possibleMoves.forEach((coords) =>
          tile.color === "WHITE"
            ? this._tilesAttackedByWhite.add(coords)
            : this._tilesAttackedByBlack.add(coords)
        );

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

  private _getPossibleRookMoves(
    position: Coords,
    color: PlayerColor,
    includeDefendedPieces: boolean
  ) {
    const possibleMoves = [] as Coords[];
    let isKingAttacked = false;
    let start = position.x;

    for (let i = start + 1; i < 8; i++) {
      const currentCoords = Coords.getInstance(i, position.y);
      if (!currentCoords) {
        break;
      }
      const tile = this._currentBoard[currentCoords.y]?.[currentCoords.x];
      if (tile !== null) {
        if (includeDefendedPieces || tile?.color !== color) {
          if (tile?.pieceType === "KING" && tile.color !== color) {
            isKingAttacked = true;
          }
          possibleMoves.push(currentCoords);
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
        if (includeDefendedPieces || tile?.color !== color) {
          if (tile?.pieceType === "KING" && tile.color !== color) {
            isKingAttacked = true;
          }
          possibleMoves.push(currentCoords);
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
        if (includeDefendedPieces || tile?.color !== color) {
          if (tile?.pieceType === "KING" && tile.color !== color) {
            isKingAttacked = true;
          }
          possibleMoves.push(currentCoords);
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
        if (includeDefendedPieces || tile?.color !== color) {
          if (tile?.pieceType === "KING" && tile.color !== color) {
            isKingAttacked = true;
          }
          possibleMoves.push(currentCoords);
        }
        break;
      }
      possibleMoves.push(currentCoords);
    }

    return { possibleMoves: possibleMoves, isKingAttacked: isKingAttacked };
  }

  private _getPossiblePawnMoves(
    position: Coords,
    color: PlayerColor,
    includeDefendedPieces: boolean
  ) {
    const possibleMoves = [] as Coords[];
    let coords;
    let canMoveOneTile = false;

    const attacks = this._getPossiblePawnAttacks(
      position,
      color,
      includeDefendedPieces
    );
    if (color === "WHITE") {
      coords = Coords.getInstance(position.x, position.y + 1);
    } else {
      coords = Coords.getInstance(position.x, position.y - 1);
    }

    //checking only y because x is the same as moved position and is guaranteed to be correct
    if (coords && this._currentBoard[coords.y]![coords.x] === null) {
      possibleMoves.push(coords);
      canMoveOneTile = true;
    }

    if (
      this._movedPawns.find(
        (coords) => coords?.x === position.x && coords?.y === position.y
      ) !== undefined
    ) {
      return {
        possibleMoves: possibleMoves.concat(attacks.possibleMoves),
        isKingAttacked: attacks.isKingAttacked,
      };
    }

    if (color === "WHITE") {
      coords = Coords.getInstance(position.x, position.y + 2);
    } else {
      coords = Coords.getInstance(position.x, position.y - 2);
    }

    //checking only y because x is the same as moved position and is guaranteed to be correct
    if (
      coords &&
      canMoveOneTile &&
      this._currentBoard[coords.y]![coords.x] === null
    ) {
      possibleMoves.push(coords);
    }

    return {
      possibleMoves: possibleMoves.concat(attacks.possibleMoves),
      isKingAttacked: attacks.isKingAttacked,
    };
  }

  private _getPossiblePawnAttacks(
    position: Coords,
    color: PlayerColor,
    includeDefendedPieces: boolean
  ) {
    const getCaptures = (xDiff: number) => {
      const possibleMoves = [] as Coords[];
      let isKingAttacked = false;
      let coords;
      if (color === "WHITE") {
        coords = Coords.getInstance(position.x + xDiff, position.y + 1);
      } else {
        coords = Coords.getInstance(position.x + xDiff, position.y - 1);
      }
      if (!coords) {
        return { possibleMoves: possibleMoves, isKingAttacked: isKingAttacked };
      }

      const tile = this._currentBoard[coords.y]![coords.x]!;
      if (tile === null) {
        return { possibleMoves: possibleMoves, isKingAttacked: isKingAttacked };
      }
      if (coords && (includeDefendedPieces || tile.color !== color)) {
        if (tile.pieceType === "KING" && tile.color !== color) {
          isKingAttacked = true;
        }
        possibleMoves.push(coords);
      }

      const enPassantCoords = Coords.getInstance(coords.x, position.y);
      if (!enPassantCoords) {
        return { possibleMoves: possibleMoves, isKingAttacked: isKingAttacked };
      }

      const tilePossibleToEnPassant =
        this._currentBoard[enPassantCoords.y]![enPassantCoords.x]!;
      if (tile === null) {
        return { possibleMoves: possibleMoves, isKingAttacked: isKingAttacked };
      }
      if (
        this._pawnsPossibleToEnPassant.includes(enPassantCoords) &&
        tilePossibleToEnPassant.pieceType === "PAWN" &&
        tilePossibleToEnPassant.color !== color
      ) {
        possibleMoves.push(enPassantCoords);
      }
      return { possibleMoves: possibleMoves, isKingAttacked: isKingAttacked };
    };

    const leftCaptures = getCaptures(-1);
    const rightCaptures = getCaptures(1);

    return {
      possibleMoves: leftCaptures.possibleMoves.concat(
        rightCaptures.possibleMoves
      ),
      isKingAttacked:
        leftCaptures.isKingAttacked || rightCaptures.isKingAttacked,
    };
  }

  private _getPossibleBishopMoves(
    position: Coords,
    color: PlayerColor,
    includeDefendedPieces: boolean
  ) {
    const possibleMoves = [] as Coords[];
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
          if (includeDefendedPieces || tile?.color !== color) {
            if (tile?.pieceType === "KING" && tile.color !== color) {
              isKingAttacked = true;
            }
            possibleMoves.push(coords);
          }

          breaks[index] = true;
          return;
        }
        possibleMoves.push(coords);
      });
    }

    return { possibleMoves: possibleMoves, isKingAttacked: isKingAttacked };
  }

  private _getPossibleQueenMoves(
    position: Coords,
    color: PlayerColor,
    includeDefendedPieces: boolean
  ) {
    const rookResult = this._getPossibleRookMoves(
      position,
      color,
      includeDefendedPieces
    );

    const bishopResult = this._getPossibleBishopMoves(
      position,
      color,
      includeDefendedPieces
    );
    const possibleMoves = rookResult.possibleMoves.concat(
      bishopResult.possibleMoves
    );

    return {
      possibleMoves: possibleMoves,
      isKingAttacked: rookResult.isKingAttacked || bishopResult.isKingAttacked,
    };
  }

  private _getPossibleKnightMoves(
    position: Coords,
    color: PlayerColor,
    includeDefendedPieces: boolean
  ) {
    let isKingAttacked = false;
    const possibleMoves = [] as Coords[];
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
        if (includeDefendedPieces || tile.color !== color) {
          possibleMoves.push(coords);
          if (tile.pieceType == "KING" && tile.color !== color) {
            isKingAttacked = true;
          }
        }
      }
    }

    return { possibleMoves: possibleMoves, isKingAttacked: isKingAttacked };
  }

  private _getPossibleKingMoves(
    position: Coords,
    color: PlayerColor,
    includeDefendedPieces: boolean
  ) {
    const possibleMoves = [] as Coords[];
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
          if (
            !includeDefendedPieces &&
            (tile_color === color || color === "WHITE"
              ? this._tilesAttackedByBlack.has(coords)
              : this._tilesAttackedByWhite.has(coords))
          ) {
            continue;
          }

          possibleMoves.push(coords);
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

    return possibleMoves;
  }
}

export default Chess;
