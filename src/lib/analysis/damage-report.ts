/**
 * Damage Report — composite metrics combining quantitative + qualitative data.
 *
 * Produces: Emotional Damage %, Communication Grade (A-F),
 * Repair Potential %, and Therapy Needed verdict.
 */

import type { QuantitativeAnalysis, DamageReportResult } from '../parsers/types';
import type { Pass4Result, Pass2Result } from './types';

export function computeDamageReport(
  quant: QuantitativeAnalysis,
  pass4?: Pass4Result,
  pass2?: Pass2Result,
): DamageReportResult {
  const healthScore = pass4?.health_score?.overall ?? 50;

  // === Emotional Damage — 4-component formula (80% quant, 20% AI) ===

  // Component 1: Negative sentiment (quant, not AI)
  const sentimentValues = quant.sentimentAnalysis
    ? Object.values(quant.sentimentAnalysis.perPerson).map(s => s.avgSentiment)
    : [];
  const avgSentiment = sentimentValues.length > 0
    ? sentimentValues.reduce((a, b) => a + b, 0) / sentimentValues.length
    : 0;
  const negativeSentiment = Math.max(0, -avgSentiment); // 0-1 scale
  const negativeDamage = Math.min(100, Math.round(negativeSentiment * 100));

  // Component 2: Conflict density (quant)
  const conflicts = quant.conflictAnalysis?.totalConflicts ?? 0;
  const months = Math.max(1, quant.patterns.monthlyVolume?.length ?? 1);
  const conflictDamage = Math.min(100, Math.round((conflicts / months) * 25));

  // Component 3: Reciprocity imbalance (quant)
  // reciprocityIndex=50 (perfect balance) → 0 damage; reciprocityIndex=0 → 100 damage
  const reciprocityImbalance = Math.min(100, Math.round(Math.max(0, 50 - (quant.reciprocityIndex?.overall ?? 50)) * 2));

  // Component 4: AI health as sanity check (20% only)
  const aiHealthDamage = 100 - healthScore;

  const emotionalDamage = Math.min(100, Math.round(
    negativeDamage       * 0.35 +
    conflictDamage       * 0.25 +
    reciprocityImbalance * 0.20 +
    aiHealthDamage       * 0.20
  ));

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
