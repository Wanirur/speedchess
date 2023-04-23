import { observable } from "@trpc/server/observable";
import { createTRPCRouter, publicProcedure } from "../trpc";
import {
  type RatingTier,
  playersWaitingForMatch,
  resolveRatingToTier,
  matches,
} from "~/server/matchmaking";
import pusher from "~/server/pusher";
import { Game, type PlayerId } from "~/server/game";
import { z } from "zod";

export const chessgameRouter = createTRPCRouter({
  queueUp: publicProcedure
    .input(z.object({ timeControl: z.number().min(30).max(180) }))
    .mutation(async ({ ctx, input }) :Promise<{
      uuid: string,
      gameStarted: boolean,
    } | undefined> => {
      let tier = "guest" as RatingTier;
      let id = "guest";

      if (ctx.session) {
        id = ctx.session.user.id;
        //TODO: error handling
        const rating = await ctx.prisma.user
          .findUniqueOrThrow({
            where: {
              id: id,
            },
          })
          .then((user) => user?.rating);
        tier = resolveRatingToTier(rating);
      }

      const playerId = id === "guest" ? id : Number.parseInt(id);

      if (playersWaitingForMatch.has(tier)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const queue = playersWaitingForMatch.get(tier)!;
        if (queue.length > 0) {
          const game = queue.pop();
          //TODO: error handling
          if (!game) {
            return new Promise((resolve, reject) => {
              reject(new Error("game does not exist"))
            });
          }

          game.black = { id: playerId, secondsLeft: input.timeControl };
          matches.set(game.id, game);
          await pusher.trigger(game.id, "match_start", { matchId: game.id });
          return {
            uuid: game.id,
            gameStarted: true
          };
        } else {
          const game = new Game(playerId, input.timeControl);
          queue.push(game);
          return {
            uuid: game.id,
            gameStarted: false
          }
        }
      }
    }),
});
