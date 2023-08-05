import {
  type GameResult,
  initBoard,
  type PromotedPieceType,
  type PlayerColor,
  oppositeColor,
  type Board,
} from "~/utils/pieces";
import ChessPosition from "./position";
import { AlgebraicNotation } from "~/utils/notations";
import {
  CombinedStrategies,
  HistoryWithVariations,
  type SimpleHistory,
  type TrackingStrategy,
} from "./history";
import { type Coords } from "~/utils/coords";

class Chessgame<T extends TrackingStrategy> {
  private _position: ChessPosition;
  public get position() {
    return this._position;
  }

  private _gameResult: GameResult | undefined;
  public get gameResult(): GameResult | undefined {
    return this._gameResult;
  }
  private _history: T;
  public get history(): T {
    return this._history;
  }

  private _movesPlayed = 0;
  public get movesPlayed() {
    return this._movesPlayed;
  }

  private _lastMovedFrom: Coords | undefined;
  public get lastMovedFrom(): Coords | undefined {
    return this._lastMovedFrom;
  }

  private _lastMovedTo: Coords | undefined;
  public get lastMovedTo(): Coords | undefined {
    return this._lastMovedTo;
  }

  private _wasLastMoveCapture: boolean | undefined;

  private _turn: PlayerColor;
  private _positionRepeats: Map<string, number> = new Map();

  constructor(trackingStrategy: T, board?: Board, turn?: PlayerColor) {
    this._position = new ChessPosition(
      board ? board : initBoard(),
      turn ? turn : "WHITE"
    );
    this._turn = turn ? turn : "WHITE";
    this._history = trackingStrategy;
  }

  public move(from: Coords, to: Coords) {
    const isCapturing = this._position.board[to.y]?.[to.x] !== null;

    this._position.move(from, to, this._turn);

    this._lastMovedFrom = from;
    this._lastMovedTo = to;
    this._wasLastMoveCapture = isCapturing;

    if (this._position.pawnReadyToPromote) {
      return this._position.board;
    }

    if (
      this._history instanceof CombinedStrategies &&
      this._history.notation instanceof HistoryWithVariations &&
      !this._history.notation.isMainlineChosenAsBranch
    ) {
      this._movesPlayed--;
    }

    this._movesPlayed++;

    if (this._position.gameResult) {
      this._gameResult = this._position.gameResult;
    }

    const stringifiedBoard = this._position.fen.board;
    if (this._positionRepeats.has(stringifiedBoard)) {
      const count = this._positionRepeats.get(stringifiedBoard)!;
      this._positionRepeats.set(stringifiedBoard, count + 1);
      if (count === 3) {
        this._gameResult = {
          winner: "DRAW",
          reason: "REPETITION",
        };
      }
    } else {
      this._positionRepeats.set(stringifiedBoard, 1);
    }

    const notation = new AlgebraicNotation(
      from,
      to,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this._position.board[to.y]![to.x]!.pieceType,
      isCapturing,
      this._position.whitePieceInteractions.kingChecks.length > 0 ||
        this._position.blackPieceInteractions.kingChecks.length > 0,
      this._position.gameResult?.reason === "MATE"
    );

    if (this._history instanceof CombinedStrategies) {
      this._history?.addMove({
        notation: notation.copy(),
        position: this._position.copy(),
      });
    } else {
      this._history?.addMove(notation.copy());
    }

    this._turn = oppositeColor(this._turn);

    return this._position.board;
  }

  public promote(promoteTo: PromotedPieceType) {
    const from = this._lastMovedFrom;
    const to = this._lastMovedTo;
    const isCapturing = this._wasLastMoveCapture;
    if (!from || !to || isCapturing === undefined) {
      throw Error("promotion without move!");
    }

    this._position.promote(promoteTo, this._turn);

    this._movesPlayed++;

    if (this._position.gameResult) {
      this._gameResult = this._position.gameResult;
    }

    const stringifiedBoard = this._position.fen.board;
    if (this._positionRepeats.has(stringifiedBoard)) {
      const count = this._positionRepeats.get(stringifiedBoard)!;
      this._positionRepeats.set(stringifiedBoard, count + 1);
      if (count === 3) {
        this._gameResult = {
          winner: "DRAW",
          reason: "REPETITION",
        };
      }
    } else {
      this._positionRepeats.set(stringifiedBoard, 1);
    }

    const notation = new AlgebraicNotation(
      from,
      to,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this._position.board[to.y]![to.x]!.pieceType,
      isCapturing,
      this._position.whitePieceInteractions.kingChecks.length > 0 ||
        this._position.blackPieceInteractions.kingChecks.length > 0,
      this._position.gameResult?.reason === "MATE",
      promoteTo
    );

    this._history?.addMove(notation);
    this._turn = oppositeColor(this._turn);

    return this._position.board;
  }

  public revertLastMove() {
    if (!this._history) {
      throw Error("no history to revert from");
    }

    this._history.moves.pop();
    this.playOutFromMoves(this._history.toString());
  }

  public playOutFromMoves(lanString: string, result?: GameResult) {
    if (lanString === "") {
      this._gameResult = result;
      return;
    }

    let color = "WHITE" as PlayerColor;

    const moves = lanString.split(" ");
    for (const currentMove of moves) {
      const { from, to, promotedTo } =
        AlgebraicNotation.getDataFromLANString(currentMove);
      this.move(from, to);

      if (promotedTo) {
        this.promote(promotedTo);
      }

      color = oppositeColor(color);
    }

    this._gameResult = result;
  }

  public abandon(color: PlayerColor) {
    this._gameResult = {
      winner: oppositeColor(color),
      reason: "ABANDONMENT",
    };
  }

  public timeout(color: PlayerColor) {
    this._gameResult = {
      winner: oppositeColor(color),
      reason: "TIMEOUT",
    };
  }

  public drawAgreement() {
    this._gameResult = {
      winner: "DRAW",
      reason: "AGREEMENT",
    };
  }

  public resign(color: PlayerColor) {
    this._gameResult = {
      winner: oppositeColor(color),
      reason: "RESIGNATION",
    };
  }

  public setMoveIndex(
    mainBranch: boolean,
    moveIndex?: number,
    branchStartIndex?: number,
    variationIndex?: number
  ) {
    if (
      !(this._history instanceof CombinedStrategies) ||
      !(this._history.notation instanceof HistoryWithVariations) ||
      !(this._history.position instanceof HistoryWithVariations)
    ) {
      throw new Error("variations not supported on current history strategy");
    }

    this._history.setCurrentBranch(
      mainBranch,
      branchStartIndex,
      variationIndex
    );

    let position;
    if (moveIndex !== undefined) {
      position = this._history.position.getMove(moveIndex) as ChessPosition;
    } else {
      position = this._history.position.lastMove() as ChessPosition;
    }

    this._position = position.copy();
    this._turn = this._position.fen.turn;
  }
}

export default Chessgame;

export type ChessgameForMatch = Chessgame<
  CombinedStrategies<
    SimpleHistory<AlgebraicNotation>,
    SimpleHistory<ChessPosition>
  >
>;

export type ChessgameForAnalysis = Chessgame<
  CombinedStrategies<
    HistoryWithVariations<AlgebraicNotation>,
    HistoryWithVariations<ChessPosition>
  >
>;

export type ChessgameForServerside = Chessgame<
  SimpleHistory<AlgebraicNotation>
>;
