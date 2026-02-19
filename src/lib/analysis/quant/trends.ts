/**
 * Trend and time-series computation for quantitative analysis.
 *
 * Computes monthly trends for response times, message lengths,
 * and conversation initiations from the accumulated per-person data.
 */

import type { TrendData } from '../../parsers/types';
import type { PersonAccumulator } from './types';
import { median, filterResponseTimeOutliers } from './helpers';

/**
 * Compute all trend data from accumulated per-person monthly data.
 *
 * Produces three trend arrays (one entry per month):
 * - responseTimeTrend: monthly median response time per person (outlier-filtered)
 * - messageLengthTrend: monthly average word count per person
 * - initiationTrend: monthly conversation initiation count per person
 */
export function computeTrends(
  accumulators: Map<string, PersonAccumulator>,
  sortedMonths: string[],
  monthlyInitiations: Map<string, Record<string, number>>,
  participantNames: string[],
): TrendData {
  // Response time trend: monthly medians (more robust than means), outlier-filtered
  const responseTimeTrend: TrendData['responseTimeTrend'] = sortedMonths.map(
    (month) => {
      const pp: Record<string, number> = {};
      for (const [name, acc] of accumulators) {
        const times = acc.monthlyResponseTimes.get(month);
        if (times && times.length > 0) {
          pp[name] = median(filterResponseTimeOutliers(times));
        } else {
          pp[name] = 0;
        }
      }
      return { month, perPerson: pp };
    },
  );

  // Message length trend: monthly average word count per person
  const messageLengthTrend: TrendData['messageLengthTrend'] = sortedMonths.map(
    (month) => {
      const pp: Record<string, number> = {};
      for (const [name, acc] of accumulators) {
        const words = acc.monthlyWordCounts.get(month);
        if (words && words.length > 0) {
          pp[name] = words.reduce((a, b) => a + b, 0) / words.length;
        } else {
          pp[name] = 0;
        }
      }
      return { month, perPerson: pp };
    },
  );

  // Initiation trend: monthly conversation initiation count per person
  const initiationTrend: TrendData['initiationTrend'] = sortedMonths.map(
    (month) => {
      const initiations = monthlyInitiations.get(month);
      const pp: Record<string, number> = {};
      for (const name of participantNames) {
        pp[name] = initiations?.[name] ?? 0;
      }
      // Also include any extra senders not in original participantNames
      if (initiations) {
        for (const name of Object.keys(initiations)) {
          if (!(name in pp)) {
            pp[name] = initiations[name];
          }
        }
      }
      return { month, perPerson: pp };
    },
  );

  return {
    responseTimeTrend,
    messageLengthTrend,
    initiationTrend,
  };
}
