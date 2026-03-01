/**
 * Shared test fixtures for PodTeksT.
 * NOT a test file — exports reusable factory functions.
 */

import type {
  UnifiedMessage,
  ParsedConversation,
  QuantitativeAnalysis,
  PersonMetrics,
  TimingMetrics,
  EngagementMetrics,
  PatternMetrics,
  HeatmapData,
  TrendData,
} from '@/lib/parsers/types';
import type { PersonAccumulator } from '@/lib/analysis/quant/types';
import { createPersonAccumulator } from '@/lib/analysis/quant/types';

// ─── Time constants ───────────────────────────────────────────────
export const MINUTE = 60_000;
export const HOUR = 3_600_000;
export const DAY = 86_400_000;

/** 2024-06-15 12:00:00 UTC — Saturday, midday, avoids DST/midnight edges */
export const BASE_TS = 1_718_445_600_000;

// ─── UnifiedMessage factory ───────────────────────────────────────
let _msgIndex = 0;

export function makeMsg(
  sender: string,
  content: string,
  timestamp: number,
  overrides?: Partial<UnifiedMessage>,
): UnifiedMessage {
  return {
    index: _msgIndex++,
    sender,
    content,
    timestamp,
    type: 'text',
    reactions: [],
    hasMedia: false,
    hasLink: false,
    isUnsent: false,
    ...overrides,
  };
}

/** Reset the auto-incrementing index (call in beforeEach if needed). */
export function resetMsgIndex(): void {
  _msgIndex = 0;
}

// ─── Message sequence builder ─────────────────────────────────────
export function makeSequence(
  sender: string,
  count: number,
  startTs: number,
  gapMs: number,
  content = 'msg',
): UnifiedMessage[] {
  return Array.from({ length: count }, (_, i) =>
    makeMsg(sender, `${content} ${i}`, startTs + i * gapMs),
  );
}

// ─── ParsedConversation factory ───────────────────────────────────
export function makeConversation(
  names: string[],
  messages: UnifiedMessage[],
  overrides?: Partial<ParsedConversation>,
): ParsedConversation {
  const start = messages.length > 0 ? messages[0].timestamp : BASE_TS;
  const end = messages.length > 0 ? messages[messages.length - 1].timestamp : BASE_TS;
  const durationDays = Math.max(1, Math.round((end - start) / DAY));
  return {
    platform: 'messenger',
    title: names.join(' i '),
    participants: names.map((name) => ({ name })),
    messages,
    metadata: {
      totalMessages: messages.length,
      dateRange: { start, end },
      isGroup: names.length > 2,
      durationDays,
    },
    ...overrides,
  };
}

// ─── PersonMetrics factory ────────────────────────────────────────
export function makePersonMetrics(
  overrides?: Partial<PersonMetrics>,
): PersonMetrics {
  return {
    totalMessages: 100,
    totalWords: 1000,
    totalCharacters: 5000,
    averageMessageLength: 10,
    averageMessageChars: 50,
    longestMessage: { content: 'test', length: 4, timestamp: 0 },
    shortestMessage: { content: 'a', length: 1, timestamp: 0 },
    messagesWithEmoji: 10,
    emojiCount: 15,
    topEmojis: [],
    questionsAsked: 5,
    mediaShared: 2,
    linksShared: 1,
    reactionsGiven: 20,
    reactionsReceived: 15,
    topReactionsGiven: [],
    unsentMessages: 0,
    topWords: [],
    topPhrases: [],
    uniqueWords: 500,
    vocabularyRichness: 0.5,
    ...overrides,
  };
}

// ─── QuantitativeAnalysis factory ─────────────────────────────────
type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] };

function makeHeatmap(names: string[]): HeatmapData {
  const zeros = () => Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
  const perPerson: Record<string, number[][]> = {};
  for (const n of names) perPerson[n] = zeros();
  return { perPerson, combined: zeros() };
}

function makeTimingPerPerson(names: string[]): TimingMetrics['perPerson'] {
  const pp: TimingMetrics['perPerson'] = {};
  for (const n of names) {
    pp[n] = {
      averageResponseTimeMs: 3_600_000,
      medianResponseTimeMs: 3_600_000,
      fastestResponseMs: 60_000,
      slowestResponseMs: 86_400_000,
      responseTimeTrend: 0,
      trimmedMeanMs: 3_600_000,
      stdDevMs: 1_800_000,
      q1Ms: 1_200_000,
      q3Ms: 5_400_000,
      iqrMs: 4_200_000,
      p75Ms: 5_400_000,
      p90Ms: 7_200_000,
      p95Ms: 10_800_000,
      skewness: 1.2,
      sampleSize: 100,
    };
  }
  return pp;
}

export function makeQuant(
  overrides?: DeepPartial<QuantitativeAnalysis>,
  names = ['Alice', 'Bob'],
): QuantitativeAnalysis {
  const perPerson: Record<string, PersonMetrics> = {};
  for (const n of names) perPerson[n] = makePersonMetrics();

  const timing: TimingMetrics = {
    perPerson: makeTimingPerPerson(names),
    conversationInitiations: Object.fromEntries(names.map((n) => [n, 10])),
    conversationEndings: Object.fromEntries(names.map((n) => [n, 10])),
    longestSilence: {
      durationMs: 604_800_000,
      startTimestamp: 0,
      endTimestamp: 604_800_000,
      lastSender: names[0],
      nextSender: names[1] ?? names[0],
    },
    lateNightMessages: Object.fromEntries(names.map((n) => [n, 5])),
  };

  const engagement: EngagementMetrics = {
    doubleTexts: Object.fromEntries(names.map((n) => [n, 2])),
    maxConsecutive: Object.fromEntries(names.map((n) => [n, 3])),
    messageRatio: Object.fromEntries(names.map((n, i) => [n, i === 0 ? 0.5 : 0.5])),
    reactionRate: Object.fromEntries(names.map((n) => [n, 0.2])),
    reactionGiveRate: Object.fromEntries(names.map((n) => [n, 0.2])),
    reactionReceiveRate: Object.fromEntries(names.map((n) => [n, 0.15])),
    avgConversationLength: 10,
    totalSessions: 20,
  };

  const patterns: PatternMetrics = {
    monthlyVolume: [
      { month: '2024-01', perPerson: Object.fromEntries(names.map((n) => [n, 100])), total: names.length * 100 },
      { month: '2024-02', perPerson: Object.fromEntries(names.map((n) => [n, 100])), total: names.length * 100 },
    ],
    weekdayWeekend: {
      weekday: Object.fromEntries(names.map((n) => [n, 70])),
      weekend: Object.fromEntries(names.map((n) => [n, 30])),
    },
    volumeTrend: 0,
    bursts: [],
  };

  const base: QuantitativeAnalysis = {
    perPerson,
    timing,
    engagement,
    patterns,
    heatmap: makeHeatmap(names),
    trends: {
      responseTimeTrend: [],
      messageLengthTrend: [],
      initiationTrend: [],
    },
  };

  // Shallow merge overrides
  if (overrides) {
    return { ...base, ...overrides } as QuantitativeAnalysis;
  }
  return base;
}

// ─── PersonAccumulator factory ────────────────────────────────────
export function makeAccumulator(
  overrides?: Partial<PersonAccumulator>,
): PersonAccumulator {
  const base = createPersonAccumulator();
  return { ...base, ...overrides };
}
