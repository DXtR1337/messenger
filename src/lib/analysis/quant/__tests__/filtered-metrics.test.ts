/**
 * Tests for filtered-metrics module.
 *
 * Key facts from reading filtered-metrics.ts:
 * - getCutoffDate(range, latestTimestamp): Date — computes cutoff for time ranges
 * - getCutoffMonthKey(range, latestTimestamp): string — "YYYY-MM" cutoff key
 * - filterMonthlyByRange(data, range, latestTimestamp): T[] — filters items with .month
 * - filterMessagesByRange(messages, range, latestTimestamp): UnifiedMessage[]
 * - computeHeatmapFromMessages(messages, participantNames): HeatmapData
 * - computeResponseTimeDistributionFromMessages(messages, participantNames): ResponseTimeDistribution
 * - filterBurstsByRange(bursts, range, latestTimestamp): Burst[]
 * - filterConflictEventsByRange(events, range, latestTimestamp): T[]
 * - computeWeekdayWeekendFromMessages(messages, participantNames): { weekday, weekend }
 * - TimeRange = '1M' | '3M' | '6M' | 'Rok' | 'Wszystko'
 * - 'Wszystko' always returns all data
 * - Cutoff is relative to latestTimestamp
 */
import { describe, it, expect } from 'vitest';
import {
  getCutoffDate,
  getCutoffMonthKey,
  filterMonthlyByRange,
  filterMessagesByRange,
  computeHeatmapFromMessages,
  computeResponseTimeDistributionFromMessages,
  filterBurstsByRange,
  filterConflictEventsByRange,
  computeWeekdayWeekendFromMessages,
} from '../filtered-metrics';
import type { TimeRange } from '../filtered-metrics';
import type { UnifiedMessage } from '@/lib/parsers/types';

// ============================================================
// Fixture helpers
// ============================================================

