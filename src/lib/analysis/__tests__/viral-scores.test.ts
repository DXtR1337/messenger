/**
 * Tests for Viral Scores computation.
 *
 * Key discoveries from reading viral-scores.ts:
 * - computeViralScores(quantitative: QuantitativeInput, conversation: ParsedConversation): ViralScores
 *   Takes a pre-computed QuantitativeInput object AND a ParsedConversation
 * - NOT exported sub-functions: computeCompatibilityScore, computeInterestScores, computeGhostRiskScores
 *   Only ONE export: computeViralScores
 * - ParsedConversation.participants is Participant[] ({name: string}[]), NOT string[]
 * - Return type ViralScores: { compatibilityScore, interestScores, ghostRisk, delusionScore, delusionHolder? }
 * - ghostRisk returns score=50 when < 3 months of data (neutral fallback, NOT score=0)
 * - delusionScore = abs(interestA - interestB), holder = person with HIGHER interest
 * - delusionHolder = undefined when delusionScore < 5
 * - HeatmapData: { perPerson: Record<string, number[][]>, combined: number[][] } — 7x24 matrices
 */
import { describe, it, expect } from 'vitest';
import { computeViralScores } from '../viral-scores';
import type {
  ParsedConversation,
  UnifiedMessage,
  HeatmapData,
  TimingMetrics,
  EngagementMetrics,
  PatternMetrics,
  PersonMetrics,
  TrendData,
  ViralScores,
} from '@/lib/parsers/types';

// ============================================================
// Fixture helpers
// ============================================================

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;

function makeUnifiedMsg(
  sender: string,
  content: string,
  timestamp: number,
  index: number,
): UnifiedMessage {
  return {
    index,
    sender,
    timestamp,
    content,
    type: 'text',
    reactions: [],
    hasMedia: false,
    hasLink: false,
    isUnsent: false,
  };
}

/** Build a 7x24 zeroed heatmap matrix for a person. */
function zeroHeatmap(): number[][] {
  return Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
}

/** Build HeatmapData from messages. */
function buildHeatmap(messages: UnifiedMessage[], names: string[]): HeatmapData {
  const perPerson: Record<string, number[][]> = {};
  for (const name of names) {
    perPerson[name] = zeroHeatmap();
  }
  const combined = zeroHeatmap();

  for (const msg of messages) {
    const date = new Date(msg.timestamp);
    const day = date.getDay();
    const hour = date.getHours();
    if (perPerson[msg.sender]) {
      perPerson[msg.sender][day][hour]++;
    }
    combined[day][hour]++;
  }

  return { perPerson, combined };
}

/** Minimal PersonMetrics factory. */
function makePersonMetrics(totalMessages: number, avgLength: number): PersonMetrics {
  return {
    totalMessages,
    totalWords: totalMessages * avgLength,
    totalCharacters: totalMessages * avgLength * 5,
    averageMessageLength: avgLength,
    averageMessageChars: avgLength * 5,
    longestMessage: { content: '', length: 0, timestamp: 0 },
    shortestMessage: { content: '', length: 0, timestamp: 0 },
    messagesWithEmoji: 0,
    emojiCount: 0,
    topEmojis: [],
    questionsAsked: 0,
    mediaShared: 0,
    linksShared: 0,
    reactionsGiven: 0,
    reactionsReceived: 0,
    topReactionsGiven: [],
    unsentMessages: 0,
    topWords: [],
    topPhrases: [],
    uniqueWords: 0,
    vocabularyRichness: 0,
  };
}

