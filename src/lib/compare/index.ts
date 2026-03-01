/**
 * Barrel export for comparison hub utilities.
 */

export type {
  ComparisonRecord,
  PersonQuantData,
  PersonAIData,
  RelationshipQuantData,
  RelationshipAIData,
  CommonUserResult,
  TraitCategory,
  TraitDimension,
  TraitVariance,
  InsightType,
  InsightData,
} from './types';

export { TRAIT_DIMENSIONS, COMPARISON_COLORS } from './types';
export { extractComparisonRecord } from './extract';
export { detectCommonUser, getPartnerName, filterOneOnOne } from './user-detection';
export { mean, stddev, cv, range, pearsonCorrelation, detectPattern, classifyStability, argMax, argMin, normalize } from './statistics';
