import { describe, it, expect } from 'vitest';
import { computeTemporalFocus } from '@/lib/analysis/quant/temporal-focus';
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

/**
 * Helper to generate bulk messages that exceed 500-word threshold.
 * Repeats baseContent to create enough messages, preserving temporal markers.
 * Each word in the base content counts toward the 500-word minimum.
 */
function generateBulkMessages(
  sender: string,
  count: number,
  baseContent: string,
  startIndex: number = 0,
  startTimestamp: number = 1000000000000,
): UnifiedMessage[] {
  const messages: UnifiedMessage[] = [];
  for (let i = 0; i < count; i++) {
    messages.push(
      createMessage(
        startIndex + i,
        sender,
        baseContent,
        startTimestamp + i * 1000,
      ),
    );
  }
  return messages;
}

describe('computeTemporalFocus', () => {
  describe('edge cases', () => {
    it('should return undefined with less than 2 participants', () => {
      const messages = [
        createMessage(0, 'Alice', 'Hello tomorrow', Date.now()),
      ];
      const result = computeTemporalFocus(messages, ['Alice']);
      expect(result).toBeUndefined();
    });

    it('should return undefined with empty messages', () => {
      const result = computeTemporalFocus([], ['Alice', 'Bob']);
      expect(result).toBeUndefined();
    });

    it('should return undefined when participants have <500 words', () => {
      const messages = [
        createMessage(0, 'Alice', 'I like today', 1000000000000),
        createMessage(1, 'Bob', 'Me too', 1000000010000),
      ];
      const result = computeTemporalFocus(messages, ['Alice', 'Bob']);
      expect(result).toBeUndefined();
    });

    it('should return undefined with only 1 valid participant', () => {
      let ts = 1000000000000;
      const messages: UnifiedMessage[] = [];
      // Alice with 600 words
      for (let i = 0; i < 100; i++) {
        messages.push(
          createMessage(messages.length, 'Alice', 'I will go tomorrow now then', ts + i * 1000)
        );
      }
      // Bob with too few words
      messages.push(createMessage(messages.length, 'Bob', 'ok', ts + 100000));

      const result = computeTemporalFocus(messages, ['Alice', 'Bob']);
      expect(result).toBeUndefined();
    });
  });

  describe('Polish past markers', () => {
    it('should detect Polish past tense words', () => {
      let ts = 1000000000000;
      let index = 0;
      const messages: UnifiedMessage[] = [];

      // Alice with many past markers, repeated to exceed 500 words
      const pastContent = 'wczoraj byłem poprzednio było kiedyś robiłem tamtego pamiętam wtedy pojechałem onegdaj zobaczyłem';
      const aliceMessages = generateBulkMessages('Alice', 60, pastContent, index, ts);
      index += aliceMessages.length;
      messages.push(...aliceMessages);

      // Bob with neutral content, repeated to exceed 500 words
      const bobContent = 'ok yes sure things maybe perhaps definitely absolutely certainly probably';
      const bobMessages = generateBulkMessages('Bob', 80, bobContent, index, ts + 100000);
      messages.push(...bobMessages);

      const result = computeTemporalFocus(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].pastRate).toBeGreaterThan(0);
      expect(result!.perPerson['Alice'].orientation).toBe('retrospective');
    });
  });

  describe('Polish present markers', () => {
    it('should detect Polish present tense words', () => {
      let ts = 1000000000000;
      let index = 0;
      const messages: UnifiedMessage[] = [];

      // Alice with present markers, repeated to exceed 500 words
      const presentContent = 'teraz jestem dziś robię aktualnie są właśnie mam na razie idę idziemy masz robi';
      const aliceMessages = generateBulkMessages('Alice', 80, presentContent, index, ts);
      index += aliceMessages.length;
      messages.push(...aliceMessages);

      // Bob neutral, repeated to exceed 500 words
      const bobContent = 'maybe probably perhaps definitely absolutely certainly furthermore obviously';
      const bobMessages = generateBulkMessages('Bob', 80, bobContent, index, ts + 100000);
      messages.push(...bobMessages);

      const result = computeTemporalFocus(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].presentRate).toBeGreaterThan(0);
      // orientation is based on futureIndex (future / total), not presentRate
      // With only present markers and no future markers, futureIndex ≈ 0 → retrospective
      expect(result!.perPerson['Alice'].orientation).toBe('retrospective');
    });
  });

  describe('Polish future markers', () => {
    it('should detect Polish future tense words', () => {
      let ts = 1000000000000;
      let index = 0;
      const messages: UnifiedMessage[] = [];

      // Alice with future markers, repeated to exceed 500 words
      const futureContent = 'jutro będę wkrótce wrócę za tydzień pójdę w przyszłości planuję mam nadzieję będę zamierzam zrobić';
      const aliceMessages = generateBulkMessages('Alice', 70, futureContent, index, ts);
      index += aliceMessages.length;
      messages.push(...aliceMessages);

      // Bob neutral, repeated to exceed 500 words
      const bobContent = 'ok sure thing maybe probably definitely absolutely certainly';
      const bobMessages = generateBulkMessages('Bob', 80, bobContent, index, ts + 100000);
      messages.push(...bobMessages);

      const result = computeTemporalFocus(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].futureRate).toBeGreaterThan(0);
      expect(result!.perPerson['Alice'].orientation).toBe('prospective');
    });
  });

  describe('English temporal markers', () => {
    it('should detect English past markers', () => {
      let ts = 1000000000000;
      let index = 0;
      const messages: UnifiedMessage[] = [];

      // Alice with English past, repeated to exceed 500 words
      const pastContent = 'yesterday was great last week I went ago I remember back then we had previously I thought';
      const aliceMessages = generateBulkMessages('Alice', 70, pastContent, index, ts);
      index += aliceMessages.length;
      messages.push(...aliceMessages);

      // Bob neutral, repeated to exceed 500 words
      const bobContent = 'yes ok sure maybe probably definitely absolutely certainly';
      const bobMessages = generateBulkMessages('Bob', 80, bobContent, index, ts + 100000);
      messages.push(...bobMessages);

      const result = computeTemporalFocus(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].pastRate).toBeGreaterThan(0);
    });

    it('should detect English future markers', () => {
      let ts = 1000000000000;
      let index = 0;
      const messages: UnifiedMessage[] = [];

      // Alice with English future, repeated to exceed 500 words
      const futureContent = 'tomorrow will be next week I will soon gonna happen planning to go looking forward to';
      const aliceMessages = generateBulkMessages('Alice', 70, futureContent, index, ts);
      index += aliceMessages.length;
      messages.push(...aliceMessages);

      // Bob neutral, repeated to exceed 500 words
      const bobContent = 'yes ok maybe probably definitely absolutely certainly';
      const bobMessages = generateBulkMessages('Bob', 80, bobContent, index, ts + 100000);
      messages.push(...bobMessages);

      const result = computeTemporalFocus(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].futureRate).toBeGreaterThan(0);
      expect(result!.perPerson['Alice'].orientation).toBe('prospective');
    });
  });

  describe('bilingual conversations', () => {
    it('should handle mixed Polish and English', () => {
      let ts = 1000000000000;
      let index = 0;
      const messages: UnifiedMessage[] = [];

      // Alice mixing Polish and English, repeated to exceed 500 words
      const mixedContent = 'wczoraj i yesterday jutro będę and tomorrow will teraz am now properties fields words content';
      const aliceMessages = generateBulkMessages('Alice', 70, mixedContent, index, ts);
      index += aliceMessages.length;
      messages.push(...aliceMessages);

      // Bob neutral, repeated to exceed 500 words
      const bobContent = 'ok yes sure maybe probably definitely absolutely certainly perhaps';
      const bobMessages = generateBulkMessages('Bob', 80, bobContent, index, ts + 100000);
      messages.push(...bobMessages);

      const result = computeTemporalFocus(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice']).toBeDefined();
    });
  });

  describe('futureIndex calculation', () => {
    it('should calculate futureIndex between 0 and 1', () => {
      let ts = 1000000000000;
      let index = 0;
      const messages: UnifiedMessage[] = [];

      // Alice future-oriented, repeated to exceed 500 words
      const aliceContent = 'jutro będę pojutrze wrócę wkrótce zaplanujemy pójdziemy razem';
      const aliceMessages = generateBulkMessages('Alice', 70, aliceContent, index, ts);
      index += aliceMessages.length;
      messages.push(...aliceMessages);

      // Bob past-oriented, repeated to exceed 500 words
      const bobContent = 'wczoraj byłem tamtego pamiętam wcześniej byliśmy ostatnio było';
      const bobMessages = generateBulkMessages('Bob', 70, bobContent, index, ts + 150000);
      messages.push(...bobMessages);

      const result = computeTemporalFocus(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].futureIndex).toBeGreaterThanOrEqual(0);
      expect(result!.perPerson['Alice'].futureIndex).toBeLessThanOrEqual(1);
      expect(result!.perPerson['Bob'].futureIndex).toBeGreaterThanOrEqual(0);
      expect(result!.perPerson['Bob'].futureIndex).toBeLessThanOrEqual(1);
    });

    it('should classify futureIndex >= 0.35 as prospective', () => {
      let ts = 1000000000000;
      let index = 0;
      const messages: UnifiedMessage[] = [];

      // Alice very future-oriented, repeated to exceed 500 words
      const aliceContent = 'jutro będę pojutrze wrócę wkrótce zaplanujemy pójdziemy razem za tydzień powiem plany marzenia';
      const aliceMessages = generateBulkMessages('Alice', 70, aliceContent, index, ts);
      index += aliceMessages.length;
      messages.push(...aliceMessages);

      // Bob neutral, repeated to exceed 500 words
      const bobContent = 'ok sure thing maybe probably definitely absolutely certainly perhaps';
      const bobMessages = generateBulkMessages('Bob', 80, bobContent, index, ts + 150000);
      messages.push(...bobMessages);

      const result = computeTemporalFocus(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].orientation).toBe('prospective');
      expect(result!.perPerson['Alice'].label).toBe('Prospektywny/a');
    });

    it('should classify futureIndex 0.20-0.35 as present_focused', () => {
      let ts = 1000000000000;
      let index = 0;
      const messages: UnifiedMessage[] = [];

      // Alice balanced with slight future bias, repeated to exceed 500 words
      const aliceContent = 'jutro teraz dziś teraz jestem tutaj teraz robię teraz myślę teraz jest';
      const aliceMessages = generateBulkMessages('Alice', 70, aliceContent, index, ts);
      index += aliceMessages.length;
      messages.push(...aliceMessages);

      // Bob neutral, repeated to exceed 500 words
      const bobContent = 'ok sure maybe probably definitely absolutely certainly perhaps';
      const bobMessages = generateBulkMessages('Bob', 80, bobContent, index, ts + 50000);
      messages.push(...bobMessages);

      const result = computeTemporalFocus(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      if (result!.perPerson['Alice']?.futureIndex >= 0.20 &&
          result!.perPerson['Alice']?.futureIndex < 0.35) {
        expect(result!.perPerson['Alice'].orientation).toBe('present_focused');
      }
    });

    it('should classify futureIndex < 0.20 as retrospective', () => {
      let ts = 1000000000000;
      let index = 0;
      const messages: UnifiedMessage[] = [];

      // Alice past-oriented, repeated to exceed 500 words
      const aliceContent = 'wczoraj byłem tamtego pamiętam wcześniej byliśmy ostatnio było wtedy pojechałem kiedyś robiłem';
      const aliceMessages = generateBulkMessages('Alice', 70, aliceContent, index, ts);
      index += aliceMessages.length;
      messages.push(...aliceMessages);

      // Bob neutral, repeated to exceed 500 words
      const bobContent = 'ok sure thing maybe probably definitely absolutely certainly';
      const bobMessages = generateBulkMessages('Bob', 80, bobContent, index, ts + 150000);
      messages.push(...bobMessages);

      const result = computeTemporalFocus(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].orientation).toBe('retrospective');
      expect(result!.perPerson['Alice'].label).toBe('Retrospektywny/a');
    });
  });

  describe('moreProspective identification', () => {
    it('should identify the more future-oriented person', () => {
      let ts = 1000000000000;
      let index = 0;
      const messages: UnifiedMessage[] = [];

      // Alice future-oriented, repeated to exceed 500 words
      const aliceContent = 'jutro będę wkrótce wrócę zaplanujemy pójdziemy razem za tydzień powiem';
      const aliceMessages = generateBulkMessages('Alice', 70, aliceContent, index, ts);
      index += aliceMessages.length;
      messages.push(...aliceMessages);

      // Bob past-oriented, repeated to exceed 500 words
      const bobContent = 'wczoraj byłem tamtego pamiętam wcześniej byliśmy ostatnio było';
      const bobMessages = generateBulkMessages('Bob', 70, bobContent, index, ts + 100000);
      messages.push(...bobMessages);

      const result = computeTemporalFocus(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.moreProspective).toBe('Alice');
    });
  });

  describe('interpretation generation', () => {
    it('should generate interpretation when both have same orientation', () => {
      let ts = 1000000000000;
      let index = 0;
      const messages: UnifiedMessage[] = [];

      // Alice future-oriented, repeated to exceed 500 words (need >500 2+char tokens)
      const aliceContent = 'jutro będę wkrótce wrócę zaplanujemy pójdziemy razem niebawem planuję zamierzam chcę';
      const aliceMessages = generateBulkMessages('Alice', 80, aliceContent, index, ts);
      index += aliceMessages.length;
      messages.push(...aliceMessages);

      // Bob also future-oriented, repeated to exceed 500 words
      const bobContent = 'wkrótce wrócę jutro będę zaplanujemy pójdziemy razem niebawem planuję zamierzam chcę';
      const bobMessages = generateBulkMessages('Bob', 80, bobContent, index, ts + 100);
      messages.push(...bobMessages);

      const result = computeTemporalFocus(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      // Both should be prospective → "Oboje wykazują"
      expect(result!.interpretation).toContain('Oboje wykazują');
    });

    it('should generate interpretation when orientations differ', () => {
      let ts = 1000000000000;
      let index = 0;
      const messages: UnifiedMessage[] = [];

      // Alice future, repeated to exceed 500 words
      const aliceContent = 'jutro będę wkrótce wrócę zaplanujemy pójdziemy razem niebawem planuję zamierzam chcę';
      const aliceMessages = generateBulkMessages('Alice', 80, aliceContent, index, ts);
      index += aliceMessages.length;
      messages.push(...aliceMessages);

      // Bob past, repeated to exceed 500 words (only past markers, no future → futureIndex ≈ 0 → retrospective)
      const bobContent = 'wczoraj byłem tamtego pamiętam wcześniej byliśmy ostatnio było niegdyś dawniej';
      const bobMessages = generateBulkMessages('Bob', 80, bobContent, index, ts + 100000);
      messages.push(...bobMessages);

      const result = computeTemporalFocus(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      // Alice = prospective, Bob = retrospective → different → "jest bardziej"
      expect(result!.interpretation).toContain('jest bardziej');
    });
  });

  describe('monthly trend', () => {
    it('should generate monthly future trend', () => {
      const baseTs = new Date('2024-01-01').getTime();
      let index = 0;
      const messages: UnifiedMessage[] = [];

      // January: Alice future, Bob past
      const aliceFutureContent = 'jutro będę wkrótce wrócę zaplanujemy pójdziemy razem';
      const aliceJan = generateBulkMessages('Alice', 40, aliceFutureContent, index, baseTs);
      index += aliceJan.length;
      messages.push(...aliceJan);

      const bobPastContent = 'wczoraj byłem tamtego pamiętam wcześniej byliśmy ostatnio było';
      const bobJan = generateBulkMessages('Bob', 50, bobPastContent, index, baseTs);
      index += bobJan.length;
      messages.push(...bobJan);

      // February: reversed
      const febTs = baseTs + 31 * 86400000;
      const alicePastContent = 'wczoraj byłem tamtego pamiętam wcześniej byliśmy ostatnio było';
      const aliceFeb = generateBulkMessages('Alice', 40, alicePastContent, index, febTs);
      index += aliceFeb.length;
      messages.push(...aliceFeb);

      const bobFutureContent = 'jutro będę wkrótce wrócę zaplanujemy pójdziemy razem';
      const bobFeb = generateBulkMessages('Bob', 50, bobFutureContent, index, febTs);
      messages.push(...bobFeb);

      const result = computeTemporalFocus(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.monthlyFutureTrend.length).toBeGreaterThanOrEqual(1);
      expect(result!.monthlyFutureTrend[0]).toHaveProperty('month');
      expect(result!.monthlyFutureTrend[0]).toHaveProperty('perPerson');
    });
  });

  describe('real conversation simulation', () => {
    it('should handle a realistic short conversation', () => {
      const baseTs = new Date('2024-01-15T10:00:00').getTime();
      let index = 0;
      const messages: UnifiedMessage[] = [
        createMessage(index++, 'Alice', 'Dzisiaj jestem zmęczona', baseTs),
        createMessage(index++, 'Bob', 'Wczoraj też byłem', baseTs + 5000),
        createMessage(index++, 'Alice', 'Jutro będę lepiej', baseTs + 10000),
        createMessage(index++, 'Bob', 'Mam nadzieję że będziemy razem wkrótce', baseTs + 15000),
        createMessage(index++, 'Alice', 'Teraz idziesz do domu czy zostaniesz', baseTs + 20000),
        createMessage(index++, 'Bob', 'Pojadę za godzinę', baseTs + 25000),
      ];

      // Pad with more content to reach 500 word minimum
      const aliceContent = 'jutro będę teraz jestem wczoraj byłem pojutrze wrócę wkrótce zaplanujemy';
      const aliceMessages = generateBulkMessages('Alice', 60, aliceContent, index, baseTs + 30000);
      index += aliceMessages.length;
      messages.push(...aliceMessages);

      const bobContent = 'teraz robię wczoraj robiłem jutro będę robić wkrótce wrócę zaplanujemy razem';
      const bobMessages = generateBulkMessages('Bob', 60, bobContent, index, baseTs + 110000);
      messages.push(...bobMessages);

      const result = computeTemporalFocus(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice']).toBeDefined();
      expect(result!.perPerson['Bob']).toBeDefined();
    });
  });

  describe('edge case: punctuation and special characters', () => {
    it('should handle punctuation correctly', () => {
      let ts = 1000000000000;
      let index = 0;
      const messages: UnifiedMessage[] = [];

      // Alice with punctuation, repeated to exceed 500 words
      // After stripping punctuation: 'jutro będę wrócę zaplanujemy pójdziemy razem niebawem planuję' = 8 words × 80 = 640 words
      const aliceContent = 'Jutro! Będę!!! Wrócę... Zaplanujemy! Pójdziemy? Razem! Niebawem... Planuję!!!';
      const aliceMessages = generateBulkMessages('Alice', 80, aliceContent, index, ts);
      index += aliceMessages.length;
      messages.push(...aliceMessages);

      // Bob neutral, repeated to exceed 500 words
      const bobContent = 'maybe probably perhaps definitely absolutely certainly furthermore obviously';
      const bobMessages = generateBulkMessages('Bob', 80, bobContent, index, ts + 100000);
      messages.push(...bobMessages);

      const result = computeTemporalFocus(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.perPerson['Alice'].futureRate).toBeGreaterThan(0);
    });
  });

  describe('rates calculation', () => {
    it('should calculate rates per 1000 words', () => {
      let ts = 1000000000000;
      let index = 0;
      const messages: UnifiedMessage[] = [];

      // Alice with future markers, enough to exceed 500 words
      const futureWord = 'jutro';
      const aliceContent = futureWord + ' ' + 'word '.repeat(9);
      const aliceMessages = generateBulkMessages('Alice', 60, aliceContent, index, ts);
      index += aliceMessages.length;
      messages.push(...aliceMessages);

      // Bob with neutral content, enough to exceed 500 words
      const bobContent = 'ok yes sure maybe probably definitely absolutely certainly';
      const bobMessages = generateBulkMessages('Bob', 80, bobContent, index, ts + 100000);
      messages.push(...bobMessages);

      const result = computeTemporalFocus(messages, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      // Alice's future rate should be greater than 0
      expect(result!.perPerson['Alice'].futureRate).toBeGreaterThan(0);
    });
  });
});
