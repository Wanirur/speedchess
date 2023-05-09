export class Coords {
  /*
  Object pool created in order to avoid unecessary temporary objects 
  which happened when chess methods accepted any CoordsType args
  - avoids gc issues.
  It also allows to find coords in sets which is used when looking for checkmates
  */
  static _pool = new Array<Coords[]>(8);
  private _x: number;
  public get x(): number {
    return this._x;
  }

  private _y: number;
  public get y(): number {
    return this._y;
  }

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
}