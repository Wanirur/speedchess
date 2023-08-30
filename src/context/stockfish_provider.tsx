/* eslint-disable @next/next/no-before-interactive-script-outside-document */
import { type PlayerColor } from "@prisma/client";
import Script from "next/script";
import {
  type ReactNode,
  createContext,
  useContext,
  useState,
  useRef,
} from "react";
import EventEmitter from "~/utils/event_emitter";
import { AlgebraicNotation, type FEN } from "~/utils/notations";
import { type TimeControl } from "~/chess/utils";

//source: https://github.com/lichess-org/stockfish.wasm/blob/master/Readme.md
const wasmThreadsSupported = () => {
  // WebAssembly 1.0
  const source = Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00);
  if (
    typeof WebAssembly !== "object" ||
    typeof WebAssembly.validate !== "function"
  )
    return false;
  if (!WebAssembly.validate(source)) return false;

  // SharedArrayBuffer
  if (typeof SharedArrayBuffer !== "function") return false;

  // Atomics
  if (typeof Atomics !== "object") return false;

  // Shared memory
  const mem = new WebAssembly.Memory({ shared: true, initial: 8, maximum: 16 });
  if (!(mem.buffer instanceof SharedArrayBuffer)) return false;

  // Structured cloning
  try {
    // You have to make sure nobody cares about these messages!
    window.postMessage(mem, "*");
  } catch (e) {
    return false;
  }

  // Growable shared memory (optional)
  try {
    mem.grow(8);
  } catch (e) {
    return false;
  }

  return true;
};

type Stockfish = {
  postMessage: (arg: string) => void;
  addMessageListener: (arg: (line: string) => void) => void;
  removeMessageListener: (arg: (line: string) => void) => void;
};

class StockfishMessageQueue {
  private _stockfishInstance: Stockfish;
  get stockfishInstance(): Stockfish {
    return this._stockfishInstance;
  }

  private _isReady = false;
  private _isCalculating = false;

  private _queue = [] as string[];

  constructor(stockfish: Stockfish) {
    this._stockfishInstance = stockfish;

    this._stockfishInstance.addMessageListener((line) => {
      if (line === "uciok") {
        this._isReady = true;
        return;
      }
      if (line === "readyok") {
        this._isReady = true;

        const message = this._queue.shift();
        if (!message) {
          return;
        }

        this._stockfishInstance.postMessage(message);
        this._isReady = false;
        this._stockfishInstance.postMessage("isready");
      }
    });

    this._stockfishInstance.postMessage("uci");
  }

  sendMessage(msg: string) {
    if (this._isCalculating) {
      this._stopCalculating();
    }

    if (msg.startsWith("go")) {
      this._isCalculating = true;
    }

    if (this._isReady) {
      this._stockfishInstance.postMessage(msg);
      this._isReady = false;
      this._stockfishInstance.postMessage("isready");
    } else {
      this._queue.push(msg);
    }
  }

  clear() {
    this._stopCalculating();
    this._queue = [];
  }

  private _stopCalculating() {
    if (!this._isCalculating) {
      return;
    }

    this._stockfishInstance.postMessage("stop");
    this._stockfishInstance.postMessage("isready");
    this._isReady = false;
    this._isCalculating = false;
  }
}

export type Evaluation =
  | {
      evaluation: number;
      mateIn?: number;
    }
  | {
      evaluation?: number;
      mateIn: number;
    };

export type BestChessLine = {
  moves: string[];
} & Evaluation;

class StockfishWrapper extends EventEmitter {
  private _messageQueue: StockfishMessageQueue;
  private _engineName = "";
  public get engineName(): string {
    return this._engineName;
  }

  private _isInitialized = false;
  public get isInitialized() {
    return this._isInitialized;
  }

  private _rating = 2800;
  public get rating(): number {
    return this._rating;
  }

  private _mode: "ANALYSIS" | "PLAY" | undefined;

  private _gameMoves: string[] = [];
  public set gameMoves(moves: string[]) {
    this._gameMoves = moves;
  }

  private _color: PlayerColor = "WHITE";
  public get color(): PlayerColor {
    return this._color;
  }

  private _secondsPerMove = 0;
  private _ponder = "";
  private _eval: Evaluation = { evaluation: 0 };
  private _isDrawOffered = false;

  private _bestLines = new Array<BestChessLine>(3);
  public get bestLines(): BestChessLine[] {
    return this._bestLines.sort((a, b) => {
      const dir = this._color === "WHITE" ? -1 : 1;
      if (a.mateIn && b.mateIn) {
        return dir * (a.mateIn - b.mateIn);
      } else if (a.mateIn) {
        return dir * -1;
      } else if (b.mateIn) {
        return dir;
      } else if (a.evaluation !== undefined && b.evaluation !== undefined) {
        return dir * (a.evaluation - b.evaluation);
      } else {
        //will never happen
        return dir * -1;
      }
    });
  }

