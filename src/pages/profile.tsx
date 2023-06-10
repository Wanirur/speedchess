import { type NextPage } from "next";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { api } from "~/utils/api";

const Profile: NextPage = () => {
  const { data: sessionData } = useSession();
  const image = sessionData?.user.image;
  const { ref, inView } = useInView();

  const { isSuccess: isRatingSuccess, data: rating } =
    api.socials.getPlayerRating.useQuery(
      {
        playerId: sessionData?.user.id ?? "0",
      },
      {
        enabled: !!sessionData,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
      }
    );

  const { isSuccess: isCountSuccess, data: count } =
    api.socials.getGamesCount.useQuery(
      {
        playerId: sessionData?.user.id ?? "0",
      },
      {
        enabled: !!sessionData,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
      }
    );

  const { isSuccess: isDateSuccess, data: date } =
    api.socials.getPlayerAccountCreationDate.useQuery(
      {
        playerId: sessionData?.user.id ?? "0",
      },
      {
        enabled: !!sessionData,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
      }
    );

  const {
    isSuccess: isGamesSuccess,
    data: games,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = api.socials.getRecentGames.useInfiniteQuery(
    {
      playerId: sessionData?.user.id ?? "0",
    },
    {
      enabled: !!sessionData?.user.id,
      initialCursor: 0,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    }
  );

  useEffect(() => {
    const fetchPage = async () => {
      if (sessionData?.user.id) {
        await fetchNextPage();
      }
    };
    void fetchPage();
  }, [fetchNextPage, inView, sessionData]);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-900">
      <div className="flex items-end ">
        {image && (
          <Image
            src={image}
            alt={"avatar"}
            width={160}
            height={160}
            className="m-10 rounded-full"
          />
        )}

        <h1 className="m-10 font-os text-3xl font-bold text-white">
          {sessionData?.user.name}{" "}
        </h1>
      </div>
      <div className="m-10 flex gap-24">
        <div className="h-34 w-42 flex-col items-end justify-center text-center font-os text-xl text-white">
          {"Rating:"}
          <div className="m-auto mt-1 w-fit bg-green-800 px-8 py-4">
            {rating}
          </div>
        </div>

        <div className="h-34 w-42 flex-col items-end justify-center text-center font-os text-xl text-white">
          {"Games played:"}
          <div className="m-auto mt-1 w-fit bg-green-800 px-8 py-4">
            {count}
          </div>
        </div>
        <div className="h-34 w-42 flex-col items-end justify-center text-center font-os text-xl text-white">
          {"Account created at:"}
          <div className="m-auto mt-1 w-fit bg-green-800 px-8 py-4">
            {date?.toLocaleDateString()}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1 px-5 py-3">
        <div className="flex h-12 w-[52rem] items-center justify-start bg-neutral-800 font-os text-white">
          <span className="w-1/4 text-center"> {"Date:"} </span>
          <span className="w-[15%] text-center"> {"Result:"} </span>
          <span className="w-[15%] text-center"> {"Time control:"} </span>
          <span className="w-1/4 text-center"> {"Players:"} </span>
        </div>

        {isGamesSuccess && (
          <>
            {games.pages.map((page) => {
              return page.games.map((game) => {
                if (
                  !game.gameToUsers[0] ||
                  !game.gameToUsers[1] ||
                  !sessionData
                ) {
                  return;
                }

                let opponent, me;
                if (game.gameToUsers[0].user.id === sessionData?.user.id) {
                  me = game.gameToUsers[0];
                  opponent = game.gameToUsers[1];
                } else {
                  me = game.gameToUsers[1];
                  opponent = game.gameToUsers[0];
                }

                const color = me.color;
                let result;
                if (game.result === "DRAW") {
                  result = "Draw";
                } else if (game.result === color) {
                  result = "Win";
                } else {
                  result = "Lose";
                }

                const white = me.color === "WHITE" ? me : opponent;
                const black = me.color === "BLACK" ? me : opponent;

                let timeControl;
                if (game.timeControl === "BULLET") {
                  timeControl = "1";
                } else if (game.timeControl === "BULLET_INCREMENT") {
                  timeControl = "1 | 1";
                } else if (game.timeControl === "LONG_BULLET_INCREMENT") {
                  timeControl = "2 | 1";
                } else if (game.timeControl === "BLITZ") {
                  timeControl = "3";
                } else {
                  timeControl = "3 | 2";
                }

                return (
                  <div
                    key={game.id}
                    className="flex h-28 w-[52rem] items-center justify-center bg-neutral-800 font-os text-white"
                  >
                    <span className="w-1/4 text-center">
                      {game.finishedAt?.toLocaleString()}
                    </span>
                    <span className="w-[15%] text-center"> {result} </span>
                    <span className="w-[15%] text-center"> {timeControl} </span>
                    <div className="flex w-1/4 flex-col items-center justify-center">
                      <div className="flex items-center justify-center gap-1">
                        <div className="h-3 w-3 rounded-sm bg-white"></div>
                        {`${white.user.name ?? "unknown"} (${
                          white.currentRating ?? "?"
                        })`}
                      </div>
                      <span>{"vs"}</span>
                      <div className="flex items-center justify-center gap-1">
                        <div className="h-3 w-3 rounded-sm bg-black"></div>
                        {`${black.user.name ?? "unknown"} (${
                          black.currentRating ?? "?"
                        })`}
                      </div>
                    </div>
                    <div className="flex w-1/5 items-center justify-center">
                      <button className="h-12 w-24 rounded-md bg-green-800">
                        Analyze
                      </button>
                    </div>
                  </div>
                );
              });
            })}
            {hasNextPage && !isFetchingNextPage && (
              <div ref={ref} className="h-1 w-1 bg-transparent"></div>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default Profile;
