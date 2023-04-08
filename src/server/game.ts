import { initBoard } from "~/utils/pieces";
import { randomUUID } from "crypto";

type Player = { 
    id: number,
    secondsLeft: number
}

export class Game {
    private _id: string;
    public get id(): string {
        return this._id;
    }
   
    private white :Player; 
    private black :Player; 
    private board = initBoard();

    constructor(whiteId: number, blackId: number, timeControl: number) { 
        this.white = { 
            id: whiteId, 
            secondsLeft: timeControl
        }

        this.black =  {
            id: blackId, 
            secondsLeft: timeControl
        }

        this._id = randomUUID()
    }
}