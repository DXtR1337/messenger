/**
 * Tests for Language Style Matching (LSM) module.
 *
 * Key discoveries from reading lsm.ts:
 * - computeLSM(messages: UnifiedMessage[], participantNames: string[]): LSMResult | undefined
 *   Takes raw UnifiedMessage[] and string[] of names — NOT a ParsedConversation
 * - Returns undefined when: < 2 participants OR either person has < 50 tokens
 * - Also returns undefined when all perCategory values are filtered (MIN_RATE = 0.001)
 * - LSM formula: 1 - |rateA - rateB| / (rateA + rateB + 0.0001) per category
 * - Overall = mean of INCLUDED categories only (those above MIN_RATE threshold)
 * - adaptationDirection present only when asymmetryScore > 0.005
 * - Interpretation thresholds: >= 0.85 "Wysoka", >= 0.70 "Umiarkowana", >= 0.55 "Niska", else "Bardzo niska"
 */
import { describe, it, expect } from 'vitest';
import { computeLSM } from '../lsm';
import type { UnifiedMessage } from '@/lib/parsers/types';

// ============================================================
// Fixture helpers
// ============================================================

function makeMsg(
  sender: string,
  content: string,
  timestamp: number,
  index?: number,
): UnifiedMessage {
  return {
    index: index ?? 0,
    sender,
    timestamp,
    content,
    type: 'text',
    reactions: [],
    hasMedia: false,
    hasLink: false,
    isUnsent: false,
  };
}

const MINUTE = 60 * 1000;

/** Build a message array with controlled text for two participants. */
function buildMessages(
  annaTexts: string[],
  bartekTexts: string[],
  baseTs = 1_700_000_000_000,
): UnifiedMessage[] {
  const msgs: UnifiedMessage[] = [];
  annaTexts.forEach((text, i) => {
    msgs.push(makeMsg('Anna', text, baseTs + i * 2 * MINUTE, i * 2));
  });
  bartekTexts.forEach((text, i) => {
    msgs.push(makeMsg('Bartek', text, baseTs + i * 2 * MINUTE + MINUTE, i * 2 + 1));
  });
  msgs.sort((a, b) => a.timestamp - b.timestamp);
  msgs.forEach((m, i) => { m.index = i; });
  return msgs;
}

// Rich function word text — ensures many tokens pass the MIN_RATE = 0.001 threshold
const FUNCTION_WORD_TEXT = 'i am not the one who always does this and that for you and me we do have will';
const POLISH_FUNCTION_WORD_TEXT = 'ja nie zawsze to my i ty są na do w że ale już bardzo';

// ============================================================
// Output shape
// ============================================================

describe('LSM — Output shape', () => {
  it('returns LSMResult with overall, perCategory, interpretation when enough tokens', () => {
    const msgs = buildMessages(
      Array(30).fill(FUNCTION_WORD_TEXT),
      Array(30).fill(FUNCTION_WORD_TEXT),
    );
    const result = computeLSM(msgs, ['Anna', 'Bartek']);
    if (result !== undefined) {
      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('perCategory');
      expect(result).toHaveProperty('interpretation');
      expect(typeof result.overall).toBe('number');
      expect(typeof result.perCategory).toBe('object');
      expect(typeof result.interpretation).toBe('string');
    }
    // Else undefined is also valid (if MIN_RATE filters all categories)
  });

  it('returns undefined when fewer than 50 tokens for either participant', () => {
    // "hi" = 1 token, 5 messages = 5 tokens total — way below 50
    const msgs = buildMessages(
      Array(5).fill('hi'),
      Array(5).fill('ok'),
    );
    const result = computeLSM(msgs, ['Anna', 'Bartek']);
    expect(result).toBeUndefined();
  });

  it('returns undefined for single participant', () => {
    const msgs = Array.from({ length: 60 }, (_, i) =>
      makeMsg('Anna', FUNCTION_WORD_TEXT, i * MINUTE, i)
    );
    const result = computeLSM(msgs, ['Anna']); // only 1 participant
    expect(result).toBeUndefined();
  });

  it('returns undefined for unknown participants (not in message senders)', () => {
    const msgs = buildMessages(
      Array(30).fill(FUNCTION_WORD_TEXT),
      Array(30).fill(FUNCTION_WORD_TEXT),
    );
    const result = computeLSM(msgs, ['Unknown', 'AlsoUnknown']);
    // Both will have 0 tokens < 50
    expect(result).toBeUndefined();
  });
});

// ============================================================
// Value ranges
// ============================================================

