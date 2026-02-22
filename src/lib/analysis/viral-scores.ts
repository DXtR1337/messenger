/**
 * Viral / fun scores computation for PodTeksT Phase 6A.
 *
 * Computes compatibility, interest, ghost-risk, and delusion scores
 * from existing quantitative data. No AI involved.
 */

import type {
  ParsedConversation,
  QuantitativeAnalysis,
  ViralScores,
  GhostRiskData,
  PersonMetrics,
  TimingMetrics,
  EngagementMetrics,
  PatternMetrics,
  HeatmapData,
  TrendData,
} from '../parsers/types';
import { linearRegressionSlope } from './constants';

/** Subset of QuantitativeAnalysis fields needed by this module. */
interface QuantitativeInput {
  perPerson: Record<string, PersonMetrics>;
  timing: TimingMetrics;
  engagement: EngagementMetrics;
  patterns: PatternMetrics;
  heatmap: HeatmapData;
  trends: TrendData;
}

// ============================================================
// Helpers
// ============================================================

/** Clamp a value between min and max (inclusive). */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Safe division — returns 0 when denominator is 0 or result is not finite. */
function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : 0;
}

// ============================================================
// Compatibility sub-scores
// ============================================================

/**
 * Activity Overlap: how much the two persons' hourly activity
 * distributions overlap. Uses the min-overlap (Szymkiewicz-Simpson
 * style) across 24 hours from the heatmap data.
 */
function activityOverlapScore(
  heatmap: HeatmapData,
  names: string[],
): number {
  if (names.length < 2) return 0;
  const nameA = names[0];
  const nameB = names[1];
  const matrixA = heatmap.perPerson[nameA];
  const matrixB = heatmap.perPerson[nameB];
  if (!matrixA || !matrixB) return 0;

  // Sum messages per hour across all days of the week
  const hourlyA = new Array<number>(24).fill(0);
  const hourlyB = new Array<number>(24).fill(0);
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      hourlyA[hour] += matrixA[day][hour];
      hourlyB[hour] += matrixB[day][hour];
    }
  }

  const totalA = hourlyA.reduce((a, b) => a + b, 0);
  const totalB = hourlyB.reduce((a, b) => a + b, 0);
  if (totalA === 0 || totalB === 0) return 0;

  // Compute per-hour percentage and overlap
  let overlap = 0;
  for (let hour = 0; hour < 24; hour++) {
    const pctA = hourlyA[hour] / totalA;
    const pctB = hourlyB[hour] / totalB;
    overlap += Math.min(pctA, pctB);
  }

  return clamp(overlap * 100, 0, 100);
}

/**
 * Response Symmetry: how close the two persons' median response times are.
 */
function responseSymmetryScore(
  timing: TimingMetrics,
  names: string[],
): number {
  if (names.length < 2) return 0;
  const medA = timing.perPerson[names[0]]?.medianResponseTimeMs ?? 0;
  const medB = timing.perPerson[names[1]]?.medianResponseTimeMs ?? 0;
  const maxMed = Math.max(medA, medB);
  if (maxMed === 0) return 50; // no data ≠ perfect symmetry
  const diff = Math.abs(medA - medB);
  return clamp(100 - safeDivide(diff, maxMed) * 100, 0, 100);
}

/**
 * Message Balance: how evenly messages are split between participants.
 */
function messageBalanceScore(
  engagement: EngagementMetrics,
  names: string[],
): number {
  if (names.length < 2) return 0;
  const ratioA = engagement.messageRatio[names[0]] ?? 0;
  return clamp(100 - Math.abs(ratioA - 0.5) * 200, 0, 100);
}

/**
 * Engagement Balance: how similar reaction/engagement rates are.
 * Uses min/max ratio instead of absolute difference — more robust across scales.
 * For Discord (where reactionRate is 0), uses mentionRate+replyRate instead.
 */