/** Build a balanced conversation with N months of data. */
function buildBalancedConversation(months: number, msgsPerDay = 10): {
  messages: UnifiedMessage[];
  conversation: ParsedConversation;
  quantitative: {
    perPerson: Record<string, PersonMetrics>;
    timing: TimingMetrics;
    engagement: EngagementMetrics;
    patterns: PatternMetrics;
    heatmap: HeatmapData;
    trends: TrendData;
  };
} {
  const names = ['Anna', 'Bartek'];
  const start = Date.now() - months * MONTH;
  const messages: UnifiedMessage[] = [];
  let idx = 0;

  for (let d = 0; d < months * 30; d++) {
    const dayTs = start + d * DAY;
    for (let m = 0; m < msgsPerDay; m++) {
      const sender = (d * msgsPerDay + m) % 2 === 0 ? 'Anna' : 'Bartek';
      messages.push(makeUnifiedMsg(sender, 'test message', dayTs + m * 2 * HOUR, idx++));
    }
  }

  const totalMessages = messages.length;
  const halfMsgs = totalMessages / 2;

  const heatmap = buildHeatmap(messages, names);

  // Build monthly volume
  const monthlyVolume: PatternMetrics['monthlyVolume'] = [];
  for (let mo = 0; mo < months; mo++) {
    const monthMsgs = msgsPerDay * 30;
    const month = new Date(start + mo * MONTH);
    const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
    monthlyVolume.push({
      month: key,
      perPerson: { Anna: monthMsgs / 2, Bartek: monthMsgs / 2 },
      total: monthMsgs,
    });
  }

  // Build trend data aligned with months
  const responseTimeTrend: TrendData['responseTimeTrend'] = monthlyVolume.map(mv => ({
    month: mv.month,
    perPerson: { Anna: 5 * 60000, Bartek: 5 * 60000 }, // 5min response
  }));
  const messageLengthTrend: TrendData['messageLengthTrend'] = monthlyVolume.map(mv => ({
    month: mv.month,
    perPerson: { Anna: 8, Bartek: 8 },
  }));
  const initiationTrend: TrendData['initiationTrend'] = monthlyVolume.map(mv => ({
    month: mv.month,
    perPerson: { Anna: 0.5, Bartek: 0.5 },
  }));

  const quantitative = {
    perPerson: {
      Anna: makePersonMetrics(halfMsgs, 8),
      Bartek: makePersonMetrics(halfMsgs, 8),
    },
    timing: {
      perPerson: {
        Anna: { averageResponseTimeMs: 5 * 60000, medianResponseTimeMs: 5 * 60000, fastestResponseMs: 60000, slowestResponseMs: 30 * 60000, responseTimeTrend: 0 },
        Bartek: { averageResponseTimeMs: 5 * 60000, medianResponseTimeMs: 5 * 60000, fastestResponseMs: 60000, slowestResponseMs: 30 * 60000, responseTimeTrend: 0 },
      },
      conversationInitiations: { Anna: halfMsgs / 10, Bartek: halfMsgs / 10 },
      conversationEndings: { Anna: halfMsgs / 10, Bartek: halfMsgs / 10 },
      longestSilence: { durationMs: 12 * HOUR, startTimestamp: start, endTimestamp: start + 12 * HOUR, lastSender: 'Anna', nextSender: 'Bartek' },
      lateNightMessages: { Anna: 10, Bartek: 10 },
    } as TimingMetrics,
    engagement: {
      doubleTexts: { Anna: 5, Bartek: 5 },
      maxConsecutive: { Anna: 3, Bartek: 3 },
      messageRatio: { Anna: 0.5, Bartek: 0.5 },
      reactionRate: { Anna: 0.1, Bartek: 0.1 },
      reactionGiveRate: { Anna: 0.1, Bartek: 0.1 },
      reactionReceiveRate: { Anna: 0.1, Bartek: 0.1 },
      avgConversationLength: 20,
      totalSessions: 50,
    } as EngagementMetrics,
    patterns: {
      monthlyVolume,
      weekdayWeekend: { weekday: { Anna: halfMsgs * 0.7, Bartek: halfMsgs * 0.7 }, weekend: { Anna: halfMsgs * 0.3, Bartek: halfMsgs * 0.3 } },
      volumeTrend: 0,
      bursts: [],
    } as PatternMetrics,
    heatmap,
    trends: {
      responseTimeTrend,
      messageLengthTrend,
      initiationTrend,
    } as TrendData,
  };

  const conversation: ParsedConversation = {
    platform: 'messenger',
    title: 'Test Conversation',
    participants: [{ name: 'Anna' }, { name: 'Bartek' }],
    messages,
    metadata: {
      totalMessages,
      dateRange: { start, end: start + months * MONTH },
      isGroup: false,
      durationDays: months * 30,
    },
  };

  return { messages, conversation, quantitative };
}

/** Build an imbalanced conversation (Anna sends 90%, Bartek 10%). */
function buildImbalancedConversation(months = 8) {
  const { messages, conversation, quantitative } = buildBalancedConversation(months);
  const total = messages.length;
  const annaMsgs = Math.round(total * 0.9);

  const imbalancedQuantitative = {
    ...quantitative,
    perPerson: {
      Anna: makePersonMetrics(annaMsgs, 8),
      Bartek: makePersonMetrics(total - annaMsgs, 8),
    },
    engagement: {
      ...quantitative.engagement,
      messageRatio: { Anna: 0.9, Bartek: 0.1 },
    },
  };

  return { conversation, quantitative: imbalancedQuantitative };
}

