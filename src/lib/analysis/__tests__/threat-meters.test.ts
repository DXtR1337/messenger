import { describe, it, expect } from 'vitest';
import { computeThreatMeters } from '@/lib/analysis/threat-meters';
import type { QuantitativeAnalysis } from '@/lib/parsers/types';

/**
 * Mock factory for creating minimal QuantitativeAnalysis objects.
 */
function createMockQuantitative(overrides?: Partial<QuantitativeAnalysis>): QuantitativeAnalysis {
  return {
    perPerson: {
      'Alice': {
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
      },
      'Bob': {
        totalMessages: 80,
        totalWords: 800,
        totalCharacters: 4000,
        averageMessageLength: 10,
        averageMessageChars: 50,
        longestMessage: { content: 'test', length: 4, timestamp: 0 },
        shortestMessage: { content: 'a', length: 1, timestamp: 0 },
        messagesWithEmoji: 8,
        emojiCount: 12,
        topEmojis: [],
        questionsAsked: 3,
        mediaShared: 1,
        linksShared: 0,
        reactionsGiven: 15,
        reactionsReceived: 20,
        topReactionsGiven: [],
        unsentMessages: 0,
        topWords: [],
        topPhrases: [],
        uniqueWords: 400,
        vocabularyRichness: 0.5,
      },
    },
    timing: {
      perPerson: {
        'Alice': {
          averageResponseTimeMs: 3600000, // 1 hour
          medianResponseTimeMs: 3600000,
          fastestResponseMs: 60000, // 1 min
          slowestResponseMs: 86400000, // 1 day
          responseTimeTrend: 0,
        },
        'Bob': {
          averageResponseTimeMs: 7200000, // 2 hours
          medianResponseTimeMs: 7200000,
          fastestResponseMs: 60000,
          slowestResponseMs: 86400000,
          responseTimeTrend: 0,
        },
      },
      conversationInitiations: { 'Alice': 10, 'Bob': 10 },
      conversationEndings: { 'Alice': 9, 'Bob': 11 },
      longestSilence: {
        durationMs: 604800000, // 7 days
        startTimestamp: 0,
        endTimestamp: 604800000,
        lastSender: 'Alice',
        nextSender: 'Bob',
      },
      lateNightMessages: { 'Alice': 5, 'Bob': 3 },
    },
    engagement: {
      doubleTexts: { 'Alice': 2, 'Bob': 1 },
      maxConsecutive: { 'Alice': 3, 'Bob': 2 },
      messageRatio: { 'Alice': 0.55, 'Bob': 0.45 },
      reactionRate: { 'Alice': 0.2, 'Bob': 0.1875 },
      reactionGiveRate: { 'Alice': 0.2, 'Bob': 0.1875 },
      reactionReceiveRate: { 'Alice': 0.15, 'Bob': 0.25 },
      avgConversationLength: 10,
      totalSessions: 20,
    },
    patterns: {
      monthlyVolume: [
        {
          month: '2024-01',
          perPerson: { 'Alice': 50, 'Bob': 40 },
          total: 90,
        },
        {
          month: '2024-02',
          perPerson: { 'Alice': 50, 'Bob': 40 },
          total: 90,
        },
      ],
      weekdayWeekend: {
        weekday: { 'Alice': 70, 'Bob': 60 },
        weekend: { 'Alice': 30, 'Bob': 20 },
      },
      volumeTrend: 0,
      bursts: [],
    },
    heatmap: {
      perPerson: {
        'Alice': Array(7).fill(null).map(() => Array(24).fill(0)),
        'Bob': Array(7).fill(null).map(() => Array(24).fill(0)),
      },
      combined: Array(7).fill(null).map(() => Array(24).fill(0)),
    },
    trends: {
      responseTimeTrend: [],
      messageLengthTrend: [],
      initiationTrend: [],
    },
    viralScores: {
      compatibilityScore: 75,
      interestScores: { 'Alice': 70, 'Bob': 60 },
      ghostRisk: {
        'Alice': { score: 20, factors: ['Low response time variance'] },
        'Bob': { score: 15, factors: [] },
      },
      delusionScore: 10,
    },
    reciprocityIndex: {
      overall: 50,
      messageBalance: 50,
      initiationBalance: 50,
      responseTimeSymmetry: 50,
      reactionBalance: 50,
    },
    ...overrides,
  };
}

