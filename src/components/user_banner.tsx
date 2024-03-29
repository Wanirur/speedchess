import { Cpu, User as UserIcon } from "lucide-react";
import { type User } from "next-auth";
import Link from "next/link";
import { type HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

const UserBanner: React.FC<
  {
    user: User;
    isGuest?: boolean;
  } & HTMLAttributes<HTMLDivElement>
> = ({ user, className, isGuest = false }) => {
  const icon = isGuest ? (
    <UserIcon className="h-5 w-5 fill-gray-600 stroke-gray-600 hover:fill-white hover:stroke-white"></UserIcon>
  ) : (
    <Link href={`/user/${user.id}`} target="_blank">
      <UserIcon className="h-5 w-5 fill-gray-600 stroke-gray-600 hover:fill-white hover:stroke-white"></UserIcon>
    </Link>
  );

  return (
    <div
      className={twMerge(
        "flex h-16 w-full items-center bg-neutral-800 px-5 py-1 font-os font-light text-white",
        className
      )}
    >
      <div className="flex w-1/2 items-center gap-3">
        {user.name}
        {user.id === "bot" ? (
          <Cpu className="h-5 w-5  stroke-gray-600  hover:stroke-white"></Cpu>
        ) : (
          icon
        )}
      </div>
      {!isGuest && <div className="w-1/2 text-right">{user.rating}</div>}
    </div>
  );
};

export default UserBanner;
