/**
 * Math utilities for multi-relationship comparison.
 */

/** Arithmetic mean. Returns 0 for empty array. */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** Population standard deviation. Returns 0 for <2 values. */
export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const sumSq = values.reduce((s, v) => s + (v - m) ** 2, 0);
  return Math.sqrt(sumSq / values.length);
}

/** Coefficient of variation (%) = stddev / mean * 100. Returns 0 if mean is ~0. */
export function cv(values: number[]): number {
  const m = mean(values);
  if (Math.abs(m) < 0.001) return 0;
  return (stddev(values) / Math.abs(m)) * 100;
}

/** Min and max of an array. Returns [0,0] for empty. */
export function range(values: number[]): [number, number] {
  if (values.length === 0) return [0, 0];
  return [Math.min(...values), Math.max(...values)];
}

/**
 * Pearson correlation coefficient between two arrays.
 * Returns null if arrays differ in length, have <3 values, or have zero variance.
 */
export function pearsonCorrelation(x: number[], y: number[]): number | null {
  if (x.length !== y.length || x.length < 3) return null;

  const n = x.length;
  const mx = mean(x);
  const my = mean(y);

  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  const denom = Math.sqrt(sumX2 * sumY2);
  if (denom < 1e-10) return null;

  return sumXY / denom;
}

/**
 * Detect simple pattern in a value compared to others.
 * Returns: 'highest', 'lowest', 'average', or null.
 */
export function detectPattern(
  value: number,
  allValues: number[],
): 'highest' | 'lowest' | 'average' | null {
  if (allValues.length < 2) return null;
  const sorted = [...allValues].sort((a, b) => a - b);
  if (value === sorted[sorted.length - 1]) return 'highest';
  if (value === sorted[0]) return 'lowest';
  return 'average';
}

/** Classify stability based on CV%. */
export function classifyStability(cvPercent: number): 'stable' | 'moderate' | 'variable' {
  if (cvPercent < 10) return 'stable';
  if (cvPercent < 25) return 'moderate';
  return 'variable';
}

/** Find index of max value. Returns -1 for empty. */
export function argMax(values: number[]): number {
  if (values.length === 0) return -1;
  let maxIdx = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[maxIdx]) maxIdx = i;
  }
  return maxIdx;
}

/** Find index of min value. Returns -1 for empty. */
export function argMin(values: number[]): number {
  if (values.length === 0) return -1;
  let minIdx = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] < values[minIdx]) minIdx = i;
  }
  return minIdx;
}

/** Normalize a value to 0-100 given min/max bounds. */
export function normalize(value: number, min: number, max: number): number {
  if (max - min < 0.001) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}
