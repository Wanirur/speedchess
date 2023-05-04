import { Check, X } from "lucide-react";
import { type NextPage } from "next";
import { useRouter } from "next/router";
import { type Channel } from "pusher-js";
import { useEffect, useRef, useState } from "react";
import Chessboard from "~/components/chessboard";
import Timer from "~/components/timer";
import { api } from "~/utils/api";
import pusherClient from "~/utils/pusherClient";

const Play: NextPage = () => {
  const router = useRouter();
  const { time, uuid } = router.query;
  const resignMutation = api.chess.resign.useMutation();
  const drawOfferMutation = api.chess.offerDraw.useMutation();
  const drawRefuseMutation = api.chess.refuseDraw.useMutation();
  const [gameFinished, setGameFinished] = useState<boolean>(false);
  const channelRef = useRef<Channel>();
  const [subscribed, setSubscribed] = useState<boolean>(false);
  const [isDrawOffered, setIsDrawOffered] = useState<boolean>(false);
  const utils = api.useContext();

  const {
    isSuccess: isSuccessColor,
    isLoading: isLoadingColor,
    isError: isErrorColor,
    data: playerColor,
  } = api.chess.getColor.useQuery(
    { uuid: uuid as string },
    {
      enabled: !!uuid,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  );

  const {
    isSuccess: isSuccessTurn,
    isLoading: isLoadingTurn,
    isError: isErrorTurn,
    data: playerTurn,
  } = api.chess.getPlayerTurn.useQuery(
    { uuid: uuid as string },
    {
      enabled: !!playerColor && !!channelRef.current,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      onSuccess: () => {
        const onMove = () => { 
          utils.chess.getPlayerTurn.setData({uuid: uuid as string}, old => {
            return old === "white" ? "black" : "white";
          })
        }

        channelRef.current?.bind("move_made", onMove);
      }
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

    setSubscribed(true);
  }, [router.isReady, uuid]);

  const opponentsColor = playerColor === "white" ? "black" : "white";

  return (
    <main className="flex min-h-screen flex-row items-center justify-center bg-neutral-900">
      {gameFinished && <div className="text-white"> You lost</div>}
      {(isLoadingColor || isLoadingTurn) && (
        <div className="text-white"> Loading... </div>
      )}
      {(isErrorColor || isErrorTurn) && (
        <div className="text-red-600"> An error occured. Please refresh. </div>
      )}
      {isSuccessColor &&
        isSuccessTurn &&
        !gameFinished &&
        channelRef.current &&
        subscribed && (
          <Chessboard
            uuid={uuid as string}
            channel={channelRef.current}
            playerColor={playerColor}
            isYourTurn={playerTurn === playerColor}
          ></Chessboard>
        )}
      {isSuccessColor && isSuccessTurn &&  channelRef.current &&(
        <div className="flex h-[640px] w-max flex-col justify-center px-4">
          <Timer
            channel={channelRef.current}
            color={opponentsColor}
            initial={Number.parseInt(time as string)}
            isLocked={playerTurn === playerColor}
          ></Timer>
          <div className="h-full w-80 bg-neutral-700"></div>
          <div className="flex w-80 flex-row items-center justify-center gap-2 p-8">
            {isDrawOffered && (
              <>
                <p className="max-w-full font-os text-white">
                  Your opponent offered a draw. Do you accept?{" "}
                </p>
                <button
                  className="rounded-md bg-green-600"
                  onClick={() =>
                    drawOfferMutation.mutate({ uuid: uuid as string })
                  }
                >
                  {" "}
                  <Check className="fill-white"></Check>
                </button>{" "}
                <button
                  className="rounded-md bg-red-600"
                  onClick={() =>
                    drawRefuseMutation.mutate({ uuid: uuid as string })
                  }
                >
                  {" "}
                  <X className="fill-white"></X>
                </button>{" "}
              </>
            )}
            {!isDrawOffered && (
              <>
                <button
                  className="rounded-md bg-yellow-600 px-5 py-3 font-os text-white"
                  onClick={() => {
                    drawOfferMutation.mutate({ uuid: uuid as string });
                  }}
                >
                  {" "}
                  draw{" "}
                </button>
                <button
                  className="rounded-md bg-red-900 px-5 py-3 font-os text-white"
                  onClick={() => {
                    resignMutation.mutate({ uuid: uuid as string });
                    setGameFinished(true);
                  }}
                >
                  {" "}
                  resign{" "}
                </button>
              </>
            )}
          </div>
          <Timer
            channel={channelRef.current}
            color={playerColor}
            initial={Number.parseInt(time as string)}
            isLocked={playerTurn === opponentsColor}
          ></Timer>
        </div>
      )}
    </main>
  );
};

export default Play;
