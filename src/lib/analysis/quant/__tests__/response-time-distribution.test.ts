import { describe, it, expect } from 'vitest';
import { computeResponseTimeDistribution } from '../response-time-distribution';
import { createPersonAccumulator } from '../types';
import type { PersonAccumulator } from '../types';

function makeAcc(times: number[]): PersonAccumulator {
  const acc = createPersonAccumulator();
  acc.responseTimes = times;
  return acc;
}

describe('computeResponseTimeDistribution', () => {
  describe('output structure', () => {
    it('returns exactly 11 bins per person', () => {
      const accs = new Map([['Alice', makeAcc([5000])]]);
      const result = computeResponseTimeDistribution(accs);
      expect(result.perPerson['Alice']).toHaveLength(11);
    });

    it('each bin has label, minMs, maxMs, count, percentage', () => {
      const accs = new Map([['Alice', makeAcc([5000])]]);
      const result = computeResponseTimeDistribution(accs);
      for (const bin of result.perPerson['Alice']) {
        expect(bin).toHaveProperty('label');
        expect(bin).toHaveProperty('minMs');
        expect(bin).toHaveProperty('maxMs');
        expect(bin).toHaveProperty('count');
        expect(bin).toHaveProperty('percentage');
      }
    });

    it('handles multiple participants independently', () => {
      const accs = new Map([
        ['Alice', makeAcc([5000])],
        ['Bob', makeAcc([100_000])],
      ]);
      const result = computeResponseTimeDistribution(accs);
      expect(Object.keys(result.perPerson)).toEqual(['Alice', 'Bob']);
      // Alice: <10s bin
      expect(result.perPerson['Alice'][0].count).toBe(1);
      // Bob: 1-5m bin (60_000-300_000)
      expect(result.perPerson['Bob'][3].count).toBe(1);
    });
  });

  describe('bin boundaries', () => {
    it('0ms → <10s bin', () => {
      const accs = new Map([['A', makeAcc([0])]]);
      const bins = computeResponseTimeDistribution(accs).perPerson['A'];
      expect(bins[0].count).toBe(1); // <10s: minMs=0
    });

    it('9999ms → <10s bin', () => {
      const accs = new Map([['A', makeAcc([9999])]]);
      const bins = computeResponseTimeDistribution(accs).perPerson['A'];
      expect(bins[0].count).toBe(1);
    });

    it('10000ms → 10-30s bin (>= 10000, not <10s)', () => {
      const accs = new Map([['A', makeAcc([10_000])]]);
      const bins = computeResponseTimeDistribution(accs).perPerson['A'];
      expect(bins[0].count).toBe(0); // <10s
      expect(bins[1].count).toBe(1); // 10-30s
    });

    it('29999ms → 10-30s bin', () => {
      const accs = new Map([['A', makeAcc([29_999])]]);
      const bins = computeResponseTimeDistribution(accs).perPerson['A'];
      expect(bins[1].count).toBe(1);
    });

    it('30000ms → 30s-1m bin', () => {
      const accs = new Map([['A', makeAcc([30_000])]]);
      const bins = computeResponseTimeDistribution(accs).perPerson['A'];
      expect(bins[2].count).toBe(1);
    });

    it('59999ms → 30s-1m bin', () => {
      const accs = new Map([['A', makeAcc([59_999])]]);
      const bins = computeResponseTimeDistribution(accs).perPerson['A'];
      expect(bins[2].count).toBe(1);
    });

    it('60000ms → 1-5m bin', () => {
      const accs = new Map([['A', makeAcc([60_000])]]);
      const bins = computeResponseTimeDistribution(accs).perPerson['A'];
      expect(bins[3].count).toBe(1);
    });

    it('86400000ms (24h) → 24h+ bin', () => {
      const accs = new Map([['A', makeAcc([86_400_000])]]);
      const bins = computeResponseTimeDistribution(accs).perPerson['A'];
      expect(bins[10].count).toBe(1); // last bin: 24h+
    });

    it('86399999ms → 6-24h bin', () => {
      const accs = new Map([['A', makeAcc([86_399_999])]]);
      const bins = computeResponseTimeDistribution(accs).perPerson['A'];
      expect(bins[9].count).toBe(1); // 6-24h
    });
  });

  describe('percentage calculations', () => {
    it('empty responseTimes → all percentages = 0', () => {
      const accs = new Map([['A', makeAcc([])]]);
      const bins = computeResponseTimeDistribution(accs).perPerson['A'];
      for (const bin of bins) {
        expect(bin.percentage).toBe(0);
        expect(bin.count).toBe(0);
      }
    });

    it('single time in one bin → 100% for that bin', () => {
      const accs = new Map([['A', makeAcc([5000])]]);
      const bins = computeResponseTimeDistribution(accs).perPerson['A'];
      expect(bins[0].percentage).toBe(100);
      for (let i = 1; i < bins.length; i++) {
        expect(bins[i].percentage).toBe(0);
      }
    });

    it('two times in different bins → 50% each', () => {
      const accs = new Map([['A', makeAcc([5000, 100_000])]]);
      const bins = computeResponseTimeDistribution(accs).perPerson['A'];
      expect(bins[0].percentage).toBe(50); // <10s
      expect(bins[3].percentage).toBe(50); // 1-5m
    });

    it('percentages sum to 100 when there are response times', () => {
      const times = [1000, 15_000, 45_000, 120_000, 600_000, 1_200_000, 2_000_000, 5_000_000, 15_000_000, 50_000_000, 100_000_000];
      const accs = new Map([['A', makeAcc(times)]]);
      const bins = computeResponseTimeDistribution(accs).perPerson['A'];
      const totalPct = bins.reduce((sum, b) => sum + b.percentage, 0);
      expect(totalPct).toBeCloseTo(100, 5);
    });

    it('counts never negative', () => {
      const accs = new Map([['A', makeAcc([5000, 15_000, 90_000])]]);
      const bins = computeResponseTimeDistribution(accs).perPerson['A'];
      for (const bin of bins) {
        expect(bin.count).toBeGreaterThanOrEqual(0);
        expect(bin.percentage).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('determinism', () => {
    it('same input produces same output', () => {
      const times = [1000, 50_000, 200_000, 5_000_000];
      const accs1 = new Map([['A', makeAcc([...times])]]);
      const accs2 = new Map([['A', makeAcc([...times])]]);
      const r1 = computeResponseTimeDistribution(accs1);
      const r2 = computeResponseTimeDistribution(accs2);
      expect(r1).toEqual(r2);
    });
  });
});
