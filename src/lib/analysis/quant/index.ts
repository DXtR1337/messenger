/**
 * Barrel export for quantitative analysis submodules.
 */

export {
  extractEmojis,
  countWords,
  tokenizeWords,
  median,
  percentile,
  filterResponseTimeOutliers,
  getMonthKey,
  getDayKey,
  isLateNight,
  isWeekend,
  topN,
  topNWords,
  topNPhrases,
} from './helpers';

export { detectBursts } from './bursts';
export { computeTrends, computeYearMilestones } from './trends';
export { computeReciprocityIndex } from './reciprocity';
export { computeSentimentScore, computePersonSentiment, computeSentimentTrend } from './sentiment';
export { detectConflicts } from './conflicts';
export { computeIntimacyProgression } from './intimacy';
export { detectPursuitWithdrawal } from './pursuit-withdrawal';
export { computeResponseTimeDistribution } from './response-time-distribution';
export { createPersonAccumulator } from './types';
export type { PersonAccumulator } from './types';
