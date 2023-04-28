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
  const { uuid } = router.query;
  const resignMutation = api.chess.resign.useMutation();
  const [gameFinished, setGameFinished] = useState<boolean>(false);
  const channelRef = useRef<Channel>();
  const [subscribed, setSubscribed] = useState<boolean>(false);
  useEffect(() => {
    console.log("pipa");
    if (!router.isReady) {
      return;
    }

    console.log("dupa");
    channelRef.current = pusherClient.subscribe(uuid as string);
    channelRef.current.bind("resign", () => {
      setGameFinished(true);
    });

    setSubscribed(true);
  }, [router.isReady, uuid]);

  return (
    <main className="flex min-h-screen flex-row items-center justify-center bg-neutral-900">
      {gameFinished && <div className="text-white"> You lost</div>}
      {router.isReady && !gameFinished && channelRef.current && subscribed && (
        <Chessboard
          uuid={uuid as string}
          channel={channelRef.current}
        ></Chessboard>
      )}
      <div className="flex h-[640px] w-max flex-col justify-center px-4">
        <Timer></Timer>
        <div className="h-full w-72 bg-neutral-700"></div>
        <div className="flex flex-row items-center justify-center gap-2 p-8">
          <button className="rounded-md bg-yellow-600 px-5 py-3 font-os text-white">
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
        </div>
        <Timer></Timer>
      </div>
    </main>
  );
};

export default Play;
