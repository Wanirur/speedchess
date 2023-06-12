import { User as UserIcon } from "lucide-react";
import { type User } from "next-auth";
import Link from "next/link";

const UserBanner: React.FC<{
  user: User;
}> = ({ user }) => {
  return (
    <div className="flex h-16 w-full items-center bg-neutral-800 px-5 py-1 font-os font-light text-white">
      <div className="group flex w-1/2 items-center gap-3">
        <Link href={`/user/${user.id}`} target="_blank">
          {user.name}
        </Link>
        <UserIcon className="h-5 w-5 fill-gray-600 stroke-gray-600 group-hover:fill-white group-hover:stroke-white"></UserIcon>
      </div>
      <div className="w-1/2 text-right">{user.rating}</div>
    </div>
  );
};

export default UserBanner;
