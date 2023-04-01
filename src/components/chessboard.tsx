import { useEffect, useState } from "react";
import { type Tile, pieceImages, initBoard } from "~/utils/pieces";
import Image from "next/image";

const Chessboard: React.FC = () => {
  const [tiles, setTiles] = useState<Tile[]>();
  const [isPlayerWhite, setIsPlayerWhite] = useState<boolean>(true);
  useEffect(() => {
    const pieces = initBoard();

    if (isPlayerWhite) {
      pieces.reverse();
    }

    setTiles(pieces);
    console.log(pieces);
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

          if (isWhite) {
            return (
              <div key={index} className="relative h-20 w-20 bg-white">
                {tile && pieceImages.get(tile) && (
                  <Image
                    src={pieceImages.get(tile) as string}
                    alt={tile.pieceType}
                    fill
                  ></Image>
                )}
              </div>
            );
          } else {
            return (
              <div key={index} className="relative h-20 w-20 bg-green-500">
                {tile && pieceImages.get(tile) && (
                  <Image
                    src={pieceImages.get(tile) as string}
                    alt={tile.pieceType}
                    fill
                  ></Image>
                )}
              </div>
            );
          }
        })}
    </div>
  );
};

export default Chessboard;
