import { Loader } from "lucide-react";
import { type HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

const EvalBar: React.FC<
  {
    evaluation: number;
    lines: string[][];
    evals: number[];
  } & HTMLAttributes<HTMLDivElement>
> = ({ className, evaluation, lines, evals }) => {
  if (
    !lines[0] ||
    !lines[1] ||
    !lines[2] ||
    !evals[0] ||
    !evals[1] ||
    !evals[2]
  ) {
    return (
      <div className="flex h-1/6 w-full items-center justify-center">
        <Loader className="h-10 w-10 animate-spin stroke-white"></Loader>
      </div>
    );
  }

  const stringifiedLines = lines.map((line) => line.join(" "));

  let message = "Draw";
  if (evaluation < 0) {
    if (Math.abs(evaluation) < 1) {
      message = "Black has slight advantage";
    } else {
      message = "Black is winning";
    }
  } else if (evaluation > 0) {
    if (Math.abs(evaluation) < 1) {
      message = "White has slight advantage";
    } else {
      message = "White is winning";
    }
  }

  return (
    <div className={twMerge("flex flex-col", className)}>
      <div className="flex h-2/5 w-full items-center justify-center gap-8 p-3 font-bold">
        <div className="w-1/3 px-5 md:text-2xl lg:text-3xl">
          {new Intl.NumberFormat("en-US", { signDisplay: "exceptZero" }).format(
            evaluation
          )}
        </div>
        <div className="w-2/3 font-semibold md:text-sm">{message}</div>
      </div>
      <div className="flex h-3/5 flex-col text-xs font-light lg:text-sm">
        <div className="h-1/3 w-full gap-1 truncate p-1">
          <span className="px-2 font-bold">
            {new Intl.NumberFormat("en-US", {
              signDisplay: "exceptZero",
            }).format(evals[0])}
          </span>
          {stringifiedLines[0]}
        </div>
        <div className="h-1/3 w-full gap-1 truncate p-1">
          <span className="px-2 font-bold">
            {new Intl.NumberFormat("en-US", {
              signDisplay: "exceptZero",
            }).format(evals[1])}
          </span>
          {stringifiedLines[1]}
        </div>
        <div className="h-1/3 w-full gap-1 truncate p-1">
          <span className="px-2 font-bold">
            {new Intl.NumberFormat("en-US", {
              signDisplay: "exceptZero",
            }).format(evals[2])}
          </span>
          {stringifiedLines[2]}
        </div>
      </div>
    </div>
  );
};

export default EvalBar;
