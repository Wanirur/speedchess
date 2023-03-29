import { type NextPage } from "next";
import { useEffect, useState } from "react";

const Chessboard: NextPage = () => {
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
    <main className="flex justify-center min-h-screen bg-neutral-900">
      <div className="container grid w-max grid-cols-8 gap-0">
        {tiles &&
          tiles.map((tile, index) =>
            tile ? (
              <div key={index} className="h-24 w-24 bg-white"></div>
            ) : (
              <div key={index} className="h-24 w-24 bg-green-500"></div>
            )
          )}
      </div>
    </main>
  );
};

export default Chessboard;
