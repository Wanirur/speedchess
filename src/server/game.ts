import { initBoard, movePiece } from "~/utils/pieces";
import { randomUUID } from "crypto";
import { z } from "zod";

export type PlayerId = number | "guest";
export type Player = { 
    id: PlayerId,
    secondsLeft: number
}

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
    private board = initBoard();

    constructor(whiteId: PlayerId, timeControl: number) { 
        this._white = { 
            id: whiteId, 
            secondsLeft: timeControl
        }

        this._black = {
            id: -1, 
            secondsLeft: timeControl
        }

        this._id = randomUUID()
    }

    move(from: number, to: number) {
        const schema = z.number().min(0).max(63); 
        schema.parse(from);
        schema.parse(to);

        movePiece(this.board, from, to)
    }
}