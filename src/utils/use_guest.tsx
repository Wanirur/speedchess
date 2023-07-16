import { type User } from "next-auth";
import { useEffect, useState } from "react";
import { useCookies } from "react-cookie";

const useGuestSession = () => {
  const [cookies] = useCookies(["guestId"]);
  const [guestId, setGuestId] = useState<string>();
  useEffect(() => {
    const id =
      typeof cookies.guestId === "string" ? cookies.guestId : undefined;
    if (id) {
      setGuestId(id);
    }
  }, [cookies.guestId]);

  if (!guestId) {
    return { isLoading: true, user: undefined };
  }

  const user: User = {
    id: guestId,
    name: "guest",
    rating: 1200,
  };

  return { isLoading: false, user: user };
};

export default useGuestSession;
