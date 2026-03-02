/**
 * Tests for NRC Emotion Lexicon + NAWL Polish Affective Word List.
 *
 * Key facts from reading nrc-polish.ts:
 * - Exports raw arrays: NRC_POSITIVE, NRC_NEGATIVE, NRC_JOY, NRC_ANGER, NRC_SADNESS,
 *   NRC_FEAR, NRC_DISGUST, NRC_ANTICIPATION, NRC_SURPRISE, NRC_TRUST
 * - Exports NAWL Polish arrays: NAWL_PL_POSITIVE, NAWL_PL_NEGATIVE, NAWL_PL_JOY,
 *   NAWL_PL_ANGER, NAWL_PL_SADNESS, NAWL_PL_FEAR, NAWL_PL_DISGUST
 * - Exports Set versions of all arrays (e.g. NRC_POSITIVE_SET, NAWL_PL_POSITIVE_SET)
 * - Exports combined cross-language sets: COMBINED_POSITIVE_SET, COMBINED_NEGATIVE_SET
 * - All words are lowercase strings
 * - NRC is English, NAWL is Polish
 */
import { describe, it, expect } from 'vitest';
import {
  NRC_POSITIVE, NRC_NEGATIVE, NRC_JOY, NRC_ANGER, NRC_SADNESS,
  NRC_FEAR, NRC_DISGUST, NRC_ANTICIPATION, NRC_SURPRISE, NRC_TRUST,
  NRC_POSITIVE_SET, NRC_NEGATIVE_SET, NRC_JOY_SET, NRC_ANGER_SET,
  NRC_SADNESS_SET, NRC_FEAR_SET, NRC_DISGUST_SET, NRC_ANTICIPATION_SET,
  NRC_SURPRISE_SET, NRC_TRUST_SET,
  NAWL_PL_POSITIVE, NAWL_PL_NEGATIVE, NAWL_PL_JOY, NAWL_PL_ANGER,
  NAWL_PL_SADNESS, NAWL_PL_FEAR, NAWL_PL_DISGUST,
  NAWL_PL_POSITIVE_SET, NAWL_PL_NEGATIVE_SET, NAWL_PL_JOY_SET,
  NAWL_PL_ANGER_SET, NAWL_PL_SADNESS_SET, NAWL_PL_FEAR_SET,
  NAWL_PL_DISGUST_SET,
  COMBINED_POSITIVE_SET, COMBINED_NEGATIVE_SET,
} from '../nrc-polish';

// ============================================================
// NRC English arrays — non-empty and correct membership
// ============================================================

describe('NRC English arrays — structure', () => {
  it('NRC_POSITIVE is a non-empty array of strings', () => {
    expect(Array.isArray(NRC_POSITIVE)).toBe(true);
    expect(NRC_POSITIVE.length).toBeGreaterThan(0);
    expect(typeof NRC_POSITIVE[0]).toBe('string');
  });

  it('NRC_NEGATIVE is a non-empty array of strings', () => {
    expect(Array.isArray(NRC_NEGATIVE)).toBe(true);
    expect(NRC_NEGATIVE.length).toBeGreaterThan(0);
  });

  it('all NRC emotion arrays are non-empty', () => {
    expect(NRC_JOY.length).toBeGreaterThan(0);
    expect(NRC_ANGER.length).toBeGreaterThan(0);
    expect(NRC_SADNESS.length).toBeGreaterThan(0);
    expect(NRC_FEAR.length).toBeGreaterThan(0);
    expect(NRC_DISGUST.length).toBeGreaterThan(0);
    expect(NRC_ANTICIPATION.length).toBeGreaterThan(0);
    expect(NRC_SURPRISE.length).toBeGreaterThan(0);
    expect(NRC_TRUST.length).toBeGreaterThan(0);
  });

  it('NRC arrays contain only lowercase strings', () => {
    for (const word of NRC_POSITIVE.slice(0, 50)) {
      expect(word).toBe(word.toLowerCase());
    }
    for (const word of NRC_ANGER.slice(0, 50)) {
      expect(word).toBe(word.toLowerCase());
    }
  });
});

// ============================================================
// NRC English — known words in correct categories
// ============================================================

