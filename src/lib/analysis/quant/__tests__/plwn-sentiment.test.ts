/**
 * Tests for plWordNet 3.0 sentiment lexicon (PLWN).
 *
 * Key facts from reading plwn-sentiment.ts:
 * - Exports PLWN_POSITIVE: string[] — 1949 positive Polish lemmas
 * - Exports PLWN_NEGATIVE: string[] — 4707 negative Polish lemmas
 * - Source: plWordNet 3.0, Wroclaw University of Science and Technology
 * - Annotated by linguists with emotional valence (##A1/##A2 +/- signs)
 * - All lemmas are Polish words (base forms)
 * - This is a pure data module — no functions, just arrays
 */
import { describe, it, expect } from 'vitest';
import { PLWN_POSITIVE, PLWN_NEGATIVE } from '../plwn-sentiment';

// ============================================================
// Structure and non-emptiness
// ============================================================

describe('PLWN arrays — structure', () => {
  it('PLWN_POSITIVE is a non-empty array of strings', () => {
    expect(Array.isArray(PLWN_POSITIVE)).toBe(true);
    expect(PLWN_POSITIVE.length).toBeGreaterThan(0);
    expect(typeof PLWN_POSITIVE[0]).toBe('string');
  });

  it('PLWN_NEGATIVE is a non-empty array of strings', () => {
    expect(Array.isArray(PLWN_NEGATIVE)).toBe(true);
    expect(PLWN_NEGATIVE.length).toBeGreaterThan(0);
    expect(typeof PLWN_NEGATIVE[0]).toBe('string');
  });

  it('all positive entries are non-empty strings', () => {
    for (const word of PLWN_POSITIVE) {
      expect(word.length).toBeGreaterThan(0);
      expect(typeof word).toBe('string');
    }
  });

  it('all negative entries are non-empty strings', () => {
    for (const word of PLWN_NEGATIVE) {
      expect(word.length).toBeGreaterThan(0);
      expect(typeof word).toBe('string');
    }
  });
});

// ============================================================
// Size sanity checks (from header: 1949 positive + 4707 negative)
// ============================================================

describe('PLWN — size sanity checks', () => {
  it('PLWN_POSITIVE has ~1949 lemmas', () => {
    expect(PLWN_POSITIVE.length).toBeGreaterThan(1800);
    expect(PLWN_POSITIVE.length).toBeLessThan(2200);
  });

  it('PLWN_NEGATIVE has ~4707 lemmas', () => {
    expect(PLWN_NEGATIVE.length).toBeGreaterThan(4500);
    expect(PLWN_NEGATIVE.length).toBeLessThan(5000);
  });

  it('there are more negative than positive words', () => {
    expect(PLWN_NEGATIVE.length).toBeGreaterThan(PLWN_POSITIVE.length);
  });
});

// ============================================================
// Known positive words — correct polarity
// ============================================================

describe('PLWN — known positive words', () => {
  const positiveSet = new Set(PLWN_POSITIVE);

  it('"adoracja" (adoration) is positive', () => {
    expect(positiveSet.has('adoracja')).toBe(true);
  });

  it('"anioł" (angel) is positive', () => {
    expect(positiveSet.has('anioł')).toBe(true);
  });

  it('"autentyczny" (authentic) is positive', () => {
    expect(positiveSet.has('autentyczny')).toBe(true);
  });

  it('"bajeczny" (fabulous) is positive', () => {
    expect(positiveSet.has('bajeczny')).toBe(true);
  });

  it('"życzliwy" (kind/benevolent) is positive', () => {
    expect(positiveSet.has('życzliwy')).toBe(true);
  });

  it('"żyzny" (fertile/lush) is positive', () => {
    expect(positiveSet.has('żyzny')).toBe(true);
  });

  it('positive words are NOT in negative list', () => {
    const negativeSet = new Set(PLWN_NEGATIVE);
    expect(negativeSet.has('adoracja')).toBe(false);
    expect(negativeSet.has('anioł')).toBe(false);
    expect(negativeSet.has('bajeczny')).toBe(false);
  });
});

// ============================================================
// Known negative words — correct polarity
// ============================================================

describe('PLWN — known negative words', () => {
  const negativeSet = new Set(PLWN_NEGATIVE);

  it('"abominacja" (abomination) is negative', () => {
    expect(negativeSet.has('abominacja')).toBe(true);
  });

  it('"absurd" (absurd) is negative', () => {
    expect(negativeSet.has('absurd')).toBe(true);
  });

  it('"afera" (scandal) is negative', () => {
    expect(negativeSet.has('afera')).toBe(true);
  });

  it('"afront" (affront) is negative', () => {
    expect(negativeSet.has('afront')).toBe(true);
  });

  it('"agresor" (aggressor) is negative', () => {
    expect(negativeSet.has('agresor')).toBe(true);
  });

  it('negative words are NOT in positive list', () => {
    const positiveSet = new Set(PLWN_POSITIVE);
    expect(positiveSet.has('abominacja')).toBe(false);
    expect(positiveSet.has('absurd')).toBe(false);
    expect(positiveSet.has('afera')).toBe(false);
  });
});

// ============================================================
// Unknown / neutral words — no match
// ============================================================

describe('PLWN — unknown/neutral words', () => {
  const positiveSet = new Set(PLWN_POSITIVE);
  const negativeSet = new Set(PLWN_NEGATIVE);

  it('gibberish is not in either list', () => {
    expect(positiveSet.has('qwxyz')).toBe(false);
    expect(negativeSet.has('qwxyz')).toBe(false);
  });

  it('empty string is not in either list', () => {
    expect(positiveSet.has('')).toBe(false);
    expect(negativeSet.has('')).toBe(false);
  });

  it('English words are not in PLWN (Polish-only lexicon)', () => {
    expect(positiveSet.has('love')).toBe(false);
    expect(negativeSet.has('hate')).toBe(false);
    expect(positiveSet.has('beautiful')).toBe(false);
    expect(negativeSet.has('terrible')).toBe(false);
  });
});

// ============================================================
// No duplicates
// ============================================================

describe('PLWN — no duplicates', () => {
  it('PLWN_POSITIVE has no duplicate entries', () => {
    const set = new Set(PLWN_POSITIVE);
    expect(set.size).toBe(PLWN_POSITIVE.length);
  });

  it('PLWN_NEGATIVE has no duplicate entries', () => {
    const set = new Set(PLWN_NEGATIVE);
    expect(set.size).toBe(PLWN_NEGATIVE.length);
  });
});

// ============================================================
// Mutual exclusivity (ambiguous excluded per header)
// ============================================================

describe('PLWN — mutual exclusivity', () => {
  it('no word appears in both positive AND negative lists (ambiguous excluded)', () => {
    const positiveSet = new Set(PLWN_POSITIVE);
    const overlap = PLWN_NEGATIVE.filter(w => positiveSet.has(w));
    expect(overlap).toEqual([]);
  });
});
