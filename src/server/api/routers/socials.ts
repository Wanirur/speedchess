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
});
