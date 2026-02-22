/**
 * Response Time Distribution — bins response times into histogram buckets.
 *
 * Groups each person's response times into predefined time buckets
 * (e.g. <10s, 10-30s, 1-5m, etc.) with counts and percentages.
 */

import type { ResponseTimeBin, ResponseTimeDistribution } from '../../parsers/types';
import type { PersonAccumulator } from './types';

const BINS: ReadonlyArray<{ label: string; minMs: number; maxMs: number }> = [
  { label: '<10s', minMs: 0, maxMs: 10_000 },
  { label: '10-30s', minMs: 10_000, maxMs: 30_000 },
  { label: '30s-1m', minMs: 30_000, maxMs: 60_000 },
  { label: '1-5m', minMs: 60_000, maxMs: 300_000 },
  { label: '5-15m', minMs: 300_000, maxMs: 900_000 },
  { label: '15-30m', minMs: 900_000, maxMs: 1_800_000 },
  { label: '30m-1h', minMs: 1_800_000, maxMs: 3_600_000 },
  { label: '1h+', minMs: 3_600_000, maxMs: Infinity },
];

/**
 * Compute response time distribution for each person.
 *
 * For each person, categorizes their response times into bins and calculates
 * the count and percentage within each bin.
 */
export function computeResponseTimeDistribution(
  accumulators: Map<string, PersonAccumulator>,
): ResponseTimeDistribution {
  const perPerson: Record<string, ResponseTimeBin[]> = {};

  for (const [name, acc] of accumulators) {
    const times = acc.responseTimes;
    const total = times.length;

    perPerson[name] = BINS.map((bin) => {
      const count = times.filter((t) => t >= bin.minMs && t < bin.maxMs).length;
      return {
        label: bin.label,
        minMs: bin.minMs,
        maxMs: bin.maxMs,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      };
    });
  }

  return { perPerson };
}
