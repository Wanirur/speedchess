import { type PlayerColor } from "@prisma/client";
import { type NextPage } from "next";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useState, useEffect, useRef, useCallback } from "react";
import Chessgame, { type ChessgameForMatch } from "~/chess/chessgame";
import { CombinedStrategies, SimpleHistory } from "~/chess/history";
import type ChessPosition from "~/chess/position";
import Chessboard from "~/components/chessboard";
import DrawResignPanel from "~/components/draw_resign_panel";
import GameSummary from "~/components/game_summary";
import MovesHistory from "~/components/moves_history";
import Timer from "~/components/timer";
import UserBanner from "~/components/user_banner";
import StockfishProvider, { useStockfish } from "~/context/stockfish_provider";
import { type Coords } from "~/utils/coords";
import { type AlgebraicNotation } from "~/utils/notations";
import { type TimeControl, type PromotedPieceType } from "~/chess/utils";
import useGuestSession from "~/utils/use_guest";
import Layout from "~/components/layout";
import ErrorDisplay from "~/components/error";
import LoadingDisplay from "~/components/loading";

const toLongNotation = (chess: ChessgameForMatch) => {
  const algebraic = chess.history.notation.moves;
  const longNotationStrings = algebraic.map((moveData) =>
    (moveData.move as AlgebraicNotation).toLongNotationString()
  );

  return longNotationStrings.join(" ");
};

