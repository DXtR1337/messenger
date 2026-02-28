import { describe, it, expect } from 'vitest';
import { computeEmotionalGranularity, EMOTION_CATEGORY_LABELS } from '@/lib/analysis/quant/emotional-granularity';
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

describe('computeEmotionalGranularity', () => {
  describe('edge cases', () => {
    it('should return undefined with less than 2 participants', () => {
      const messages = [createMessage(0, 'Alice', 'happy sad angry afraid surprised disgusted anticipating trust frustrated affection lonely proud', Date.now())];
      const result = computeEmotionalGranularity(messages, ['Alice']);
      expect(result).toBeUndefined();
    });

    it('should return undefined with empty messages', () => {
      const result = computeEmotionalGranularity([], ['Alice', 'Bob']);
      expect(result).toBeUndefined();
    });

    it('should return undefined when participants have less than 200 words', () => {
      const messages = [
        createMessage(0, 'Alice', 'happy sad angry afraid surprised', 1000000000000),
        createMessage(1, 'Bob', 'ok yes', 1000000010000),
      ];
      const result = computeEmotionalGranularity(messages, ['Alice', 'Bob']);
      expect(result).toBeUndefined();
    });

    it('should return undefined with only 1 valid participant', () => {
      let ts = 1000000000000;
      const messages: UnifiedMessage[] = [];
      // Alice with 200+ words
      for (let i = 0; i < 50; i++) {
        messages.push(
          createMessage(i, 'Alice', 'happy sad angry afraid surprised disgusted anticipating trust', ts + i * 1000)
        );
      }
      // Bob with too few words (only 100 words)
      for (let i = 50; i < 100; i++) {
        messages.push(createMessage(i, 'Bob', 'ok yes sure', ts + i * 1000));
      }

      const result = computeEmotionalGranularity(messages, ['Alice', 'Bob']);
      expect(result).toBeUndefined();
    });
  });

  describe('Polish emotion word detection', () => {
    it('should detect Polish joy words', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 50; i++) {
        messages.push(
          createMessage(i, 'Alice', 'szczęśliwy radość cieszę uśmiech super fajnie świetnie bomba', 1000000000000 + i * 1000)
        );
      }
      for (let i = 50; i < 100; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok yes sure thing about nothing really', 1000000000000 + i * 1000)
        );
      }

      const result = computeEmotionalGranularity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].emotionalWordCount).toBeGreaterThan(0);
      expect(result!.perPerson['Alice'].categoryCounts[EMOTION_CATEGORY_LABELS['joy']]).toBeGreaterThan(0);
    });

    it('should detect Polish sadness words', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 50; i++) {
        messages.push(
          createMessage(i, 'Alice', 'smutny smutek płaczę żal tęsknię boli martwię żałosne ponuro', 1000000000000 + i * 1000)
        );
      }
      for (let i = 50; i < 100; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok yes sure thing something really important maybe', 1000000000000 + i * 1000)
        );
      }

      const result = computeEmotionalGranularity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].emotionalWordCount).toBeGreaterThan(0);
      expect(result!.perPerson['Alice'].categoryCounts[EMOTION_CATEGORY_LABELS['sadness']]).toBeGreaterThan(0);
    });

    it('should detect Polish anger words', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 50; i++) {
        messages.push(
          createMessage(i, 'Alice', 'zły złość wkurwiony wściekły irytuje denerwuje nienawidzę furia cholera', 1000000000000 + i * 1000)
        );
      }
      for (let i = 50; i < 100; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok yes sure thing about something really important here', 1000000000000 + i * 1000)
        );
      }

      const result = computeEmotionalGranularity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].emotionalWordCount).toBeGreaterThan(0);
    });

    it('should detect Polish fear words', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 50; i++) {
        messages.push(
          createMessage(i, 'Alice', 'boję strach lęk przerażony przerażenie panika nerwowy stresuje niepokój', 1000000000000 + i * 1000)
        );
      }
      for (let i = 50; i < 100; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok yes sure thing something really important maybe not', 1000000000000 + i * 1000)
        );
      }

      const result = computeEmotionalGranularity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].emotionalWordCount).toBeGreaterThan(0);
    });

    it('should detect Polish affection words', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 50; i++) {
        messages.push(
          createMessage(i, 'Alice', 'kocham lubię tęsknię miłość serdeczność ciepło blisko przytulić buzi całuję', 1000000000000 + i * 1000)
        );
      }
      for (let i = 50; i < 100; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok yes sure thing about something really important daily', 1000000000000 + i * 1000)
        );
      }

      const result = computeEmotionalGranularity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].categoryCounts[EMOTION_CATEGORY_LABELS['affection']]).toBeGreaterThan(0);
    });

    it('should detect Polish frustration words', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 50; i++) {
        messages.push(
          createMessage(i, 'Alice', 'frustracja bez sensu nie działa nie rozumiem znowu zawsze nic nie wychodzi', 1000000000000 + i * 1000)
        );
      }
      for (let i = 50; i < 100; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok yes sure thing something really important always here', 1000000000000 + i * 1000)
        );
      }

      const result = computeEmotionalGranularity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].emotionalWordCount).toBeGreaterThan(0);
    });
  });

  describe('English emotion word detection', () => {
    it('should detect English joy words', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 50; i++) {
        messages.push(
          createMessage(i, 'Alice', 'happy happiness joyful glad delighted cheerful wonderful amazing fantastic great', 1000000000000 + i * 1000)
        );
      }
      for (let i = 50; i < 100; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok sure thing about something really important maybe always', 1000000000000 + i * 1000)
        );
      }

      const result = computeEmotionalGranularity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].emotionalWordCount).toBeGreaterThan(0);
    });

    it('should detect English sadness words', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 50; i++) {
        messages.push(
          createMessage(i, 'Alice', 'sad sadness unhappy depressed miserable lonely heartbroken grief sorrow grief', 1000000000000 + i * 1000)
        );
      }
      for (let i = 50; i < 100; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok yes sure thing something really important maybe not', 1000000000000 + i * 1000)
        );
      }

      const result = computeEmotionalGranularity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].emotionalWordCount).toBeGreaterThan(0);
    });
  });

  describe('distinct category counting', () => {
    it('should count distinct emotion categories', () => {
      const messages: UnifiedMessage[] = [];
      // Alice with multiple categories
      for (let i = 0; i < 50; i++) {
        messages.push(
          createMessage(i, 'Alice', 'happy sad angry afraid surprised disgusted anticipating trust frustrated affection lonely', 1000000000000 + i * 1000)
        );
      }
      for (let i = 50; i < 100; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok yes sure thing about something really important always here', 1000000000000 + i * 1000)
        );
      }

      const result = computeEmotionalGranularity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].distinctCategories).toBeGreaterThan(1);
    });

    it('should have max 12 distinct categories', () => {
      const messages: UnifiedMessage[] = [];
      // Alice with all possible emotions
      for (let i = 0; i < 50; i++) {
        messages.push(
          createMessage(
            i,
            'Alice',
            'happy sad angry afraid surprised disgusted anticipating trust frustrated affection lonely proud',
            1000000000000 + i * 1000
          )
        );
      }
      for (let i = 50; i < 100; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok yes sure thing about something really important always here', 1000000000000 + i * 1000)
        );
      }

      const result = computeEmotionalGranularity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].distinctCategories).toBeLessThanOrEqual(12);
    });
  });

  describe('granularity score calculation', () => {
    it('should calculate score between 0-100', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 50; i++) {
        messages.push(
          createMessage(i, 'Alice', 'happy sad angry afraid surprised disgusted anticipating trust', 1000000000000 + i * 1000)
        );
      }
      for (let i = 50; i < 100; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok yes sure thing about something really important always here', 1000000000000 + i * 1000)
        );
      }

      const result = computeEmotionalGranularity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].granularityScore).toBeGreaterThanOrEqual(0);
      expect(result!.perPerson['Alice'].granularityScore).toBeLessThanOrEqual(100);
    });

    it('should increase with more distinct categories', () => {
      const messages1: UnifiedMessage[] = [];
      // One category only
      for (let i = 0; i < 50; i++) {
        messages1.push(
          createMessage(i, 'Alice', 'happy happy happy happy happy happy happy happy happy happy happy', 1000000000000 + i * 1000)
        );
      }
      for (let i = 50; i < 100; i++) {
        messages1.push(
          createMessage(i, 'Bob', 'ok yes sure thing about something really important always here', 1000000000000 + i * 1000)
        );
      }

      const messages2: UnifiedMessage[] = [];
      // Multiple categories
      for (let i = 0; i < 50; i++) {
        messages2.push(
          createMessage(i, 'Alice', 'happy sad angry afraid surprised disgusted anticipating trust frustrated affection lonely', 1000000000000 + i * 1000)
        );
      }
      for (let i = 50; i < 100; i++) {
        messages2.push(
          createMessage(i, 'Bob', 'ok yes sure thing about something really important always here', 1000000000000 + i * 1000)
        );
      }

      const result1 = computeEmotionalGranularity(messages1, ['Alice', 'Bob']);
      const result2 = computeEmotionalGranularity(messages2, ['Alice', 'Bob']);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result2!.perPerson['Alice'].granularityScore).toBeGreaterThan(
        result1!.perPerson['Alice'].granularityScore
      );
    });
  });

  describe('dominant category identification', () => {
    it('should identify dominant emotion category', () => {
      const messages: UnifiedMessage[] = [];
      // Alice mostly happy
      for (let i = 0; i < 40; i++) {
        messages.push(
          createMessage(
            i,
            'Alice',
            'happy happy happy happy happy happy happy happy happy happy',
            1000000000000 + i * 1000
          )
        );
      }
      // Alice with some sad
      for (let i = 40; i < 50; i++) {
        messages.push(
          createMessage(
            i,
            'Alice',
            'sad afraid sad afraid',
            1000000000000 + i * 1000
          )
        );
      }
      for (let i = 50; i < 100; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok yes sure thing about something really important always here', 1000000000000 + i * 1000)
        );
      }

      const result = computeEmotionalGranularity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].dominantCategory).toBe(EMOTION_CATEGORY_LABELS['joy']);
    });
  });

  describe('categoryCooccurrenceIndex', () => {
    it('should calculate co-occurrence index between 0-1', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 50; i++) {
        messages.push(
          createMessage(i, 'Alice', 'happy sad angry afraid surprised disgusted anticipating trust', 1000000000000 + i * 1000)
        );
      }
      for (let i = 50; i < 100; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok yes sure thing about something really important always here', 1000000000000 + i * 1000)
        );
      }

      const result = computeEmotionalGranularity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].categoryCooccurrenceIndex).toBeGreaterThanOrEqual(0);
      expect(result!.perPerson['Alice'].categoryCooccurrenceIndex).toBeLessThanOrEqual(1);
    });

    it('should be high when emotions co-occur frequently', () => {
      const messages: UnifiedMessage[] = [];
      // Every message has multiple emotions
      for (let i = 0; i < 50; i++) {
        messages.push(
          createMessage(i, 'Alice', 'happy sad angry afraid surprised disgusted anticipating trust frustrated affection', 1000000000000 + i * 1000)
        );
      }
      for (let i = 50; i < 100; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok yes sure thing about something really important always here', 1000000000000 + i * 1000)
        );
      }

      const result = computeEmotionalGranularity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].categoryCooccurrenceIndex).toBeGreaterThan(0.5);
    });

    it('should be low when emotions are isolated', () => {
      const messages: UnifiedMessage[] = [];
      // Each message has single emotion only, alternating categories
      for (let i = 0; i < 50; i++) {
        const emotion = ['happy', 'sad', 'angry', 'afraid', 'surprised'][i % 5];
        messages.push(
          createMessage(i, 'Alice', emotion + ' thing about really something', 1000000000000 + i * 1000)
        );
      }
      for (let i = 50; i < 100; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok yes sure thing about something really important always here', 1000000000000 + i * 1000)
        );
      }

      const result = computeEmotionalGranularity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].categoryCooccurrenceIndex).toBeLessThan(0.5);
    });
  });

  describe('granularityScoreV2 adjustment', () => {
    it('should calculate adjusted score considering co-occurrence', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 50; i++) {
        messages.push(
          createMessage(i, 'Alice', 'happy sad angry afraid surprised disgusted anticipating trust', 1000000000000 + i * 1000)
        );
      }
      for (let i = 50; i < 100; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok yes sure thing about something really important always here', 1000000000000 + i * 1000)
        );
      }

      const result = computeEmotionalGranularity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].granularityScoreV2).toBeLessThanOrEqual(
        result!.perPerson['Alice'].granularityScore
      );
    });

    it('should not go negative', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 50; i++) {
        messages.push(
          createMessage(i, 'Alice', 'happy sad angry afraid surprised disgusted anticipating trust', 1000000000000 + i * 1000)
        );
      }
      for (let i = 50; i < 100; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok yes sure thing about something really important always here', 1000000000000 + i * 1000)
        );
      }

      const result = computeEmotionalGranularity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].granularityScoreV2).toBeGreaterThanOrEqual(0);
    });
  });

  describe('higherGranularity identification', () => {
    it('should identify person with higher granularity', () => {
      const messages: UnifiedMessage[] = [];
      // Alice: high granularity (all 12 categories)
      for (let i = 0; i < 50; i++) {
        messages.push(
          createMessage(
            i,
            'Alice',
            'happy sad angry afraid surprised disgusted anticipating trust frustrated affection lonely proud thing',
            1000000000000 + i * 1000
          )
        );
      }
      // Bob: low granularity (only happy, repeated)
      for (let i = 50; i < 100; i++) {
        messages.push(
          createMessage(i, 'Bob', 'happy happy happy happy happy happy happy happy happy happy', 1000000000000 + i * 1000)
        );
      }

      const result = computeEmotionalGranularity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.higherGranularity).toBe('Alice');
    });
  });

  describe('realistic conversation', () => {
    it('should handle realistic emotional conversation', () => {
      const messages: UnifiedMessage[] = [];
      const baseTs = 1000000000000;

      const aliceMessages = [
        'Jestem szczęśliwa ale trochę smutna i samotna',
        'Czuję się samotna kiedy cię nie ma i się martwię',
        'Kocham cię tęsknię za tobą bardzo mocno',
        'Czasem się denerwuję bez powodu i się irytuje',
        'Boję się że coś złego się stanie do mnie',
      ];

      const bobMessages = [
        'Ja też mam mieszane uczucia i emocje tutaj',
        'Czuję się sfrustrowany czasami bez powodu',
        'Ale lubię cię bardzo i mam do ciebie zaufanie',
        'Nie chcę aby coś złego się stało nam tutaj',
        'Mamy się wspierać nawzajem każdego dnia zawsze',
      ];

      for (let i = 0; i < 50; i++) {
        messages.push(
          createMessage(i, 'Alice', aliceMessages[i % aliceMessages.length], baseTs + i * 2000)
        );
      }
      for (let i = 50; i < 100; i++) {
        messages.push(
          createMessage(i, 'Bob', bobMessages[(i - 50) % bobMessages.length], baseTs + i * 2000 + 1000)
        );
      }

      const result = computeEmotionalGranularity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].distinctCategories).toBeGreaterThan(1);
      expect(result!.perPerson['Bob'].distinctCategories).toBeGreaterThan(1);
    });
  });

  describe('bilingual conversations', () => {
    it('should handle mixed Polish and English emotions', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 50; i++) {
        const msg = i % 2 === 0
          ? 'happy szczęśliwy sad smutny angry zły afraid boję surprised thing'
          : 'angry zły afraid boję sad smutny happy szczęśliwy thing word';
        messages.push(
          createMessage(i, 'Alice', msg, 1000000000000 + i * 1000)
        );
      }
      for (let i = 50; i < 100; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok yes sure thing about something really important always here', 1000000000000 + i * 1000)
        );
      }

      const result = computeEmotionalGranularity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].emotionalWordCount).toBeGreaterThan(0);
    });
  });

  describe('edge case: minimum word threshold', () => {
    it('should require at least 200 words per person', () => {
      const messages: UnifiedMessage[] = [];
      // Alice with only about 80 words (below 200 threshold)
      for (let i = 0; i < 20; i++) {
        messages.push(
          createMessage(i, 'Alice', 'happy sad angry afraid', 1000000000000 + i * 1000)
        );
      }
      // Bob with 200+ words
      for (let i = 20; i < 70; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok yes sure thing about something really important always here', 1000000000000 + i * 1000)
        );
      }

      const result = computeEmotionalGranularity(messages, ['Alice', 'Bob']);
      // Should return undefined because Alice < 200 words
      expect(result).toBeUndefined();
    });

    it('should include participant with exactly 200 words', () => {
      const messages: UnifiedMessage[] = [];
      // Both with 200+ words (50 messages × 4 words each = 200)
      for (let i = 0; i < 50; i++) {
        messages.push(
          createMessage(i, 'Alice', 'happy sad angry afraid', 1000000000000 + i * 1000)
        );
      }
      for (let i = 50; i < 100; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok yes sure thing', 1000000000000 + i * 1000)
        );
      }

      const result = computeEmotionalGranularity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
    });
  });

  describe('category label mapping', () => {
    it('should map emotion categories to Polish labels', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 50; i++) {
        messages.push(
          createMessage(
            i,
            'Alice',
            'happy sad angry afraid surprised disgusted anticipating trust frustrated affection lonely proud thing',
            1000000000000 + i * 1000
          )
        );
      }
      for (let i = 50; i < 100; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok yes sure thing about something really important always here', 1000000000000 + i * 1000)
        );
      }

      const result = computeEmotionalGranularity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      // Check that category labels are Polish
      const labels = Object.keys(result!.perPerson['Alice'].categoryCounts);
      for (const label of labels) {
        expect(Object.values(EMOTION_CATEGORY_LABELS)).toContain(label);
      }
    });
  });

  describe('edge case: special characters and punctuation', () => {
    it('should handle punctuation in emotion words', () => {
      const messages: UnifiedMessage[] = [];
      for (let i = 0; i < 50; i++) {
        messages.push(
          createMessage(i, 'Alice', 'happy!!! sad... angry??? afraid!!! disgusted thing word', 1000000000000 + i * 1000)
        );
      }
      for (let i = 50; i < 100; i++) {
        messages.push(
          createMessage(i, 'Bob', 'ok yes sure thing about something really important always here', 1000000000000 + i * 1000)
        );
      }

      const result = computeEmotionalGranularity(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].emotionalWordCount).toBeGreaterThan(0);
    });
  });
});
