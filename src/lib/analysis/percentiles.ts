/**
 * Percentile benchmarks — step-function thresholds for KPI card display.
 *
 * Maps conversation metrics to approximate percentile values using
 * hardcoded threshold tables. Used for numeric percentile display
 * in KPI cards (not for RankingBadges "TOP X%" display).
 *
 * IMPORTANT — Two percentile systems coexist in this codebase:
 * - THIS FILE: Step-function thresholds → KPI card numeric percentile display
 *   Metrics: responseTimeMinutes, messagesPerDay, healthScore, emojiDiversity, conversationLengthMonths
 * - ranking-percentiles.ts: Log-normal CDF → "TOP X%" badge display in RankingBadges.tsx
 *   Metrics: message_volume, response_time, ghost_frequency, asymmetry
 *
 * Do NOT consolidate without mapping all UI consumers first.
 * These serve different UI purposes and use different output formats.
 */

export interface PercentileResult {
  metric: string;
  value: number;
  /** 1-100, where 90 means "top 10%" */
  percentile: number;
  /** English label, e.g. "Top 10%" */
  label: string;
  /** Polish label, e.g. "Top 10%" */
  labelPl: string;
}

interface BenchmarkThreshold {
  threshold: number;
  percentile: number;
}

/**
 * Benchmark thresholds derived from typical messaging patterns.
 *
 * For "lower is better" metrics (responseTimeMinutes): being BELOW the
 * threshold earns the percentile.
 *
 * For "higher is better" metrics: being ABOVE the threshold earns the
 * percentile.
 */
const BENCHMARKS = {
  responseTimeMinutes: [
    { threshold: 5, percentile: 90 },   // < 5min = top 10%
    { threshold: 15, percentile: 75 },  // < 15min = top 25%
    { threshold: 60, percentile: 50 },  // < 1h = top 50%
    { threshold: 240, percentile: 25 }, // < 4h = top 75%
  ] as BenchmarkThreshold[],
  messagesPerDay: [
    { threshold: 50, percentile: 95 },  // > 50/day = top 5%
    { threshold: 20, percentile: 85 },  // > 20/day = top 15%
    { threshold: 10, percentile: 70 },  // > 10/day = top 30%
    { threshold: 5, percentile: 50 },   // > 5/day = top 50%
  ] as BenchmarkThreshold[],
  healthScore: [
    { threshold: 80, percentile: 90 },  // > 80 = top 10%
    { threshold: 65, percentile: 75 },  // > 65 = top 25%
    { threshold: 50, percentile: 50 },  // > 50 = top 50%
    { threshold: 35, percentile: 25 },  // > 35 = top 75%
  ] as BenchmarkThreshold[],
  emojiDiversity: [
    { threshold: 20, percentile: 95 },  // > 20 unique = top 5%
    { threshold: 10, percentile: 75 },  // > 10 unique = top 25%
    { threshold: 5, percentile: 50 },   // > 5 unique = top 50%
  ] as BenchmarkThreshold[],
  conversationLengthMonths: [
    { threshold: 36, percentile: 90 },  // > 3 years = top 10%
    { threshold: 12, percentile: 70 },  // > 1 year = top 30%
    { threshold: 6, percentile: 50 },   // > 6 months = top 50%
  ] as BenchmarkThreshold[],
} as const;

export type PercentileMetric = keyof typeof BENCHMARKS;

/** Metrics where LOWER values are better */
const LOWER_IS_BETTER: ReadonlySet<PercentileMetric> = new Set([
  'responseTimeMinutes',
]);

function formatLabel(percentile: number): string {
  if (percentile >= 90) return `Top ${100 - percentile}%`;
  if (percentile >= 75) return `Top ${100 - percentile}%`;
  if (percentile >= 50) return `Top ${100 - percentile}%`;
  return `Bottom ${100 - percentile}%`;
}

function formatLabelPl(percentile: number): string {
  if (percentile >= 90) return `Top ${100 - percentile}%`;
  if (percentile >= 75) return `Top ${100 - percentile}%`;
  if (percentile >= 50) return `Top ${100 - percentile}%`;
  return `Dolne ${100 - percentile}%`;
}

const METRIC_NAMES: Record<PercentileMetric, string> = {
  responseTimeMinutes: 'Czas odpowiedzi',
  messagesPerDay: 'Wiadomości/dzień',
  healthScore: 'Zdrowie relacji',
  emojiDiversity: 'Różnorodność emoji',
  conversationLengthMonths: 'Długość rozmowy',
};

/**
 * Get the percentile ranking for a single metric.
 *
 * For "lower is better" metrics (response time): value below threshold
 * earns the corresponding percentile.
 *
 * For "higher is better" metrics: value above threshold earns it.
 */
export function getPercentile(
  metric: PercentileMetric,
  value: number,
): PercentileResult {
  const thresholds = BENCHMARKS[metric];
  const lowerIsBetter = LOWER_IS_BETTER.has(metric);

  // Thresholds are ordered from best to worst percentile.
  // Walk through and return the first match.
  let bestPercentile = 10; // default: bottom 90%

  for (const { threshold, percentile } of thresholds) {
    const passes = lowerIsBetter
      ? value <= threshold
      : value >= threshold;

    if (passes) {
      bestPercentile = percentile;
      break;
    }
  }

  return {
    metric: METRIC_NAMES[metric],
    value,
    percentile: bestPercentile,
    label: formatLabel(bestPercentile),
    labelPl: formatLabelPl(bestPercentile),
  };
}

/**
 * Compute percentiles for all available metrics at once.
 * Only returns results for metrics where data was provided.
 */
export function getAllPercentiles(analysis: {
  responseTimeMs?: number;
  messagesPerDay?: number;
  healthScore?: number;
  uniqueEmoji?: number;
  monthsSpan?: number;
}): PercentileResult[] {
  const results: PercentileResult[] = [];

  if (analysis.responseTimeMs != null && analysis.responseTimeMs > 0) {
    const minutes = analysis.responseTimeMs / 60_000;
    results.push(getPercentile('responseTimeMinutes', minutes));
  }

  if (analysis.messagesPerDay != null && analysis.messagesPerDay > 0) {
    results.push(getPercentile('messagesPerDay', analysis.messagesPerDay));
  }

  if (analysis.healthScore != null) {
    results.push(getPercentile('healthScore', analysis.healthScore));
  }

  if (analysis.uniqueEmoji != null && analysis.uniqueEmoji > 0) {
    results.push(getPercentile('emojiDiversity', analysis.uniqueEmoji));
  }

  if (analysis.monthsSpan != null && analysis.monthsSpan > 0) {
    results.push(getPercentile('conversationLengthMonths', analysis.monthsSpan));
  }

  return results;
}

/**
 * Map a KPI card id to a percentile result (if applicable).
 * Returns null if the card doesn't have a matching percentile metric.
 */
export function getPercentileForKPI(
  cardId: string,
  numericValue: number,
  _conversationMonths?: number,
): PercentileResult | null {
  switch (cardId) {
    case 'avg-response-time':
      // numericValue is in ms, convert to minutes
      if (numericValue <= 0) return null;
      return getPercentile('responseTimeMinutes', numericValue / 60_000);
    case 'messages-per-day':
      if (numericValue <= 0) return null;
      return getPercentile('messagesPerDay', numericValue);
    default:
      return null;
  }
}