describe('NRC English — known word membership', () => {
  it('"love" is in NRC_POSITIVE', () => {
    expect(NRC_POSITIVE_SET.has('love')).toBe(true);
  });

  it('"hate" is in NRC_NEGATIVE', () => {
    expect(NRC_NEGATIVE_SET.has('hate')).toBe(true);
  });

  it('"happiness" is in NRC_JOY', () => {
    expect(NRC_JOY_SET.has('happiness')).toBe(true);
  });

  it('"anger" is in NRC_ANGER', () => {
    expect(NRC_ANGER_SET.has('anger')).toBe(true);
  });

  it('"grief" is in NRC_SADNESS', () => {
    expect(NRC_SADNESS_SET.has('grief')).toBe(true);
  });

  it('"terror" is in NRC_FEAR', () => {
    expect(NRC_FEAR_SET.has('terror')).toBe(true);
  });

  it('"disgust" is in NRC_DISGUST', () => {
    expect(NRC_DISGUST_SET.has('disgust')).toBe(true);
  });

  it('"anticipation" is in NRC_ANTICIPATION', () => {
    expect(NRC_ANTICIPATION_SET.has('anticipation')).toBe(true);
  });

  it('"astonishment" is in NRC_SURPRISE', () => {
    expect(NRC_SURPRISE_SET.has('astonishment')).toBe(true);
  });

  it('"trust" is in NRC_TRUST', () => {
    expect(NRC_TRUST_SET.has('trust')).toBe(true);
  });
});

// ============================================================
// NRC English — unknown words
// ============================================================

describe('NRC English — unknown words', () => {
  it('gibberish word is not in any NRC set', () => {
    expect(NRC_POSITIVE_SET.has('zzxkqw')).toBe(false);
    expect(NRC_NEGATIVE_SET.has('zzxkqw')).toBe(false);
    expect(NRC_JOY_SET.has('zzxkqw')).toBe(false);
  });

  it('empty string is not in any NRC set', () => {
    expect(NRC_POSITIVE_SET.has('')).toBe(false);
    expect(NRC_NEGATIVE_SET.has('')).toBe(false);
  });
});

// ============================================================
// NAWL Polish arrays — structure
// ============================================================

describe('NAWL Polish arrays — structure', () => {
  it('NAWL_PL_POSITIVE is a non-empty array', () => {
    expect(NAWL_PL_POSITIVE.length).toBeGreaterThan(0);
  });

  it('NAWL_PL_NEGATIVE is a non-empty array', () => {
    expect(NAWL_PL_NEGATIVE.length).toBeGreaterThan(0);
  });

  it('all NAWL emotion arrays are non-empty', () => {
    expect(NAWL_PL_JOY.length).toBeGreaterThan(0);
    expect(NAWL_PL_ANGER.length).toBeGreaterThan(0);
    expect(NAWL_PL_SADNESS.length).toBeGreaterThan(0);
    expect(NAWL_PL_FEAR.length).toBeGreaterThan(0);
    expect(NAWL_PL_DISGUST.length).toBeGreaterThan(0);
  });
});

// ============================================================
// NAWL Polish — known word membership
// ============================================================

describe('NAWL Polish — known word membership', () => {
  it('"kochać" (to love) is in NAWL_PL_POSITIVE', () => {
    expect(NAWL_PL_POSITIVE_SET.has('kochać')).toBe(true);
  });

  it('"radość" (joy) is in NAWL_PL_JOY', () => {
    expect(NAWL_PL_JOY_SET.has('radość')).toBe(true);
  });

  it('"gniew" (anger) is in NAWL_PL_ANGER', () => {
    expect(NAWL_PL_ANGER_SET.has('gniew')).toBe(true);
  });

  it('"nienawidzić" (to hate) is in NAWL_PL_NEGATIVE', () => {
    expect(NAWL_PL_NEGATIVE_SET.has('nienawidzić')).toBe(true);
  });

  it('"strach" (fear) is in NAWL_PL_FEAR', () => {
    expect(NAWL_PL_FEAR_SET.has('strach')).toBe(true);
  });

  it('"ból" (pain) is in NAWL_PL_SADNESS', () => {
    expect(NAWL_PL_SADNESS_SET.has('ból')).toBe(true);
  });

  it('"obrzydzenie" (disgust) is in NAWL_PL_DISGUST', () => {
    expect(NAWL_PL_DISGUST_SET.has('obrzydzenie')).toBe(true);
  });

  it('"szczęśliwy" (happy) is in NAWL_PL_POSITIVE and NAWL_PL_JOY', () => {
    expect(NAWL_PL_POSITIVE_SET.has('szczęśliwy')).toBe(true);
    expect(NAWL_PL_JOY_SET.has('szczęśliwy')).toBe(true);
  });
});

