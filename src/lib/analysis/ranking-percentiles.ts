/**
 * Ranking Percentiles — heuristic percentile system based on statistical distributions.
 *
 * Computes "TOP X%" rankings for key conversation metrics using
 * log-normal CDF approximations. No global database needed — the
 * medians and sigmas are calibrated from typical conversation statistics.
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
