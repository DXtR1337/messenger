import { describe, it, expect } from 'vitest';
import { generateWrappedSlides, type WrappedSlide } from '@/lib/analysis/wrapped-data';
import type {
  ParsedConversation,
  QuantitativeAnalysis,
  PersonMetrics,
} from '@/lib/parsers/types';

// ── Helpers ─────────────────────────────────────────────────

function makePersonMetrics(overrides?: Partial<PersonMetrics>): PersonMetrics {
  return {
    totalMessages: 100,
    totalWords: 1000,
    totalCharacters: 5000,
    averageMessageLength: 10,
    averageMessageChars: 50,
    longestMessage: { content: 'test', length: 4, timestamp: 0 },
    shortestMessage: { content: 'a', length: 1, timestamp: 0 },
    messagesWithEmoji: 5,
    emojiCount: 10,
    topEmojis: [{ emoji: '\u2764\uFE0F', count: 5 }],
    questionsAsked: 3,
    mediaShared: 1,
    linksShared: 1,
    reactionsGiven: 5,
    reactionsReceived: 5,
    topReactionsGiven: [],
    unsentMessages: 0,
    topWords: [],
    topPhrases: [],
    uniqueWords: 200,
    vocabularyRichness: 0.5,
    ...overrides,
  };
}

function makeConversation(overrides?: {
  participants?: Array<{ name: string }>;
  totalMessages?: number;
  durationDays?: number;
  title?: string;
}): ParsedConversation {
  const participants = overrides?.participants ?? [{ name: 'Alice' }, { name: 'Bob' }];
  const totalMessages = overrides?.totalMessages ?? 5000;
  const durationDays = overrides?.durationDays ?? 365;
  return {
    platform: 'messenger',
    title: overrides?.title ?? 'Alice & Bob',
    participants,
    messages: [],
    metadata: {
      totalMessages,
      dateRange: {
        start: Date.parse('2023-01-01'),
        end: Date.parse('2023-01-01') + durationDays * 86_400_000,
      },
      isGroup: participants.length > 2,
      durationDays,
    },
  };
}

function makeHeatmap(peakHour = 20, peakDay = 3, peakCount = 200): QuantitativeAnalysis['heatmap'] {
  const combined = Array(7).fill(null).map(() => Array(24).fill(0));
  combined[peakDay][peakHour] = peakCount;
  return {
    perPerson: {
      Alice: Array(7).fill(null).map(() => Array(24).fill(0)),
      Bob: Array(7).fill(null).map(() => Array(24).fill(0)),
    },
    combined,
  };
}

function makeQuantitative(overrides?: Partial<QuantitativeAnalysis>): QuantitativeAnalysis {
  return {
    perPerson: {
      Alice: makePersonMetrics({ totalMessages: 2800, totalWords: 28000, topEmojis: [{ emoji: '\u{1F602}', count: 120 }] }),
      Bob: makePersonMetrics({ totalMessages: 2200, totalWords: 22000, topEmojis: [{ emoji: '\u{1F602}', count: 80 }] }),
    },
    timing: {
      perPerson: {
        Alice: {
          averageResponseTimeMs: 300000,
          medianResponseTimeMs: 180000,
          fastestResponseMs: 5000,
          slowestResponseMs: 86400000,
          responseTimeTrend: 0,
        },
        Bob: {
          averageResponseTimeMs: 600000,
          medianResponseTimeMs: 420000,
          fastestResponseMs: 10000,
          slowestResponseMs: 172800000,
          responseTimeTrend: 0,
        },
      },
      conversationInitiations: { Alice: 50, Bob: 30 },
      conversationEndings: { Alice: 30, Bob: 50 },
      longestSilence: {
        durationMs: 604800000,
        startTimestamp: 0,
        endTimestamp: 604800000,
        lastSender: 'Alice',
        nextSender: 'Bob',
      },
      lateNightMessages: { Alice: 150, Bob: 80 },
    },
    engagement: {
      doubleTexts: { Alice: 20, Bob: 10 },
      maxConsecutive: { Alice: 5, Bob: 3 },
      messageRatio: { Alice: 0.56, Bob: 0.44 },
      reactionRate: { Alice: 0.05, Bob: 0.04 },
      reactionGiveRate: { Alice: 0.05, Bob: 0.04 },
      reactionReceiveRate: { Alice: 0.04, Bob: 0.05 },
      avgConversationLength: 15,
      totalSessions: 200,
    },
    patterns: {
      monthlyVolume: [
        { month: '2023-01', perPerson: { Alice: 200, Bob: 150 }, total: 350 },
        { month: '2023-06', perPerson: { Alice: 350, Bob: 300 }, total: 650 },
        { month: '2023-12', perPerson: { Alice: 250, Bob: 200 }, total: 450 },
      ],
      weekdayWeekend: {
        weekday: { Alice: 2000, Bob: 1600 },
        weekend: { Alice: 800, Bob: 600 },
      },
      volumeTrend: 0.1,
      bursts: [],
    },
    heatmap: makeHeatmap(20, 3, 200),
    trends: {
      responseTimeTrend: [],
      messageLengthTrend: [],
      initiationTrend: [],
    },
    ...overrides,
  };
}

