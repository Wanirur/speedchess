import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { LogIn, LogOut, User } from "lucide-react";
import { type HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";
import Logo from "./logo";
import { useRouter } from "next/router";

const Header: React.FC<HTMLAttributes<HTMLDivElement>> = ({ className }) => {
  const router = useRouter();
  const { data: sessionData } = useSession();

  return (
    <header
      className={twMerge(
        "flex items-center bg-neutral-900 px-5 font-logo text-xl font-semibold text-green-800 sm:px-10 sm:text-2xl",
        className
      )}
    >
      <div className="flex w-1/2 items-center">
        <Logo className="gap-1 text-xl sm:gap-2 sm:text-2xl"></Logo>
      </div>
      <div className="flex w-1/2 items-center justify-end gap-4">
        {sessionData?.user?.image ? (
          <>
            <LogOut
              className="h-1/2 cursor-pointer hover:stroke-white 3xl:h-14 3xl:w-14"
              onClick={() => {
                void signOut();
              }}
            ></LogOut>
            <Link href={`/user/${sessionData?.user.id}`}>
              <User className="h-7 w-7 hover:stroke-white 3xl:h-14 3xl:w-14"></User>
            </Link>
            <div className="relative h-7 w-7 3xl:h-14 3xl:w-14">
              <Image
                src={sessionData.user.image}
                alt="avatar"
                fill
                className="rounded-full"
              ></Image>
            </div>
          </>
        ) : (
          <div
            onClick={() => {
              const path = router.asPath;
              if (path.startsWith("/login")) {
                return;
              }

              void router.push(
                `/login?callbackUrl=${encodeURIComponent(router.asPath)}`
              );
            }}
          >
            <LogIn className="h-1/2 cursor-pointer hover:stroke-white 3xl:h-14 3xl:w-14"></LogIn>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
