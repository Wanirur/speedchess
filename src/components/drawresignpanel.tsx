import { Check, X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { api } from "~/utils/api";

const DrawResignPanel: React.FC<{
  isDrawOffered: boolean;
  uuid: string;
  setGameFinished: Dispatch<SetStateAction<boolean>>;
  isUserDisconnected: boolean;
  isEnemyDisconnected: boolean;
}> = ({
  isDrawOffered,
  uuid,
  setGameFinished,
  isUserDisconnected,
  isEnemyDisconnected,
}) => {
  const resignMutation = api.chess.resign.useMutation();
  const drawOfferMutation = api.chess.offerDraw.useMutation();
  const drawRefuseMutation = api.chess.refuseDraw.useMutation();

  return (
    <div className="flex w-80 flex-row items-center justify-center gap-2 p-8">
      {isUserDisconnected && (
        <p className="max-w-full font-os text-white">
          {" "}
          You disconnected. Trying to restore connection...{" "}
        </p>
      )}

      {isEnemyDisconnected && (
        <p className="max-w-full font-os text-white">
          {" "}
          Your opponent disconnected. In 10s you may annouce win.{" "}
        </p>
      )}
      {!isUserDisconnected && !isEnemyDisconnected && isDrawOffered && (
        <>
          <p className="max-w-full font-os text-white">
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
