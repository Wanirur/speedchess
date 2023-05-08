import { type Game } from "./game";

const tiers = [
  "guest",
  "0-250",
  "251-500",
  "501-750",
  "751-1000",
  "1001-1250",
  "1251-1500",
  "1501-1750",
  "1751-2000",
  "2001-2250",
  "2251-2500",
  "2500+",
] as const;

export type RatingTier = (typeof tiers)[number];
const queue = new Map<RatingTier, Game[]>();
tiers.forEach((item) => {
  queue.set(item, [] as Game[]);
});

export const playersWaitingForMatch = queue;
export const resolveRatingToTier = (rating :number): RatingTier => {
    let tier = "guest" as RatingTier;
    if(rating <= 250) {
        tier = "0-250";
    } else if(rating <= 500) {
        tier = "251-500"
    } else if(rating <= 750) {
        tier = "501-750";
    } else if(rating <= 1000) {
        tier = "751-1000"; 
    } else if(rating <= 1250) {
        tier = "1001-1250";
    } else if(rating <= 1500) {
        tier = "1251-1500";
    } else if(rating <= 1750) {
        tier = "1501-1750";
    } else if(rating <= 2000) {
        tier = "1751-2000";
    } else if(rating <= 2250) {
        tier = "2001-2250";
    } else if(rating <= 2500) {
        tier = "2251-2500";
    } else { 
        tier = "2500+";
    }
    return tier;
}

export const matches = new Map<string, Game>();
