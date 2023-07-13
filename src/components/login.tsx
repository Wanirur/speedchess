import { getProviders, signIn } from "next-auth/react";
import Link from "next/link";
import { type HTMLAttributes, useEffect, useState } from "react";
import Image from "next/image";
import Logo from "~/components/logo";
import { twMerge } from "tailwind-merge";

const Login: React.FC<HTMLAttributes<HTMLDivElement>> = ({ className }) => {
  const [providers, setProviders] =
    useState<Awaited<ReturnType<typeof getProviders>>>();

  useEffect(() => {
    void getProviders().then((prov) => {
      setProviders(prov);
    });
  }, []);

  return (
    <div
      className={twMerge(
        "flex flex-col items-center justify-center gap-10 bg-neutral-800 px-10 ",
        className
      )}
    >
      <Logo></Logo>

      <section className="text-center font-os text-sm text-white">
        Logging in allows you to play ranked games, access your game history and
        analyze your games with chess engine
      </section>

      <div className="flex flex-col gap-3">
        {providers &&
          Object.values(providers).map((provider) => (
            <div key={provider.name}>
              {provider.name === "Discord" && (
                <button
                  className="flex h-14 w-56 items-center justify-center gap-5 rounded-md  bg-[#5865F2]  font-os text-white hover:bg-indigo-700"
                  onClick={() => void signIn(provider.id, { callbackUrl: "/" })}
                >
                  <Image
                    src={"/discord-mark-white.svg"}
                    alt="discord"
                    width={30}
                    height={30}
                  ></Image>
                  Login with Discord
                </button>
              )}

              {provider.name === "Google" && (
                <button
                  className="flex h-14 w-56 items-center justify-center gap-5 rounded-md bg-white  font-os  hover:bg-gray-200"
                  onClick={() => void signIn(provider.id, { callbackUrl: "/" })}
                >
                  <Image
                    src={"/google-logo.svg"}
                    alt="google"
                    width={30}
                    height={30}
                  ></Image>
                  Login with Google
                </button>
              )}
            </div>
          ))}
      </div>

      <div>
        <Link
          className="font-os font-bold text-green-700 hover:text-white"
          href="/"
        >
          Play as guest instead
        </Link>
      </div>
    </div>
  );
};

export default Login;