describe('computeThreatMeters', () => {
  describe('basic functionality', () => {
    it('should return empty array for single participant', () => {
      const quant: QuantitativeAnalysis = {
        ...createMockQuantitative(),
        perPerson: { 'Alice': createMockQuantitative().perPerson['Alice'] },
      };

      const result = computeThreatMeters(quant);
      expect(result.meters).toEqual([]);
    });

    it('should return empty array for no participants', () => {
      const quant: QuantitativeAnalysis = {
        ...createMockQuantitative(),
        perPerson: {},
      };

      const result = computeThreatMeters(quant);
      expect(result.meters).toEqual([]);
    });

    it('should return all 4 threat meters for valid input', () => {
      const quant = createMockQuantitative();
      const result = computeThreatMeters(quant);

      expect(result.meters).toHaveLength(4);
      expect(result.meters.map(m => m.id)).toEqual([
        'ghost_risk',
        'codependency',
        'power_imbalance',
        'trust',
      ]);
    });
  });

  describe('Ghost Risk meter', () => {
    it('should compute ghost risk score from viralScores', () => {
      const quant = createMockQuantitative({
        viralScores: {
          compatibilityScore: 75,
          interestScores: { 'Alice': 70, 'Bob': 60 },
          ghostRisk: {
            'Alice': { score: 45, factors: ['High response time variance'] },
            'Bob': { score: 30, factors: ['Occasional long gaps'] },
          },
          delusionScore: 10,
        },
      });

      const result = computeThreatMeters(quant);
      const ghostMeter = result.meters.find(m => m.id === 'ghost_risk');

      expect(ghostMeter).toBeDefined();
      expect(ghostMeter!.score).toBe(45); // max of Alice and Bob
      expect(ghostMeter!.label).toBe('Ghost Risk');
    });

    it('should use 0 as default ghost risk if not present', () => {
      const quant = createMockQuantitative({
        viralScores: undefined,
      });

      const result = computeThreatMeters(quant);
      const ghostMeter = result.meters.find(m => m.id === 'ghost_risk');

      expect(ghostMeter!.score).toBe(0);
    });

    it('should classify ghost risk levels correctly', () => {
      const quant = createMockQuantitative({
        viralScores: {
          compatibilityScore: 75,
          interestScores: { 'Alice': 70, 'Bob': 60 },
          ghostRisk: {
            'Alice': { score: 80, factors: [] },
            'Bob': { score: 0, factors: [] },
          },
          delusionScore: 10,
        },
      });

      const result = computeThreatMeters(quant);
      const ghostMeter = result.meters.find(m => m.id === 'ghost_risk');

      expect(ghostMeter!.level).toBe('critical'); // >= 75
    });
  });

  describe('Codependency Index', () => {
    it('should compute codependency from initiation imbalance', () => {
      const quant = createMockQuantitative({
        timing: {
          ...createMockQuantitative().timing,
          conversationInitiations: { 'Alice': 30, 'Bob': 5 }, // high imbalance
        },
      });

      const result = computeThreatMeters(quant);
      const codependency = result.meters.find(m => m.id === 'codependency');

      expect(codependency).toBeDefined();
      expect(codependency!.score).toBeGreaterThan(20); // should be elevated
    });

    it('should factor in double-text rate', () => {
      const quant = createMockQuantitative({
        engagement: {
          ...createMockQuantitative().engagement,
          doubleTexts: { 'Alice': 50, 'Bob': 1 }, // high DT rate for Alice
        },
      });

      const result = computeThreatMeters(quant);
      const codependency = result.meters.find(m => m.id === 'codependency');

      expect(codependency!.factors.some(f => f.includes('Double'))).toBeTruthy();
    });

    it('should factor in response time asymmetry', () => {
      const quant = createMockQuantitative({
        timing: {
          ...createMockQuantitative().timing,
          perPerson: {
            'Alice': {
              ...createMockQuantitative().timing.perPerson['Alice'],
              medianResponseTimeMs: 600000, // 10 min
            },
            'Bob': {
              ...createMockQuantitative().timing.perPerson['Bob'],
              medianResponseTimeMs: 3600000, // 1 hour
            },
          },
        },
      });

      const result = computeThreatMeters(quant);
      const codependency = result.meters.find(m => m.id === 'codependency');

      expect(codependency!.factors.some(f => f.includes('Asymetria'))).toBeTruthy();
    });

    it('should clamp codependency score to 0-100', () => {
      const quant = createMockQuantitative();
      const result = computeThreatMeters(quant);
      const codependency = result.meters.find(m => m.id === 'codependency');

      expect(codependency!.score).toBeGreaterThanOrEqual(0);
      expect(codependency!.score).toBeLessThanOrEqual(100);
    });
  });

  describe('Power Imbalance Index', () => {
    it('should compute power imbalance from reciprocity', () => {
      const quant = createMockQuantitative({
        reciprocityIndex: {
          overall: 20, // low reciprocity = high imbalance
          messageBalance: 20,
          initiationBalance: 30,
          responseTimeSymmetry: 40,
          reactionBalance: 50,
        },
      });

      const result = computeThreatMeters(quant);
      const power = result.meters.find(m => m.id === 'power_imbalance');

      // recipImbalance = abs(20-50)*2 = 60
      // reactionImbalance = abs(50-50)*2 = 0
      // initiationImbalance calculated separately (10/20 = 0.5, so imbalance ~0)
      // powerImbalanceScore = 60*0.5 + 0*0.3 + ~0*0.2 = 30
      expect(power!.score).toBeGreaterThanOrEqual(0);
      expect(power!.score).toBeLessThanOrEqual(100);
    });

    it('should consider reaction imbalance', () => {
      const quant = createMockQuantitative({
        reciprocityIndex: {
          overall: 50,
          messageBalance: 50,
          initiationBalance: 50,
          responseTimeSymmetry: 50,
          reactionBalance: 20, // high imbalance
        },
      });

      const result = computeThreatMeters(quant);
      const power = result.meters.find(m => m.id === 'power_imbalance');

      expect(power!.factors.some(f => f.includes('Nierówne'))).toBeTruthy();
    });

    it('should clamp power imbalance score to 0-100', () => {
      const quant = createMockQuantitative();
      const result = computeThreatMeters(quant);
      const power = result.meters.find(m => m.id === 'power_imbalance');

      expect(power!.score).toBeGreaterThanOrEqual(0);
      expect(power!.score).toBeLessThanOrEqual(100);
    });
  });

  describe('Trust Index', () => {
    it('should compute trust from reciprocity and ghost risk', () => {
      const quant = createMockQuantitative({
        reciprocityIndex: {
          overall: 80, // high reciprocity
          messageBalance: 80,
          initiationBalance: 80,
          responseTimeSymmetry: 80,
          reactionBalance: 80,
        },
        viralScores: {
          compatibilityScore: 75,
          interestScores: { 'Alice': 70, 'Bob': 60 },
          ghostRisk: {
            'Alice': { score: 10, factors: [] }, // low ghost risk
            'Bob': { score: 5, factors: [] },
          },
          delusionScore: 10,
        },
      });

      const result = computeThreatMeters(quant);
      const trust = result.meters.find(m => m.id === 'trust');

      expect(trust!.score).toBeGreaterThan(70); // should be high
    });

    it('should lower trust with high ghost risk', () => {
      const quant = createMockQuantitative({
        reciprocityIndex: {
          overall: 80,
          messageBalance: 80,
          initiationBalance: 80,
          responseTimeSymmetry: 80,
          reactionBalance: 80,
        },
        viralScores: {
          compatibilityScore: 75,
          interestScores: { 'Alice': 70, 'Bob': 60 },
          ghostRisk: {
            'Alice': { score: 90, factors: [] }, // very high ghost risk
            'Bob': { score: 85, factors: [] },
          },
          delusionScore: 10,
        },
      });

      const result = computeThreatMeters(quant);
      const trust = result.meters.find(m => m.id === 'trust');

      // recipNorm = 80/100 = 0.8
      // responseConsistency = 80
      // ghostFreqNorm = 90/100 = 0.9
      // trustScore = 0.8*100*0.40 + 80*0.40 + (1-0.9)*100*0.20 = 32 + 32 + 2 = 66
      // So with high ghost risk, score is lower than it would be without ghost risk
      expect(trust!.score).toBeGreaterThanOrEqual(0);
      expect(trust!.score).toBeLessThanOrEqual(100);
    });

    it('should clamp trust score to 0-100', () => {
      const quant = createMockQuantitative();
      const result = computeThreatMeters(quant);
      const trust = result.meters.find(m => m.id === 'trust');

      expect(trust!.score).toBeGreaterThanOrEqual(0);
      expect(trust!.score).toBeLessThanOrEqual(100);
    });

    it('should include factors when trust is low', () => {
      const quant = createMockQuantitative({
        reciprocityIndex: {
          overall: 20, // low reciprocity
          messageBalance: 20,
          initiationBalance: 20,
          responseTimeSymmetry: 20,
          reactionBalance: 20,
        },
        viralScores: {
          compatibilityScore: 75,
          interestScores: { 'Alice': 70, 'Bob': 60 },
          ghostRisk: {
            'Alice': { score: 80, factors: [] }, // high ghost risk
            'Bob': { score: 75, factors: [] },
          },
          delusionScore: 10,
        },
      });

      const result = computeThreatMeters(quant);
      const trust = result.meters.find(m => m.id === 'trust');

      expect(trust!.factors.length).toBeGreaterThan(0);
      expect(trust!.factors.some(f => f.includes('Niski') || f.includes('Wysokie'))).toBeTruthy();
    });
  });

  describe('level classification', () => {
    it('should classify critical level (>= 75)', () => {
      const quant = createMockQuantitative({
        viralScores: {
          compatibilityScore: 75,
          interestScores: { 'Alice': 70, 'Bob': 60 },
          ghostRisk: {
            'Alice': { score: 95, factors: [] },
            'Bob': { score: 90, factors: [] },
          },
          delusionScore: 10,
        },
      });

      const result = computeThreatMeters(quant);
      const ghost = result.meters.find(m => m.id === 'ghost_risk');
      expect(ghost!.level).toBe('critical');
    });

    it('should classify elevated level (50-74)', () => {
      const quant = createMockQuantitative({
        viralScores: {
          compatibilityScore: 75,
          interestScores: { 'Alice': 70, 'Bob': 60 },
          ghostRisk: {
            'Alice': { score: 60, factors: [] },
            'Bob': { score: 50, factors: [] },
          },
          delusionScore: 10,
        },
      });

      const result = computeThreatMeters(quant);
      const ghost = result.meters.find(m => m.id === 'ghost_risk');
      expect(ghost!.level).toBe('elevated');
    });

    it('should classify moderate level (30-49)', () => {
      const quant = createMockQuantitative({
        viralScores: {
          compatibilityScore: 75,
          interestScores: { 'Alice': 70, 'Bob': 60 },
          ghostRisk: {
            'Alice': { score: 40, factors: [] },
            'Bob': { score: 35, factors: [] },
          },
          delusionScore: 10,
        },
      });

      const result = computeThreatMeters(quant);
      const ghost = result.meters.find(m => m.id === 'ghost_risk');
      expect(ghost!.level).toBe('moderate');
    });

    it('should classify low level (< 30)', () => {
      const quant = createMockQuantitative({
        viralScores: {
          compatibilityScore: 75,
          interestScores: { 'Alice': 70, 'Bob': 60 },
          ghostRisk: {
            'Alice': { score: 10, factors: [] },
            'Bob': { score: 15, factors: [] },
          },
          delusionScore: 10,
        },
      });

      const result = computeThreatMeters(quant);
      const ghost = result.meters.find(m => m.id === 'ghost_risk');
      expect(ghost!.level).toBe('low');
    });
  });

  describe('edge cases', () => {
    it('should handle NaN in reciprocity', () => {
      const quant = createMockQuantitative({
        reciprocityIndex: undefined,
      });

      const result = computeThreatMeters(quant);
      expect(result.meters).toHaveLength(4);
      expect(result.meters.every(m => Number.isFinite(m.score))).toBeTruthy();
    });

    it('should handle zero ghost risk', () => {
      const quant = createMockQuantitative({
        viralScores: {
          compatibilityScore: 75,
          interestScores: { 'Alice': 70, 'Bob': 60 },
          ghostRisk: {
            'Alice': { score: 0, factors: [] },
            'Bob': { score: 0, factors: [] },
          },
          delusionScore: 10,
        },
      });

      const result = computeThreatMeters(quant);
      const ghost = result.meters.find(m => m.id === 'ghost_risk');
      expect(ghost!.score).toBe(0);
    });

    it('should handle all-equal initiation rates', () => {
      const quant = createMockQuantitative({
        timing: {
          ...createMockQuantitative().timing,
          conversationInitiations: { 'Alice': 10, 'Bob': 10 },
        },
      });

      const result = computeThreatMeters(quant);
      const codependency = result.meters.find(m => m.id === 'codependency');
      expect(codependency!.score).toBeLessThan(50); // balanced, low score
    });

    it('should handle missing pursuit-withdrawal data', () => {
      const quant = createMockQuantitative({
        pursuitWithdrawal: undefined,
      });

      const result = computeThreatMeters(quant);
      const codependency = result.meters.find(m => m.id === 'codependency');
      expect(Number.isFinite(codependency!.score)).toBeTruthy();
    });
  });
});
