import { type PlayerColor } from "@prisma/client";
import { type NextPage } from "next";
import { useSession } from "next-auth/react";
import { useRef, useState, useEffect, useCallback } from "react";
import Chessboard from "~/components/chessboard";
import DrawResignPanel from "~/components/draw_resign_panel";
import GameSummary from "~/components/game_summary";
import MovesHistory from "~/components/moves_history";
import Timer from "~/components/timer";
import UserBanner from "~/components/user_banner";
import StockfishProvider, { useStockfish } from "~/context/stockfish_provider";
import Chess from "~/utils/chess";
import { type Coords } from "~/utils/coords";
import { type TimeControl, initBoard } from "~/utils/pieces";

const PlayBot: React.FC = () => {
  const { data: sessionData } = useSession();
  const [chess, setChess] = useState<Chess>(new Chess(initBoard()));
  const [showDrawResignPanel, setShowDrawResignPanel] =
    useState<boolean>(false);

  const [isGameFinished, setIsGameFinished] = useState<boolean>(false);
  const [indexOfBoardToDisplay, setIndexOfBoardToDisplay] = useState<number>(0);

  const onPlayerMove = useCallback(() => {
    setIsYourTurn(true);
  }, []);
  const [gameState, setGameState] = useState<{
    whiteMilisLeft: number;
    blackMilisLeft: number;
    timeControl: TimeControl;
    color: PlayerColor;
    turn: PlayerColor;
  }>({
    whiteMilisLeft: 180000,
    blackMilisLeft: 180000,
    timeControl: { initialTime: 3, increment: 0 },
    color: "WHITE",
    turn: "WHITE",
  });

  const [isYourTurn, setIsYourTurn] = useState<boolean>(
    gameState.color === gameState.turn
  );
  const [opponentsData, setOpponentsData] = useState<
    { id: string; name: string; rating: number } | undefined
  >({ id: "-1", name: "stockfish", rating: 1400 });

  const { isError, stockfish } = useStockfish();
  const opponentsColor = gameState?.color === "WHITE" ? "BLACK" : "WHITE";

  useEffect(() => {
    stockfish?.playMode({ initialTime: 3, increment: 0 }, "BLACK");
  }, [stockfish]);

  useEffect(() => {
    if (!stockfish || !chess) {
      return;
    }

    const onMove = ({ from, to }: { from: Coords; to: Coords }) => {
      try {
        chess.move(from, to, opponentsColor);
      } catch (e) {
        if (e instanceof Error) {
          console.log(e);
        }
        return;
      }

      setIsYourTurn(true);
      setIndexOfBoardToDisplay((x) => x + 1);
    };
    stockfish.bind("move_made", onMove);

    return () => stockfish.unbind("move_made", onMove);
  }, [stockfish, chess, opponentsColor]);

  if (isError) {
    return <div className="text-red"> error </div>;
  }
  if (
    !chess ||
    !sessionData?.user ||
    !gameState ||
    !opponentsData ||
    !stockfish
  ) {
    return <div className="text-white"> Loading... </div>;
  }

  const isDisplayedBoardLatest =
    indexOfBoardToDisplay === (chess.algebraic?.length ?? 1) - 1;

  const latestBoardFEN = chess.history[indexOfBoardToDisplay];
  const boardToDisplay =
    !isDisplayedBoardLatest && latestBoardFEN
      ? latestBoardFEN.buildBoard()
      : chess.board;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] items-center justify-center 3xl:min-h-[calc(100vh-7rem)]">
      <div className="relative flex h-[33rem] flex-col items-center justify-center bg-neutral-900 md:h-[30rem] md:w-[50rem] md:flex-row lg:h-[40rem] lg:w-[60rem] 3xl:h-[60rem] 3xl:w-[90rem]">
        <div className="z-10 h-80 w-80  md:h-[30rem] md:w-[30rem] lg:h-[40rem] lg:w-[40rem] 3xl:h-[60rem] 3xl:w-[60rem]">
          {isGameFinished && chess.gameResult ? (
            <GameSummary
              user={opponentsData}
              gameResult={chess.gameResult}
              color={gameState.color}
              queueUpTimeControl={gameState.timeControl}
              rating={sessionData.user.rating}
            ></GameSummary>
          ) : (
            <Chessboard
              uuid={"play_bot"}
              color={gameState.color}
              isYourTurn={isYourTurn}
              chess={chess}
              board={boardToDisplay}
              locked={!isDisplayedBoardLatest}
              unlockFunction={setIndexOfBoardToDisplay}
              onMove={() => {
                setIsYourTurn(false);
                const move = chess.algebraic.at(-1)?.toLongNotationString();
                if (move) {
                  stockfish?.playResponseTo(move);
                }
              }}
            ></Chessboard>
          )}
        </div>

        <div className="absolute flex h-full w-full min-w-[15rem] max-w-xs  flex-col justify-center md:static md:m-0 md:w-1/3 md:max-w-md md:px-4 3xl:max-w-xl">
          <Timer
            className="h-16 w-full md:h-32 3xl:h-44 3xl:text-6xl"
            color={opponentsColor}
            initial={
              opponentsColor === "WHITE"
                ? gameState.whiteMilisLeft
                : gameState.blackMilisLeft
            }
            isLocked={isYourTurn || !!chess.gameResult}
            chessTimeoutFunc={(color: PlayerColor) => {
              chess.timeExpired(color);
              setIsGameFinished(true);
            }}
          ></Timer>

          <UserBanner
            className="h-10 w-full md:h-14 3xl:h-20  3xl:text-xl"
            user={opponentsData}
          ></UserBanner>

          <MovesHistory
            className="h-80 w-full md:h-full md:gap-0 md:text-xs lg:gap-0.5 lg:text-sm"
            chess={chess}
            index={indexOfBoardToDisplay}
            setIndex={setIndexOfBoardToDisplay}
          ></MovesHistory>

          <DrawResignPanel
            className="absolute bottom-0 right-0 z-10 flex w-1/2 min-w-min items-center justify-center text-xs md:static md:h-44 md:w-full md:text-base"
            isDrawOffered={showDrawResignPanel}
            uuid={"bot_game"}
            isUserDisconnected={false}
            isEnemyDisconnected={false}
            chessAbandonFunc={() => {
              chess.abandon(opponentsColor);
              setIsGameFinished(true);
            }}
          ></DrawResignPanel>

          <UserBanner
            className="h-10 w-full md:h-14 3xl:h-20 3xl:text-xl"
            user={sessionData.user}
          ></UserBanner>

          <Timer
            className="h-16 w-full md:h-32 3xl:h-44 3xl:text-6xl"
            color={gameState.color}
            initial={
              gameState.color === "WHITE"
                ? gameState.whiteMilisLeft
                : gameState.blackMilisLeft
            }
            isLocked={!isYourTurn || !!chess.gameResult}
            chessTimeoutFunc={(color: PlayerColor) => {
              chess.timeExpired(color);
              setIsGameFinished(true);
            }}
          ></Timer>
        </div>
      </div>
    </main>
  );
};

const PlayBotWithStockfish: NextPage = () => {
  return (
    <StockfishProvider>
      <PlayBot></PlayBot>
    </StockfishProvider>
  );
};

export default PlayBotWithStockfish;
