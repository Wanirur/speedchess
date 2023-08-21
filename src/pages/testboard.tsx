/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { type NextPage } from "next";
import { type User } from "next-auth";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { type Channel } from "pusher-js";
import { useEffect, useRef, useState } from "react";
import Chessgame, { type ChessgameForMatch } from "~/chess/chessgame";
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

const Play: NextPage = () => {
  const router = useRouter();
  const { uuid } = router.query;

  const [chess, setChess] = useState<ChessgameForMatch>(
    new Chessgame(
      new CombinedStrategies(
        new SimpleHistory<AlgebraicNotation>(),
        new SimpleHistory<ChessPosition>()
      ),
      FEN.fromString("4k3/8/8/8/8/8/8/3QK3 w - - 0 1")
    )
  );

  const [isYourTurn, setIsYourTurn] = useState<boolean>(true);
  const [showDrawResignPanel, setShowDrawResignPanel] =
    useState<boolean>(false);
  const [isUserDisconnected, setIsUserDisconnected] = useState<boolean>(false);
  const [isEnemyDisconnected, setIsEnemyDisconnected] =
    useState<boolean>(false);
  const [isGameFinished, setIsGameFinished] = useState<boolean>(false);
  const [indexOfBoardToDisplay, setIndexOfBoardToDisplay] = useState<number>(0);

  const opponentsColor = "BLACK";

  if (!chess) {
    return <div className="text-white"> Loading... </div>;
  }

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
          <Chessboard
            uuid={uuid as string}
            color={"WHITE"}
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
              setIndexOfBoardToDisplay(chess.movesPlayed - 1);
            }}
            skipColorCheck
          ></Chessboard>
        </div>

        <div className="absolute flex h-full w-full min-w-[15rem] max-w-xs  flex-col justify-center md:static md:m-0 md:w-1/3 md:max-w-md md:px-4 3xl:max-w-xl">
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
            uuid={uuid as string}
            isUserDisconnected={isUserDisconnected}
            isEnemyDisconnected={isEnemyDisconnected}
            onAbandon={() => {
              chess.abandon(opponentsColor);
              setIsGameFinished(true);
            }}
            mutate
          ></DrawResignPanel>
        </div>
      </div>
    </main>
  );
};

export default Play;
