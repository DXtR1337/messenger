/**
 * Utility/helper functions for quantitative analysis.
 *
 * Pure functions for text processing, date manipulation,
 * statistical calculations, and frequency map operations.
 */

import { STOPWORDS } from '../constants';

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

/** Filter out extreme outliers using IQR method (keeps legitimate slow responses). */
export function filterResponseTimeOutliers(times: number[]): number[] {
  if (times.length < 10) return times;
  const sorted = [...times].sort((a, b) => a - b);
  const q1 = percentile(sorted, 25);
  const q3 = percentile(sorted, 75);
  const iqr = q3 - q1;
  const upperFence = q3 + 3 * iqr;
  return times.filter(t => t <= upperFence);
}

// ============================================================
// Date Helpers
// ============================================================

/** Get YYYY-MM month key from a timestamp (local timezone). */
export function getMonthKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Get YYYY-MM-DD day key from a timestamp (local timezone). */
export function getDayKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Check if a timestamp falls in late-night hours (22:00-04:00). */
export function isLateNight(timestamp: number): boolean {
  const hour = new Date(timestamp).getHours();
  return hour >= 22 || hour < 4;
}

/** Check if a timestamp falls on a weekend (Saturday or Sunday). */
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
