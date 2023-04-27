import { useState } from "react";
import { resolvePieceToImage, movePiece } from "~/utils/pieces";
import Image from "next/image";
import { api } from "~/utils/api";
import pusherClient from "~/utils/pusherClient";

const Chessboard: React.FC<{ uuid: string }> = ({ uuid }) => {
  const utils = api.useContext();
  const [highlightedTile, setHighlightedTile] = useState<number | null>(null);
  const [draggedPiece, setDraggedPiece] = useState<number | null>(null);
  const { isLoading, isError, isSuccess, data } =
    api.chess.getStartingData.useQuery(
      { uuid: uuid },
      {
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        onSuccess: () => {
          const onMove = (move: { fromTile: number; toTile: number }) => {
            utils.chess.getStartingData.setData({ uuid: uuid }, (old) => {
              if (!old) {
                return old;
              }

              return {
                ...old,
                board: movePiece(old.board, move.fromTile, move.toTile),
                isTurnYours: !old.isTurnYours,
              };
            });
          };

          const channel = pusherClient.subscribe(uuid);
          channel.bind("move_made", onMove);
        },
      }
    );

  const moveMutation = api.chess.movePiece.useMutation();

  return (
    <>
      {" "}
      {isLoading && <p className="text-white">Loading...</p>}
      {isError && (
        <p className="text-red-600">An error occured. Please refresh</p>
      )}
      {isSuccess && (
        <div className="container grid h-max w-max grid-cols-8 gap-0">
          {data.board.map((tile, index) => {
            console.log("rerender!");
            let isWhite = true;
            if (index % 2) {
              isWhite = false;
            }

            if (Math.floor(index / 8) % 2) {
              isWhite = !isWhite;
            }

            const tileBgStyle = isWhite ? "bg-white" : "bg-green-500";
            return (
              <div
                key={index}
                className={
                  "relative h-20 w-20 " +
                  (highlightedTile === index ? "bg-red-500" : tileBgStyle)
                }
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrag={(e) => {
                  if (!data.isTurnYours) {
                    return;
                  }
                  const tile = e.target;
                  if (!(tile instanceof Element)) {
                    return;
                  }

                  if (!data.board[index]) {
                    return;
                  }

                  setDraggedPiece(index);
                }}
                onDrop={() => {
                  if (draggedPiece === null) {
                    return;
                  }

                  moveMutation.mutate({
                    uuid: uuid,
                    fromTile: draggedPiece,
                    toTile: index,
                    secondsUsed: 0,
                  });
                  setDraggedPiece(null);
                }}
                onClick={(e) => {
                  if (!data.isTurnYours) {
                    return;
                  }
                  const tile = e.target;
                  if (!(tile instanceof Element)) {
                    return;
                  }
                  //no highlighted piece and clicked tile is empty - dont highlight
                  if (highlightedTile === null && !data.board[index]) {
                    return;
                  }

                  if (highlightedTile !== null) {
                    moveMutation.mutate({
                      uuid: uuid,
                      fromTile: highlightedTile,
                      toTile: index,
                      secondsUsed: 0,
                    });
                    setHighlightedTile(null);
                    return;
                  }

                  setHighlightedTile(index);
                }}
              >
                {tile && (
                  <Image
                    src={resolvePieceToImage(tile) as string}
                    alt={tile.pieceType}
                    fill
                    className="cursor-pointer"
                  ></Image>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default Chessboard;