  private _currentDepth = 0;
  public get currentDepth(): number {
    return this._currentDepth;
  }

  private _boundMessageListener = this._messageListener.bind(this);

  constructor(stockfishInstance: Stockfish) {
    super();
    this._messageQueue = new StockfishMessageQueue(stockfishInstance);
    this._messageQueue.stockfishInstance.addMessageListener(
      this._boundMessageListener
    );

    this._isInitialized = true;
  }

  private _messageListener(line: string) {
    if (
      this._mode === "ANALYSIS" &&
      line.startsWith("info") &&
      line.includes("multipv")
    ) {
      this._handleAnalysis(line);
    } else if (this._mode === "PLAY" && line.startsWith("bestmove")) {
      this._handleBestMove(line);
    } else if (this._mode === "PLAY" && line.startsWith("info")) {
      this._handleDrawOfferEval(line);
    } else if (line.startsWith("id name")) {
      this._engineName = line.replace("id name ", "");
    }
  }

  private _handleAnalysis(line: string) {
    const words = line.split(" ");
    const multipvIndex = words.findIndex((word) => word === "multipv") + 1;
    const movesBegginingIndex = words.findIndex((word) => word === "pv") + 1;
    const depthIndex = words.findIndex((word) => word === "depth") + 1;
    const mateIndex = words.findIndex((word) => word === "mate") + 1;
    const evalIndex = words.findIndex((word) => word === "cp") + 1;
    const moves = [] as string[];

    const multipv = words[multipvIndex];
    const depth = words[depthIndex];

    if (!multipv || !movesBegginingIndex || !depth) {
      return;
    }

    if (!mateIndex && !evalIndex) {
      return;
    }

    const evaluation = words[evalIndex];
    const mateIn = words[mateIndex];

    const parsedDepth = Number.parseInt(depth);

    for (let i = movesBegginingIndex; i < words.length; i++) {
      const move = words[i];
      if (!move) {
        continue;
      }

      moves.push(move);
    }

    const parsedMultipv = Number.parseInt(multipv) - 1;

    if (evalIndex && evaluation) {
      this._bestLines[parsedMultipv] = {
        moves: moves,
        evaluation: Number.parseInt(evaluation) / 100,
      };
    } else if (mateIndex && mateIn) {
      this._bestLines[parsedMultipv] = {
        moves: moves,
        mateIn: Number.parseInt(mateIn),
      };
    }

    if (parsedMultipv !== 2) {
      return;
    }

    this._currentDepth = parsedDepth;
    this.emit("depth_changed", {
      depth: this._currentDepth,
      lines: this.bestLines,
    });
  }

  private _handleBestMove(line: string) {
    const words = line.split(" ");
    const bestMoveIndex = words.findIndex((word) => word === "bestmove") + 1;
    const ponderIndex = words.findIndex((word) => word === "ponder") + 1;
    if (!bestMoveIndex) {
      return;
    }

    const bestMove = words[bestMoveIndex];
    const ponder = words[ponderIndex];
    if (!bestMove) {
      return;
    }

    if (ponder) {
      this._ponder = ponder;
    }
    this._gameMoves.push(bestMove);
    const { from, to, promotedTo } =
      AlgebraicNotation.getDataFromLANString(bestMove);
    this.emit("move_made", { from: from, to: to });

    if (promotedTo) {
      this.emit("piece_promoted", { promotedTo: promotedTo });
    }
  }

  private _handleDrawOfferEval(line: string) {
    const words = line.split(" ");
    const evalIndex = words.findIndex((word) => word === "cp") + 1;
    const mateIndex = words.findIndex((word) => word === "mate") + 1;
    const depthIndex = words.findIndex((word) => word === "depth") + 1;
    if ((!evalIndex && !mateIndex) || !depthIndex) {
      return;
    }

    const depth = words[depthIndex];
    if (!depth) {
      return;
    }

    const evaluation = words[evalIndex] ? words[evalIndex] : words[mateIndex];
    if (evaluation === undefined) {
      return;
    }

    if (evalIndex) {
      this._eval = { evaluation: Number.parseInt(evaluation) };
    } else {
      this._eval = { mateIn: Number.parseInt(evaluation) };
    }

    this._currentDepth = Number.parseInt(depth);
    if (!this._isDrawOffered || this._currentDepth < 10) {
      return;
    }

    if (this._isDrawOptimal()) {
      this.emit("draw_accepted", {});
    } else {
      this.emit("draw_refused", {});
    }

    this._isDrawOffered = false;
  }

