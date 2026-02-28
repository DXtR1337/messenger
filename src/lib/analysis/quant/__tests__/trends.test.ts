import { describe, it, expect } from 'vitest';
import { computeTrends, computeYearMilestones } from '../trends';
import { createPersonAccumulator } from '../types';
import type { PersonAccumulator } from '../types';

function makeAcc(overrides?: {
  monthlyResponseTimes?: Map<string, number[]>;
  monthlyWordCounts?: Map<string, number[]>;
}): PersonAccumulator {
  const acc = createPersonAccumulator();
  if (overrides?.monthlyResponseTimes) acc.monthlyResponseTimes = overrides.monthlyResponseTimes;
  if (overrides?.monthlyWordCounts) acc.monthlyWordCounts = overrides.monthlyWordCounts;
  return acc;
}

describe('computeTrends', () => {
  const months = ['2024-01', '2024-02', '2024-03'];

  describe('responseTimeTrend', () => {
    it('month with no response times → perPerson value = 0', () => {
      const accs = new Map([['Alice', makeAcc()]]);
      const result = computeTrends(accs, months, new Map(), ['Alice']);
      expect(result.responseTimeTrend).toHaveLength(3);
      for (const entry of result.responseTimeTrend) {
        expect(entry.perPerson['Alice']).toBe(0);
      }
    });

    it('month with response times → median computed', () => {
      const mrt = new Map([
        ['2024-01', [60_000, 120_000, 300_000]],
        ['2024-02', [30_000, 60_000, 90_000]],
      ]);
      const accs = new Map([['Alice', makeAcc({ monthlyResponseTimes: mrt })]]);
      const result = computeTrends(accs, ['2024-01', '2024-02'], new Map(), ['Alice']);
      expect(result.responseTimeTrend[0].perPerson['Alice']).toBeGreaterThan(0);
      expect(result.responseTimeTrend[1].perPerson['Alice']).toBeGreaterThan(0);
    });

    it('two participants have independent values', () => {
      const mrtA = new Map([['2024-01', [60_000]]]);
      const mrtB = new Map([['2024-01', [120_000]]]);
      const accs = new Map([
        ['Alice', makeAcc({ monthlyResponseTimes: mrtA })],
        ['Bob', makeAcc({ monthlyResponseTimes: mrtB })],
      ]);
      const result = computeTrends(accs, ['2024-01'], new Map(), ['Alice', 'Bob']);
      expect(result.responseTimeTrend[0].perPerson['Alice']).not.toBe(
        result.responseTimeTrend[0].perPerson['Bob'],
      );
    });
  });

  describe('messageLengthTrend', () => {
    it('month with no word counts → 0', () => {
      const accs = new Map([['Alice', makeAcc()]]);
      const result = computeTrends(accs, ['2024-01'], new Map(), ['Alice']);
      expect(result.messageLengthTrend[0].perPerson['Alice']).toBe(0);
    });

    it('month with word counts → median', () => {
      const mwc = new Map([['2024-01', [3, 5, 7, 9]]]);
      const accs = new Map([['Alice', makeAcc({ monthlyWordCounts: mwc })]]);
      const result = computeTrends(accs, ['2024-01'], new Map(), ['Alice']);
      // median of [3,5,7,9] = (5+7)/2 = 6
      expect(result.messageLengthTrend[0].perPerson['Alice']).toBe(6);
    });
  });

  describe('initiationTrend', () => {
    it('missing sender in monthlyInitiations → defaults to 0', () => {
      const accs = new Map([['Alice', makeAcc()]]);
      const initMap = new Map<string, Record<string, number>>();
      const result = computeTrends(accs, ['2024-01'], initMap, ['Alice']);
      expect(result.initiationTrend[0].perPerson['Alice']).toBe(0);
    });

    it('includes senders not in participantNames', () => {
      const accs = new Map([['Alice', makeAcc()]]);
      const initMap = new Map([['2024-01', { Alice: 5, Charlie: 3 }]]);
      const result = computeTrends(accs, ['2024-01'], initMap, ['Alice']);
      expect(result.initiationTrend[0].perPerson['Alice']).toBe(5);
      expect(result.initiationTrend[0].perPerson['Charlie']).toBe(3);
    });
  });

  describe('output shape', () => {
    it('all arrays have length === sortedMonths.length', () => {
      const accs = new Map([['Alice', makeAcc()]]);
      const result = computeTrends(accs, months, new Map(), ['Alice']);
      expect(result.responseTimeTrend).toHaveLength(3);
      expect(result.messageLengthTrend).toHaveLength(3);
      expect(result.initiationTrend).toHaveLength(3);
    });

    it('each entry has month and perPerson', () => {
      const accs = new Map([['Alice', makeAcc()]]);
      const result = computeTrends(accs, ['2024-01'], new Map(), ['Alice']);
      expect(result.responseTimeTrend[0]).toHaveProperty('month', '2024-01');
      expect(result.responseTimeTrend[0]).toHaveProperty('perPerson');
    });
  });
});

