/**
 * Comparison Hub — type definitions for multi-relationship comparison.
 *
 * Paradigm: 1 user ("self") across N relationships.
 * Every StoredAnalysis is normalized into a ComparisonRecord
 * containing ALL quantitative + AI data in a flat, tab-friendly shape.
 */

import type {
  PersonMetrics,
  TimingMetrics,
  EngagementMetrics,
  ReciprocityIndex,
  PersonSentimentStats,
  IntimacyProgression,
  PursuitWithdrawalAnalysis,
  ViralScores,
  Badge,
  BestTimeToText,
  CatchphraseResult,
  LSMResult,
  PronounAnalysis,
  PersonPronounStats,
  YearMilestones,
  RankingPercentiles,
  ResponseTimeDistribution,
  TrendData,
  PatternMetrics,
  HeatmapData,
} from '../parsers/types';

import type { ChronotypeCompatibility } from '../analysis/quant/chronotype';
import type { ShiftSupportResult } from '../analysis/quant/shift-support';
import type { EmotionalGranularityResult } from '../analysis/quant/emotional-granularity';
import type { BidResponseResult } from '../analysis/quant/bid-response';
import type { IntegrativeComplexityResult } from '../analysis/quant/integrative-complexity';
import type { TemporalFocusResult } from '../analysis/quant/temporal-focus';
import type { RepairPatternsResult } from '../analysis/quant/repair-patterns';
import type { ConflictFingerprintResult } from '../analysis/quant/conflict-fingerprint';

import type {
  Pass1Result,
  Pass2Result,
  PersonProfile,
  Pass4Result,
  HealthScore,
  Prediction,
  KeyFinding,
  RedFlag,
  GreenFlag,
  PowerDynamics,
  BigFiveApproximation,
  EmotionalIntelligence,
  CommunicationProfile,
  AttachmentIndicators,
  MBTIResult,
  LoveLanguageResult,
  ConflictResolution,
  ClinicalObservations,
} from '../analysis/types';

// ============================================================
// Person-level extracted data (self or partner in one relationship)
// ============================================================

export interface PersonQuantData {
  name: string;

  // --- Volume & engagement ---
  totalMessages: number;
  totalWords: number;
  totalCharacters: number;
  averageMessageLength: number;
  averageMessageChars: number;
  vocabularyRichness: number;
  uniqueWords: number;
  emojiCount: number;
  emojiRatePer1k: number;
  questionsAsked: number;
  questionsAskedPer1k: number;
  mediaShared: number;
  mediaSharedPer1k: number;
  linksShared: number;
  linksSharedPer1k: number;
  reactionsGiven: number;
  reactionsReceived: number;
  reactionGiveRate: number;
  reactionReceiveRate: number;
  unsentMessages: number;

  // --- Timing ---
  medianResponseTimeMs: number;
  trimmedMeanMs: number | null;
  stdDevMs: number | null;
  p75Ms: number | null;
  p90Ms: number | null;
  p95Ms: number | null;
  fastestResponseMs: number;
  slowestResponseMs: number;
  responseTimeTrend: number;
  conversationInitiations: number;
  conversationEndings: number;
  lateNightMessages: number;

  // --- Engagement patterns ---
  doubleTexts: number;
  maxConsecutive: number;
  messageRatio: number;

  // --- Sentiment ---
  sentiment: PersonSentimentStats | null;

  // --- Pronouns ---
  pronouns: PersonPronounStats | null;

  // --- Shift-support (CNI) ---
  cni: number | null;
  shiftRatio: number | null;

  // --- Emotional granularity ---
  granularityScore: number | null;
  granularityScoreV2: number | null;
  distinctEmotionCategories: number | null;

  // --- Integrative complexity ---
  icScore: number | null;

  // --- Temporal focus ---
  pastRate: number | null;
  presentRate: number | null;
  futureRate: number | null;
  futureIndex: number | null;

  // --- Repair patterns ---
  selfRepairRate: number | null;
  otherRepairRate: number | null;
  repairInitiationRatio: number | null;

  // --- Bid-response ---
  bidResponseRate: number | null;
  bidSuccessRate: number | null;

  // --- Chronotype ---
  peakHour: number | null;
  chronotypeCategory: string | null;
  socialJetLagHours: number | null;

  // --- Best time to text ---
  bestDay: string | null;
  bestHour: number | null;
  bestWindow: string | null;
}

// ============================================================
// AI data for a person in one relationship
// ============================================================

export interface PersonAIData {
  name: string;
  bigFive: BigFiveApproximation | null;
  emotionalIntelligence: EmotionalIntelligence | null;
  communicationProfile: CommunicationProfile | null;
  attachment: AttachmentIndicators | null;
  mbti: MBTIResult | null;
  loveLanguage: LoveLanguageResult | null;
  conflictResolution: ConflictResolution | null;
  clinicalObservations: ClinicalObservations | null;
}

// ============================================================
// Relationship-level data (one conversation)
// ============================================================

