/**
 * Utility/helper functions for quantitative analysis.
 *
 * Pure functions for text processing, date manipulation,
 * statistical calculations, and frequency map operations.
 */

import { STOPWORDS, LATE_NIGHT_HOURS } from '../constants';

// ============================================================
// Text Processing
// ============================================================

/** Extract all emoji characters from a string (ZWJ-sequence aware). */
export function extractEmojis(text: string): string[] {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    const segments = [...segmenter.segment(text)];
    const emojiRegex = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/u;
    return segments.filter(s => emojiRegex.test(s.segment)).map(s => s.segment);
  }
  const emojiRegex = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu;
  return text.match(emojiRegex) ?? [];
}

/** Count words in a string (whitespace-split). */
export function countWords(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

/** Tokenize text to lowercase words (letters only, min 2 chars, no stopwords). */
export function tokenizeWords(text: string): string[] {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .split(/[\s.,!?;:()\[\]{}"'\-\/\<>@#$%^&*+=|~`]+/)
    .filter(w => w.length >= 2 && !STOPWORDS.has(w));
}

/**
 * Tokenize text to ALL lowercase words (min 1 char, including stopwords).
 * Used for MTLD computation which requires the full token stream to calculate
 * Type-Token Ratio correctly (McCarthy & Jarvis, 2010).
 */
export function tokenizeAll(text: string): string[] {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .split(/[\s.,!?;:()\[\]{}"'\-\/\<>@#$%^&*+=|~`]+/)
    .filter(w => w.length >= 1);
}

// ============================================================
// Statistical Functions
// ============================================================

/** Compute the median of a numeric array. */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** Return the value at the given percentile (0-100). */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Population standard deviation. */
export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sumSqDiff = values.reduce((sum, v) => sum + (v - mean) ** 2, 0);
  return Math.sqrt(sumSqDiff / values.length);
}

/** Trimmed mean — removes top and bottom `trimFraction` of values before averaging. */
export function trimmedMean(values: number[], trimFraction: number = 0.1): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const trimCount = Math.floor(sorted.length * trimFraction);
  if (trimCount * 2 >= sorted.length) return median(values);
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
  return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
}

/** Fisher-Pearson skewness coefficient. */
export function skewness(values: number[]): number {
  if (values.length < 3) return 0;
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const sd = stdDev(values);
  if (sd === 0) return 0;
  const m3 = values.reduce((sum, v) => sum + ((v - mean) / sd) ** 3, 0) / n;
  return m3;
}

/** IQR stats result — preserves Q1/Q3/IQR alongside filtered values. */
export interface IQRFilterResult {
  filtered: number[];
  q1: number;
  q3: number;
  iqr: number;
}

/** Filter out extreme outliers using IQR method and return full quartile stats. */
export function filterResponseTimeOutliers(times: number[]): number[] {
  return filterResponseTimeOutliersWithStats(times).filtered;
}

/** Filter outliers AND return Q1/Q3/IQR for downstream use. */
export function filterResponseTimeOutliersWithStats(times: number[]): IQRFilterResult {
  if (times.length < 10) {
    const sorted = [...times].sort((a, b) => a - b);
    return {
      filtered: times,
      q1: sorted.length > 0 ? percentile(sorted, 25) : 0,
      q3: sorted.length > 0 ? percentile(sorted, 75) : 0,
      iqr: sorted.length > 0 ? percentile(sorted, 75) - percentile(sorted, 25) : 0,
    };
  }
  const sorted = [...times].sort((a, b) => a - b);
  const q1 = percentile(sorted, 25);
  const q3 = percentile(sorted, 75);
  const iqr = q3 - q1;
  const upperFence = q3 + 3 * iqr;
  return {
    filtered: times.filter(t => t <= upperFence),
    q1,
    q3,
    iqr,
  };
}

// ============================================================
// Date Helpers
// ============================================================
//
// TIMEZONE ASSUMPTION: All date/time functions use the browser's local timezone
// via `new Date(timestamp).getHours()` etc. This means heatmaps, chronotypes,
// late-night classification, and day-of-week analysis reflect the analyzing
// user's timezone, NOT necessarily the timezone in which messages were sent.
// This is acceptable for local-first analysis but should be disclosed in the UI.

/**
 * Get YYYY-MM month key from a timestamp.
 * Uses browser local timezone — see timezone note above.
 */
export function getMonthKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get YYYY-MM-DD day key from a timestamp.
 * Uses browser local timezone — see timezone note above.
 */
export function getDayKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Check if a timestamp falls in late-night hours.
 * Uses LATE_NIGHT_HOURS from constants.ts (default 22:00-04:00).
 * Uses browser local timezone — see timezone note above.
 */
export function isLateNight(timestamp: number): boolean {
  const hour = new Date(timestamp).getHours();
  return hour >= LATE_NIGHT_HOURS.start || hour < LATE_NIGHT_HOURS.end;
}

/**
 * Check if a timestamp falls on a weekend (Saturday or Sunday).
 * Uses browser local timezone — see timezone note above.
 */
export function isWeekend(timestamp: number): boolean {
  const day = new Date(timestamp).getDay();
  return day === 0 || day === 6;
}

// ============================================================
// Frequency Map Operations
// ============================================================

/** Return top N items from an emoji frequency map, sorted descending. */
export function topN(
  map: Map<string, number>,
  n: number,
): Array<{ emoji: string; count: number }> {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([emoji, count]) => ({ emoji, count }));
}

/** Generic top-N for word frequency maps. */
export function topNWords(
  map: Map<string, number>,
  n: number,
): Array<{ word: string; count: number }> {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([word, count]) => ({ word, count }));
}

/** Generic top-N for phrase/bigram frequency maps. */
export function topNPhrases(
  map: Map<string, number>,
  n: number,
): Array<{ phrase: string; count: number }> {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([phrase, count]) => ({ phrase, count }));
}
