import { createTRPCRouter } from "~/server/api/trpc";
import { chessgameRouter } from "./routers/chess";
import { socialsRouter } from "./routers/socials";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  chess: chessgameRouter,
  socials: socialsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