function engagementBalanceScore(
  engagement: EngagementMetrics,
  names: string[],
): number {
  if (names.length < 2) return 0;
  // Use giveRate for balance comparison (how actively each person engages)
  const rateA = engagement.reactionGiveRate?.[names[0]] ?? engagement.reactionRate[names[0]] ?? 0;
  const rateB = engagement.reactionGiveRate?.[names[1]] ?? engagement.reactionRate[names[1]] ?? 0;

  // Discord fallback: use mentionRate+replyRate when reactionRate is 0 for both
  if (rateA === 0 && rateB === 0 && engagement.mentionRate && engagement.replyRate) {
    const mRateA = engagement.mentionRate[names[0]] ?? 0;
    const mRateB = engagement.mentionRate[names[1]] ?? 0;
    const rRateA = engagement.replyRate[names[0]] ?? 0;
    const rRateB = engagement.replyRate[names[1]] ?? 0;
    const mMax = Math.max(mRateA, mRateB);
    const rMax = Math.max(rRateA, rRateB);
    const mentionBalance = mMax > 0 ? Math.round((Math.min(mRateA, mRateB) / mMax) * 100) : 50;
    const replyBalance = rMax > 0 ? Math.round((Math.min(rRateA, rRateB) / rMax) * 100) : 50;
    return Math.round((mentionBalance + replyBalance) / 2);
  }

  // min/max ratio: 0 when one is 0, 100 when equal
  const maxRate = Math.max(rateA, rateB);
  if (maxRate === 0) return 50; // no data — neutral
  return clamp(Math.round((Math.min(rateA, rateB) / maxRate) * 100), 0, 100);
}

/**
 * Length Match: how similar average message lengths are.
 */
function lengthMatchScore(
  perPerson: Record<string, PersonMetrics>,
  names: string[],
): number {
  if (names.length < 2) return 0;
  const avgA = perPerson[names[0]]?.averageMessageLength ?? 0;
  const avgB = perPerson[names[1]]?.averageMessageLength ?? 0;
  const maxLen = Math.max(avgA, avgB);
  if (maxLen === 0) return 50; // no data ≠ perfect match
  return clamp(100 - safeDivide(Math.abs(avgA - avgB), maxLen) * 100, 0, 100);
}

// ============================================================
// Interest Score
// ============================================================

function computeInterestScore(
  name: string,
  quantitative: QuantitativeInput,
  totalMessages: number,
): number {
  const { timing, engagement, trends, perPerson } = quantitative;
  const personMetrics = perPerson[name];
  if (!personMetrics || personMetrics.totalMessages === 0) return 0;

  // 1. Initiation ratio — 25% weight
  const totalInitiations = Object.values(timing.conversationInitiations).reduce(
    (a, b) => a + b,
    0,
  );
  const initiationScore =
    totalInitiations > 0
      ? clamp(
          safeDivide(timing.conversationInitiations[name] ?? 0, totalInitiations) * 100,
          0,
          100,
        )
      : 50;

  // 2. Response time trend — 20% weight
  // Negative slope = getting faster = good (higher score)
  const rtValues = trends.responseTimeTrend
    .map((entry) => entry.perPerson[name] ?? 0)
    .filter((v) => v > 0);
  const rtSlope = linearRegressionSlope(rtValues);
  // Normalize: negative slope is good (getting faster at responding).
  // Map range: slope <= -60000ms/month -> 100, slope >= 60000 -> 0
  // Constant 1200 = 60000/50: maps ±60s/month change to ±50 points around midpoint 50
  const rtScore = clamp(50 - safeDivide(rtSlope, 1200), 0, 100);

  // 3. Message length trend — 15% weight
  const mlValues = trends.messageLengthTrend
    .map((entry) => entry.perPerson[name] ?? 0)
    .filter((v) => v > 0);
  const mlSlope = linearRegressionSlope(mlValues);
  // Positive slope = longer messages = more engaged
  // Map: slope of +2 words/month -> 100, slope of -2 -> 0
  // Constant 25 = 50/2: maps ±2 words/month change to ±50 points around midpoint 50
  const mlScore = clamp(50 + mlSlope * 25, 0, 100);

  // 4. Engagement frequency — 20% weight
  // Use receiveRate: measures how much engagement this person's messages attract from others
  let engagementScore: number;
  const receiveRate = engagement.reactionReceiveRate?.[name] ?? engagement.reactionRate[name] ?? 0;
  if (receiveRate > 0) {
    engagementScore = clamp(receiveRate * 500, 0, 100);
  } else if (engagement.mentionRate && engagement.replyRate) {
    const mentionR = engagement.mentionRate[name] ?? 0;
    const replyR = engagement.replyRate[name] ?? 0;
    engagementScore = clamp((mentionR * 200 + replyR * 300), 0, 100);
  } else {
    engagementScore = 50; // neutral fallback
  }

  // 5. Double texting frequency — 10% weight
  const doubleTexts = engagement.doubleTexts[name] ?? 0;
  const dtPer1000 =
    totalMessages > 0 ? safeDivide(doubleTexts * 1000, totalMessages) : 0;
  const dtScore = clamp(dtPer1000 * 2, 0, 100);

  // 6. Late night ratio — 10% weight
  const lateNight = timing.lateNightMessages[name] ?? 0;
  const lnRatio = safeDivide(lateNight, personMetrics.totalMessages) * 1000;
  const lnScore = clamp(lnRatio, 0, 100);

  const weighted =
    initiationScore * 0.25 +
    rtScore * 0.2 +
    mlScore * 0.15 +
    engagementScore * 0.2 +
    dtScore * 0.1 +
    lnScore * 0.1;

  return clamp(Math.round(weighted), 0, 100);
}

