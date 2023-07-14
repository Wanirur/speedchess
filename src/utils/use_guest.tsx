import { type User } from "next-auth";
import { useCookies } from "react-cookie";

const useGuestSession = () => {
  const [cookies] = useCookies(["guestId"]);

  const id = typeof cookies.guestId === "string" ? cookies.guestId : undefined;

  if (!id) {
    return { isLoading: true, user: undefined };
  }

  const user: User = {
    id: id,
    name: "guest",
    rating: 1200,
  };

  return { isLoading: false, user: user };
};

export default useGuestSession;
