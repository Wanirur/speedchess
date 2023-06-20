import { type Game } from "./game";

const ratingBuckets = Array.from({ length: 30 }, (x, i) => i * 100); // expected to get array [0, 100, 200, ..., 3000]
const queue = new Map<number, Game[]>();
ratingBuckets.forEach((item) => {
  queue.set(item, [] as Game[]);
});

export const playersWaitingForMatch = queue;
export const findGame = (id: string, rating: number): Game | undefined => {
  const rounded = Math.round(rating / 100) * 100;

  console.log(rounded);
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

export const matches = new Map<string, Game>();
export const abandonTimeouts = new Map<string, NodeJS.Timeout>();
