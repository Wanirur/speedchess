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

export type TierTypes = (typeof tiers)[number];
export const queue = new Map<TierTypes, any[]>();
