import { useEffect, useState } from "react";
import { type Tile, pieceImages, initBoard, movePiece } from "~/utils/pieces";
import Image from "next/image";

const Chessboard: React.FC = () => {
  const [tiles, setTiles] = useState<Tile[]>();
  const [isPlayerWhite, setIsPlayerWhite] = useState<boolean>(false);
  const [highlightedTile, setHighlightedTile] = useState<number | null>(null);
  const [draggedPiece, setDraggedPiece] = useState<number | null>(null);

  useEffect(() => {
    const pieces = initBoard();

    if (isPlayerWhite) {
      pieces.reverse();
    }

    setTiles(pieces);
  }, [isPlayerWhite]);

  return (
    <div className="container grid h-max w-max grid-cols-8 gap-0">
      {tiles &&
        tiles.map((tile, index) => {
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
                const tile = e.target;
                if (!(tile instanceof Element)) {
                  return;
                }

                if (!tiles[index]) {
                  return;
                }

                setDraggedPiece(index);
              }}
              onDrop={() => {
                if (draggedPiece === null) {
                  return;
                }

                movePiece(tiles, draggedPiece, index);
                setDraggedPiece(null);
              }}
              onClick={(e) => {
                const tile = e.target;
                if (!(tile instanceof Element)) {
                  return;
                }
                //no highlighted piece and clicked tile is empty - dont highlight
                if (highlightedTile === null && !tiles[index]) {
                  return;
                }

                if (highlightedTile !== null) {
                  setTiles(movePiece(tiles, highlightedTile, index));
                  setHighlightedTile(null);
                  return;
                }

                setHighlightedTile(index);
              }}
            >
              {tile && pieceImages.get(tile) && (
                <Image
                  src={pieceImages.get(tile) as string}
                  alt={tile.pieceType}
                  fill
                  className="cursor-pointer"
                ></Image>
              )}
            </div>
          );
        })}
    </div>
  );
};

export default Chessboard;
