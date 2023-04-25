import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import {
  type RatingTier,
  playersWaitingForMatch,
  resolveRatingToTier,
  matches,
} from "~/server/matchmaking";
import pusher from "~/server/pusher";
import { Game, PlayerId } from "~/server/game";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const chessgameRouter = createTRPCRouter({
  queueUp: publicProcedure
    .input(z.object({ timeControl: z.number().min(30).max(180) }))
    .mutation(async ({ ctx, input }) => {
      let tier = "guest" as RatingTier;
      let id = "guest";

      if (ctx.session) {
        id = ctx.session.user.id;
        try {
          const rating = await ctx.prisma.user
            .findUniqueOrThrow({
              where: {
                id: id,
              },
            })
            .then((user) => user?.rating);
          if (rating !== null) {
            tier = resolveRatingToTier(rating);
          }
        } catch (e) {
          console.error("no user with id: " + id + " in db");
        }
      }

      const playerId = id === "guest" ? id : Number.parseInt(id);

      if (playersWaitingForMatch.has(tier)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const queue = playersWaitingForMatch.get(tier)!;
        if (queue.length > 0) {
          if (
            playerId != "guest" &&
            queue[queue.length - 1]?.white.id === playerId
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "You are already in queue. Multiple tabs open?",
            });
          }
          const game = queue.pop();
          if (!game) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message:
                "Game you tried to join ceased to exist. Queue up again.",
            });
          }

          game.black = { id: playerId, secondsLeft: input.timeControl };
          matches.set(game.id, game);
          await pusher.trigger(game.id, "match_start", { matchId: game.id });
          return {
            uuid: game.id,
            gameStarted: true,
          };
        } else {
          const game = new Game(playerId, input.timeControl);
          queue.push(game);
          return {
            uuid: game.id,
            gameStarted: false,
          };
        }
      }
    }),
  getPlayerColor: protectedProcedure
    .input(z.object({ uuid: z.string() }))
    .query(({ ctx, input }) => {
      const user = ctx.session.user;
      const match = matches.get(input.uuid);
      if (!match) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The game does not exist",
        });
      }

      if (user.id === match.white.id) {
        return "white";
      }
      if (user.id === match.black.id) {
        return "black";
      }
      
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You are not a player",
      });
    }),
  movePiece: protectedProcedure
    .input(
      z.object({
        uuid: z.string().uuid(),
        fromTile: z.number().min(0).max(63),
        toTile: z.number().min(0).max(63),
        secondsUsed: z.number().min(30).max(180),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const match = matches.get(input.uuid);
      if (!match) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The game does not exist",
        });
      }
      if (user.id !== match.white.id && user.id !== match.black.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You are not a player",
        });
      }

      try {
        match.move(input.fromTile, input.toTile);
        await pusher.trigger(match.id, "move_made", {
          fromTile: input.fromTile,
          toTile: input.toTile,
        });
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid move",
        });
      }
    }),
});
