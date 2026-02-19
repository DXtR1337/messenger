/**
 * Burst detection logic for quantitative analysis.
 *
 * Identifies periods of unusually high messaging activity
 * by comparing daily counts against a rolling 7-day average.
 * Days exceeding 3x the rolling average are flagged as bursts,
 * and consecutive burst days are merged into burst periods.
 */

import type { PatternMetrics } from '../../parsers/types';

/**
 * Detect bursts — days where message count exceeds 3x
 * the rolling 7-day average. Consecutive burst days are
 * merged into burst periods.
 */
export function detectBursts(
  dailyCounts: Map<string, number>,
): PatternMetrics['bursts'] {
  const sortedDays = [...dailyCounts.keys()].sort();
  if (sortedDays.length < 8) return [];

  const dayValues: Array<{ day: string; count: number }> = sortedDays.map(
    (day) => ({
      day,
      count: dailyCounts.get(day) ?? 0,
    }),
  );

  // Compute rolling 7-day average for each day.
  // For the first 7 days, use the overall average as baseline.
  const overallAvg =
    dayValues.reduce((sum, d) => sum + d.count, 0) / dayValues.length;

  const burstDays: Array<{ day: string; count: number }> = [];

  for (let i = 0; i < dayValues.length; i++) {
    let rollingAvg: number;
    if (i < 7) {
      rollingAvg = overallAvg;
    } else {
      let sum = 0;
      for (let j = i - 7; j < i; j++) {
        sum += dayValues[j].count;
      }
      rollingAvg = sum / 7;
    }

    if (dayValues[i].count > 3 * rollingAvg && rollingAvg > 0) {
      burstDays.push(dayValues[i]);
    }
  }

  if (burstDays.length === 0) return [];

  // Merge consecutive burst days into burst periods.
  // Two days are "consecutive" if they are within 1 calendar day.
  const bursts: PatternMetrics['bursts'] = [];
  let currentBurst = {
    startDate: burstDays[0].day,
    endDate: burstDays[0].day,
    messageCount: burstDays[0].count,
    days: 1,
  };

  for (let i = 1; i < burstDays.length; i++) {
    const prevDate = new Date(currentBurst.endDate + 'T00:00:00Z');
    const currDate = new Date(burstDays[i].day + 'T00:00:00Z');
    const diffDays =
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays <= 1) {
      // Extend current burst
      currentBurst.endDate = burstDays[i].day;
      currentBurst.messageCount += burstDays[i].count;
      currentBurst.days++;
    } else {
      // Finalize current burst and start new one
      bursts.push({
        startDate: currentBurst.startDate,
        endDate: currentBurst.endDate,
        messageCount: currentBurst.messageCount,
        avgDaily: currentBurst.messageCount / currentBurst.days,
      });
      currentBurst = {
        startDate: burstDays[i].day,
        endDate: burstDays[i].day,
        messageCount: burstDays[i].count,
        days: 1,
      };
    }
  }

  // Push final burst
  bursts.push({
    startDate: currentBurst.startDate,
    endDate: currentBurst.endDate,
    messageCount: currentBurst.messageCount,
    avgDaily: currentBurst.messageCount / currentBurst.days,
  });

  return bursts;
}
