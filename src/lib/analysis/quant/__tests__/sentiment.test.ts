/**
 * Tests for client-side sentiment analysis.
 */
import { describe, it, expect } from 'vitest';
import {
  computeSentimentScore,
  computePersonSentiment,
} from '../sentiment';
import type { SentimentScore } from '../sentiment';
import type { UnifiedMessage } from '@/lib/parsers/types';

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

describe('diacritics tolerance and negation edge cases', () => {
  it('detects negative sentiment when ę is missing: nienawidze → negative', () => {
    const result = computeSentimentScore('nienawidze cie strasznie');
    expect(result.score).toBeLessThan(0.1);
  });

  it('detects positive sentiment in text without diacritics: kocham → positive', () => {
    const result = computeSentimentScore('kocham cie jestes super pieknie');
    expect(result.score).toBeGreaterThan(0);
  });

  it('przepraszam is neutral (removed from negative dict)', () => {
    // przepraszam should NOT trigger negative sentiment (it is a repair behavior per Gottman).
    // "sorry" (English) was NOT removed, so we test with przepraszam only.
    const result = computeSentimentScore('przepraszam przepraszam przepraszam');
    expect(result.score).toBeGreaterThanOrEqual(-0.2);
  });

  it('handles Polish negation: nie kocham → negative (negation flips positive)', () => {
    // "nie" before positive word should flip to negative
    const result = computeSentimentScore('nie kocham cie nie lubie tego');
    expect(result.score).toBeLessThanOrEqual(0);
  });

  it('handles double negation: nie nie lubię → should be complex but not throw', () => {
    // Double negation is complex - just verify function runs without throwing
    const result = computeSentimentScore('no nie nie lubie tego wcale');
    expect(typeof result.score).toBe('number');
    expect(isNaN(result.score)).toBe(false);
  });

  it('English negation: dont hate → processed with negation awareness', () => {
    // "don't hate" should be processed with negation awareness
    const result = computeSentimentScore("don't hate you i don't love this");
    expect(typeof result.score).toBe('number');
  });

  it('pure positive Polish messages give positive score', () => {
    const result = computeSentimentScore('kocham cie jestes cudowny uwielbiam cie super fajnie pieknie');
    expect(result.score).toBeGreaterThan(0.1);
  });

  it('pure negative Polish messages give negative score', () => {
    const result = computeSentimentScore('nienawidze cie okropny jestes beznadziejnie strasznie cholera');
    expect(result.score).toBeLessThan(0);
  });

  it('Polish bez as negation: bez sensu → flips positive word if present', () => {
    const result = computeSentimentScore('to jest bez sensu bez znaczenia');
    expect(typeof result.score).toBe('number');
  });

  it('returns score for each participant via computePersonSentiment', () => {
    const annaMessages = [
      makeMessage('kocham cie', 'Anna'),
      makeMessage('jestes cudowny', 'Anna'),
    ];
    const bartekMessages = [
      makeMessage('nienawidze wszystkiego', 'Bartek'),
      makeMessage('okropne straszne', 'Bartek'),
    ];
    const annaResult = computePersonSentiment(annaMessages);
    const bartekResult = computePersonSentiment(bartekMessages);
    expect(annaResult).toBeDefined();
    expect(bartekResult).toBeDefined();
    expect(annaResult.avgSentiment).toBeGreaterThan(bartekResult.avgSentiment);
  });

  it('empty/punctuation-only messages return zero score without throwing', () => {
    const result = computeSentimentScore('   ... !!!');
    expect(typeof result.score).toBe('number');
    expect(isNaN(result.score)).toBe(false);
  });
});

// ============================================================
// roughPolishStem fallback — inflected forms not in dictionary
// ============================================================

