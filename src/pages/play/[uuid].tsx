import { type NextPage } from "next";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { type Channel } from "pusher-js";
import { useEffect, useRef, useState } from "react";
import Chessboard from "~/components/chessboard";
import DrawResignPanel from "~/components/drawresignpanel";
import GameSummary from "~/components/gamesummary";
import MovesHistory from "~/components/moveshistory";
import Timer from "~/components/timer";
import UserBanner from "~/components/userbanner";
import { api } from "~/utils/api";
import Chess from "~/utils/chess";
import { Coords } from "~/utils/coords";
import {
  type PromotedPieceType,
  copyBoard,
  type PlayerColor,
} from "~/utils/pieces";
import pusherClient from "~/utils/pusherClient";

const Play: NextPage = () => {
  const router = useRouter();
  const { uuid } = router.query;

  const { data: sessionData } = useSession();
  const [gameFinished, setGameFinished] = useState<boolean>(false);
  const channelRef = useRef<Channel>();
  const chessRef = useRef<Chess>();
  const [subscribed, setSubscribed] = useState<boolean>(false);
  const [isDrawOffered, setIsDrawOffered] = useState<boolean>(false);
  const [isUserDisconnected, setIsUserDisconnected] = useState<boolean>(false);
  const [isEnemyDisconnected, setIsEnemyDisconnected] =
    useState<boolean>(false);
  const [indexOfBoardToDisplay, setIndexOfBoardToDisplay] = useState<number>(0);
  const utils = api.useContext();

  const isDisplayedBoardLatest =
    indexOfBoardToDisplay === (chessRef.current?.algebraic?.length ?? 1) - 1;

  const {
    isSuccess,
    isLoading,
    isError,
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
                      setGameFinished(true);
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
                    setGameFinished(true);
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
                      setGameFinished(true);
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
                    setGameFinished(true);
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

  const { isError: isErrorOpponentsData, data: opponentsData } =
    api.chess.getOpponentsData.useQuery(
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

    channelRef.current = pusherClient.subscribe(uuid as string);
    channelRef.current.bind("resign", (data: { color: string }) => {
      chessRef.current?.resign(data.color as PlayerColor);
      setGameFinished(true);
      setIsDrawOffered(false);
    });

    channelRef.current.bind("draw", () => {
      chessRef.current?.drawAgreement();
      setGameFinished(true);
      setIsDrawOffered(false);
    });

    channelRef.current.bind("draw_offer", () => {
      setIsDrawOffered(true);
    });

    channelRef.current.bind("draw_refused", () => {
      setIsDrawOffered(false);
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

    setSubscribed(true);
  }, [router.isReady, uuid]);

  const opponentsColor =
    isSuccess && gameState.color === "WHITE" ? "BLACK" : "WHITE";

  return (
    <main className="container flex min-h-[calc(100vh-3.5rem)] flex-row items-center justify-center bg-neutral-900">
      {isSuccess &&
        gameFinished &&
        chessRef.current?.gameResult &&
        sessionData?.user.rating &&
        opponentsData && (
          <GameSummary
            className={"h-[40rem] w-[40rem]"}
            user={opponentsData}
            gameResult={chessRef.current.gameResult}
            color={gameState.color}
            queueUpTimeControl={180}
            rating={
              gameState.color === "WHITE"
                ? gameState.ratingWhite
                : gameState.ratingBlack
            }
          ></GameSummary>
        )}
      {isLoading && <div className="text-white"> Loading... </div>}
      {(isError || !channelRef || isErrorOpponentsData) && (
        <div className="text-red-600"> An error occured. Please refresh. </div>
      )}
      {isSuccess &&
        !gameFinished &&
        channelRef.current &&
        chessRef.current &&
        subscribed && (
          <Chessboard
            className="h-[40rem] w-[40rem]"
            uuid={uuid as string}
            color={gameState.color}
            isYourTurn={gameState.turn === gameState.color}
            chess={chessRef.current}
            board={
              isDisplayedBoardLatest
                ? gameState.board
                : chessRef.current.history[
                    indexOfBoardToDisplay
                  ]?.buildBoard() ?? gameState.board
            }
            locked={!isDisplayedBoardLatest}
            unlockFunction={setIndexOfBoardToDisplay}
            mutate
          ></Chessboard>
        )}
      {isSuccess && channelRef.current && (
        <div className="flex h-[640px] w-max flex-col justify-center px-4">
          <Timer
            className="h-32 w-full"
            channel={channelRef.current}
            color={opponentsColor}
            initial={
              opponentsColor === "WHITE"
                ? gameState.whiteMilisLeft
                : gameState.blackMilisLeft
            }
            isLocked={gameState.turn === gameState.color || gameFinished}
            setIsGameFinished={setGameFinished}
            chessTimeoutFunc={(color: PlayerColor) =>
              chessRef.current?.timeExpired(color)
            }
          ></Timer>
          {opponentsData && <UserBanner user={opponentsData}></UserBanner>}
          <div className="h-full w-80 bg-neutral-700 font-os text-white">
            {chessRef.current && (
              <MovesHistory
                chess={chessRef.current}
                index={indexOfBoardToDisplay}
                setIndex={setIndexOfBoardToDisplay}
              ></MovesHistory>
            )}
          </div>

          <DrawResignPanel
            className="h-44 w-full max-w-xs"
            isDrawOffered={isDrawOffered}
            uuid={uuid as string}
            isUserDisconnected={isUserDisconnected}
            isEnemyDisconnected={isEnemyDisconnected}
            setGameFinished={setGameFinished}
            chessAbandonFunc={() => chessRef.current?.abandon(opponentsColor)}
          ></DrawResignPanel>

          {sessionData?.user && (
            <UserBanner user={sessionData.user}></UserBanner>
          )}
          <Timer
            className="h-32 w-full"
            channel={channelRef.current}
            color={gameState.color}
            initial={
              gameState.color === "WHITE"
                ? gameState.whiteMilisLeft
                : gameState.blackMilisLeft
            }
            isLocked={gameState.turn === opponentsColor || gameFinished}
            setIsGameFinished={setGameFinished}
            chessTimeoutFunc={(color: PlayerColor) =>
              chessRef.current?.timeExpired(color)
            }
          ></Timer>
        </div>
      )}
    </main>
  );
};

export default Play;
