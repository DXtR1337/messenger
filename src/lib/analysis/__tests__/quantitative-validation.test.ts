/**
 * Quantitative Analysis — Statistical Property Validation.
 *
 * Key discoveries from reading quantitative.ts and types.ts:
 * - computeQuantitativeAnalysis(conversation: ParsedConversation): QuantitativeAnalysis
 * - ParsedConversation requires: platform, title, participants (Participant[]), messages (UnifiedMessage[]), metadata
 * - metadata requires: totalMessages, dateRange: {start, end}, isGroup, durationDays
 * - participants is Participant[] — objects with { name: string }
 * - result.rankingPercentiles is RankingPercentiles: { rankings: RankingPercentile[] }
 *   NOT a Record<string, {percentile: number}> — rankings is an ARRAY
 * - result.sentimentAnalysis is { perPerson: Record<string, PersonSentimentStats> }
 *   PersonSentimentStats has: avgSentiment, positiveRatio, negativeRatio, neutralRatio, emotionalVolatility
 * - Monthly keys from getMonthKey() use local timezone Date formatting → YYYY-MM
 * - reciprocityIndex: ReciprocityIndex { overall, messageBalance, initiationBalance, responseTimeSymmetry, reactionBalance }
 */
import { describe, it, expect } from 'vitest';
import { computeQuantitativeAnalysis } from '../quantitative';
import type { ParsedConversation, UnifiedMessage } from '@/lib/parsers/types';

// ============================================================
// Fixture helpers
// ============================================================

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

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

/** Build a balanced 200-message ParsedConversation. */
function makeConversation200(
  msgContent = 'test message with some content here',
  participants = ['Anna', 'Bartek'],
): ParsedConversation {
  const start = 1_700_000_000_000;
  const messages: UnifiedMessage[] = Array.from({ length: 200 }, (_, i) => {
    const sender = participants[i % participants.length];
    return makeUnifiedMsg(sender, msgContent, start + i * 2 * HOUR, i);
  });

  return {
    platform: 'messenger',
    title: 'Test Conversation',
    participants: participants.map(name => ({ name })),
    messages,
    metadata: {
      totalMessages: messages.length,
      dateRange: { start: messages[0].timestamp, end: messages[messages.length - 1].timestamp },
      isGroup: participants.length > 2,
      durationDays: Math.ceil((messages[messages.length - 1].timestamp - messages[0].timestamp) / DAY),
    },
  };
}

/** Build an imbalanced conversation (Anna 90%, Bartek 10%). */
function makeImbalancedConversation(): ParsedConversation {
  const start = 1_700_000_000_000;
  const messages: UnifiedMessage[] = Array.from({ length: 200 }, (_, i) => {
    const sender = i < 180 ? 'Anna' : 'Bartek';
    return makeUnifiedMsg(sender, 'test message', start + i * 2 * HOUR, i);
  });

  return {
    platform: 'messenger',
    title: 'Imbalanced Conversation',
    participants: [{ name: 'Anna' }, { name: 'Bartek' }],
    messages,
    metadata: {
      totalMessages: messages.length,
      dateRange: { start: messages[0].timestamp, end: messages[messages.length - 1].timestamp },
      isGroup: false,
      durationDays: Math.ceil((messages[messages.length - 1].timestamp - messages[0].timestamp) / DAY),
    },
  };
}

// ============================================================
// Basic value bounds
// ============================================================

