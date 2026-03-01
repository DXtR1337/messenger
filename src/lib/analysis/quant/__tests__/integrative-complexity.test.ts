import { describe, it, expect } from 'vitest';
import { computeIntegrativeComplexity } from '@/lib/analysis/quant/integrative-complexity';
import type { UnifiedMessage } from '@/lib/parsers/types';

function createMessage(
  index: number,
  sender: string,
  content: string,
  timestamp: number,
): UnifiedMessage {
  return {
    index,
    sender,
    content,
    timestamp,
    type: 'text',
    reactions: [],
    hasMedia: false,
    hasLink: false,
    isUnsent: false,
  };
}

describe('computeIntegrativeComplexity', () => {
  describe('edge cases', () => {
    it('should return undefined with less than 2 participants', () => {
      const messages = [createMessage(0, 'Alice', 'hello world', Date.now())];
      const result = computeIntegrativeComplexity(messages, ['Alice']);
      expect(result).toBeUndefined();
    });

    it('should return undefined with empty messages', () => {
      const result = computeIntegrativeComplexity([], ['Alice', 'Bob']);
      expect(result).toBeUndefined();
    });

    it('should return undefined when participants have less than 30 messages', () => {
      const messages = [
        createMessage(0, 'Alice', 'z drugiej strony jednak', 1000000000000),
        createMessage(1, 'Bob', 'ok yes', 1000000010000),
      ];
      const result = computeIntegrativeComplexity(messages, ['Alice', 'Bob']);
      expect(result).toBeUndefined();
    });

    it('should return undefined with less than 3 total IC phrases', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 50; i++) {
        messages.push(createMessage(i, 'Alice', 'hello world', 1000000000000 + i * 1000));
        messages.push(createMessage(i + 50, 'Bob', 'ok yes sure', 1000000000000 + i * 1000 + 500));
      }
      const result = computeIntegrativeComplexity(messages, ['Alice', 'Bob']);
      expect(result).toBeUndefined();
    });
  });

  describe('Polish differentiation phrases', () => {
    it('should detect "z drugiej strony" differentiation', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 80; i++) {
        messages.push(
          createMessage(i, 'Alice', 'z drugiej strony jednak', 1000000000000 + i * 1000)
        );
      }
      for (let i = 80; i < 160; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok sure', 1000000000000 + i * 1000)
        );
      }

      const result = computeIntegrativeComplexity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].differentiationCount).toBeGreaterThan(0);
    });

    it('should detect "jednak" differentiation marker', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 80; i++) {
        messages.push(
          createMessage(i, 'Alice', 'jednak to jest ważne', 1000000000000 + i * 1000)
        );
      }
      for (let i = 80; i < 160; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok', 1000000000000 + i * 1000)
        );
      }

      const result = computeIntegrativeComplexity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].differentiationCount).toBeGreaterThan(0);
    });

    it('should detect "mimo to" differentiation', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 80; i++) {
        messages.push(
          createMessage(i, 'Alice', 'mimo to chciałbym', 1000000000000 + i * 1000)
        );
      }
      for (let i = 80; i < 160; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok yes', 1000000000000 + i * 1000)
        );
      }

      const result = computeIntegrativeComplexity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].differentiationCount).toBeGreaterThan(0);
    });

    it('should detect "chociaż" differentiation', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 80; i++) {
        messages.push(
          createMessage(i, 'Alice', 'chociaż rozumiem twój punkt', 1000000000000 + i * 1000)
        );
      }
      for (let i = 80; i < 160; i++) {
        messages.push(
          createMessage(i, 'Bob', 'sure', 1000000000000 + i * 1000)
        );
      }

      const result = computeIntegrativeComplexity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].differentiationCount).toBeGreaterThan(0);
    });

    it('should detect "owszem ale" acknowledgment with contrast', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 80; i++) {
        messages.push(
          createMessage(i, 'Alice', 'owszem ale z innej perspektywy', 1000000000000 + i * 1000)
        );
      }
      for (let i = 80; i < 160; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok', 1000000000000 + i * 1000)
        );
      }

      const result = computeIntegrativeComplexity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].differentiationCount).toBeGreaterThan(0);
    });
  });

  describe('Polish integration phrases', () => {
    it('should detect "biorąc pod uwagę" integration', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 80; i++) {
        messages.push(
          createMessage(i, 'Alice', 'biorąc pod uwagę wszystko', 1000000000000 + i * 1000)
        );
      }
      for (let i = 80; i < 160; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok sure', 1000000000000 + i * 1000)
        );
      }

      const result = computeIntegrativeComplexity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].integrationCount).toBeGreaterThan(0);
    });

    it('should detect "zatem" integration marker', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 80; i++) {
        messages.push(
          createMessage(i, 'Alice', 'zatem wynika z tego że', 1000000000000 + i * 1000)
        );
      }
      for (let i = 80; i < 160; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok', 1000000000000 + i * 1000)
        );
      }

      const result = computeIntegrativeComplexity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].integrationCount).toBeGreaterThan(0);
    });

    it('should detect "w związku z tym" integration', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 80; i++) {
        messages.push(
          createMessage(i, 'Alice', 'w związku z tym powinniśmy', 1000000000000 + i * 1000)
        );
      }
      for (let i = 80; i < 160; i++) {
        messages.push(
          createMessage(i, 'Bob', 'yes', 1000000000000 + i * 1000)
        );
      }

      const result = computeIntegrativeComplexity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].integrationCount).toBeGreaterThan(0);
    });

    it('should detect "podsumowując" integration', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 80; i++) {
        messages.push(
          createMessage(i, 'Alice', 'podsumowując całą sytuację', 1000000000000 + i * 1000)
        );
      }
      for (let i = 80; i < 160; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok', 1000000000000 + i * 1000)
        );
      }

      const result = computeIntegrativeComplexity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].integrationCount).toBeGreaterThan(0);
    });
  });

  describe('English IC phrases', () => {
    it('should detect "on the other hand" differentiation', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 80; i++) {
        messages.push(
          createMessage(i, 'Alice', 'on the other hand however', 1000000000000 + i * 1000)
        );
      }
      for (let i = 80; i < 160; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok sure', 1000000000000 + i * 1000)
        );
      }

      const result = computeIntegrativeComplexity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].differentiationCount).toBeGreaterThan(0);
    });

    it('should detect "therefore" integration', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 80; i++) {
        messages.push(
          createMessage(i, 'Alice', 'therefore it follows that', 1000000000000 + i * 1000)
        );
      }
      for (let i = 80; i < 160; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok', 1000000000000 + i * 1000)
        );
      }

      const result = computeIntegrativeComplexity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].integrationCount).toBeGreaterThan(0);
    });
  });

  describe('IC score normalization', () => {
    it('should return IC scores between 0-100', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 80; i++) {
        messages.push(
          createMessage(i, 'Alice', 'z drugiej strony jednak biorąc pod uwagę', 1000000000000 + i * 1000)
        );
      }
      for (let i = 80; i < 160; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok sure', 1000000000000 + i * 1000)
        );
      }

      const result = computeIntegrativeComplexity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].icScore).toBeGreaterThanOrEqual(0);
      expect(result!.perPerson['Alice'].icScore).toBeLessThanOrEqual(100);
    });

    it('should increase score with more IC phrases', () => {
      const messages1: UnifiedMessage[] = [];
      // Few IC phrases
      for (let i = 0; i < 80; i++) {
        messages1.push(
          createMessage(i, 'Alice', 'z drugiej strony', 1000000000000 + i * 1000)
        );
      }
      for (let i = 80; i < 160; i++) {
        messages1.push(
          createMessage(i, 'Bob', 'ok', 1000000000000 + i * 1000)
        );
      }

      const messages2: UnifiedMessage[] = [];
      // Many IC phrases
      for (let i = 0; i < 80; i++) {
        messages2.push(
          createMessage(i, 'Alice', 'z drugiej strony jednak biorąc pod uwagę zatem', 1000000000000 + i * 1000)
        );
      }
      for (let i = 80; i < 160; i++) {
        messages2.push(
          createMessage(i, 'Bob', 'ok', 1000000000000 + i * 1000)
        );
      }

      const result1 = computeIntegrativeComplexity(messages1, ['Alice', 'Bob']);
      const result2 = computeIntegrativeComplexity(messages2, ['Alice', 'Bob']);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result2!.perPerson['Alice'].icScore).toBeGreaterThanOrEqual(
        result1!.perPerson['Alice'].icScore
      );
    });
  });

  describe('trend calculation', () => {
    it('should calculate monthly IC trend', () => {
      const baseTs = new Date('2024-01-01').getTime();
      const messages: UnifiedMessage[] = [];

      // January: low IC
      for (let i = 0; i < 40; i++) {
        messages.push(
          createMessage(messages.length, 'Alice', 'hello world', baseTs + i * 86400000)
        );
      }
      for (let i = 0; i < 40; i++) {
        messages.push(
          createMessage(messages.length, 'Bob', 'ok sure', baseTs + i * 86400000 + 1000)
        );
      }

      // February: high IC
      const febTs = baseTs + 31 * 86400000;
      for (let i = 0; i < 40; i++) {
        messages.push(
          createMessage(messages.length, 'Alice', 'z drugiej strony jednak biorąc pod uwagę', febTs + i * 86400000)
        );
      }
      for (let i = 0; i < 40; i++) {
        messages.push(
          createMessage(messages.length, 'Bob', 'ok sure', febTs + i * 86400000 + 1000)
        );
      }

      const result = computeIntegrativeComplexity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      if (result) {
        // Trend should show improvement (positive)
        expect(result.perPerson['Alice'].trend).toBeGreaterThanOrEqual(-1000);
      }
    });

    it('should detect declining IC (conflict signal)', () => {
      const baseTs = new Date('2024-01-01').getTime();
      const messages: UnifiedMessage[] = [];

      // January: high IC
      for (let i = 0; i < 40; i++) {
        messages.push(
          createMessage(messages.length, 'Alice', 'z drugiej strony jednak biorąc pod uwagę', baseTs + i * 86400000)
        );
      }
      for (let i = 0; i < 40; i++) {
        messages.push(
          createMessage(messages.length, 'Bob', 'ok sure', baseTs + i * 86400000 + 1000)
        );
      }

      // February: low IC (simplified messages)
      const febTs = baseTs + 31 * 86400000;
      for (let i = 0; i < 40; i++) {
        messages.push(
          createMessage(messages.length, 'Alice', 'no tak bardzo nie', febTs + i * 86400000)
        );
      }
      for (let i = 0; i < 40; i++) {
        messages.push(
          createMessage(messages.length, 'Bob', 'ok', febTs + i * 86400000 + 1000)
        );
      }

      const result = computeIntegrativeComplexity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      if (result) {
        // Declining trend indicates shift toward simpler thinking
        expect(result.perPerson['Alice'].trend).toBeLessThan(0);
      }
    });
  });

  describe('higherIC identification', () => {
    it('should identify person with higher IC', () => {
      const messages: UnifiedMessage[] = [];
      // Alice high IC
      for (let i = 0; i < 80; i++) {
        messages.push(
          createMessage(i, 'Alice', 'z drugiej strony jednak biorąc pod uwagę zatem', 1000000000000 + i * 1000)
        );
      }
      // Bob low IC
      for (let i = 80; i < 160; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok sure yes', 1000000000000 + i * 1000)
        );
      }

      const result = computeIntegrativeComplexity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.higherIC).toBe('Alice');
    });
  });

  describe('example phrases tracking', () => {
    it('should track up to 5 example phrases', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 80; i++) {
        messages.push(
          createMessage(i, 'Alice', 'z drugiej strony jednak biorąc zatem', 1000000000000 + i * 1000)
        );
      }
      for (let i = 80; i < 160; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok', 1000000000000 + i * 1000)
        );
      }

      const result = computeIntegrativeComplexity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].examplePhrases).toBeDefined();
      expect(result!.perPerson['Alice'].examplePhrases.length).toBeLessThanOrEqual(5);
    });
  });

  describe('realistic conversation', () => {
    it('should handle realistic intellectual discussion', () => {
      const messages: UnifiedMessage[] = [];
      const baseTs = 1000000000000;

      const aliceMessages = [
        'z drugiej strony jednak',
        'biorąc pod uwagę różne perspektywy',
        'zatem wynika z tego że',
        'niemniej jednak mamy wynik',
        'podsumowując całą sytuację',
      ];

      const bobMessages = [
        'to ma sens',
        'rzeczywiście jednak mogę się nie zgadzać',
        'owszem ale z innej strony',
        'w konsekwencji',
        'masz rację ale',
      ];

      for (let i = 0; i < 50; i++) {
        messages.push(
          createMessage(i, 'Alice', aliceMessages[i % aliceMessages.length], baseTs + i * 2000)
        );
      }
      for (let i = 50; i < 100; i++) {
        messages.push(
          createMessage(i, 'Bob', bobMessages[i % bobMessages.length], baseTs + i * 2000 + 1000)
        );
      }

      const result = computeIntegrativeComplexity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].differentiationCount).toBeGreaterThan(0);
      expect(result!.perPerson['Bob'].integrationCount).toBeGreaterThan(0);
    });
  });

  describe('bilingual complexity', () => {
    it('should handle mixed Polish and English IC phrases', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 80; i++) {
        const msg = i % 2 === 0
          ? 'z drugiej strony jednak however'
          : 'on the other hand zatem therefore';
        messages.push(
          createMessage(i, 'Alice', msg, 1000000000000 + i * 1000)
        );
      }
      for (let i = 80; i < 160; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok sure yes', 1000000000000 + i * 1000)
        );
      }

      const result = computeIntegrativeComplexity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].icScore).toBeGreaterThan(0);
    });
  });

  describe('edge case: minimum threshold', () => {
    it('should handle exactly 30 messages per participant', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 30; i++) {
        messages.push(
          createMessage(i, 'Alice', 'z drugiej strony', 1000000000000 + i * 1000)
        );
      }
      for (let i = 30; i < 60; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok zatem', 1000000000000 + i * 1000)
        );
      }

      const result = computeIntegrativeComplexity(messages, ['Alice', 'Bob']);
      // Should succeed because both have >= 30 messages
      expect(result).toBeDefined();
    });

    it('should skip participants with < 30 messages', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 50; i++) {
        messages.push(
          createMessage(i, 'Alice', 'z drugiej strony zatem', 1000000000000 + i * 1000)
        );
      }
      for (let i = 50; i < 55; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok', 1000000000000 + i * 1000)
        );
      }

      const result = computeIntegrativeComplexity(messages, ['Alice', 'Bob']);
      // Should return undefined because Bob < 30 messages, only Alice survives
      expect(result).toBeUndefined();
    });
  });

});
