import { type NextPage } from "next";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { type Channel } from "pusher-js";
import { useEffect, useRef, useState } from "react";
import Chessboard from "~/components/chessboard";
import DrawResignPanel from "~/components/draw_resign_panel";
import GameSummary from "~/components/game_summary";
import MovesHistory from "~/components/moves_history";
import Timer from "~/components/timer";
import UserBanner from "~/components/user_banner";
import { usePusher } from "~/context/pusher_provider";
import { api } from "~/utils/api";
import Chess from "~/utils/chess";
import { Coords } from "~/utils/coords";
import {
  type PromotedPieceType,
  type PlayerColor,
  initBoard,
} from "~/utils/pieces";

const Play: NextPage = () => {
  const router = useRouter();
  const { uuid } = router.query;

  const { data: sessionData } = useSession();
  const channelRef = useRef<Channel>();
  const [subscribed, setSubscribed] = useState<boolean>(false);
  const [chess, setChess] = useState<Chess>(new Chess(initBoard()));
  const [isYourTurn, setIsYourTurn] = useState<boolean>(true);
  const gameStateFetchedRef = useRef<boolean>(false);
  const [showDrawResignPanel, setShowDrawResignPanel] =
    useState<boolean>(false);
  const [isUserDisconnected, setIsUserDisconnected] = useState<boolean>(false);
  const [isEnemyDisconnected, setIsEnemyDisconnected] =
    useState<boolean>(false);
  const [isGameFinished, setIsGameFinished] = useState<boolean>(false);
  const [indexOfBoardToDisplay, setIndexOfBoardToDisplay] = useState<number>(0);
  const pusherClient = usePusher();

  const {
    isLoading: isLoadingGameState,
    isError: isErrorGameState,
    data: gameState,
  } = api.chess.getGameState.useQuery(
    { uuid: uuid as string },
    {
      enabled: !!uuid,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  );

  const {
    isError: isErrorOpponentsData,
    isLoading: isLoadingOpponentsData,
    data: opponentsData,
  } = api.chess.getOpponentsData.useQuery(
    { uuid: uuid as string },
    {
      enabled: !!uuid,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  );

  const opponentsColor = gameState?.color === "WHITE" ? "BLACK" : "WHITE";

  useEffect(() => {
    if (gameState && !gameStateFetchedRef.current) {
      setChess(new Chess(gameState.board));
      setIsYourTurn(gameState.color === gameState.turn);
      gameStateFetchedRef.current = true;
    }
  }, [gameState]);

  useEffect(() => {
    if (!uuid || !pusherClient) {
      return;
    }

    pusherClient.subscribe(`presence-${uuid as string}`);
    channelRef.current = pusherClient.subscribe(uuid as string);

    channelRef.current.bind("resign", (data: { color: string }) => {
      chess.resign(data.color as PlayerColor);
      setIsGameFinished(true);
      setShowDrawResignPanel(false);
    });

    channelRef.current.bind("draw", () => {
      chess.drawAgreement();
      setIsGameFinished(true);
      setShowDrawResignPanel(false);
    });

    channelRef.current.bind("draw_offer", () => {
      setShowDrawResignPanel(true);
    });

    channelRef.current.bind("draw_refused", () => {
      setShowDrawResignPanel(false);
    });

    channelRef.current.bind(
      "pusher:subscription_count",
      ({ subscription_count }: { subscription_count: number }) => {
        setIsEnemyDisconnected(subscription_count < 2);
      }
    );

    pusherClient.connection.bind(
      "state_change",
      ({ current }: { previous: string; current: string }) => {
        if (current === "connecting" || current === "unavailable") {
          setIsUserDisconnected(true);
        } else if (current === "connected") {
          setIsUserDisconnected(false);
        }
      }
    );

    channelRef.current.bind(
      "move_made",
      (move: {
        fromTile: Coords;
        toTile: Coords;
        whiteTimeLeftinMilis: number;
        blackTimeLeftInMilis: number;
      }) => {
        try {
          const from = Coords.getInstance(move.fromTile.x, move.fromTile.y);
          const to = Coords.getInstance(move.toTile.x, move.toTile.y);
          if (!from || !to) {
            return;
          }

          chess.move(from, to, opponentsColor);

          if (chess.gameResult) {
            setTimeout(() => {
              setIsGameFinished(true);
            }, 1000);
          }

          if (chess.pawnReadyToPromote) {
            return;
          }

          setIsYourTurn(true);
          setIndexOfBoardToDisplay(chess.algebraic.length - 1);
        } catch (e) {
          console.log(e);
        }
      }
    );
    channelRef.current.bind(
      "promoted_piece",
      (promotion: {
        coords: { _x: number; _y: number };
        promotedTo: PromotedPieceType;
      }) => {
        try {
          const pawnCoords = Coords.getInstance(
            promotion.coords._x,
            promotion.coords._y
          );
          if (!pawnCoords) {
            return;
          }

          chess.promote(promotion.promotedTo, opponentsColor);
          if (chess.gameResult) {
            setTimeout(() => {
              setIsGameFinished(true);
            }, 1000);
          }

          setIsYourTurn(true);
          setIndexOfBoardToDisplay(chess.algebraic.length - 1);
        } catch (e) {
          console.log(e);
        }
      }
    );

    channelRef.current.bind("timeout", ({ loser }: { loser: PlayerColor }) => {
      chess.timeExpired(loser);
      setIsGameFinished(true);
    });
    setSubscribed(true);

    return () => {
      pusherClient.unsubscribe(`presence-${uuid as string}`);
      pusherClient.unsubscribe(uuid as string);
      setSubscribed(false);
    };
  }, [uuid, pusherClient, chess, opponentsColor]);

  useEffect(() => {
    if (!router.isReady || !uuid) {
      return;
    }

    const key = uuid as string;
    const data = sessionStorage.getItem(key);

    if (!data) {
      return;
    }

    chess.playOutFromLongAlgebraicString(data);
  }, [router.isReady, uuid, chess]);

  if (isErrorGameState || isErrorOpponentsData) {
    return (
      <div className="text-red-600"> An error occured. Please refresh. </div>
    );
  }

  if (
    isLoadingGameState ||
    isLoadingOpponentsData ||
    !subscribed ||
    !chess ||
    !sessionData?.user
  ) {
    return <div className="text-white"> Loading... </div>;
  }

  const gameSummaryRating =
    gameState.color === "WHITE" ? gameState.ratingWhite : gameState.ratingBlack;

  const isDisplayedBoardLatest =
    indexOfBoardToDisplay === (chess.algebraic.length ?? 1) - 1;

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
              rating={gameSummaryRating}
              ranked
            ></GameSummary>
          ) : (
            <Chessboard
              uuid={uuid as string}
              color={gameState.color}
              isYourTurn={isYourTurn}
              chess={chess}
              board={boardToDisplay}
              locked={!isDisplayedBoardLatest}
              unlockFunction={() =>
                setIndexOfBoardToDisplay(chess.algebraic.length - 1)
              }
              lastMovedFrom={chess.lastMoveFrom}
              lastMovedTo={chess.lastMoveTo}
              mutate
              onMove={() => {
                setIndexOfBoardToDisplay(chess.algebraic.length - 1);
                setIsYourTurn(false);
              }}
            ></Chessboard>
          )}
        </div>

        <div className="absolute flex h-full w-full min-w-[15rem] max-w-xs  flex-col justify-center md:static md:m-0 md:w-1/3 md:max-w-md md:px-4 3xl:max-w-xl">
          <Timer
            className="h-16 w-full md:h-32 3xl:h-44 3xl:text-6xl"
            channel={channelRef.current}
            color={opponentsColor}
            initial={
              opponentsColor === "WHITE"
                ? gameState.whiteMilisLeft / 1000
                : gameState.blackMilisLeft / 1000
            }
            increment={gameState.timeControl.increment}
            isLocked={isYourTurn}
            isGameFinished={!!chess.gameResult}
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
            uuid={uuid as string}
            isUserDisconnected={isUserDisconnected}
            isEnemyDisconnected={isEnemyDisconnected}
            onAbandon={() => {
              chess.abandon(opponentsColor);
              setIsGameFinished(true);
            }}
            mutate
          ></DrawResignPanel>

          <UserBanner
            className="h-10 w-full md:h-14 3xl:h-20 3xl:text-xl"
            user={sessionData.user}
          ></UserBanner>

          <Timer
            className="h-16 w-full md:h-32 3xl:h-44 3xl:text-6xl"
            channel={channelRef.current}
            color={gameState.color}
            initial={
              gameState.color === "WHITE"
                ? gameState.whiteMilisLeft / 1000
                : gameState.blackMilisLeft / 1000
            }
            increment={gameState.timeControl.increment}
            isLocked={!isYourTurn}
            isGameFinished={!!chess.gameResult}
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

export default Play;
