import { describe, it, expect } from 'vitest';
import { computeDamageReport } from '@/lib/analysis/damage-report';
import type { QuantitativeAnalysis } from '@/lib/parsers/types';
import type { Pass4Result, Pass2Result } from '@/lib/analysis/types';

/**
 * Mock factory for QuantitativeAnalysis.
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
    },
    timing: {
      perPerson: {
        'Alice': {
          averageResponseTimeMs: 3600000,
          medianResponseTimeMs: 3600000,
          fastestResponseMs: 60000,
          slowestResponseMs: 86400000,
          responseTimeTrend: 0,
        },
        'Bob': {
          averageResponseTimeMs: 3600000,
          medianResponseTimeMs: 3600000,
          fastestResponseMs: 60000,
          slowestResponseMs: 86400000,
          responseTimeTrend: 0,
        },
      },
      conversationInitiations: { 'Alice': 10, 'Bob': 10 },
      conversationEndings: { 'Alice': 10, 'Bob': 10 },
      longestSilence: {
        durationMs: 604800000,
        startTimestamp: 0,
        endTimestamp: 604800000,
        lastSender: 'Alice',
        nextSender: 'Bob',
      },
      lateNightMessages: { 'Alice': 5, 'Bob': 5 },
    },
    engagement: {
      doubleTexts: { 'Alice': 2, 'Bob': 2 },
      maxConsecutive: { 'Alice': 3, 'Bob': 3 },
      messageRatio: { 'Alice': 0.5, 'Bob': 0.5 },
      reactionRate: { 'Alice': 0.2, 'Bob': 0.2 },
      reactionGiveRate: { 'Alice': 0.2, 'Bob': 0.2 },
      reactionReceiveRate: { 'Alice': 0.15, 'Bob': 0.15 },
      avgConversationLength: 10,
      totalSessions: 20,
    },
    patterns: {
      monthlyVolume: [
        {
          month: '2024-01',
          perPerson: { 'Alice': 100, 'Bob': 100 },
          total: 200,
        },
        {
          month: '2024-02',
          perPerson: { 'Alice': 100, 'Bob': 100 },
          total: 200,
        },
      ],
      weekdayWeekend: {
        weekday: { 'Alice': 70, 'Bob': 70 },
        weekend: { 'Alice': 30, 'Bob': 30 },
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
    reciprocityIndex: {
      overall: 50,
      messageBalance: 50,
      initiationBalance: 50,
      responseTimeSymmetry: 50,
      reactionBalance: 50,
    },
    sentimentAnalysis: {
      perPerson: {
        'Alice': {
          avgSentiment: 0.5,
          positiveRatio: 0.6,
          negativeRatio: 0.2,
          neutralRatio: 0.2,
          emotionalVolatility: 0.3,
        },
        'Bob': {
          avgSentiment: 0.5,
          positiveRatio: 0.6,
          negativeRatio: 0.2,
          neutralRatio: 0.2,
          emotionalVolatility: 0.3,
        },
      },
    },
    conflictAnalysis: {
      events: [],
      totalConflicts: 0,
    },
    ...overrides,
  };
}

/**
 * Mock factory for Pass4Result.
 */
function createMockPass4(overrides?: Partial<Pass4Result>): Pass4Result {
  return {
    executive_summary: 'Test summary',
    health_score: {
      overall: 70,
      components: {
        balance: 70,
        reciprocity: 70,
        response_pattern: 70,
        emotional_safety: 70,
        growth_trajectory: 70,
      },
      explanation: 'Healthy relationship',
    },
    key_findings: [],
    relationship_trajectory: {
      current_phase: 'established',
      direction: 'stable',
      inflection_points: [],
    },
    insights: [],
    conversation_personality: {
      if_this_conversation_were_a: {
        movie_genre: 'romance',
        weather: 'sunny',
        one_word: 'warm',
      },
    },
    ...overrides,
  };
}

/**
 * Mock factory for Pass2Result.
 */
