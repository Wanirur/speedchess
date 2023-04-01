import { useEffect, useState } from "react";
import { type Tile, type Piece } from "~/utils/pieces";

const Chessboard: React.FC = () => {
  const [tiles, setTiles] = useState<Tile[]>();
  const [isPlayerWhite, setIsPlayerWhite] = useState<boolean>(false);
  const [scale, setScale] = useState<number>(1);
  useEffect(() => {
    const pieces = [] as Tile[];
    for (let i = 0; i < 64; i++) {
      pieces.push(null);
    }

    if (!isPlayerWhite) {
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

            if (isWhite) {
              return <div key={index} className="h-20 w-20 bg-white"></div>;
            } else {
              return <div key={index} className="h-20 w-20 bg-green-500"></div>;
            }
          })}
      </div>
  );
};

export default Chessboard;
