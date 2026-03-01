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
// Session & timing thresholds
// ============================================================

/**
 * Session gap threshold — two messages separated by more than this
 * are considered different conversation sessions.
 *
 * 6 hours (21,600,000ms) — convention covering overnight gaps while
 * preserving intra-day multi-session conversations.
 *
 * Sensitivity analysis:
 * - 4h: ~30% more sessions detected (splits afternoon pauses)
 * - 8h: ~20% fewer sessions (merges some day-evening gaps)
 *
 * Cross-reference:
 * - pursuit-withdrawal.ts uses 4h withdrawal gap (shorter, within-session)
 * - conflicts.ts uses 24h cold silence (longer, deliberate disengagement)
 * - This 6h sits between the two as the general session boundary.
 */
export const SESSION_GAP_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Late-night hours definition — consistent across all modules.
 * Used in: intimacy.ts, chronotype.ts, helpers.ts, quantitative.ts
 */
export const LATE_NIGHT_HOURS = { start: 22, end: 4 } as const;

/**
 * Enter-as-comma threshold — consecutive messages from the same sender
 * separated by LESS than this are considered part of one logical message
 * (the sender is using Enter as punctuation, not double-texting).
 *
 * 2 minutes — aligns with Polish texting culture where Enter replaces commas.
 * Messages within this window are consolidated for double-text counting,
 * pursuit-withdrawal detection, and AI context.
 *
 * Cross-reference:
 * - quantitative.ts uses this to count "true" double-text events
 * - pursuit-withdrawal.ts uses this to consolidate pursuit bursts
 */
export const ENTER_AS_COMMA_MS = 2 * 60 * 1000; // 2 minutes

// ============================================================
// Gemini temperature configuration
// ============================================================

/**
 * Temperature settings per analysis type.
 *
 * Lower temperatures reduce run-to-run variance in structured outputs:
 * - 0.1: Analytical passes — personality scoring, clinical observations, CPS.
 *   Big Five scores can vary ±1.5 at 0.3 but only ±0.5 at 0.1.
 * - 0.3: Synthesis — Pass 4 health score, predictions. Needs slight creativity
 *   for narrative insights while keeping scores stable.
 * - 0.5: Semi-creative — Court trial, enhanced roast. Balanced factual/stylistic.
 * - 0.7: Creative — Dating profile, stand-up comedy. Maximum voice variety.
 */
export const TEMPERATURES = {
    ANALYTICAL: 0.1,    // Pass 1-3A, CPS, capitalization, emotion causes
    SYNTHESIS: 0.3,     // Pass 3B, Pass 4, moral foundations
    SEMI_CREATIVE: 0.5, // Court trial, enhanced roast, subtext
    CREATIVE: 0.7,      // Dating profile, stand-up, mega roast, cwel
} as const;

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
// Argument simulation — per-person color palette
// ============================================================

/** 20-color palette for argument participants (hex). */
export const ARGUMENT_PERSON_COLORS = [
  '#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#8b5cf6',
  '#14b8a6', '#e11d48', '#0ea5e9', '#d946ef', '#22c55e',
  '#facc15', '#6366f1', '#fb923c', '#4ade80', '#f43f5e',
];

/** 20-color palette for argument participants (RGB tuples for jsPDF). */
export const ARGUMENT_PERSON_COLORS_RGB: [number, number, number][] = [
  [59, 130, 246], [168, 85, 247], [16, 185, 129], [245, 158, 11], [239, 68, 68],
  [236, 72, 153], [6, 182, 212], [132, 204, 22], [249, 115, 22], [139, 92, 246],
  [20, 184, 166], [225, 29, 72], [14, 165, 233], [217, 70, 239], [34, 197, 94],
  [250, 204, 21], [99, 102, 241], [251, 146, 60], [74, 222, 128], [244, 63, 94],
];

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
