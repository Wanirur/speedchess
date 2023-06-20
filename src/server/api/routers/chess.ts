import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import {
  playersWaitingForMatch,
  matches,
  findGame,
  queuedUpUsers,
  playingUsers,
} from "~/server/matchmaking";
import pusher from "~/server/pusher";
import { Game } from "~/server/game";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  PossiblePromotions,
  type PlayerColor,
  type PromotedPieceType,
} from "~/utils/pieces";
import { Coords } from "~/utils/coords";

export const chessgameRouter = createTRPCRouter({
  queueUp: publicProcedure
    .input(z.object({ timeControl: z.number().min(30).max(180) }))
    .mutation(async ({ ctx, input }) => {
      let rating = -1;
      let id = "guest";

      if (ctx.session) {
        id = ctx.session.user.id;
        try {
          const user = await ctx.prisma.user.findUniqueOrThrow({
            where: {
              id: id,
            },
          });

          if (user === null) {
            //it will throw anyway so will never happen
            return;
          }
          rating = user.rating ?? 1200;
        } catch (e) {
          console.error("no user with id: " + id + " in db");
        }
      }

      const queueMatchUuid = queuedUpUsers.get(id);
      if (queueMatchUuid) {
        return {
          uuid: queueMatchUuid,
          gameStarted: false,
        };
      }

      const matchUuid = playingUsers.get(id);
      if (matchUuid) {
        return {
          uuid: matchUuid,
          gameStarted: true,
        };
      }

      const game = findGame(id, rating);
      if (game) {
        game.black = {
          id: id,
          rating: rating,
          timeLeftInMilis: input.timeControl * 1000,
        };

        game.start();
        matches.set(game.id, game);
        queuedUpUsers.delete(id);
        playingUsers.set(game.white.id, game.id);
        playingUsers.set(game.black.id, game.id);

        await pusher.trigger(game.id, "match_start", {
          matchId: game.id,
          timeControl: input.timeControl,
        });
        return {
          uuid: game.id,
          gameStarted: true,
        };
      }

      const rounded = Math.round(rating / 100) * 100;
      const queue = playersWaitingForMatch.get(rounded);
      if (!queue) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Something went wrong",
        });
      }

      const newGame = new Game(id, rating, input.timeControl);
      queue.push(newGame);
      queuedUpUsers.set(id, newGame.id);
      return {
        uuid: newGame.id,
        gameStarted: false,
      };
    }),
  getGameState: protectedProcedure
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

      let whiteTime = match.white.timeLeftInMilis;
      let blackTime = match.black.timeLeftInMilis;
      const timeSinceLastMove = Date.now() - match.lastMoveTime;
      if (match.turn === match.white) {
        whiteTime -= timeSinceLastMove;
      } else {
        blackTime -= timeSinceLastMove;
      }

      return {
        board: match.chess.board,
        whiteMilisLeft: whiteTime,
        blackMilisLeft: blackTime,
        ratingWhite: match.white.rating,
        ratingBlack: match.black.rating,
        color: (user.id === match.white.id ? "WHITE" : "BLACK") as PlayerColor,
        turn: (match.turn === match.white ? "WHITE" : "BLACK") as PlayerColor,
      };
    }),
  movePiece: protectedProcedure
    .input(
      z.object({
        uuid: z.string().uuid(),
        fromTile: z.object({
          x: z.number().min(0).max(7),
          y: z.number().min(0).max(7),
        }),
        toTile: z.object({
          x: z.number().min(0).max(7),
          y: z.number().min(0).max(7),
        }),
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

      let time;
      const from = Coords.getInstance(input.fromTile.x, input.fromTile.y);
      if (!from) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Incorrect coordinates of moved piece",
        });
      }
      const to = Coords.getInstance(input.toTile.x, input.toTile.y);
      if (!to) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Incorrect coordinates of piece's destination",
        });
      }

      try {
        time = await match.move(from, to);
      } catch (e) {
        if (e instanceof Error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: e.message,
          });
        }

        return;
      }

      if (time <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Your time has run out",
        });
      }

      await pusher.trigger(match.id, "move_made", {
        fromTile: input.fromTile,
        toTile: input.toTile,
        timeLeftInMilis: time,
      });
    }),
  promoteTo: protectedProcedure
    .input(
      z.object({
        uuid: z.string().uuid(),
        promoteTo: z.string(),
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

      if (!PossiblePromotions.includes(input.promoteTo as PromotedPieceType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You tried to promote pawn to incorrect piece type",
        });
      }
      const promotionCoords = match.chess.pawnReadyToPromote;
      if (!promotionCoords) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No pawn possible to promote exists",
        });
      }

      try {
        await match.promote(input.promoteTo as PromotedPieceType);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: (e as Error).message,
        });
      }

      await pusher.trigger(match.id, "promoted_piece", {
        promotedTo: input.promoteTo,
        coords: promotionCoords,
      });
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

      const color = user.id === match.white.id ? "WHITE" : "BLACK";
      const resignation = match.resign(color);
      const event = pusher.trigger(match.id, "resign", { color: color });
      await Promise.all([resignation, event]);
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

      const color = match.white.id === user.id ? "WHITE" : "BLACK";
      const result = await match.offerDraw(color);
      if (result) {
        match.chess.drawAgreement();
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

      await pusher.trigger(match.id, "draw_refused", {});
    }),
  getOpponentsData: protectedProcedure
    .input(z.object({ uuid: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
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

      const opponent = user.id === match.white.id ? match.black : match.white;
      const opponentData = await ctx.prisma.user.findFirst({
        where: {
          id: opponent.id,
        },
      });

      if (!opponentData) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Cannot find opponent's data",
        });
      }

      return { ...opponentData, rating: opponent.rating };
    }),
});
