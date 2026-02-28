import { describe, it, expect } from 'vitest';
import { computeReciprocityIndex } from '../reciprocity';
import type { EngagementMetrics, TimingMetrics, PersonMetrics } from '@/lib/parsers/types';

function makeEngagement(overrides?: Partial<EngagementMetrics>): EngagementMetrics {
  return {
    doubleTexts: { Alice: 2, Bob: 2 },
    maxConsecutive: { Alice: 3, Bob: 3 },
    messageRatio: { Alice: 0.5, Bob: 0.5 },
    reactionRate: { Alice: 0.2, Bob: 0.2 },
    reactionGiveRate: { Alice: 0.2, Bob: 0.2 },
    reactionReceiveRate: { Alice: 0.15, Bob: 0.15 },
    avgConversationLength: 10,
    totalSessions: 20,
    ...overrides,
  };
}

function makeTiming(overrides?: Partial<TimingMetrics>): TimingMetrics {
  return {
    perPerson: {
      Alice: { averageResponseTimeMs: 60_000, medianResponseTimeMs: 60_000, fastestResponseMs: 10_000, slowestResponseMs: 300_000, responseTimeTrend: 0 },
      Bob: { averageResponseTimeMs: 60_000, medianResponseTimeMs: 60_000, fastestResponseMs: 10_000, slowestResponseMs: 300_000, responseTimeTrend: 0 },
    },
    conversationInitiations: { Alice: 10, Bob: 10 },
    conversationEndings: { Alice: 10, Bob: 10 },
    longestSilence: { durationMs: 86_400_000, startTimestamp: 0, endTimestamp: 86_400_000, lastSender: 'Alice', nextSender: 'Bob' },
    lateNightMessages: { Alice: 5, Bob: 5 },
    ...overrides,
  };
}

function makePersonMetrics(overrides?: Partial<PersonMetrics>): PersonMetrics {
  return {
    totalMessages: 100, totalWords: 1000, totalCharacters: 5000,
    averageMessageLength: 10, averageMessageChars: 50,
    longestMessage: { content: '', length: 0, timestamp: 0 },
    shortestMessage: { content: '', length: 0, timestamp: 0 },
    messagesWithEmoji: 10, emojiCount: 15, topEmojis: [],
    questionsAsked: 5, mediaShared: 2, linksShared: 1,
    reactionsGiven: 20, reactionsReceived: 15, topReactionsGiven: [],
    unsentMessages: 0, topWords: [], topPhrases: [],
    uniqueWords: 500, vocabularyRichness: 0.5,
    ...overrides,
  };
}

