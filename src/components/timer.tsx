import { useEffect, useState } from "react";
import { PlayerColor } from "~/utils/pieces";

const Timer: React.FC<{
  uuid: string;
  color: PlayerColor;
  initial: number;
  isLocked: boolean;
}> = ({ uuid, color, initial, isLocked }) => {
  const [seconds, setSeconds] = useState<number>(initial);

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