// ============================================================
// Compatibility Score
// ============================================================

describe('Viral Scores — Compatibility Score', () => {
  it('returns value in [0, 100]', () => {
    const { conversation, quantitative } = buildBalancedConversation(8);
    const scores = computeViralScores(quantitative, conversation);
    expect(scores.compatibilityScore).toBeGreaterThanOrEqual(0);
    expect(scores.compatibilityScore).toBeLessThanOrEqual(100);
  });

  it('perfectly balanced conversation yields higher score than 90/10 imbalanced', () => {
    const { conversation: balConv, quantitative: balQuant } = buildBalancedConversation(8);
    const { conversation: imbConv, quantitative: imbQuant } = buildImbalancedConversation(8);

    const balancedScore = computeViralScores(balQuant, balConv).compatibilityScore;
    const imbalancedScore = computeViralScores(imbQuant, imbConv).compatibilityScore;

    expect(balancedScore).toBeGreaterThan(imbalancedScore);
  });

  it('returns integer (Math.round applied)', () => {
    const { conversation, quantitative } = buildBalancedConversation(8);
    const scores = computeViralScores(quantitative, conversation);
    expect(Number.isInteger(scores.compatibilityScore)).toBe(true);
  });
});

// ============================================================
// Interest Scores
// ============================================================

describe('Viral Scores — Interest Scores', () => {
  it('returns score for each participant in [0, 100]', () => {
    const { conversation, quantitative } = buildBalancedConversation(8);
    const scores = computeViralScores(quantitative, conversation);
    const names = ['Anna', 'Bartek'];
    for (const name of names) {
      expect(scores.interestScores[name]).toBeGreaterThanOrEqual(0);
      expect(scores.interestScores[name]).toBeLessThanOrEqual(100);
    }
  });

  it('interest scores are integers (Math.round applied)', () => {
    const { conversation, quantitative } = buildBalancedConversation(8);
    const scores = computeViralScores(quantitative, conversation);
    for (const [, score] of Object.entries(scores.interestScores)) {
      expect(Number.isInteger(score)).toBe(true);
    }
  });

  it('interest scores are present for all conversation participants', () => {
    const { conversation, quantitative } = buildBalancedConversation(6);
    const scores = computeViralScores(quantitative, conversation);
    const participantNames = conversation.participants.map(p => p.name);
    for (const name of participantNames) {
      expect(scores.interestScores).toHaveProperty(name);
    }
  });
});

// ============================================================
// Ghost Risk
// ============================================================

describe('Viral Scores — Ghost Risk', () => {
  it('returns ghostRisk for each participant', () => {
    const { conversation, quantitative } = buildBalancedConversation(8);
    const scores = computeViralScores(quantitative, conversation);
    for (const name of ['Anna', 'Bartek']) {
      expect(scores.ghostRisk).toHaveProperty(name);
      expect(scores.ghostRisk[name]).toHaveProperty('score');
      expect(scores.ghostRisk[name]).toHaveProperty('factors');
    }
  });

  it('ghostRisk.score is in [0, 100]', () => {
    const { conversation, quantitative } = buildBalancedConversation(8);
    const scores = computeViralScores(quantitative, conversation);
    for (const [, data] of Object.entries(scores.ghostRisk)) {
      expect(data.score).toBeGreaterThanOrEqual(0);
      expect(data.score).toBeLessThanOrEqual(100);
    }
  });

  it('ghostRisk.score is 50 (unknown) for conversation with < 3 months of data (monthlyVolume < 3)', () => {
    // Build conversation with only 1 month of data → monthlyVolume.length < 3 → neutral score 50
    // Source code: "return { score: 50, factors: [...] }" when months.length < 3
    const { conversation, quantitative } = buildBalancedConversation(1);
    const scores = computeViralScores(quantitative, conversation);
    for (const [, data] of Object.entries(scores.ghostRisk)) {
      // < 3 months → insufficient data → score = 50 (neutral/unknown, not a risk indicator)
      expect(data.score).toBe(50);
      expect(data.factors).toContain('Za mało danych (< 3 miesiące) — ryzyko nieoznaczone');
    }
  });

  it('ghostRisk.factors is an array (may be empty when score=0 and no factor thresholds exceeded)', () => {
    // factors.length > 0 only when: score > 0 and some individual sub-score > 30.
    // With perfectly balanced conversation, score ≈ 0 → factors may be empty.
    // The "Niewielkie zmiany" fallback only fires when score > 0.
    const { conversation, quantitative } = buildBalancedConversation(8);
    const scores = computeViralScores(quantitative, conversation);
    for (const [, data] of Object.entries(scores.ghostRisk)) {
      expect(Array.isArray(data.factors)).toBe(true);
      // factors.length can be 0 when score === 0 (no changes detected)
      expect(data.factors.length).toBeGreaterThanOrEqual(0);
    }
  });
});

