import type { Channel } from "pusher-js";
import { useEffect, useState, type HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";
import { type Coords } from "~/utils/coords";
import type { PlayerColor } from "~/chess/utils";
import { api } from "~/utils/api";

const Timer: React.FC<
  {
    channel?: Channel;
    color: PlayerColor;
    initial: number;
    increment: number;
    isLocked: boolean;
    isGameFinished: boolean;
    chessTimeoutFunc: (color: PlayerColor) => void;
    onTimeChange?: (secondsLeft: number) => void;
  } & HTMLAttributes<HTMLDivElement>
> = ({
  className,
  channel,
  color,
  initial,
  increment,
  isLocked,
  isGameFinished,
  chessTimeoutFunc,
  onTimeChange: onChange,
}) => {
  const [seconds, setSeconds] = useState<number>(Math.floor(initial));

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isLocked && !isGameFinished) {
        if (seconds <= 0) {
          return;
        }

        const secondsLeft = seconds - 1;

        setSeconds(secondsLeft);
        onChange?.(secondsLeft);
      }
    }, 1000);

    return () => {
      clearTimeout(timeout);
    };
  }, [isLocked, onChange, seconds, increment, isGameFinished]);

  useEffect(() => {
    if (seconds <= 0) {
      chessTimeoutFunc(color);
    }
  }, [seconds, chessTimeoutFunc, color]);

  useEffect(() => {
    if (!channel) {
      return;
    }

    const onMove = (move: {
      fromTile: Coords;
      toTile: Coords;
      whiteTimeLeftInMilis: number;
      blackTimeLeftInMilis: number;
    }) => {
      const timeLeftInMilis =
        color === "WHITE"
          ? move.whiteTimeLeftInMilis
          : move.blackTimeLeftInMilis;

      if (timeLeftInMilis && !isLocked) {
        setSeconds(Math.ceil(timeLeftInMilis / 1000));
      }
    };

    channel?.bind("move_made", onMove);
    return () => {
      channel?.unbind("move_made", onMove);
    };
  }, [channel, isLocked, color]);

  const { data: playersTime } = api.chess.getPlayersTime.useQuery(
    { gameId: channel?.name ?? "" },
    {
      enabled: !!channel,
      refetchOnMount: false,
      refetchOnWindowFocus: true,
      refetchOnReconnect: false,
    }
  );

  useEffect(() => {
    if (!playersTime) {
      return;
    }

    if (color === "WHITE") {
      setSeconds(Math.floor(playersTime.white / 1000));
    } else {
      setSeconds(Math.floor(playersTime.black / 1000));
    }
  }, [playersTime, color]);

  useEffect(() => {
    if (isLocked) {
      setSeconds((sec) => (sec < initial ? sec + increment : sec));
    }
  }, [isLocked, increment, initial]);

  const textColor = seconds <= 10 ? "text-red-900" : "text-white";
  const minutes = Math.floor(seconds / 60);
  const minutesToDisplay = minutes < 0 ? 0 : minutes;

  const secondsOnTimer = seconds % 60;
  const secondsToDisplay = secondsOnTimer < 0 ? 0 : secondsOnTimer;

  return (
    <div
      className={twMerge(
        "text-os flex items-center bg-neutral-800 px-5 font-timer text-5xl",
        textColor,
        className
      )}
    >
      {`${minutesToDisplay}:${secondsToDisplay.toString().padStart(2, "0")}`}
    </div>
  );
};

export default Timer;
