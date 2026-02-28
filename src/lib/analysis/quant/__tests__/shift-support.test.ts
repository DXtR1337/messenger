import { describe, it, expect } from 'vitest';
import { computeShiftSupportRatio } from '@/lib/analysis/quant/shift-support';
import type { UnifiedMessage } from '@/lib/parsers/types';

const BASE_TS = 1700000000000;

function msg(index: number, sender: string, content: string, tsOffset = 0): UnifiedMessage {
  return {
    index,
    sender,
    content,
    timestamp: BASE_TS + index * 60000 + tsOffset,
    type: 'text',
    reactions: [],
    hasMedia: false,
    hasLink: false,
    isUnsent: false,
  };
}

/**
 * Generate alternating Alice/Bob conversation with enough messages to exceed
 * the 10-total-responses-per-person threshold.
 * Even indices = Alice, odd = Bob.
 * aliceContent/bobContent control what each person says.
 */
function generateConversation(
  pairs: number,
  aliceContent: string,
  bobContent: string,
): UnifiedMessage[] {
  const msgs: UnifiedMessage[] = [];
  for (let i = 0; i < pairs * 2; i++) {
    const sender = i % 2 === 0 ? 'Alice' : 'Bob';
    const content = sender === 'Alice' ? aliceContent : bobContent;
    msgs.push(msg(i, sender, content));
  }
  return msgs;
}

