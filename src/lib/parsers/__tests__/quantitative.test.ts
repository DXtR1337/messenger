import { describe, it, expect } from 'vitest';
import { computeQuantitativeAnalysis } from '@/lib/analysis/quantitative';
import type { ParsedConversation, UnifiedMessage } from '../types';

// ============================================================
// Test Helpers
// ============================================================

function makeMessage(overrides: Partial<UnifiedMessage> & { sender: string; timestamp: number }): UnifiedMessage {
  return {
    index: 0,
    content: '',
    type: 'text',
    reactions: [],
    hasMedia: false,
    hasLink: false,
    isUnsent: false,
    ...overrides,
  };
}

function makeConversation(
  messages: UnifiedMessage[],
  participants: string[] = ['Alice', 'Bob'],
): ParsedConversation {
  const indexed = messages.map((m, i) => ({ ...m, index: i }));
  const timestamps = indexed.map(m => m.timestamp);
  const start = timestamps.length > 0 ? Math.min(...timestamps) : 0;
  const end = timestamps.length > 0 ? Math.max(...timestamps) : 0;
  const durationDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));

  return {
    platform: 'messenger',
    title: participants.join(' and '),
    participants: participants.map(name => ({ name })),
    messages: indexed,
    metadata: {
      totalMessages: indexed.length,
      dateRange: { start, end },
      isGroup: participants.length > 2,
      durationDays,
    },
  };
}
// ============================================================
// Tests
// ============================================================

