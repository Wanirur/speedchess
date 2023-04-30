import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import {
  type RatingTier,
  playersWaitingForMatch,
  resolveRatingToTier,
  matches,
} from "~/server/matchmaking";
import pusher from "~/server/pusher";
import { Game } from "~/server/game";
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

      if (playersWaitingForMatch.has(tier)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const queue = playersWaitingForMatch.get(tier)!;
        if (queue.length > 0) {
          if (id != "guest" && queue[queue.length - 1]?.white.id === id) {
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

          game.black = { id: id, secondsLeft: input.timeControl };
          matches.set(game.id, game);
          await pusher.trigger(game.id, "match_start", { matchId: game.id });
          return {
            uuid: game.id,
            gameStarted: true,
          };
        } else {
          const game = new Game(id, input.timeControl);
          queue.push(game);
          return {
            uuid: game.id,
            gameStarted: false,
          };
        }
      }
    }),
  getStartingData: protectedProcedure
    .input(z.object({ uuid: z.string().uuid() }))
    .query(({ ctx, input }) => {
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

      const color = user.id === match.white.id ? "white" : "black";

      return {
        board: match.board,
        color: color,
        isTurnYours: match.turn.id === user.id,
        whiteSecondsLeft: match.white.secondsLeft,
        blackSecondsLeft: match.black.secondsLeft,
      };
    }),
  movePiece: protectedProcedure
    .input(
      z.object({
        uuid: z.string().uuid(),
        fromTile: z.object({
          x: z.number().min(0).max(7),
          y: z.number().min(0).max(7)
        }),
        toTile: z.object({
          x: z.number().min(0).max(7),
          y: z.number().min(0).max(7)
        }),
        secondsUsed: z.number().nonnegative(),
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

      if (user.id !== match.turn.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Not your turn!",
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
  resign: protectedProcedure
    .input(z.object({ uuid: z.string().uuid() }))
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

      await pusher.trigger(match.id, "resign", {});
    }),
  offerDraw: protectedProcedure
    .input(z.object({ uuid: z.string().uuid() }))
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

      const color = match.white.id === user.id ? "white" : "black";
      const result = match.offerDraw(color);
      if(result === "draw") {
        await pusher.trigger(match.id, "draw", {});
      } else {
        await pusher.trigger(match.id, "draw_offer", { color: color });
      }
    }),
  refuseDraw: protectedProcedure
    .input(z.object({ uuid: z.string().uuid() }))
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

      await pusher.trigger(match.id, "draw_refused", {})
    }),
});
