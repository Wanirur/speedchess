import { type NextPage } from "next";
import { useRouter } from "next/router";
import { type Channel } from "pusher-js";
import { useEffect, useRef, useState } from "react";
import Chessboard from "~/components/chessboard";
import DrawResignPanel from "~/components/drawresignpanel";
import Timer from "~/components/timer";
import { api } from "~/utils/api";
import Chess from "~/utils/chess";
import { Coords } from "~/utils/coords";
import { copyBoard } from "~/utils/pieces";
import pusherClient from "~/utils/pusherClient";

const Play: NextPage = () => {
  const router = useRouter();
  const { uuid } = router.query;
  const [gameFinished, setGameFinished] = useState<boolean>(false);
  const channelRef = useRef<Channel>();
  const chessRef = useRef<Chess>();
  const [subscribed, setSubscribed] = useState<boolean>(false);
  const [isDrawOffered, setIsDrawOffered] = useState<boolean>(false);
  const [isUserDisconnected, setIsUserDisconnected] = useState<boolean>(false);
  const [isEnemyDisconnected, setIsEnemyDisconnected] =
    useState<boolean>(false);
  const utils = api.useContext();

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

                return {
                  ...old,
                  board: copyBoard(chessRef.current.move(from, to, old.turn)),
                  turn: old.turn === "WHITE" ? "BLACK" : "WHITE",
                };
              }
            );
          } catch (e) {
            console.log(e);
          }
        };

        channelRef.current?.bind("move_made", onMove);
        console.log(board);
        chessRef.current = new Chess(board);
      },
    }
  );

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    channelRef.current = pusherClient.subscribe(uuid as string);
    channelRef.current.bind("resign", () => {
      setGameFinished(true);
      setIsDrawOffered(false);
    });

    channelRef.current.bind("draw", () => {
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
    <main className="flex min-h-screen flex-row items-center justify-center bg-neutral-900">
      {gameFinished && <div className="text-white"> You lost</div>}
      {isLoading && <div className="text-white"> Loading... </div>}
      {isError && (
        <div className="text-red-600"> An error occured. Please refresh. </div>
      )}
      {isSuccess &&
        !gameFinished &&
        channelRef.current &&
        chessRef.current &&
        subscribed && (
          <Chessboard
            uuid={uuid as string}
            color={gameState.color}
            isYourTurn={gameState.turn === gameState.color}
            chess={chessRef.current}
            board={gameState.board}
            mutate
          ></Chessboard>
        )}
      {isSuccess && channelRef.current && (
        <div className="flex h-[640px] w-max flex-col justify-center px-4">
          <Timer
            channel={channelRef.current}
            color={opponentsColor}
            initial={
              opponentsColor === "WHITE"
                ? gameState.whiteMilisLeft
                : gameState.blackMilisLeft
            }
            isLocked={gameState.turn === gameState.color}
          ></Timer>
          <div className="h-full w-80 bg-neutral-700"></div>

          <DrawResignPanel
            isDrawOffered={isDrawOffered}
            uuid={uuid as string}
            setGameFinished={setGameFinished}
            isUserDisconnected={isUserDisconnected}
            isEnemyDisconnected={isEnemyDisconnected}
          ></DrawResignPanel>
          <Timer
            channel={channelRef.current}
            color={gameState.color}
            initial={
              gameState.color === "WHITE"
                ? gameState.whiteMilisLeft
                : gameState.blackMilisLeft
            }
            isLocked={gameState.turn === opponentsColor}
          ></Timer>
        </div>
      )}
    </main>
  );
};

export default Play;
