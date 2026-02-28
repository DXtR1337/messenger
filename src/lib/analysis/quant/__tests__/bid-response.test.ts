import { describe, it, expect } from 'vitest';
import { computeBidResponseRatio } from '@/lib/analysis/quant/bid-response';
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

describe('bid-response: computeBidResponseRatio', () => {
  describe('edge cases', () => {
    it('returns undefined with less than 2 participants', () => {
      const messages: UnifiedMessage[] = [
        createMessage({ index: 0, sender: 'Alice', content: 'What do you think?' }),
      ];
      const result = computeBidResponseRatio(messages, ['Alice']);
      expect(result).toBeUndefined();
    });

    it('returns undefined with empty messages', () => {
      const result = computeBidResponseRatio([], ['Alice', 'Bob']);
      expect(result).toBeUndefined();
    });

    it('returns undefined with fewer than 10 bids total', () => {
      const messages: UnifiedMessage[] = [
        createMessage({ index: 0, sender: 'Alice', content: 'How are you?' }),
        createMessage({ index: 1, sender: 'Bob', content: 'Good' }),
        createMessage({ index: 2, sender: 'Alice', content: 'What happened?' }),
        createMessage({ index: 3, sender: 'Bob', content: 'Nothing much' }),
        createMessage({ index: 4, sender: 'Alice', content: 'Nice?' }),
        createMessage({ index: 5, sender: 'Bob', content: 'Yeah' }),
      ];
      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeUndefined();
    });

    it('returns undefined when no person makes 5+ bids', () => {
      const messages: UnifiedMessage[] = [];
      let index = 0;
      // Create 10 messages but distribute so no one person makes 5+ bids
      for (let i = 0; i < 5; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'normal message',
          })
        );
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: 'normal message',
          })
        );
      }
      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeUndefined();
    });

    it('ignores messages from same sender in sequence', () => {
      const messages: UnifiedMessage[] = [];
      let index = 0;
      messages.push(
        createMessage({ index: index++, sender: 'Alice', content: 'What?' })
      );
      // Double text — should skip
      messages.push(
        createMessage({ index: index++, sender: 'Alice', content: 'Hello?' })
      );
      // Bob responds to first, not second
      messages.push(
        createMessage({ index: index++, sender: 'Bob', content: 'Hi' })
      );
      // Pad to reach threshold
      for (let i = 0; i < 8; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'What?',
          })
        );
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: 'Response',
          })
        );
      }
      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
    });
  });

  describe('bid detection', () => {
    it('detects question as bid', () => {
      const messages: UnifiedMessage[] = [];
      let index = 0;
      for (let i = 0; i < 10; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'What do you think about this?',
          })
        );
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: 'I think it is good',
          })
        );
      }
      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.perPerson['Alice'].bidsMade).toBe(10);
    });

    it('detects Polish disclosure starters as bid', () => {
      const messages: UnifiedMessage[] = [];
      let index = 0;
      const starters = [
        'Słuchaj, mam coś do powiedzenia',
        'Wiesz co? Dzisiaj się coś stało',
        'Pamiętasz tamtą sytuację?',
        'Wyobraź sobie co się działo',
        'Muszę ci coś powiedzieć',
      ];
      for (let i = 0; i < 10; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: starters[i % starters.length],
          })
        );
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: 'Opowiadaj',
          })
        );
      }
      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.perPerson['Alice'].bidsMade).toBe(10);
    });

    it('detects English disclosure starters as bid', () => {
      const messages: UnifiedMessage[] = [];
      let index = 0;
      const starters = [
        'Listen, I need to tell you something',
        'You know what? Something happened today',
        'I wanted to tell you about this',
        'Guess what happened to me',
        'Something happened and I need to talk',
      ];
      for (let i = 0; i < 10; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: starters[i % starters.length],
          })
        );
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: 'Tell me more',
          })
        );
      }
      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.perPerson['Alice'].bidsMade).toBe(10);
    });

    it('detects URL/link as bid', () => {
      const messages: UnifiedMessage[] = [];
      let index = 0;
      for (let i = 0; i < 10; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'Check this out: https://example.com/article',
          })
        );
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: 'Thanks for sharing',
          })
        );
      }
      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.perPerson['Alice'].bidsMade).toBe(10);
    });

    it('detects www link as bid', () => {
      const messages: UnifiedMessage[] = [];
      let index = 0;
      for (let i = 0; i < 10; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'Visit www.example.com for more info',
          })
        );
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: 'Good info',
          })
        );
      }
      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.perPerson['Alice'].bidsMade).toBe(10);
    });

    it('does not detect non-bid messages', () => {
      const messages: UnifiedMessage[] = [];
      let index = 0;
      // Create messages with no bids (no ?, no disclosure, no http/www)
      for (let i = 0; i < 10; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'Just a regular statement without question or link',
          })
        );
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: 'Ok',
          })
        );
      }
      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      // No bids at all, so result should be undefined (< 10 total bids)
      expect(result).toBeUndefined();
    });
  });

  describe('turning toward response classification', () => {
    it('classifies response with question as turning toward', () => {
      const messages: UnifiedMessage[] = [];
      let index = 0;
      for (let i = 0; i < 10; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'I went to the beach today?',
          })
        );
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: 'How was it? Did you have fun?',
          })
        );
      }
      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.perPerson['Alice'].turnedToward).toBeGreaterThan(0);
    });

    it('classifies response with word overlap as turning toward', () => {
      const messages: UnifiedMessage[] = [];
      let index = 0;
      for (let i = 0; i < 10; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'Did you hear about the concert? Was absolutely amazing and incredible',
          })
        );
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: 'Wow the concert sounded really great',
          })
        );
      }
      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.perPerson['Alice'].turnedToward).toBeGreaterThan(0);
    });

    it('classifies longer response as turning toward', () => {
      const messages: UnifiedMessage[] = [];
      let index = 0;
      for (let i = 0; i < 10; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'What?',
          })
        );
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: 'I think this is really interesting and worth discussing further',
          })
        );
      }
      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.perPerson['Alice'].turnedToward).toBeGreaterThan(0);
    });
  });

  describe('turning away response classification', () => {
    it('classifies dismissive response as turning away', () => {
      const messages: UnifiedMessage[] = [];
      let index = 0;
      const dismissals = ['spoko', 'nieważne', 'zapomnij', 'whatever', 'nevermind'];
      for (let i = 0; i < 10; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'Do you think I should do this?', // This is a bid (has ?)
          })
        );
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: dismissals[i % dismissals.length],
          })
        );
      }
      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.perPerson['Alice'].turnedAway).toBeGreaterThan(0);
    });

    it('classifies no response as turning away', () => {
      const messages: UnifiedMessage[] = [];
      let index = 0;
      for (let i = 0; i < 10; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'Do you care about this?', // Bid with ?
          })
        );
        // Alice sends 4 more messages (same sender gap > 3, window size 4: j - i <= 4)
        // Window: j = i+1,i+2,i+3,i+4 are within limit
        // So we need Bob response at i+5 or later to exceed window
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'Still waiting...',
          })
        );
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'Anyone home?',
          })
        );
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'Hello?',
          })
        );
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'Anyone?',
          })
        );
        // Bob finally responds at position i+5 (gap = 5, exceeds j - i <= 4 window)
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: 'Sorry!',
          })
        );
      }
      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.perPerson['Alice'].turnedAway).toBeGreaterThan(0);
    });

    it('classifies delayed response (4h+) as turning away', () => {
      const messages: UnifiedMessage[] = [];
      let index = 0;
      const now = Date.now();
      for (let i = 0; i < 10; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'What do you think?',
            timestamp: now + i * 1000,
          })
        );
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: 'Interesting',
            timestamp: now + i * 1000 + 5 * 60 * 60 * 1000, // 5 hours later
          })
        );
      }
      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.perPerson['Alice'].turnedAway).toBeGreaterThan(0);
    });
  });

  describe('bid success rate calculation', () => {
    it('calculates 100% bid success rate', () => {
      const messages: UnifiedMessage[] = [];
      let index = 0;
      for (let i = 0; i < 10; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'What do you think?',
          })
        );
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: 'Great idea!',
          })
        );
      }
      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.perPerson['Alice'].bidSuccessRate).toBe(100);
    });

    it('calculates 0% bid success rate', () => {
      const messages: UnifiedMessage[] = [];
      let index = 0;
      for (let i = 0; i < 10; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'What do you think?',
          })
        );
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: 'Whatever',
          })
        );
      }
      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.perPerson['Alice'].bidSuccessRate).toBe(0);
    });

    it('calculates 50% bid success rate', () => {
      const messages: UnifiedMessage[] = [];
      let index = 0;
      for (let i = 0; i < 10; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'What do you think?',
          })
        );
        if (i % 2 === 0) {
          messages.push(
            createMessage({
              index: index++,
              sender: 'Bob',
              content: 'Sounds great!',
            })
          );
        } else {
          messages.push(
            createMessage({
              index: index++,
              sender: 'Bob',
              content: 'whatever',
            })
          );
        }
      }
      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.perPerson['Alice'].bidSuccessRate).toBe(50);
    });
  });

  describe('response rate calculation', () => {
    it('calculates response rate for received bids', () => {
      const messages: UnifiedMessage[] = [];
      let index = 0;
      // Alice makes 5 bids, Bob responds with substantive answers (toward)
      // Bob gets bidsReceived++ and bidsRespondedTo++ for each toward response
      for (let i = 0; i < 5; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'What do you think about this?',
          })
        );
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: 'I totally agree with you!',  // > 5 chars → toward
          })
        );
      }
      // Bob makes 5 bids, Alice responds dismissively (away)
      // Alice does NOT get bidsReceived/bidsRespondedTo (only toward responses count)
      for (let i = 0; i < 5; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: 'What do you think about this?',
          })
        );
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'whatever',  // dismiss token < 30 chars → away
          })
        );
      }
      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      // Alice: bidsReceived=0 (no toward responses to Bob's bids), so responseRate defaults to 0
      expect(result?.perPerson['Alice'].responseRate).toBe(0);
      // Bob: bidsReceived=5, bidsRespondedTo=5, responseRate=100
      expect(result?.perPerson['Bob'].responseRate).toBe(100);
    });
  });

  describe('overall response rate and Gottman benchmark', () => {
    it('computes overall response rate above Gottman benchmark', () => {
      const messages: UnifiedMessage[] = [];
      let index = 0;
      for (let i = 0; i < 15; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'What do you think?',
          })
        );
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: 'Great question!',
          })
        );
      }
      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.overallResponseRate).toBeGreaterThanOrEqual(80);
      expect(result?.gottmanBenchmark).toBe(86);
    });

    it('computes overall response rate below Gottman benchmark', () => {
      const messages: UnifiedMessage[] = [];
      let index = 0;
      for (let i = 0; i < 20; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'What do you think?',
          })
        );
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: i < 8 ? 'Sure!' : 'whatever',
          })
        );
      }
      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.overallResponseRate).toBeLessThan(60);
    });

    it('provides appropriate interpretation for high response rate', () => {
      const messages: UnifiedMessage[] = [];
      let index = 0;
      for (let i = 0; i < 15; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'What?',
          })
        );
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: 'Great!',
          })
        );
      }
      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      expect(result?.interpretation).toContain('Wysoka');
    });

    it('provides appropriate interpretation for low response rate', () => {
      const messages: UnifiedMessage[] = [];
      let index = 0;
      for (let i = 0; i < 20; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'What?',
          })
        );
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: 'whatever',
          })
        );
      }
      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      expect(result?.interpretation).toContain('Niska');
    });
  });

  describe('handling same-sender gap', () => {
    it('finds next different sender within 3 same-sender gap', () => {
      const messages: UnifiedMessage[] = [];
      let index = 0;
      // Note: gap window is j - i <= 4, meaning up to 3 messages in between
      // Message at i+1, i+2, i+3, i+4 are all within the window
      for (let i = 0; i < 10; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'What?',
          })
        );
        // Alice double texts (message at i+1, still within window i+2 and i+3)
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'Hello?',
          })
        );
        // Bob responds at i+2 (gap of 1 same-sender message) — within window
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: 'Yes I am here now!',  // > 5 chars → classified as 'toward'
          })
        );
      }
      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.perPerson['Alice'].turnedToward).toBeGreaterThan(0);
    });

    it('ignores next sender beyond 3 message gap', () => {
      const messages: UnifiedMessage[] = [];
      let index = 0;
      for (let i = 0; i < 10; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'What?',
          })
        );
        // 5 more Alice messages (exceeds gap threshold of 4)
        for (let j = 0; j < 5; j++) {
          messages.push(
            createMessage({
              index: index++,
              sender: 'Alice',
              content: 'Still here?',
            })
          );
        }
        // Bob finally responds (beyond the 4-message window)
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: 'Sorry!',
          })
        );
      }
      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      // Should not count as turned toward due to gap
      if (result?.perPerson['Alice'].bidsMade && result.perPerson['Alice'].bidsMade > 0) {
        expect(result?.perPerson['Alice'].turnedAway).toBeGreaterThan(0);
      }
    });
  });

  describe('output structure', () => {
    it('returns properly structured BidResponseResult', () => {
      const messages: UnifiedMessage[] = [];
      let index = 0;
      for (let i = 0; i < 10; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'What do you think?',
          })
        );
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: 'Good idea!',
          })
        );
      }
      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.perPerson).toBeDefined();
      expect(result?.overallResponseRate).toBeGreaterThanOrEqual(0);
      expect(result?.overallResponseRate).toBeLessThanOrEqual(100);
      expect(result?.gottmanBenchmark).toBe(86);
      expect(result?.interpretation).toBeDefined();
      expect(typeof result?.perPerson['Alice']).toBe('object');
      expect(result?.perPerson['Alice'].bidsMade).toBeGreaterThan(0);
      expect(result?.perPerson['Alice'].turnedToward).toBeDefined();
      expect(result?.perPerson['Alice'].turnedAway).toBeDefined();
      expect(result?.perPerson['Alice'].bidsReceived).toBeDefined();
      expect(result?.perPerson['Alice'].bidsRespondedTo).toBeDefined();
      expect(result?.perPerson['Alice'].bidSuccessRate).toBeDefined();
      expect(result?.perPerson['Alice'].responseRate).toBeDefined();
    });

    it('excludes persons with < 5 bids', () => {
      const messages: UnifiedMessage[] = [];
      let index = 0;
      // Alice: 10 bids, Bob: 2 bids
      for (let i = 0; i < 10; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'What?',
          })
        );
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: 'Ok',
          })
        );
      }
      for (let i = 0; i < 2; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: 'What?',
          })
        );
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'Ok',
          })
        );
      }
      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect('Alice' in result!.perPerson).toBe(true);
      expect('Bob' in result!.perPerson).toBe(false);
    });
  });

  describe('deterministic behavior', () => {
    it('produces same result for identical input', () => {
      const createTestMessages = () => {
        const messages: UnifiedMessage[] = [];
        let index = 0;
        // Both Alice and Bob make bids so both are included in perPerson (>= 5 bids each)
        for (let i = 0; i < 6; i++) {
          messages.push(
            createMessage({
              index: index++,
              sender: 'Alice',
              content: 'What do you think about this topic?',
            })
          );
          messages.push(
            createMessage({
              index: index++,
              sender: 'Bob',
              content: 'Good point! What about the other thing?',  // bid (has ?) + toward (> 5 chars)
            })
          );
        }
        return messages;
      };

      const result1 = computeBidResponseRatio(createTestMessages(), [
        'Alice',
        'Bob',
      ]);
      const result2 = computeBidResponseRatio(createTestMessages(), [
        'Alice',
        'Bob',
      ]);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result1?.overallResponseRate).toBe(result2?.overallResponseRate);
      expect(result1?.perPerson['Alice'].bidSuccessRate).toBe(
        result2?.perPerson['Alice'].bidSuccessRate
      );
      // Both make >= 5 bids, so both are in perPerson
      expect(result1?.perPerson['Bob']).toBeDefined();
      expect(result1?.perPerson['Bob'].responseRate).toBe(
        result2?.perPerson['Bob'].responseRate
      );
    });
  });

  describe('boundary conditions', () => {
    it('exactly meets minimum 10 bids threshold', () => {
      const messages: UnifiedMessage[] = [];
      let index = 0;
      for (let i = 0; i < 10; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'What?',
          })
        );
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: 'Ok',
          })
        );
      }
      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
    });

    it('fails minimum 10 bids threshold', () => {
      const messages: UnifiedMessage[] = [];
      let index = 0;
      for (let i = 0; i < 9; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'What?',
          })
        );
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: 'Ok',
          })
        );
      }
      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeUndefined();
    });

    it('correctly handles 4 hour response window boundary', () => {
      const messages: UnifiedMessage[] = [];
      let index = 0;
      const now = Date.now();

      for (let i = 0; i < 5; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'What?',
            timestamp: now + i * 1000,
          })
        );
        // Exactly 4 hours (3h 59m 59s) — should count as turned toward
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: 'Good!',
            timestamp: now + i * 1000 + 3.999 * 60 * 60 * 1000,
          })
        );
      }

      for (let i = 0; i < 5; i++) {
        messages.push(
          createMessage({
            index: index++,
            sender: 'Alice',
            content: 'What?',
            timestamp: now + (10 + i) * 1000,
          })
        );
        // Just over 4 hours (4h 0m 1s) — should count as turned away
        messages.push(
          createMessage({
            index: index++,
            sender: 'Bob',
            content: 'Ok',
            timestamp: now + (10 + i) * 1000 + 4.001 * 60 * 60 * 1000,
          })
        );
      }

      const result = computeBidResponseRatio(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result?.perPerson['Alice'].turnedAway).toBeGreaterThan(0);
    });
  });
});