// ============================================================
// NAWL Polish — unknown words
// ============================================================

describe('NAWL Polish — unknown words', () => {
  it('gibberish is not in NAWL sets', () => {
    expect(NAWL_PL_POSITIVE_SET.has('qwxyz')).toBe(false);
    expect(NAWL_PL_NEGATIVE_SET.has('qwxyz')).toBe(false);
  });

  it('empty string is not in NAWL sets', () => {
    expect(NAWL_PL_POSITIVE_SET.has('')).toBe(false);
    expect(NAWL_PL_JOY_SET.has('')).toBe(false);
  });

  it('English words are not in NAWL Polish sets', () => {
    expect(NAWL_PL_POSITIVE_SET.has('love')).toBe(false);
    expect(NAWL_PL_NEGATIVE_SET.has('hate')).toBe(false);
  });
});

// ============================================================
// Set consistency — arrays match their Sets
// ============================================================

describe('Set consistency — arrays match their Sets', () => {
  it('NRC_POSITIVE_SET has same size as NRC_POSITIVE (no duplicates lost)', () => {
    expect(NRC_POSITIVE_SET.size).toBe(NRC_POSITIVE.length);
  });

  it('NRC_NEGATIVE_SET has same size as NRC_NEGATIVE', () => {
    expect(NRC_NEGATIVE_SET.size).toBe(NRC_NEGATIVE.length);
  });

  it('NAWL_PL_POSITIVE_SET has same size as NAWL_PL_POSITIVE', () => {
    expect(NAWL_PL_POSITIVE_SET.size).toBe(NAWL_PL_POSITIVE.length);
  });

  it('NAWL_PL_NEGATIVE_SET has same size as NAWL_PL_NEGATIVE', () => {
    expect(NAWL_PL_NEGATIVE_SET.size).toBe(NAWL_PL_NEGATIVE.length);
  });
});

// ============================================================
// Combined cross-language sets
// ============================================================

describe('COMBINED cross-language sets', () => {
  it('COMBINED_POSITIVE_SET contains both English and Polish positive words', () => {
    expect(COMBINED_POSITIVE_SET.has('love')).toBe(true);      // English
    expect(COMBINED_POSITIVE_SET.has('kochać')).toBe(true);     // Polish
  });

  it('COMBINED_NEGATIVE_SET contains both English and Polish negative words', () => {
    expect(COMBINED_NEGATIVE_SET.has('hate')).toBe(true);       // English
    expect(COMBINED_NEGATIVE_SET.has('nienawidzić')).toBe(true); // Polish
  });

  it('COMBINED_POSITIVE_SET size = NRC + NAWL (union, minus overlap)', () => {
    // Combined is union, so size <= sum of both
    expect(COMBINED_POSITIVE_SET.size).toBeLessThanOrEqual(
      NRC_POSITIVE.length + NAWL_PL_POSITIVE.length,
    );
    // But at least as large as the bigger one
    expect(COMBINED_POSITIVE_SET.size).toBeGreaterThanOrEqual(
      Math.max(NRC_POSITIVE.length, NAWL_PL_POSITIVE.length),
    );
  });

  it('gibberish is not in combined sets', () => {
    expect(COMBINED_POSITIVE_SET.has('asdfghjkl')).toBe(false);
    expect(COMBINED_NEGATIVE_SET.has('asdfghjkl')).toBe(false);
  });
});

// ============================================================
// Size sanity checks (from file header comments)
// ============================================================

describe('Lexicon size sanity checks', () => {
  it('NRC_POSITIVE has ~2312 words', () => {
    expect(NRC_POSITIVE.length).toBeGreaterThan(2000);
    expect(NRC_POSITIVE.length).toBeLessThan(3000);
  });

  it('NRC_NEGATIVE has ~3324 words', () => {
    expect(NRC_NEGATIVE.length).toBeGreaterThan(3000);
    expect(NRC_NEGATIVE.length).toBeLessThan(4000);
  });

  it('NAWL_PL_POSITIVE has ~498 words', () => {
    expect(NAWL_PL_POSITIVE.length).toBeGreaterThan(400);
    expect(NAWL_PL_POSITIVE.length).toBeLessThan(600);
  });

  it('NAWL_PL_NEGATIVE has ~503 words', () => {
    expect(NAWL_PL_NEGATIVE.length).toBeGreaterThan(400);
    expect(NAWL_PL_NEGATIVE.length).toBeLessThan(700);
  });
});