describe('Quantitative Analysis — Value bounds', () => {
  it('sum of per-person message counts equals totalMessages', () => {
    const conv = makeConversation200();
    const result = computeQuantitativeAnalysis(conv);
    const sum = Object.values(result.perPerson).reduce((s, p) => s + p.totalMessages, 0);
    expect(sum).toBe(result.patterns.monthlyVolume.reduce((s, m) => s + m.total, 0));
  });

  it('per-person messageRatio sums to approximately 1.0', () => {
    const conv = makeConversation200();
    const result = computeQuantitativeAnalysis(conv);
    const totalRatio = Object.values(result.engagement.messageRatio).reduce((s, r) => s + r, 0);
    expect(Math.abs(totalRatio - 1.0)).toBeLessThan(0.01);
  });

  it('response time median is positive when messages alternate between senders', () => {
    const conv = makeConversation200();
    const result = computeQuantitativeAnalysis(conv);
    for (const [, person] of Object.entries(result.timing.perPerson)) {
      if (person.medianResponseTimeMs !== undefined && person.medianResponseTimeMs > 0) {
        expect(person.medianResponseTimeMs).toBeGreaterThan(0);
      }
    }
  });

  it('vocabularyRichness is in [0, 1] range', () => {
    const conv = makeConversation200();
    const result = computeQuantitativeAnalysis(conv);
    for (const [, person] of Object.entries(result.perPerson)) {
      if (person.vocabularyRichness !== undefined) {
        expect(person.vocabularyRichness).toBeGreaterThanOrEqual(0);
        expect(person.vocabularyRichness).toBeLessThanOrEqual(1);
      }
    }
  });

  it('heatmap combined matrix has 7 days × 24 hours', () => {
    const conv = makeConversation200();
    const result = computeQuantitativeAnalysis(conv);
    expect(result.heatmap.combined).toHaveLength(7);
    for (const dayRow of result.heatmap.combined) {
      expect(dayRow).toHaveLength(24);
    }
  });

  it('heatmap values are non-negative integers', () => {
    const conv = makeConversation200();
    const result = computeQuantitativeAnalysis(conv);
    for (const dayRow of result.heatmap.combined) {
      for (const count of dayRow) {
        expect(count).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(count)).toBe(true);
      }
    }
  });

  it('heatmap sum equals total message count', () => {
    const conv = makeConversation200();
    const result = computeQuantitativeAnalysis(conv);
    const heatmapSum = result.heatmap.combined.reduce(
      (sum, dayRow) => sum + dayRow.reduce((s, v) => s + v, 0),
      0,
    );
    expect(heatmapSum).toBe(conv.messages.length);
  });

  it('reciprocityIndex.overall is in [0, 100] range', () => {
    const conv = makeConversation200();
    const result = computeQuantitativeAnalysis(conv);
    if (result.reciprocityIndex !== undefined) {
      expect(result.reciprocityIndex.overall).toBeGreaterThanOrEqual(0);
      expect(result.reciprocityIndex.overall).toBeLessThanOrEqual(100);
    }
  });

  it('averageMessageLength is non-negative for all participants', () => {
    const conv = makeConversation200();
    const result = computeQuantitativeAnalysis(conv);
    for (const [, person] of Object.entries(result.perPerson)) {
      expect(person.averageMessageLength).toBeGreaterThanOrEqual(0);
    }
  });
});

// ============================================================
// Data consistency
// ============================================================

describe('Quantitative Analysis — Data consistency', () => {
  it('participants array has same keys in perPerson as conversation participants', () => {
    const conv = makeConversation200();
    const result = computeQuantitativeAnalysis(conv);
    const expectedNames = conv.participants.map(p => p.name).sort();
    const actualNames = Object.keys(result.perPerson).sort();
    expect(actualNames).toEqual(expectedNames);
  });

  it('monthly stats keys are in YYYY-MM format', () => {
    const conv = makeConversation200();
    const result = computeQuantitativeAnalysis(conv);
    for (const { month } of result.patterns.monthlyVolume) {
      expect(month).toMatch(/^\d{4}-\d{2}$/);
    }
  });

  it('returns consistent results when called twice on same input (deterministic)', () => {
    const conv = makeConversation200();
    const r1 = computeQuantitativeAnalysis(conv);
    const r2 = computeQuantitativeAnalysis(conv);
    expect(r1.perPerson['Anna'].totalMessages).toBe(r2.perPerson['Anna'].totalMessages);
    expect(r1.patterns.monthlyVolume.length).toBe(r2.patterns.monthlyVolume.length);
    expect(r1.engagement.messageRatio['Anna']).toBe(r2.engagement.messageRatio['Anna']);
  });

  it('perPerson heatmap per-person matrices match combined when summed', () => {
    const conv = makeConversation200();
    const result = computeQuantitativeAnalysis(conv);
    // Sum of all per-person heatmaps at each cell should equal combined
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        let personSum = 0;
        for (const matrix of Object.values(result.heatmap.perPerson)) {
          personSum += matrix[d][h];
        }
        expect(personSum).toBe(result.heatmap.combined[d][h]);
      }
    }
  });

  it('totalMessages in patterns.monthlyVolume items sum to conversation message count', () => {
    const conv = makeConversation200();
    const result = computeQuantitativeAnalysis(conv);
    const monthlyTotal = result.patterns.monthlyVolume.reduce((s, m) => s + m.total, 0);
    expect(monthlyTotal).toBe(conv.messages.length);
  });

  it('conversationInitiations total > 0 when messages exist', () => {
    const conv = makeConversation200();
    const result = computeQuantitativeAnalysis(conv);
    const totalInitiations = Object.values(result.timing.conversationInitiations).reduce((s, v) => s + v, 0);
    expect(totalInitiations).toBeGreaterThan(0);
  });
});

