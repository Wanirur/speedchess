import { XCircle } from "lucide-react";
import { type HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

const ErrorDisplay: React.FC<
  HTMLAttributes<HTMLDivElement> & { message?: string }
> = ({ className, message = "Unexpected error occured. Please refresh." }) => {
  return (
    <div
      className={twMerge(
        "flex items-center justify-center gap-3 font-os text-red-400 md:text-xl",
        className
      )}
    >
      <XCircle></XCircle>
      {message}
    </div>
  );
};

export default ErrorDisplay;
