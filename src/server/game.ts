import { type Coords, initBoard, movePiece } from "~/utils/pieces";
import { randomUUID } from "crypto";

export type Player = {
  id: string;
  secondsLeft: number;
};

type Result = "white" | "black" | "draw";

export class Game {
  private _id: string;
  public get id(): string {
    return this._id;
  }
  private _white: Player;
  public get white(): Player {
    return this._white;
  }
  public set white(value: Player) {
    this._white = value;
  }
  private _black: Player;
  public get black(): Player {
    return this._black;
  }
  public set black(value: Player) {
    this._black = value;
  }
  private _board = initBoard();
  public get board() {
    return this._board;
  }
  private _turn: Player;
  public get turn() {
    return this._turn;
  }
  private _drawOfferedBy: Player | null;
  public get drawOfferedBy() {
    return this._turn;
  }
  private _gameResult: Result | null = null;
  private get gameResult() {
    return this._gameResult;
  }
  private _lastMoveTime: number;
  private get lastMoveTime() {
    return this._lastMoveTime;
  }

  constructor(whiteId: string, timeControl: number) {
    this._white = {
      id: whiteId,
      secondsLeft: timeControl,
    };

    this._black = {
      id: "-1",
      secondsLeft: timeControl,
    };
    this._turn = this._white;
    this._drawOfferedBy = null;
    this._id = randomUUID();
    this._lastMoveTime = Date.now();
  }

  move(from: Coords, to: Coords) {
    movePiece(this.board, from, to);
    if (this._turn === this._white) {
      this._turn = this._black;
    } else {
      this._turn = this._white;
    }

    const moveEnd = Date.now();
    const duration = moveEnd - this._lastMoveTime;
    this._lastMoveTime = moveEnd;
    return duration;
}

  offerDraw(color: "white" | "black") :Result | null {
    if (color === "white") {
      if (this._drawOfferedBy === this._white) {
        return null;
      }

      if (this._drawOfferedBy === this._black) {
        this._gameResult = "draw";
        return "draw";
      }

      this._drawOfferedBy = this._white;
      return null;
    } else {
      if (this._drawOfferedBy === this._black) {
        return null;
      }

      if (this._drawOfferedBy === this._white) {
        this._gameResult = "draw";
        return "draw";
      }

      this._drawOfferedBy = this._black;
      return null;
    }
  }

  refuseDraw() {
    this._drawOfferedBy = null;
  }
}