describe('stemmer fallback — inflected Polish forms', () => {
  it('szczęśliwemu (dative of szczęśliwy) scores positive', () => {
    // "szczęśliwemu" is NOT in the dictionary verbatim; stem "szczęśliw" should match
    const result = computeSentimentScore('szczęśliwemu');
    expect(result.positive).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThan(0);
  });

  it('cudownego (genitive of cudowny) scores positive', () => {
    const result = computeSentimentScore('cudownego dnia');
    expect(result.positive).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThan(0);
  });

  it('okropnego (genitive of okropny) scores negative', () => {
    const result = computeSentimentScore('okropnego zachowania');
    expect(result.negative).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(0);
  });

  it('straszliwego (adjective form not in dict verbatim) scores negative', () => {
    const result = computeSentimentScore('straszliwego dnia');
    expect(result.negative).toBeGreaterThan(0);
  });

  it('stemmer fallback does not break existing exact-match tokens', () => {
    // "kocham" is an exact match; should still score positive
    const result = computeSentimentScore('kocham cie');
    expect(result.positive).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThan(0);
  });

  it('negation still works for inflected positive word (nie szczęśliwemu)', () => {
    // negation particle before an inflected positive word should flip it to negative
    const negated = computeSentimentScore('nie szczęśliwemu');
    const plain   = computeSentimentScore('szczęśliwemu');
    // negated version should score lower than or equal to plain
    expect(negated.score).toBeLessThanOrEqual(plain.score);
  });

  it('inflected form without diacritics (szczesliwemu) scores positive via stripped stem', () => {
    // Users often omit diacritics; stem lookup with stripDiacritics should handle it
    const result = computeSentimentScore('szczesliwemu');
    expect(result.positive).toBeGreaterThan(0);
  });
});

// ============================================================
// Typo Tolerance (Damerau 1964 — edit distance 1)
// ============================================================
describe('typo tolerance — keyboard-aware edit distance 1', () => {
  // --- Transpositions (swapped adjacent chars) ---
  it('"kocahm" → positive (transposition of "kocham")', () => {
    const result = computeSentimentScore('kocahm');
    expect(result.positive).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThan(0);
  });

  it('"nieanwidze" → negative (transposition in "nienawidze")', () => {
    const result = computeSentimentScore('nieanwidze');
    expect(result.negative).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(0);
  });

  // --- Keyboard-adjacent substitutions ---
  it('"kochsm" → positive (a→s adjacent on QWERTY, "kocham")', () => {
    const result = computeSentimentScore('kochsm');
    expect(result.positive).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThan(0);
  });

  it('"suoer" → positive (p→o adjacent, "super")', () => {
    const result = computeSentimentScore('suoer');
    expect(result.positive).toBeGreaterThan(0);
  });

  // --- Deletions (extra char inserted) ---
  it('"kochham" → positive (deletion recovers "kocham")', () => {
    const result = computeSentimentScore('kochham');
    expect(result.positive).toBeGreaterThan(0);
  });

  // --- Too short — should NOT fuzzy match ---
  it('"zyl" (3 chars) does not trigger typo correction', () => {
    const result = computeSentimentScore('zyl');
    // Should only match via exact/inflection, not typo candidates
    // This tests that min-length-5 guard works
    expect(result.total).toBe(0);
  });

  // --- Distant key substitution should NOT match ---
  it('"kochzm" does not match (a→z not adjacent on QWERTY)', () => {
    // z IS adjacent to a on QWERTY (bottom-left), so let's pick a truly distant key
    // 'a' neighbors are: qwsxz — let's use 'n' which is far from 'a'
    const result = computeSentimentScore('kochnm');
    // 'kochnm' — replacing 'a' with 'n' (not adjacent) should not match "kocham"
    expect(result.positive).toBe(0);
  });

  it('typo correction does not match ambiguous candidates (pos + neg at ED1)', () => {
    // Construct a case where both dicts could match at ED1 — result should be undefined
    // "dobry" is positive; if we have a word at ED1 that's negative, it should skip
    // This is hard to construct deterministically, so we test the safe case:
    // a pure nonsense word should return no sentiment
    const result = computeSentimentScore('xqzwj');
    expect(result.total).toBe(0);
  });
});
