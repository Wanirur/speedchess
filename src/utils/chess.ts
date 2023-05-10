/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Coords } from "./coords";
import { type Tile, type PlayerColor, testBoard } from "./pieces";

class Chess {
  private _board: Tile[][];
  public get board(): Tile[][] {
    return this._board;
  }
  public set board(value: Tile[][]) {
    this._board = value;
  }

  private _movedPawns = new Array<Coords>(16);
  private _pawnsPossibleToEnPassant = new Array<Coords>(16);
  private _tilesAttackedByWhite = new Set<Coords>();
  private _tilesAttackedByBlack = new Set<Coords>();

  constructor(board?: Tile[][]) {
    if (board) {
      this._board = board;
    } else {
      this._board = testBoard();
    }

    let x = 0,
      y = 0;
    for (const row of this._board) {
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
          tile.pieceType === "Pawn"
            ? this._getPossiblePawnAttacks(coords, tile.color, true)
            : this.getPossibleMoves(coords);
        possibleAttacks.forEach((coords) =>
          tile.color === "white"
            ? this._tilesAttackedByWhite.add(coords)
            : this._tilesAttackedByBlack.add(coords)
        );
        x++;
      }
      x = 0;
      y++;
    }
  }

  public getPossibleMoves(position: Coords, includeDefendedPieces = false) {
    const possibleMoves = [] as Coords[];
    if (!position) {
      return [];
    }
    const piece = this._board[position.y]![position.x]!;
    if (piece === null) {
      return possibleMoves;
    }

    if (piece.pieceType === "Rook") {
      return this._getPossibleRookMoves(
        position,
        piece.color,
        includeDefendedPieces
      );
    }
    if (piece.pieceType === "Pawn") {
      return this._getPossiblePawnMoves(
        position,
        piece.color,
        includeDefendedPieces
      );
    }
    if (piece.pieceType === "Bishop") {
      return this._getPossibleBishopMoves(
        position,
        piece.color,
        includeDefendedPieces
      );
    }
    if (piece.pieceType === "Queen") {
      return this._getPossibleQueenMoves(
        position,
        piece.color,
        includeDefendedPieces
      );
    }
    if (piece.pieceType === "King") {
      return this._getPossibleKingMoves(
        position,
        piece.color,
        includeDefendedPieces
      );
    }
    if (piece.pieceType === "Knight") {
      return this._getPossibleKnightMoves(
        position,
        piece.color,
        includeDefendedPieces
      );
    }

    return possibleMoves;
  }

  private _getPossibleRookMoves(
    position: Coords,
    color: PlayerColor,
    includeDefendedPieces: boolean
  ) {
    const possibleMoves = [] as Coords[];
    let start = position.x;

    for (let i = start + 1; i < 8; i++) {
      const currentCoords = Coords.getInstance(i, position.y);
      if (!currentCoords) {
        break;
      }
      const tile = this._board[currentCoords.y]?.[currentCoords.x];
      if (tile !== null) {
        if (includeDefendedPieces || tile?.color !== color) {
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
      const tile = this._board[currentCoords.y]?.[currentCoords.x];
      if (tile !== null) {
        if (includeDefendedPieces || tile?.color !== color) {
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
      const tile = this._board[currentCoords.y]?.[currentCoords.x];
      if (tile !== null) {
        if (includeDefendedPieces || tile?.color !== color) {
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
      const tile = this._board[currentCoords.y]?.[currentCoords.x];
      if (tile !== null) {
        if (includeDefendedPieces || tile?.color !== color) {
          possibleMoves.push(currentCoords);
        }
        break;
      }
      possibleMoves.push(currentCoords);
    }

    return possibleMoves;
  }

  private _getPossiblePawnMoves(
    position: Coords,
    color: PlayerColor,
    includeDefendedPieces: boolean
  ) {
    const possibleMoves = [] as Coords[];
    let coords;
    let canMoveOneTile = false;

    if (color === "white") {
      coords = Coords.getInstance(position.x, position.y + 1);
    } else {
      coords = Coords.getInstance(position.x, position.y - 1);
    }

    //checking only y because x is the same as moved position and is guaranteed to be correct
    if (coords && this._board[coords.y]![coords.x] === null) {
      possibleMoves.push(coords);
      canMoveOneTile = true;
    }

    if (
      this._movedPawns.find(
        (coords) => coords?.x === position.x && coords?.y === position.y
      ) !== undefined
    ) {
      return possibleMoves.concat(
        this._getPossiblePawnAttacks(position, color, includeDefendedPieces)
      );
    }

    if (color === "white") {
      coords = Coords.getInstance(position.x, position.y + 2);
    } else {
      coords = Coords.getInstance(position.x, position.y - 2);
    }

    //checking only y because x is the same as moved position and is guaranteed to be correct
    if (coords && canMoveOneTile && this._board[coords.y]![coords.x] === null) {
      possibleMoves.push(coords);
    }

    return possibleMoves.concat(
      this._getPossiblePawnAttacks(position, color, includeDefendedPieces)
    );
  }

  private _getPossiblePawnAttacks(
    position: Coords,
    color: PlayerColor,
    includeDefendedPieces: boolean
  ) {
    const possibleMoves = [] as Coords[];
    let coords;

    if (color === "white") {
      coords = Coords.getInstance(position.x - 1, position.y + 1);
    } else {
      coords = Coords.getInstance(position.x - 1, position.y - 1);
    }

    if (
      coords &&
      ((this._board[coords.y]![coords.x] !== null &&
        (includeDefendedPieces ||
          this._board[coords.y]![coords.x]!.color !== color)) ||
        (this._board[position.y]![coords.x] !== null &&
          (includeDefendedPieces ||
            this._board[position.y]![coords.x]!.color !== color) &&
          this._pawnsPossibleToEnPassant.find(
            (coords) => coords.x === position.x - 1 && coords.y === position.y
          )))
    ) {
      possibleMoves.push(coords);
    }

    if (color === "white") {
      coords = Coords.getInstance(position.x + 1, position.y + 1);
    } else {
      coords = Coords.getInstance(position.x + 1, position.y - 1);
    }
    if (
      coords &&
      ((this._board[coords.y]![coords.x] !== null &&
        (includeDefendedPieces ||
          this._board[coords.y]![coords.x]!.color !== color)) ||
        (this._board[position.y]![coords.x] !== null &&
          (includeDefendedPieces ||
            this._board[position.y]![coords.x]!.color !== color) &&
          this._pawnsPossibleToEnPassant.find(
            (coords) => coords?.x === position.x + 1 && coords?.y === position.y
          )))
    ) {
      possibleMoves.push(coords);
    }

    return possibleMoves;
  }

  private _getPossibleBishopMoves(
    position: Coords,
    color: PlayerColor,
    includeDefendedPieces: boolean
  ) {
    const possibleMoves = [] as Coords[];

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

        const tile = this._board[coords.y]![coords.x];
        if (tile !== null) {
          if (includeDefendedPieces || tile?.color !== color) {
            possibleMoves.push(coords);
          }

          breaks[index] = true;
          return;
        }
        possibleMoves.push(coords);
      });
    }

    return possibleMoves;
  }

  private _getPossibleQueenMoves(
    position: Coords,
    color: PlayerColor,
    includeDefendedPieces: boolean
  ) {
    return this._getPossibleRookMoves(
      position,
      color,
      includeDefendedPieces
    ).concat(
      this._getPossibleBishopMoves(position, color, includeDefendedPieces)
    );
  }

  private _getPossibleKnightMoves(
    position: Coords,
    color: PlayerColor,
    includeDefendedPieces: boolean
  ) {
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

      const tile = this._board[coords.y]![coords.x]!;
      if (tile === null) {
        possibleMoves.push(coords);
      } else {
        if (includeDefendedPieces || tile.color !== color) {
          possibleMoves.push(coords);
        }
      }
    }

    return possibleMoves;
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
        const tile = this._board[coords.y]![coords.x]!;
        if (tile !== null) {
          const tile_color = tile.color;
          if (
            !includeDefendedPieces &&
            (tile_color === color || color === "white"
              ? this._tilesAttackedByBlack.has(coords)
              : this._tilesAttackedByWhite.has(coords))
          ) {
            continue;
          }

          possibleMoves.push(coords);
        }

        if (
          color === "white"
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
