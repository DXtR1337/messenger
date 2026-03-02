/**
 * Tests for compare/statistics.ts — math utilities for multi-relationship comparison.
 */
import { describe, it, expect } from 'vitest';
import {
  mean,
  stddev,
  cv,
  range,
  pearsonCorrelation,
  detectPattern,
  classifyStability,
  argMax,
  argMin,
  normalize,
} from '../statistics';

// ============================================================
// mean
// ============================================================

describe('mean', () => {
  it('returns 0 for empty array', () => {
    expect(mean([])).toBe(0);
  });

  it('returns the value itself for single element', () => {
    expect(mean([42])).toBe(42);
  });

  it('computes correct mean for known values', () => {
    expect(mean([2, 4, 6])).toBe(4);
  });

  it('handles negative values', () => {
    expect(mean([-10, 10])).toBe(0);
  });

  it('handles decimal values', () => {
    expect(mean([1.5, 2.5, 3.0])).toBeCloseTo(2.3333, 3);
  });

  it('handles large arrays', () => {
    const arr = Array.from({ length: 1000 }, (_, i) => i + 1);
    expect(mean(arr)).toBe(500.5);
  });
});

// ============================================================
// stddev
// ============================================================

describe('stddev', () => {
  it('returns 0 for empty array', () => {
    expect(stddev([])).toBe(0);
  });

  it('returns 0 for single element', () => {
    expect(stddev([99])).toBe(0);
  });

  it('returns 0 for constant array', () => {
    expect(stddev([5, 5, 5, 5])).toBe(0);
  });

  it('computes correct population stddev for known values', () => {
    // [2, 4, 4, 4, 5, 5, 7, 9] => mean=5, population stddev=2
    expect(stddev([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2);
  });

  it('computes correct stddev for two values', () => {
    // [0, 10] => mean=5, variance = ((25+25)/2)=25, stddev=5
    expect(stddev([0, 10])).toBe(5);
  });

  it('handles negative values', () => {
    // [-3, -1, 1, 3] => mean=0, variance = (9+1+1+9)/4 = 5, stddev=sqrt(5)
    expect(stddev([-3, -1, 1, 3])).toBeCloseTo(Math.sqrt(5), 10);
  });
});

// ============================================================
// cv (coefficient of variation)
// ============================================================

describe('cv', () => {
  it('returns 0 for empty array', () => {
    expect(cv([])).toBe(0);
  });

  it('returns 0 when mean is near zero', () => {
    // [-1, 1] => mean=0, cv should return 0 (division by ~0 guard)
    expect(cv([-0.0005, 0.0005])).toBe(0);
  });

  it('returns 0 for constant array (stddev=0)', () => {
    expect(cv([7, 7, 7])).toBe(0);
  });

  it('computes correct CV% for known values', () => {
    // [10, 10, 10, 20] => mean=12.5, stddev=sqrt(((2.5^2*3 + 7.5^2)/4)) = sqrt((18.75+56.25)/4) = sqrt(18.75) ~ 4.33
    // cv = 4.33/12.5*100 ~ 34.64
    const values = [10, 10, 10, 20];
    const m = mean(values);
    const sd = stddev(values);
    expect(cv(values)).toBeCloseTo((sd / Math.abs(m)) * 100, 5);
  });

  it('handles negative mean correctly (uses absolute value)', () => {
    // All negative: [-10, -20, -30] => mean=-20, stddev=sqrt(200/3)~8.165
    // cv = 8.165/20*100 ~ 40.82
    const values = [-10, -20, -30];
    const m = mean(values);
    const sd = stddev(values);
    expect(cv(values)).toBeCloseTo((sd / Math.abs(m)) * 100, 5);
  });
});

// ============================================================
// range
// ============================================================

describe('range', () => {
  it('returns [0, 0] for empty array', () => {
    expect(range([])).toEqual([0, 0]);
  });

  it('returns [v, v] for single element', () => {
    expect(range([42])).toEqual([42, 42]);
  });

  it('returns correct min and max', () => {
    expect(range([3, 1, 4, 1, 5, 9, 2, 6])).toEqual([1, 9]);
  });

  it('handles negative values', () => {
    expect(range([-10, -5, 0, 5])).toEqual([-10, 5]);
  });

  it('handles all same values', () => {
    expect(range([7, 7, 7])).toEqual([7, 7]);
  });
});

// ============================================================
// pearsonCorrelation
// ============================================================

describe('pearsonCorrelation', () => {
  it('returns null for empty arrays', () => {
    expect(pearsonCorrelation([], [])).toBeNull();
  });

  it('returns null for single element arrays', () => {
    expect(pearsonCorrelation([1], [2])).toBeNull();
  });

  it('returns null for two element arrays (requires >= 3)', () => {
    expect(pearsonCorrelation([1, 2], [3, 4])).toBeNull();
  });

  it('returns null for arrays of different lengths', () => {
    expect(pearsonCorrelation([1, 2, 3], [4, 5])).toBeNull();
  });

  it('returns null for zero variance (constant array)', () => {
    expect(pearsonCorrelation([5, 5, 5], [1, 2, 3])).toBeNull();
  });

  it('returns 1.0 for perfectly correlated arrays', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10]; // y = 2x
    expect(pearsonCorrelation(x, y)).toBeCloseTo(1.0, 10);
  });

  it('returns -1.0 for perfectly inversely correlated arrays', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [10, 8, 6, 4, 2]; // y = 12 - 2x
    expect(pearsonCorrelation(x, y)).toBeCloseTo(-1.0, 10);
  });

  it('returns near 0 for uncorrelated arrays', () => {
    // Constructed to have near-zero correlation
    const x = [1, 2, 3, 4, 5, 6, 7, 8];
    const y = [5, 2, 8, 1, 7, 3, 6, 4];
    const r = pearsonCorrelation(x, y);
    expect(r).not.toBeNull();
    expect(Math.abs(r!)).toBeLessThan(0.3);
  });

  it('handles negative values correctly', () => {
    const x = [-3, -1, 1, 3];
    const y = [-6, -2, 2, 6]; // y = 2x
    expect(pearsonCorrelation(x, y)).toBeCloseTo(1.0, 10);
  });

  it('computes a known correlation value', () => {
    // Known example: x=[1,2,3,4,5], y=[2,4,5,4,5]
    // Computed by hand or scipy: r ~ 0.7745966692414834
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 5, 4, 5];
    const r = pearsonCorrelation(x, y);
    expect(r).not.toBeNull();
    expect(r!).toBeCloseTo(0.7746, 3);
  });
});

