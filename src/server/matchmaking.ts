/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { type TimeControlName } from "@prisma/client";
import { type MatchPairing } from "./game";
import { type TimeControl } from "~/chess/utils";

export const playersWaitingForMatch = new Map<
  TimeControlName,
  Map<number, MatchPairing[]>
>();
playersWaitingForMatch.set("BULLET", new Map<number, MatchPairing[]>());
playersWaitingForMatch.set(
  "BULLET_INCREMENT",
  new Map<number, MatchPairing[]>()
);
playersWaitingForMatch.set(
  "LONG_BULLET_INCREMENT",
  new Map<number, MatchPairing[]>()
);
playersWaitingForMatch.set("BLITZ", new Map<number, MatchPairing[]>());
playersWaitingForMatch.set(
  "BLITZ_INCREMENT",
  new Map<number, MatchPairing[]>()
);

const ratingBuckets = Array.from({ length: 31 }, (x, i) => (i - 1) * 100); // expected to get array [-100, 0, 100, 200, ..., 3000], negative represents unranked queue
const queueBullet = playersWaitingForMatch.get("BULLET")!;
const queueBulletIncrement = playersWaitingForMatch.get("BULLET_INCREMENT")!;
const queueLongBulletIncrement = playersWaitingForMatch.get(
  "LONG_BULLET_INCREMENT"
)!;
const queueBlitz = playersWaitingForMatch.get("BLITZ")!;
const queueBlitzIncrement = playersWaitingForMatch.get("BLITZ_INCREMENT")!;

ratingBuckets.forEach((item) => {
  queueBullet.set(item, [] as MatchPairing[]);
  queueBulletIncrement.set(item, [] as MatchPairing[]);
  queueLongBulletIncrement.set(item, [] as MatchPairing[]);
  queueBlitz.set(item, [] as MatchPairing[]);
  queueBlitzIncrement.set(item, [] as MatchPairing[]);
});

const resolveTimeControlToName = (timeControl: TimeControl) => {
  const time = timeControl.initialTime;
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
): MatchPairing | undefined => {
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

export const addGameToQueue = (rating: number, game: MatchPairing) => {
  const rounded = Math.round(rating / 100) * 100;
  const timeControlName = resolveTimeControlToName({
    initialTime: game.initialTime,
    increment: game.increment,
  });

  const correctTimeControlQueue = playersWaitingForMatch.get(timeControlName);
  const correctRatingQueue = correctTimeControlQueue?.get(rounded);
  correctRatingQueue?.push(game);
};

export const queuedUpUsers = new Map<
  string,
  { gameId: string; timeControl: TimeControl }
>(); // key: userId, value: {gameId, timeControl}
export const matches = new Map<string, MatchPairing>();
export const playingUsers = new Map<
  string,
  { gameId: string; timeControl: TimeControl }
>(); // key: userId, value: {gameId, timeControl}
export const abandonTimeouts = new Map<string, NodeJS.Timeout>();
export const guestUsers = new Map<string, NodeJS.Timeout>();