function makeMsg(
  sender: string,
  content: string,
  timestamp: number,
  index: number = 0,
): UnifiedMessage {
  return {
    index,
    sender,
    timestamp,
    content,
    type: 'text',
    reactions: [],
    hasMedia: false,
    hasLink: false,
    isUnsent: false,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Fixed reference: 2025-06-15 12:00:00 UTC
const LATEST_TS = new Date('2025-06-15T12:00:00Z').getTime();

// ============================================================
// getCutoffDate
// ============================================================

describe('getCutoffDate', () => {
  it('1M returns a date approximately 1 month before latest', () => {
    const cutoff = getCutoffDate('1M', LATEST_TS);
    // Should be around 2025-05-15
    expect(cutoff.getFullYear()).toBe(2025);
    expect(cutoff.getMonth()).toBe(4); // May = 4 (0-indexed)
  });

  it('3M returns a date approximately 3 months before latest', () => {
    const cutoff = getCutoffDate('3M', LATEST_TS);
    // Should be around 2025-03-15
    expect(cutoff.getFullYear()).toBe(2025);
    expect(cutoff.getMonth()).toBe(2); // March = 2
  });

  it('6M returns a date approximately 6 months before latest', () => {
    const cutoff = getCutoffDate('6M', LATEST_TS);
    // Should be around 2024-12-15
    expect(cutoff.getMonth()).toBe(11); // December = 11
  });

  it('Rok returns a date approximately 1 year before latest', () => {
    const cutoff = getCutoffDate('Rok', LATEST_TS);
    expect(cutoff.getFullYear()).toBe(2024);
    expect(cutoff.getMonth()).toBe(5); // June = 5
  });

  it('Wszystko returns epoch (Jan 1, 1970)', () => {
    const cutoff = getCutoffDate('Wszystko', LATEST_TS);
    expect(cutoff.getTime()).toBe(0);
  });
});

// ============================================================
// getCutoffMonthKey
// ============================================================

describe('getCutoffMonthKey', () => {
  it('returns YYYY-MM format string', () => {
    const key = getCutoffMonthKey('1M', LATEST_TS);
    expect(key).toMatch(/^\d{4}-\d{2}$/);
  });

  it('1M cutoff month key is one month before latest', () => {
    const key = getCutoffMonthKey('1M', LATEST_TS);
    // Latest is June 2025, 1M cutoff is May 2025
    expect(key).toBe('2025-05');
  });

  it('Wszystko returns "1970-01"', () => {
    const key = getCutoffMonthKey('Wszystko', LATEST_TS);
    expect(key).toBe('1970-01');
  });
});

// ============================================================
// filterMonthlyByRange
// ============================================================

describe('filterMonthlyByRange', () => {
  const monthlyData = [
    { month: '2024-01', value: 10 },
    { month: '2024-06', value: 20 },
    { month: '2025-01', value: 30 },
    { month: '2025-03', value: 40 },
    { month: '2025-05', value: 50 },
    { month: '2025-06', value: 60 },
  ];

  it('Wszystko returns all data', () => {
    const result = filterMonthlyByRange(monthlyData, 'Wszystko', LATEST_TS);
    expect(result).toHaveLength(6);
  });

  it('1M filters to only recent month(s)', () => {
    const result = filterMonthlyByRange(monthlyData, '1M', LATEST_TS);
    // Cutoff is 2025-05, so months >= "2025-05" pass
    expect(result.length).toBeGreaterThanOrEqual(1);
    for (const item of result) {
      expect(item.month >= '2025-05').toBe(true);
    }
  });

  it('6M filters correctly', () => {
    const result = filterMonthlyByRange(monthlyData, '6M', LATEST_TS);
    // 6M cutoff from June 2025 is ~Dec 2024
    for (const item of result) {
      expect(item.month >= '2024-12').toBe(true);
    }
  });

  it('returns empty array for undefined input', () => {
    const result = filterMonthlyByRange(undefined, '1M', LATEST_TS);
    expect(result).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    const result = filterMonthlyByRange([], '1M', LATEST_TS);
    expect(result).toEqual([]);
  });
});

// ============================================================
// filterMessagesByRange
// ============================================================

describe('filterMessagesByRange', () => {
  // Messages spread across 2 years
  const messages = [
    makeMsg('Anna', 'old message', new Date('2024-01-15').getTime(), 0),
    makeMsg('Bartek', 'mid message', new Date('2025-01-15').getTime(), 1),
    makeMsg('Anna', 'recent 3m', new Date('2025-04-15').getTime(), 2),
    makeMsg('Bartek', 'recent 1m', new Date('2025-05-20').getTime(), 3),
    makeMsg('Anna', 'latest', new Date('2025-06-15').getTime(), 4),
  ];

  it('Wszystko returns all messages', () => {
    const result = filterMessagesByRange(messages, 'Wszystko', LATEST_TS);
    expect(result).toHaveLength(5);
  });

  it('1M returns only last month of messages', () => {
    const result = filterMessagesByRange(messages, '1M', LATEST_TS);
    // Cutoff is ~May 15, so May 20 and June 15 pass
    expect(result.length).toBeGreaterThanOrEqual(2);
    for (const msg of result) {
      expect(msg.timestamp).toBeGreaterThanOrEqual(
        getCutoffDate('1M', LATEST_TS).getTime(),
      );
    }
  });

  it('Rok returns messages from last year', () => {
    const result = filterMessagesByRange(messages, 'Rok', LATEST_TS);
    // Cutoff ~June 2024, so all except Jan 2024 msg
    expect(result.length).toBeGreaterThanOrEqual(3);
  });

  it('returns empty array when all messages are before cutoff', () => {
    const oldMessages = [
      makeMsg('Anna', 'ancient', new Date('2020-01-01').getTime(), 0),
    ];
    const result = filterMessagesByRange(oldMessages, '1M', LATEST_TS);
    expect(result).toEqual([]);
  });

  it('message at exact cutoff boundary is included (>=)', () => {
    const cutoff = getCutoffDate('1M', LATEST_TS).getTime();
    const boundaryMessages = [
      makeMsg('Anna', 'at cutoff', cutoff, 0),
      makeMsg('Bartek', 'before cutoff', cutoff - 1, 1),
    ];
    const result = filterMessagesByRange(boundaryMessages, '1M', LATEST_TS);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('at cutoff');
  });
});

// ============================================================
// computeHeatmapFromMessages
// ============================================================

describe('computeHeatmapFromMessages', () => {
  it('returns 7x24 grid for combined and each person', () => {
    const msgs = [
      makeMsg('Anna', 'hello', new Date('2025-06-09T10:00:00').getTime()), // Monday 10:00
    ];
    const result = computeHeatmapFromMessages(msgs, ['Anna', 'Bartek']);
    expect(result.combined).toHaveLength(7);
    expect(result.combined[0]).toHaveLength(24);
    expect(result.perPerson['Anna']).toHaveLength(7);
    expect(result.perPerson['Bartek']).toHaveLength(7);
  });

  it('empty messages returns all-zero grid', () => {
    const result = computeHeatmapFromMessages([], ['Anna', 'Bartek']);
    const totalSum = result.combined.flat().reduce((a, b) => a + b, 0);
    expect(totalSum).toBe(0);
  });

  it('correctly increments day/hour cell', () => {
    // Create a message on a known day+hour — Wednesday at 14:00 local time
    const wed14 = new Date('2025-06-11T14:00:00'); // Wed
    const msgs = [makeMsg('Anna', 'hi', wed14.getTime())];
    const result = computeHeatmapFromMessages(msgs, ['Anna']);
    // JS getDay(): Wed=3. Converted: jsDay=3 → day = 3-1 = 2 (0=Monday)
    expect(result.combined[2][14]).toBe(1);
    expect(result.perPerson['Anna'][2][14]).toBe(1);
  });
});

// ============================================================
// computeResponseTimeDistributionFromMessages
// ============================================================

describe('computeResponseTimeDistributionFromMessages', () => {
  it('returns perPerson with bins for each participant', () => {
    const msgs = [
      makeMsg('Anna', 'hi', 1_700_000_000_000, 0),
      makeMsg('Bartek', 'hey', 1_700_000_005_000, 1), // 5s gap
    ];
    const result = computeResponseTimeDistributionFromMessages(msgs, ['Anna', 'Bartek']);
    expect(result.perPerson).toHaveProperty('Anna');
    expect(result.perPerson).toHaveProperty('Bartek');
    expect(result.perPerson['Bartek'].length).toBeGreaterThan(0);
  });

  it('5s response is counted in <10s bin', () => {
    const msgs = [
      makeMsg('Anna', 'hi', 1_700_000_000_000, 0),
      makeMsg('Bartek', 'hey', 1_700_000_005_000, 1), // 5s
    ];
    const result = computeResponseTimeDistributionFromMessages(msgs, ['Anna', 'Bartek']);
    const bartekBins = result.perPerson['Bartek'];
    const under10 = bartekBins.find(b => b.label === '<10s');
    expect(under10).toBeDefined();
    expect(under10!.count).toBe(1);
  });

  it('empty messages returns empty bins (all zero)', () => {
    const result = computeResponseTimeDistributionFromMessages([], ['Anna', 'Bartek']);
    const annaTotal = result.perPerson['Anna'].reduce((s, b) => s + b.count, 0);
    expect(annaTotal).toBe(0);
  });
});

// ============================================================
// filterBurstsByRange
// ============================================================

describe('filterBurstsByRange', () => {
  const bursts = [
    { startDate: '2024-01-01', endDate: '2024-01-10', messageCount: 100, avgDaily: 10 },
    { startDate: '2025-05-01', endDate: '2025-05-10', messageCount: 200, avgDaily: 20 },
    { startDate: '2025-06-01', endDate: '2025-06-10', messageCount: 300, avgDaily: 30 },
  ];

  it('Wszystko returns all bursts', () => {
    const result = filterBurstsByRange(bursts, 'Wszystko', LATEST_TS);
    expect(result).toHaveLength(3);
  });

  it('1M filters old bursts out', () => {
    const result = filterBurstsByRange(bursts, '1M', LATEST_TS);
    // Cutoff ~May 15, so bursts ending >= May 15 pass
    expect(result.length).toBeGreaterThanOrEqual(1);
    for (const b of result) {
      expect(b.endDate >= '2025-05').toBe(true);
    }
  });

  it('returns empty array for undefined input', () => {
    const result = filterBurstsByRange(undefined, '1M', LATEST_TS);
    expect(result).toEqual([]);
  });
});

// ============================================================
// filterConflictEventsByRange
// ============================================================

describe('filterConflictEventsByRange', () => {
  const events = [
    { date: '2024-06-01', description: 'old conflict' },
    { date: '2025-03-01', description: 'mid conflict' },
    { date: '2025-06-01', description: 'recent conflict' },
  ];

  it('Wszystko returns all events', () => {
    const result = filterConflictEventsByRange(events, 'Wszystko', LATEST_TS);
    expect(result).toHaveLength(3);
  });

  it('1M filters to recent events only', () => {
    const result = filterConflictEventsByRange(events, '1M', LATEST_TS);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.every(e => e.date >= '2025-05')).toBe(true);
  });

  it('returns empty array for undefined input', () => {
    const result = filterConflictEventsByRange(undefined, '3M', LATEST_TS);
    expect(result).toEqual([]);
  });
});

// ============================================================
// computeWeekdayWeekendFromMessages
// ============================================================

describe('computeWeekdayWeekendFromMessages', () => {
  it('correctly separates weekday and weekend messages', () => {
    // Monday and Saturday
    const mon = new Date('2025-06-09T12:00:00'); // Monday
    const sat = new Date('2025-06-14T12:00:00'); // Saturday
    const msgs = [
      makeMsg('Anna', 'weekday', mon.getTime(), 0),
      makeMsg('Anna', 'weekend', sat.getTime(), 1),
    ];
    const result = computeWeekdayWeekendFromMessages(msgs, ['Anna']);
    expect(result.weekday['Anna']).toBe(1);
    expect(result.weekend['Anna']).toBe(1);
  });

  it('returns zeros for empty messages', () => {
    const result = computeWeekdayWeekendFromMessages([], ['Anna', 'Bartek']);
    expect(result.weekday['Anna']).toBe(0);
    expect(result.weekend['Anna']).toBe(0);
    expect(result.weekday['Bartek']).toBe(0);
    expect(result.weekend['Bartek']).toBe(0);
  });

  it('Sunday counts as weekend', () => {
    const sun = new Date('2025-06-15T12:00:00'); // Sunday
    const msgs = [makeMsg('Anna', 'sunday msg', sun.getTime(), 0)];
    const result = computeWeekdayWeekendFromMessages(msgs, ['Anna']);
    expect(result.weekend['Anna']).toBe(1);
    expect(result.weekday['Anna']).toBe(0);
  });
});
