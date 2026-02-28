import { describe, it, expect } from 'vitest';
import { linearRegressionSlope } from '@/lib/analysis/constants';

describe('linearRegressionSlope', () => {
  describe('guard conditions', () => {
    it('empty array → 0', () => {
      expect(linearRegressionSlope([])).toBe(0);
    });

    it('single element → 0', () => {
      expect(linearRegressionSlope([42])).toBe(0);
    });

    it('all NaN → 0 (filtered to < 2 elements)', () => {
      expect(linearRegressionSlope([NaN, NaN, NaN])).toBe(0);
    });

    it('all Infinity → 0', () => {
      expect(linearRegressionSlope([Infinity, -Infinity])).toBe(0);
    });

    it('mix of NaN/Infinity and one valid → 0', () => {
      expect(linearRegressionSlope([NaN, 5, Infinity])).toBe(0);
    });
  });

  describe('flat data', () => {
    it('[5, 5, 5] → 0', () => {
      expect(linearRegressionSlope([5, 5, 5])).toBe(0);
    });

    it('[100, 100] → 0', () => {
      expect(linearRegressionSlope([100, 100])).toBe(0);
    });
  });

  describe('ascending data', () => {
    it('[0, 1, 2, 3] → slope = 1', () => {
      expect(linearRegressionSlope([0, 1, 2, 3])).toBeCloseTo(1, 10);
    });

    it('[10, 20, 30] → slope = 10', () => {
      expect(linearRegressionSlope([10, 20, 30])).toBeCloseTo(10, 10);
    });

    it('[2, 4] → slope = 2', () => {
      expect(linearRegressionSlope([2, 4])).toBeCloseTo(2, 10);
    });
  });

  describe('descending data', () => {
    it('[3, 2, 1, 0] → slope = -1', () => {
      expect(linearRegressionSlope([3, 2, 1, 0])).toBeCloseTo(-1, 10);
    });

    it('[100, 50] → slope = -50', () => {
      expect(linearRegressionSlope([100, 50])).toBeCloseTo(-50, 10);
    });
  });

  describe('noisy data — regression finds best fit', () => {
    it('[1, 3, 2, 4] → positive slope', () => {
      const slope = linearRegressionSlope([1, 3, 2, 4]);
      expect(slope).toBeGreaterThan(0);
    });

    it('[10, 8, 9, 6, 7, 4] → negative slope', () => {
      const slope = linearRegressionSlope([10, 8, 9, 6, 7, 4]);
      expect(slope).toBeLessThan(0);
    });
  });

  describe('NaN filtering preserves valid elements', () => {
    it('[NaN, 0, 1, 2] → filters NaN, slope from [0,1,2] = 1', () => {
      expect(linearRegressionSlope([NaN, 0, 1, 2])).toBeCloseTo(1, 10);
    });

    it('[0, NaN, 2] → filters to [0, 2], slope = 2', () => {
      expect(linearRegressionSlope([0, NaN, 2])).toBeCloseTo(2, 10);
    });
  });

  describe('return type', () => {
    it('always returns a finite number', () => {
      const values = [
        [], [1], [1, 2], [NaN], [Infinity],
        [0, 0, 0], [1, 2, 3],
      ];
      for (const v of values) {
        const result = linearRegressionSlope(v);
        expect(Number.isFinite(result)).toBe(true);
      }
    });
  });

  describe('determinism', () => {
    it('same input → same output', () => {
      const data = [10, 20, 15, 25, 30];
      expect(linearRegressionSlope(data)).toBe(linearRegressionSlope(data));
    });
  });
});
