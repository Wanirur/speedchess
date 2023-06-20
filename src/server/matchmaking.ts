/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TimeControlName } from "@prisma/client";
import { type Game } from "./game";
import { TimeControl } from "~/utils/pieces";

export const playersWaitingForMatch = new Map<
  TimeControlName,
  Map<number, Game[]>
>();
playersWaitingForMatch.set("BULLET", new Map<number, Game[]>());
playersWaitingForMatch.set("BULLET_INCREMENT", new Map<number, Game[]>());
playersWaitingForMatch.set("LONG_BULLET_INCREMENT", new Map<number, Game[]>());
playersWaitingForMatch.set("BLITZ", new Map<number, Game[]>());
playersWaitingForMatch.set("BLITZ_INCREMENT", new Map<number, Game[]>());

const ratingBuckets = Array.from({ length: 30 }, (x, i) => i * 100); // expected to get array [0, 100, 200, ..., 3000]
const queueBullet = playersWaitingForMatch.get("BULLET")!;
const queueBulletIncrement = playersWaitingForMatch.get("BULLET_INCREMENT")!;
const queueLongBulletIncrement = playersWaitingForMatch.get(
  "LONG_BULLET_INCREMENT"
)!;
const queueBlitz = playersWaitingForMatch.get("BLITZ")!;
const queueBlitzIncrement = playersWaitingForMatch.get("BLITZ_INCREMENT")!;

ratingBuckets.forEach((item) => {
  queueBullet.set(item, [] as Game[]);
  queueBulletIncrement.set(item, [] as Game[]);
  queueLongBulletIncrement.set(item, [] as Game[]);
  queueBlitz.set(item, [] as Game[]);
  queueBlitzIncrement.set(item, [] as Game[]);
});

const resolveTimeControlToName = (timeControl: TimeControl) => {
  const time = timeControl.startingTime;
  const inc = timeControl.increment;

  if (time === 60 && inc === 0) {
    return "BULLET";
  } else if (time === 60 && inc === 1) {
    return "BULLET_INCREMENT";
  } else if (time === 120 && inc === 1) {
    return "LONG_BULLET_INCREMENT";
  } else if (time === 180 && inc === 0) {
    return "BLITZ";
  } else {
    return "BLITZ_INCREMENT";
  }
};

export const findGame = (
  id: string,
  rating: number,
  timeControl: TimeControl
): Game | undefined => {
  const rounded = Math.round(rating / 100) * 100;
  const queue = playersWaitingForMatch.get(
    resolveTimeControlToName(timeControl)
  )!;
  let currentBucketQueue = queue.get(rounded);
  if (currentBucketQueue?.length) {
    const opponentsIndex = currentBucketQueue.findIndex(
      (game) => game.white.id !== id
    );
    console.log(opponentsIndex);
    if (opponentsIndex !== -1) {
      return currentBucketQueue.splice(opponentsIndex, 1)[0];
    }
  }
  currentBucketQueue = queue.get(rounded + 100);
  if (currentBucketQueue?.length) {
    const opponentsIndex = currentBucketQueue.findIndex(
      (game) => game.white.id !== id
    );
    console.log(opponentsIndex);

    if (opponentsIndex !== -1) {
      return currentBucketQueue.splice(opponentsIndex, 1)[0];
    }
  }
  currentBucketQueue = queue.get(rounded - 100);
  if (currentBucketQueue?.length) {
    const opponentsIndex = currentBucketQueue.findIndex(
      (game) => game.white.id !== id
    );
    console.log(opponentsIndex);

    if (opponentsIndex !== -1) {
      return currentBucketQueue.splice(opponentsIndex, 1)[0];
    }
  }

  return undefined;
};

export const addGameToQueue = (rating: number, game: Game) => {
  const rounded = Math.round(rating / 100) * 100;
  const timeControlName = resolveTimeControlToName({
    startingTime: game.initialTime,
    increment: game.increment,
  });

  const correctTimeControlQueue = playersWaitingForMatch.get(timeControlName);
  const correctRatingQueue = correctTimeControlQueue?.get(rounded);
  correctRatingQueue?.push(game);
};

export const queuedUpUsers = new Map<string, {gameId: string, timeControl: TimeControl }>(); // key: userId, value: {gameId, timeControl}
export const matches = new Map<string, Game>();
export const playingUsers = new Map<string, {gameId: string, timeControl: TimeControl }>(); // key: userId, value: {gameId, timeControl}
export const abandonTimeouts = new Map<string, NodeJS.Timeout>();