describe('computeQuantitativeAnalysis', () => {
  it('computes basic metrics for a small conversation', () => {
    const baseTime = 1700000000000;
    const messages: UnifiedMessage[] = [
      makeMessage({ sender: 'Alice', timestamp: baseTime, content: 'Hello Bob' }),
      makeMessage({ sender: 'Bob', timestamp: baseTime + 60000, content: 'Hi Alice how are you' }),
      makeMessage({ sender: 'Alice', timestamp: baseTime + 120000, content: 'I am great thanks for asking' }),
      makeMessage({ sender: 'Bob', timestamp: baseTime + 180000, content: 'Good' }),
      makeMessage({ sender: 'Alice', timestamp: baseTime + 240000, content: 'What are you doing today?' }),
    ];
    const conversation = makeConversation(messages);
    const result = computeQuantitativeAnalysis(conversation);

    expect(result).toBeDefined();
    expect(result.perPerson).toBeDefined();
    expect(result.timing).toBeDefined();
    expect(result.engagement).toBeDefined();
    expect(result.patterns).toBeDefined();
    expect(result.heatmap).toBeDefined();
    expect(result.trends).toBeDefined();
    expect(result.perPerson['Alice']).toBeDefined();
    expect(result.perPerson['Bob']).toBeDefined();
    expect(result.perPerson['Alice'].totalMessages).toBe(3);
    expect(result.perPerson['Bob'].totalMessages).toBe(2);
    expect(result.perPerson['Alice'].totalWords).toBeGreaterThan(0);
    expect(result.perPerson['Bob'].totalWords).toBeGreaterThan(0);
    expect(result.perPerson['Alice'].questionsAsked).toBe(1);
  });

  it('returns expected structure with empty messages array', () => {
    const conversation = makeConversation([], ['Alice', 'Bob']);
    const result = computeQuantitativeAnalysis(conversation);
    expect(result).toBeDefined();
    expect(result.perPerson).toBeDefined();
    expect(result.perPerson['Alice']?.totalMessages).toBe(0);
    expect(result.perPerson['Bob']?.totalMessages).toBe(0);
    expect(result.engagement.totalSessions).toBe(0);
  });

  it('handles single participant conversation', () => {
    const baseTime = 1700000000000;
    const messages: UnifiedMessage[] = [
      makeMessage({ sender: 'Alice', timestamp: baseTime, content: 'Hello' }),
      makeMessage({ sender: 'Alice', timestamp: baseTime + 60000, content: 'Anyone there?' }),
      makeMessage({ sender: 'Alice', timestamp: baseTime + 120000, content: 'Guess not' }),
    ];
    const conversation = makeConversation(messages, ['Alice']);
    const result = computeQuantitativeAnalysis(conversation);
    expect(result.perPerson['Alice']).toBeDefined();
    expect(result.perPerson['Alice'].totalMessages).toBe(3);
    // Messages 60s apart = Enter-as-comma, NOT double texting
    expect(result.engagement.doubleTexts['Alice']).toBe(0);
  });
  it('computes engagement metrics correctly', () => {
    const baseTime = 1700000000000;
    const messages: UnifiedMessage[] = [
      makeMessage({ sender: 'Alice', timestamp: baseTime, content: 'Hey' }),
      makeMessage({ sender: 'Alice', timestamp: baseTime + 30000, content: 'You there?' }),
      makeMessage({ sender: 'Alice', timestamp: baseTime + 60000, content: 'Hello???' }),
      makeMessage({ sender: 'Bob', timestamp: baseTime + 300000, content: 'Sorry, was busy' }),
    ];
    const conversation = makeConversation(messages);
    const result = computeQuantitativeAnalysis(conversation);
    // Messages 30s apart = Enter-as-comma, NOT double texting
    expect(result.engagement.doubleTexts['Alice']).toBe(0);
    expect(result.engagement.messageRatio['Alice']).toBeCloseTo(0.75, 1);
    expect(result.engagement.messageRatio['Bob']).toBeCloseTo(0.25, 1);
  });
  it('counts double texts only when >2min gap between same-sender messages', () => {
    const baseTime = 1700000000000;
    const TWO_MIN = 2 * 60 * 1000;
    const messages: UnifiedMessage[] = [
      // Alice sends a burst (Enter-as-comma, <2min apart) — NOT a double text
      makeMessage({ sender: 'Alice', timestamp: baseTime, content: 'Hey' }),
      makeMessage({ sender: 'Alice', timestamp: baseTime + 10000, content: 'you there?' }),
      // Alice comes back after 3 minutes — THIS is a double text
      makeMessage({ sender: 'Alice', timestamp: baseTime + TWO_MIN + 60000, content: 'hello???' }),
      makeMessage({ sender: 'Bob', timestamp: baseTime + 600000, content: 'Sorry, was busy' }),
    ];
    const conversation = makeConversation(messages);
    const result = computeQuantitativeAnalysis(conversation);
    expect(result.engagement.doubleTexts['Alice']).toBe(1);
  });

  it('computes heatmap data as 7x24 matrix', () => {
    const baseTime = 1700000000000;
    const messages: UnifiedMessage[] = [
      makeMessage({ sender: 'Alice', timestamp: baseTime, content: 'Hi' }),
      makeMessage({ sender: 'Bob', timestamp: baseTime + 60000, content: 'Hey' }),
    ];
    const conversation = makeConversation(messages);
    const result = computeQuantitativeAnalysis(conversation);
    expect(result.heatmap.combined).toHaveLength(7);
    result.heatmap.combined.forEach(dayRow => {
      expect(dayRow).toHaveLength(24);
    });
    expect(result.heatmap.perPerson['Alice']).toHaveLength(7);
    expect(result.heatmap.perPerson['Bob']).toHaveLength(7);
  });

  it('tracks reactions given and received', () => {
    const baseTime = 1700000000000;
    const messages: UnifiedMessage[] = [
      makeMessage({
        sender: 'Alice', timestamp: baseTime, content: 'Funny joke',
        reactions: [{ emoji: '😂', actor: 'Bob' }],
      }),
      makeMessage({
        sender: 'Bob', timestamp: baseTime + 60000, content: 'Thanks',
        reactions: [{ emoji: '❤️', actor: 'Alice' }, { emoji: '👍', actor: 'Alice' }],
      }),
    ];
    const conversation = makeConversation(messages);
    const result = computeQuantitativeAnalysis(conversation);
    expect(result.perPerson['Bob'].reactionsGiven).toBe(1);
    expect(result.perPerson['Alice'].reactionsGiven).toBe(2);
    expect(result.perPerson['Alice'].reactionsReceived).toBe(1);
    expect(result.perPerson['Bob'].reactionsReceived).toBe(2);
  });

  it('detects emoji usage in messages', () => {
    const baseTime = 1700000000000;
    const messages: UnifiedMessage[] = [
      makeMessage({ sender: 'Alice', timestamp: baseTime, content: 'Love this! ❤️😍' }),
      makeMessage({ sender: 'Bob', timestamp: baseTime + 60000, content: 'No emojis here' }),
    ];
    const conversation = makeConversation(messages);
    const result = computeQuantitativeAnalysis(conversation);
    expect(result.perPerson['Alice'].messagesWithEmoji).toBe(1);
    expect(result.perPerson['Alice'].emojiCount).toBe(2);
    expect(result.perPerson['Bob'].messagesWithEmoji).toBe(0);
    expect(result.perPerson['Bob'].emojiCount).toBe(0);
  });

  it('computes monthly volume patterns', () => {
    const jan = new Date('2024-01-15T12:00:00Z').getTime();
    const feb = new Date('2024-02-15T12:00:00Z').getTime();
    const messages: UnifiedMessage[] = [
      makeMessage({ sender: 'Alice', timestamp: jan, content: 'January message 1' }),
      makeMessage({ sender: 'Bob', timestamp: jan + 3600000, content: 'January message 2' }),
      makeMessage({ sender: 'Alice', timestamp: feb, content: 'February message 1' }),
    ];
    const conversation = makeConversation(messages);
    const result = computeQuantitativeAnalysis(conversation);
    expect(result.patterns.monthlyVolume.length).toBeGreaterThanOrEqual(2);
    const janEntry = result.patterns.monthlyVolume.find(m => m.month === '2024-01');
    const febEntry = result.patterns.monthlyVolume.find(m => m.month === '2024-02');
    expect(janEntry).toBeDefined();
    expect(janEntry!.total).toBe(2);
    expect(febEntry).toBeDefined();
    expect(febEntry!.total).toBe(1);
  });
});
