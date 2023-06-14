import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { LogOut, User } from "lucide-react";
import { type HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

const Header: React.FC<HTMLAttributes<HTMLDivElement>> = ({ className }) => {
  const { data: sessionData } = useSession();

  return (
    <header
      className={twMerge(
        "flex items-center bg-neutral-900 px-10 font-logo text-2xl font-semibold text-green-800",
        className
      )}
    >
      <div className="flex w-1/2 items-center">
        <Link href="/">
          speedchess<span className="opacity-60">.net</span>{" "}
        </Link>
      </div>
      {sessionData?.user?.image && (
        <div className="flex w-1/2 items-center justify-end gap-4">
          <LogOut
            className="h-7 w-7 cursor-pointer hover:stroke-white"
            onClick={() => {
              void signOut();
            }}
          ></LogOut>
          <Link href={`/user/${sessionData?.user.id}`}>
            <User className="h-7 w-7 hover:stroke-white "></User>
          </Link>
          <Image
            src={sessionData.user.image}
            alt="avatar"
            width={42}
            height={42}
            className="rounded-full"
          ></Image>
        </div>
      )}
    </header>
  );
};

export default Header;
