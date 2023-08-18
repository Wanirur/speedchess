import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import {
  matches,
  findGame,
  queuedUpUsers,
  playingUsers,
  addGameToQueue,
} from "~/server/matchmaking";
import pusher from "~/server/pusher";
import { MatchPairing } from "~/server/game";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  PossiblePromotions,
  type PlayerColor,
  type PromotedPieceType,
  type GameResult,
} from "~/utils/pieces";
import { Coords } from "~/utils/coords";
import { AlgebraicNotation } from "~/utils/notations";

export const chessgameRouter = createTRPCRouter({
  queueUp: publicProcedure
    .input(
      z.object({
        initialTime: z.number().min(30).max(180),
        increment: z.number().min(0).max(2),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let rating = -100;
      let id = "guest";
      let isRanked = false;

      if (ctx.session) {
        isRanked = true;
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
      } else if (ctx.guestId) {
        id = ctx.guestId;
      } else {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not logged in as guest",
        });
      }

      const queueMatchData = queuedUpUsers.get(id);
      if (queueMatchData) {
        if (queueMatchData.timeControl.initialTime === input.initialTime) {
          return {
            uuid: queueMatchData.gameId,
            gameStarted: false,
          };
        }

        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already in queue in different time control!",
        });
      }

      const matchData = playingUsers.get(id);
      if (matchData) {
        if (matchData.timeControl.initialTime === input.initialTime) {
          return {
            uuid: matchData.gameId,
            gameStarted: false,
          };
        }

        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already playing in different time control!",
        });
      }

      const timeControl = {
        initialTime: input.initialTime,
        increment: input.increment,
      };
      const game = findGame(id, rating, timeControl);
      if (game) {
        game.black = {
          id: id,
          rating: rating,
          timeLeftInMilis: input.initialTime * 1000,
        };

        game.start();
        matches.set(game.id, game);
        queuedUpUsers.delete(game.white.id);
        console.log(queuedUpUsers);

        playingUsers.set(game.white.id, {
          gameId: game.id,
          timeControl: timeControl,
        });
        playingUsers.set(game.black.id, {
          gameId: game.id,
          timeControl: timeControl,
        });
        console.log(playingUsers);

        await pusher.trigger(game.id, "match_start", {
          matchId: game.id,
          timeControl: input.initialTime,
        });
        return {
          uuid: game.id,
          gameStarted: true,
        };
      }

      const newGame = new MatchPairing(id, rating, timeControl, isRanked);
      addGameToQueue(rating, newGame);
      queuedUpUsers.set(id, { gameId: newGame.id, timeControl: timeControl });
      console.log(queuedUpUsers);
      return {
        uuid: newGame.id,
        gameStarted: false,
      };
    }),
  getGameState: protectedProcedure
    .input(z.object({ uuid: z.string().uuid() }))
    .query(({ ctx, input }) => {
      const user = ctx.session?.user ?? {
        id: ctx.guestId,
        rating: 1200,
        name: "guest",
      };
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
        moves: match.chess.history.moves
          .map((move) =>
            (move.move as AlgebraicNotation).toLongNotationString()
          )
          .join(" "),
        whiteMilisLeft: whiteTime,
        blackMilisLeft: blackTime,
        ratingWhite: match.white.rating,
        ratingBlack: match.black.rating,
        color: (user.id === match.white.id ? "WHITE" : "BLACK") as PlayerColor,
        turn: (match.turn === match.white ? "WHITE" : "BLACK") as PlayerColor,
        timeControl: {
          initialTime: match.initialTime,
          increment: match.increment,
        },
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
        socketId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session?.user ?? {
        id: ctx.guestId,
        rating: 1200,
        name: "guest",
      };
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
        await pusher.trigger(match.id, "timeout", {
          loser: match.turn === match.white ? "WHITE" : "BLACK",
        });

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Your time has run out",
        });
      }

      await pusher.trigger(
        match.id,
        "move_made",
        {
          fromTile: input.fromTile,
          toTile: input.toTile,
          whiteTimeLeftInMilis: match.white.timeLeftInMilis,
          blackTimeLeftInMilis: match.black.timeLeftInMilis,
        },
        {
          socket_id: input.socketId,
        }
      );
    }),
  promoteTo: protectedProcedure
    .input(
      z.object({
        uuid: z.string().uuid(),
        promoteTo: z.string(),
        socketId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session?.user ?? {
        id: ctx.guestId,
        rating: 1200,
        name: "guest",
      };

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
      const promotionCoords = match.chess.position.pawnReadyToPromote;
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

      await pusher.trigger(
        match.id,
        "promoted_piece",
        {
          promotedTo: input.promoteTo,
          coords: promotionCoords,
        },
        {
          socket_id: input.socketId,
        }
      );
    }),
  resign: protectedProcedure
    .input(z.object({ uuid: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session?.user ?? {
        id: ctx.guestId,
        rating: 1200,
        name: "guest",
      };
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
      const user = ctx.session?.user ?? {
        id: ctx.guestId,
        rating: 1200,
        name: "guest",
      };
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
      const user = ctx.session?.user ?? {
        id: ctx.guestId,
        rating: 1200,
        name: "guest",
      };
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

      match.refuseDraw();
      await pusher.trigger(match.id, "draw_refused", {});
    }),
  getOpponentsData: protectedProcedure
    .input(z.object({ uuid: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const user = ctx.session?.user ?? {
        id: ctx.guestId,
        rating: 1200,
        name: "guest",
      };
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

      if (!match.isRanked) {
        return { id: opponent.id, name: "guest", rating: opponent.rating };
      }

      const opponentData = await ctx.prisma.user.findFirst({
        where: {
          id: opponent.id,
        },
        select: {
          id: true,
          rating: true,
          name: true,
          image: true,
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
  getGameHistory: protectedProcedure
    .input(z.object({ id: z.number().nonnegative() }))
    .query(async ({ ctx, input }) => {
      const game = await ctx.prisma.game.findFirst({
        where: {
          id: input.id,
        },
      });

      if (!game) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No game with provided id was found",
        });
      }

      return {
        moves: game.moves,
        result: { winner: game.result, reason: game.reason } as GameResult,
      };
    }),
});
