import { type NextPage } from "next";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Chessboard from "~/components/chessboard";
import MovesHistory from "~/components/moves_history";
import UserBanner from "~/components/user_banner";
import { api } from "~/utils/api";
import { type PlayerColor } from "~/chess/utils";
import StockfishProvider, {
  type BestChessLine,
  useStockfish,
} from "~/context/stockfish_provider";
import EvalBar from "~/components/eval_bar";
import { type User } from "next-auth";
import Chessgame, { type ChessgameForAnalysis } from "~/chess/chessgame";
import { CombinedStrategies, HistoryWithVariations } from "~/chess/history";
import { type AlgebraicNotation } from "~/utils/notations";
import type ChessPosition from "~/chess/position";
import Layout from "~/components/layout";

const AnalyzePage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { data: sessionData } = useSession();

  const [chess, setChess] = useState<ChessgameForAnalysis>(
    new Chessgame(
      new CombinedStrategies(
        new HistoryWithVariations<AlgebraicNotation>(),
        new HistoryWithVariations<ChessPosition>()
      )
    )
  );

  const {
    isLoading,
    isError,
    data: gameData,
  } = api.chess.getGameHistory.useQuery(
    { id: Number.parseInt(id as string) },
    {
      enabled: !!id,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );

  const { data: playersData } = api.socials.getPlayersOfAnalyzedGame.useQuery(
    { id: Number.parseInt(id as string) },
    {
      enabled: !!id,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );

  const [whiteData, setWhiteData] = useState<User | undefined>();
  const [blackData, setBlackData] = useState<User | undefined>();
  const [boardAlignment, setBoardAlignment] = useState<PlayerColor>("WHITE");

  useEffect(() => {
    if (!playersData) {
      return;
    }

    const whiteGameToUser = playersData.gameToUsers.filter(
      (gameToUser) => gameToUser.color === "WHITE"
    );

    const blackGameToUser = playersData.gameToUsers.filter(
      (gameToUser) => gameToUser.color === "BLACK"
    );
    if (!whiteGameToUser[0] || !blackGameToUser[0]) {
      return;
    }

    const whiteData = whiteGameToUser[0].user;
    const blackData = blackGameToUser[0].user;
    if (
      !whiteData?.name ||
      !whiteData?.rating ||
      !blackData?.name ||
      !blackData?.rating
    ) {
      return;
    }

    const whiteFinal = {
      id: whiteData.id,
      name: whiteData.name,
      rating: whiteData.rating,
    };

    const blackFinal = {
      id: blackData.id,
      name: blackData.name,
      rating: blackData.rating,
    };

    setWhiteData(whiteFinal);
    setBlackData(blackFinal);
  }, [playersData]);

  useEffect(() => {
    if (sessionData?.user.id === blackData?.id) {
      setBoardAlignment("BLACK");
    }
  }, [sessionData, blackData]);

  const [bestLines, setBestLines] = useState<BestChessLine[]>([]);
  const [depth, setDepth] = useState<number>(0);
  const {
    isLoading: isStockfishLoading,
    isError: isStockfishError,
    stockfish,
  } = useStockfish();

  const [moveIndex, setMoveIndex] = useState<number>(0);
  const [branchStartIndex, setBranchStartIndex] = useState<
    number | undefined
  >();
  const [variationIndex, setVariationIndex] = useState<number | undefined>();
  const [isReadyToAnalyze, setIsReadyToAnalyze] = useState<boolean>(false);

  useEffect(() => {
    if (!isReadyToAnalyze || !stockfish || !chess) {
      return;
    }

    const position = (
      chess.history.position.getMove(
        moveIndex,
        branchStartIndex,
        variationIndex
      ) as ChessPosition
    )?.fen;
    if (!position) {
      return;
    }

    stockfish.analysisMode();
    stockfish.calculateBestVariations(
      position,
      100,
      moveIndex % 2 ? "WHITE" : "BLACK"
    );

    const depthCallback = (data: { depth: number; lines: BestChessLine[] }) => {
      const { depth, lines } = data as {
        depth: number;
        lines: BestChessLine[];
      };
      if (depth) {
        setDepth(depth);
      }
      if (lines) {
        setBestLines(lines);
      }
    };
    stockfish.bind("depth_changed", depthCallback);

    return () => {
      stockfish.unbind("depth_changed", depthCallback);
    };
  }, [
    moveIndex,
    stockfish,
    isReadyToAnalyze,
    chess,
    branchStartIndex,
    variationIndex,
  ]);

  useEffect(() => {
    if (!gameData || !chess) {
      return;
    }

    try {
      chess.playOutFromMoves(gameData.moves, gameData.result);
      setMoveIndex(chess.movesPlayed - 1);
      setIsReadyToAnalyze(true);
    } catch (err) {
      if (err instanceof Error) {
        console.error(err);
      }
    }
  }, [gameData, chess]);

  if (!sessionData?.user || isError || isStockfishError) {
    return <div> error </div>;
  }

  if (
    !chess ||
    !router.isReady ||
    isLoading ||
    !stockfish ||
    !blackData ||
    !whiteData
  ) {
    return <div> loading...</div>;
  }

  const boardToDisplay =
    chess.history.position.getMove(moveIndex, branchStartIndex, variationIndex)
      ?.board ?? chess.position.board;

  return (
    <Layout
      title={`Analyzing: ${whiteData?.name ?? "guest"} vs ${
        blackData?.name ?? "guest"
      }`}
    >
      <div className="relative flex h-[33rem] flex-col items-center justify-center bg-neutral-900 md:h-[30rem] md:w-[50rem] md:flex-row lg:h-[40rem] lg:w-[60rem] 3xl:h-[60rem] 3xl:w-[90rem]">
        <div className="z-10 h-80 w-80  md:h-[30rem] md:w-[30rem] lg:h-[40rem] lg:w-[40rem] 3xl:h-[60rem] 3xl:w-[60rem]">
          <Chessboard
            uuid={"analyze"}
            color={boardAlignment}
            skipColorCheck
            isYourTurn={true}
            chess={chess}
            board={boardToDisplay}
            locked={
              branchStartIndex !== undefined &&
              moveIndex < chess.history.notation.getCurrentBranchLength() - 1
            }
            onMove={() => {
              setBranchStartIndex(chess.history.notation.branchStartIndex);
              setVariationIndex(chess.history.notation.variationIndex);

              if (
                branchStartIndex === undefined &&
                chess.history.notation.branchStartIndex !== undefined
              ) {
                setMoveIndex(0);
                return;
              }

              setMoveIndex((old) => old + 1);
            }}
            unlockFunction={() => {
              setMoveIndex(chess.history.notation.getCurrentBranchLength() - 1);
            }}
          ></Chessboard>
        </div>

        <div className="absolute flex h-full w-full min-w-[15rem] max-w-xs  flex-col items-center justify-center md:static md:m-0 md:w-1/3 md:max-w-md md:px-4 3xl:max-w-xl">
          <UserBanner
            className="h-10 w-full md:h-14 3xl:h-20  3xl:text-xl"
            user={boardAlignment === "WHITE" ? blackData : whiteData}
          ></UserBanner>

          <EvalBar
            className="hidden h-1/5 w-full bg-neutral-950 font-os text-white md:flex lg:h-1/4"
            lines={bestLines}
            depth={depth}
            engineName={stockfish.engineName}
            noMoves={chess.movesPlayed === 0}
          ></EvalBar>

          <MovesHistory
            className="h-80 w-full md:h-full md:gap-0 md:text-xs lg:gap-0.5 lg:text-sm"
            history={chess.history.notation}
            index={moveIndex}
            branchStartIndex={branchStartIndex}
            variationIndex={variationIndex}
            onIndexChange={(
              index: number,
              isMain: boolean,
              branchStartIndex?: number,
              variationIndex?: number
            ) => {
              setMoveIndex(index);
              setBranchStartIndex(branchStartIndex);
              setVariationIndex(variationIndex);
              chess.setMoveIndex(
                isMain,
                index,
                branchStartIndex ?? index,
                variationIndex ??
                  chess.history.notation.moves[branchStartIndex ?? index]
                    ?.variations?.length ??
                  0
              );
            }}
            gameResult={chess.gameResult}
          ></MovesHistory>

          <div className="absolute bottom-0 m-auto flex h-20 items-center justify-center gap-3 py-2 font-os font-extrabold text-white md:static">
            <button
              className="rounded-lg bg-neutral-800 px-4 py-2.5 hover:bg-neutral-950"
              onClick={() => {
                setMoveIndex((x) => (x === 0 ? x : x - 1));
              }}
            >
              {"<"}
            </button>
            <button
              className="rounded-lg bg-neutral-800 px-4 py-2.5 hover:bg-neutral-950"
              onClick={() => {
                console.log(
                  `history: ${chess.history.notation.getCurrentBranchLength()}`
                );
                console.log(`index: ${moveIndex}`);
                setMoveIndex((x) =>
                  x === chess.history.notation.getCurrentBranchLength() - 1
                    ? x
                    : x + 1
                );
              }}
            >
              {">"}
            </button>
          </div>
          <UserBanner
            className="h-10 w-full md:h-14 3xl:h-20 3xl:text-xl"
            user={boardAlignment === "WHITE" ? whiteData : blackData}
          ></UserBanner>
        </div>
      </div>
    </Layout>
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