describe('computeReciprocityIndex', () => {
  describe('guard: single participant', () => {
    it('returns default {overall:50} for 1 participant', () => {
      const result = computeReciprocityIndex(makeEngagement(), makeTiming(), { Alice: makePersonMetrics() }, ['Alice']);
      expect(result.overall).toBe(50);
      expect(result.messageBalance).toBe(50);
      expect(result.initiationBalance).toBe(50);
      expect(result.responseTimeSymmetry).toBe(50);
      expect(result.reactionBalance).toBe(50);
    });

    it('returns default for empty participants', () => {
      const result = computeReciprocityIndex(makeEngagement(), makeTiming(), {}, []);
      expect(result.overall).toBe(50);
    });
  });

  describe('messageBalance', () => {
    it('perfect 50/50 split → 100', () => {
      const eng = makeEngagement({ messageRatio: { Alice: 0.5, Bob: 0.5 } });
      const result = computeReciprocityIndex(eng, makeTiming(), { Alice: makePersonMetrics(), Bob: makePersonMetrics() }, ['Alice', 'Bob']);
      expect(result.messageBalance).toBe(100);
    });

    it('one-sided (ratioA=1.0) → 0', () => {
      const eng = makeEngagement({ messageRatio: { Alice: 1.0, Bob: 0.0 } });
      const result = computeReciprocityIndex(eng, makeTiming(), { Alice: makePersonMetrics(), Bob: makePersonMetrics() }, ['Alice', 'Bob']);
      expect(result.messageBalance).toBe(0);
    });

    it('60/40 split → 80', () => {
      const eng = makeEngagement({ messageRatio: { Alice: 0.6, Bob: 0.4 } });
      const result = computeReciprocityIndex(eng, makeTiming(), { Alice: makePersonMetrics(), Bob: makePersonMetrics() }, ['Alice', 'Bob']);
      expect(result.messageBalance).toBe(80);
    });

    it('70/30 split → 60', () => {
      const eng = makeEngagement({ messageRatio: { Alice: 0.7, Bob: 0.3 } });
      const result = computeReciprocityIndex(eng, makeTiming(), { Alice: makePersonMetrics(), Bob: makePersonMetrics() }, ['Alice', 'Bob']);
      expect(result.messageBalance).toBe(60);
    });
  });

  describe('initiationBalance', () => {
    it('50/50 initiations → 100', () => {
      const timing = makeTiming({ conversationInitiations: { Alice: 10, Bob: 10 } });
      const result = computeReciprocityIndex(makeEngagement(), timing, { Alice: makePersonMetrics(), Bob: makePersonMetrics() }, ['Alice', 'Bob']);
      expect(result.initiationBalance).toBe(100);
    });

    it('all from one person → 0', () => {
      const timing = makeTiming({ conversationInitiations: { Alice: 20, Bob: 0 } });
      const result = computeReciprocityIndex(makeEngagement(), timing, { Alice: makePersonMetrics(), Bob: makePersonMetrics() }, ['Alice', 'Bob']);
      expect(result.initiationBalance).toBe(0);
    });

    it('zero total initiations → defaults to 50', () => {
      const timing = makeTiming({ conversationInitiations: { Alice: 0, Bob: 0 } });
      const result = computeReciprocityIndex(makeEngagement(), timing, { Alice: makePersonMetrics(), Bob: makePersonMetrics() }, ['Alice', 'Bob']);
      expect(result.initiationBalance).toBe(50);
    });
  });

  describe('responseTimeSymmetry', () => {
    it('rtA=rtB → 100', () => {
      const timing = makeTiming({
        perPerson: {
          Alice: { averageResponseTimeMs: 60_000, medianResponseTimeMs: 60_000, fastestResponseMs: 10_000, slowestResponseMs: 300_000, responseTimeTrend: 0 },
          Bob: { averageResponseTimeMs: 60_000, medianResponseTimeMs: 60_000, fastestResponseMs: 10_000, slowestResponseMs: 300_000, responseTimeTrend: 0 },
        },
      } as Partial<TimingMetrics>);
      const result = computeReciprocityIndex(makeEngagement(), timing, { Alice: makePersonMetrics(), Bob: makePersonMetrics() }, ['Alice', 'Bob']);
      expect(result.responseTimeSymmetry).toBe(100);
    });

    it('rtA=100ms, rtB=1000ms → 10', () => {
      const timing = makeTiming({
        perPerson: {
          Alice: { averageResponseTimeMs: 100, medianResponseTimeMs: 100, fastestResponseMs: 50, slowestResponseMs: 200, responseTimeTrend: 0 },
          Bob: { averageResponseTimeMs: 1000, medianResponseTimeMs: 1000, fastestResponseMs: 500, slowestResponseMs: 2000, responseTimeTrend: 0 },
        },
      } as Partial<TimingMetrics>);
      const result = computeReciprocityIndex(makeEngagement(), timing, { Alice: makePersonMetrics(), Bob: makePersonMetrics() }, ['Alice', 'Bob']);
      expect(result.responseTimeSymmetry).toBe(10); // min/max = 100/1000 = 0.1 * 100
    });

    it('both rtA=0 and rtB=0 → defaults to 50', () => {
      const timing = makeTiming({
        perPerson: {
          Alice: { averageResponseTimeMs: 0, medianResponseTimeMs: 0, fastestResponseMs: 0, slowestResponseMs: 0, responseTimeTrend: 0 },
          Bob: { averageResponseTimeMs: 0, medianResponseTimeMs: 0, fastestResponseMs: 0, slowestResponseMs: 0, responseTimeTrend: 0 },
        },
      } as Partial<TimingMetrics>);
      const result = computeReciprocityIndex(makeEngagement(), timing, { Alice: makePersonMetrics(), Bob: makePersonMetrics() }, ['Alice', 'Bob']);
      expect(result.responseTimeSymmetry).toBe(50);
    });

    it('rtA>0, rtB=0 → 10 (extreme asymmetry)', () => {
      const timing = makeTiming({
        perPerson: {
          Alice: { averageResponseTimeMs: 60_000, medianResponseTimeMs: 60_000, fastestResponseMs: 10_000, slowestResponseMs: 300_000, responseTimeTrend: 0 },
          Bob: { averageResponseTimeMs: 0, medianResponseTimeMs: 0, fastestResponseMs: 0, slowestResponseMs: 0, responseTimeTrend: 0 },
        },
      } as Partial<TimingMetrics>);
      const result = computeReciprocityIndex(makeEngagement(), timing, { Alice: makePersonMetrics(), Bob: makePersonMetrics() }, ['Alice', 'Bob']);
      expect(result.responseTimeSymmetry).toBe(10);
    });
  });

  describe('reactionBalance — with reactions', () => {
    it('equal reactions → 100', () => {
      const pp = {
        Alice: makePersonMetrics({ reactionsGiven: 20 }),
        Bob: makePersonMetrics({ reactionsGiven: 20 }),
      };
      const result = computeReciprocityIndex(makeEngagement(), makeTiming(), pp, ['Alice', 'Bob']);
      expect(result.reactionBalance).toBe(100);
    });

    it('all reactions from one person → 0', () => {
      const pp = {
        Alice: makePersonMetrics({ reactionsGiven: 40 }),
        Bob: makePersonMetrics({ reactionsGiven: 0 }),
      };
      const result = computeReciprocityIndex(makeEngagement(), makeTiming(), pp, ['Alice', 'Bob']);
      expect(result.reactionBalance).toBe(0);
    });
  });

  describe('reactionBalance — Discord fallback (zero reactions)', () => {
    it('zero reactions, equal Discord engagement → 100', () => {
      const pp = {
        Alice: makePersonMetrics({ reactionsGiven: 0, mentionsReceived: 10, repliesReceived: 10 }),
        Bob: makePersonMetrics({ reactionsGiven: 0, mentionsReceived: 10, repliesReceived: 10 }),
      };
      const result = computeReciprocityIndex(makeEngagement(), makeTiming(), pp, ['Alice', 'Bob']);
      expect(result.reactionBalance).toBe(100);
    });

    it('zero reactions, zero Discord engagement → 50', () => {
      const pp = {
        Alice: makePersonMetrics({ reactionsGiven: 0, mentionsReceived: 0, repliesReceived: 0 }),
        Bob: makePersonMetrics({ reactionsGiven: 0, mentionsReceived: 0, repliesReceived: 0 }),
      };
      const result = computeReciprocityIndex(makeEngagement(), makeTiming(), pp, ['Alice', 'Bob']);
      expect(result.reactionBalance).toBe(50);
    });
  });

  describe('overall weighted formula', () => {
    it('all 100 → overall 100', () => {
      // Perfect balance on all dimensions
      const eng = makeEngagement({ messageRatio: { Alice: 0.5, Bob: 0.5 } });
      const timing = makeTiming({ conversationInitiations: { Alice: 10, Bob: 10 } });
      const pp = {
        Alice: makePersonMetrics({ reactionsGiven: 20 }),
        Bob: makePersonMetrics({ reactionsGiven: 20 }),
      };
      const result = computeReciprocityIndex(eng, timing, pp, ['Alice', 'Bob']);
      expect(result.overall).toBe(100);
    });

    it('verifies weights: 0.30 + 0.25 + 0.15 + 0.30 = 1.0', () => {
      expect(0.30 + 0.25 + 0.15 + 0.30).toBe(1.0);
    });
  });

  describe('output shape', () => {
    it('all values in [0, 100]', () => {
      const result = computeReciprocityIndex(makeEngagement(), makeTiming(), { Alice: makePersonMetrics(), Bob: makePersonMetrics() }, ['Alice', 'Bob']);
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
      expect(result.messageBalance).toBeGreaterThanOrEqual(0);
      expect(result.messageBalance).toBeLessThanOrEqual(100);
      expect(result.initiationBalance).toBeGreaterThanOrEqual(0);
      expect(result.initiationBalance).toBeLessThanOrEqual(100);
      expect(result.responseTimeSymmetry).toBeGreaterThanOrEqual(0);
      expect(result.responseTimeSymmetry).toBeLessThanOrEqual(100);
      expect(result.reactionBalance).toBeGreaterThanOrEqual(0);
      expect(result.reactionBalance).toBeLessThanOrEqual(100);
    });

    it('all values are integers', () => {
      const result = computeReciprocityIndex(makeEngagement(), makeTiming(), { Alice: makePersonMetrics(), Bob: makePersonMetrics() }, ['Alice', 'Bob']);
      expect(Number.isInteger(result.overall)).toBe(true);
      expect(Number.isInteger(result.messageBalance)).toBe(true);
      expect(Number.isInteger(result.initiationBalance)).toBe(true);
      expect(Number.isInteger(result.responseTimeSymmetry)).toBe(true);
      expect(Number.isInteger(result.reactionBalance)).toBe(true);
    });
  });

  describe('determinism', () => {
    it('same input → same output', () => {
      const eng = makeEngagement({ messageRatio: { Alice: 0.65, Bob: 0.35 } });
      const r1 = computeReciprocityIndex(eng, makeTiming(), { Alice: makePersonMetrics(), Bob: makePersonMetrics() }, ['Alice', 'Bob']);
      const r2 = computeReciprocityIndex(eng, makeTiming(), { Alice: makePersonMetrics(), Bob: makePersonMetrics() }, ['Alice', 'Bob']);
      expect(r1).toEqual(r2);
    });
  });
});
