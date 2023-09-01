import { Loader2 } from "lucide-react";
import { type HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

const LoadingDisplay: React.FC<
  HTMLAttributes<HTMLDivElement> & { message?: string }
> = ({ className, message = "Loading..." }) => {
  return (
    <div
      className={twMerge(
        "flex items-center gap-3 font-os text-2xl text-white",
        className
      )}
    >
      <Loader2 className="animate-spin"></Loader2>
      {message}
    </div>
  );
};

export default LoadingDisplay;
