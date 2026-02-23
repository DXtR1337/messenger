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

  // Message length trend: monthly median word count per person (robust to outliers)
  const messageLengthTrend: TrendData['messageLengthTrend'] = sortedMonths.map(
    (month) => {
      const pp: Record<string, number> = {};
      for (const [name, acc] of accumulators) {
        const words = acc.monthlyWordCounts.get(month);
        if (words && words.length > 0) {
          pp[name] = median(words);
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


// ============================================================
// Year Milestones
// ============================================================

const MONTH_NAMES_PL = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];

/**
 * Compute year milestones from monthly volume data.
 *
 * Identifies peak month, worst month, and year-over-year trend
 * by comparing the recent half of the conversation to the older half.
 */
export function computeYearMilestones(
  monthlyVolume: Array<{ month: string; perPerson: Record<string, number>; total: number }>,
): import('../../parsers/types').YearMilestones | undefined {
  if (monthlyVolume.length < 2) return undefined;

  let peakIdx = 0;
  let worstIdx = 0;
  for (let i = 1; i < monthlyVolume.length; i++) {
    if (monthlyVolume[i].total > monthlyVolume[peakIdx].total) peakIdx = i;
    if (monthlyVolume[i].total < monthlyVolume[worstIdx].total) worstIdx = i;
  }

  const formatMonth = (m: string): string => {
    const [year, month] = m.split('-');
    const monthIdx = parseInt(month, 10) - 1;
    return `${MONTH_NAMES_PL[monthIdx]} ${year}`;
  };

  // YoY: split by actual date midpoint (not month count) for accurate temporal comparison
  const firstDate = new Date(monthlyVolume[0].month + '-01');
  const lastDate = new Date(monthlyVolume[monthlyVolume.length - 1].month + '-01');
  const midDate = new Date((firstDate.getTime() + lastDate.getTime()) / 2);
  const midMonth = `${midDate.getFullYear()}-${String(midDate.getMonth() + 1).padStart(2, '0')}`;
  const midIdx = monthlyVolume.findIndex(m => m.month >= midMonth);
  const mid = midIdx >= 1 ? midIdx : Math.floor(monthlyVolume.length / 2); // fallback to count-split
  const olderHalf = monthlyVolume.slice(0, mid).reduce((s, v) => s + v.total, 0);
  const recentHalf = monthlyVolume.slice(mid).reduce((s, v) => s + v.total, 0);
  const yoyTrend = olderHalf > 0 ? (recentHalf / olderHalf) - 1 : 0;

  return {
    peakMonth: {
      month: monthlyVolume[peakIdx].month,
      label: formatMonth(monthlyVolume[peakIdx].month),
      count: monthlyVolume[peakIdx].total,
    },
    worstMonth: {
      month: monthlyVolume[worstIdx].month,
      label: formatMonth(monthlyVolume[worstIdx].month),
      count: monthlyVolume[worstIdx].total,
    },
    yoyTrend,
    totalMonths: monthlyVolume.length,
  };
}
