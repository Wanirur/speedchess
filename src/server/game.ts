import {
  type GameResult,
  type PlayerColor,
  initBoard,
  type PromotedPieceType,
} from "~/utils/pieces";
import { randomUUID } from "crypto";
import { matches } from "./matchmaking";
import { type Coords } from "~/utils/coords";
import Chess from "~/utils/chess";

export type Player = {
  id: string;
  timeLeftInMilis: number;
};

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
  private _chess = new Chess(initBoard());
  public get chess() {
    return this._chess;
  }
  private _turn: Player;
  public get turn() {
    return this._turn;
  }
  private _drawOfferedBy: Player | null;
  public get drawOfferedBy() {
    return this._turn;
  }
  private _gameResult: GameResult | null = null;
  private get gameResult() {
    return this._gameResult;
  }
  private _lastMoveTime: number;
  public get lastMoveTime() {
    return this._lastMoveTime;
  }

  constructor(whiteId: string, timeControl: number) {
    this._white = {
      id: whiteId,
      timeLeftInMilis: timeControl * 1000,
    };

    this._black = {
      id: "-1",
      timeLeftInMilis: timeControl * 1000,
    };
    this._turn = this._white;
    this._drawOfferedBy = null;
    this._id = randomUUID();
    this._lastMoveTime = Date.now();
  }

  move(from: Coords, to: Coords) {
    const moveEnd = Date.now();
    const duration = moveEnd - this._lastMoveTime;
    this._lastMoveTime = moveEnd;
    this._turn.timeLeftInMilis -= duration;
    const timeLeft = this._turn.timeLeftInMilis;
    if (timeLeft <= 0) {
      this._gameResult = {
        winner: this._turn === this._white ? "BLACK" : "WHITE",
        reason: "TIMEOUT",
      };
      this.finishGame();
      return timeLeft;
    }

    this._chess.move(from, to, this._turn === this._white ? "WHITE" : "BLACK");
    if (this._chess.pawnReadyToPromote !== null) {
      return timeLeft;
    }

    if (this._turn === this._white) {
      this._turn = this._black;
    } else {
      this._turn = this._white;
    }

    return timeLeft;
  }

  promote(promoteTo: PromotedPieceType) {
    const moveEnd = Date.now();
    const duration = moveEnd - this._lastMoveTime;
    this._lastMoveTime = moveEnd;
    this._turn.timeLeftInMilis -= duration;
    const timeLeft = this._turn.timeLeftInMilis;

    if (timeLeft <= 0) {
      this._gameResult = {
        winner: this._turn === this._white ? "BLACK" : "WHITE",
        reason: "TIMEOUT",
      };
      this.finishGame();
      return timeLeft;
    }

    this._chess.promote(
      promoteTo,
      this._turn === this._white ? "WHITE" : "BLACK"
    );

    if (this._turn === this._white) {
      this._turn = this._black;
    } else {
      this._turn = this._white;
    }

    return timeLeft;
  }

  offerDraw(color: PlayerColor): GameResult | null {
    if (color === "WHITE") {
      if (this._drawOfferedBy === this._white) {
        return null;
      }

      if (this._drawOfferedBy === this._black) {
        this._gameResult = {
          winner: "DRAW",
          reason: "AGREEMENT",
        };
        this.finishGame();
        return this._gameResult;
      }

      this._drawOfferedBy = this._white;
      return null;
    } else {
      if (this._drawOfferedBy === this._black) {
        return null;
      }

      if (this._drawOfferedBy === this._white) {
        this._gameResult = {
          winner: "DRAW",
          reason: "AGREEMENT",
        };
        this.finishGame();
        return this._gameResult;
      }

      this._drawOfferedBy = this._black;
      return null;
    }
  }

  refuseDraw() {
    this._drawOfferedBy = null;
  }

  private finishGame() {
    if (this._gameResult) {
      matches.delete(this._id);
    }
  }
}
