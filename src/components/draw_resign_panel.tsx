import { Check, X } from "lucide-react";
import { useEffect, useRef, type HTMLAttributes, useState } from "react";
import { twMerge } from "tailwind-merge";
import { api } from "~/utils/api";

const DrawResignPanel: React.FC<
  {
    uuid: string;
    isDrawOffered: boolean;
    isUserDisconnected: boolean;
    isEnemyDisconnected: boolean;
    onAbandon: () => void;
    mutate?: boolean;
    onDrawOffer?: () => void;
    onResign?: () => void;
  } & HTMLAttributes<HTMLDivElement>
> = ({
  className,
  isDrawOffered,
  uuid,
  isUserDisconnected,
  isEnemyDisconnected,
  onAbandon: chessAbandonFunc,
  mutate = false,
  onDrawOffer,
  onResign,
}) => {
  const resignMutation = api.chess.resign.useMutation();
  const drawOfferMutation = api.chess.offerDraw.useMutation();
  const drawRefuseMutation = api.chess.refuseDraw.useMutation();

  const enemyTimeoutRef = useRef<number | null>(null);
  const [isDrawOfferYours, setIsDrawOfferYours] = useState<boolean>(false);

  useEffect(() => {
    if (!isEnemyDisconnected && enemyTimeoutRef.current !== null) {
      window.clearTimeout(enemyTimeoutRef.current);
      return;
    }

    if (!isEnemyDisconnected) {
      return;
    }

    enemyTimeoutRef.current = window.setTimeout(() => {
      chessAbandonFunc();
    }, 10_000);
  }, [isEnemyDisconnected, chessAbandonFunc]);

  useEffect(() => {
    if (!isDrawOffered) {
      setIsDrawOfferYours(false);
    }
  }, [isDrawOffered]);

  if (isUserDisconnected) {
    return (
      <div
        className={twMerge(
          "flex flex-row items-center justify-center gap-2 px-1.5 py-2 md:p-3",
          className
        )}
      >
        <p className="font-os text-white">
          You disconnected. Trying to restore connection...
        </p>
      </div>
    );
  }

  if (isEnemyDisconnected) {
    return (
      <div
        className={twMerge(
          "flex flex-row items-center justify-center gap-2 px-1.5 py-2 md:p-3",
          className
        )}
      >
        <p className="font-os text-white">
          Your opponent disconnected. In 10s you may annouce win.
        </p>
      </div>
    );
  }

  return (
    <div
      className={twMerge(
        "flex flex-row items-center justify-center gap-2 px-1.5 py-2 md:p-3",
        className
      )}
    >
      {isDrawOffered ? (
        <>
          <p className="font-os text-white">
            {isDrawOfferYours
              ? "Waiting for opponent's decision..."
              : "Your opponent offered a draw. Do you accept?"}
          </p>
          {!isDrawOfferYours && (
            <button
              className="rounded-md bg-green-700 hover:bg-green-800"
              onClick={() => {
                if (mutate) {
                  drawOfferMutation.mutate({ uuid: uuid });
                }
              }}
            >
              <Check className="stroke-white"></Check>
            </button>
          )}
          <button
            className="rounded-md bg-red-600 hover:bg-red-700"
            onClick={() => {
              if (mutate) {
                drawRefuseMutation.mutate({ uuid: uuid });
              }
            }}
          >
            <X className="stroke-white"></X>
          </button>
        </>
      ) : (
        <>
          <button
            className="rounded-md bg-yellow-600 px-4 py-2 font-os text-white hover:bg-yellow-700 md:px-5 md:py-3"
            onClick={() => {
              if (mutate) {
                drawOfferMutation.mutate({ uuid: uuid });
              }
              setIsDrawOfferYours(true);
              onDrawOffer?.();
            }}
          >
            draw
          </button>
          <button
            className="rounded-md bg-red-900 px-4 py-2 font-os text-white hover:bg-red-950 md:px-5 md:py-3"
            onClick={() => {
              if (mutate) {
                resignMutation.mutate({ uuid: uuid });
              }
              onResign?.();
            }}
          >
            resign
          </button>
        </>
      )}
    </div>
  );
};

export default DrawResignPanel;