  private _isDrawOptimal() {
    const evalBadForWhiteOrDrawish =
      this._eval.evaluation !== undefined && this._eval.evaluation <= -0.5;

    const evalBadForBlackOrDrawish =
      this._eval.evaluation !== undefined && this._eval.evaluation >= 0.5;

    const evalDrawishOrLosing =
      (this.color === "WHITE" && evalBadForWhiteOrDrawish) ||
      (this.color === "BLACK" && evalBadForBlackOrDrawish);

    const getsMated = this._eval.mateIn !== undefined && this._eval.mateIn < 0;

    return getsMated || evalDrawishOrLosing;
  }

  analysisMode() {
    this._mode = "ANALYSIS";
    this._messageQueue.sendMessage("setoption name MultiPV value 3");
    this._messageQueue.sendMessage("setoption name Ponder false");
    this._messageQueue.sendMessage("ucinewgame");
  }

  calculateBestVariations(position: FEN, depth: number, color: PlayerColor) {
    this._color = color;
    this._messageQueue.sendMessage("ucinewgame");
    this._messageQueue.sendMessage(`position fen ${position.toString()}`);

    this._currentDepth = 0;
    this._bestLines = new Array<BestChessLine>(3);

    this._messageQueue.sendMessage(`go depth ${depth}`);
  }

  setStrength(elo: number) {
    this._rating = elo;
    this._messageQueue.sendMessage(
      "setoption name UCI_LimitStrength value true"
    );
    this._messageQueue.sendMessage(`setoption name UCI_Elo value ${elo}`);
  }

  playMode(timeControl: TimeControl) {
    this._mode = "PLAY";

    let timePerMove = timeControl.initialTime / 60;
    timePerMove += timeControl.increment;
    timePerMove %= 4;

    this._secondsPerMove = timePerMove;

    this._messageQueue.sendMessage("setoption name MultiPV value 1");
    this._messageQueue.sendMessage("ucinewgame");
  }

  playResponseTo(move: string) {
    if (move !== "") {
      this._gameMoves.push(move);
    }

    if (move === this._ponder) {
      this._messageQueue.sendMessage("ponderhit");
    }

    if (this._gameMoves.length) {
      const moves = this._gameMoves.join(" ");
      this._messageQueue.sendMessage(`position startpos moves ${moves}`);
    } else {
      this._messageQueue.sendMessage("position startpos");
    }

    this._messageQueue.sendMessage(
      `go movetime ${this._secondsPerMove * 1000}`
    );
  }

  offerDraw() {
    if (this._gameMoves.length < 20) {
      this.emit("draw_refused", {});
      return;
    }

    if (this._currentDepth < 10) {
      this._isDrawOffered = true;
      return;
    }

    if (this._isDrawOptimal()) {
      this.emit("draw_accepted", {});
    } else {
      this.emit("draw_refused", {});
    }
  }

  terminate() {
    /* there seems to be no reliable way to kill the stockfish process
     without killing the main thread so the instance is kept for future use 
     https://github.com/lichess-org/stockfish.wasm/issues/38
     */
    this._isInitialized = false;

    this._gameMoves = [];
    this._messageQueue.clear();
    this._messageQueue.stockfishInstance.removeMessageListener(
      this._boundMessageListener
    );
  }

  reinitialize() {
    this._messageQueue.stockfishInstance.addMessageListener(
      this._boundMessageListener
    );

    this._isInitialized = true;
  }
}

type StockfishContextType = {
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  stockfish?: StockfishWrapper;
};

const StockfishContext = createContext<StockfishContextType>({
  isLoading: false,
  isError: true,
  isSuccess: false,
});

const StockfishProvider = ({ children }: { children: ReactNode }) => {
  const [context, setContext] = useState<StockfishContextType>({
    isLoading: true,
    isError: false,
    isSuccess: false,
  });

  const runningRef = useRef<boolean>(false);

  return (
    <StockfishContext.Provider value={context}>
      <Script
        src="./../../../stockfish.js"
        onError={(e: Error) => {
          console.log(e);

          setContext({
            isLoading: false,
            isError: true,
            isSuccess: false,
          });
        }}
        onLoad={() => {
          if (!wasmThreadsSupported()) {
            console.log(
              "wasm threads not supported (possibly incorrect headers?)"
            );
            setContext({
              isLoading: false,
              isError: true,
              isSuccess: false,
            });
          }
        }}
        onReady={() => {
          if (runningRef.current) {
            console.log("stockfish instance already running");
            return;
          }

          runningRef.current = true;

          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
          Stockfish()
            .then((sf: Stockfish) => {
              setContext({
                isLoading: false,
                isError: false,
                isSuccess: true,
                stockfish: new StockfishWrapper(sf),
              });
            })
            .catch((e: Error) => {
              console.log(e);
            });
        }}
        strategy="beforeInteractive"
      ></Script>
      {children}
    </StockfishContext.Provider>
  );
};

export const useStockfish = () => useContext(StockfishContext);

export default StockfishProvider;