// ============================================================
// Ghost Risk
// ============================================================

function computeGhostRisk(
  name: string,
  quantitative: QuantitativeInput,
): GhostRiskData {
  const { trends, patterns } = quantitative;

  const months = patterns.monthlyVolume;
  if (months.length < 3) {
    return { score: 0, factors: ['Za mało danych'] };
  }

  // Split into recent (last 3 months) and earlier
  const recentMonths = months.slice(-3);
  const earlierMonths = months.slice(0, -3);

  if (earlierMonths.length === 0) {
    return { score: 0, factors: ['Za mało danych'] };
  }

  const factors: string[] = [];

  // 1. Response time increasing? — 30% weight
  const rtEntries = trends.responseTimeTrend;
  const recentRt = rtEntries.slice(-3);
  const earlierRt = rtEntries.slice(0, -3);
  let rtSubScore = 0;
  if (recentRt.length > 0 && earlierRt.length > 0) {
    const recentAvg = safeDivide(
      recentRt.reduce((sum, e) => sum + (e.perPerson[name] ?? 0), 0),
      recentRt.filter((e) => (e.perPerson[name] ?? 0) > 0).length || 1,
    );
    const earlierAvg = safeDivide(
      earlierRt.reduce((sum, e) => sum + (e.perPerson[name] ?? 0), 0),
      earlierRt.filter((e) => (e.perPerson[name] ?? 0) > 0).length || 1,
    );
    if (earlierAvg > 0 && recentAvg > earlierAvg) {
      const increase = safeDivide(recentAvg - earlierAvg, earlierAvg);
      rtSubScore = clamp(increase * 100, 0, 100);
      if (rtSubScore > 30) {
        factors.push('Czas odpowiedzi rośnie');
      }
    }
  }

  // 2. Message length decreasing? — 25% weight
  const mlEntries = trends.messageLengthTrend;
  const recentMl = mlEntries.slice(-3);
  const earlierMl = mlEntries.slice(0, -3);
  let mlSubScore = 0;
  if (recentMl.length > 0 && earlierMl.length > 0) {
    const recentAvg = safeDivide(
      recentMl.reduce((sum, e) => sum + (e.perPerson[name] ?? 0), 0),
      recentMl.filter((e) => (e.perPerson[name] ?? 0) > 0).length || 1,
    );
    const earlierAvg = safeDivide(
      earlierMl.reduce((sum, e) => sum + (e.perPerson[name] ?? 0), 0),
      earlierMl.filter((e) => (e.perPerson[name] ?? 0) > 0).length || 1,
    );
    if (earlierAvg > 0 && recentAvg < earlierAvg) {
      const decrease = safeDivide(earlierAvg - recentAvg, earlierAvg);
      mlSubScore = clamp(decrease * 100, 0, 100);
      if (mlSubScore > 30) {
        factors.push('Wiadomości stają się krótsze');
      }
    }
  }

  // 3. Initiation ratio decreasing? — 25% weight
  const initEntries = trends.initiationTrend;
  const recentInit = initEntries.slice(-3);
  const earlierInit = initEntries.slice(0, -3);
  let initSubScore = 0;
  if (recentInit.length > 0 && earlierInit.length > 0) {
    const recentSum = recentInit.reduce(
      (sum, e) => sum + (e.perPerson[name] ?? 0),
      0,
    );
    const earlierSum = earlierInit.reduce(
      (sum, e) => sum + (e.perPerson[name] ?? 0),
      0,
    );
    // Normalize by number of months
    const recentAvg = safeDivide(recentSum, recentInit.length);
    const earlierAvg = safeDivide(earlierSum, earlierInit.length);
    if (earlierAvg > 0 && recentAvg < earlierAvg) {
      const decrease = safeDivide(earlierAvg - recentAvg, earlierAvg);
      initSubScore = clamp(decrease * 100, 0, 100);
      if (initSubScore > 30) {
        factors.push('Rzadziej inicjuje rozmowy');
      }
    }
  }

  // 4. Message volume declining? — 20% weight
  let volSubScore = 0;
  const recentVol = recentMonths.reduce(
    (sum, m) => sum + (m.perPerson[name] ?? 0),
    0,
  );
  const earlierVol = earlierMonths.reduce(
    (sum, m) => sum + (m.perPerson[name] ?? 0),
    0,
  );
  const recentVolAvg = safeDivide(recentVol, recentMonths.length);
  const earlierVolAvg = safeDivide(earlierVol, earlierMonths.length);
  if (earlierVolAvg > 0 && recentVolAvg < earlierVolAvg) {
    const decrease = safeDivide(earlierVolAvg - recentVolAvg, earlierVolAvg);
    volSubScore = clamp(decrease * 100, 0, 100);
    if (volSubScore > 30) {
      factors.push('Mniej wiadomości w ostatnich miesiącach');
    }
  }

  const score = clamp(
    Math.round(
      rtSubScore * 0.3 +
      mlSubScore * 0.25 +
      initSubScore * 0.25 +
      volSubScore * 0.2,
    ),
    0,
    100,
  );

  if (factors.length === 0 && score > 0) {
    factors.push('Niewielkie zmiany w aktywności');
  }

  return { score, factors };
}

