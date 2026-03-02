import { describe, it, expect } from 'vitest';
import { sampleMessages, buildQuantitativeContext } from '@/lib/analysis/qualitative';
import type {
  ParsedConversation,
  QuantitativeAnalysis,
  UnifiedMessage,
  Participant,
  PersonMetrics,
} from '@/lib/parsers/types';

// ── Helpers ─────────────────────────────────────────────────

function makeMsg(
  index: number,
  sender: string,
  content: string,
  timestamp: number,
  overrides?: Partial<UnifiedMessage>,
): UnifiedMessage {
  return {
    index,
    sender,
    content,
    timestamp,
    type: 'text' as const,
    reactions: [],
    hasMedia: false,
    hasLink: false,
    isUnsent: false,
    ...overrides,
  };
}

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

function makeQuantitative(overrides?: Partial<QuantitativeAnalysis>): QuantitativeAnalysis {
  return {
    perPerson: {
      Alice: makePersonMetrics({ totalMessages: 100 }),
      Bob: makePersonMetrics({ totalMessages: 80 }),
    },
    timing: {
      perPerson: {
        Alice: {
          averageResponseTimeMs: 60000,
          medianResponseTimeMs: 45000,
          fastestResponseMs: 5000,
          slowestResponseMs: 3600000,
          responseTimeTrend: 0,
        },
        Bob: {
          averageResponseTimeMs: 120000,
          medianResponseTimeMs: 90000,
          fastestResponseMs: 10000,
          slowestResponseMs: 7200000,
          responseTimeTrend: 0,
        },
      },
      conversationInitiations: { Alice: 10, Bob: 8 },
      conversationEndings: { Alice: 8, Bob: 10 },
      longestSilence: {
        durationMs: 604800000,
        startTimestamp: 0,
        endTimestamp: 604800000,
        lastSender: 'Alice',
        nextSender: 'Bob',
      },
      lateNightMessages: { Alice: 5, Bob: 3 },
    },
    engagement: {
      doubleTexts: { Alice: 2, Bob: 1 },
      maxConsecutive: { Alice: 3, Bob: 2 },
      messageRatio: { Alice: 0.55, Bob: 0.45 },
      reactionRate: { Alice: 0.05, Bob: 0.0625 },
      reactionGiveRate: { Alice: 0.05, Bob: 0.0625 },
      reactionReceiveRate: { Alice: 0.05, Bob: 0.0625 },
      avgConversationLength: 10,
      totalSessions: 20,
    },
    patterns: {
      monthlyVolume: [
        { month: '2024-01', perPerson: { Alice: 50, Bob: 40 }, total: 90 },
        { month: '2024-02', perPerson: { Alice: 50, Bob: 40 }, total: 90 },
      ],
      weekdayWeekend: {
        weekday: { Alice: 70, Bob: 60 },
        weekend: { Alice: 30, Bob: 20 },
      },
      volumeTrend: 0,
      bursts: [],
    },
    heatmap: {
      perPerson: {
        Alice: Array(7).fill(null).map(() => Array(24).fill(0)),
        Bob: Array(7).fill(null).map(() => Array(24).fill(0)),
      },
      combined: Array(7).fill(null).map(() => Array(24).fill(0)),
    },
    trends: {
      responseTimeTrend: [],
      messageLengthTrend: [],
      initiationTrend: [],
    },
    ...overrides,
  };
}

function makeConversation(
  messages: UnifiedMessage[],
  participants?: Participant[],
): ParsedConversation {
  const parts = participants ?? [{ name: 'Alice' }, { name: 'Bob' }];
  const timestamps = messages.map((m) => m.timestamp);
  const start = Math.min(...timestamps);
  const end = Math.max(...timestamps);
  return {
    platform: 'messenger',
    title: 'Test Chat',
    participants: parts,
    messages,
    metadata: {
      totalMessages: messages.length,
      dateRange: { start, end },
      isGroup: parts.length > 2,
      durationDays: Math.ceil((end - start) / 86_400_000) || 1,
    },
  };
}

/** Generate N messages across a time range */
function generateMessages(
  count: number,
  startTs: number,
  endTs: number,
  senders = ['Alice', 'Bob'],
): UnifiedMessage[] {
  const step = count > 1 ? (endTs - startTs) / (count - 1) : 0;
  return Array.from({ length: count }, (_, i) => {
    const sender = senders[i % senders.length];
    return makeMsg(
      i,
      sender,
      `Message ${i} from ${sender} with enough text to be meaningful`,
      Math.round(startTs + i * step),
    );
  });
}

