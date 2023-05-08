import { Search } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import pusherClient from "~/utils/pusherClient";

const QueueDisplay: React.FC<{ gameId: string }> = ({ gameId }) => {
  const router = useRouter();

  useEffect(() => {
    const onStart = (data: { matchId: string; timeControl: number }) => {
      void router.push(`/play/${data.matchId}`);
    };

    const channel = pusherClient.subscribe(gameId);
    channel.bind("match_start", onStart);
  }, [gameId, router]);

  return (
    <div className="flex h-8 w-max items-center bg-neutral-900 font-os text-white">
      <Search className="m-2 h-5 w-5 animate-pulse fill-neutral-400"></Search>{" "}
      Looking for opponent...
    </div>
  );
};

export default QueueDisplay;
