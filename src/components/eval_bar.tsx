import { Loader } from "lucide-react";
import { type HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";
import { type BestChessLine } from "~/context/stockfish_provider";

const EvalBar: React.FC<
  {
    lines: BestChessLine[];
    depth: number;
    engineName: string;
  } & HTMLAttributes<HTMLDivElement>
> = ({ className, lines, engineName, depth }) => {
  if (!lines[0] || !lines[1] || !lines[2]) {
    console.log(lines);
    return (
      <div className="flex h-1/6 w-full items-center justify-center">
        <Loader className="h-10 w-10 animate-spin stroke-white"></Loader>
      </div>
    );
  }

  const stringifiedLines = lines.map((line) => line.moves.join(" "));

  const mateIn = lines[0].mateIn;
  const evaluation = lines[0].evaluation;

  let message = "";
  if (mateIn) {
    message = `Mate in ${mateIn}`;
  } else if (evaluation !== undefined && evaluation < 0) {
    if (Math.abs(evaluation) < 1) {
      message = "Black has slight advantage";
    } else {
      message = "Black is winning";
    }
  } else if (evaluation !== undefined && evaluation > 0) {
    if (Math.abs(evaluation) < 1) {
      message = "White has slight advantage";
    } else {
      message = "White is winning";
    }
  } else {
    message = "Draw";
  }

  return (
    <div className={twMerge("flex flex-col", className)}>
      <div className="hidden h-1/5 px-3 py-0.5 text-sm font-thin lg:block">
        {engineName}
        <br></br>
        {`current depth: ${depth}`}{" "}
      </div>
      <div className={"flex h-full flex-col p-0.5 lg:h-4/5 lg:pt-1.5"}>
        <div className="flex h-2/5 w-full items-center justify-center gap-8 p-3 font-bold">
          <div className="w-1/3 px-5 py-3 md:text-2xl lg:text-3xl">
            {evaluation !== undefined
              ? new Intl.NumberFormat("en-US", {
                  signDisplay: "exceptZero",
                }).format(evaluation)
              : `M${lines[0].mateIn!}`}
          </div>
          <div className="w-2/3 text-xs font-semibold lg:text-base">
            {message}
          </div>
        </div>
        <div className="flex h-3/5 flex-col text-xs font-light lg:text-sm">
          <div className="h-1/3 w-full gap-1 truncate p-0.5">
            <span className="px-2 font-bold">
              {lines[0].evaluation !== undefined
                ? new Intl.NumberFormat("en-US", {
                    signDisplay: "exceptZero",
                  }).format(lines[0].evaluation)
                : `M${lines[0].mateIn!}`}
            </span>
            {stringifiedLines[0]}
          </div>
          <div className="h-1/3 w-full gap-1 truncate p-0.5">
            <span className="px-2 font-bold">
              {lines[1].evaluation !== undefined
                ? new Intl.NumberFormat("en-US", {
                    signDisplay: "exceptZero",
                  }).format(lines[1].evaluation)
                : `M${lines[1].mateIn!}`}
            </span>
            {stringifiedLines[1]}
          </div>
          <div className="h-1/3 w-full gap-1 truncate p-0.5">
            <span className="px-2 font-bold">
              {lines[2].evaluation !== undefined
                ? new Intl.NumberFormat("en-US", {
                    signDisplay: "exceptZero",
                  }).format(lines[2].evaluation)
                : `M${lines[2].mateIn!}`}
            </span>
            {stringifiedLines[2]}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvalBar;