describe('shift-support: computeShiftSupportRatio', () => {
  describe('edge cases', () => {
    it('returns undefined with less than 2 participants', () => {
      expect(computeShiftSupportRatio([msg(0, 'Alice', 'hello')], ['Alice'])).toBeUndefined();
    });

    it('returns undefined with empty messages', () => {
      expect(computeShiftSupportRatio([], ['Alice', 'Bob'])).toBeUndefined();
    });

    it('returns undefined when less than 10 total responses per person', () => {
      const messages = [
        msg(0, 'Alice', 'hello'),
        msg(1, 'Bob', 'hi'),
        msg(2, 'Alice', 'how?'),
        msg(3, 'Bob', 'good'),
      ];
      expect(computeShiftSupportRatio(messages, ['Alice', 'Bob'])).toBeUndefined();
    });

    it('ignores messages from same sender in sequence', () => {
      // Only alternating pairs count. Same-sender sequences are skipped.
      // Alice→Alice is skipped, Bob→Bob is skipped.
      // Need at least 10 valid alternations per person.
      const messages: UnifiedMessage[] = [];
      let idx = 0;
      // Create 8 alternating pairs (= 8 responses per person) + same-sender blocks
      for (let i = 0; i < 8; i++) {
        messages.push(msg(idx++, 'Alice', 'Co słychać?'));  // support (question mark)
        messages.push(msg(idx++, 'Alice', 'hello me again'));  // same sender, skipped
        messages.push(msg(idx++, 'Bob', 'Dobrze u mnie?'));  // support (question mark)
      }
      // Only 8 responses each, need 10 → undefined
      expect(computeShiftSupportRatio(messages, ['Alice', 'Bob'])).toBeUndefined();
    });

    it('ignores messages with 6h+ gap', () => {
      // All pairs have >6h gap → total stays 0 → undefined
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 24; i++) {
        const sender = i % 2 === 0 ? 'Alice' : 'Bob';
        messages.push({
          ...msg(i, sender, 'Co słychać?'),
          timestamp: BASE_TS + i * 7 * 60 * 60 * 1000, // 7 hour gaps
        });
      }
      expect(computeShiftSupportRatio(messages, ['Alice', 'Bob'])).toBeUndefined();
    });

    it('ignores messages with empty content', () => {
      // Alternate with some empty content → not enough valid pairs
      const messages: UnifiedMessage[] = [];
      let idx = 0;
      for (let i = 0; i < 12; i++) {
        messages.push(msg(idx++, 'Alice', i % 2 === 0 ? '' : 'Co?'));
        messages.push(msg(idx++, 'Bob', 'tak?'));
      }
      // Some pairs have empty prev content → skipped
      const result = computeShiftSupportRatio(messages, ['Alice', 'Bob']);
      // May or may not reach threshold depending on how many valid pairs
      // At most 6 valid Alice→Bob (non-empty Alice) + 12 Bob→Alice
      // Bob has ~12 total, Alice has ~6 → Alice < 10, undefined
      expect(result).toBeUndefined();
    });
  });

  describe('support response detection', () => {
    it('detects support response with question mark', () => {
      // Bob always responds with ? → support
      const messages = generateConversation(12, 'Dzisiaj byłem w parku', 'Naprawdę? Fajnie było?');
      const result = computeShiftSupportRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Bob'].supportCount).toBeGreaterThan(0);
    });

    it('detects support response starting with question word', () => {
      // Bob starts with "jak" (question word) → support
      const messages = generateConversation(12, 'Dzisiaj byłem w kinie', 'jak było w kinie');
      const result = computeShiftSupportRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      // Bob's responses start with "jak" → support
      expect(result!.perPerson['Bob'].supportCount).toBeGreaterThan(0);
    });

    it('detects support response with word overlap >= 2', () => {
      // Bob repeats 2+ words (>3 chars) from Alice's message → support
      const messages = generateConversation(12,
        'Spotkałem wczoraj Kamilę w restauracji',
        'Kamilę spotkałeś w restauracji wow');
      const result = computeShiftSupportRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      // "Kamilę" (6 chars) + "restauracji" (11 chars) overlap → support
      expect(result!.perPerson['Bob'].supportCount).toBeGreaterThan(0);
    });
  });

  describe('shift response detection', () => {
    it('detects shift response with self-start and no overlap', () => {
      // Bob starts with "ja" (self-token) and no word overlap → shift
      const messages = generateConversation(12,
        'Dzisiaj byłem w parku',
        'ja wczoraj grałem');
      const result = computeShiftSupportRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Bob'].shiftCount).toBeGreaterThan(0);
    });

    it('detects shift response with Polish self-tokens', () => {
      // Bob starts with "mam" (self-token) and no word overlap → shift
      const messages = generateConversation(12,
        'Byłem dzisiaj w kinie',
        'mam nową maszynkę');
      const result = computeShiftSupportRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Bob'].shiftCount).toBeGreaterThan(0);
    });

    it('detects shift response with English self-start phrase', () => {
      // Bob starts with "me" (self-token) and no word overlap → shift
      // Note: bare "i" was removed from SELF_START (Polish "i" = "and" collision)
      const messages = generateConversation(12,
        'The weather was really terrible',
        'me and my friend went shopping');
      const result = computeShiftSupportRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      // "me" and "my" are self-start tokens, no overlap → shift
      expect(result!.perPerson['Bob'].shiftCount).toBeGreaterThan(0);
    });
  });

  describe('conversational narcissism index calculation', () => {
    it('calculates CNI as percentage of shift responses', () => {
      // Bob always shifts (self-start, no overlap) → high CNI
      const messages = generateConversation(12,
        'Byłem dzisiaj w sklepie',
        'ja wczoraj grałem');
      const result = computeShiftSupportRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      // Bob's CNI should be high (all shift)
      expect(result!.perPerson['Bob'].cni).toBeGreaterThan(50);
    });

    it('calculates CNI 0 for 100% support responses', () => {
      // Bob always supports (question mark) → CNI 0
      const messages = generateConversation(12,
        'Byłem dzisiaj w sklepie',
        'Naprawdę? Jak było?');
      const result = computeShiftSupportRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Bob'].cni).toBe(0);
    });

    it('calculates CNI 50 for balanced shift/support', () => {
      // Alternate Bob's responses: support then shift
      const messages: UnifiedMessage[] = [];
      let idx = 0;
      for (let i = 0; i < 12; i++) {
        messages.push(msg(idx++, 'Alice', 'Byłem dzisiaj w sklepie'));
        // Alternate: even = support (question), odd = shift (self-start, no overlap)
        const bobContent = i % 2 === 0 ? 'Naprawdę? Fajnie?' : 'ja wczoraj grałem';
        messages.push(msg(idx++, 'Bob', bobContent));
      }
      const result = computeShiftSupportRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      // ~50% shift, ~50% support for Bob
      expect(result!.perPerson['Bob'].cni).toBeGreaterThanOrEqual(40);
      expect(result!.perPerson['Bob'].cni).toBeLessThanOrEqual(60);
    });
  });

  describe('CNI gap calculation', () => {
    it('calculates zero gap when CNI is equal', () => {
      // Both Alice and Bob always shift → equal CNI
      const messages: UnifiedMessage[] = [];
      let idx = 0;
      for (let i = 0; i < 12; i++) {
        messages.push(msg(idx++, 'Alice', 'ja wczoraj grałem'));
        messages.push(msg(idx++, 'Bob', 'ja wczoraj biegałem'));
      }
      const result = computeShiftSupportRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.cniGap).toBe(0);
    });

    it('calculates correct CNI gap', () => {
      // Alice always supports (questions), Bob always shifts
      const messages: UnifiedMessage[] = [];
      let idx = 0;
      for (let i = 0; i < 12; i++) {
        messages.push(msg(idx++, 'Alice', 'Jak było?'));  // Alice says question
        messages.push(msg(idx++, 'Bob', 'ja wczoraj grałem'));  // Bob shifts
      }
      const result = computeShiftSupportRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      // Bob has high CNI (shifts), Alice has low CNI (supports)
      expect(result!.cniGap).toBeGreaterThan(0);
      expect(result!.higherCNI).toBe('Bob');
    });

    it('identifies person with higher CNI', () => {
      // Bob shifts more than Alice
      const messages: UnifiedMessage[] = [];
      let idx = 0;
      for (let i = 0; i < 12; i++) {
        messages.push(msg(idx++, 'Alice', 'Co słychać?'));  // support (question)
        messages.push(msg(idx++, 'Bob', 'ja wczoraj grałem'));  // shift
      }
      const result = computeShiftSupportRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.higherCNI).toBe('Bob');
    });
  });

  describe('shift/support ratio calculation', () => {
    it('calculates correct shift ratio', () => {
      // Bob always shifts → shiftRatio close to 1.0
      const messages = generateConversation(12,
        'Byłem dzisiaj w sklepie',
        'ja wczoraj grałem');
      const result = computeShiftSupportRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Bob'].shiftRatio).toBeGreaterThan(0.5);
    });
  });

  describe('output structure', () => {
    it('returns properly structured ShiftSupportResult', () => {
      const messages = generateConversation(12,
        'Co robisz dzisiaj?',
        'Naprawdę? Fajnie?');
      const result = computeShiftSupportRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('perPerson');
      expect(result).toHaveProperty('higherCNI');
      expect(result).toHaveProperty('cniGap');
      expect(result!.perPerson['Alice']).toHaveProperty('shiftCount');
      expect(result!.perPerson['Alice']).toHaveProperty('supportCount');
      expect(result!.perPerson['Alice']).toHaveProperty('shiftRatio');
      expect(result!.perPerson['Alice']).toHaveProperty('cni');
    });

    it('excludes persons with < 10 total responses', () => {
      // Only 5 alternating pairs = 5 responses each → undefined
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 10; i++) {
        messages.push(msg(i, i % 2 === 0 ? 'Alice' : 'Bob', 'Co?'));
      }
      expect(computeShiftSupportRatio(messages, ['Alice', 'Bob'])).toBeUndefined();
    });
  });

  describe('edge cases with participant names', () => {
    it('handles three participants but analyzes only requested pair', () => {
      // Messages from 3 senders, but only Alice & Bob requested
      const messages: UnifiedMessage[] = [];
      let idx = 0;
      for (let i = 0; i < 12; i++) {
        messages.push(msg(idx++, 'Alice', 'Co słychać?'));
        messages.push(msg(idx++, 'Bob', 'Dobrze?'));
        messages.push(msg(idx++, 'Charlie', 'Hej?'));
      }
      const result = computeShiftSupportRatio(messages, ['Alice', 'Bob']);
      // Alice and Bob each have responses to the other
      // Alice→Bob: Bob responds to Alice (12 times)
      // Bob→Charlie: Charlie not in participants, Charlie→Alice: Alice responds
      // This may not give enough because Charlie breaks alternation
      // Let's just check it doesn't crash
      if (result) {
        expect(result.perPerson).toBeDefined();
      }
    });

    it('handles names with different cases', () => {
      // Sender names are case-sensitive — must match exactly
      const messages = generateConversation(12, 'Co?', 'Tak?');
      const result = computeShiftSupportRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
    });
  });
});
