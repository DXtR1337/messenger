import { describe, it, expect } from 'vitest';
import { computeChronotypeCompatibility } from '@/lib/analysis/quant/chronotype';
import type { UnifiedMessage } from '@/lib/parsers/types';

/**
 * Mock helper to create UnifiedMessage with common defaults
 */
function createMessage(
  override: Partial<UnifiedMessage>
): UnifiedMessage {
  return {
    index: 0,
    sender: 'Alice',
    content: 'test',
    timestamp: Date.now(),
    type: 'text',
    reactions: [],
    hasMedia: false,
    hasLink: false,
    isUnsent: false,
    ...override,
  };
}

/**
 * Create a timestamp for a specific hour of day
 */
function createTimestampAtHour(hour: number, dayOffset = 0): number {
  const date = new Date('2024-01-01');
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, 0, 0, 0);
  return date.getTime();
}

describe('chronotype: computeChronotypeCompatibility', () => {
  describe('edge cases', () => {
    it('returns undefined with less than 2 participants', () => {
      const messages: UnifiedMessage[] = [
        createMessage({ sender: 'Alice', timestamp: createTimestampAtHour(10) }),
      ];
      const result = computeChronotypeCompatibility(messages, ['Alice']);
      expect(result).toBeUndefined();
    });

    it('returns undefined with empty messages', () => {
      const result = computeChronotypeCompatibility([], ['Alice', 'Bob']);
      expect(result).toBeUndefined();
    });

    it('returns undefined when one participant has fewer than 20 messages', () => {
      const messages: UnifiedMessage[] = [];
      // Alice: 25 messages, Bob: 5 messages
      for (let i = 0; i < 25; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Alice',
            timestamp: createTimestampAtHour(10 + (i % 3)),
          })
        );
      }
      for (let i = 0; i < 5; i++) {
        messages.push(
          createMessage({
            index: 25 + i,
            sender: 'Bob',
            timestamp: createTimestampAtHour(14),
          })
        );
      }
      const result = computeChronotypeCompatibility(messages, ['Alice', 'Bob']);
      expect(result).toBeUndefined();
    });

    it('returns undefined when both participants have 0 messages', () => {
      const messages: UnifiedMessage[] = [];
      const result = computeChronotypeCompatibility(messages, ['Alice', 'Bob']);
      expect(result).toBeUndefined();
    });
  });

  describe('single message sender (all from one person)', () => {
    it('ignores messages from third participants', () => {
      const messages: UnifiedMessage[] = [];
      // Alice: 20 messages at hour 10
      for (let i = 0; i < 20; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Alice',
            timestamp: createTimestampAtHour(10),
          })
        );
      }
      // Bob: 20 messages at hour 14
      for (let i = 20; i < 40; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Bob',
            timestamp: createTimestampAtHour(14),
          })
        );
      }
      // Charlie: ignored
      for (let i = 40; i < 45; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Charlie',
            timestamp: createTimestampAtHour(18),
          })
        );
      }
      const result = computeChronotypeCompatibility(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.persons.length).toBe(2);
      expect(result?.persons[0].name).toBe('Alice');
      expect(result?.persons[1].name).toBe('Bob');
    });
  });

  describe('normal cases with realistic data', () => {
    it('correctly categorizes early bird (peak before 10)', () => {
      const messages: UnifiedMessage[] = [];
      // Create 20+ messages concentrated at hour 8 (early morning)
      for (let i = 0; i < 20; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Alice',
            timestamp: createTimestampAtHour(8),
          })
        );
      }
      // Bob: 20+ messages at hour 14 (afternoon)
      for (let i = 20; i < 40; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Bob',
            timestamp: createTimestampAtHour(14),
          })
        );
      }
      const result = computeChronotypeCompatibility(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.persons[0].category).toBe('early_bird');
      expect(result?.persons[0].label).toBe('Ranny ptaszek');
      expect(result?.persons[0].emoji).toBe('🌅');
    });

    it('correctly categorizes night owl (peak after 20)', () => {
      const messages: UnifiedMessage[] = [];
      // Alice: 20+ messages at hour 22 (late night)
      for (let i = 0; i < 20; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Alice',
            timestamp: createTimestampAtHour(22),
          })
        );
      }
      // Bob: 20+ messages at hour 14 (afternoon)
      for (let i = 20; i < 40; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Bob',
            timestamp: createTimestampAtHour(14),
          })
        );
      }
      const result = computeChronotypeCompatibility(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.persons[0].category).toBe('night_owl');
      expect(result?.persons[0].label).toBe('Nocna sowa');
      expect(result?.persons[0].emoji).toBe('🦉');
    });

    it('correctly categorizes intermediate (peak 10-20)', () => {
      const messages: UnifiedMessage[] = [];
      // Both: 20+ messages distributed between 12-15
      for (let i = 0; i < 25; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Alice',
            timestamp: createTimestampAtHour(12 + (i % 4)),
          })
        );
      }
      for (let i = 25; i < 50; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Bob',
            timestamp: createTimestampAtHour(13 + (i % 4)),
          })
        );
      }
      const result = computeChronotypeCompatibility(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.persons[0].category).toBe('intermediate');
      expect(result?.persons[0].label).toBe('Typ pośredni');
      expect(result?.persons[0].emoji).toBe('☀️');
    });

    it('calculates peak hour correctly', () => {
      const messages: UnifiedMessage[] = [];
      // Alice: 15 messages at hour 9, 5 at hour 10 (peak = 9)
      for (let i = 0; i < 15; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Alice',
            timestamp: createTimestampAtHour(9),
          })
        );
      }
      for (let i = 15; i < 20; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Alice',
            timestamp: createTimestampAtHour(10),
          })
        );
      }
      // Bob: 20+ messages at hour 14
      for (let i = 20; i < 45; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Bob',
            timestamp: createTimestampAtHour(14),
          })
        );
      }
      const result = computeChronotypeCompatibility(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.persons[0].peakHour).toBe(9);
    });

    it('computes compatibility score based on delta', () => {
      const messages: UnifiedMessage[] = [];
      // Alice: early bird (hour 8), Bob: night owl (hour 23)
      // Delta should be ~9 hours, score should be low
      for (let i = 0; i < 20; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Alice',
            timestamp: createTimestampAtHour(8),
          })
        );
      }
      for (let i = 20; i < 40; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Bob',
            timestamp: createTimestampAtHour(23),
          })
        );
      }
      const result = computeChronotypeCompatibility(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.matchScore).toBeLessThan(30);
      expect(result?.isCompatible).toBe(false);
    });

    it('computes high compatibility for similar chronotypes', () => {
      const messages: UnifiedMessage[] = [];
      // Both: similar hours (14-15)
      for (let i = 0; i < 25; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Alice',
            timestamp: createTimestampAtHour(14),
          })
        );
      }
      for (let i = 25; i < 50; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Bob',
            timestamp: createTimestampAtHour(15),
          })
        );
      }
      const result = computeChronotypeCompatibility(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.matchScore).toBeGreaterThanOrEqual(80);
      expect(result?.isCompatible).toBe(true);
    });

    it('provides correct interpretation for high match score', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 25; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Alice',
            timestamp: createTimestampAtHour(14),
          })
        );
      }
      for (let i = 25; i < 50; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Bob',
            timestamp: createTimestampAtHour(14),
          })
        );
      }
      const result = computeChronotypeCompatibility(messages, ['Alice', 'Bob']);
      expect(result?.interpretation).toContain('Doskonała');
      expect(result?.interpretation).toContain('delta');
    });
  });

  describe('social jet lag calculation', () => {
    it('calculates zero social jet lag when weekday/weekend patterns match', () => {
      const messages: UnifiedMessage[] = [];
      // Alice: consistent across weekday/weekend at hour 14
      // Create weekday messages (Mon-Fri)
      for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
        for (let i = 0; i < 4; i++) {
          messages.push(
            createMessage({
              index: messages.length,
              sender: 'Alice',
              timestamp: createTimestampAtHour(14, dayOffset),
            })
          );
        }
      }
      // Create weekend messages (Sat-Sun) — same hour
      for (let dayOffset = 5; dayOffset < 7; dayOffset++) {
        for (let i = 0; i < 4; i++) {
          messages.push(
            createMessage({
              index: messages.length,
              sender: 'Alice',
              timestamp: createTimestampAtHour(14, dayOffset),
            })
          );
        }
      }
      // Bob: 20+ messages at hour 15
      for (let i = 0; i < 20; i++) {
        messages.push(
          createMessage({
            index: messages.length,
            sender: 'Bob',
            timestamp: createTimestampAtHour(15, i % 7),
          })
        );
      }
      const result = computeChronotypeCompatibility(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      // Social jet lag for Alice should be very small or zero
      expect(result?.persons[0].socialJetLagHours).toBeLessThan(2);
      expect(result?.persons[0].socialJetLagLevel).toMatch(/none|mild/);
    });

    it('calculates significant social jet lag with different weekday/weekend patterns', () => {
      const messages: UnifiedMessage[] = [];
      // Alice: weekday mornings (8), weekend evenings (20) — big difference
      // Need >= 10 messages in each category for social jet lag to be calculated
      for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
        for (let i = 0; i < 3; i++) {
          messages.push(
            createMessage({
              index: messages.length,
              sender: 'Alice',
              timestamp: createTimestampAtHour(8, dayOffset),
            })
          );
        }
      }
      // 5 days × 3 messages = 15 weekday messages at hour 8
      for (let dayOffset = 5; dayOffset < 7; dayOffset++) {
        for (let i = 0; i < 6; i++) {
          messages.push(
            createMessage({
              index: messages.length,
              sender: 'Alice',
              timestamp: createTimestampAtHour(20, dayOffset),
            })
          );
        }
      }
      // 2 days × 6 messages = 12 weekend messages at hour 20
      // Bob: 20+ messages at hour 14
      for (let i = 0; i < 20; i++) {
        messages.push(
          createMessage({
            index: messages.length,
            sender: 'Bob',
            timestamp: createTimestampAtHour(14, i % 7),
          })
        );
      }
      const result = computeChronotypeCompatibility(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      // Should have moderate to severe social jet lag (difference between weekday and weekend midpoints)
      expect(result?.persons[0].socialJetLagHours).toBeGreaterThanOrEqual(2);
    });

    it('uses overall midpoint if weekday/weekend samples too small', () => {
      const messages: UnifiedMessage[] = [];
      // Alice: all messages on same weekday (not enough weekend data)
      for (let i = 0; i < 20; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Alice',
            timestamp: createTimestampAtHour(10, 0), // Monday only
          })
        );
      }
      // Bob: distributed across week
      for (let i = 20; i < 45; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Bob',
            timestamp: createTimestampAtHour(14, i % 7),
          })
        );
      }
      const result = computeChronotypeCompatibility(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      // Should still compute social jet lag, but use overall midpoint fallback
      expect(result?.persons[0].weekdayMidpoint).toBeDefined();
      expect(result?.persons[0].weekendMidpoint).toBeDefined();
    });

    it('labels jet lag severity correctly', () => {
      const messages: UnifiedMessage[] = [];
      // Create severe social jet lag case: weekday at 1am, weekend at 7pm (18 hour difference)
      // Circular min(18, 24-18) = min(18, 6) = 6 hours (severe)
      // Need >= 10 messages in each category for social jet lag to be calculated
      for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
        for (let i = 0; i < 3; i++) {
          messages.push(
            createMessage({
              index: messages.length,
              sender: 'Alice',
              timestamp: createTimestampAtHour(1, dayOffset),
            })
          );
        }
      }
      // 5 days × 3 messages = 15 weekday messages at hour 1 (1am)
      for (let dayOffset = 5; dayOffset < 7; dayOffset++) {
        for (let i = 0; i < 6; i++) {
          messages.push(
            createMessage({
              index: messages.length,
              sender: 'Alice',
              timestamp: createTimestampAtHour(19, dayOffset),
            })
          );
        }
      }
      // 2 days × 6 messages = 12 weekend messages at hour 19 (7pm)
      for (let i = 0; i < 20; i++) {
        messages.push(
          createMessage({
            index: messages.length,
            sender: 'Bob',
            timestamp: createTimestampAtHour(14, i % 7),
          })
        );
      }
      const result = computeChronotypeCompatibility(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.persons[0].socialJetLagHours).toBeGreaterThanOrEqual(4);
      expect(result?.persons[0].socialJetLagLevel).toBe('severe');
    });
  });

  describe('output structure and properties', () => {
    it('returns properly structured ChronotypeCompatibility object', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 25; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Alice',
            timestamp: createTimestampAtHour(10),
          })
        );
      }
      for (let i = 25; i < 50; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Bob',
            timestamp: createTimestampAtHour(14),
          })
        );
      }
      const result = computeChronotypeCompatibility(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.persons).toHaveLength(2);
      expect(result?.deltaHours).toBeGreaterThan(0);
      expect(result?.matchScore).toBeGreaterThan(0);
      expect(result?.matchScore).toBeLessThanOrEqual(100);
      expect(typeof result?.isCompatible).toBe('boolean');
      expect(typeof result?.interpretation).toBe('string');
      expect(result?.avgSocialJetLag).toBeGreaterThanOrEqual(0);
    });

    it('returns properties with correct decimal precision', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 25; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Alice',
            timestamp: createTimestampAtHour(10 + (i % 2) * 0.5),
          })
        );
      }
      for (let i = 25; i < 50; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Bob',
            timestamp: createTimestampAtHour(14 + (i % 2) * 0.5),
          })
        );
      }
      const result = computeChronotypeCompatibility(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      // Check that values are rounded to one decimal place
      expect((result?.deltaHours.toString().split('.')[1] ?? '').length).toBeLessThanOrEqual(1);
      expect(result?.persons[0].socialJetLagHours).toBeDefined();
    });

    it('provides correct hourly distribution array', () => {
      const messages: UnifiedMessage[] = [];
      // Create specific hourly pattern
      for (let h = 8; h <= 12; h++) {
        for (let i = 0; i < 5; i++) {
          messages.push(
            createMessage({
              index: messages.length,
              sender: 'Alice',
              timestamp: createTimestampAtHour(h),
            })
          );
        }
      }
      for (let i = 0; i < 25; i++) {
        messages.push(
          createMessage({
            index: messages.length,
            sender: 'Bob',
            timestamp: createTimestampAtHour(14 + (i % 3)),
          })
        );
      }
      const result = computeChronotypeCompatibility(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.persons[0].hourlyDistribution).toHaveLength(24);
      // Sum of hourly distribution should equal total messages from that person
      const aliceTotalFromDist = result?.persons[0].hourlyDistribution.reduce((a, b) => a + b, 0);
      expect(aliceTotalFromDist).toBe(25);
    });
  });

  describe('boundary conditions and thresholds', () => {
    it('exactly meets minimum threshold (20 messages)', () => {
      const messages: UnifiedMessage[] = [];
      // Exactly 20 for Alice, 20 for Bob
      for (let i = 0; i < 20; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Alice',
            timestamp: createTimestampAtHour(10),
          })
        );
      }
      for (let i = 20; i < 40; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Bob',
            timestamp: createTimestampAtHour(14),
          })
        );
      }
      const result = computeChronotypeCompatibility(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
    });

    it('barely fails minimum threshold (19 messages)', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 19; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Alice',
            timestamp: createTimestampAtHour(10),
          })
        );
      }
      for (let i = 19; i < 40; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Bob',
            timestamp: createTimestampAtHour(14),
          })
        );
      }
      const result = computeChronotypeCompatibility(messages, ['Alice', 'Bob']);
      expect(result).toBeUndefined();
    });

    it('handles circular delta calculation correctly near 24h boundary', () => {
      const messages: UnifiedMessage[] = [];
      // Alice at hour 1, Bob at hour 23 — circular delta should be 2, not 22
      for (let i = 0; i < 20; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Alice',
            timestamp: createTimestampAtHour(1),
          })
        );
      }
      for (let i = 20; i < 40; i++) {
        messages.push(
          createMessage({
            index: i,
            sender: 'Bob',
            timestamp: createTimestampAtHour(23),
          })
        );
      }
      const result = computeChronotypeCompatibility(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.deltaHours).toBeLessThanOrEqual(2);
    });

    it('score transitions at delta boundaries', () => {
      // Test delta ≤ 1 → score 95
      const test1: UnifiedMessage[] = [];
      for (let i = 0; i < 20; i++) {
        test1.push(
          createMessage({
            index: i,
            sender: 'Alice',
            timestamp: createTimestampAtHour(10),
          })
        );
      }
      for (let i = 20; i < 40; i++) {
        test1.push(
          createMessage({
            index: i,
            sender: 'Bob',
            timestamp: createTimestampAtHour(10.5),
          })
        );
      }
      const result1 = computeChronotypeCompatibility(test1, ['Alice', 'Bob']);
      expect(result1?.matchScore).toBeGreaterThanOrEqual(80);

      // Test delta > 6 → score 5
      const test2: UnifiedMessage[] = [];
      for (let i = 0; i < 20; i++) {
        test2.push(
          createMessage({
            index: i,
            sender: 'Alice',
            timestamp: createTimestampAtHour(2),
          })
        );
      }
      for (let i = 20; i < 40; i++) {
        test2.push(
          createMessage({
            index: i,
            sender: 'Bob',
            timestamp: createTimestampAtHour(9),
          })
        );
      }
      const result2 = computeChronotypeCompatibility(test2, ['Alice', 'Bob']);
      expect(result2?.matchScore).toBeLessThanOrEqual(20);
    });
  });

  describe('deterministic behavior', () => {
    it('produces same result for identical input', () => {
      const createTestMessages = () => {
        const messages: UnifiedMessage[] = [];
        for (let i = 0; i < 25; i++) {
          messages.push(
            createMessage({
              index: i,
              sender: 'Alice',
              timestamp: createTimestampAtHour(10),
            })
          );
        }
        for (let i = 25; i < 50; i++) {
          messages.push(
            createMessage({
              index: i,
              sender: 'Bob',
              timestamp: createTimestampAtHour(14),
            })
          );
        }
        return messages;
      };

      const result1 = computeChronotypeCompatibility(
        createTestMessages(),
        ['Alice', 'Bob']
      );
      const result2 = computeChronotypeCompatibility(
        createTestMessages(),
        ['Alice', 'Bob']
      );

      expect(result1?.deltaHours).toBe(result2?.deltaHours);
      expect(result1?.matchScore).toBe(result2?.matchScore);
      expect(result1?.persons[0].midpoint).toBe(result2?.persons[0].midpoint);
    });
  });
});