export interface RelationshipQuantData {
  // --- Reciprocity ---
  reciprocityIndex: ReciprocityIndex | null;

  // --- LSM ---
  lsm: LSMResult | null;

  // --- Intimacy ---
  intimacyProgression: IntimacyProgression | null;

  // --- Pursuit-withdrawal ---
  pursuitWithdrawal: PursuitWithdrawalAnalysis | null;

  // --- Conflicts ---
  totalConflicts: number;
  mostConflictProne: string | null;

  // --- Chronotype compatibility ---
  chronotypeMatchScore: number | null;
  chronotypeDeltaHours: number | null;

  // --- Bid-response (relationship level) ---
  bidResponse: BidResponseResult | null;

  // --- Repair (relationship level) ---
  repairPatterns: RepairPatternsResult | null;
  mutualRepairIndex: number | null;

  // --- Shift-support (relationship level) ---
  shiftSupport: ShiftSupportResult | null;

  // --- Emotional granularity (relationship level) ---
  emotionalGranularity: EmotionalGranularityResult | null;

  // --- Integrative complexity (relationship level) ---
  integrativeComplexity: IntegrativeComplexityResult | null;

  // --- Temporal focus (relationship level) ---
  temporalFocus: TemporalFocusResult | null;

  // --- Conflict fingerprint ---
  conflictFingerprint: ConflictFingerprintResult | null;

  // --- Viral scores ---
  viralScores: ViralScores | null;

  // --- Badges ---
  badges: Badge[];

  // --- Best time to text ---
  bestTimeToText: BestTimeToText | null;

  // --- Catchphrases ---
  catchphrases: CatchphraseResult | null;

  // --- Ranking percentiles ---
  rankingPercentiles: RankingPercentiles | null;

  // --- Response time distribution ---
  responseTimeDistribution: ResponseTimeDistribution | null;

  // --- Year milestones ---
  yearMilestones: YearMilestones | null;

  // --- Sessions / patterns ---
  totalSessions: number;
  avgConversationLength: number;
  volumeTrend: number;
  burstsCount: number;

  // --- Trends (raw monthly) ---
  trends: TrendData | null;
  heatmap: HeatmapData | null;
  monthlyVolume: PatternMetrics['monthlyVolume'] | null;
  weekdayWeekend: PatternMetrics['weekdayWeekend'] | null;

  // --- Longest silence ---
  longestSilenceMs: number;
  longestSilenceLastSender: string | null;
}

export interface RelationshipAIData {
  pass1: Pass1Result | null;
  pass2: Pass2Result | null;
  pass4: Pass4Result | null;

  // --- Health (extracted from pass4) ---
  healthScore: HealthScore | null;
  predictions: Prediction[];
  keyFindings: KeyFinding[];
  redFlags: RedFlag[];
  greenFlags: GreenFlag[];

  // --- Power dynamics (from pass2) ---
  powerDynamics: PowerDynamics | null;
}

// ============================================================
// ComparisonRecord — one relationship fully normalized
// ============================================================

export interface ComparisonRecord {
  /** Original StoredAnalysis ID */
  analysisId: string;
  /** Conversation title */
  title: string;
  /** Source platform */
  platform: string;
  /** Creation timestamp */
  createdAt: number;
  /** Conversation date range */
  dateRange: { start: number; end: number };
  /** Duration in days */
  durationDays: number;
  /** Total messages in conversation */
  totalMessages: number;
  /** Number of participants */
  participantCount: number;

  /** The "self" user's data in this relationship */
  self: PersonQuantData;
  /** The partner's data (for 1:1 conversations) */
  partner: PersonQuantData;
  /** Partner's display name */
  partnerName: string;

  /** Self AI profile */
  selfAI: PersonAIData;
  /** Partner AI profile */
  partnerAI: PersonAIData;

  /** Relationship-level quantitative data */
  relationship: RelationshipQuantData;
  /** Relationship-level AI data */
  relationshipAI: RelationshipAIData;

  /** Whether AI analysis was run */
  hasAI: boolean;
  /** AI completion status */
  aiStatus: 'none' | 'partial' | 'complete';
}

// ============================================================
// Common user detection result
// ============================================================

export interface CommonUserResult {
  /** Detected common user name */
  name: string;
  /** How many conversations this name appears in */
  count: number;
  /** Total conversations analyzed */
  total: number;
  /** Confidence: count / total */
  confidence: number;
}

// ============================================================
// 12 psychological trait dimensions (AI-dependent)
// ============================================================

export type TraitCategory = 'big5' | 'eq' | 'comm';

export interface TraitDimension {
  key: string;
  label: string;
  category: TraitCategory;
  /** How to extract self value from PersonAIData (returns 1-10 or null) */
  extractSelf: (ai: PersonAIData) => number | null;
  /** How to extract partner value */
  extractPartner: (ai: PersonAIData) => number | null;
}

