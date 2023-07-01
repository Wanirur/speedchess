import Script from "next/script";
import { type ReactNode, createContext, useContext, useState } from "react";
import EventEmitter from "~/utils/event_emitter";
import { type FEN } from "~/utils/notations";
import { type PlayerColor } from "~/utils/pieces";

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

type StockfishApi = {
  postMessage: (arg: string) => void;
  addMessageListener: (arg: (line: string) => void) => void;
};

class StockfishMessageQueue {
  private _stockfishInstance: StockfishApi;
  get stockfishInstance(): StockfishApi {
    return this._stockfishInstance;
  }

  private _isReady = false;
  private _isCalculating = false;

  private _queue = [] as string[];

  constructor(stockfish: StockfishApi) {
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

export type BestChessLine = {
  evaluation: number;
  moves: string[];
};

class StockfishWrapper extends EventEmitter {
  private _messageQueue: StockfishMessageQueue;

  private _bestLines = new Array<BestChessLine>(3);
  public get bestLines(): BestChessLine[] {
    return this._bestLines;
  }

  private _currentDepth = 0;
  public get currentDepth(): number {
    return this._currentDepth;
  }

  constructor(stockfishInstance: StockfishApi) {
    super();
    this._messageQueue = new StockfishMessageQueue(stockfishInstance);
    this._messageQueue.stockfishInstance.addMessageListener((line: string) => {
      console.log(line);
      if (line.startsWith("info") && line.includes("multipv")) {
        this._handleCalculation(line);
      }
    });
  }

  private _handleCalculation(line: string) {
    const words = line.split(" ");
    const multipvIndex = words.findIndex((word) => word === "multipv") + 1;
    const movesBegginingIndex = words.findIndex((word) => word === "pv") + 1;
    const depthIndex = words.findIndex((word) => word === "depth") + 1;
    const evalIndex = words.findIndex((word) => word === "cp") + 1;
    const moves = [] as string[];

    const multipv = words[multipvIndex];
    const depth = words[depthIndex];
    const evaluation = words[evalIndex];
    if (!multipv || !movesBegginingIndex || !depth || !evaluation) {
      return;
    }

    for (let i = movesBegginingIndex; i < words.length; i++) {
      const move = words[i];
      if (!move) {
        continue;
      }

      moves.push(move);
    }

    const parsedMultipv = Number.parseInt(multipv) - 1;
    this._bestLines[parsedMultipv] = {
      evaluation: Number.parseInt(evaluation) / 100,
      moves: moves,
    };

    if (parsedMultipv !== 2) {
      return;
    }

    this._currentDepth = Number.parseInt(depth);
    this.emit("depth_changed", {
      depth: this._currentDepth,
      lines: this._bestLines,
    });
  }

  setStrength(elo: number) {
    this._messageQueue.sendMessage("setoption name UCI_LimitStrength true");
    this._messageQueue.sendMessage(`setoption name UCI_Elo ${elo}`);
  }

  analysisMode() {
    this._messageQueue.sendMessage("setoption name MultiPV value 3");
    this._messageQueue.sendMessage("ucinewgame");
  }

  calculateBestVariations(position: FEN, depth: number) {
    this._messageQueue.sendMessage("ucinewgame");
    this._messageQueue.sendMessage(`position fen ${position.toString()}`);

    this._currentDepth = 0;
    this._bestLines = new Array<BestChessLine>(3);

    this._messageQueue.sendMessage(`go depth ${depth}`);
  }
}

type StockfishContextType = {
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  stockfish?: StockfishWrapper;
};

const StockfishContext = createContext<StockfishContextType>({
  isLoading: true,
  isError: false,
  isSuccess: false,
});

const StockfishProvider = ({ children }: { children: ReactNode }) => {
  const [context, setContext] = useState<StockfishContextType>({
    isLoading: true,
    isError: false,
    isSuccess: false,
  });

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
        onReady={() => {
          if (!wasmThreadsSupported()) {
            console.log(
              "wasm threads not supported (possibly incorrect headers?)"
            );
            setContext({
              isLoading: false,
              isError: true,
              isSuccess: false,
            });

            return;
          }

          if (context.stockfish) {
            setContext({ ...context });
            console.log("stockfish instance already running");
            return;
          }

          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
          Stockfish().then((sf: StockfishApi) => {
            setContext({
              isLoading: false,
              isError: false,
              isSuccess: true,
              stockfish: new StockfishWrapper(sf),
            });
          });
        }}
      ></Script>
      {children}
    </StockfishContext.Provider>
  );
};

export const useStockfish = () => useContext(StockfishContext);

export default StockfishProvider;
