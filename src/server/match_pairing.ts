import {
  type PlayerColor,
  type PromotedPieceType,
  type TimeControl,
} from "~/chess/utils";
import { randomUUID } from "crypto";
import { matches, playingUsers } from "./matchmaking";
import { type Coords } from "~/utils/coords";
import { prisma } from "./db";
import { type TimeControlName } from "@prisma/client";
import { calculateRatingDiff } from "~/utils/elo";
import { setTimeout } from "timers";
import Chessgame from "~/chess/chessgame";
import { SimpleHistory } from "~/chess/history";
import { type AlgebraicNotation } from "~/utils/notations";

export type Player = {
  id: string;
  rating: number;
  timeLeftInMilis: number;
};

export class MatchPairing {
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
  private _chess = new Chessgame(new SimpleHistory<AlgebraicNotation>());
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
  private get gameResult() {
    return this.chess.gameResult;
  }
  private _lastMoveTimestamp: number;
  public get lastMoveTimestamp() {
    return this._lastMoveTimestamp;
  }
  public set lastMoveTimestamp(moveTime: number) {
    this._lastMoveTimestamp = moveTime;
  }

  private _initialTime: number;
  public get initialTime(): number {
    return this._initialTime;
  }
  private _increment: number;
  public get increment(): number {
    return this._increment;
  }

  private _timeout: NodeJS.Timeout;
  private _hasStarted = false;

  private _isRanked = true;
  public get isRanked() {
    return this._isRanked;
  }

  constructor(
    whiteId: string,
    whiteRating: number,
    timeControl: TimeControl,
    isRanked: boolean
  ) {
    this._isRanked = isRanked;
    this._white = {
      id: whiteId,
      rating: whiteRating,
      timeLeftInMilis: timeControl.initialTime * 1000,
    };

    this._black = {
      id: "-1",
      rating: -1,
      timeLeftInMilis: timeControl.initialTime * 1000,
    };
    this._turn = this._white;
    this._drawOfferedBy = null;
    this._id = randomUUID();
    this._lastMoveTimestamp = Date.now();
    this._initialTime = timeControl.initialTime;
    this._increment = timeControl.increment;

    this._timeout = setTimeout(() => {
      this.chess.timeout("BLACK");
      void this.finishGame();
    }, this._white.timeLeftInMilis);
  }

  start() {
    this._lastMoveTimestamp = Date.now();
    this._hasStarted = true;
  }

  async move(from: Coords, to: Coords) {
    if (!this._hasStarted) {
      return 0;
    }

    const moveEnd = Date.now();
    const duration = moveEnd - this._lastMoveTimestamp;
    this._lastMoveTimestamp = moveEnd;
    this._turn.timeLeftInMilis -= duration;
    let timeLeft = this._turn.timeLeftInMilis;
    if (timeLeft <= 0) {
      this.chess.timeout(this._turn === this._white ? "WHITE" : "BLACK");
      await this.finishGame();
      return timeLeft;
    }

    this._chess.move(from, to);
    if (this._chess.position.pawnReadyToPromote !== null) {
      return timeLeft;
    }

    clearTimeout(this._timeout);

    if (this._chess.gameResult) {
      await this.finishGame();
      return timeLeft;
    }

    this._turn.timeLeftInMilis += this._increment * 1000;
    timeLeft = this._turn.timeLeftInMilis;

    this._timeout = setTimeout(() => {
      this.chess.timeout(this._turn === this._white ? "WHITE" : "BLACK");
      void this.finishGame();
    }, this._turn.timeLeftInMilis);

    if (this._turn === this._white) {
      this._turn = this._black;
    } else {
      this._turn = this._white;
    }

    return timeLeft;
  }

  async promote(promoteTo: PromotedPieceType) {
    if (!this._hasStarted) {
      return 0;
    }

    const moveEnd = Date.now();
    const duration = moveEnd - this._lastMoveTimestamp;
    this._lastMoveTimestamp = moveEnd;
    this._turn.timeLeftInMilis -= duration;
    const timeLeft = this._turn.timeLeftInMilis;

    if (timeLeft <= 0) {
      this.chess.timeout(this._turn === this._white ? "WHITE" : "BLACK");
      await this.finishGame();
      return timeLeft;
    }

    this._chess.promote(promoteTo);

    if (this._turn === this._white) {
      this._turn = this._black;
    } else {
      this._turn = this._white;
    }

    return timeLeft;
  }

  async offerDraw(color: PlayerColor) {
    if (!this._hasStarted) {
      return null;
    }

    if (color === "WHITE") {
      if (this._drawOfferedBy === this._white) {
        return null;
      }

      if (this._drawOfferedBy === this._black) {
        this.chess.drawAgreement();
        await this.finishGame();
        return this.gameResult;
      }

      this._drawOfferedBy = this._white;
      return null;
    } else {
      if (this._drawOfferedBy === this._black) {
        return null;
      }

      if (this._drawOfferedBy === this._white) {
        this.chess.drawAgreement();
        await this.finishGame();
        return this.gameResult;
      }

      this._drawOfferedBy = this._black;
      return null;
    }
  }

  async resign(color: PlayerColor) {
    if (!this._hasStarted) {
      return;
    }

    this.chess.resign(color);
    if (!this.chess.gameResult) {
      return;
    }

    await this.finishGame();
  }

  async abandon(color: PlayerColor) {
    if (!this._hasStarted) {
      return;
    }

    this.chess.abandon(color);
    await this.finishGame();
  }

  refuseDraw() {
    if (!this._hasStarted) {
      return;
    }

    this._drawOfferedBy = null;
  }

  private async finishGame() {
    if (!this._hasStarted || !this.gameResult) {
      return;
    }

    clearTimeout(this._timeout);

    matches.delete(this._id);
    playingUsers.delete(this.white.id);
    playingUsers.delete(this.black.id);

    if (!this._isRanked) {
      return;
    }

    let timeControl: TimeControlName;
    if (this._initialTime === 60) {
      timeControl = "BULLET";
    } else if (this._initialTime === 60 && this._increment === 1) {
      timeControl = "BULLET_INCREMENT";
    } else if (this._initialTime === 120 && this._increment === 1) {
      timeControl = "LONG_BULLET_INCREMENT";
    } else if (this._initialTime === 180) {
      timeControl = "BLITZ";
    } else {
      timeControl = "BLITZ_INCREMENT";
    }

    const ratingDiff = calculateRatingDiff(
      this.gameResult,
      this.white.rating,
      this.black.rating
    );

    const longAlgebraic = this._chess.history.moves
      .map((move) => (move.move as AlgebraicNotation).toLongNotationString())
      .join(" ");

    await prisma.game.create({
      data: {
        result: this.gameResult.winner,
        reason: this.gameResult.reason,
        moves: longAlgebraic,
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
