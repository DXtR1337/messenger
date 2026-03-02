/**
 * Extraction layer — maps StoredAnalysis to normalized ComparisonRecord.
 *
 * Handles all optional fields defensively. Every field that might be
 * missing from older analyses defaults to null / 0 / empty.
 */

import type { StoredAnalysis } from '../analysis/types';
import type {
  ComparisonRecord,
  PersonQuantData,
  PersonAIData,
  RelationshipQuantData,
  RelationshipAIData,
} from './types';
import { getPartnerName } from './user-detection';

/**
 * Extract a ComparisonRecord from a StoredAnalysis.
 * `selfName` is the common user detected across conversations.
 */
export function extractComparisonRecord(
  analysis: StoredAnalysis,
  selfName: string,
): ComparisonRecord {
  const partnerName = getPartnerName(analysis, selfName);
  const q = analysis.quantitative;
  const qual = analysis.qualitative;
  const conv = analysis.conversation;

  const hasAI = !!(qual?.pass3 || qual?.pass4);
  const aiStatus = !qual ? 'none'
    : (qual.pass4 && qual.pass3) ? 'complete'
    : (qual.pass1 || qual.pass2 || qual.pass3 || qual.pass4) ? 'partial'
    : 'none';

  return {
    analysisId: analysis.id,
    title: analysis.title,
    platform: conv.platform,
    createdAt: analysis.createdAt,
    dateRange: conv.metadata.dateRange,
    durationDays: conv.metadata.durationDays,
    totalMessages: conv.metadata.totalMessages,
    participantCount: conv.participants.length,
    self: extractPersonQuant(selfName, q, analysis),
    partner: extractPersonQuant(partnerName, q, analysis),
    partnerName,
    selfAI: extractPersonAI(selfName, qual?.pass3),
    partnerAI: extractPersonAI(partnerName, qual?.pass3),
    relationship: extractRelationshipQuant(q, analysis),
    relationshipAI: extractRelationshipAI(qual),
    hasAI,
    aiStatus,
  };
}

// ============================================================
// Person-level quantitative extraction
// ============================================================