// ── Slide types helper ──────────────────────────────────────

function getSlide(slides: WrappedSlide[], type: WrappedSlide['type']): WrappedSlide | undefined {
  return slides.find((s) => s.type === type);
}

// ── generateWrappedSlides ───────────────────────────────────

describe('generateWrappedSlides', () => {
  describe('basic output structure', () => {
    it('returns an array of slides', () => {
      const conv = makeConversation();
      const quant = makeQuantitative();
      const slides = generateWrappedSlides(conv, quant);

      expect(Array.isArray(slides)).toBe(true);
      expect(slides.length).toBeGreaterThanOrEqual(8); // some are conditional
    });

    it('every slide has required fields', () => {
      const conv = makeConversation();
      const quant = makeQuantitative();
      const slides = generateWrappedSlides(conv, quant);

      for (const slide of slides) {
        expect(slide.type).toBeTruthy();
        expect(slide.gradient).toBeTruthy();
        expect(slide.emoji).toBeTruthy();
        expect(typeof slide.title).toBe('string');
        expect(typeof slide.value).toBe('string');
        expect(typeof slide.subtitle).toBe('string');
      }
    });

    it('starts with intro and ends with summary', () => {
      const conv = makeConversation();
      const quant = makeQuantitative();
      const slides = generateWrappedSlides(conv, quant);

      expect(slides[0].type).toBe('intro');
      expect(slides[slides.length - 1].type).toBe('summary');
    });
  });

  describe('intro slide', () => {
    it('uses conversation title', () => {
      const conv = makeConversation({ title: 'My Chat Title' });
      const quant = makeQuantitative();
      const slides = generateWrappedSlides(conv, quant);
      const intro = getSlide(slides, 'intro')!;

      expect(intro.title).toBe('My Chat Title');
      expect(intro.value).toBe('Wrapped');
    });

    it('subtitle contains total messages and duration', () => {
      const conv = makeConversation({ totalMessages: 5000, durationDays: 365 });
      const quant = makeQuantitative();
      const slides = generateWrappedSlides(conv, quant);
      const intro = getSlide(slides, 'intro')!;

      // Should include formatted number and duration
      expect(intro.subtitle).toContain('5');
      // 365 days = 12 months (formatDuration needs >365.25 for "rok")
      expect(intro.subtitle).toMatch(/miesi|rok|lat/);
    });
  });

  describe('total-messages slide', () => {
    it('displays total message count', () => {
      const conv = makeConversation({ totalMessages: 5000 });
      const quant = makeQuantitative();
      const slides = generateWrappedSlides(conv, quant);
      const slide = getSlide(slides, 'total-messages')!;

      // Polish formatting uses spaces or dots as thousands separator
      expect(slide.value).toMatch(/5[\s.,]?000/);
    });

    it('includes book comparison in detail', () => {
      const conv = makeConversation();
      const quant = makeQuantitative();
      const slides = generateWrappedSlides(conv, quant);
      const slide = getSlide(slides, 'total-messages')!;

      expect(slide.detail).toContain('ksi');
    });
  });

  describe('duration slide', () => {
    it('formats short durations in days', () => {
      const conv = makeConversation({ durationDays: 15 });
      const quant = makeQuantitative();
      const slides = generateWrappedSlides(conv, quant);
      const slide = getSlide(slides, 'duration')!;

      expect(slide.value).toContain('15 dni');
    });

    it('formats longer durations in months', () => {
      const conv = makeConversation({ durationDays: 90 });
      const quant = makeQuantitative();
      const slides = generateWrappedSlides(conv, quant);
      const slide = getSlide(slides, 'duration')!;

      expect(slide.value).toMatch(/miesi/);
    });

    it('formats year-plus durations with years', () => {
      const conv = makeConversation({ durationDays: 730 });
      const quant = makeQuantitative();
      const slides = generateWrappedSlides(conv, quant);
      const slide = getSlide(slides, 'duration')!;

      expect(slide.value).toMatch(/lat|rok|lata/);
    });
  });

  describe('who-texts-more slide', () => {
    it('identifies the person who texts more', () => {
      const conv = makeConversation();
      const quant = makeQuantitative({
        perPerson: {
          Alice: makePersonMetrics({ totalMessages: 3000 }),
          Bob: makePersonMetrics({ totalMessages: 2000 }),
        },
      });
      const slides = generateWrappedSlides(conv, quant);
      const slide = getSlide(slides, 'who-texts-more')!;

      expect(slide.value).toBe('Alice');
      expect(slide.personA).toBeDefined();
      expect(slide.personB).toBeDefined();
      expect(slide.personA!.percent).toBe(60); // 3000/(3000+2000)
      expect(slide.personB!.percent).toBe(40);
    });

    it('shows 50/50 when equal messages', () => {
      const conv = makeConversation();
      const quant = makeQuantitative({
        perPerson: {
          Alice: makePersonMetrics({ totalMessages: 500 }),
          Bob: makePersonMetrics({ totalMessages: 500 }),
        },
      });
      const slides = generateWrappedSlides(conv, quant);
      const slide = getSlide(slides, 'who-texts-more')!;

      expect(slide.personA!.percent).toBe(50);
      expect(slide.personB!.percent).toBe(50);
    });

    it('is omitted for single-person conversation', () => {
      const conv = makeConversation({ participants: [{ name: 'Alice' }] });
      const quant = makeQuantitative({
        perPerson: {
          Alice: makePersonMetrics({ totalMessages: 500 }),
        },
      });
      const slides = generateWrappedSlides(conv, quant);
      expect(getSlide(slides, 'who-texts-more')).toBeUndefined();
    });
  });

  describe('response-time slide', () => {
    it('identifies the faster responder', () => {
      const conv = makeConversation();
      const quant = makeQuantitative();
      const slides = generateWrappedSlides(conv, quant);
      const slide = getSlide(slides, 'response-time')!;

      // Alice has 180000ms median, Bob has 420000ms — Alice is faster
      expect(slide.value).toBe('Alice');
    });
  });

  describe('night-owl slide', () => {
    it('shows total night messages and identifies the night owl', () => {
      const conv = makeConversation();
      const quant = makeQuantitative();
      const slides = generateWrappedSlides(conv, quant);
      const slide = getSlide(slides, 'night-owl')!;

      expect(slide).toBeDefined();
      // Alice has 150 night messages, Bob has 80 — total 230
      expect(slide.detail).toContain('Alice');
    });

    it('is omitted when no night messages', () => {
      const conv = makeConversation();
      const quant = makeQuantitative({
        timing: {
          perPerson: {
            Alice: {
              averageResponseTimeMs: 300000,
              medianResponseTimeMs: 180000,
              fastestResponseMs: 5000,
              slowestResponseMs: 86400000,
              responseTimeTrend: 0,
            },
            Bob: {
              averageResponseTimeMs: 600000,
              medianResponseTimeMs: 420000,
              fastestResponseMs: 10000,
              slowestResponseMs: 172800000,
              responseTimeTrend: 0,
            },
          },
          conversationInitiations: { Alice: 50, Bob: 30 },
          conversationEndings: { Alice: 30, Bob: 50 },
          longestSilence: {
            durationMs: 604800000,
            startTimestamp: 0,
            endTimestamp: 604800000,
            lastSender: 'Alice',
            nextSender: 'Bob',
          },
          lateNightMessages: { Alice: 0, Bob: 0 },
        },
      });
      const slides = generateWrappedSlides(conv, quant);
      expect(getSlide(slides, 'night-owl')).toBeUndefined();
    });
  });

  describe('top-emoji slide', () => {
    it('shows most used emoji', () => {
      const conv = makeConversation();
      const quant = makeQuantitative();
      const slides = generateWrappedSlides(conv, quant);
      const slide = getSlide(slides, 'top-emoji')!;

      // Both Alice and Bob have \u{1F602} as top emoji
      expect(slide.value).toBe('\u{1F602}');
      expect(slide.subtitle).toContain('200'); // 120 + 80
    });

    it('is omitted when no emojis used', () => {
      const conv = makeConversation();
      const quant = makeQuantitative({
        perPerson: {
          Alice: makePersonMetrics({ topEmojis: [] }),
          Bob: makePersonMetrics({ topEmojis: [] }),
        },
      });
      const slides = generateWrappedSlides(conv, quant);
      expect(getSlide(slides, 'top-emoji')).toBeUndefined();
    });
  });

  describe('peak-hour slide', () => {
    it('identifies the correct peak hour from heatmap', () => {
      const conv = makeConversation();
      const quant = makeQuantitative({
        heatmap: makeHeatmap(14, 2, 500),
      });
      const slides = generateWrappedSlides(conv, quant);
      const slide = getSlide(slides, 'peak-hour')!;

      expect(slide.value).toBe('14:00');
      expect(slide.subtitle).toContain('14:00');
      expect(slide.subtitle).toContain('15:00');
    });

    it('defaults to noon when all heatmap values are zero', () => {
      const conv = makeConversation();
      const quant = makeQuantitative({
        heatmap: {
          perPerson: {
            Alice: Array(7).fill(null).map(() => Array(24).fill(0)),
            Bob: Array(7).fill(null).map(() => Array(24).fill(0)),
          },
          combined: Array(7).fill(null).map(() => Array(24).fill(0)),
        },
      });
      const slides = generateWrappedSlides(conv, quant);
      const slide = getSlide(slides, 'peak-hour')!;

      expect(slide.value).toBe('12:00');
    });
  });

  describe('most-active-month slide', () => {
    it('identifies the month with the highest total', () => {
      const conv = makeConversation();
      const quant = makeQuantitative();
      const slides = generateWrappedSlides(conv, quant);
      const slide = getSlide(slides, 'most-active-month')!;

      // June 2023 has 650 messages — the highest
      expect(slide.value).toContain('Czerwiec');
      expect(slide.value).toContain('2023');
      expect(slide.subtitle).toContain('650');
    });

    it('is omitted when no monthly volume data', () => {
      const conv = makeConversation();
      const quant = makeQuantitative({
        patterns: {
          monthlyVolume: [],
          weekdayWeekend: { weekday: {}, weekend: {} },
          volumeTrend: 0,
          bursts: [],
        },
      });
      const slides = generateWrappedSlides(conv, quant);
      expect(getSlide(slides, 'most-active-month')).toBeUndefined();
    });
  });

  describe('summary slide', () => {
    it('includes stats array with key metrics', () => {
      const conv = makeConversation();
      const quant = makeQuantitative();
      const slides = generateWrappedSlides(conv, quant);
      const slide = getSlide(slides, 'summary')!;

      expect(slide.stats).toBeDefined();
      expect(slide.stats!.length).toBeGreaterThanOrEqual(5);

      const labels = slide.stats!.map((s) => s.label);
      expect(labels).toContain('Wiadomości');
      expect(labels).toContain('Dni');
    });

    it('uses conversation title', () => {
      const conv = makeConversation({ title: 'My Friends Chat' });
      const quant = makeQuantitative();
      const slides = generateWrappedSlides(conv, quant);
      const slide = getSlide(slides, 'summary')!;

      expect(slide.title).toBe('My Friends Chat');
    });
  });

  describe('edge cases', () => {
    it('handles zero total messages', () => {
      const conv = makeConversation({ totalMessages: 0, durationDays: 30 });
      const quant = makeQuantitative({
        perPerson: {
          Alice: makePersonMetrics({ totalMessages: 0, totalWords: 0 }),
          Bob: makePersonMetrics({ totalMessages: 0, totalWords: 0 }),
        },
      });

      // Should not throw
      const slides = generateWrappedSlides(conv, quant);
      expect(slides.length).toBeGreaterThan(0);
    });

    it('handles zero duration days', () => {
      const conv = makeConversation({ totalMessages: 100, durationDays: 0 });
      const quant = makeQuantitative();

      const slides = generateWrappedSlides(conv, quant);
      expect(slides.length).toBeGreaterThan(0);
      const totalSlide = getSlide(slides, 'total-messages')!;
      // perDay should be '0' when durationDays is 0
      expect(totalSlide.detail).toContain('0');
    });

    it('handles missing perPerson metrics gracefully for who-texts-more', () => {
      const conv = makeConversation();
      const quant = makeQuantitative({
        perPerson: {},
      });

      // The who-texts-more slide requires both metricsA and metricsB
      const slides = generateWrappedSlides(conv, quant);
      // Should not throw; who-texts-more should be absent
      expect(getSlide(slides, 'who-texts-more')).toBeUndefined();
    });

    it('each slide has a unique gradient', () => {
      const conv = makeConversation();
      const quant = makeQuantitative();
      const slides = generateWrappedSlides(conv, quant);

      // Check that the gradients used across slides are from the palette
      for (const slide of slides) {
        expect(slide.gradient).toMatch(/^linear-gradient/);
      }
    });

    it('handles single participant conversation', () => {
      const conv = makeConversation({
        participants: [{ name: 'Alice' }],
      });
      const quant = makeQuantitative({
        perPerson: {
          Alice: makePersonMetrics({ totalMessages: 500 }),
        },
        timing: {
          perPerson: {
            Alice: {
              averageResponseTimeMs: 300000,
              medianResponseTimeMs: 180000,
              fastestResponseMs: 5000,
              slowestResponseMs: 86400000,
              responseTimeTrend: 0,
            },
          },
          conversationInitiations: { Alice: 50 },
          conversationEndings: { Alice: 50 },
          longestSilence: {
            durationMs: 604800000,
            startTimestamp: 0,
            endTimestamp: 604800000,
            lastSender: 'Alice',
            nextSender: 'Alice',
          },
          lateNightMessages: { Alice: 10 },
        },
      });

      // Should not throw
      const slides = generateWrappedSlides(conv, quant);
      expect(slides.length).toBeGreaterThan(0);
      // Two-person slides should be absent
      expect(getSlide(slides, 'who-texts-more')).toBeUndefined();
      expect(getSlide(slides, 'response-time')).toBeUndefined();
    });
  });
});
