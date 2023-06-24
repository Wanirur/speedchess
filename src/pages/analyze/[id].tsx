import { type NextPage } from "next";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import Chessboard from "~/components/chessboard";
import MovesHistory from "~/components/moves_history";
import UserBanner from "~/components/user_banner";
import { api } from "~/utils/api";
import Chess from "~/utils/chess";
import { AlgebraicNotation } from "~/utils/notations";
import { initBoard } from "~/utils/pieces";

const Test: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { data: sessionData } = useSession();

  const chessRef = useRef<Chess | null>(null);
  if (chessRef.current === null) {
    chessRef.current = new Chess(initBoard());
  }

  const {
    isLoading,
    isError,
    data: gameMoves,
  } = api.chess.getGameHistory.useQuery(
    { id: Number.parseInt(id as string) },
    {
      enabled: !!id,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );
  const [indexOfBoardToDisplay, setIndexOfBoardToDisplay] = useState<number>(0);

  useEffect(() => {
    if (!gameMoves || !chessRef.current) {
      return;
    }

    const splitMovesString = gameMoves.split(" ");

    console.log(splitMovesString);
    try {
      const algebraicMoves = splitMovesString.map((move) =>
        AlgebraicNotation.fromLongNotationString(move)
      );

      chessRef.current.playOutFromAlgebraic(algebraicMoves);
      setIndexOfBoardToDisplay(chessRef.current.algebraic.length - 1);
    } catch (err) {
      if (err instanceof Error) {
        console.error(err);
      }
    }
  }, [gameMoves]);

  if (!sessionData?.user || isError) {
    return <div> error </div>;
  }

  if (!chessRef.current || !router.isReady || isLoading) {
    return <div> loading...</div>;
  }

  const boardToDisplay =
    chessRef.current.history[indexOfBoardToDisplay]?.buildBoard() ??
    chessRef.current.board;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] items-center justify-center 3xl:min-h-[calc(100vh-7rem)]">
      <div className="relative flex h-[33rem] flex-col items-center justify-center bg-neutral-900 md:h-[30rem] md:w-[50rem] md:flex-row lg:h-[40rem] lg:w-[60rem] 3xl:h-[60rem] 3xl:w-[90rem]">
        <div className="z-10 h-80 w-80  md:h-[30rem] md:w-[30rem] lg:h-[40rem] lg:w-[40rem] 3xl:h-[60rem] 3xl:w-[60rem]">
          <Chessboard
            uuid={"analyze"}
            color={"WHITE"}
            isYourTurn={false}
            chess={chessRef.current}
            board={boardToDisplay}
            locked
          ></Chessboard>
        </div>

        <div className="absolute flex h-full w-full min-w-[15rem] max-w-xs  flex-col items-center justify-center md:static md:m-0 md:w-1/3 md:max-w-md md:px-4 3xl:max-w-xl">
          <UserBanner
            className="h-10 w-full md:h-14 3xl:h-20  3xl:text-xl"
            user={sessionData?.user}
          ></UserBanner>

          <MovesHistory
            className="h-80 w-full md:h-full md:gap-0 md:text-xs lg:gap-0.5 lg:text-sm"
            chess={chessRef.current}
            index={indexOfBoardToDisplay}
            setIndex={setIndexOfBoardToDisplay}
          ></MovesHistory>

          <div className="absolute bottom-0 m-auto flex h-20 items-center justify-center gap-3 font-os font-extrabold text-white md:static">
            <button
              className="rounded-lg bg-neutral-800 px-4 py-2.5 hover:bg-neutral-950"
              onClick={() => {
                setIndexOfBoardToDisplay((x) => (x === 1 ? x : x - 1));
              }}
            >
              {"<"}
            </button>
            <button
              className="rounded-lg bg-neutral-800 px-4 py-2.5 hover:bg-neutral-950"
              onClick={() => {
                setIndexOfBoardToDisplay((x) =>
                  x === chessRef.current?.algebraic.length ? x : x + 1
                );
              }}
            >
              {">"}
            </button>
          </div>
          <UserBanner
            className="h-10 w-full md:h-14 3xl:h-20 3xl:text-xl"
            user={sessionData?.user}
          ></UserBanner>
        </div>
      </div>
    </main>
  );
};

export default Test;