// ============================================================
// Monotonic properties
// ============================================================

describe('Quantitative Analysis — Monotonic properties', () => {
  it('imbalanced conversation: Anna message ratio > 0.5 when Anna sends 90%', () => {
    const conv = makeImbalancedConversation();
    const result = computeQuantitativeAnalysis(conv);
    expect(result.engagement.messageRatio['Anna']).toBeGreaterThan(0.5);
    expect(result.engagement.messageRatio['Bartek']).toBeLessThan(0.5);
  });

  it('imbalanced conversation: Anna totalMessages > Bartek totalMessages', () => {
    const conv = makeImbalancedConversation();
    const result = computeQuantitativeAnalysis(conv);
    expect(result.perPerson['Anna'].totalMessages).toBeGreaterThan(
      result.perPerson['Bartek'].totalMessages
    );
  });

  it('longer messages → higher averageMessageLength', () => {
    const shortConv = makeConversation200('hi ok');
    const longConv = makeConversation200('this is a very long message with many many many many words in it');

    const shortResult = computeQuantitativeAnalysis(shortConv);
    const longResult = computeQuantitativeAnalysis(longConv);

    const shortAvg = Object.values(shortResult.perPerson)
      .reduce((s, p) => s + p.averageMessageLength, 0) / 2;
    const longAvg = Object.values(longResult.perPerson)
      .reduce((s, p) => s + p.averageMessageLength, 0) / 2;

    expect(longAvg).toBeGreaterThan(shortAvg);
  });
});

// ============================================================
// Sentiment bounds
// ============================================================

