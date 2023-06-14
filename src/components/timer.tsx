import type { Channel } from "pusher-js";
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useState,
  HTMLAttributes,
} from "react";
import { twMerge } from "tailwind-merge";
import { type Coords } from "~/utils/coords";
import type { PlayerColor } from "~/utils/pieces";

const Timer: React.FC<
  {
    channel: Channel;
    color: PlayerColor;
    initial: number;
    isLocked: boolean;
    setIsGameFinished: Dispatch<SetStateAction<boolean>>;
    chessTimeoutFunc: (color: PlayerColor) => void;
  } & HTMLAttributes<HTMLDivElement>
> = ({
  className,
  channel,
  color,
  initial,
  isLocked,
  setIsGameFinished,
  chessTimeoutFunc,
}) => {
  const [seconds, setSeconds] = useState<number>(Math.floor(initial / 1000));

  useEffect(() => {
    if (seconds <= 0) {
      setIsGameFinished(true);
      chessTimeoutFunc(color);
      return;
    }
    const interval = setInterval(() => {
      if (!isLocked) {
        setSeconds((x) => x - 1);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [seconds, isLocked, setIsGameFinished, chessTimeoutFunc, color]);

  useEffect(() => {
    const onMove = (move: {
      fromTile: Coords;
      toTile: Coords;
      timeLeftInMilis: number;
    }) => {
      if (!isLocked) {
        setSeconds(Math.round(move.timeLeftInMilis / 1000));
      }
    };

    channel.bind("move_made", onMove);
    return () => {
      channel.unbind("move_made", onMove);
    };
  }, [channel, isLocked]);

  const textColor = seconds <= 10 ? "text-red-900" : "text-white";

  return (
    <div
      className={twMerge(
        "text-os flex items-center bg-neutral-800 px-5 font-timer text-5xl",
        textColor,
        className
      )}
    >
      {Math.floor(seconds / 60).toString() +
        ":" +
        (seconds % 60).toString().padStart(2, "0")}
    </div>
  );
};

export default Timer;
