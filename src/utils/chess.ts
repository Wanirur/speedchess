/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { type Tile, type Coords, type PlayerColor, testBoard } from "./pieces";

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
  constructor(board?: Tile[][]) {
    if (board) {
      this._board = board;
    } else {
      this._board = testBoard();
    }
  }

  getPossibleMoves(position: Coords) {
    const possibleMoves = [] as Coords[];
    if (
      position.x < 0 ||
      position.x >= 8 ||
      position.y < 0 ||
      position.y >= 8
    ) {
      return [];
    }
    const piece = this._board[position.y]?.[position.x];
    if (piece === null) {
      return possibleMoves;
    }

    if (piece?.pieceType === "Rook") {
      return this._getPossibleRookMoves(position, piece.color);
    }
    if (piece?.pieceType === "Pawn") {
      return this._getPossiblePawnMoves(position, piece.color);
    }
    if (piece?.pieceType === "Bishop") {
      return this._getPossibleBishopMoves(position, piece.color);
    }
    if (piece?.pieceType === "Queen") {
      return this._getPossibleQueenMoves(position, piece.color);
    }

    return possibleMoves;
  }

  private _getPossibleRookMoves(position: Coords, color: PlayerColor) {
    const possibleMoves = [] as Coords[];
    let start = position.x;

    for (let i = start + 1; i < 8; i++) {
      const currentCoords = { ...position, x: i };
      const tile = this._board[currentCoords.y]?.[currentCoords.x];
      if (tile !== null) {
        if (tile?.color !== color) {
          possibleMoves.push(currentCoords);
        }
        break;
      }
      possibleMoves.push(currentCoords);
    }

    for (let i = start - 1; i >= 0; i--) {
      const currentCoords = { ...position, x: i };
      const tile = this._board[currentCoords.y]?.[currentCoords.x];
      if (tile !== null) {
        if (tile?.color !== color) {
          possibleMoves.push(currentCoords);
        }
        break;
      }
      possibleMoves.push(currentCoords);
    }

    start = position.y;

    for (let i = start + 1; i < 8; i++) {
      const currentCoords = { ...position, y: i };
      const tile = this._board[currentCoords.y]?.[currentCoords.x];
      if (tile !== null) {
        if (tile?.color !== color) {
          possibleMoves.push(currentCoords);
        }
        break;
      }
      possibleMoves.push(currentCoords);
    }

    for (let i = start - 1; i >= 0; i--) {
      const currentCoords = { ...position, y: i };
      const tile = this._board[currentCoords.y]?.[currentCoords.x];
      if (tile !== null) {
        if (tile?.color !== color) {
          possibleMoves.push(currentCoords);
        }
        break;
      }
      possibleMoves.push(currentCoords);
    }

    return possibleMoves;
  }

  private _getPossiblePawnMoves(position: Coords, color: PlayerColor) {
    const possibleMoves = [] as Coords[];
    let coords;
    if (color === "white") {
      coords = { x: position.x, y: position.y + 1 };
    } else {
      coords = { x: position.x, y: position.y - 1 };
    }

    let canMoveOneTile = false;

    //checking only y because x is the same as moved position and is guaranteed to be correct
    if (
      coords.y >= 0 &&
      coords.y < 8 &&
      this._board[coords.y]![coords.x] === null
    ) {
      possibleMoves.push(coords);
      canMoveOneTile = true;
    }

    //possible pawn captures including en passant
    let coords2;
    if (color === "white") {
      coords = { x: position.x - 1, y: position.y + 1 };
      coords2 = { x: position.x + 1, y: position.y + 1 };
    } else {
      coords = { x: position.x - 1, y: position.y - 1 };
      coords2 = { x: position.x + 1, y: position.y - 1 };
    }

    if (
      (coords.x >= 0 &&
        coords.x < 8 &&
        coords.y >= 0 &&
        coords.y < 8 &&
        this._board[coords.y]![coords.x] !== null &&
        this._board[coords.y]![coords.x]!.color !== color) ||
      (this._board[position.y]![coords.x] !== null &&
        this._board[position.y]![coords.x]!.color !== color &&
        this._pawnsPossibleToEnPassant.find(
          (coords) => coords.x === position.x - 1 && coords.y === position.y
        ))
    ) {
      possibleMoves.push(coords);
    }

    if (
      coords2.x >= 0 &&
      coords2.x < 8 &&
      coords2.y >= 0 &&
      coords2.y < 8 &&
      ((this._board[coords2.y]![coords2.x] !== null &&
        this._board[coords2.y]![coords2.x]!.color !== color) ||
        (this._board[position.y]![coords2.x] !== null &&
          this._board[position.y]![coords2.x]!.color !== color &&
          this._pawnsPossibleToEnPassant.find(
            (coords) => coords?.x === position.x + 1 && coords?.y === position.y
          )))
    ) {
      possibleMoves.push(coords2);
    }

    if (
      this._movedPawns.find(
        (coords) => coords?.x === position.x && coords?.y === position.y
      ) !== undefined
    ) {
      return possibleMoves;
    }

    if (color === "white") {
      coords = { x: position.x, y: position.y + 2 };
    } else {
      coords = { x: position.x, y: position.y - 2 };
    }

    //checking only y because x is the same as moved position and is guaranteed to be correct
    if (
      coords.y >= 0 &&
      coords.y < 8 &&
      canMoveOneTile &&
      this._board[coords.y]![coords.x] === null
    ) {
      possibleMoves.push(coords);
    }

    return possibleMoves;
  }

  private _getPossibleBishopMoves(position: Coords, color: PlayerColor) {
    const possibleMoves = [] as Coords[];

    const breaks = [false, false, false, false];

    for (let i = 1; i < 8; i++) {
      const currentCoords = [
        { x: position.x + i, y: position.y + i },
        { x: position.x + i, y: position.y - i },
        { x: position.x - i, y: position.y - i },
        { x: position.x - i, y: position.y + i },
      ];

      currentCoords.forEach((coords, index) => {
        if (!(coords.x >= 0 && coords.x < 8 && coords.y >= 0 && coords.y < 8)) {
          return;
        }

        if (breaks[index]) {
          return;
        }

        const tile = this._board[coords.y]![coords.x];
        if (tile !== null) {
          if (tile?.color !== color) {
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

  private _getPossibleQueenMoves(position: Coords, color: PlayerColor) {
    return this._getPossibleRookMoves(position, color).concat(
      this._getPossibleBishopMoves(position, color)
    );
  }
}

export default Chess;
