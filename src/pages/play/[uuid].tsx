import { type NextPage } from "next";
import { useRouter } from "next/router";
import Chessboard from "~/components/chessboard";
import Timer from "~/components/timer";

const Play: NextPage = () => {
  const router = useRouter();
  const { uuid } = router.query;

  return (
    <main className="flex min-h-screen flex-row items-center justify-center bg-neutral-900">
      {router.isReady && <Chessboard uuid={uuid as string}></Chessboard>}
      <div className="flex h-[640px] w-max flex-col justify-center px-4">
        <Timer></Timer>
        <div className="h-full w-72 bg-neutral-700"></div>
        <div className="flex flex-row items-center justify-center gap-2 p-8">
          <button className="rounded-md bg-yellow-600 px-5 py-3 font-os text-white">
            {" "}
            draw{" "}
          </button>
          <button className="rounded-md bg-red-900 px-5 py-3 font-os text-white">
            {" "}
            resign{" "}
          </button>
        </div>
        <Timer></Timer>
      </div>
    </main>
  );
};

export default Play;
