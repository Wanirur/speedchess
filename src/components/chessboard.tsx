import { useEffect, useState } from "react";

const Chessboard: React.FC = () => {
  //contains tile colors - true means white, otherwise green
  const [tiles, setTiles] = useState<boolean[]>();

  useEffect(() => {
    const tiles = [];
    for (let i = 0; i < 64; i++) {
      let tileColor = i % 2 == 0;

      if (Math.floor(i / 8) % 2) {
        tileColor = !tileColor;
      }

      tiles.push(tileColor);
    }

    setTiles(tiles);
  }, []);

  return (
    <div className="container grid h-max w-max grid-cols-8 gap-0">
      {tiles &&
        tiles.map((tile, index) =>
          tile ? (
            <div key={index} className="h-20 w-20 bg-white"></div>
          ) : (
            <div key={index} className="h-20 w-20 bg-green-500"></div>
          )
        )}
    </div>
  );
};

export default Chessboard;
