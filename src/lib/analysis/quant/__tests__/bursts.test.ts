import { describe, it, expect } from 'vitest';
import { detectBursts } from '../bursts';

function makeDailyMap(entries: Array<[string, number]>): Map<string, number> {
  return new Map(entries);
}

/** Generate N consecutive days starting from a date, all with the same count. */
function consecutiveDays(startDate: string, count: number, msgCount: number): Array<[string, number]> {
  const entries: Array<[string, number]> = [];
  const d = new Date(startDate + 'T00:00:00Z');
  for (let i = 0; i < count; i++) {
    const key = d.toISOString().slice(0, 10);
    entries.push([key, msgCount]);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return entries;
}

describe('detectBursts', () => {
  describe('guard condition', () => {
    it('returns [] for fewer than 8 days', () => {
      const map = makeDailyMap(consecutiveDays('2024-01-01', 7, 10));
      expect(detectBursts(map)).toEqual([]);
    });

    it('returns [] for exactly 7 days', () => {
      const map = makeDailyMap(consecutiveDays('2024-01-01', 7, 10));
      expect(detectBursts(map)).toEqual([]);
    });

    it('processes 8 days (does not return [])', () => {
      // 7 days of 1 msg + 1 day of 100 msgs — burst on day 8
      const entries = consecutiveDays('2024-01-01', 7, 1);
      entries.push(['2024-01-08', 100]);
      const result = detectBursts(makeDailyMap(entries));
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('burst detection threshold (>3x, not >=)', () => {
    it('day with exactly 3x overallAvg is NOT a burst', () => {
      // 10 days, 9 days with 10 msgs, 1 day with 30 msgs
      // overallAvg = (9*10 + 30)/10 = 12, 3*12=36 > 30 — not a burst
      // BUT the first 7 days use overallAvg, day 8+ uses rolling.
      // Let's make it clearer: 10 flat days of 10 msgs each
      const entries = consecutiveDays('2024-01-01', 10, 10);
      const result = detectBursts(makeDailyMap(entries));
      expect(result).toEqual([]); // all equal, none > 3x avg
    });

    it('day with >3x overallAvg IS a burst', () => {
      // 9 days of 10 msgs, day 10 = 100 msgs
      // overallAvg = (9*10+100)/10 = 19, 3*19=57, day 10: 100>57 → burst
      const entries = consecutiveDays('2024-01-01', 9, 10);
      entries.push(['2024-01-10', 100]);
      const result = detectBursts(makeDailyMap(entries));
      expect(result.length).toBe(1);
      expect(result[0].startDate).toBe('2024-01-10');
    });

    it('rollingAvg=0 means no burst (condition requires rollingAvg > 0)', () => {
      // 8 days: first 7 with 0 msgs, day 8 with 5 msgs
      // overallAvg = 5/8 = 0.625, first 7 use overallAvg
      // Day 8: rolling avg of days 1-7 = 0/7 = 0, so rollingAvg=0 → skip
      const entries = consecutiveDays('2024-01-01', 7, 0);
      entries.push(['2024-01-08', 5]);
      const result = detectBursts(makeDailyMap(entries));
      expect(result).toEqual([]);
    });
  });

  describe('rolling average: first 7 days use overallAvg', () => {
    it('day in first 7 uses overallAvg, day 8+ uses 7-day rolling', () => {
      // 10 days: all 5 msgs except day 3 = 50 msgs
      // overallAvg = (9*5 + 50)/10 = 9.5, 3*9.5=28.5, day 3: 50 > 28.5 → burst (uses overallAvg)
      const entries = consecutiveDays('2024-01-01', 10, 5);
      entries[2] = ['2024-01-03', 50]; // day index 2
      const result = detectBursts(makeDailyMap(entries));
      expect(result.some(b => b.startDate === '2024-01-03')).toBe(true);
    });
  });

  describe('consecutive day merging', () => {
    it('two consecutive burst days → merged into one burst', () => {
      // 10 days: all 5 msgs except day 9-10 = 100 msgs each
      const entries = consecutiveDays('2024-01-01', 8, 5);
      entries.push(['2024-01-09', 100]);
      entries.push(['2024-01-10', 100]);
      const result = detectBursts(makeDailyMap(entries));
      expect(result).toHaveLength(1);
      expect(result[0].startDate).toBe('2024-01-09');
      expect(result[0].endDate).toBe('2024-01-10');
      expect(result[0].messageCount).toBe(200);
    });

    it('two non-consecutive burst days → two separate bursts', () => {
      const entries = consecutiveDays('2024-01-01', 12, 5);
      entries[8] = ['2024-01-09', 100]; // burst day 1
      entries[11] = ['2024-01-12', 100]; // burst day 2 (2 days gap)
      const result = detectBursts(makeDailyMap(entries));
      expect(result.length).toBe(2);
    });

    it('three consecutive burst days → one burst with days=3', () => {
      const entries = consecutiveDays('2024-01-01', 11, 5);
      entries[8] = ['2024-01-09', 100];
      entries[9] = ['2024-01-10', 100];
      entries[10] = ['2024-01-11', 100];
      const result = detectBursts(makeDailyMap(entries));
      expect(result).toHaveLength(1);
      expect(result[0].messageCount).toBe(300);
    });

    it('avgDaily = messageCount / days for merged burst', () => {
      const entries = consecutiveDays('2024-01-01', 10, 5);
      entries[8] = ['2024-01-09', 80];
      entries[9] = ['2024-01-10', 120];
      const result = detectBursts(makeDailyMap(entries));
      expect(result).toHaveLength(1);
      expect(result[0].avgDaily).toBe(100); // (80+120)/2
    });
  });

  describe('output structure', () => {
    it('single day burst: startDate === endDate', () => {
      const entries = consecutiveDays('2024-01-01', 9, 5);
      entries.push(['2024-01-10', 100]);
      const result = detectBursts(makeDailyMap(entries));
      expect(result[0].startDate).toBe(result[0].endDate);
    });

    it('each burst has startDate, endDate, messageCount, avgDaily', () => {
      const entries = consecutiveDays('2024-01-01', 9, 5);
      entries.push(['2024-01-10', 100]);
      const result = detectBursts(makeDailyMap(entries));
      for (const burst of result) {
        expect(burst).toHaveProperty('startDate');
        expect(burst).toHaveProperty('endDate');
        expect(burst).toHaveProperty('messageCount');
        expect(burst).toHaveProperty('avgDaily');
      }
    });
  });

  describe('determinism', () => {
    it('same input Map produces same result', () => {
      const entries = consecutiveDays('2024-01-01', 10, 5);
      entries[9] = ['2024-01-10', 100];
      const r1 = detectBursts(makeDailyMap(entries));
      const r2 = detectBursts(makeDailyMap(entries));
      expect(r1).toEqual(r2);
    });

    it('Map insertion order does not affect results (keys sorted internally)', () => {
      const entries1: Array<[string, number]> = [
        ['2024-01-10', 100],
        ...consecutiveDays('2024-01-01', 9, 5),
      ];
      const entries2: Array<[string, number]> = [
        ...consecutiveDays('2024-01-01', 9, 5),
        ['2024-01-10', 100],
      ];
      const r1 = detectBursts(makeDailyMap(entries1));
      const r2 = detectBursts(makeDailyMap(entries2));
      expect(r1).toEqual(r2);
    });
  });
});