const PlayBot: React.FC = () => {
  const router = useRouter();
  const { color, time, increment } = router.query;

  //fix hydration errors
  const [isClient, setIsClient] = useState<boolean>(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const [chess, setChess] = useState<ChessgameForMatch>(
    new Chessgame(
      new CombinedStrategies(
        new SimpleHistory<AlgebraicNotation>(),
        new SimpleHistory<ChessPosition>()
      )
    )
  );
  const isStockfishInitialized = useRef<boolean>(false);
  const [gameState, setGameState] = useState<
    | {
        timeControl: TimeControl;
        color: PlayerColor;
        turn: PlayerColor;
        whiteTimeLeft: number;
        blackTimeLeft: number;
      }
    | undefined
  >();

  const { data: sessionData, status } = useSession();
  const { user: guest, isLoading: isGuestSessionLoading } = useGuestSession();
  const { isError: hasStockishFailedToLoad, stockfish } = useStockfish();

  const storageCleanupFunction = useCallback(() => {
    sessionStorage.removeItem("white_time");
    sessionStorage.removeItem("black_time");
    sessionStorage.removeItem("game");
  }, []);

  const [opponentsData, setOpponentsData] = useState<{
    id: string;
    name: string;
    rating: number;
  }>({ id: "bot", name: "stockfish", rating: 1200 });
  const [opponentsColor, setOpponentsColor] = useState<
    PlayerColor | undefined
  >();

  const [showDrawResignPanel, setShowDrawResignPanel] =
    useState<boolean>(false);

  const [isGameFinished, setIsGameFinished] = useState<boolean>(false);
  const [indexOfBoardToDisplay, setIndexOfBoardToDisplay] = useState<number>(0);

  const [isYourTurn, setIsYourTurn] = useState<boolean>(
    gameState?.color === gameState?.turn
  );
  useEffect(() => {
    if (!chess || !stockfish) {
      return;
    }

    const game = sessionStorage.getItem("game");
    if (!game) {
      return;
    }

    chess.playOutFromMoves(game);
    setIndexOfBoardToDisplay(chess.movesPlayed - 1);
    stockfish.gameMoves = game.split(" ");

    return () => {
      setChess(
        new Chessgame(
          new CombinedStrategies(
            new SimpleHistory<AlgebraicNotation>(),
            new SimpleHistory<ChessPosition>()
          )
        )
      );
      stockfish.gameMoves = [];
    };
  }, [chess, stockfish]);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const timeControl = {
      initialTime: +(time as string) * 60,
      increment: +(increment as string),
    };
    const playerColor = (color as string).toUpperCase() as PlayerColor;
    const whiteTimeString = sessionStorage.getItem("white_time");
    const whiteTime = whiteTimeString
      ? +whiteTimeString
      : timeControl.initialTime;
    const blackTimeString = sessionStorage.getItem("black_time");
    const blackTime = blackTimeString
      ? +blackTimeString
      : timeControl.initialTime;

    const game = sessionStorage.getItem("game");
    const moves = game?.split(" ");

    //if moves is undefined it still correctly assigns turn as white, not an overlook
    const turn = (moves?.length ?? 0) % 2 === 1 ? "BLACK" : "WHITE";
    setGameState({
      timeControl: timeControl,
      color: playerColor,
      turn: turn,
      whiteTimeLeft: whiteTime,
      blackTimeLeft: blackTime,
    });

    setOpponentsColor(playerColor === "WHITE" ? "BLACK" : "WHITE");
    setIsYourTurn(playerColor === turn);
  }, [router.isReady, color, increment, time]);

  useEffect(() => {
    if (
      isStockfishInitialized.current ||
      !stockfish ||
      !(sessionData || guest) ||
      !gameState
    ) {
      return;
    }

    stockfish.setStrength(
      Math.round((sessionData?.user.rating ?? guest!.rating) / 100) * 100
    );
    setOpponentsData((old) => ({ ...old, rating: stockfish.rating }));

    stockfish.playMode(gameState.timeControl);
    isStockfishInitialized.current = true;

    if (!isYourTurn) {
      stockfish.playResponseTo("");
    }
  }, [stockfish, sessionData, gameState, isYourTurn, guest]);

  useEffect(() => {
    if (!stockfish || !chess || !opponentsColor) {
      return;
    }

    const onMove = ({ from, to }: { from: Coords; to: Coords }) => {
      try {
        chess.move(from, to);
      } catch (e) {
        if (e instanceof Error) {
          console.log(e);
        }
        return;
      }

      if (chess.gameResult) {
        setTimeout(() => {
          setIsGameFinished(true);
          storageCleanupFunction();
        }, 1000);
        return;
      }

      if (chess.position.pawnReadyToPromote) {
        return;
      }
      setIsYourTurn(true);
      setIndexOfBoardToDisplay(chess.movesPlayed - 1);

      sessionStorage.setItem("game", toLongNotation(chess));
    };

    const onPromote = ({ promotedTo }: { promotedTo: PromotedPieceType }) => {
      try {
        chess.promote(promotedTo);
      } catch (e) {
        if (e instanceof Error) {
          console.log(e);
          return;
        }
      }

      if (chess.gameResult) {
        setTimeout(() => {
          setIsGameFinished(true);
          storageCleanupFunction();
        }, 1000);
        return;
      }

      sessionStorage.setItem("game", toLongNotation(chess));

      setIsYourTurn(true);
      setIndexOfBoardToDisplay(chess.movesPlayed - 1);
    };

    const onDraw = () => {
      chess.drawAgreement();
      setIsGameFinished(true);
      storageCleanupFunction();
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
  }, [stockfish, chess, opponentsColor, storageCleanupFunction]);

  if (
    isClient &&
    (hasStockishFailedToLoad ||
      (!sessionData &&
        status !== "loading" &&
        !guest &&
        !isGuestSessionLoading))
  ) {
    return (
      <Layout title="Error - speedchess.net">
        <ErrorDisplay></ErrorDisplay>
      </Layout>
    );
  }

  if (
    !chess ||
    !(sessionData || guest) ||
    !opponentsColor ||
    !gameState ||
    !opponentsData ||
    !stockfish
  ) {
    return (
      <Layout title="Loading - speedchess.net">
        <LoadingDisplay></LoadingDisplay>
      </Layout>
    );
  }

  const isDisplayedBoardLatest =
    indexOfBoardToDisplay === chess.movesPlayed - 1;

  const boardToDisplay =
    chess.history.position.getMove(indexOfBoardToDisplay)?.board ??
    chess.position.board;

  return (
    <Layout title="Playing bot - speedchess.net">
      <div className="relative flex h-[33rem] flex-col items-center justify-center bg-neutral-900 md:h-[30rem] md:w-[50rem] md:flex-row lg:h-[40rem] lg:w-[60rem] 3xl:h-[60rem] 3xl:w-[90rem]">
        <div className="z-10 h-80 w-80  md:h-[30rem] md:w-[30rem] lg:h-[40rem] lg:w-[40rem] 3xl:h-[60rem] 3xl:w-[60rem]">
          {isGameFinished && chess.gameResult ? (
            <GameSummary
              opponent={opponentsData}
              gameResult={chess.gameResult}
              color={gameState.color}
              queueUpTimeControl={gameState.timeControl}
              rating={sessionData?.user.rating ?? guest!.rating}
              enemyRating={stockfish.rating}
            ></GameSummary>
          ) : (
            <Chessboard
              uuid={"play_bot"}
              color={gameState.color}
              isYourTurn={isYourTurn}
              chess={chess}
              board={boardToDisplay}
              locked={!isDisplayedBoardLatest}
              unlockFunction={() =>
                setIndexOfBoardToDisplay(chess.movesPlayed - 1)
              }
              lastMovedFrom={chess.lastMovedFrom}
              lastMovedTo={chess.lastMovedTo}
              onMove={() => {
                setIsYourTurn(false);
                setIndexOfBoardToDisplay(chess.movesPlayed - 1);

                if (chess.gameResult) {
                  setTimeout(() => {
                    setIsGameFinished(true);
                    storageCleanupFunction();
                  }, 1000);

                  return;
                }

                sessionStorage.setItem("game", toLongNotation(chess));
                const move = chess.history.notation
                  .lastMove()!
                  .toLongNotationString();

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
            initial={
              opponentsColor === "WHITE"
                ? gameState.whiteTimeLeft
                : gameState.blackTimeLeft
            }
            increment={gameState.timeControl.increment}
            isLocked={isYourTurn}
            isGameFinished={!!chess.gameResult}
            chessTimeoutFunc={(color: PlayerColor) => {
              chess.timeout(color);
              setIsGameFinished(true);
              storageCleanupFunction();
            }}
            onTimeChange={(secondsLeft: number) => {
              const key =
                gameState.color === "WHITE" ? "black_time" : "white_time";
              sessionStorage.setItem(key, secondsLeft.toString());
            }}
          ></Timer>

          <UserBanner
            className="h-10 w-full md:h-14 3xl:h-20  3xl:text-xl"
            user={opponentsData}
          ></UserBanner>

          <MovesHistory
            className="h-80 w-full md:h-full md:gap-0 md:text-xs lg:gap-0.5 lg:text-sm"
            history={chess.history}
            index={indexOfBoardToDisplay}
            onIndexChange={(index) => setIndexOfBoardToDisplay(index)}
            gameResult={chess.gameResult}
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
              storageCleanupFunction();
            }}
            onResign={() => {
              chess.resign(gameState.color);
              setIsGameFinished(true);
              storageCleanupFunction();
            }}
            onDrawOffer={() => {
              stockfish.offerDraw();
            }}
          ></DrawResignPanel>

          <UserBanner
            className="h-10 w-full md:h-14 3xl:h-20 3xl:text-xl"
            user={sessionData?.user ?? guest!}
            isGuest={!!guest}
          ></UserBanner>

          <Timer
            className="h-16 w-full md:h-32 3xl:h-44 3xl:text-6xl"
            color={gameState.color}
            initial={
              gameState.color === "WHITE"
                ? gameState.whiteTimeLeft
                : gameState.blackTimeLeft
            }
            increment={gameState.timeControl.increment}
            isLocked={!isYourTurn}
            isGameFinished={!!chess.gameResult}
            chessTimeoutFunc={(color: PlayerColor) => {
              chess.timeout(color);
              setIsGameFinished(true);
              storageCleanupFunction();
            }}
            onTimeChange={(secondsLeft: number) => {
              const key =
                gameState.color === "WHITE" ? "white_time" : "black_time";
              sessionStorage.setItem(key, secondsLeft.toString());
            }}
          ></Timer>
        </div>
      </div>
    </Layout>
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
