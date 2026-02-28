/**
 * Shared constants and utility functions for PodTeksT analysis modules.
 *
 * Extracted to avoid duplication across quantitative.ts, catchphrases.ts,
 * and viral-scores.ts.
 */

// ============================================================
// Gemini model configuration
// ============================================================

/** Gemini model ID — single source of truth for all API calls */
export const GEMINI_MODEL_ID = 'gemini-3-flash-preview';

/** SSE heartbeat interval in milliseconds */
export const SSE_HEARTBEAT_MS = 15_000;

// ============================================================
// Stopwords — Polish + English
// ============================================================

/** Polish + English stopwords — short, common words filtered from top-words analysis. */
export const STOPWORDS = new Set([
  // English
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
  'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
  'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are',
  'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does',
  'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until',
  'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'through',
  'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in',
  'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here',
  'there', 'when', 'where', 'why', 'how', 'all', 'both', 'each', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
  'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'd', 'll',
  'm', 'o', 're', 've', 'y', 'ain', 'aren', 'couldn', 'didn', 'doesn', 'hadn', 'hasn',
  'haven', 'isn', 'ma', 'mightn', 'mustn', 'needn', 'shan', 'shouldn', 'wasn',
  'weren', 'won', 'wouldn', 'ok', 'yes', 'yeah', 'yep', 'no', 'nah', 'nope', 'oh',
  'ah', 'um', 'uh', 'like', 'lol', 'haha', 'hahaha', 'xd', 'xdd',
  // Polish
  'i', 'w', 'z', 'na', 'do', 'to', 'je', 'się', 'nie', 'że', 'co', 'tak', 'za', 'ale',
  'o', 'od', 'po', 'jak', 'już', 'mi', 'ty', 'ja', 'ten', 'ta', 'te', 'go', 'mu', 'czy',
  'jest', 'są', 'był', 'była', 'było', 'być', 'ma', 'mam', 'masz', 'no', 'si', 'tu',
  'tam', 'też', 'tym', 'tego', 'tej', 'tych', 'bo', 'ze', 'sobie', 'tylko', 'jeszcze',
  'może', 'trzeba', 'bardzo', 'teraz', 'kiedy', 'gdzie', 'dlaczego', 'bez', 'przy',
  'nad', 'pod', 'przed', 'przez', 'dla', 'ani', 'albo', 'a', 'u', 'ku', 'aż',
  'juz', 'sie', 'ze', 'moze', 'tez', 'wiec', 'czyli', 'ok', 'dobra', 'xd', 'xdd',
]);

// ============================================================
// Shared utility functions
// ============================================================

/** Linear regression slope for an array of numbers. Filters out NaN and Infinity values. */
export function linearRegressionSlope(values: number[]): number {
  const clean = values.filter((v) => Number.isFinite(v));
  const n = clean.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = clean.reduce((a, b) => a + b, 0) / n;
  const numerator = clean.reduce(
    (sum, y, x) => sum + (x - xMean) * (y - yMean),
    0,
  );
  const denominator = clean.reduce(
    (sum, _, x) => sum + (x - xMean) ** 2,
    0,
  );
  if (denominator === 0) return 0;
  const slope = numerator / denominator;
  return Number.isFinite(slope) ? slope : 0;
}
