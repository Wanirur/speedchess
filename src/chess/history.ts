import { type PlayerColor } from "@prisma/client";

export interface TrackingStrategy {
  get moves(): Move[];
  getMove(index: number): unknown;
  addMove(move: unknown): void;
  toString(): string;
  lastMove(): unknown;
}

export interface MoveDescriptor {
  copy(): MoveDescriptor;
}

export type Move = {
  index: string;
  color: PlayerColor;
  move: MoveDescriptor;
  isMain: boolean;
  variations?: Move[][];
};

export class SimpleHistory<T extends MoveDescriptor>
  implements TrackingStrategy
{
  private _moves: T[] = [];
  public get moves(): Move[] {
    return this._moves.map((move, index) => {
      return {
        index: (Math.floor(index / 2) + 1).toString(),
        color: index % 2 ? "BLACK" : "WHITE",
        move: move,
        isMain: true,
      };
    });
  }

  public getMove(index: number) {
    return this._moves[index];
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
  private _branchStartIndex: number | undefined;
  public get branchStartIndex() {
    return this._branchStartIndex;
  }

  private _variationIndex: number | undefined;
  public get variationIndex() {
    return this._variationIndex;
  }

  private _isMainlineChosenAsBranch = true;
  public get isMainlineChosenAsBranch() {
    return this._isMainlineChosenAsBranch;
  }

  private _moves: { move: T; variations: SimpleHistory<T>[] }[] = [];
  public get moves(): Move[] {
    const result = [];
    let i = 0;
    for (const moveData of this._moves) {
      result.push({
        index: (Math.floor(i / 2) + 1).toString(),
        move: moveData.move,
        color: i % 2 ? "BLACK" : ("WHITE" as PlayerColor),
        isMain: true,
        variations: moveData.variations.map((variation) =>
          variation.moves.map((move) => ({ ...move, isMain: false }))
        ),
      });

      i++;
    }

    return result;
  }

  public getMove(
    index: number,
    branchStartIndex?: number,
    variationIndex?: number
  ) {
    if (branchStartIndex === undefined || variationIndex === undefined) {
      return this._moves[index]?.move;
    }

    const variation = this._moves[branchStartIndex]?.variations[variationIndex];
    if (!variation) {
      return;
    }

    return variation.getMove(index + 1);
  }

  public setCurrentBranch(
    chooseMainline: boolean,
    branchStartIndex?: number,
    variationIndex?: number
  ) {
    this._isMainlineChosenAsBranch = chooseMainline;
    this._branchStartIndex = branchStartIndex;
    this._variationIndex = variationIndex;
    if (chooseMainline) {
      return;
    }

    if (branchStartIndex === undefined || variationIndex === undefined) {
      throw new Error("no data provided");
    }

    const move = this._moves[branchStartIndex];
    if (!move) {
      throw new Error("incorrect branch start index chosen");
    }

    if (variationIndex > 0 && !move.variations[variationIndex - 1]) {
      console.log(variationIndex);
      console.log(branchStartIndex);
      throw new Error("incorrect variation index chosen");
    }

    if (!move.variations[variationIndex]) {
      move.variations.push(new SimpleHistory());
      move.variations[variationIndex]?.addMove(move.move.copy() as T);
    }

    this._branchStartIndex = branchStartIndex;
  }

  public addMove(move: T) {
    if (this._isMainlineChosenAsBranch) {
      this._moves.push({ move: move, variations: [] });
    } else {
      const variation =
        this._moves[this._branchStartIndex!]?.variations[this._variationIndex!];

      if (!variation) {
        throw new Error("broken history");
      }

      variation.addMove(move);
    }
  }

  public toString() {
    return this._moves.map(({ move }) => move?.toString()).join(" ");
  }

  public lastMove() {
    if (this._isMainlineChosenAsBranch) {
      return this._moves.at(-1)?.move;
    }

    return this._moves[this._branchStartIndex!]?.variations[
      this._variationIndex!
    ]?.lastMove();
  }
}

export class CombinedStrategies<
  T extends TrackingStrategy,
  K extends TrackingStrategy
> implements TrackingStrategy
{
  private _moves: { notation: T; position: K }[] = [];
  public get moves(): Move[] {
    return this._notation.moves;
  }

  private _notation: T;
  public get notation(): T {
    return this._notation;
  }

  private _position: K;
  public get position(): K {
    return this._position;
  }

  constructor(first: T, second: K) {
    this._notation = first;
    this._position = second;
  }

  public getMove(index: number) {
    return this._notation.getMove(index);
  }

  public addMove(move: { notation: T; position: K }) {
    this._notation.addMove(move.notation);
    this._position.addMove(move.position);

    const combined = {
      notation: this._notation.lastMove() as T,
      position: this._position.lastMove() as K,
    };

    this._moves.push(combined);
  }

  public toString() {
    return this._notation.toString();
  }

  public lastMove() {
    return this._moves.at(-1);
  }

  public setCurrentBranch(
    chooseMainline: boolean,
    branchStartIndex?: number,
    variationIndex?: number
  ) {
    if (
      !(this._notation instanceof HistoryWithVariations) ||
      !(this._position instanceof HistoryWithVariations)
    ) {
      throw new Error(
        "createNewVariation supported only on history with variations"
      );
    }

    this._notation.setCurrentBranch(
      chooseMainline,
      branchStartIndex,
      variationIndex
    );
    this._position.setCurrentBranch(
      chooseMainline,
      branchStartIndex,
      variationIndex
    );
  }
}