describe('computeYearMilestones', () => {
  describe('guard', () => {
    it('empty array → undefined', () => {
      expect(computeYearMilestones([])).toBeUndefined();
    });

    it('single entry → undefined', () => {
      expect(computeYearMilestones([{ month: '2024-01', perPerson: { A: 10 }, total: 10 }])).toBeUndefined();
    });
  });

  describe('peak and worst detection', () => {
    it('identifies peak month correctly', () => {
      const vol = [
        { month: '2024-01', perPerson: { A: 100 }, total: 100 },
        { month: '2024-02', perPerson: { A: 200 }, total: 200 },
        { month: '2024-03', perPerson: { A: 50 }, total: 50 },
      ];
      const result = computeYearMilestones(vol)!;
      expect(result.peakMonth.month).toBe('2024-02');
      expect(result.peakMonth.count).toBe(200);
    });

    it('identifies worst month correctly', () => {
      const vol = [
        { month: '2024-01', perPerson: { A: 100 }, total: 100 },
        { month: '2024-02', perPerson: { A: 200 }, total: 200 },
        { month: '2024-03', perPerson: { A: 50 }, total: 50 },
      ];
      const result = computeYearMilestones(vol)!;
      expect(result.worstMonth.month).toBe('2024-03');
      expect(result.worstMonth.count).toBe(50);
    });
  });

  describe('formatMonth — Polish abbreviations', () => {
    it('2024-01 → Sty 2024', () => {
      const vol = [
        { month: '2024-01', perPerson: { A: 100 }, total: 100 },
        { month: '2024-02', perPerson: { A: 50 }, total: 50 },
      ];
      const result = computeYearMilestones(vol)!;
      expect(result.peakMonth.label).toBe('Sty 2024');
    });

    it('2024-12 → Gru 2024', () => {
      const vol = [
        { month: '2024-11', perPerson: { A: 10 }, total: 10 },
        { month: '2024-12', perPerson: { A: 100 }, total: 100 },
      ];
      const result = computeYearMilestones(vol)!;
      expect(result.peakMonth.label).toBe('Gru 2024');
    });
  });

  describe('YoY trend', () => {
    it('older=100, recent=200 → yoyTrend=1.0 (100% increase)', () => {
      // Use widely-spaced months so date-midpoint splits evenly into 2+2
      // midDate ≈ 2023-09-16 → midMonth '2023-09' → split at index 2
      const vol = [
        { month: '2023-01', perPerson: { A: 50 }, total: 50 },
        { month: '2023-06', perPerson: { A: 50 }, total: 50 },
        { month: '2024-01', perPerson: { A: 100 }, total: 100 },
        { month: '2024-06', perPerson: { A: 100 }, total: 100 },
      ];
      const result = computeYearMilestones(vol)!;
      // older=[50+50]=100, recent=[100+100]=200, yoy=(200/100)-1=1.0
      expect(result.yoyTrend).toBe(1.0);
    });

    it('older=200, recent=100 → yoyTrend=-0.5', () => {
      const vol = [
        { month: '2023-01', perPerson: { A: 100 }, total: 100 },
        { month: '2023-06', perPerson: { A: 100 }, total: 100 },
        { month: '2024-01', perPerson: { A: 50 }, total: 50 },
        { month: '2024-06', perPerson: { A: 50 }, total: 50 },
      ];
      const result = computeYearMilestones(vol)!;
      // older=[100+100]=200, recent=[50+50]=100, yoy=(100/200)-1=-0.5
      expect(result.yoyTrend).toBe(-0.5);
    });

    it('older=0 → yoyTrend=0', () => {
      const vol = [
        { month: '2024-01', perPerson: { A: 0 }, total: 0 },
        { month: '2024-02', perPerson: { A: 100 }, total: 100 },
      ];
      const result = computeYearMilestones(vol)!;
      expect(result.yoyTrend).toBe(0);
    });
  });

  describe('totalMonths', () => {
    it('equals input array length', () => {
      const vol = [
        { month: '2024-01', perPerson: { A: 10 }, total: 10 },
        { month: '2024-02', perPerson: { A: 20 }, total: 20 },
        { month: '2024-03', perPerson: { A: 30 }, total: 30 },
      ];
      const result = computeYearMilestones(vol)!;
      expect(result.totalMonths).toBe(3);
    });
  });
});