// ── sampleMessages ──────────────────────────────────────────

describe('sampleMessages', () => {
  it('throws when fewer than 10 eligible messages', () => {
    const msgs = generateMessages(5, Date.parse('2024-01-01'), Date.parse('2024-06-01'));
    const conv = makeConversation(msgs);
    const quant = makeQuantitative();

    expect(() => sampleMessages(conv, quant)).toThrow(/minimum 10/i);
  });

  it('throws when all messages are ineligible (system/call/unsent)', () => {
    const msgs = Array.from({ length: 20 }, (_, i) =>
      makeMsg(i, 'Alice', 'system msg', Date.parse('2024-01-01') + i * 60000, {
        type: 'system',
      }),
    );
    const conv = makeConversation(msgs);
    const quant = makeQuantitative();

    expect(() => sampleMessages(conv, quant)).toThrow();
  });

  it('throws when messages have empty content', () => {
    const msgs = Array.from({ length: 20 }, (_, i) =>
      makeMsg(i, 'Alice', '', Date.parse('2024-01-01') + i * 60000),
    );
    const conv = makeConversation(msgs);
    const quant = makeQuantitative();

    expect(() => sampleMessages(conv, quant)).toThrow();
  });

  it('returns all samples when exactly 10 eligible messages', () => {
    const msgs = generateMessages(10, Date.parse('2024-01-01'), Date.parse('2024-06-01'));
    const conv = makeConversation(msgs);
    const quant = makeQuantitative();

    const samples = sampleMessages(conv, quant);
    expect(samples.overview.length).toBeGreaterThanOrEqual(10);
    expect(samples.dynamics).toBeDefined();
    expect(samples.perPerson).toBeDefined();
    expect(samples.quantitativeContext).toBeDefined();
  });

  it('overview does not exceed 250 messages', () => {
    const msgs = generateMessages(
      1000,
      Date.parse('2023-01-01'),
      Date.parse('2024-12-01'),
    );
    const conv = makeConversation(msgs);
    const quant = makeQuantitative({
      patterns: {
        monthlyVolume: [
          { month: '2023-06', perPerson: { Alice: 200, Bob: 200 }, total: 400 },
          { month: '2024-06', perPerson: { Alice: 300, Bob: 300 }, total: 600 },
        ],
        weekdayWeekend: { weekday: { Alice: 70, Bob: 60 }, weekend: { Alice: 30, Bob: 20 } },
        volumeTrend: 0,
        bursts: [],
      },
    });

    const samples = sampleMessages(conv, quant);
    expect(samples.overview.length).toBeLessThanOrEqual(250);
  });

  it('dynamics does not exceed 200 messages', () => {
    const msgs = generateMessages(
      1000,
      Date.parse('2023-01-01'),
      Date.parse('2024-12-01'),
    );
    const conv = makeConversation(msgs);
    const quant = makeQuantitative({
      patterns: {
        monthlyVolume: [
          { month: '2023-06', perPerson: { Alice: 200, Bob: 200 }, total: 400 },
          { month: '2024-06', perPerson: { Alice: 300, Bob: 300 }, total: 600 },
        ],
        weekdayWeekend: { weekday: { Alice: 70, Bob: 60 }, weekend: { Alice: 30, Bob: 20 } },
        volumeTrend: 0,
        bursts: [],
      },
    });

    const samples = sampleMessages(conv, quant);
    expect(samples.dynamics.length).toBeLessThanOrEqual(200);
  });

  it('per-person samples do not exceed 150 per participant', () => {
    const msgs = generateMessages(
      1000,
      Date.parse('2023-01-01'),
      Date.parse('2024-12-01'),
    );
    const conv = makeConversation(msgs);
    const quant = makeQuantitative({
      patterns: {
        monthlyVolume: [
          { month: '2023-06', perPerson: { Alice: 200, Bob: 200 }, total: 400 },
          { month: '2024-06', perPerson: { Alice: 300, Bob: 300 }, total: 600 },
        ],
        weekdayWeekend: { weekday: { Alice: 70, Bob: 60 }, weekend: { Alice: 30, Bob: 20 } },
        volumeTrend: 0,
        bursts: [],
      },
    });

    const samples = sampleMessages(conv, quant);
    for (const name of Object.keys(samples.perPerson)) {
      expect(samples.perPerson[name].length).toBeLessThanOrEqual(150);
    }
  });

  it('produces per-person samples for each participant', () => {
    const msgs = generateMessages(50, Date.parse('2024-01-01'), Date.parse('2024-06-01'));
    const conv = makeConversation(msgs);
    const quant = makeQuantitative();

    const samples = sampleMessages(conv, quant);
    expect(samples.perPerson['Alice']).toBeDefined();
    expect(samples.perPerson['Bob']).toBeDefined();
    expect(samples.perPerson['Alice'].length).toBeGreaterThan(0);
    expect(samples.perPerson['Bob'].length).toBeGreaterThan(0);
  });

  it('filters out call, system, and unsent messages', () => {
    const msgs: UnifiedMessage[] = [];
    let idx = 0;
    const start = Date.parse('2024-01-01');

    // 10 system messages
    for (let i = 0; i < 10; i++) {
      msgs.push(makeMsg(idx++, 'Alice', 'System event', start + idx * 60000, { type: 'system' }));
    }
    // 10 call messages
    for (let i = 0; i < 10; i++) {
      msgs.push(makeMsg(idx++, 'Bob', 'Call lasted 5 min', start + idx * 60000, { type: 'call' }));
    }
    // 15 eligible text messages
    for (let i = 0; i < 15; i++) {
      msgs.push(makeMsg(idx++, i % 2 === 0 ? 'Alice' : 'Bob', `Real message ${i}`, start + idx * 60000));
    }

    const conv = makeConversation(msgs);
    const quant = makeQuantitative();

    const samples = sampleMessages(conv, quant);
    // All sampled messages should be from the 15 eligible ones
    for (const msg of samples.overview) {
      expect(msg.content).toMatch(/^Real message/);
    }
  });

  it('filters out unsent messages', () => {
    const msgs: UnifiedMessage[] = [];
    let idx = 0;
    const start = Date.parse('2024-01-01');

    // 5 unsent messages
    for (let i = 0; i < 5; i++) {
      msgs.push(makeMsg(idx++, 'Alice', 'Unsent msg', start + idx * 60000, { isUnsent: true }));
    }
    // 15 eligible text messages
    for (let i = 0; i < 15; i++) {
      msgs.push(makeMsg(idx++, i % 2 === 0 ? 'Alice' : 'Bob', `Real message ${i}`, start + idx * 60000));
    }

    const conv = makeConversation(msgs);
    const quant = makeQuantitative();

    const samples = sampleMessages(conv, quant);
    for (const msg of samples.overview) {
      expect(msg.content).not.toBe('Unsent msg');
    }
  });

  it('overview messages are sorted chronologically', () => {
    const msgs = generateMessages(100, Date.parse('2024-01-01'), Date.parse('2024-12-01'));
    const conv = makeConversation(msgs);
    const quant = makeQuantitative();

    const samples = sampleMessages(conv, quant);
    for (let i = 1; i < samples.overview.length; i++) {
      expect(samples.overview[i].timestamp).toBeGreaterThanOrEqual(
        samples.overview[i - 1].timestamp,
      );
    }
  });

  it('limits per-person profiling to 8 participants in large groups', () => {
    const senders = Array.from({ length: 12 }, (_, i) => `Person${i}`);
    const participants = senders.map((name) => ({ name }));
    const msgs = generateMessages(
      120,
      Date.parse('2024-01-01'),
      Date.parse('2024-06-01'),
      senders,
    );
    const conv = makeConversation(msgs, participants);

    const perPersonMetrics: Record<string, PersonMetrics> = {};
    for (const s of senders) {
      const count = msgs.filter((m) => m.sender === s).length;
      perPersonMetrics[s] = makePersonMetrics({ totalMessages: count });
    }

    const quant = makeQuantitative({ perPerson: perPersonMetrics });

    const samples = sampleMessages(conv, quant);
    expect(Object.keys(samples.perPerson).length).toBeLessThanOrEqual(8);
  });

  it('simplified messages have sender, content, timestamp, and index', () => {
    const msgs = generateMessages(20, Date.parse('2024-01-01'), Date.parse('2024-06-01'));
    const conv = makeConversation(msgs);
    const quant = makeQuantitative();

    const samples = sampleMessages(conv, quant);
    for (const msg of samples.overview) {
      expect(msg).toHaveProperty('sender');
      expect(msg).toHaveProperty('content');
      expect(msg).toHaveProperty('timestamp');
      expect(msg).toHaveProperty('index');
      // Should NOT have type, reactions etc. (simplified)
      expect(msg).not.toHaveProperty('type');
      expect(msg).not.toHaveProperty('reactions');
    }
  });
});

