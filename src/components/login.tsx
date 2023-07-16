import { getProviders, signIn } from "next-auth/react";
import { type HTMLAttributes, useEffect, useState } from "react";
import Image from "next/image";
import Logo from "~/components/logo";
import { twMerge } from "tailwind-merge";
import { api } from "~/utils/api";
import { useCookies } from "react-cookie";
import { useRouter } from "next/router";

const Login: React.FC<
  { callbackUrl?: string } & HTMLAttributes<HTMLDivElement>
> = ({ callbackUrl = "/", className }) => {
  const router = useRouter();

  const [providers, setProviders] =
    useState<Awaited<ReturnType<typeof getProviders>>>();

  useEffect(() => {
    void getProviders().then((prov) => {
      setProviders(prov);
    });
  }, []);

  const [cookies, setCookie] = useCookies(["guestId"]);
  const guestMutation = api.socials.loginAsGuest.useMutation({
    onSuccess: async (data) => {
      const date = new Date();
      const hours = date.getHours() + 3;
      date.setHours(hours);

      if (!cookies.guestId) {
        setCookie("guestId", data, {
          path: "/",
          expires: date,
          sameSite: "lax",
        });
      }

      await router.push(callbackUrl);
    },
  });

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
                  onClick={() =>
                    void signIn(provider.id, { callbackUrl: callbackUrl })
                  }
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
                  onClick={() =>
                    void signIn(provider.id, { callbackUrl: callbackUrl })
                  }
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

      <div
        className="cursor-pointer font-os font-bold text-green-700 hover:text-white"
        onClick={() => {
          guestMutation.mutate();
        }}
      >
        Play as guest instead
      </div>
    </div>
  );
};

export default Login;
