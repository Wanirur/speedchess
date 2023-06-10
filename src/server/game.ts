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
import { prisma } from "./db";
import { type TimeControl } from "@prisma/client";
import { calculateRatingDiff } from "~/utils/elo";

export type Player = {
  id: string;
  rating: number;
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

  private _timeControl: number;
  private _increment: number;

  constructor(
    whiteId: string,
    whiteRating: number,
    timeControl: number,
    increment = 0
  ) {
    this._white = {
      id: whiteId,
      rating: whiteRating,
      timeLeftInMilis: timeControl * 1000,
    };

    this._black = {
      id: "-1",
      rating: -1,
      timeLeftInMilis: timeControl * 1000,
    };
    this._turn = this._white;
    this._drawOfferedBy = null;
    this._id = randomUUID();
    this._lastMoveTime = Date.now();
    this._timeControl = timeControl;
    this._increment = increment;
  }

  async move(from: Coords, to: Coords) {
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
      await this.finishGame();
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

  async promote(promoteTo: PromotedPieceType) {
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
      await this.finishGame();
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

  async offerDraw(color: PlayerColor) {
    if (color === "WHITE") {
      if (this._drawOfferedBy === this._white) {
        return null;
      }

      if (this._drawOfferedBy === this._black) {
        this._gameResult = {
          winner: "DRAW",
          reason: "AGREEMENT",
        };
        await this.finishGame();
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
        await this.finishGame();
        return this._gameResult;
      }

      this._drawOfferedBy = this._black;
      return null;
    }
  }

  async resign(color: PlayerColor) {
    this.chess.resign(color);
    if (!this.chess.gameResult) {
      return;
    }

    this._gameResult = this.chess.gameResult;
    await this.finishGame();
  }

  refuseDraw() {
    this._drawOfferedBy = null;
  }

  private async finishGame() {
    if (!this._gameResult) {
      return;
    }

    matches.delete(this._id);

    let timeControl: TimeControl;
    if (this._timeControl === 60) {
      timeControl = "BULLET";
    } else if (this._timeControl === 60 && this._increment === 1) {
      timeControl = "BULLET_INCREMENT";
    } else if (this._timeControl === 120 && this._increment === 1) {
      timeControl = "LONG_BULLET_INCREMENT";
    } else if (this._timeControl === 180) {
      timeControl = "BLITZ";
    } else {
      timeControl = "BLITZ_INCREMENT";
    }

    const ratingDiff = calculateRatingDiff(
      this._gameResult,
      this.white.rating,
      this.black.rating
    );

    await prisma.game.create({
      data: {
        result: this._gameResult.winner,
        moves: this._chess.getFullAlgebraicHistory(),
        timeControl: timeControl,
        gameToUsers: {
          create: [
            {
              user: {
                connect: {
                  id: this._white.id,
                },
              },
              currentRating: this.white.rating,
              color: "WHITE",
            },
            {
              user: {
                connect: {
                  id: this.black.id,
                },
              },
              currentRating: this.black.rating,
              color: "BLACK",
            },
          ],
        },
      },
    });

    const whiteUpdate = prisma.user.update({
      where: {
        id: this.white.id,
      },
      data: {
        rating: {
          increment: ratingDiff.white,
        },
      },
    });

    const blackUpdate = prisma.user.update({
      where: {
        id: this.black.id,
      },
      data: {
        rating: {
          increment: ratingDiff.black,
        },
      },
    });

    await Promise.all([whiteUpdate, blackUpdate]);
  }
}