/** All 12 trait dimensions used in Dynamics/Variations/UserProfile tabs */
export const TRAIT_DIMENSIONS: TraitDimension[] = [
  // Big Five (midpoint of range)
  {
    key: 'openness', label: 'Otwartość', category: 'big5',
    extractSelf: (ai) => midpoint(ai.bigFive?.openness.range),
    extractPartner: (ai) => midpoint(ai.bigFive?.openness.range),
  },
  {
    key: 'conscientiousness', label: 'Sumienność', category: 'big5',
    extractSelf: (ai) => midpoint(ai.bigFive?.conscientiousness.range),
    extractPartner: (ai) => midpoint(ai.bigFive?.conscientiousness.range),
  },
  {
    key: 'extraversion', label: 'Ekstrawersja', category: 'big5',
    extractSelf: (ai) => midpoint(ai.bigFive?.extraversion.range),
    extractPartner: (ai) => midpoint(ai.bigFive?.extraversion.range),
  },
  {
    key: 'agreeableness', label: 'Ugodowość', category: 'big5',
    extractSelf: (ai) => midpoint(ai.bigFive?.agreeableness.range),
    extractPartner: (ai) => midpoint(ai.bigFive?.agreeableness.range),
  },
  {
    key: 'neuroticism', label: 'Neurotyczność', category: 'big5',
    extractSelf: (ai) => midpoint(ai.bigFive?.neuroticism.range),
    extractPartner: (ai) => midpoint(ai.bigFive?.neuroticism.range),
  },
  // Emotional Intelligence
  {
    key: 'empathy', label: 'Empatia', category: 'eq',
    extractSelf: (ai) => ai.emotionalIntelligence?.empathy.score ?? null,
    extractPartner: (ai) => ai.emotionalIntelligence?.empathy.score ?? null,
  },
  {
    key: 'selfAwareness', label: 'Samoświadomość', category: 'eq',
    extractSelf: (ai) => ai.emotionalIntelligence?.self_awareness.score ?? null,
    extractPartner: (ai) => ai.emotionalIntelligence?.self_awareness.score ?? null,
  },
  {
    key: 'emotionalRegulation', label: 'Regulacja emocji', category: 'eq',
    extractSelf: (ai) => ai.emotionalIntelligence?.emotional_regulation.score ?? null,
    extractPartner: (ai) => ai.emotionalIntelligence?.emotional_regulation.score ?? null,
  },
  {
    key: 'socialSkills', label: 'Umiejętności społeczne', category: 'eq',
    extractSelf: (ai) => ai.emotionalIntelligence?.social_skills.score ?? null,
    extractPartner: (ai) => ai.emotionalIntelligence?.social_skills.score ?? null,
  },
  // Communication
  {
    key: 'assertiveness', label: 'Asertywność', category: 'comm',
    extractSelf: (ai) => ai.communicationProfile?.assertiveness ?? null,
    extractPartner: (ai) => ai.communicationProfile?.assertiveness ?? null,
  },
  {
    key: 'expressiveness', label: 'Ekspresyjność', category: 'comm',
    extractSelf: (ai) => ai.communicationProfile?.emotional_expressiveness ?? null,
    extractPartner: (ai) => ai.communicationProfile?.emotional_expressiveness ?? null,
  },
  {
    key: 'selfDisclosure', label: 'Głębokość otwarcia', category: 'comm',
    extractSelf: (ai) => ai.communicationProfile?.self_disclosure_depth ?? null,
    extractPartner: (ai) => ai.communicationProfile?.self_disclosure_depth ?? null,
  },
];

function midpoint(range: [number, number] | undefined): number | null {
  if (!range) return null;
  return (range[0] + range[1]) / 2;
}

// ============================================================
// Variance analysis types
// ============================================================

export interface TraitVariance {
  key: string;
  label: string;
  category: TraitCategory;
  values: number[]; // one per relationship
  mean: number;
  stdDev: number;
  range: [number, number];
  cv: number; // coefficient of variation %
  stability: 'stable' | 'moderate' | 'variable';
}

// ============================================================
// Insight card type
// ============================================================

export type InsightType = 'positive' | 'neutral' | 'warning' | 'info';

export interface InsightData {
  id: string;
  title: string;
  value: string;
  description: string;
  type: InsightType;
  icon: string;
  /** Source: 'ai' or 'quant' */
  source: 'ai' | 'quant';
  /** Which relationship(s) this insight refers to */
  relationshipTitle?: string;
}

// ============================================================
// Extended color palette for N relationships
// ============================================================

export const COMPARISON_COLORS = [
  '#3b82f6', // blue
  '#a855f7', // purple
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
  '#f97316', // orange
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#e11d48', // rose
  '#22c55e', // green
  '#6366f1', // indigo
  '#eab308', // yellow
  '#0ea5e9', // sky
  '#d946ef', // fuchsia
  '#78716c', // stone
  '#fb923c', // orange-light
  '#a3e635', // lime-light
] as const;
