import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const socialsRouter = createTRPCRouter({
  getUser: publicProcedure
    .input(z.object({ playerId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userPromise = ctx.prisma.user.findFirst({
        where: {
          id: input.playerId,
        },
        select: {
          id: true,
          createdAt: true,
          image: true,
          rating: true,
          name: true,
        },
      });

      const countPromise = ctx.prisma.gameToUser.count({
        where: {
          userId: input.playerId,
        },
      });

      const [player, count] = await Promise.all([userPromise, countPromise]);

      if (!player) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No player with provided id found",
        });
      }

      return { ...player, gamesPlayed: count };
    }),
  getRecentGames: publicProcedure
    .input(
      z.object({
        playerId: z.string(),
        cursor: z.number().nonnegative().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (input.cursor === undefined || input.cursor === null) {
        return {
          games: [],
          nextCursor: undefined,
        };
      }
      const LIMIT = 10;

      let initialCursor: number | null = null;
      if (input.cursor === 0) {
        initialCursor = await ctx.prisma.game
          .aggregate({
            _max: {
              id: true,
            },
            where: {
              gameToUsers: {
                some: {
                  userId: input.playerId,
                },
              },
            },
          })
          .then((data) => data._max.id);

        if (!initialCursor) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "something went wrong",
          });
        }
      }

      const games = await ctx.prisma.game.findMany({
        take: LIMIT + 1,
        include: {
          gameToUsers: {
            select: {
              color: true,
              currentRating: true,
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        where: {
          gameToUsers: {
            some: {
              userId: input.playerId,
            },
          },
        },
        cursor: {
          id: initialCursor ?? input.cursor,
        },
        orderBy: {
          id: "desc",
        },
      });

      let nextCursor: number | undefined = undefined;
      if (games.length > LIMIT) {
        const nextItem = games.pop();
        nextCursor = nextItem!.id;
      }

      return {
        games,
        nextCursor,
      };
    }),
});
