import { type NextPage } from "next";
import { useRouter } from "next/router";
import { type Channel } from "pusher-js";
import { useEffect, useRef, useState } from "react";
import Chessboard from "~/components/chessboard";
import DrawResignPanel from "~/components/drawresignpanel";
import Timer from "~/components/timer";
import { api } from "~/utils/api";
import { type Coords, movePiece } from "~/utils/pieces";
import pusherClient from "~/utils/pusherClient";

const Play: NextPage = () => {
  const router = useRouter();
  const { uuid } = router.query;
  const [gameFinished, setGameFinished] = useState<boolean>(false);
  const channelRef = useRef<Channel>();
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
      onSuccess: () => {
        const onMove = (move: {
          fromTile: Coords;
          toTile: Coords;
          timeLeftinMilis: number;
        }) => {
          utils.chess.getGameState.setData({ uuid: uuid as string }, (old) => {
            if (!old) {
              return old;
            }

            return {
              ...old,
              board: movePiece(old.board, move.fromTile, move.toTile),
              turn: old.turn === "white" ? "black" : "white",
            };
          });
        };

        channelRef.current?.bind("move_made", onMove);
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
      ({current }: { previous: string; current: string }) => {
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
    isSuccess && gameState.color === "white" ? "black" : "white";

  return (
    <main className="flex min-h-screen flex-row items-center justify-center bg-neutral-900">
      {gameFinished && <div className="text-white"> You lost</div>}
      {isLoading && <div className="text-white"> Loading... </div>}
      {isError && (
        <div className="text-red-600"> An error occured. Please refresh. </div>
      )}
      {isSuccess && !gameFinished && channelRef.current && subscribed && (
        <Chessboard
          uuid={uuid as string}
          color={gameState.color}
          isYourTurn={gameState.turn === gameState.color}
          board={gameState.board}
        ></Chessboard>
      )}
      {isSuccess && channelRef.current && (
        <div className="flex h-[640px] w-max flex-col justify-center px-4">
          <Timer
            channel={channelRef.current}
            color={opponentsColor}
            initial={
              opponentsColor === "white"
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
              gameState.color === "white"
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
