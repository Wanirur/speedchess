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
  copyBoard,
  type PlayerColor,
} from "~/utils/pieces";

const Play: NextPage = () => {
  const router = useRouter();
  const { uuid } = router.query;

  const { data: sessionData } = useSession();
  const channelRef = useRef<Channel>();
  const chessRef = useRef<Chess>();
  const [subscribed, setSubscribed] = useState<boolean>(false);
  const [showDrawResignPanel, setShowDrawResignPanel] =
    useState<boolean>(false);
  const [isUserDisconnected, setIsUserDisconnected] = useState<boolean>(false);
  const [isEnemyDisconnected, setIsEnemyDisconnected] =
    useState<boolean>(false);
  const [isGameFinished, setIsGameFinished] = useState<boolean>(false);
  const [indexOfBoardToDisplay, setIndexOfBoardToDisplay] = useState<number>(0);
  const pusherClient = usePusher();
  const utils = api.useContext();

  const {
    isSuccess: isSuccessGameState,
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
      onSuccess: ({ board }) => {
        const onMove = (move: {
          fromTile: Coords;
          toTile: Coords;
          timeLeftinMilis: number;
        }) => {
          try {
            const from = Coords.getInstance(move.fromTile.x, move.fromTile.y);
            const to = Coords.getInstance(move.toTile.x, move.toTile.y);
            if (!from || !to) {
              return;
            }

            utils.chess.getGameState.setData(
              { uuid: uuid as string },
              (old) => {
                if (!old || !chessRef.current?.board) {
                  return old;
                }

                if (old.turn === old.color) {
                  if (chessRef.current.gameResult) {
                    setTimeout(() => {
                      setIsGameFinished(true);
                    }, 1000);
                  }
                  let nextTurn = old.turn;
                  if (!chessRef.current.pawnReadyToPromote) {
                    nextTurn = nextTurn === "WHITE" ? "BLACK" : "WHITE";
                  }

                  return {
                    ...old,
                    turn: nextTurn,
                  };
                }

                const newBoard = copyBoard(
                  chessRef.current.move(from, to, old.turn)
                );

                if (chessRef.current.gameResult) {
                  setTimeout(() => {
                    setIsGameFinished(true);
                  }, 1000);
                }

                let nextTurn = old.turn;
                if (!chessRef.current.pawnReadyToPromote) {
                  nextTurn = nextTurn === "WHITE" ? "BLACK" : "WHITE";
                }
                setIndexOfBoardToDisplay(chessRef.current.algebraic.length - 1);
                return {
                  ...old,
                  board: newBoard,
                  turn: nextTurn,
                };
              }
            );
          } catch (e) {
            console.log(e);
          }
        };
        const onPromotion = (promotion: {
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
            utils.chess.getGameState.setData(
              { uuid: uuid as string },
              (old) => {
                if (!old || !chessRef.current?.board) {
                  return old;
                }

                if (old.turn === old.color) {
                  if (chessRef.current.gameResult) {
                    setTimeout(() => {
                      setIsGameFinished(true);
                    }, 1000);
                  }
                  return {
                    ...old,
                    turn: old.turn === "WHITE" ? "BLACK" : "WHITE",
                  };
                }

                const newBoard = copyBoard(
                  chessRef.current.promote(promotion.promotedTo, old.turn)
                );
                if (chessRef.current.gameResult) {
                  setTimeout(() => {
                    setIsGameFinished(true);
                  }, 1000);
                }
                return {
                  ...old,
                  board: newBoard,
                  turn: old.turn === "WHITE" ? "BLACK" : "WHITE",
                };
              }
            );
          } catch (e) {
            console.log(e);
          }
        };

        channelRef.current?.bind("move_made", onMove);
        channelRef.current?.bind("promoted_piece", onPromotion);
        chessRef.current = new Chess(board);
        console.log(chessRef.current);
      },
    }
  );

  const {
    isSuccess: isSuccessOpponentsData,
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

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    pusherClient?.subscribe(`presence-${uuid as string}`);
    channelRef.current = pusherClient?.subscribe(uuid as string);

    channelRef.current?.bind("resign", (data: { color: string }) => {
      chessRef.current?.resign(data.color as PlayerColor);
      setIsGameFinished(true);
      setShowDrawResignPanel(false);
    });

    channelRef.current?.bind("draw", () => {
      chessRef.current?.drawAgreement();
      setIsGameFinished(true);
      setShowDrawResignPanel(false);
    });

    channelRef.current?.bind("draw_offer", () => {
      setShowDrawResignPanel(true);
    });

    channelRef.current?.bind("draw_refused", () => {
      setShowDrawResignPanel(false);
    });

    channelRef.current?.bind(
      "pusher:subscription_count",
      ({ subscription_count }: { subscription_count: number }) => {
        setIsEnemyDisconnected(subscription_count < 2);
      }
    );

    pusherClient?.connection.bind(
      "state_change",
      ({ current }: { previous: string; current: string }) => {
        if (current === "connecting" || current === "unavailable") {
          setIsUserDisconnected(true);
        } else if (current === "connected") {
          setIsUserDisconnected(false);
        }
      }
    );

    setSubscribed(true);

    return () => {
      pusherClient.unsubscribe(`presence-${uuid as string}`);
      pusherClient.unsubscribe(uuid as string);
    };
  }, [router.isReady, uuid, pusherClient]);

  if (isErrorGameState || !channelRef?.current || isErrorOpponentsData) {
    return (
      <div className="text-red-600"> An error occured. Please refresh. </div>
    );
  }

  if (
    isLoadingGameState ||
    isLoadingOpponentsData ||
    !subscribed ||
    !chessRef.current ||
    !sessionData?.user ||
    !(isSuccessGameState && isSuccessOpponentsData)
  ) {
    return <div className="text-white"> Loading... </div>;
  }

  const gameSummaryRating =
    gameState.color === "WHITE" ? gameState.ratingWhite : gameState.ratingBlack;

  const opponentsColor = gameState.color === "WHITE" ? "BLACK" : "WHITE";

  const isDisplayedBoardLatest =
    indexOfBoardToDisplay === (chessRef.current?.algebraic?.length ?? 1) - 1;

  const latestBoardFEN = chessRef.current.history[indexOfBoardToDisplay];
  const boardToDisplay =
    !isDisplayedBoardLatest && latestBoardFEN
      ? latestBoardFEN.buildBoard()
      : gameState.board;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] items-center justify-center 3xl:min-h-[calc(100vh-7rem)]">
      <div className="relative flex h-[33rem] flex-col items-center justify-center bg-neutral-900 md:h-[30rem] md:w-[50rem] md:flex-row lg:h-[40rem] lg:w-[60rem] 3xl:h-[60rem] 3xl:w-[90rem]">
        <div className="z-10 h-80 w-80  md:h-[30rem] md:w-[30rem] lg:h-[40rem] lg:w-[40rem] 3xl:h-[60rem] 3xl:w-[60rem]">
          {isGameFinished && chessRef.current.gameResult ? (
            <GameSummary
              user={opponentsData}
              gameResult={chessRef.current.gameResult}
              color={gameState.color}
              queueUpTimeControl={gameState.timeControl}
              rating={gameSummaryRating}
              ranked
            ></GameSummary>
          ) : (
            <Chessboard
              uuid={uuid as string}
              color={gameState.color}
              isYourTurn={gameState.turn === gameState.color}
              chess={chessRef.current}
              board={boardToDisplay}
              locked={!isDisplayedBoardLatest}
              unlockFunction={setIndexOfBoardToDisplay}
              mutate
              onMove={() => {
                setIndexOfBoardToDisplay(
                  chessRef.current!.algebraic.length - 1
                );
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
            isLocked={gameState.turn === gameState.color}
            isGameFinished={!!chessRef.current.gameResult}
            chessTimeoutFunc={(color: PlayerColor) => {
              chessRef.current?.timeExpired(color);
              setIsGameFinished(true);
            }}
          ></Timer>

          <UserBanner
            className="h-10 w-full md:h-14 3xl:h-20  3xl:text-xl"
            user={opponentsData}
          ></UserBanner>

          <MovesHistory
            className="h-80 w-full md:h-full md:gap-0 md:text-xs lg:gap-0.5 lg:text-sm"
            chess={chessRef.current}
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
              chessRef.current?.abandon(opponentsColor);
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
            isLocked={gameState.turn === opponentsColor}
            isGameFinished={!!chessRef.current.gameResult}
            chessTimeoutFunc={(color: PlayerColor) => {
              chessRef.current?.timeExpired(color);
              setIsGameFinished(true);
            }}
          ></Timer>
        </div>
      </div>
    </main>
  );
};

export default Play;
