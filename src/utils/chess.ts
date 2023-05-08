import {
  type Tile,
  type Coords,
  type PlayerColor,
  testBoard,
} from "./pieces";

class Chess {
  private _board: Tile[][];
  public get board(): Tile[][] {
    return this._board;
  }
  public set board(value: Tile[][]) {
    this._board = value;
  }

  constructor(board?:Tile[][]) {
    if(board) {
        this._board = board;
    } else {
        this._board = testBoard();
    }
  }

  getPossibleMoves(position: Coords) {
    const possibleMoves = [] as Coords[];
    const piece = this._board[position.y]?.[position.x];
    if (piece === null) {
      return possibleMoves;
    }

    if (piece?.pieceType === "Rook") {
      return this._getPossibleRookMoves(position, piece.color);
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
}

export default Chess;