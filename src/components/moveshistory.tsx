import { type AlgebraicNotation } from "~/utils/notations";

const MovesHistory: React.FC<{
  moves: AlgebraicNotation[];
}> = ({ moves }) => {
  return (
    <div className="font-white flex h-full w-full flex-wrap content-start gap-y-1 gap-x-1 p-3 font-os text-sm">
      {moves.map((move, index) => {
        const stringifiedMove = move.toString();
        let result;
        if (index % 2) {
          result = stringifiedMove;
        } else {
          result =
            (Math.floor(index / 2) + 1).toString() + ". " + stringifiedMove;
        }

        return (
          <div
            key={index}
            className="h-fit w-fit cursor-pointer whitespace-nowrap rounded-sm p-1 hover:bg-neutral-500 "
          >
            {" "}
            {result}
          </div>
        );
      })}
    </div>
  );
};

export default MovesHistory;