function extractPersonQuant(
  name: string,
  q: StoredAnalysis['quantitative'],
  analysis: StoredAnalysis,
): PersonQuantData {
  const pm = q.perPerson?.[name];
  const tm = q.timing?.perPerson?.[name];
  const eng = q.engagement;

  // Null-safe metric access
  const safe = <T>(val: T | undefined | null, fallback: T): T =>
    val != null ? val : fallback;

  return {
    name,

    // Volume
    totalMessages: pm?.totalMessages ?? 0,
    totalWords: pm?.totalWords ?? 0,
    totalCharacters: pm?.totalCharacters ?? 0,
    averageMessageLength: pm?.averageMessageLength ?? 0,
    averageMessageChars: pm?.averageMessageChars ?? 0,
    vocabularyRichness: pm?.vocabularyRichness ?? 0,
    uniqueWords: pm?.uniqueWords ?? 0,
    emojiCount: pm?.emojiCount ?? 0,
    emojiRatePer1k: pm?.emojiRatePer1k ?? 0,
    questionsAsked: pm?.questionsAsked ?? 0,
    questionsAskedPer1k: pm?.questionsAskedPer1k ?? 0,
    mediaShared: pm?.mediaShared ?? 0,
    mediaSharedPer1k: pm?.mediaSharedPer1k ?? 0,
    linksShared: pm?.linksShared ?? 0,
    linksSharedPer1k: pm?.linksSharedPer1k ?? 0,
    reactionsGiven: pm?.reactionsGiven ?? 0,
    reactionsReceived: pm?.reactionsReceived ?? 0,
    reactionGiveRate: safe(eng.reactionGiveRate?.[name], 0),
    reactionReceiveRate: safe(eng.reactionReceiveRate?.[name], 0),
    unsentMessages: pm?.unsentMessages ?? 0,

    // Timing
    medianResponseTimeMs: tm?.medianResponseTimeMs ?? 0,
    trimmedMeanMs: tm?.trimmedMeanMs ?? null,
    stdDevMs: tm?.stdDevMs ?? null,
    p75Ms: tm?.p75Ms ?? null,
    p90Ms: tm?.p90Ms ?? null,
    p95Ms: tm?.p95Ms ?? null,
    fastestResponseMs: tm?.fastestResponseMs ?? 0,
    slowestResponseMs: tm?.slowestResponseMs ?? 0,
    responseTimeTrend: tm?.responseTimeTrend ?? 0,
    conversationInitiations: safe(q.timing?.conversationInitiations?.[name], 0),
    conversationEndings: safe(q.timing?.conversationEndings?.[name], 0),
    lateNightMessages: safe(q.timing?.lateNightMessages?.[name], 0),

    // Engagement
    doubleTexts: safe(eng?.doubleTexts?.[name], 0),
    maxConsecutive: safe(eng?.maxConsecutive?.[name], 0),
    messageRatio: safe(eng?.messageRatio?.[name], 0),

    // Sentiment
    sentiment: q.sentimentAnalysis?.perPerson[name] ?? null,

    // Pronouns
    pronouns: q.pronounAnalysis?.perPerson[name] ?? null,

    // CNI
    cni: q.shiftSupportResult?.perPerson[name]?.cni ?? null,
    shiftRatio: q.shiftSupportResult?.perPerson[name]?.shiftRatio ?? null,

    // Emotional granularity
    granularityScore: q.emotionalGranularity?.perPerson[name]?.granularityScore ?? null,
    granularityScoreV2: q.emotionalGranularity?.perPerson[name]?.granularityScoreV2 ?? null,
    distinctEmotionCategories: q.emotionalGranularity?.perPerson[name]?.distinctCategories ?? null,

    // Integrative complexity
    icScore: q.integrativeComplexity?.perPerson[name]?.icScore ?? null,

    // Temporal focus
    pastRate: q.temporalFocus?.perPerson[name]?.pastRate ?? null,
    presentRate: q.temporalFocus?.perPerson[name]?.presentRate ?? null,
    futureRate: q.temporalFocus?.perPerson[name]?.futureRate ?? null,
    futureIndex: q.temporalFocus?.perPerson[name]?.futureIndex ?? null,

    // Repair
    selfRepairRate: q.repairPatterns?.perPerson[name]?.selfRepairRate ?? null,
    otherRepairRate: q.repairPatterns?.perPerson[name]?.otherRepairRate ?? null,
    repairInitiationRatio: q.repairPatterns?.perPerson[name]?.repairInitiationRatio ?? null,

    // Bid-response
    bidResponseRate: q.bidResponseResult?.perPerson[name]?.responseRate ?? null,
    bidSuccessRate: q.bidResponseResult?.perPerson[name]?.bidSuccessRate ?? null,

    // Chronotype
    peakHour: extractChronotypePerson(q, name, 'peakHour'),
    chronotypeCategory: extractChronotypePersonStr(q, name, 'category'),
    socialJetLagHours: extractChronotypePerson(q, name, 'socialJetLagHours'),

    // Best time to text
    bestDay: q.bestTimeToText?.perPerson[name]?.bestDay ?? null,
    bestHour: q.bestTimeToText?.perPerson[name]?.bestHour ?? null,
    bestWindow: q.bestTimeToText?.perPerson[name]?.bestWindow ?? null,
  };
}

function extractChronotypePerson(
  q: StoredAnalysis['quantitative'],
  name: string,
  field: 'peakHour' | 'socialJetLagHours',
): number | null {
  const cc = q.chronotypeCompatibility;
  if (!cc) return null;
  const person = cc.persons.find((p) => p.name === name);
  return person?.[field] ?? null;
}

function extractChronotypePersonStr(
  q: StoredAnalysis['quantitative'],
  name: string,
  field: 'category',
): string | null {
  const cc = q.chronotypeCompatibility;
  if (!cc) return null;
  const person = cc.persons.find((p) => p.name === name);
  return person?.[field] ?? null;
}

