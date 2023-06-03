import { type GameResult } from "./pieces";

//rating based on Elo rating system used by FIDE
//https://en.wikipedia.org/wiki/Elo_rating_system#Theory

type EloDiff = {
  white: number;
  black: number;
};

export const calculateRatingDiff = (
  gameResult: GameResult,
  whiteElo: number,
  blackElo: number,
  kFactor = 16
) => {
  const logisticCurveWhite = Math.pow(10, whiteElo / 400);
  const logisticCurveBlack = Math.pow(10, blackElo / 400);

  const whiteExpectedPerformance =
    logisticCurveWhite / (logisticCurveWhite + logisticCurveBlack);
  const blackExpectedPerformance =
    logisticCurveBlack / (logisticCurveWhite + logisticCurveBlack);

  let whiteActualPerformance, blackActualPerformance;
  if (gameResult.winner === "WHITE") {
    whiteActualPerformance = 1;
    blackActualPerformance = 0;
  } else if (gameResult.winner === "BLACK") {
    whiteActualPerformance = 0;
    blackActualPerformance = 1;
  } else {
    whiteActualPerformance = 0.5;
    blackActualPerformance = 0.5;
  }

  const whiteRatingGain = Math.round(
    kFactor * (whiteActualPerformance - whiteExpectedPerformance)
  );
  const blackRatingGain = Math.round(
    kFactor * (blackActualPerformance - blackExpectedPerformance)
  );

  return {
    white: whiteRatingGain,
    black: blackRatingGain,
  } as EloDiff;
};