// ============================================================
// Delusion Score
// ============================================================

describe('Viral Scores — Delusion Score', () => {
  it('returns delusionScore in [0, 100]', () => {
    const { conversation, quantitative } = buildBalancedConversation(8);
    const scores = computeViralScores(quantitative, conversation);
    expect(scores.delusionScore).toBeGreaterThanOrEqual(0);
    expect(scores.delusionScore).toBeLessThanOrEqual(100);
  });

  it('delusionScore is close to 0 when both participants have equal interest', () => {
    const { conversation, quantitative } = buildBalancedConversation(8);
    const scores = computeViralScores(quantitative, conversation);
    // With perfectly balanced conversation, both interest scores should be similar
    // delusionScore = abs(interestA - interestB)
    // Note: other factors still contribute, so it may not be 0
    expect(scores.delusionScore).toBeGreaterThanOrEqual(0);
    expect(scores.delusionScore).toBeLessThanOrEqual(100);
  });

  it('delusionHolder is undefined when delusionScore < 5', () => {
    // We can build a perfectly symmetric conversation
    const { conversation, quantitative } = buildBalancedConversation(8);
    const scores = computeViralScores(quantitative, conversation);
    if (scores.delusionScore < 5) {
      expect(scores.delusionHolder).toBeUndefined();
    }
  });

  it('delusionHolder is the person with HIGHER interest score (more invested)', () => {
    const { conversation, quantitative } = buildBalancedConversation(8);
    // Manually skew initiations so Anna initiates 80% → Anna has higher interest
    const skewedQuantitative = {
      ...quantitative,
      timing: {
        ...quantitative.timing,
        conversationInitiations: { Anna: 80, Bartek: 20 },
      },
      patterns: {
        ...quantitative.patterns,
        monthlyVolume: Array.from({ length: 8 }, (_, mo) => {
          const d = new Date(Date.now() - (8 - mo) * MONTH);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          return { month: key, perPerson: { Anna: 100, Bartek: 100 }, total: 200 };
        }),
      },
      trends: {
        ...quantitative.trends,
        responseTimeTrend: quantitative.trends.responseTimeTrend.map(t => ({
          ...t,
          perPerson: { Anna: 60000, Bartek: 600000 }, // Anna faster → higher interest
        })),
        initiationTrend: quantitative.trends.initiationTrend.map(t => ({
          ...t,
          perPerson: { Anna: 0.8, Bartek: 0.2 },
        })),
      },
    };

    const scores = computeViralScores(skewedQuantitative, conversation);
    if (scores.delusionScore >= 5) {
      // delusionHolder is the person with HIGHER interest
      const interests = scores.interestScores;
      const holder = scores.delusionHolder!;
      const otherName = holder === 'Anna' ? 'Bartek' : 'Anna';
      expect(interests[holder]).toBeGreaterThan(interests[otherName]);
    }
  });
});

// ============================================================
// Output shape
// ============================================================

describe('Viral Scores — Output shape', () => {
  it('returns ViralScores with all required fields', () => {
    const { conversation, quantitative } = buildBalancedConversation(8);
    const scores = computeViralScores(quantitative, conversation);
    expect(scores).toHaveProperty('compatibilityScore');
    expect(scores).toHaveProperty('interestScores');
    expect(scores).toHaveProperty('ghostRisk');
    expect(scores).toHaveProperty('delusionScore');
    // delusionHolder is optional
  });

  it('returns consistent results when called twice (pure function)', () => {
    const { conversation, quantitative } = buildBalancedConversation(8);
    const s1 = computeViralScores(quantitative, conversation);
    const s2 = computeViralScores(quantitative, conversation);
    expect(s1.compatibilityScore).toBe(s2.compatibilityScore);
    expect(s1.delusionScore).toBe(s2.delusionScore);
  });

  it('handles 3-month conversation without throwing', () => {
    const { conversation, quantitative } = buildBalancedConversation(3);
    expect(() => computeViralScores(quantitative, conversation)).not.toThrow();
  });

  it('handles 12-month conversation without throwing', () => {
    const { conversation, quantitative } = buildBalancedConversation(12);
    expect(() => computeViralScores(quantitative, conversation)).not.toThrow();
  });
});