// ============================================================
// Person-level AI extraction
// ============================================================

function extractPersonAI(
  name: string,
  pass3: Record<string, import('../analysis/types').PersonProfile> | undefined,
): PersonAIData {
  const profile = pass3?.[name];

  return {
    name,
    bigFive: profile?.big_five_approximation ?? null,
    emotionalIntelligence: profile?.emotional_intelligence ?? null,
    communicationProfile: profile?.communication_profile ?? null,
    attachment: profile?.attachment_indicators ?? null,
    mbti: profile?.mbti ?? null,
    loveLanguage: profile?.love_language ?? null,
    conflictResolution: profile?.conflict_resolution ?? null,
    clinicalObservations: profile?.clinical_observations ?? null,
  };
}

// ============================================================
// Relationship-level quantitative extraction
// ============================================================

function extractRelationshipQuant(
  q: StoredAnalysis['quantitative'],
  analysis: StoredAnalysis,
): RelationshipQuantData {
  return {
    reciprocityIndex: q.reciprocityIndex ?? null,
    lsm: q.lsm ?? null,
    intimacyProgression: q.intimacyProgression ?? null,
    pursuitWithdrawal: q.pursuitWithdrawal ?? null,
    totalConflicts: q.conflictAnalysis?.totalConflicts ?? 0,
    mostConflictProne: q.conflictAnalysis?.mostConflictProne ?? null,
    chronotypeMatchScore: q.chronotypeCompatibility?.matchScore ?? null,
    chronotypeDeltaHours: q.chronotypeCompatibility?.deltaHours ?? null,
    bidResponse: q.bidResponseResult ?? null,
    repairPatterns: q.repairPatterns ?? null,
    mutualRepairIndex: q.repairPatterns?.mutualRepairIndex ?? null,
    shiftSupport: q.shiftSupportResult ?? null,
    emotionalGranularity: q.emotionalGranularity ?? null,
    integrativeComplexity: q.integrativeComplexity ?? null,
    temporalFocus: q.temporalFocus ?? null,
    conflictFingerprint: q.conflictFingerprint ?? null,
    viralScores: q.viralScores ?? null,
    badges: q.badges ?? [],
    bestTimeToText: q.bestTimeToText ?? null,
    catchphrases: q.catchphrases ?? null,
    rankingPercentiles: q.rankingPercentiles ?? null,
    responseTimeDistribution: q.responseTimeDistribution ?? null,
    yearMilestones: q.yearMilestones ?? null,
    totalSessions: q.engagement?.totalSessions ?? 0,
    avgConversationLength: q.engagement?.avgConversationLength ?? 0,
    volumeTrend: q.patterns?.volumeTrend ?? 0,
    burstsCount: q.patterns?.bursts?.length ?? 0,
    trends: q.trends ?? null,
    heatmap: q.heatmap ?? null,
    monthlyVolume: q.patterns?.monthlyVolume ?? null,
    weekdayWeekend: q.patterns?.weekdayWeekend ?? null,
    longestSilenceMs: q.timing?.longestSilence?.durationMs ?? 0,
    longestSilenceLastSender: q.timing?.longestSilence?.lastSender ?? null,
  };
}

// ============================================================
// Relationship-level AI extraction
// ============================================================

function extractRelationshipAI(
  qual: StoredAnalysis['qualitative'],
): RelationshipAIData {
  return {
    pass1: qual?.pass1 ?? null,
    pass2: qual?.pass2 ?? null,
    pass4: qual?.pass4 ?? null,
    healthScore: qual?.pass4?.health_score ?? null,
    predictions: qual?.pass4?.predictions ?? [],
    keyFindings: qual?.pass4?.key_findings ?? [],
    redFlags: qual?.pass2?.red_flags ?? [],
    greenFlags: qual?.pass2?.green_flags ?? [],
    powerDynamics: qual?.pass2?.power_dynamics ?? null,
  };
}
