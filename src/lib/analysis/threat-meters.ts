/**
 * Threat Meters — 4 composite risk/health indicators computed from quantitative data.
 *
 * Ghost Risk, Codependency, Power Imbalance, and Trust Index.
 * Each scored 0-100 with level classification and contributing factors.
 */

import type { QuantitativeAnalysis, ThreatMeter, ThreatMetersResult } from '../parsers/types';

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function getLevel(score: number): ThreatMeter['level'] {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'elevated';
  if (score >= 30) return 'moderate';
  return 'low';
}

export function computeThreatMeters(quant: QuantitativeAnalysis): ThreatMetersResult {
  const names = Object.keys(quant.perPerson);
  if (names.length < 2) return { meters: [] };

  // --- Ghost Risk: reuse from viralScores ---
  const ghostScores = quant.viralScores?.ghostRisk ?? {};
  const maxGhostRisk = Math.max(...Object.values(ghostScores).map(g => g.score), 0);
  const ghostFactors = Object.entries(ghostScores)
    .filter(([, g]) => g.score > 30)
    .flatMap(([name, g]) => g.factors.map(f => `${name}: ${f}`));

  // --- Codependency Index ---
  // Based on: initiation imbalance, double-text rate, response time asymmetry
  const initiations = quant.timing.conversationInitiations;
  const totalInit = Object.values(initiations).reduce((a, b) => a + b, 0);
  const initRatios = names.map(n => totalInit > 0 ? (initiations[n] ?? 0) / totalInit : 0.5);
  const initiationImbalance = Math.abs(initRatios[0] - initRatios[1]) * 100; // 0-100 range

  // DT rate uses per-person denominator — global totalMsgs would deflate dominant sender's rate
  const doubleTextRates = names.map(n => {
    const personMsgs = quant.perPerson[n]?.totalMessages ?? 0;
    return personMsgs > 0 ? (quant.engagement.doubleTexts[n] ?? 0) / personMsgs * 1000 : 0;
  });
  const maxDoubleTextRate = Math.max(...doubleTextRates);

  const responseTimes = names.map(n => quant.timing.perPerson[n]?.medianResponseTimeMs ?? 0);
  const rtRatio = responseTimes[1] > 0 ? responseTimes[0] / responseTimes[1] : 1;
  // RT asymmetry: log scale, directionality-agnostic by design
  // (measures imbalance magnitude regardless of who responds slower)
  const rtAsymmetry = Math.abs(Math.log10(Math.max(rtRatio, 0.01))) * 30;

  // Normalize double-text rate: cap at 80/1000 to prevent it from dominating the score
  const dtNorm = Math.min(maxDoubleTextRate, 80);
  // Weights normalized to sum=1.0 (original ratios 0.7:0.35:0.5 preserved proportionally)
  const codependencyScore = clamp(initiationImbalance * 0.45 + dtNorm * 0.22 + rtAsymmetry * 0.33);
  const codependencyFactors: string[] = [];
  if (initiationImbalance > 15) codependencyFactors.push(`Nierówna inicjacja: ${Math.round(Math.max(...initRatios) * 100)}%`);
  if (maxDoubleTextRate > 5) codependencyFactors.push(`Double-texty: ${maxDoubleTextRate.toFixed(1)}/1000 msg`);
  if (rtAsymmetry > 20) codependencyFactors.push(`Asymetria czasu odpowiedzi`);

  // --- Power Imbalance Index ---
  // Based on: reciprocity asymmetry, reaction imbalance, initiation imbalance
  const reciprocity = quant.reciprocityIndex;
  const recipImbalance = reciprocity ? Math.abs(reciprocity.overall - 50) * 2 : 0;
  const reactionImbalance = reciprocity ? Math.abs(reciprocity.reactionBalance - 50) * 2 : 0;
  const powerImbalanceScore = clamp(recipImbalance * 0.5 + reactionImbalance * 0.3 + initiationImbalance * 0.2);
  const powerImbalanceFactors: string[] = [];
  if (recipImbalance > 30) powerImbalanceFactors.push(`Nierówna wzajemność: ${Math.round(recipImbalance)}%`);
  if (reactionImbalance > 30) powerImbalanceFactors.push(`Nierówne reakcje`);

  // --- Trust Index (inverted — higher = MORE trust) ---
  const responseConsistency = reciprocity ? reciprocity.responseTimeSymmetry : 50;
  const ghostFreqNorm = maxGhostRisk / 100;
  const recipNorm = reciprocity ? reciprocity.overall / 100 : 0.5;
  // Explicit weights summing to 1.0 — each component normalized to 0-100
  const W = { reciprocity: 0.40, responseConsistency: 0.40, ghostRisk: 0.20 };
  const trustScore = clamp(
    recipNorm * 100 * W.reciprocity +
    responseConsistency * W.responseConsistency +
    (1 - ghostFreqNorm) * 100 * W.ghostRisk
  );
  const trustFactors: string[] = [];
  if (trustScore < 40) trustFactors.push('Niski poziom wzajemności');
  if (ghostFreqNorm > 0.5) trustFactors.push('Wysokie ryzyko ghostingu');
  if (responseConsistency < 30) trustFactors.push('Niestabilny czas odpowiedzi');

  return {
    meters: [
      { id: 'ghost_risk', label: 'Ghost Risk', score: Math.round(maxGhostRisk), level: getLevel(maxGhostRisk), factors: ghostFactors },
      { id: 'codependency', label: 'Intensywność Przywiązania', score: Math.round(codependencyScore), level: getLevel(codependencyScore), factors: codependencyFactors },
      { id: 'power_imbalance', label: 'Nierównowaga Wpływu', score: Math.round(powerImbalanceScore), level: getLevel(powerImbalanceScore), factors: powerImbalanceFactors },
      { id: 'trust', label: 'Indeks Zaufania', score: Math.round(trustScore), level: getLevel(trustScore), factors: trustFactors },
    ],
  };
}
