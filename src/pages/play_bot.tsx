import { type PlayerColor } from "@prisma/client";
import { type NextPage } from "next";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useState, useEffect, useRef } from "react";
import Chessboard from "~/components/chessboard";
import DrawResignPanel from "~/components/draw_resign_panel";
import GameSummary from "~/components/game_summary";
import MovesHistory from "~/components/moves_history";
import Timer from "~/components/timer";
import UserBanner from "~/components/user_banner";
import StockfishProvider, { useStockfish } from "~/context/stockfish_provider";
import Chess from "~/utils/chess";
import { type Coords } from "~/utils/coords";
import {
  type TimeControl,
  initBoard,
  type PromotedPieceType,
} from "~/utils/pieces";

const PlayBot: React.FC = () => {
  const router = useRouter();
  const { color, time, increment } = router.query;

  const [chess, setChess] = useState<Chess>(new Chess(initBoard()));
  const stockfishInitialized = useRef<boolean>(false);
  const [gameState, setGameState] = useState<
    | {
        timeControl: TimeControl;
        color: PlayerColor;
        turn: PlayerColor;
      }
    | undefined
  >();

  const { data: sessionData } = useSession();

  const { isError, stockfish } = useStockfish();

  const [opponentsData, setOpponentsData] = useState<{
    id: string;
    name: string;
    rating: number;
  }>({ id: "bot", name: "stockfish", rating: 1200 });
  const [opponentsColor, setOpponentsColor] = useState<
    PlayerColor | undefined
  >();

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const playerColor = (color as string).toUpperCase() as PlayerColor;
    setGameState({
      timeControl: {
        initialTime: +(time as string) * 60,
        increment: +(increment as string),
      },
      color: playerColor,
      turn: "WHITE",
    });

    setOpponentsColor(playerColor === "WHITE" ? "BLACK" : "WHITE");
    setIsYourTurn(playerColor === "WHITE");
  }, [router.isReady, color, increment, time]);

  useEffect(() => {
    if (
      stockfishInitialized.current ||
      !stockfish ||
      !sessionData ||
      !gameState ||
      !opponentsColor
    ) {
      return;
    }

    stockfish.setStrength(Math.round(sessionData.user.rating / 100) * 100);
    setOpponentsData((old) => ({ ...old, rating: stockfish.rating }));

    stockfish.playMode();
    stockfishInitialized.current = true;

    if (opponentsColor === "WHITE") {
      stockfish.playResponseTo("");
    }
  }, [stockfish, sessionData, gameState, opponentsColor]);

  useEffect(() => {
    if (!stockfish || !chess || !opponentsColor) {
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

      if (chess.gameResult) {
        setTimeout(() => {
          setIsGameFinished(true);
        }, 1000);
      }

      setIsYourTurn(true);
      setIndexOfBoardToDisplay(chess.algebraic.length - 1);
    };

    const onPromote = ({ promotedTo }: { promotedTo: PromotedPieceType }) => {
      try {
        chess.promote(promotedTo, opponentsColor);
      } catch (e) {
        if (e instanceof Error) {
          console.log(e);
        }
      }

      if (chess.gameResult) {
        setTimeout(() => {
          setIsGameFinished(true);
        }, 1000);
      }
    };

    const onDraw = () => {
      chess.drawAgreement();
      setIsGameFinished(true);
    };

    const onDrawRefuse = () => {
      setShowDrawResignPanel(false);
    };

    stockfish.bind("move_made", onMove);
    stockfish.bind("piece_promoted", onPromote);
    stockfish.bind("draw_accepted", onDraw);
    stockfish.bind("draw_refused", onDrawRefuse);

    return () => {
      stockfish.unbind("move_made", onMove);
      stockfish.unbind("piece_promoted", onPromote);
      stockfish.unbind("draw_accepted", onDraw);
      stockfish.unbind("draw_refused", onDrawRefuse);
    };
  }, [stockfish, chess, opponentsColor]);

  const [showDrawResignPanel, setShowDrawResignPanel] =
    useState<boolean>(false);

  const [isGameFinished, setIsGameFinished] = useState<boolean>(false);
  const [indexOfBoardToDisplay, setIndexOfBoardToDisplay] = useState<number>(0);

  const [isYourTurn, setIsYourTurn] = useState<boolean>(
    gameState?.color === gameState?.turn
  );

  if (isError) {
    return <div className="text-red"> error </div>;
  }

  if (
    !chess ||
    !sessionData ||
    !opponentsColor ||
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
                setIndexOfBoardToDisplay(chess.algebraic.length - 1);

                if (chess.gameResult) {
                  setTimeout(() => {
                    setIsGameFinished(true);
                  }, 1000);

                  return;
                }

                const move = chess.algebraic.at(-1)?.toLongNotationString();
                if (move) {
                  stockfish.playResponseTo(move);
                }
              }}
            ></Chessboard>
          )}
        </div>

        <div className="absolute flex h-full w-full min-w-[15rem] max-w-xs  flex-col justify-center md:static md:m-0 md:w-1/3 md:max-w-md md:px-4 3xl:max-w-xl">
          <Timer
            className="h-16 w-full md:h-32 3xl:h-44 3xl:text-6xl"
            color={opponentsColor}
            initial={gameState.timeControl.initialTime * 1000}
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
            onAbandon={() => {
              chess.abandon(opponentsColor);
              setIsGameFinished(true);
            }}
            onResign={() => {
              chess.resign(gameState.color);
              setIsGameFinished(true);
            }}
            onDrawOffer={() => {
              stockfish.offerDraw();
            }}
          ></DrawResignPanel>

          <UserBanner
            className="h-10 w-full md:h-14 3xl:h-20 3xl:text-xl"
            user={sessionData.user}
          ></UserBanner>

          <Timer
            className="h-16 w-full md:h-32 3xl:h-44 3xl:text-6xl"
            color={gameState.color}
            initial={gameState.timeControl.initialTime * 1000}
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
