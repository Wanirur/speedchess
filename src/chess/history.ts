import { type AlgebraicNotation } from "~/utils/notations";
import type ChessPosition from "./position";

export interface TrackingStrategy {
  moves: unknown[];
  addMove(move: unknown): void;
  toString(): string;
  lastMove(): unknown;
}

export type MoveDescriptor = ChessPosition | AlgebraicNotation;

export class SimpleHistory<T extends MoveDescriptor>
  implements TrackingStrategy
{
  private _moves: T[] = [];
  public get moves(): T[] {
    return this._moves;
  }

  public addMove(move: T) {
    this._moves.push(move);
  }

  public toString() {
    return this._moves.map((move) => move.toString()).join(" ");
  }

  public lastMove() {
    return this._moves.at(-1);
  }
}

export class HistoryWithVariations<T extends MoveDescriptor>
  implements TrackingStrategy
{
  private _moves: T[][] = [];
  public get moves(): T[][] {
    return this._moves;
  }

  public addMove(move: T, variationMoveIndex?: number) {
    if (variationMoveIndex) {
      return;
    }

    this._moves.push([move]);
  }

  public toString() {
    return this._moves.map(([move]) => move?.toString()).join(" ");
  }

  public lastMove() {
    return this._moves.at(-1)?.[0];
  }
}

export class CombinedStrategies<
  T extends TrackingStrategy,
  K extends TrackingStrategy
> implements TrackingStrategy
{
  private _moves: { first: unknown; second: unknown }[] = [];
  public get moves() {
    return this._moves;
  }

  private _first: T;
  public get first(): T {
    return this._first;
  }

  private _second: K;
  public get second(): K {
    return this._second;
  }

  constructor(first: T, second: K) {
    this._first = first;
    this._second = second;
  }

  public addMove(move: { first: T; second: K }) {
    this._first.addMove(move.first);
    this._second.addMove(move.second);

    const combined = {
      first: this._first.lastMove(),
      second: this._second.lastMove(),
    };
    this._moves.push(combined);
  }

  public toString() {
    return this._first.toString();
  }

  public lastMove() {
    return this._moves.at(-1);
  }
}
