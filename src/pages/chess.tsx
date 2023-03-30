import { type NextPage } from "next";
import { useEffect, useState } from "react";
import Chessboard from "~/components/chessboard";

const Play: NextPage = () => {
  return (
    <main className="flex min-h-screen flex-row items-center justify-center bg-neutral-900">
      <Chessboard></Chessboard>
      <div className="flex h-max w-max flex-col justify-center p-4">
        <div className="h-72 w-72 bg-neutral-700"></div>
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
      </div>
    </main>
  );
};

export default Play;
