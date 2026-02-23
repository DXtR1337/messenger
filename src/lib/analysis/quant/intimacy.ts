/**
 * Intimacy/closeness progression over time.
 *
 * Computes a monthly composite "intimacy score" from purely quantitative
 * signals — no AI required. Tracks whether a conversation is becoming
 * more personal or drifting apart over time.
 *
 * Four component factors per month:
 * - messageLengthFactor: longer messages = more emotional investment
 * - emotionalWordsFactor: emotional word density = more personal content
 * - informalityFactor: emoji, exclamations vs questions = casual closeness
 * - lateNightFactor: late-night messaging = higher comfort/intimacy
 */

import type { UnifiedMessage, HeatmapData } from '../../parsers/types';
import { getMonthKey, countWords, extractEmojis } from './helpers';
import { linearRegressionSlope } from '../constants';

// ============================================================
// Types
// ============================================================

export interface IntimacyDataPoint {
  month: string; // YYYY-MM
  score: number; // 0-100 composite intimacy score
  components: {
    messageLengthFactor: number; // 0-100
    emotionalWordsFactor: number; // 0-100
    informalityFactor: number; // 0-100 (more exclamations, emoji, fewer questions = more informal)
    lateNightFactor: number; // 0-100 (more late-night msgs = more intimate)
  };
}

export interface IntimacyProgression {
  trend: IntimacyDataPoint[];
  /** Overall direction: positive = growing closer, negative = growing apart */
  overallSlope: number;
  /** Summary label */
  label: string; // e.g. "Rosnąca bliskość", "Stabilna relacja", "Malejąca bliskość"
}

// ============================================================
// Emotional word lists (Polish + English)
// ============================================================

/** High-signal emotional words — presence indicates personal/emotional content. */
const EMOTIONAL_WORDS = new Set([
  // Polish — positive
  'kocham', 'kochanie', 'kochana', 'kochany', 'kochanko', 'tęsknię', 'tęsknie',
  'tęsknota', 'cudownie', 'cudowny', 'cudowna', 'wspaniale', 'wspaniały', 'wspaniała',
  'szczęście', 'szczescie', 'pięknie', 'pieknie', 'piękna', 'piekna', 'piękny',
  'przepraszam', 'przepraszam', 'przytulam', 'buziaki', 'buziak', 'kochać',
  'najlepsza', 'najlepszy', 'skarbie', 'kochasz', 'kocha', 'serce', 'serduszko',
  'ślicznie', 'slicznie', 'śliczna', 'sliczna', 'uwielbiam', 'idealna', 'idealny',
  'szaleję', 'szaleje', 'obiecuję', 'obiecuje', 'wdzięczna', 'wdzieczna',
  // Polish — negative
  'nienawidzę', 'nienawidze', 'nienawiść', 'nienawisc', 'złość', 'zlosc',
  'wściekły', 'wsciekly', 'wściekła', 'wsciekla', 'wkurzony', 'wkurzona',
  'wnerwiasz', 'denerwujesz', 'boli', 'bolało', 'bolalo', 'płaczę', 'placze',
  'smutno', 'smutna', 'smutny', 'żal', 'zal', 'samotna', 'samotny', 'samotność',
  'strach', 'boję', 'boje', 'boisz', 'przestraszona', 'przestraszony', 'rozczarowana',
  'rozczarowany', 'zdrada', 'zdradziłeś', 'zdradzilas', 'kłamiesz', 'klamiesz',
  'oszukujesz', 'ból', 'bol', 'cierpienie', 'cierpię', 'cierpie',
  // English — positive
  'love', 'adore', 'miss', 'missing', 'beautiful', 'wonderful', 'amazing',
  'gorgeous', 'incredible', 'fantastic', 'happiness', 'grateful', 'thankful',
  'appreciate', 'cherish', 'treasure', 'sweetheart', 'darling', 'honey',
  'babe', 'baby', 'sweetie', 'perfect', 'paradise', 'blessed', 'proud',
  'passionate', 'desire', 'dream', 'dreaming', 'forever', 'always',
  // English — negative
  'hate', 'angry', 'furious', 'hurt', 'crying', 'depressed', 'devastated',
  'heartbroken', 'betrayed', 'jealous', 'lonely', 'afraid', 'scared',
  'terrified', 'disappointed', 'disgusted', 'miserable', 'suffering',
  'painful', 'hopeless', 'desperate', 'broken', 'destroyed', 'nightmare',
  'betrayal', 'cheating', 'lying', 'manipulation', 'toxic', 'abuse',
]);

// ============================================================
// Internal helpers
// ============================================================

interface MonthBucket {
  totalWordCount: number;
  messageCount: number;
  emotionalWordCount: number;
  totalWords: number;
  informalityScore: number;
  lateNightCount: number;
}

/** Check if a timestamp falls in late-night hours (22:00-04:00). */
function isLateNight(timestamp: number): boolean {
  const hour = new Date(timestamp).getHours();
  return hour >= 22 || hour < 4;
}

