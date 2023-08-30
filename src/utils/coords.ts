export class Coords {
  private _x: number;
  public get x(): number {
    return this._x;
  }

  private _y: number;
  public get y(): number {
    return this._y;
  }

  /*
 Create object pool that allows using chess coordinates as map/set keys. 
 Furthermore, it's good for performance.
  */
  static _pool = new Array<Coords[]>(8);
  static {
    for (let i = 0; i < 8; i++) {
      const row = new Array<Coords>(8);
      for (let j = 0; j < 8; j++) {
        row[j] = new Coords(j, i);
      }
      Coords._pool[i] = row;
    }
  }

  private constructor(x: number, y: number) {
    this._x = x;
    this._y = y;
  }

  public static getInstance(x: number, y: number) {
    return Coords._pool[y]?.[x];
  }

  public static from(coords: { x: number; y: number }) {
    return Coords._pool[coords.y]?.[coords.x];
  }

  public static fromString(notation: string) {
    const x = notation.charCodeAt(0) - "a".charCodeAt(0);
    const y = Number.parseInt(notation.charAt(1)) - 1;

    return Coords._pool[y]?.[x];
  }

  public toString() {
    return (
      String.fromCharCode("a".charCodeAt(0) + this._x) +
      (this._y + 1).toString()
    );
  }
}
