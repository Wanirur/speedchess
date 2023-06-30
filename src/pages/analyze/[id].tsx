import { type NextPage } from "next";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import Chessboard from "~/components/chessboard";
import MovesHistory from "~/components/moves_history";
import UserBanner from "~/components/user_banner";
import { api } from "~/utils/api";
import Chess from "~/utils/chess";
import { initBoard } from "~/utils/pieces";
import StockfishProvider, { useStockfish } from "~/context/stockfish_provider";
import EvalBar from "~/components/eval_bar";

const AnalyzePage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { data: sessionData } = useSession();

  const chessRef = useRef<Chess | null>(null);
  if (chessRef.current === null) {
    chessRef.current = new Chess(initBoard());
  }

  const {
    isLoading,
    isError,
    data: gameMoves,
  } = api.chess.getGameHistory.useQuery(
    { id: Number.parseInt(id as string) },
    {
      enabled: !!id,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );

  const [indexOfBoardToDisplay, setIndexOfBoardToDisplay] = useState<number>(0);
  const [isReadyToAnalyze, setIsReadyToAnalyze] = useState<boolean>(false);

  useEffect(() => {
    if (!gameMoves || !chessRef.current) {
      return;
    }

    const moves = gameMoves.split(" ");

    console.log(moves);
    try {
      chessRef.current.playOutFromLongAlgebraicString(moves);
      setIndexOfBoardToDisplay(chessRef.current.algebraic.length - 1);
      setIsReadyToAnalyze(true);
    } catch (err) {
      if (err instanceof Error) {
        console.error(err);
      }
    }
  }, [gameMoves]);

  const [bestLineMoves, setBestLineMoves] = useState<string[][]>([]);
  const [bestLineEvals, setBestLineEvals] = useState<number[]>([]);

  const {
    isLoading: isStockfishLoading,
    isError: isStockfishError,
    stockfish,
  } = useStockfish();

  useEffect(() => {
    if (!isReadyToAnalyze) {
      return;
    }

    const position = chessRef.current?.history[indexOfBoardToDisplay + 1];
    if (position) {
      stockfish?.analysisMode();
      stockfish?.calculateBestVariations(
        position,
        (indexOfBoardToDisplay + 1) % 2 ? "WHITE" : "BLACK",
        100
      );
    }
  }, [indexOfBoardToDisplay, stockfish, isReadyToAnalyze]);

  useEffect(() => {
    if (
      stockfish?.bestLines[0] &&
      stockfish?.bestLines[1] &&
      stockfish?.bestLines[2]
    ) {
      setBestLineMoves(stockfish?.bestLines.map((line) => line.moves));
      setBestLineEvals(stockfish?.bestLines.map((line) => line.evaluation));
    }
  }, [stockfish?.bestLines, stockfish?.currentDepth]);

  if (!sessionData?.user || isError || isStockfishError) {
    return <div> error </div>;
  }

  if (!chessRef.current || !router.isReady || isLoading || isStockfishLoading) {
    return <div> loading...</div>;
  }

  const boardToDisplay =
    chessRef.current.history[indexOfBoardToDisplay]?.buildBoard() ??
    chessRef.current.board;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] items-center justify-center 3xl:min-h-[calc(100vh-7rem)]">
      <div className="relative flex h-[33rem] flex-col items-center justify-center bg-neutral-900 md:h-[30rem] md:w-[50rem] md:flex-row lg:h-[40rem] lg:w-[60rem] 3xl:h-[60rem] 3xl:w-[90rem]">
        <div className="z-10 h-80 w-80  md:h-[30rem] md:w-[30rem] lg:h-[40rem] lg:w-[40rem] 3xl:h-[60rem] 3xl:w-[60rem]">
          <Chessboard
            uuid={"analyze"}
            color={"WHITE"}
            isYourTurn={false}
            chess={chessRef.current}
            board={boardToDisplay}
            locked
          ></Chessboard>
        </div>

        <div className="absolute flex h-full w-full min-w-[15rem] max-w-xs  flex-col items-center justify-center md:static md:m-0 md:w-1/3 md:max-w-md md:px-4 3xl:max-w-xl">
          <UserBanner
            className="h-10 w-full md:h-14 3xl:h-20  3xl:text-xl"
            user={sessionData?.user}
          ></UserBanner>

          {stockfish && (
            <EvalBar
              className="hidden h-1/5 w-full font-os text-white md:flex"
              evaluation={bestLineEvals[0] ?? 0}
              lines={bestLineMoves}
              evals={bestLineEvals}
            ></EvalBar>
          )}

          <MovesHistory
            className="h-80 w-full md:h-full md:gap-0 md:text-xs lg:gap-0.5 lg:text-sm"
            chess={chessRef.current}
            index={indexOfBoardToDisplay}
            setIndex={setIndexOfBoardToDisplay}
          ></MovesHistory>

          <div className="absolute bottom-0 m-auto flex h-20 items-center justify-center gap-3 font-os font-extrabold text-white md:static">
            <button
              className="rounded-lg bg-neutral-800 px-4 py-2.5 hover:bg-neutral-950"
              onClick={() => {
                setIndexOfBoardToDisplay((x) => (x === 0 ? x : x - 1));
              }}
            >
              {"<"}
            </button>
            <button
              className="rounded-lg bg-neutral-800 px-4 py-2.5 hover:bg-neutral-950"
              onClick={() => {
                setIndexOfBoardToDisplay((x) =>
                  x + 1 === chessRef.current?.history.length ? x : x + 1
                );
              }}
            >
              {">"}
            </button>
          </div>
          <UserBanner
            className="h-10 w-full md:h-14 3xl:h-20 3xl:text-xl"
            user={sessionData?.user}
          ></UserBanner>
        </div>
      </div>
    </main>
  );
};

const AnalyzeWithStockfish: NextPage = () => {
  return (
    <StockfishProvider>
      <AnalyzePage></AnalyzePage>
    </StockfishProvider>
  );
};

export default AnalyzeWithStockfish;