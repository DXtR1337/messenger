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

/** Extract all emoji characters from a string. */
export function extractEmojis(text: string): string[] {
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

/** Filter out extreme outliers: cap at 95th percentile. */
export function filterResponseTimeOutliers(times: number[]): number[] {
  if (times.length < 10) return times;
  const sorted = [...times].sort((a, b) => a - b);
  const p95 = percentile(sorted, 95);
  return times.filter(t => t <= p95);
}

// ============================================================
// Date Helpers
// ============================================================

/** Get YYYY-MM month key from a timestamp. */
export function getMonthKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 7);
}

/** Get YYYY-MM-DD day key from a timestamp. */
export function getDayKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
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
