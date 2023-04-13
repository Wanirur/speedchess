import { observable } from "@trpc/server/observable";
import { createTRPCRouter, publicProcedure } from "../trpc";
import {
  type RatingTier,
  playersWaitingForMatch,
  resolveRatingToTier,
  matches,
} from "~/server/matchmaking";
import pusher, { pusherClient } from "~/server/websocket/pusher";
import { Game, type PlayerId } from "~/server/game";
import { z } from "zod";

export const chessgameRouter = createTRPCRouter({
  onStart: publicProcedure
    .input(z.string().uuid())
    .subscription(({ input }) => {
      return observable<string>((emit) => {
        const onStart = (data: string) => {
          emit.next(data);
        };

        const channel = pusherClient.channel(input);
        channel.bind("match_start", onStart);
      });
    }),

  queueUp: publicProcedure
    .input(z.number().min(30).max(180))
    .mutation(async ({ ctx, input }) => {
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
            return;
          }
          game.black = { id: playerId, secondsLeft: input };
          matches.set(game.id, game);
          await pusher.trigger(game.id, "match_start", { matchId: game.id });
        } else {
          const game = new Game(playerId, input);
          queue.push(game);
        }
      }
    }),
});
