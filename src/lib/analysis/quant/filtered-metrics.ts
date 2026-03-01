/**
 * Filtered metrics utilities — recomputes aggregate chart data
 * from a time-range-filtered subset of messages.
 *
 * Used by the Obserwatorium global time range filter.
 */

import type { UnifiedMessage, HeatmapData, ResponseTimeDistribution, ResponseTimeBin } from '../../parsers/types';
import { SESSION_GAP_MS } from '../constants';

// ── Time range helpers ─────────────────────────────────────

export type TimeRange = '1M' | '3M' | '6M' | 'Rok' | 'Wszystko';

/** Get cutoff Date for a time range relative to the latest message. */
export function getCutoffDate(range: TimeRange, latestTimestamp: number): Date {
  const latest = new Date(latestTimestamp);
  switch (range) {
    case '1M': return new Date(latest.getFullYear(), latest.getMonth() - 1, latest.getDate());
    case '3M': return new Date(latest.getFullYear(), latest.getMonth() - 3, latest.getDate());
    case '6M': return new Date(latest.getFullYear(), latest.getMonth() - 6, latest.getDate());
    case 'Rok': return new Date(latest.getFullYear() - 1, latest.getMonth(), latest.getDate());
    case 'Wszystko': return new Date(0);
  }
}

/** Get YYYY-MM cutoff month key for filtering monthly arrays. */
export function getCutoffMonthKey(range: TimeRange, latestTimestamp: number): string {
  const cutoff = getCutoffDate(range, latestTimestamp);
  const y = cutoff.getFullYear();
  const m = String(cutoff.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Filter a monthly array (items with `.month` field) by time range. */
export function filterMonthlyByRange<T extends { month: string }>(
  data: T[] | undefined,
  range: TimeRange,
  latestTimestamp: number,
): T[] {
  if (!data || data.length === 0) return [];
  if (range === 'Wszystko') return data;
  const cutoff = getCutoffMonthKey(range, latestTimestamp);
  return data.filter(d => d.month >= cutoff);
}

/** Filter raw messages by time range. */
export function filterMessagesByRange(
  messages: UnifiedMessage[],
  range: TimeRange,
  latestTimestamp: number,
): UnifiedMessage[] {
  if (range === 'Wszystko') return messages;
  const cutoff = getCutoffDate(range, latestTimestamp).getTime();
  return messages.filter(m => m.timestamp >= cutoff);
}

// ── Aggregate recomputation ────────────────────────────────

/** Recompute heatmap (7x24 grid) from a filtered message set. */
export function computeHeatmapFromMessages(
  messages: UnifiedMessage[],
  participantNames: string[],
): HeatmapData {
  const perPerson: Record<string, number[][]> = {};
  for (const name of participantNames) {
    perPerson[name] = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  }
  const combined: number[][] = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));

  for (const msg of messages) {
    const d = new Date(msg.timestamp);
    // JS: 0=Sunday → convert to 0=Monday
    const jsDay = d.getDay();
    const day = jsDay === 0 ? 6 : jsDay - 1;
    const hour = d.getHours();

    combined[day][hour]++;
    if (perPerson[msg.sender]) {
      perPerson[msg.sender][day][hour]++;
    }
  }

  return { perPerson, combined };
}

// ── Response time distribution bins ────────────────────────

const RT_BINS: ReadonlyArray<{ label: string; minMs: number; maxMs: number }> = [
  { label: '<10s', minMs: 0, maxMs: 10_000 },
  { label: '10-30s', minMs: 10_000, maxMs: 30_000 },
  { label: '30s-1m', minMs: 30_000, maxMs: 60_000 },
  { label: '1-5m', minMs: 60_000, maxMs: 300_000 },
  { label: '5-15m', minMs: 300_000, maxMs: 900_000 },
  { label: '15-30m', minMs: 900_000, maxMs: 1_800_000 },
  { label: '30m-1h', minMs: 1_800_000, maxMs: 3_600_000 },
  { label: '1-2h', minMs: 3_600_000, maxMs: 7_200_000 },
  { label: '2-6h', minMs: 7_200_000, maxMs: 21_600_000 },
  { label: '6-24h', minMs: 21_600_000, maxMs: 86_400_000 },
  { label: '24h+', minMs: 86_400_000, maxMs: Infinity },
];

// SESSION_GAP_MS imported from constants.ts

/**
 * Recompute response time distribution from filtered messages.
 * Extracts response times from consecutive message pairs (different senders,
 * within session gap), then bins them.
 */
export function computeResponseTimeDistributionFromMessages(
  messages: UnifiedMessage[],
  participantNames: string[],
): ResponseTimeDistribution {
  // Collect response times per person
  const responseTimes: Record<string, number[]> = {};
  for (const name of participantNames) {
    responseTimes[name] = [];
  }

  for (let i = 1; i < messages.length; i++) {
    const prev = messages[i - 1];
    const curr = messages[i];
    if (prev.sender !== curr.sender) {
      const gap = curr.timestamp - prev.timestamp;
      if (gap > 0 && gap < SESSION_GAP_MS) {
        if (responseTimes[curr.sender]) {
          responseTimes[curr.sender].push(gap);
        }
      }
    }
  }

  // Bin them
  const perPerson: Record<string, ResponseTimeBin[]> = {};
  for (const name of participantNames) {
    const times = responseTimes[name];
    const total = times.length;
    perPerson[name] = RT_BINS.map(bin => {
      const count = times.filter(t => t >= bin.minMs && t < bin.maxMs).length;
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

// ── Burst & conflict filtering ───────────────────────────

/** Filter bursts by time range. Bursts have startDate/endDate in "YYYY-MM-DD" format. */
export function filterBurstsByRange(
  bursts: Array<{ startDate: string; endDate: string; messageCount: number; avgDaily: number }> | undefined,
  range: TimeRange,
  latestTimestamp: number,
): Array<{ startDate: string; endDate: string; messageCount: number; avgDaily: number }> {
  if (!bursts || bursts.length === 0 || range === 'Wszystko') return bursts ?? [];
  const cutoff = getCutoffDate(range, latestTimestamp);
  const cutoffStr = cutoff.toISOString().slice(0, 10); // "YYYY-MM-DD"
  return bursts.filter(b => b.endDate >= cutoffStr);
}

/** Filter conflict events by time range. Events have a `date` field in "YYYY-MM-DD" format. */
export function filterConflictEventsByRange<T extends { date: string }>(
  events: T[] | undefined,
  range: TimeRange,
  latestTimestamp: number,
): T[] {
  if (!events || events.length === 0 || range === 'Wszystko') return events ?? [];
  const cutoff = getCutoffDate(range, latestTimestamp);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return events.filter(e => e.date >= cutoffStr);
}

/**
 * Recompute weekday/weekend split from filtered messages.
 */
export function computeWeekdayWeekendFromMessages(
  messages: UnifiedMessage[],
  participantNames: string[],
): { weekday: Record<string, number>; weekend: Record<string, number> } {
  const weekday: Record<string, number> = {};
  const weekend: Record<string, number> = {};
  for (const name of participantNames) {
    weekday[name] = 0;
    weekend[name] = 0;
  }

  for (const msg of messages) {
    const d = new Date(msg.timestamp);
    const jsDay = d.getDay();
    const isWeekend = jsDay === 0 || jsDay === 6;
    if (isWeekend) {
      weekend[msg.sender] = (weekend[msg.sender] ?? 0) + 1;
    } else {
      weekday[msg.sender] = (weekday[msg.sender] ?? 0) + 1;
    }
  }

  return { weekday, weekend };
}
