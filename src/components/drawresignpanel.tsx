import { Check, X } from "lucide-react";
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  type HTMLAttributes,
} from "react";
import { twMerge } from "tailwind-merge";
import { api } from "~/utils/api";

const DrawResignPanel: React.FC<
  {
    uuid: string;
    isDrawOffered: boolean;
    isUserDisconnected: boolean;
    isEnemyDisconnected: boolean;
    setGameFinished: Dispatch<SetStateAction<boolean>>;
    chessAbandonFunc: () => void;
  } & HTMLAttributes<HTMLDivElement>
> = ({
  className,
  isDrawOffered,
  uuid,
  isUserDisconnected,
  isEnemyDisconnected,
  setGameFinished,
  chessAbandonFunc,
}) => {
  const resignMutation = api.chess.resign.useMutation();
  const drawOfferMutation = api.chess.offerDraw.useMutation();
  const drawRefuseMutation = api.chess.refuseDraw.useMutation();

  const enemyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isEnemyDisconnected && enemyTimeoutRef.current !== null) {
      window.clearInterval(enemyTimeoutRef.current);
      return;
    }

    if (!isEnemyDisconnected) {
      return;
    }

    enemyTimeoutRef.current = window.setTimeout(() => {
      setGameFinished(true);
      chessAbandonFunc();
    }, 10000);
  }, [isEnemyDisconnected, setGameFinished, chessAbandonFunc]);

  return (
    <div
      className={twMerge(
        "max-w-80 flex flex-row items-center justify-center gap-2 p-3",
        className
      )}
    >
      {isUserDisconnected && (
        <p className="font-os text-white">
          {" "}
          You disconnected. Trying to restore connection...{" "}
        </p>
      )}

      {isEnemyDisconnected && (
        <p className="font-os text-white">
          {" "}
          Your opponent disconnected. In 10s you may annouce win.{" "}
        </p>
      )}
      {!isUserDisconnected && !isEnemyDisconnected && isDrawOffered && (
        <>
          <p className="font-os text-white">
            Your opponent offered a draw. Do you accept?{" "}
          </p>
          <button
            className="rounded-md bg-green-600"
            onClick={() => drawOfferMutation.mutate({ uuid: uuid })}
          >
            {" "}
            <Check className="fill-white"></Check>
          </button>{" "}
          <button
            className="rounded-md bg-red-600"
            onClick={() => drawRefuseMutation.mutate({ uuid: uuid })}
          >
            {" "}
            <X className="fill-white"></X>
          </button>{" "}
        </>
      )}
      {!isUserDisconnected && !isEnemyDisconnected && !isDrawOffered && (
        <>
          <button
            className="rounded-md bg-yellow-600 px-5 py-3 font-os text-white"
            onClick={() => {
              drawOfferMutation.mutate({ uuid: uuid });
            }}
          >
            {" "}
            draw{" "}
          </button>
          <button
            className="rounded-md bg-red-900 px-5 py-3 font-os text-white"
            onClick={() => {
              resignMutation.mutate({ uuid: uuid });
            }}
          >
            {" "}
            resign{" "}
          </button>
        </>
      )}
    </div>
  );
};

export default DrawResignPanel;