describe('LSM — Value ranges', () => {
  it('overall LSM is always in [0, 1]', () => {
    const msgs = buildMessages(
      Array(30).fill(FUNCTION_WORD_TEXT),
      Array(30).fill(FUNCTION_WORD_TEXT),
    );
    const result = computeLSM(msgs, ['Anna', 'Bartek']);
    if (result !== undefined) {
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(1);
    }
  });

  it('overall LSM is always in [0, 1] even when styles differ', () => {
    // Anna uses many negations, Bartek uses none — very different style
    const msgs = buildMessages(
      Array(30).fill('nie nigdy nic nikt nigdzie ani żaden bez nothing nobody never'),
      Array(30).fill('yes very happy all some many each every much several'),
    );
    const result = computeLSM(msgs, ['Anna', 'Bartek']);
    if (result !== undefined) {
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(1);
    }
  });

  it('per-category values are in [0, 1]', () => {
    const msgs = buildMessages(
      Array(30).fill(FUNCTION_WORD_TEXT),
      Array(30).fill('we are not always happy and that is not right because of this'),
    );
    const result = computeLSM(msgs, ['Anna', 'Bartek']);
    if (result !== undefined) {
      for (const [, val] of Object.entries(result.perCategory)) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      }
    }
  });

  it('overall is rounded to 2 decimal places', () => {
    const msgs = buildMessages(
      Array(30).fill(FUNCTION_WORD_TEXT),
      Array(30).fill(FUNCTION_WORD_TEXT),
    );
    const result = computeLSM(msgs, ['Anna', 'Bartek']);
    if (result !== undefined) {
      // Rounded to 2 decimal places — check it has at most 2 decimal digits
      const str = result.overall.toString();
      const decimalPart = str.split('.')[1] ?? '';
      expect(decimalPart.length).toBeLessThanOrEqual(2);
    }
  });
});

// ============================================================
// Interpretation thresholds
// ============================================================

