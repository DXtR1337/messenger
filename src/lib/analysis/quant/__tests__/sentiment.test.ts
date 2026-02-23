/**
 * Tests for client-side sentiment analysis.
 */
import { describe, it, expect } from 'vitest';
import {
  computeSentimentScore,
  computePersonSentiment,
} from '../sentiment';
import type { SentimentScore } from '../sentiment';
import type { UnifiedMessage } from '../../../parsers/types';

// ============================================================
// Helper: build a minimal UnifiedMessage
// ============================================================

function makeMessage(content: string, sender = 'Alice', type: UnifiedMessage['type'] = 'text'): UnifiedMessage {
  return {
    index: 0,
    sender,
    content,
    timestamp: Date.now(),
    type,
    reactions: [],
    hasMedia: false,
    hasLink: false,
    isUnsent: false,
  };
}

// ============================================================
// computeSentimentScore — single text
// ============================================================

describe('computeSentimentScore', () => {
  it('detects Polish positive words', () => {
    const result = computeSentimentScore('Kocham cię, jesteś cudowna!');
    expect(result.positive).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThan(0);
  });

  it('detects Polish negative words', () => {
    const result = computeSentimentScore('Nienawidzę tego, okropne beznadziejne');
    expect(result.negative).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(0);
  });

  it('detects English positive words', () => {
    const result = computeSentimentScore('This is amazing and wonderful, I love it');
    expect(result.positive).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThan(0);
  });

  it('detects English negative words', () => {
    const result = computeSentimentScore('This is terrible and horrible, I hate it');
    expect(result.negative).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(0);
  });

  it('returns neutral score for text without sentiment words', () => {
    const result = computeSentimentScore('The table has four legs');
    expect(result.score).toBe(0);
    expect(result.total).toBe(0);
  });

  it('handles mixed positive and negative words', () => {
    const result = computeSentimentScore('amazing but terrible');
    expect(result.positive).toBeGreaterThan(0);
    expect(result.negative).toBeGreaterThan(0);
    expect(result.total).toBe(result.positive + result.negative);
  });

  it('returns score of 0 for empty string', () => {
    const result = computeSentimentScore('');
    expect(result.score).toBe(0);
    expect(result.positive).toBe(0);
    expect(result.negative).toBe(0);
  });

  it('score is bounded between -1 and 1', () => {
    const positive = computeSentimentScore('love amazing wonderful perfect beautiful');
    expect(positive.score).toBeLessThanOrEqual(1);
    expect(positive.score).toBeGreaterThanOrEqual(-1);

    const negative = computeSentimentScore('hate terrible horrible awful disgusting');
    expect(negative.score).toBeLessThanOrEqual(1);
    expect(negative.score).toBeGreaterThanOrEqual(-1);
  });

  it('handles Polish informal/slang positive words', () => {
    const result = computeSentimentScore('zajebisty sztos kozak');
    expect(result.positive).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThan(0);
  });

  it('handles Polish profanity as negative sentiment', () => {
    const result = computeSentimentScore('kurwa cholera szlag');
    expect(result.negative).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(0);
  });
});

// ============================================================
// computePersonSentiment — aggregated stats
// ============================================================

describe('computePersonSentiment', () => {
  it('returns neutral stats for empty messages array', () => {
    const result = computePersonSentiment([]);
    expect(result.avgSentiment).toBe(0);
    expect(result.neutralRatio).toBe(1);
    expect(result.positiveRatio).toBe(0);
    expect(result.negativeRatio).toBe(0);
    expect(result.emotionalVolatility).toBe(0);
  });

  it('computes positive ratios for mostly positive messages', () => {
    const messages = [
      makeMessage('I love this, amazing!'),
      makeMessage('wonderful, beautiful day'),
      makeMessage('The table has legs'),
    ];
    const result = computePersonSentiment(messages);
    expect(result.positiveRatio).toBeGreaterThan(0);
    expect(result.avgSentiment).toBeGreaterThan(0);
  });

  it('computes negative ratios for mostly negative messages', () => {
    const messages = [
      makeMessage('terrible horrible day'),
      makeMessage('I hate this, disgusting'),
      makeMessage('The table has legs'),
    ];
    const result = computePersonSentiment(messages);
    expect(result.negativeRatio).toBeGreaterThan(0);
    expect(result.avgSentiment).toBeLessThan(0);
  });

  it('skips non-text messages (media, system, etc.)', () => {
    const messages = [
      makeMessage('I love this!', 'Alice', 'text'),
      makeMessage('photo.jpg', 'Alice', 'media'),
      makeMessage('System notification', 'System', 'system'),
    ];
    const result = computePersonSentiment(messages);
    // Only the text message should be scored
    expect(result.positiveRatio + result.negativeRatio + result.neutralRatio).toBeCloseTo(1, 5);
  });

  it('computes emotional volatility (higher for mixed sentiments)', () => {
    const mixed = [
      makeMessage('I love this, amazing wonderful'),
      makeMessage('I hate this, terrible horrible'),
      makeMessage('I love this, amazing wonderful'),
      makeMessage('I hate this, terrible horrible'),
    ];
    const uniform = [
      makeMessage('I love this, amazing'),
      makeMessage('I love this, wonderful'),
      makeMessage('I love this, beautiful'),
      makeMessage('I love this, perfect'),
    ];
    const mixedResult = computePersonSentiment(mixed);
    const uniformResult = computePersonSentiment(uniform);
    // Mixed messages should have higher volatility than uniform
    expect(mixedResult.emotionalVolatility).toBeGreaterThan(uniformResult.emotionalVolatility);
  });

  it('handles messages with empty content', () => {
    const messages = [
      makeMessage(''),
      makeMessage(''),
    ];
    const result = computePersonSentiment(messages);
    expect(result.neutralRatio).toBe(1);
  });
});