// ============================================================
// detectPattern
// ============================================================

describe('detectPattern', () => {
  it('returns null for fewer than 2 values', () => {
    expect(detectPattern(5, [5])).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(detectPattern(5, [])).toBeNull();
  });

  it('returns "highest" when value is the max', () => {
    expect(detectPattern(10, [1, 5, 10])).toBe('highest');
  });

  it('returns "lowest" when value is the min', () => {
    expect(detectPattern(1, [1, 5, 10])).toBe('lowest');
  });

  it('returns "average" when value is in the middle', () => {
    expect(detectPattern(5, [1, 5, 10])).toBe('average');
  });

  it('returns "highest" when all values are equal (value matches max)', () => {
    expect(detectPattern(5, [5, 5, 5])).toBe('highest');
  });

  it('returns "highest" for two equal values', () => {
    expect(detectPattern(5, [5, 5])).toBe('highest');
  });
});

// ============================================================
// classifyStability
// ============================================================

describe('classifyStability', () => {
  it('returns "stable" for CV < 10', () => {
    expect(classifyStability(0)).toBe('stable');
    expect(classifyStability(5)).toBe('stable');
    expect(classifyStability(9.99)).toBe('stable');
  });

  it('returns "moderate" for 10 <= CV < 25', () => {
    expect(classifyStability(10)).toBe('moderate');
    expect(classifyStability(15)).toBe('moderate');
    expect(classifyStability(24.99)).toBe('moderate');
  });

  it('returns "variable" for CV >= 25', () => {
    expect(classifyStability(25)).toBe('variable');
    expect(classifyStability(50)).toBe('variable');
    expect(classifyStability(100)).toBe('variable');
  });
});

// ============================================================
// argMax
// ============================================================

describe('argMax', () => {
  it('returns -1 for empty array', () => {
    expect(argMax([])).toBe(-1);
  });

  it('returns 0 for single element', () => {
    expect(argMax([42])).toBe(0);
  });

  it('returns correct index for max value', () => {
    expect(argMax([1, 5, 3, 2])).toBe(1);
  });

  it('returns first index on ties (first max encountered)', () => {
    // [3, 7, 7, 2] => first 7 is at index 1
    expect(argMax([3, 7, 7, 2])).toBe(1);
  });

  it('returns last index when max is at end', () => {
    expect(argMax([1, 2, 3, 4])).toBe(3);
  });

  it('handles negative values', () => {
    expect(argMax([-5, -3, -10, -1])).toBe(3);
  });
});

// ============================================================
// argMin
// ============================================================

describe('argMin', () => {
  it('returns -1 for empty array', () => {
    expect(argMin([])).toBe(-1);
  });

  it('returns 0 for single element', () => {
    expect(argMin([42])).toBe(0);
  });

  it('returns correct index for min value', () => {
    expect(argMin([5, 1, 3, 2])).toBe(1);
  });

  it('returns first index on ties (first min encountered)', () => {
    // [7, 2, 2, 5] => first 2 is at index 1
    expect(argMin([7, 2, 2, 5])).toBe(1);
  });

  it('returns last index when min is at end', () => {
    expect(argMin([4, 3, 2, 1])).toBe(3);
  });

  it('handles negative values', () => {
    expect(argMin([-5, -3, -10, -1])).toBe(2);
  });
});

// ============================================================
// normalize
// ============================================================

describe('normalize', () => {
  it('returns 50 when min equals max', () => {
    expect(normalize(5, 5, 5)).toBe(50);
  });

  it('returns 50 when min and max are very close (< 0.001)', () => {
    expect(normalize(5, 5, 5.0005)).toBe(50);
  });

  it('returns 0 when value equals min', () => {
    expect(normalize(0, 0, 100)).toBe(0);
  });

  it('returns 100 when value equals max', () => {
    expect(normalize(100, 0, 100)).toBe(100);
  });

  it('returns 50 when value is midpoint', () => {
    expect(normalize(50, 0, 100)).toBe(50);
  });

  it('clamps to 0 when value is below min', () => {
    expect(normalize(-10, 0, 100)).toBe(0);
  });

  it('clamps to 100 when value is above max', () => {
    expect(normalize(150, 0, 100)).toBe(100);
  });

  it('computes correctly for non-zero-based range', () => {
    // value=15, min=10, max=20 => (15-10)/(20-10)*100 = 50
    expect(normalize(15, 10, 20)).toBe(50);
  });

  it('handles decimal ranges', () => {
    // value=0.5, min=0, max=1 => 50
    expect(normalize(0.5, 0, 1)).toBe(50);
  });
});
