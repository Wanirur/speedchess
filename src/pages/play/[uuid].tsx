/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { type NextPage } from "next";
import { type User } from "next-auth";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { type Channel } from "pusher-js";
import { useEffect, useRef, useState } from "react";
import Chessgame, { type ChessgameForMatch } from "~/chess/game";
import { CombinedStrategies, SimpleHistory } from "~/chess/history";
import type ChessPosition from "~/chess/position";
import Chessboard from "~/components/chessboard";
import DrawResignPanel from "~/components/draw_resign_panel";
import GameSummary from "~/components/game_summary";
import MovesHistory from "~/components/moves_history";
import Timer from "~/components/timer";
import UserBanner from "~/components/user_banner";
import { usePusher } from "~/context/pusher_provider";
import { api } from "~/utils/api";
import { Coords } from "~/utils/coords";
import { FEN, type AlgebraicNotation } from "~/utils/notations";
import {
  type PromotedPieceType,
  type PlayerColor,
  type GameResult,
  type TimeControl,
  oppositeColor,
} from "~/utils/pieces";
import useGuestSession from "~/utils/use_guest";

type SessionStorageData = {
  moves: string;
  result: GameResult;
  opponent: User;
  player: User;
  color: PlayerColor;
  timeControl: TimeControl;
};

