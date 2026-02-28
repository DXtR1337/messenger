/**
 * Ranking Percentiles — heuristic percentile system based on statistical distributions.
 *
 * Computes "TOP X%" rankings for key conversation metrics using
 * log-normal CDF approximations. No global database needed — the
 * medians and sigmas are calibrated from typical conversation statistics.
 *
 * IMPORTANT — Two percentile systems coexist in this codebase:
 * - THIS FILE: Log-normal CDF → "TOP X%" badge display in RankingBadges.tsx
 *   Metrics: message_volume, response_time, ghost_frequency, asymmetry
 * - percentiles.ts: Step-function thresholds → KPI card numeric percentile display
 *   Metrics: responseTimeMinutes, messagesPerDay, healthScore, emojiDiversity, conversationLengthMonths
 *
 * Do NOT consolidate without mapping all UI consumers first.
 * These serve different UI purposes and use different output formats.
 */

import type { QuantitativeAnalysis, RankingPercentile, RankingPercentiles } from '../parsers/types';

// Heuristic CDF based on log-normal/normal distributions
function logNormalPercentile(value: number, medianVal: number, sigma: number): number {
  if (value <= 0 || medianVal <= 0) return 50;
  const z = (Math.log(value) - Math.log(medianVal)) / sigma;
  // Approximate normal CDF (Abramowitz & Stegun)
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.8212560 + t * 1.3302744))));
  return Math.round((z >= 0 ? 1 - p : p) * 100);
}

export function computeRankingPercentiles(quant: QuantitativeAnalysis): RankingPercentiles {
  const names = Object.keys(quant.perPerson);
  const totalMessages = names.reduce((s, n) => s + quant.perPerson[n].totalMessages, 0);

  // Median response time (take faster person)
  const medianRTs = names.map(n => quant.timing.perPerson[n]?.medianResponseTimeMs ?? 0).filter(t => t > 0);
  const fastestRT = medianRTs.length > 0 ? Math.min(...medianRTs) : 0;

  // Ghost frequency: longest silence normalized
  const longestSilenceH = quant.timing.longestSilence.durationMs / 3_600_000;

  // Asymmetry: initiation ratio imbalance
  const initVals = Object.values(quant.timing.conversationInitiations);
  const totalInit = initVals.reduce((a, b) => a + b, 0);
  const maxInitRatio = totalInit > 0 ? Math.max(...initVals) / totalInit : 0.5;
  const asymmetry = Math.abs(maxInitRatio - 0.5) * 200; // 0-100 scale

  // HEURISTIC MEDIANS — calibrated from informal estimates of typical chat conversations.
  // These are NOT derived from empirical population data. Percentiles are approximate.
  //   3000 msgs   = ~6 months of active daily conversations
  //   480s (8min) = typical casual conversation median response time
  //   12h silence = typical overnight gap in active relationships
  //   20 asymmetry = ~60/40 initiation split (moderate imbalance)
  const rankings: RankingPercentile[] = [
    {
      metric: 'message_volume',
      label: 'Wolumen wiadomości',
      value: totalMessages,
      percentile: logNormalPercentile(totalMessages, 3000, 1.2),
      emoji: '💬',
    },
    {
      metric: 'response_time',
      label: 'Czas odpowiedzi',
      value: fastestRT,
      percentile: fastestRT > 0 ? 100 - logNormalPercentile(fastestRT, 480_000, 1.0) : 50, // invert: faster = better
      emoji: '⚡',
    },
    {
      metric: 'ghost_frequency',
      label: 'Częstotliwość ghostingu',
      value: longestSilenceH,
      percentile: logNormalPercentile(longestSilenceH, 12, 0.8),
      emoji: '👻',
    },
    {
      metric: 'asymmetry',
      label: 'Asymetria relacji',
      value: asymmetry,
      percentile: logNormalPercentile(asymmetry + 1, 20, 0.9),
      emoji: '⚖️',
    },
  ];

  return { rankings };
}
