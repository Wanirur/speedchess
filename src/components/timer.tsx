import type { Channel } from "pusher-js";
import { useEffect, useState } from "react";
import type { Coords, PlayerColor } from "~/utils/pieces";

const Timer: React.FC<{
  channel: Channel;
  color: PlayerColor;
  initial: number;
  isLocked: boolean;
}> = ({ channel, color, initial, isLocked }) => {
  const [seconds, setSeconds] = useState<number>(Math.floor(initial / 1000));

  useEffect(() => {
    if (seconds <= 0) {
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
  }, [seconds, isLocked]);

  useEffect(() => {
    const onMove = (move: {
      fromTile: Coords;
      toTile: Coords;
      timeLeftInMilis: number;
    }) => {
      if (!isLocked) {
        setSeconds(Math.floor(move.timeLeftInMilis / 1000));
      }
    };

    channel.bind("move_made", onMove);
    return () => {
      channel.unbind("move_made", onMove);
    };
  }, [channel, isLocked]);
  return (
    <div
      className={
        "text-os w-full  bg-neutral-800 p-4 font-timer text-6xl " +
        (seconds <= 10 ? "text-red-900" : "text-white")
      }
    >
      {Math.floor(seconds / 60).toString() +
        ":" +
        (seconds % 60).toString().padStart(2, "0")}
    </div>
  );
};

export default Timer;
