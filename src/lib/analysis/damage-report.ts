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

  // Emotional Damage: inverse of health + sentiment asymmetry
  const sentimentValues = quant.sentimentAnalysis
    ? Object.values(quant.sentimentAnalysis.perPerson).map(s => s.avgSentiment)
    : [];
  const sentimentAsymmetry = sentimentValues.length >= 2
    ? Math.abs(sentimentValues[0] - sentimentValues[1]) * 50
    : 0;
  const emotionalDamage = Math.min(100, Math.round((100 - healthScore) * 0.8 + sentimentAsymmetry * 0.2));

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

  // Therapy Needed
  let therapyNeeded: DamageReportResult['therapyNeeded'];
  if (healthScore < 40) therapyNeeded = 'YES';
  else if (healthScore < 60) therapyNeeded = 'RECOMMENDED';
  else therapyNeeded = 'NO';

  return { emotionalDamage, communicationGrade: grade, repairPotential, therapyNeeded };
}