/** Count emotional words in a message. */
function countEmotionalWords(text: string): number {
  const words = text.toLowerCase().split(/\s+/);
  let count = 0;
  for (const word of words) {
    // Strip trailing punctuation for matching
    const clean = word.replace(/[.,!?;:'"()]+$/g, '');
    if (clean.length > 1 && EMOTIONAL_WORDS.has(clean)) {
      count++;
    }
  }
  return count;
}

/**
 * Compute informality score for a single message.
 * Exclamation marks (+1 each), emoji (+2 each).
 * Questions are NOT penalized — they indicate engagement, not formality.
 */
function computeMessageInformalityScore(text: string): number {
  const exclamations = (text.match(/!/g) ?? []).length;
  const emojis = extractEmojis(text).length;
  return exclamations * 1 + emojis * 2;
}

/** Safely normalize a value: (value / max) * 100, returning 0 if max is 0. */
function normalize(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.round((value / max) * 100));
}

// ============================================================
// Main computation
// ============================================================

/**
 * Compute intimacy/closeness progression over the lifetime of a conversation.
 *
 * Groups messages by month and computes four component factors plus
 * a weighted composite score. Then fits a linear regression to determine
 * the overall trend direction.
 */
export function computeIntimacyProgression(
  messages: UnifiedMessage[],
  participantNames: string[],
  _heatmap: HeatmapData,
): IntimacyProgression {
  const defaultResult: IntimacyProgression = {
    trend: [],
    overallSlope: 0,
    label: 'Stabilna relacja',
  };

  if (messages.length === 0 || participantNames.length === 0) {
    return defaultResult;
  }

  // --- Accumulate per-month data ---
  const monthBuckets = new Map<string, MonthBucket>();

  for (const msg of messages) {
    if (msg.type === 'system') continue;
    const month = getMonthKey(msg.timestamp);

    let bucket = monthBuckets.get(month);
    if (!bucket) {
      bucket = {
        totalWordCount: 0,
        messageCount: 0,
        emotionalWordCount: 0,
        totalWords: 0,
        informalityScore: 0,
        lateNightCount: 0,
      };
      monthBuckets.set(month, bucket);
    }

    const wordCount = countWords(msg.content);
    bucket.totalWordCount += wordCount;
    bucket.totalWords += wordCount;
    bucket.messageCount++;
    bucket.emotionalWordCount += countEmotionalWords(msg.content);
    bucket.informalityScore += computeMessageInformalityScore(msg.content);

    if (isLateNight(msg.timestamp)) {
      bucket.lateNightCount++;
    }
  }

  // Need at least 2 months for a meaningful trend
  if (monthBuckets.size < 2) {
    return defaultResult;
  }

  // --- Sort months chronologically ---
  const sortedMonths = [...monthBuckets.keys()].sort();

  // --- Compute raw per-month values ---
  const monthlyAvgLength: number[] = [];
  const monthlyAvgEmotionalDensity: number[] = [];
  const monthlyAvgInformality: number[] = [];
  const monthlyLateNightPct: number[] = [];

  for (const month of sortedMonths) {
    const b = monthBuckets.get(month)!;

    // Average message length (words) this month
    const avgLen = b.messageCount > 0 ? b.totalWordCount / b.messageCount : 0;
    monthlyAvgLength.push(avgLen);

    // Emotional word density: emotional words / total words
    const emotionalDensity = b.totalWords > 0
      ? b.emotionalWordCount / b.totalWords
      : 0;
    monthlyAvgEmotionalDensity.push(emotionalDensity);

    // Average informality score per message
    const avgInformality = b.messageCount > 0
      ? b.informalityScore / b.messageCount
      : 0;
    monthlyAvgInformality.push(avgInformality);

    // Late-night message percentage
    const lateNightPct = b.messageCount > 0
      ? b.lateNightCount / b.messageCount
      : 0;
    monthlyLateNightPct.push(lateNightPct);
  }

  // --- Find max values for normalization ---
  const maxAvgLength = Math.max(...monthlyAvgLength, 0.001);
  const maxEmotionalDensity = Math.max(...monthlyAvgEmotionalDensity, 0.001);
  const maxInformality = Math.max(...monthlyAvgInformality, 0.001);
  const maxLateNightPct = Math.max(...monthlyLateNightPct, 0.001);

  // --- Build data points ---
  const trend: IntimacyDataPoint[] = sortedMonths.map((month, i) => {
    const messageLengthFactor = normalize(monthlyAvgLength[i], maxAvgLength);
    const emotionalWordsFactor = normalize(monthlyAvgEmotionalDensity[i], maxEmotionalDensity);
    // Use consistent value/max normalization — same as other 3 components (no min-shift)
    const informalityFactor = normalize(monthlyAvgInformality[i], maxInformality);
    const lateNightFactor = normalize(monthlyLateNightPct[i], maxLateNightPct);

    // Weighted composite
    const score = Math.round(
      messageLengthFactor * 0.25 +
      emotionalWordsFactor * 0.3 +
      informalityFactor * 0.25 +
      lateNightFactor * 0.2,
    );

    return {
      month,
      score,
      components: {
        messageLengthFactor,
        emotionalWordsFactor,
        informalityFactor,
        lateNightFactor,
      },
    };
  });

  // --- Linear regression on composite scores ---
  const compositeScores = trend.map(d => d.score);
  const overallSlope = linearRegressionSlope(compositeScores);

  // --- Determine label ---
  let label: string;
  if (overallSlope > 2) {
    label = 'Rosnąca bliskość';
  } else if (overallSlope > 0.5) {
    label = 'Stopniowe zbliżanie';
  } else if (overallSlope > -0.5) {
    label = 'Stabilna relacja';
  } else if (overallSlope > -2) {
    label = 'Powolne oddalanie';
  } else {
    label = 'Malejąca bliskość';
  }

  return {
    trend,
    overallSlope,
    label,
  };
}