// ── buildQuantitativeContext ─────────────────────────────────

describe('buildQuantitativeContext', () => {
  const participants: Participant[] = [{ name: 'Alice' }, { name: 'Bob' }];

  it('returns a non-empty string', () => {
    const quant = makeQuantitative();
    const ctx = buildQuantitativeContext(quant, participants);
    expect(ctx.length).toBeGreaterThan(0);
  });

  it('includes participant names', () => {
    const quant = makeQuantitative();
    const ctx = buildQuantitativeContext(quant, participants);
    expect(ctx).toContain('Alice');
    expect(ctx).toContain('Bob');
  });

  it('includes key section headers', () => {
    const quant = makeQuantitative();
    const ctx = buildQuantitativeContext(quant, participants);
    expect(ctx).toContain('QUANTITATIVE METRICS SUMMARY');
    expect(ctx).toContain('MESSAGE VOLUME');
    expect(ctx).toContain('MESSAGE RATIO');
    expect(ctx).toContain('RESPONSE TIMES');
    expect(ctx).toContain('CONVERSATION INITIATIONS');
    expect(ctx).toContain('DOUBLE TEXTING');
    expect(ctx).toContain('REACTIONS');
    expect(ctx).toContain('QUESTIONS ASKED');
    expect(ctx).toContain('OVERALL VOLUME TREND');
    expect(ctx).toContain('CONVERSATION SESSIONS');
    expect(ctx).toContain('LONGEST SILENCE');
  });

  it('includes conversation date range from monthlyVolume', () => {
    const quant = makeQuantitative();
    const ctx = buildQuantitativeContext(quant, participants);
    expect(ctx).toContain('CONVERSATION DATE RANGE');
    expect(ctx).toContain('2024-01');
    expect(ctx).toContain('2024-02');
  });

  it('includes current date', () => {
    const quant = makeQuantitative();
    const ctx = buildQuantitativeContext(quant, participants);
    expect(ctx).toContain('CURRENT DATE');
  });

  it('handles empty monthlyVolume gracefully', () => {
    const quant = makeQuantitative({
      patterns: {
        monthlyVolume: [],
        weekdayWeekend: { weekday: {}, weekend: {} },
        volumeTrend: 0,
        bursts: [],
      },
    });
    const ctx = buildQuantitativeContext(quant, participants);
    expect(ctx).not.toContain('CONVERSATION DATE RANGE');
  });

  it('formats response times correctly', () => {
    const quant = makeQuantitative();
    const ctx = buildQuantitativeContext(quant, participants);
    // Alice median = 45000ms = 1 min, Bob = 90000ms = 2 min
    expect(ctx).toMatch(/Alice.*median/);
    expect(ctx).toMatch(/Bob.*median/);
  });

  it('identifies volume trend direction', () => {
    const quant = makeQuantitative({ patterns: {
      monthlyVolume: [],
      weekdayWeekend: { weekday: {}, weekend: {} },
      volumeTrend: 0.5,
      bursts: [],
    }});
    const ctx = buildQuantitativeContext(quant, participants);
    expect(ctx).toContain('increasing');

    const quant2 = makeQuantitative({ patterns: {
      monthlyVolume: [],
      weekdayWeekend: { weekday: {}, weekend: {} },
      volumeTrend: -0.5,
      bursts: [],
    }});
    const ctx2 = buildQuantitativeContext(quant2, participants);
    expect(ctx2).toContain('decreasing');

    const quant3 = makeQuantitative({ patterns: {
      monthlyVolume: [],
      weekdayWeekend: { weekday: {}, weekend: {} },
      volumeTrend: 0.05,
      bursts: [],
    }});
    const ctx3 = buildQuantitativeContext(quant3, participants);
    expect(ctx3).toContain('stable');
  });
});