const Play: NextPage = () => {
  const router = useRouter();
  const { uuid } = router.query;

  const { data: sessionData } = useSession();
  const { user: guest } = useGuestSession();

  const channelRef = useRef<Channel>();
  const [subscribed, setSubscribed] = useState<boolean>(false);

  const [chess, setChess] = useState<ChessgameForMatch>(
    new Chessgame(
      new CombinedStrategies(
        new SimpleHistory<AlgebraicNotation>(),
        new SimpleHistory<ChessPosition>()
      )
    )
  );

  const [isYourTurn, setIsYourTurn] = useState<boolean>(true);
  const [storageData, setStorageData] = useState<SessionStorageData | null>();
  const gameStateFetchedRef = useRef<boolean>(false);
  const storageCheckedRef = useRef<boolean>(false);
  const [showDrawResignPanel, setShowDrawResignPanel] =
    useState<boolean>(false);
  const [isUserDisconnected, setIsUserDisconnected] = useState<boolean>(false);
  const [isEnemyDisconnected, setIsEnemyDisconnected] =
    useState<boolean>(false);
  const [isGameFinished, setIsGameFinished] = useState<boolean>(false);
  const [indexOfBoardToDisplay, setIndexOfBoardToDisplay] = useState<number>(0);
  const pusherClient = usePusher();
  const trpcContext = api.useContext();

  const {
    isInitialLoading: isLoadingGameState,
    isError: isErrorGameState,
    data: gameState,
  } = api.chess.getGameState.useQuery(
    { uuid: uuid as string },
    {
      enabled: !!uuid && storageData === null,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  );

  const {
    isError: isErrorOpponentsData,
    isInitialLoading: isLoadingOpponentsData,
    data: opponentsData,
  } = api.chess.getOpponentsData.useQuery(
    { uuid: uuid as string },
    {
      enabled: !!uuid && storageData === null,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  );

  const opponentsColor = oppositeColor(gameState?.color ?? "WHITE");

  useEffect(() => {
    if (gameState && !gameStateFetchedRef.current && storageData === null) {
      const newGame = new Chessgame(
        new CombinedStrategies(
          new SimpleHistory<AlgebraicNotation>(),
          new SimpleHistory<ChessPosition>()
        )
      );
      newGame.playOutFromMoves(gameState.moves);
      setChess(newGame);
      setIsYourTurn(gameState.color === gameState.turn);
      setIndexOfBoardToDisplay(newGame.movesPlayed - 1);
      gameStateFetchedRef.current = true;
    }
  }, [gameState, storageData, chess]);

  useEffect(() => {
    if (!uuid || !pusherClient || storageData !== null) {
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

          chess.move(from, to);

          if (chess.gameResult) {
            setTimeout(() => {
              setIsGameFinished(true);
            }, 1000);
          }

          if (chess.position.pawnReadyToPromote) {
            return;
          }

          setIsYourTurn(true);
          setIndexOfBoardToDisplay(chess.movesPlayed - 1);
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

          chess.promote(promotion.promotedTo);
          if (chess.gameResult) {
            setTimeout(() => {
              setIsGameFinished(true);
            }, 1000);
          }

          setIsYourTurn(true);
          setIndexOfBoardToDisplay(chess.movesPlayed - 1);
        } catch (e) {
          console.log(e);
        }
      }
    );

    channelRef.current.bind("timeout", ({ loser }: { loser: PlayerColor }) => {
      chess.timeout(loser);
      setIsGameFinished(true);
    });
    setSubscribed(true);

    return () => {
      pusherClient.unsubscribe(`presence-${uuid as string}`);
      pusherClient.unsubscribe(uuid as string);
      setSubscribed(false);
    };
  }, [uuid, pusherClient, chess, opponentsColor, storageData]);

  useEffect(() => {
    if (!router.isReady || !uuid || storageCheckedRef.current) {
      return;
    }

    const key = uuid as string;
    const data = sessionStorage.getItem(key);
    storageCheckedRef.current = true;
    if (!data) {
      setStorageData(null);
      return;
    }

    const parsedData = JSON.parse(data) as SessionStorageData;
    console.log(parsedData);
    setStorageData(parsedData);

    chess.playOutFromMoves(parsedData.moves, parsedData.result);
    setIsGameFinished(true);
    trpcContext.chess.getGameState.setData(
      { uuid: uuid as string },
      {
        moves: "",
        whiteMilisLeft: parsedData.timeControl.initialTime * 1000,
        blackMilisLeft: parsedData.timeControl.initialTime * 1000,
        ratingWhite:
          parsedData.color === "WHITE"
            ? parsedData.player.rating
            : parsedData.opponent.rating,
        ratingBlack:
          parsedData.color === "WHITE"
            ? parsedData.opponent.rating
            : parsedData.player.rating,
        color: parsedData.color,
        turn: "WHITE",
        timeControl: parsedData.timeControl,
      }
    );
    trpcContext.chess.getOpponentsData.setData(
      { uuid: uuid as string },
      {
        rating: parsedData.opponent.rating,
        id: parsedData.opponent.id,
        name: parsedData.opponent.name ?? "unknown",
        image: parsedData.opponent.image ?? null,
      }
    );
  }, [
    router.isReady,
    uuid,
    chess,
    trpcContext.chess.getGameState,
    trpcContext.chess.getOpponentsData,
    gameState,
    opponentsData,
  ]);

  useEffect(() => {
    if (
      !isGameFinished ||
      !gameState ||
      (!sessionData && !guest) ||
      storageData !== null
    ) {
      return;
    }

    const key = uuid as string;
    const data = {
      moves: chess.history.notation.moves
        .map((moveData) =>
          (moveData.move as AlgebraicNotation).toLongNotationString()
        )
        .join(" "),
      result: chess.gameResult,
      opponent: opponentsData,
      player: sessionData?.user ?? guest,
      color: gameState.color,
      timeControl: gameState.timeControl,
    } as SessionStorageData;

    sessionStorage.setItem(key, JSON.stringify(data));
  }, [
    chess,
    gameState,
    isGameFinished,
    opponentsData,
    sessionData,
    uuid,
    storageData,
    guest,
  ]);

  if (
    isErrorGameState ||
    isErrorOpponentsData ||
    (!sessionData?.user && !guest)
  ) {
    return (
      <div className="text-red-600"> An error occured. Please refresh. </div>
    );
  }

  if (
    storageData === undefined ||
    isLoadingGameState ||
    !gameState ||
    isLoadingOpponentsData ||
    !opponentsData ||
    (storageData === null && !subscribed) ||
    !chess ||
    !(sessionData?.user || guest)
  ) {
    return <div className="text-white"> Loading... </div>;
  }

  const gameSummaryRating =
    gameState?.color === "WHITE"
      ? gameState?.ratingWhite
      : gameState?.ratingBlack;

  const isDisplayedBoardLatest =
    indexOfBoardToDisplay === chess.movesPlayed - 1;

  const latestBoardFEN =
    chess.history.position.lastMove()?.fen ?? FEN.startingPosition();
  const boardToDisplay =
    !isDisplayedBoardLatest && latestBoardFEN
      ? latestBoardFEN.buildBoard()
      : chess.position.board;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] items-center justify-center 3xl:min-h-[calc(100vh-7rem)]">
      <div className="relative flex h-[33rem] flex-col items-center justify-center bg-neutral-900 md:h-[30rem] md:w-[50rem] md:flex-row lg:h-[40rem] lg:w-[60rem] 3xl:h-[60rem] 3xl:w-[90rem]">
        <div className="z-10 h-80 w-80  md:h-[30rem] md:w-[30rem] lg:h-[40rem] lg:w-[40rem] 3xl:h-[60rem] 3xl:w-[60rem]">
          {isGameFinished && chess.gameResult ? (
            <GameSummary
              opponent={opponentsData}
              gameResult={chess.gameResult}
              color={gameState.color}
              queueUpTimeControl={gameState.timeControl}
              rating={gameSummaryRating}
              enemyRating={opponentsData.rating}
              ranked={!!sessionData?.user}
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
                setIndexOfBoardToDisplay(chess.movesPlayed - 1)
              }
              lastMovedFrom={chess.lastMovedFrom}
              lastMovedTo={chess.lastMovedTo}
              mutate
              onMove={() => {
                setIndexOfBoardToDisplay(chess.movesPlayed - 1);
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
              storageData?.timeControl.initialTime ?? opponentsColor === "WHITE"
                ? (gameState?.whiteMilisLeft ?? 10000) / 1000
                : (gameState?.blackMilisLeft ?? 10000) / 1000
            }
            increment={
              storageData?.timeControl.increment ??
              gameState.timeControl.increment
            }
            isLocked={isYourTurn}
            isGameFinished={!!chess.gameResult}
            chessTimeoutFunc={(color: PlayerColor) => {
              chess.timeout(color);
              setIsGameFinished(true);
            }}
          ></Timer>

          <UserBanner
            className="h-10 w-full md:h-14 3xl:h-20  3xl:text-xl"
            user={opponentsData}
            isGuest={!sessionData?.user && !!guest}
          ></UserBanner>

          <MovesHistory
            className="h-80 w-full md:h-full md:gap-0 md:text-xs lg:gap-0.5 lg:text-sm"
            history={chess.history}
            index={indexOfBoardToDisplay}
            onIndexChange={(index) => setIndexOfBoardToDisplay(index)}
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
            user={storageData?.player ?? sessionData?.user ?? guest!}
            isGuest={!sessionData?.user && !!guest}
          ></UserBanner>

          <Timer
            className="h-16 w-full md:h-32 3xl:h-44 3xl:text-6xl"
            channel={channelRef.current}
            color={gameState.color}
            initial={
              gameState.color === "WHITE"
                ? (gameState?.whiteMilisLeft ?? 10000) / 1000
                : (gameState?.blackMilisLeft ?? 10000) / 1000
            }
            increment={gameState.timeControl.increment}
            isLocked={!isYourTurn}
            isGameFinished={!!chess.gameResult}
            chessTimeoutFunc={(color: PlayerColor) => {
              chess.timeout(color);
              setIsGameFinished(true);
            }}
          ></Timer>
        </div>
      </div>
    </main>
  );
};

export default Play;