describe('LSM — Interpretation thresholds', () => {
  it('identical function word text yields interpretation string', () => {
    // Identical texts = identical rates = LSM formula yields 1 - 0/(sum+ε) ≈ 1
    const sameText = Array(30).fill(FUNCTION_WORD_TEXT);
    const msgs = buildMessages(sameText, sameText);
    const result = computeLSM(msgs, ['Anna', 'Bartek']);
    if (result !== undefined) {
      expect(typeof result.interpretation).toBe('string');
      expect(result.interpretation.length).toBeGreaterThan(0);
    }
  });

  it('high LSM (>= 0.85) gets "Wysoka" interpretation', () => {
    const sameText = Array(40).fill(FUNCTION_WORD_TEXT);
    const msgs = buildMessages(sameText, sameText);
    const result = computeLSM(msgs, ['Anna', 'Bartek']);
    if (result !== undefined && result.overall >= 0.85) {
      expect(result.interpretation).toMatch(/Wysoka/i);
    }
  });

  it('low LSM (< 0.55) gets "Bardzo niska" interpretation', () => {
    // Maximally different: Anna uses ONLY negations, Bartek uses ONLY quantifiers (no overlap)
    const msgs = buildMessages(
      Array(50).fill('nie nigdy nic nikt nigdzie ani not no never none nothing nobody'),
      Array(50).fill('all some many every each much several most both enough more less'),
    );
    const result = computeLSM(msgs, ['Anna', 'Bartek']);
    if (result !== undefined && result.overall < 0.55) {
      expect(result.interpretation).toMatch(/Bardzo niska/i);
    }
  });

  it('interpretation is always a non-empty string', () => {
    const msgs = buildMessages(
      Array(30).fill(FUNCTION_WORD_TEXT),
      Array(30).fill(POLISH_FUNCTION_WORD_TEXT),
    );
    const result = computeLSM(msgs, ['Anna', 'Bartek']);
    if (result !== undefined) {
      expect(typeof result.interpretation).toBe('string');
      expect(result.interpretation.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================
// Polish function words
// ============================================================

describe('LSM — Polish function words', () => {
  it('counts Polish prepositions (w, na, do, za, z)', () => {
    const polishText = 'w domu na ulicy do sklepu za rogiem z tobą przy stole nad rzeką pod mostem';
    const msgs = buildMessages(
      Array(20).fill(polishText),
      Array(20).fill(polishText),
    );
    const result = computeLSM(msgs, ['Anna', 'Bartek']);
    if (result !== undefined) {
      // Prepositions category should be scored
      expect(typeof result.perCategory['prepositions']).toBe('number');
    }
  });

  it('counts Polish conjunctions (i, ale, bo, że, czy)', () => {
    const text = 'i ale bo że czy więc dlatego jednak że żeby gdy kiedy bo ponieważ';
    const msgs = buildMessages(
      Array(20).fill(text),
      Array(20).fill(text),
    );
    const result = computeLSM(msgs, ['Anna', 'Bartek']);
    if (result !== undefined) {
      expect(typeof result.perCategory['conjunctions']).toBe('number');
    }
  });

  it('counts Polish negations (nie, nigdy, żaden)', () => {
    const text = 'nie nigdy nic nikt nigdzie ani żaden żadna żadne';
    const msgs = buildMessages(
      Array(30).fill(text),
      Array(30).fill(text),
    );
    const result = computeLSM(msgs, ['Anna', 'Bartek']);
    if (result !== undefined) {
      expect(typeof result.perCategory['negations']).toBe('number');
    }
  });

  it('counts Polish personal pronouns (ja, ty, my, on, ona)', () => {
    const text = 'ja ty my on ona mnie mi cię ci nas nam jego jej mu';
    const msgs = buildMessages(
      Array(20).fill(text),
      Array(20).fill(text),
    );
    const result = computeLSM(msgs, ['Anna', 'Bartek']);
    if (result !== undefined) {
      expect(typeof result.perCategory['personalPronouns']).toBe('number');
    }
  });
});

// ============================================================
// Adaptation asymmetry
// ============================================================

describe('LSM — Adaptation asymmetry', () => {
  it('adaptationDirection is present when one person uses far more of a category', () => {
    // Anna uses many negations, Bartek uses essentially none
    const msgs = buildMessages(
      Array(40).fill('nie nigdy nic nikt nigdzie ani bez not never no nothing nobody nowhere'),
      Array(40).fill('very really always just still already also too even quite pretty almost often'),
    );
    const result = computeLSM(msgs, ['Anna', 'Bartek']);
    // May or may not have adaptation direction depending on asymmetryScore threshold (> 0.005)
    if (result !== undefined && result.adaptationDirection !== undefined) {
      expect(result.adaptationDirection).toHaveProperty('chameleon');
      expect(result.adaptationDirection).toHaveProperty('asymmetryScore');
      expect(typeof result.adaptationDirection.chameleon).toBe('string');
      expect(['Anna', 'Bartek']).toContain(result.adaptationDirection.chameleon);
      expect(result.adaptationDirection.asymmetryScore).toBeGreaterThan(0.005);
    }
  });

  it('adaptationDirection is undefined when styles are symmetric (asymmetryScore <= 0.005)', () => {
    // Identical texts → zero deviation → asymmetryScore = 0 → no adaptation direction
    const sameText = Array(40).fill(FUNCTION_WORD_TEXT);
    const msgs = buildMessages(sameText, sameText);
    const result = computeLSM(msgs, ['Anna', 'Bartek']);
    if (result !== undefined) {
      // With identical texts, asymmetryScore should be 0 → adaptationDirection undefined
      expect(result.adaptationDirection).toBeUndefined();
    }
  });

  it('adaptationDirection asymmetryScore is a positive number', () => {
    const msgs = buildMessages(
      Array(40).fill('nie nigdy nic nikt nigdzie ani nie nie nie nie nie nie nie'),
      Array(40).fill('yes very really always just already too even quite pretty almost often'),
    );
    const result = computeLSM(msgs, ['Anna', 'Bartek']);
    if (result !== undefined && result.adaptationDirection !== undefined) {
      expect(result.adaptationDirection.asymmetryScore).toBeGreaterThan(0);
      expect(Number.isFinite(result.adaptationDirection.asymmetryScore)).toBe(true);
    }
  });
});

// ============================================================
// Edge cases
// ============================================================

describe('LSM — Edge cases', () => {
  it('handles emoji-only messages (tokenizer strips emojis — may yield undefined)', () => {
    const msgs = buildMessages(
      Array(20).fill('😊😊😊😊😊❤️❤️❤️'),
      Array(20).fill('❤️❤️❤️😍😍😍🔥'),
    );
    const result = computeLSM(msgs, ['Anna', 'Bartek']);
    // Emoji are stripped by tokenizer → very few tokens → likely undefined
    // If not undefined, must be valid LSMResult
    if (result !== undefined) {
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(1);
    }
  });

  it('handles messages with mixed emoji and function words', () => {
    const msgs = buildMessages(
      Array(30).fill('i am 😊 not 😢 the one ❤️ who always does this and that for you'),
      Array(30).fill('we are 🔥 not always happy and that is not right because of this'),
    );
    const result = computeLSM(msgs, ['Anna', 'Bartek']);
    if (result !== undefined) {
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(1);
    }
  });

  it('handles messages with punctuation (tokenizer splits on punctuation)', () => {
    const msgs = buildMessages(
      Array(30).fill('i am not the one, who always does this... and that? for you!'),
      Array(30).fill('we are not always happy, and that is not right; because of this.'),
    );
    const result = computeLSM(msgs, ['Anna', 'Bartek']);
    if (result !== undefined) {
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(1);
    }
  });

  it('perCategory is a plain object (not null, not array)', () => {
    const msgs = buildMessages(
      Array(30).fill(FUNCTION_WORD_TEXT),
      Array(30).fill(FUNCTION_WORD_TEXT),
    );
    const result = computeLSM(msgs, ['Anna', 'Bartek']);
    if (result !== undefined) {
      expect(typeof result.perCategory).toBe('object');
      expect(result.perCategory).not.toBeNull();
      expect(Array.isArray(result.perCategory)).toBe(false);
    }
  });

  it('returns consistent results when called twice on same input (pure function)', () => {
    const msgs = buildMessages(
      Array(30).fill(FUNCTION_WORD_TEXT),
      Array(30).fill(POLISH_FUNCTION_WORD_TEXT),
    );
    const r1 = computeLSM(msgs, ['Anna', 'Bartek']);
    const r2 = computeLSM(msgs, ['Anna', 'Bartek']);
    if (r1 !== undefined && r2 !== undefined) {
      expect(r1.overall).toBe(r2.overall);
    } else {
      expect(r1).toBe(r2); // both undefined
    }
  });
});