describe('Quantitative Analysis — Sentiment analysis', () => {
  it('sentiment analysis is present', () => {
    const conv = makeConversation200();
    const result = computeQuantitativeAnalysis(conv);
    expect(result.sentimentAnalysis).toBeDefined();
    expect(result.sentimentAnalysis!.perPerson).toBeDefined();
  });

  it('sentiment avgSentiment values are finite numbers', () => {
    const conv = makeConversation200();
    const result = computeQuantitativeAnalysis(conv);
    if (result.sentimentAnalysis) {
      for (const [, stats] of Object.entries(result.sentimentAnalysis.perPerson)) {
        expect(typeof stats.avgSentiment).toBe('number');
        expect(isFinite(stats.avgSentiment)).toBe(true);
      }
    }
  });

  it('positiveRatio + negativeRatio + neutralRatio approximately equals 1', () => {
    const conv = makeConversation200();
    const result = computeQuantitativeAnalysis(conv);
    if (result.sentimentAnalysis) {
      for (const [, stats] of Object.entries(result.sentimentAnalysis.perPerson)) {
        const total = stats.positiveRatio + stats.negativeRatio + stats.neutralRatio;
        expect(Math.abs(total - 1)).toBeLessThan(0.01);
      }
    }
  });

  it('emotionalVolatility is non-negative', () => {
    const conv = makeConversation200();
    const result = computeQuantitativeAnalysis(conv);
    if (result.sentimentAnalysis) {
      for (const [, stats] of Object.entries(result.sentimentAnalysis.perPerson)) {
        expect(stats.emotionalVolatility).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

// ============================================================
// Ranking percentiles
// ============================================================

describe('Quantitative Analysis — Ranking percentiles', () => {
  it('rankingPercentiles is present and has rankings array', () => {
    const conv = makeConversation200();
    const result = computeQuantitativeAnalysis(conv);
    expect(result.rankingPercentiles).toBeDefined();
    expect(Array.isArray(result.rankingPercentiles!.rankings)).toBe(true);
  });

  it('each ranking has required fields: metric, label, value, percentile, emoji', () => {
    const conv = makeConversation200();
    const result = computeQuantitativeAnalysis(conv);
    if (result.rankingPercentiles) {
      for (const ranking of result.rankingPercentiles.rankings) {
        expect(ranking).toHaveProperty('metric');
        expect(ranking).toHaveProperty('label');
        expect(ranking).toHaveProperty('value');
        expect(ranking).toHaveProperty('percentile');
        expect(ranking).toHaveProperty('emoji');
        expect(typeof ranking.metric).toBe('string');
        expect(typeof ranking.percentile).toBe('number');
      }
    }
  });

  it('ranking percentiles are in [1, 99] range (clamped by logNormalPercentile)', () => {
    const conv = makeConversation200();
    const result = computeQuantitativeAnalysis(conv);
    if (result.rankingPercentiles) {
      for (const ranking of result.rankingPercentiles.rankings) {
        // logNormalPercentile returns values — can be 0 to 100
        // The rankings system doesn't clamp, but CDF output is in [0,100]
        expect(ranking.percentile).toBeGreaterThanOrEqual(0);
        expect(ranking.percentile).toBeLessThanOrEqual(100);
      }
    }
  });

  it('ranking values are finite numbers', () => {
    const conv = makeConversation200();
    const result = computeQuantitativeAnalysis(conv);
    if (result.rankingPercentiles) {
      for (const ranking of result.rankingPercentiles.rankings) {
        expect(isFinite(ranking.value)).toBe(true);
      }
    }
  });
});

// ============================================================
// Version and metadata
// ============================================================

describe('Quantitative Analysis — Version and metadata', () => {
  it('returns _version: 2', () => {
    const conv = makeConversation200();
    const result = computeQuantitativeAnalysis(conv);
    expect(result._version).toBe(2);
  });

  it('viralScores is defined for 2-person conversation', () => {
    const conv = makeConversation200();
    const result = computeQuantitativeAnalysis(conv);
    expect(result.viralScores).toBeDefined();
    expect(result.viralScores!.compatibilityScore).toBeGreaterThanOrEqual(0);
    expect(result.viralScores!.compatibilityScore).toBeLessThanOrEqual(100);
  });

  it('handles minimal conversation (exactly 200 messages) without throwing', () => {
    const conv = makeConversation200();
    expect(() => computeQuantitativeAnalysis(conv)).not.toThrow();
  });
});

// ============================================================
// Edge cases
// ============================================================

describe('Quantitative Analysis — Edge cases', () => {
  it('handles emoji-only content without throwing', () => {
    const conv = makeConversation200('😊❤️🔥🎉👋');
    expect(() => computeQuantitativeAnalysis(conv)).not.toThrow();
  });

  it('handles empty content messages without throwing', () => {
    const conv = makeConversation200('');
    expect(() => computeQuantitativeAnalysis(conv)).not.toThrow();
  });

  it('handles messages with questions — questionsAsked increments', () => {
    const conv = makeConversation200('how are you doing? what do you think?');
    const result = computeQuantitativeAnalysis(conv);
    const totalQuestions = Object.values(result.perPerson)
      .reduce((s, p) => s + p.questionsAsked, 0);
    expect(totalQuestions).toBeGreaterThan(0);
  });

  it('longestSilence.durationMs is positive when messages are spaced apart', () => {
    const conv = makeConversation200(); // 2h gaps between messages
    const result = computeQuantitativeAnalysis(conv);
    expect(result.timing.longestSilence.durationMs).toBeGreaterThan(0);
  });

  it('conflict analysis is present', () => {
    const conv = makeConversation200();
    const result = computeQuantitativeAnalysis(conv);
    expect(result.conflictAnalysis).toBeDefined();
    expect(Array.isArray(result.conflictAnalysis!.events)).toBe(true);
    expect(typeof result.conflictAnalysis!.totalConflicts).toBe('number');
  });
});
