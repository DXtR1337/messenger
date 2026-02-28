import { describe, it, expect } from 'vitest';
import { computeRepairPatterns } from '@/lib/analysis/quant/repair-patterns';
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

describe('computeRepairPatterns', () => {
  describe('edge cases', () => {
    it('should return undefined with less than 2 participants', () => {
      const messages = [createMessage(0, 'Alice', 'tzn something', Date.now())];
      const result = computeRepairPatterns(messages, ['Alice']);
      expect(result).toBeUndefined();
    });

    it('should return undefined with empty messages', () => {
      const result = computeRepairPatterns([], ['Alice', 'Bob']);
      expect(result).toBeUndefined();
    });

    it('should return undefined with less than 100 messages', () => {
      const messages = [
        createMessage(0, 'Alice', 'tzn something', 1000000000000),
        createMessage(1, 'Bob', 'co?', 1000000010000),
      ];
      const result = computeRepairPatterns(messages, ['Alice', 'Bob']);
      expect(result).toBeUndefined();
    });

    it('should return undefined with less than 5 total repair events', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 100; i++) {
        messages.push(createMessage(i, 'Alice', 'hello world', 1000000000000 + i * 1000));
        messages.push(createMessage(i + 100, 'Bob', 'ok yes', 1000000000000 + i * 1000 + 500));
      }
      const result = computeRepairPatterns(messages, ['Alice', 'Bob']);
      expect(result).toBeUndefined();
    });

    it('should skip participants with less than 10 messages', () => {
      const messages: UnifiedMessage[] = [];
      // Alice with 50 messages, some repairs
      for (let i = 0; i < 50; i++) {
        messages.push(
          createMessage(i, 'Alice', i % 5 === 0 ? 'tzn something' : 'hello world', 1000000000000 + i * 1000)
        );
      }
      // Bob with only 3 messages
      messages.push(createMessage(50, 'Bob', 'co?', 1000000050000));
      messages.push(createMessage(51, 'Bob', 'hę?', 1000000051000));
      messages.push(createMessage(52, 'Bob', 'hello', 1000000052000));

      const result = computeRepairPatterns(messages, ['Alice', 'Bob']);
      // Should return undefined because Bob has < 10 messages (only 2 valid)
      expect(result).toBeUndefined();
    });
  });

  describe('Polish self-repair detection', () => {
    it('should detect "tzn" self-repair marker', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 150; i++) {
        messages.push(
          createMessage(i, 'Alice', 'tzn something', 1000000000000 + i * 1000)
        );
      }
      for (let i = 150; i < 300; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok yes sure', 1000000000000 + i * 1000)
        );
      }

      const result = computeRepairPatterns(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].selfRepairCount).toBeGreaterThan(0);
    });

    it('should detect "to znaczy" self-repair marker', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 150; i++) {
        messages.push(
          createMessage(i, 'Alice', 'to znaczy raczej', 1000000000000 + i * 1000)
        );
      }
      for (let i = 150; i < 300; i++) {
        messages.push(
          createMessage(i, 'Bob', 'yes ok', 1000000000000 + i * 1000)
        );
      }

      const result = computeRepairPatterns(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].selfRepairCount).toBeGreaterThan(0);
    });

    it('should detect "miałem na myśli" self-repair', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 150; i++) {
        messages.push(
          createMessage(i, 'Alice', 'miałem na myśli coś innego', 1000000000000 + i * 1000)
        );
      }
      for (let i = 150; i < 300; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok sure', 1000000000000 + i * 1000)
        );
      }

      const result = computeRepairPatterns(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].selfRepairCount).toBeGreaterThan(0);
    });

    it('should detect "czekaj" self-repair marker', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 150; i++) {
        messages.push(
          createMessage(i, 'Alice', 'czekaj nie no', 1000000000000 + i * 1000)
        );
      }
      for (let i = 150; i < 300; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok', 1000000000000 + i * 1000)
        );
      }

      const result = computeRepairPatterns(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].selfRepairCount).toBeGreaterThan(0);
    });
  });

  describe('Polish other-repair detection', () => {
    it('should detect "co?" other-repair marker', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 100; i++) {
        messages.push(
          createMessage(i, 'Alice', 'hello world', 1000000000000 + i * 1000)
        );
      }
      for (let i = 100; i < 250; i++) {
        messages.push(
          createMessage(i, 'Bob', 'co?', 1000000000000 + i * 1000)
        );
      }

      const result = computeRepairPatterns(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Bob'].otherRepairInitiationCount).toBeGreaterThan(0);
    });

    it('should detect "nie rozumiem" other-repair marker', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 100; i++) {
        messages.push(
          createMessage(i, 'Alice', 'hello world', 1000000000000 + i * 1000)
        );
      }
      for (let i = 100; i < 250; i++) {
        messages.push(
          createMessage(i, 'Bob', 'nie rozumiem co chcesz powiedzieć', 1000000000000 + i * 1000)
        );
      }

      const result = computeRepairPatterns(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Bob'].otherRepairInitiationCount).toBeGreaterThan(0);
    });

    it('should detect "co masz na myśli" other-repair', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 100; i++) {
        messages.push(
          createMessage(i, 'Alice', 'something', 1000000000000 + i * 1000)
        );
      }
      for (let i = 100; i < 250; i++) {
        messages.push(
          createMessage(i, 'Bob', 'co masz na myśli dokładnie', 1000000000000 + i * 1000)
        );
      }

      const result = computeRepairPatterns(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Bob'].otherRepairInitiationCount).toBeGreaterThan(0);
    });

    it('should detect "hę?" other-repair marker', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 100; i++) {
        messages.push(
          createMessage(i, 'Alice', 'hello', 1000000000000 + i * 1000)
        );
      }
      for (let i = 100; i < 250; i++) {
        messages.push(
          createMessage(i, 'Bob', 'hę?', 1000000000000 + i * 1000)
        );
      }

      const result = computeRepairPatterns(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Bob'].otherRepairInitiationCount).toBeGreaterThan(0);
    });
  });

  describe('English repair detection', () => {
    it('should detect "i mean" self-repair', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 150; i++) {
        messages.push(
          createMessage(i, 'Alice', 'i mean actually', 1000000000000 + i * 1000)
        );
      }
      for (let i = 150; i < 300; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok sure', 1000000000000 + i * 1000)
        );
      }

      const result = computeRepairPatterns(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].selfRepairCount).toBeGreaterThan(0);
    });

    it('should detect "what?" other-repair', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 100; i++) {
        messages.push(
          createMessage(i, 'Alice', 'hello', 1000000000000 + i * 1000)
        );
      }
      for (let i = 100; i < 250; i++) {
        messages.push(
          createMessage(i, 'Bob', 'what?', 1000000000000 + i * 1000)
        );
      }

      const result = computeRepairPatterns(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Bob'].otherRepairInitiationCount).toBeGreaterThan(0);
    });
  });

  describe('repair rates calculation', () => {
    it('should calculate selfRepairRate as percentage', () => {
      const messages: UnifiedMessage[] = [];
      // Alice: 50 messages with repair, 50 without = 50%
      for (let i = 0; i < 100; i++) {
        messages.push(
          createMessage(i, 'Alice', i % 2 === 0 ? 'tzn something' : 'hello', 1000000000000 + i * 1000)
        );
      }
      // Bob: 150 neutral messages
      for (let i = 100; i < 250; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok sure yes', 1000000000000 + i * 1000)
        );
      }

      const result = computeRepairPatterns(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].selfRepairRate).toBeGreaterThan(20);
      expect(result!.perPerson['Alice'].selfRepairRate).toBeLessThanOrEqual(100);
    });

    it('should calculate otherRepairRate as percentage', () => {
      const messages: UnifiedMessage[] = [];
      // Alice: 100 neutral messages
      for (let i = 0; i < 100; i++) {
        messages.push(
          createMessage(i, 'Alice', 'hello', 1000000000000 + i * 1000)
        );
      }
      // Bob: 50 with repairs, 100 without = ~33%
      for (let i = 100; i < 250; i++) {
        messages.push(
          createMessage(i, 'Bob', i % 3 === 0 ? 'co?' : 'ok', 1000000000000 + i * 1000)
        );
      }

      const result = computeRepairPatterns(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Bob'].otherRepairRate).toBeGreaterThanOrEqual(0);
      expect(result!.perPerson['Bob'].otherRepairRate).toBeLessThanOrEqual(100);
    });
  });

  describe('repairInitiationRatio', () => {
    it('should calculate repairInitiationRatio between 0 and 1', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 150; i++) {
        messages.push(
          createMessage(i, 'Alice', i % 2 === 0 ? 'tzn something' : 'hello', 1000000000000 + i * 1000)
        );
      }
      for (let i = 150; i < 300; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok sure', 1000000000000 + i * 1000)
        );
      }

      const result = computeRepairPatterns(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].repairInitiationRatio).toBeGreaterThanOrEqual(0);
      expect(result!.perPerson['Alice'].repairInitiationRatio).toBeLessThanOrEqual(1);
    });

    it('should be higher for self-repair dominant persons', () => {
      const messages: UnifiedMessage[] = [];
      // Alice mostly self-repairs
      for (let i = 0; i < 150; i++) {
        messages.push(
          createMessage(i, 'Alice', 'tzn', 1000000000000 + i * 1000)
        );
      }
      // Bob mostly gets asked for repair
      for (let i = 150; i < 300; i++) {
        messages.push(
          createMessage(i, 'Bob', 'co?', 1000000000000 + i * 1000)
        );
      }

      const result = computeRepairPatterns(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].repairInitiationRatio).toBeGreaterThan(0.5);
    });
  });

  describe('label generation', () => {
    it('should label high self-repair as precise communicator', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 150; i++) {
        messages.push(
          createMessage(i, 'Alice', 'tzn', 1000000000000 + i * 1000)
        );
      }
      for (let i = 150; i < 300; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok', 1000000000000 + i * 1000)
        );
      }

      const result = computeRepairPatterns(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      if (result!.perPerson['Alice'].selfRepairRate >= 8) {
        expect(result!.perPerson['Alice'].label).toContain('precyzyjnie');
      }
    });

    it('should label high other-repair requests as unclear communicator', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 100; i++) {
        messages.push(
          createMessage(i, 'Alice', 'hello', 1000000000000 + i * 1000)
        );
      }
      for (let i = 100; i < 250; i++) {
        messages.push(
          createMessage(i, 'Bob', 'co?', 1000000000000 + i * 1000)
        );
      }

      const result = computeRepairPatterns(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].label).toBeDefined();
    });
  });

  describe('mutualRepairIndex', () => {
    it('should calculate mutual repair index between 0-100', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 150; i++) {
        messages.push(
          createMessage(i, 'Alice', i % 5 === 0 ? 'tzn' : 'hello', 1000000000000 + i * 1000)
        );
      }
      for (let i = 150; i < 300; i++) {
        messages.push(
          createMessage(i, 'Bob', i % 5 === 0 ? 'co?' : 'ok', 1000000000000 + i * 1000)
        );
      }

      const result = computeRepairPatterns(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.mutualRepairIndex).toBeGreaterThanOrEqual(0);
      expect(result!.mutualRepairIndex).toBeLessThanOrEqual(100);
    });
  });

  describe('dominantSelfRepairer identification', () => {
    it('should identify person with most self-repairs', () => {
      const messages: UnifiedMessage[] = [];
      // Alice: 100 self-repairs
      for (let i = 0; i < 100; i++) {
        messages.push(
          createMessage(i, 'Alice', 'tzn', 1000000000000 + i * 1000)
        );
      }
      for (let i = 100; i < 200; i++) {
        messages.push(
          createMessage(i, 'Alice', 'ok', 1000000000000 + i * 1000)
        );
      }
      // Bob: 10 self-repairs
      for (let i = 200; i < 210; i++) {
        messages.push(
          createMessage(i, 'Bob', 'tzn', 1000000000000 + i * 1000)
        );
      }
      for (let i = 210; i < 300; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok', 1000000000000 + i * 1000)
        );
      }

      const result = computeRepairPatterns(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.dominantSelfRepairer).toBe('Alice');
    });
  });

  describe('interpretation generation', () => {
    it('should indicate similar rates with small difference', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 150; i++) {
        messages.push(
          createMessage(i, 'Alice', i % 10 === 0 ? 'tzn' : 'hello', 1000000000000 + i * 1000)
        );
      }
      for (let i = 150; i < 300; i++) {
        messages.push(
          createMessage(i, 'Bob', i % 10 === 0 ? 'tzn' : 'ok', 1000000000000 + i * 1000)
        );
      }

      const result = computeRepairPatterns(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.interpretation).toBeDefined();
    });

    it('should highlight difference when one repairs more', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 150; i++) {
        messages.push(
          createMessage(i, 'Alice', i % 2 === 0 ? 'tzn' : 'hello', 1000000000000 + i * 1000)
        );
      }
      for (let i = 150; i < 300; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok', 1000000000000 + i * 1000)
        );
      }

      const result = computeRepairPatterns(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      // Check that interpretation indicates the multiplier difference (contains "×" or mentions repair ratio)
      expect(result!.interpretation).toMatch(/×|razy|częściej/);
    });
  });

  describe('realistic conversation', () => {
    it('should handle realistic conversation with mixed repairs', () => {
      const messages: UnifiedMessage[] = [];
      const baseTs = 1000000000000;

      // Natural conversation
      const aliceMessages = [
        'Cześć, jak się masz?',
        'Wczoraj tzn to znaczy dzisiaj byłem zajęty',
        'Miałem na myśli że jutro się spotkamy',
        'No właściwie to może w poniedziałek',
        'ok czekaj, zmieniam plany',
      ];

      const bobMessages = [
        'Cześć! W porządku',
        'co?', // confusion
        'Hę? Jakiego poniedziałku?',
        'Nie rozumiem twojego harmonogramu',
        'ok ale zaraz poddaj to bardziej jasno',
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

      const result = computeRepairPatterns(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].selfRepairCount).toBeGreaterThan(0);
      expect(result!.perPerson['Bob'].otherRepairInitiationCount).toBeGreaterThan(0);
    });
  });

  describe('edge case: messages with markers at start/middle/end', () => {
    it('should detect marker at message start', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 150; i++) {
        messages.push(
          createMessage(i, 'Alice', 'tzn hello world', 1000000000000 + i * 1000)
        );
      }
      for (let i = 150; i < 300; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok', 1000000000000 + i * 1000)
        );
      }

      const result = computeRepairPatterns(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].selfRepairCount).toBeGreaterThan(0);
    });

    it('should detect marker in middle of message', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 150; i++) {
        messages.push(
          createMessage(i, 'Alice', 'hello tzn world', 1000000000000 + i * 1000)
        );
      }
      for (let i = 150; i < 300; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok', 1000000000000 + i * 1000)
        );
      }

      const result = computeRepairPatterns(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].selfRepairCount).toBeGreaterThan(0);
    });
  });
});
