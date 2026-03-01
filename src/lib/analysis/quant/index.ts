/**
 * Barrel export for quantitative analysis submodules.
 */

export {
  extractEmojis,
  countWords,
  tokenizeWords,
  tokenizeAll,
  median,
  percentile,
  stdDev,
  trimmedMean,
  skewness,
  filterResponseTimeOutliers,
  filterResponseTimeOutliersWithStats,
  getMonthKey,
  getDayKey,
  isLateNight,
  isWeekend,
  topN,
  topNWords,
  topNPhrases,
} from './helpers';
export type { IQRFilterResult } from './helpers';

export { detectBursts } from './bursts';
export { computeTrends, computeYearMilestones } from './trends';
export { computeReciprocityIndex } from './reciprocity';
export { computeSentimentScore, computePersonSentiment, computeSentimentTrend } from './sentiment';
export { detectConflicts } from './conflicts';
export { computeIntimacyProgression } from './intimacy';
export { detectPursuitWithdrawal } from './pursuit-withdrawal';
export { computeResponseTimeDistribution } from './response-time-distribution';
export { computeLSM } from './lsm';
export { computePronounAnalysis } from './pronouns';
export { computeChronotypeCompatibility } from './chronotype';
export { computeShiftSupportRatio } from './shift-support';
export { computeEmotionalGranularity } from './emotional-granularity';
export { computeBidResponseRatio } from './bid-response';
export { computeIntegrativeComplexity } from './integrative-complexity';
export { computeTemporalFocus } from './temporal-focus';
export { computeRepairPatterns } from './repair-patterns';
export { computeConflictFingerprint } from './conflict-fingerprint';
export { computeResponseTimeAnalysis } from './response-time-engine';
export { createPersonAccumulator } from './types';
export type { PersonAccumulator } from './types';