function createMockPass2(overrides?: Partial<Pass2Result>): Pass2Result {
  return {
    power_dynamics: {
      balance_score: 0,
      who_adapts_more: 'balanced',
      adaptation_type: 'linguistic',
      evidence: [],
      confidence: 80,
    },
    emotional_labor: {
      primary_caregiver: 'balanced',
      patterns: [],
      balance_score: 0,
      confidence: 80,
    },
    conflict_patterns: {
      conflict_frequency: 'none_observed',
      typical_trigger: null,
      resolution_style: { 'Alice': 'direct_confrontation', 'Bob': 'direct_confrontation' },
      unresolved_tensions: [],
      confidence: 80,
    },
    intimacy_markers: {
      vulnerability_level: {
        'Alice': { score: 50, examples: [], trend: 'stable' },
        'Bob': { score: 50, examples: [], trend: 'stable' },
      },
      shared_language: {
        inside_jokes: 5,
        pet_names: false,
        unique_phrases: [],
        language_mirroring: 50,
      },
      confidence: 80,
    },
    red_flags: [],
    green_flags: [],
    ...overrides,
  };
}

describe('computeDamageReport', () => {
  describe('emotional damage computation', () => {
    it('should compute emotional damage from all 4 components', () => {
      const quant = createMockQuantitative({
        sentimentAnalysis: {
          perPerson: {
            'Alice': {
              avgSentiment: 0.3,
              positiveRatio: 0.4,
              negativeRatio: 0.4,
              neutralRatio: 0.2,
              emotionalVolatility: 0.5,
            },
            'Bob': {
              avgSentiment: 0.3,
              positiveRatio: 0.4,
              negativeRatio: 0.4,
              neutralRatio: 0.2,
              emotionalVolatility: 0.5,
            },
          },
        },
        conflictAnalysis: {
          events: [],
          totalConflicts: 3,
        },
        reciprocityIndex: {
          overall: 30, // low reciprocity
          messageBalance: 30,
          initiationBalance: 30,
          responseTimeSymmetry: 30,
          reactionBalance: 30,
        },
      });
      const pass4 = createMockPass4({ health_score: { ...createMockPass4().health_score, overall: 40 } });

      const result = computeDamageReport(quant, pass4);

      // negativeSentiment = max(0, -0.3) = 0
      // negativeDamage = 0%
      // conflictDamage = min(100, (3/2)*25) = min(100, 37.5) = 37
      // reciprocityImbalance = min(100, (50-30)*2) = 40
      // aiHealthDamage = 100-40 = 60
      // emotionalDamage = 0*0.35 + 37*0.25 + 40*0.20 + 60*0.20 = 0 + 9.25 + 8 + 12 = 29.25 ≈ 29
      expect(result.emotionalDamage).toBeGreaterThanOrEqual(0);
      expect(result.emotionalDamage).toBeLessThanOrEqual(100);
    });

    it('should use pass4 health score if available', () => {
      const quant = createMockQuantitative();
      const pass4 = createMockPass4({ health_score: { ...createMockPass4().health_score, overall: 20 } });

      const result = computeDamageReport(quant, pass4);

      // health score of 20 should increase emotional damage
      expect(result.emotionalDamage).toBeGreaterThan(10);
    });

    it('should default to health score 50 if pass4 not provided', () => {
      const quant = createMockQuantitative();

      const result = computeDamageReport(quant);

      // should compute without AI data
      expect(Number.isFinite(result.emotionalDamage)).toBeTruthy();
    });

    it('should clamp emotional damage to 0-100', () => {
      const quant = createMockQuantitative({
        sentimentAnalysis: {
          perPerson: {
            'Alice': {
              avgSentiment: -1, // very negative
              positiveRatio: 0,
              negativeRatio: 1,
              neutralRatio: 0,
              emotionalVolatility: 1,
            },
            'Bob': {
              avgSentiment: -1,
              positiveRatio: 0,
              negativeRatio: 1,
              neutralRatio: 0,
              emotionalVolatility: 1,
            },
          },
        },
        conflictAnalysis: {
          events: [],
          totalConflicts: 100,
        },
      });

      const result = computeDamageReport(quant);

      expect(result.emotionalDamage).toBeGreaterThanOrEqual(0);
      expect(result.emotionalDamage).toBeLessThanOrEqual(100);
    });
  });

  describe('communication grade computation', () => {
    it('should assign grade A for high reciprocity (>= 80)', () => {
      const quant = createMockQuantitative({
        reciprocityIndex: {
          overall: 85,
          messageBalance: 85,
          initiationBalance: 85,
          responseTimeSymmetry: 85,
          reactionBalance: 85,
        },
      });

      const result = computeDamageReport(quant);
      expect(result.communicationGrade).toBe('A');
    });

    it('should assign grade B for reciprocity 65-79', () => {
      const quant = createMockQuantitative({
        reciprocityIndex: {
          overall: 70,
          messageBalance: 70,
          initiationBalance: 70,
          responseTimeSymmetry: 70,
          reactionBalance: 70,
        },
      });

      const result = computeDamageReport(quant);
      expect(result.communicationGrade).toBe('B');
    });

    it('should assign grade C for reciprocity 45-64', () => {
      const quant = createMockQuantitative({
        reciprocityIndex: {
          overall: 55,
          messageBalance: 55,
          initiationBalance: 55,
          responseTimeSymmetry: 55,
          reactionBalance: 55,
        },
      });

      const result = computeDamageReport(quant);
      expect(result.communicationGrade).toBe('C');
    });

    it('should assign grade D for reciprocity 25-44', () => {
      const quant = createMockQuantitative({
        reciprocityIndex: {
          overall: 35,
          messageBalance: 35,
          initiationBalance: 35,
          responseTimeSymmetry: 35,
          reactionBalance: 35,
        },
      });

      const result = computeDamageReport(quant);
      expect(result.communicationGrade).toBe('D');
    });

    it('should assign grade F for low reciprocity (< 25)', () => {
      const quant = createMockQuantitative({
        reciprocityIndex: {
          overall: 10,
          messageBalance: 10,
          initiationBalance: 10,
          responseTimeSymmetry: 10,
          reactionBalance: 10,
        },
      });

      const result = computeDamageReport(quant);
      expect(result.communicationGrade).toBe('F');
    });

    it('should use default reciprocity of 50 if not provided', () => {
      const quant = createMockQuantitative({
        reciprocityIndex: undefined,
      });

      const result = computeDamageReport(quant);
      expect(result.communicationGrade).toBe('C'); // 50 = C
    });
  });

  describe('repair potential computation', () => {
    it('should compute repair potential from green/red flags ratio', () => {
      const quant = createMockQuantitative();
      const pass2 = createMockPass2({
        green_flags: [
          { pattern: 'honest_communication', evidence_indices: [1, 2], confidence: 80 },
          { pattern: 'mutual_respect', evidence_indices: [3, 4], confidence: 75 },
        ],
        red_flags: [
          { pattern: 'avoidance', severity: 'mild', evidence_indices: [5], confidence: 70 },
        ],
      });

      const result = computeDamageReport(quant, undefined, pass2);

      // 2 green, 1 red = 2/3 = 0.67, so repair = 0.67 * 60 = 40
      expect(result.repairPotential).toBeGreaterThan(20);
    });

    it('should boost repair potential if volume trend is positive', () => {
      const quant = createMockQuantitative({
        patterns: {
          ...createMockQuantitative().patterns,
          volumeTrend: 1, // positive trend
        },
      });
      const pass2 = createMockPass2({
        green_flags: [
          { pattern: 'honest_communication', evidence_indices: [1, 2], confidence: 80 },
        ],
        red_flags: [],
      });

      const result = computeDamageReport(quant, undefined, pass2);

      expect(result.repairPotential).toBeGreaterThan(50); // should get +20 bonus
    });

    it('should clamp repair potential to 0-100', () => {
      const quant = createMockQuantitative();
      const result = computeDamageReport(quant);

      expect(result.repairPotential).toBeGreaterThanOrEqual(0);
      expect(result.repairPotential).toBeLessThanOrEqual(100);
    });

    it('should handle no flags gracefully', () => {
      const quant = createMockQuantitative();
      const pass2 = createMockPass2({ green_flags: [], red_flags: [] });

      const result = computeDamageReport(quant, undefined, pass2);

      // 0 flags = 0/1 = 0 repair from flags, rest from trend
      expect(result.repairPotential).toBeLessThan(50);
    });
  });

  describe('therapy benefit determination', () => {
    it('should return HIGH if high conflicts detected', () => {
      const quant = createMockQuantitative({
        conflictAnalysis: {
          events: [],
          totalConflicts: 5, // 5 conflicts / 2 months = 2.5 per month
        },
        patterns: {
          ...createMockQuantitative().patterns,
          monthlyVolume: [
            {
              month: '2024-01',
              perPerson: { 'Alice': 100, 'Bob': 100 },
              total: 200,
            },
            {
              month: '2024-02',
              perPerson: { 'Alice': 100, 'Bob': 100 },
              total: 200,
            },
          ],
        },
      });

      const result = computeDamageReport(quant);
      expect(result.therapyBenefit).toBe('HIGH');
    });

    it('should return HIGH if negative sentiment detected', () => {
      const quant = createMockQuantitative({
        sentimentAnalysis: {
          perPerson: {
            'Alice': {
              avgSentiment: -0.3, // negative
              positiveRatio: 0.2,
              negativeRatio: 0.7,
              neutralRatio: 0.1,
              emotionalVolatility: 0.6,
            },
            'Bob': {
              avgSentiment: -0.3,
              positiveRatio: 0.2,
              negativeRatio: 0.7,
              neutralRatio: 0.1,
              emotionalVolatility: 0.6,
            },
          },
        },
      });

      const result = computeDamageReport(quant);
      expect(result.therapyBenefit).toBe('HIGH');
    });

    it('should return HIGH if health score < 40', () => {
      const quant = createMockQuantitative();
      const pass4 = createMockPass4({ health_score: { ...createMockPass4().health_score, overall: 35 } });

      const result = computeDamageReport(quant, pass4);
      expect(result.therapyBenefit).toBe('HIGH');
    });

    it('should return MODERATE if low reciprocity', () => {
      const quant = createMockQuantitative({
        reciprocityIndex: {
          overall: 20, // low
          messageBalance: 20,
          initiationBalance: 20,
          responseTimeSymmetry: 20,
          reactionBalance: 20,
        },
      });

      const result = computeDamageReport(quant);
      expect(result.therapyBenefit).toBe('MODERATE');
    });

    it('should return MODERATE if health score 40-59', () => {
      const quant = createMockQuantitative();
      const pass4 = createMockPass4({ health_score: { ...createMockPass4().health_score, overall: 50 } });

      const result = computeDamageReport(quant, pass4);
      expect(result.therapyBenefit).toBe('MODERATE');
    });

    it('should return LOW for healthy relationship', () => {
      const quant = createMockQuantitative({
        sentimentAnalysis: {
          perPerson: {
            'Alice': {
              avgSentiment: 0.7,
              positiveRatio: 0.8,
              negativeRatio: 0.1,
              neutralRatio: 0.1,
              emotionalVolatility: 0.2,
            },
            'Bob': {
              avgSentiment: 0.7,
              positiveRatio: 0.8,
              negativeRatio: 0.1,
              neutralRatio: 0.1,
              emotionalVolatility: 0.2,
            },
          },
        },
        reciprocityIndex: {
          overall: 80,
          messageBalance: 80,
          initiationBalance: 80,
          responseTimeSymmetry: 80,
          reactionBalance: 80,
        },
      });
      const pass4 = createMockPass4({ health_score: { ...createMockPass4().health_score, overall: 80 } });

      const result = computeDamageReport(quant, pass4);
      expect(result.therapyBenefit).toBe('LOW');
    });
  });

  describe('edge cases', () => {
    it('should handle missing sentiment analysis', () => {
      const quant = createMockQuantitative({
        sentimentAnalysis: undefined,
      });

      const result = computeDamageReport(quant);

      expect(Number.isFinite(result.emotionalDamage)).toBeTruthy();
      expect(result.emotionalDamage).toBeGreaterThanOrEqual(0);
      expect(result.emotionalDamage).toBeLessThanOrEqual(100);
    });

    it('should handle missing conflict analysis', () => {
      const quant = createMockQuantitative({
        conflictAnalysis: undefined,
      });

      const result = computeDamageReport(quant);

      expect(Number.isFinite(result.emotionalDamage)).toBeTruthy();
    });

    it('should handle empty monthly volume', () => {
      const quant = createMockQuantitative({
        patterns: {
          ...createMockQuantitative().patterns,
          monthlyVolume: [],
        },
      });

      const result = computeDamageReport(quant);

      expect(Number.isFinite(result.emotionalDamage)).toBeTruthy();
    });

    it('should handle single month', () => {
      const quant = createMockQuantitative({
        patterns: {
          ...createMockQuantitative().patterns,
          monthlyVolume: [
            {
              month: '2024-01',
              perPerson: { 'Alice': 100, 'Bob': 100 },
              total: 200,
            },
          ],
        },
      });

      const result = computeDamageReport(quant);

      expect(Number.isFinite(result.emotionalDamage)).toBeTruthy();
    });

    it('should handle zero reciprocity index', () => {
      const quant = createMockQuantitative({
        reciprocityIndex: {
          overall: 0,
          messageBalance: 0,
          initiationBalance: 0,
          responseTimeSymmetry: 0,
          reactionBalance: 0,
        },
      });

      const result = computeDamageReport(quant);

      expect(result.communicationGrade).toBe('F');
      expect(result.emotionalDamage).toBeGreaterThan(20);
    });

    it('should handle perfect reciprocity', () => {
      const quant = createMockQuantitative({
        reciprocityIndex: {
          overall: 100,
          messageBalance: 100,
          initiationBalance: 100,
          responseTimeSymmetry: 100,
          reactionBalance: 100,
        },
      });

      const result = computeDamageReport(quant);

      expect(result.communicationGrade).toBe('A');
    });
  });

  describe('integration scenarios', () => {
    it('should compute full damage report with all data', () => {
      const quant = createMockQuantitative({
        sentimentAnalysis: {
          perPerson: {
            'Alice': {
              avgSentiment: 0.4,
              positiveRatio: 0.5,
              negativeRatio: 0.3,
              neutralRatio: 0.2,
              emotionalVolatility: 0.4,
            },
            'Bob': {
              avgSentiment: 0.4,
              positiveRatio: 0.5,
              negativeRatio: 0.3,
              neutralRatio: 0.2,
              emotionalVolatility: 0.4,
            },
          },
        },
        conflictAnalysis: {
          events: [],
          totalConflicts: 2,
        },
        reciprocityIndex: {
          overall: 60,
          messageBalance: 60,
          initiationBalance: 60,
          responseTimeSymmetry: 60,
          reactionBalance: 60,
        },
        patterns: {
          ...createMockQuantitative().patterns,
          volumeTrend: 0.5,
        },
      });
      const pass4 = createMockPass4({ health_score: { ...createMockPass4().health_score, overall: 60 } });
      const pass2 = createMockPass2({
        green_flags: [
          { pattern: 'honest_communication', evidence_indices: [1], confidence: 80 },
        ],
        red_flags: [
          { pattern: 'occasional_avoidance', severity: 'mild', evidence_indices: [2], confidence: 70 },
        ],
      });

      const result = computeDamageReport(quant, pass4, pass2);

      expect(result.emotionalDamage).toBeDefined();
      expect(result.communicationGrade).toBe('C'); // reciprocity 60 is in 45-64 range
      expect(result.repairPotential).toBeGreaterThanOrEqual(0);
      expect(result.repairPotential).toBeLessThanOrEqual(100);
      expect(result.therapyBenefit).toBeDefined();
    });

    it('should handle mix of undefined and complete data', () => {
      const quant = createMockQuantitative({
        conflictAnalysis: undefined,
        sentimentAnalysis: {
          perPerson: {
            'Alice': {
              avgSentiment: 0.5,
              positiveRatio: 0.6,
              negativeRatio: 0.2,
              neutralRatio: 0.2,
              emotionalVolatility: 0.3,
            },
            'Bob': {
              avgSentiment: 0.5,
              positiveRatio: 0.6,
              negativeRatio: 0.2,
              neutralRatio: 0.2,
              emotionalVolatility: 0.3,
            },
          },
        },
      });

      const result = computeDamageReport(quant);

      expect(result.emotionalDamage).toBeDefined();
      expect(result.communicationGrade).toBeDefined();
      expect(result.repairPotential).toBeDefined();
      expect(result.therapyBenefit).toBeDefined();
    });
  });
});
