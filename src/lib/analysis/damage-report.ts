/**
 * Damage Report — composite metrics from purely quantitative data.
 *
 * Produces: Emotional Damage %, Communication Grade (A-F),
 * Repair Potential %, and Therapy Benefit verdict.
 *
 * NOTE: Emotional Damage is 100% quantitative — no AI dependency.
 * The function still accepts pass4/pass2 for Repair Potential and
 * Therapy Benefit, but emotionalDamage itself never uses AI scores.
 */

import type { QuantitativeAnalysis, DamageReportResult } from '../parsers/types';
import type { Pass4Result, Pass2Result } from './types';

/** Clamp a number to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeDamageReport(
  quant: QuantitativeAnalysis,
  pass4?: Pass4Result,
  pass2?: Pass2Result,
): DamageReportResult {
  const healthScore = pass4?.health_score?.overall ?? 50;

  // === Emotional Damage — 5-component purely quantitative formula ===
  //
  // Decoupled from AI Health Score to eliminate circular dependency.
  // All inputs come from client-side quantitative analysis.
  //
  // Components (weights sum to 1.0):
  //   1. Negative sentiment     (0.30) — average sentiment polarity
  //   2. Conflict density       (0.25) — conflicts per month, scaled
  //   3. Reciprocity imbalance  (0.20) — deviation from balanced exchange
  //   4. Response time asymmetry(0.15) — abs difference in avg response times
  //   5. Volume decline         (0.10) — recent volume vs peak month

  // Component 1: Negative sentiment (0-100)
  const sentimentValues = quant.sentimentAnalysis
    ? Object.values(quant.sentimentAnalysis.perPerson).map(s => s.avgSentiment)
    : [];
  const avgSentiment = sentimentValues.length > 0
    ? sentimentValues.reduce((a, b) => a + b, 0) / sentimentValues.length
    : 0;
  const negativeSentiment = Math.max(0, -avgSentiment); // 0-1 scale
  const negativeDamage = clamp(Math.round(negativeSentiment * 100), 0, 100);

  // Component 2: Conflict density (0-100)
  // conflicts/month * 25 — so 4+ conflicts/month → cap at 100
  const conflicts = quant.conflictAnalysis?.totalConflicts ?? 0;
  const months = Math.max(1, quant.patterns.monthlyVolume?.length ?? 1);
  const conflictDamage = clamp(Math.round((conflicts / months) * 25), 0, 100);

  // Component 3: Reciprocity imbalance (0-100)
  // reciprocityIndex=50 (perfect balance) → 0 damage; reciprocityIndex=0 → 100 damage
  const reciprocityImbalance = clamp(Math.round(Math.max(0, 50 - (quant.reciprocityIndex?.overall ?? 50)) * 2), 0, 100);

  // Component 4: Response time asymmetry (0-100)
  // Measures how lopsided average response times are between participants.
  // Large asymmetry suggests one person is significantly more invested.
  const responseTimes = Object.values(quant.timing.perPerson).map(t => t.averageResponseTimeMs);
  let responseAsymmetry = 0;
  if (responseTimes.length >= 2) {
    const maxRT = Math.max(...responseTimes);
    const minRT = Math.min(...responseTimes);
    // Ratio-based: if one waits 3x longer, asymmetry = ~67%.
    // Using (max-min)/max gives 0-1 range, then scale to 0-100.
    if (maxRT > 0) {
      responseAsymmetry = clamp(Math.round(((maxRT - minRT) / maxRT) * 100), 0, 100);
    }
  }

  // Component 5: Volume decline (0-100)
  // Compares average of last 2 months to peak month.
  // A conversation that peaked at 500 msgs/month but now has 100 → 80% decline.
  const monthlyTotals = (quant.patterns.monthlyVolume ?? []).map(m => m.total);
  let volumeDecline = 0;
  if (monthlyTotals.length >= 3) {
    const peakVolume = Math.max(...monthlyTotals);
    // Average of last 2 months
    const recentAvg = (monthlyTotals[monthlyTotals.length - 1] + monthlyTotals[monthlyTotals.length - 2]) / 2;
    if (peakVolume > 0) {
      const declineRatio = Math.max(0, (peakVolume - recentAvg) / peakVolume);
      volumeDecline = clamp(Math.round(declineRatio * 100), 0, 100);
    }
  }

  // Weighted sum — each component 0-100, weights sum to 1.0.
  // Theoretical max = 100. clamp guards against floating point drift.
  const emotionalDamage = clamp(Math.round(
    negativeDamage       * 0.30 +
    conflictDamage       * 0.25 +
    reciprocityImbalance * 0.20 +
    responseAsymmetry    * 0.15 +
    volumeDecline        * 0.10
  ), 0, 100);

  // Communication Grade
  const reciprocity = quant.reciprocityIndex?.overall ?? 50;
  let grade: string;
  if (reciprocity >= 80) grade = 'A';
  else if (reciprocity >= 65) grade = 'B';
  else if (reciprocity >= 45) grade = 'C';
  else if (reciprocity >= 25) grade = 'D';
  else grade = 'F';

  // Repair Potential
  const greenFlags = pass2?.green_flags?.length ?? 0;
  const redFlags = pass2?.red_flags?.length ?? 0;
  const flagBalance = greenFlags / Math.max(greenFlags + redFlags, 1);
  const volumeTrend = quant.patterns.volumeTrend > 0 ? 1 : quant.patterns.volumeTrend < 0 ? -1 : 0;
  const repairPotential = Math.min(100, Math.round(flagBalance * 60 + (volumeTrend > 0 ? 20 : 0) + (healthScore > 30 ? 20 : 0)));

  // Therapy benefit — decoupled from AI health score
  const hasHighConflicts = (conflicts / months) > 1.5;
  const hasNegativeSentiment = negativeSentiment > 0.25;
  const lowReciprocity = (quant.reciprocityIndex?.overall ?? 50) < 25;
  let therapyBenefit: DamageReportResult['therapyBenefit'];
  if (hasHighConflicts || hasNegativeSentiment || healthScore < 40) {
    therapyBenefit = 'HIGH';
  } else if (lowReciprocity || healthScore < 60) {
    therapyBenefit = 'MODERATE';
  } else {
    therapyBenefit = 'LOW';
  }

  return { emotionalDamage, communicationGrade: grade, repairPotential, therapyBenefit };
}
