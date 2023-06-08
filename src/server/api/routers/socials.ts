import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const socialsRouter = createTRPCRouter({
  getPlayerRating: publicProcedure
    .input(z.object({ playerId: z.string() }))
    .query(async ({ ctx, input }) => {
      const player = await ctx.prisma.user.findFirst({
        where: {
          id: input.playerId,
        },
      });

      if (!player) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No player with provided id found",
        });
      }

      return player.rating;
    }),

  getPlayerAccountCreationDate: publicProcedure
    .input(z.object({ playerId: z.string() }))
    .query(async ({ ctx, input }) => {
      const player = await ctx.prisma.user.findFirst({
        where: {
          id: input.playerId,
        },
      });

      if (!player) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No player with provided id found",
        });
      }

      return player.createdAt;
    }),
  getGamesCount: publicProcedure
    .input(z.object({ playerId: z.string() }))
    .query(async ({ ctx, input }) => {
      const count = await ctx.prisma.gameToUser.count({
        where: {
          userId: input.playerId,
        },
      });

      return count;
    }),
  getRecentGames: publicProcedure
    .input(z.object({ playerId: z.string(), cursor: z.number().nullish() }))
    .query(async ({ ctx, input }) => {
      const LIMIT = 10;

      const games = await ctx.prisma.game.findMany({
        take: -(LIMIT + 1),
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
          id: input.cursor ?? 1,
        },
        orderBy: {
          finishedAt: "desc",
        },
      });

      let nextCursor;
      if (games.length > LIMIT) {
        nextCursor = games.pop()?.id;
      }

      return {
        games,
        nextCursor,
      };
    }),
});
