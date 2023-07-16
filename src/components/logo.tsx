import { Timer } from "lucide-react";
import Link from "next/link";
import { type HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

const Logo: React.FC<HTMLAttributes<HTMLDivElement>> = ({ className }) => {
  return (
    <div
      className={twMerge(
        "flex items-center justify-center gap-2 font-os text-xl font-bold text-green-800",
        className
      )}
    >
      <Timer></Timer>
      <Link href="/">
        speedchess<span className="opacity-60">.net</span>
      </Link>
    </div>
  );
};

export default Logo;