// ============================================================
// Main Export
// ============================================================

export function computeViralScores(
  quantitative: QuantitativeInput,
  conversation: ParsedConversation,
): ViralScores {
  const names = conversation.participants.map((p) => p.name);
  const totalMessages = conversation.messages.length;

  // ── Compatibility Score ──────────────────────────────────
  const activityOverlap = activityOverlapScore(quantitative.heatmap, names);
  const responseSymmetry = responseSymmetryScore(quantitative.timing, names);
  const messageBalance = messageBalanceScore(quantitative.engagement, names);
  const engagementBalance = engagementBalanceScore(quantitative.engagement, names);
  const lengthMatch = lengthMatchScore(quantitative.perPerson, names);

  const compatibilityScore = clamp(
    Math.round(
      (activityOverlap + responseSymmetry + messageBalance + engagementBalance + lengthMatch) / 5,
    ),
    0,
    100,
  );

  // ── Interest Scores ──────────────────────────────────────
  const interestScores: Record<string, number> = {};
  for (const name of names) {
    interestScores[name] = computeInterestScore(name, quantitative, totalMessages);
  }

  // ── Ghost Risk ───────────────────────────────────────────
  const ghostRisk: Record<string, GhostRiskData> = {};
  for (const name of names) {
    ghostRisk[name] = computeGhostRisk(name, quantitative);
  }

  // ── Delusion Score ───────────────────────────────────────
  const interestValues = Object.entries(interestScores);
  let delusionScore = 0;
  let delusionHolder: string | undefined;

  if (interestValues.length >= 2) {
    const sorted = [...interestValues].sort((a, b) => b[1] - a[1]);
    delusionScore = Math.abs(sorted[0][1] - sorted[1][1]);
    // Delusion holder = person with LOWER interest score — they don't see the asymmetry
    // (the more invested person is aware of their investment; the less invested one is oblivious)
    delusionHolder = sorted[1][0];
    if (delusionScore < 5) {
      delusionHolder = undefined;
    }
  }

  return {
    compatibilityScore,
    interestScores,
    ghostRisk,
    delusionScore: clamp(delusionScore, 0, 100),
    delusionHolder,
  };
}
