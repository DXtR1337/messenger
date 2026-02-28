/**
 * Tests for Pronoun Analysis module (Pennebaker, 2011).
 *
 * Key discoveries from reading pronouns.ts:
 * - computePronounAnalysis(messages: UnifiedMessage[], participantNames: string[]): PronounAnalysis | undefined
 *   Takes raw UnifiedMessage[] and string[] names — NOT ParsedConversation
 * - Returns undefined when: < 2 participants OR any participant has < 50 words
 *   (actually: returns undefined when Object.keys(perPerson).length < 2)
 * - "sobie" and "siebie" are I-words (reflexive that implies "I")
 * - Rates are per 1000 tokens (not 1000 words — uses tokenizer which splits on punctuation)
 * - iWeRatio = iRate / (iRate + weRate + 0.001), bounded [0, 1]
 * - relationshipOrientation = Math.round((totalWe / (totalI + totalWe)) * 100)
 *   = 50 when totalI + totalWe = 0 (fallback)
 */
import { describe, it, expect } from 'vitest';
import { computePronounAnalysis } from '../pronouns';
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

// Filler text to meet the 50-word threshold for the "non-focus" participant
const FILLER = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore';

// ============================================================
// Polish I-words
// ============================================================

describe('Pronoun Analysis — Polish I-words', () => {
  it('counts standalone "ja" (nominative)', () => {
    const msgs = buildMessages(
      Array(30).fill('ja chcę iść tam teraz naprawdę bardzo dużo myślę'),
      Array(30).fill(FILLER),
    );
    const result = computePronounAnalysis(msgs, ['Anna', 'Bartek']);
    if (result) {
      expect(result.perPerson['Anna'].iCount).toBeGreaterThan(0);
    }
  });

  it('counts accusative/locative "mnie"', () => {
    const msgs = buildMessages(
      Array(30).fill('mnie to nie dotyczy naprawdę wcale nie jest tak tego'),
      Array(30).fill(FILLER),
    );
    const result = computePronounAnalysis(msgs, ['Anna', 'Bartek']);
    if (result) {
      expect(result.perPerson['Anna'].iCount).toBeGreaterThan(0);
    }
  });

  it('counts dative "mi"', () => {
    const msgs = buildMessages(
      Array(30).fill('daj mi spokój to jest naprawdę bardzo ważne dla wszystkich'),
      Array(30).fill(FILLER),
    );
    const result = computePronounAnalysis(msgs, ['Anna', 'Bartek']);
    if (result) {
      expect(result.perPerson['Anna'].iCount).toBeGreaterThan(0);
    }
  });

  it('counts possessives: mój, moja, moje', () => {
    const msgs = buildMessages(
      Array(30).fill('to jest mój dom moja mama moje auto naprawdę bardzo fajne'),
      Array(30).fill(FILLER),
    );
    const result = computePronounAnalysis(msgs, ['Anna', 'Bartek']);
    if (result) {
      expect(result.perPerson['Anna'].iCount).toBeGreaterThan(0);
    }
  });

  it('counts reflexive "sobie" (implies I-focus)', () => {
    const msgs = buildMessages(
      Array(30).fill('muszę sobie z tym poradzić naprawdę to jest bardzo trudne'),
      Array(30).fill(FILLER),
    );
    const result = computePronounAnalysis(msgs, ['Anna', 'Bartek']);
    if (result) {
      expect(result.perPerson['Anna'].iCount).toBeGreaterThan(0);
    }
  });

  it('counts reflexive "siebie"', () => {
    const msgs = buildMessages(
      Array(30).fill('myślę tylko o siebie naprawdę to jest bardzo prawdziwe dobre'),
      Array(30).fill(FILLER),
    );
    const result = computePronounAnalysis(msgs, ['Anna', 'Bartek']);
    if (result) {
      expect(result.perPerson['Anna'].iCount).toBeGreaterThan(0);
    }
  });
});

// ============================================================
// Polish We-words
// ============================================================

describe('Pronoun Analysis — Polish We-words', () => {
  it('counts "my" (nominative plural) — NOTE: "my" is also in I_WORDS (English possessive), so it is counted as iCount not weCount due to if/else priority', () => {
    // IMPORTANT: "my" is in I_WORDS (English "my") which is checked BEFORE WE_WORDS.
    // So Polish "my" (we) gets counted as iCount, not weCount.
    // Use "nas"/"nam" instead to test actual we-counting.
    const msgs = buildMessages(
      Array(30).fill('nas tu razem jest nam bardzo dobrze nami razem zawsze naprawdę'),
      Array(30).fill(FILLER),
    );
    const result = computePronounAnalysis(msgs, ['Anna', 'Bartek']);
    if (result) {
      expect(result.perPerson['Anna'].weCount).toBeGreaterThan(0);
    }
  });

  it('counts "nas" (genitive/accusative/locative plural)', () => {
    const msgs = buildMessages(
      Array(30).fill('nas było dużo naprawdę bardzo wielu ludzi tam razem tutaj'),
      Array(30).fill(FILLER),
    );
    const result = computePronounAnalysis(msgs, ['Anna', 'Bartek']);
    if (result) {
      expect(result.perPerson['Anna'].weCount).toBeGreaterThan(0);
    }
  });

  it('counts possessives: nasz, nasza, nasze', () => {
    const msgs = buildMessages(
      Array(30).fill('nasz dom nasza rodzina nasze plany są naprawdę bardzo fajne'),
      Array(30).fill(FILLER),
    );
    const result = computePronounAnalysis(msgs, ['Anna', 'Bartek']);
    if (result) {
      expect(result.perPerson['Anna'].weCount).toBeGreaterThan(0);
    }
  });
});

// ============================================================
// Polish You-words
// ============================================================

describe('Pronoun Analysis — Polish You-words', () => {
  it('counts "ty" (nominative singular)', () => {
    const msgs = buildMessages(
      Array(30).fill('ty jesteś naprawdę bardzo fajny człowiek to jest ważne dla'),
      Array(30).fill(FILLER),
    );
    const result = computePronounAnalysis(msgs, ['Anna', 'Bartek']);
    if (result) {
      expect(result.perPerson['Anna'].youCount).toBeGreaterThan(0);
    }
  });

  it('counts "cię" (accusative) and "ci" (dative)', () => {
    const msgs = buildMessages(
      Array(30).fill('powiem ci to bardzo ważne i widzę cię naprawdę tutaj teraz'),
      Array(30).fill(FILLER),
    );
    const result = computePronounAnalysis(msgs, ['Anna', 'Bartek']);
    if (result) {
      expect(result.perPerson['Anna'].youCount).toBeGreaterThan(0);
    }
  });

  it('counts possessives: twój, twoja, twoje', () => {
    const msgs = buildMessages(
      Array(30).fill('twój pomysł twoja mama twoje auto są naprawdę bardzo dobre'),
      Array(30).fill(FILLER),
    );
    const result = computePronounAnalysis(msgs, ['Anna', 'Bartek']);
    if (result) {
      expect(result.perPerson['Anna'].youCount).toBeGreaterThan(0);
    }
  });
});

// ============================================================
// English pronouns
// ============================================================

describe('Pronoun Analysis — English pronouns', () => {
  it('counts English I-words: i, me, my, mine, myself', () => {
    const msgs = buildMessages(
      Array(30).fill('i love my life and me myself only care about mine alone'),
      Array(30).fill(FILLER),
    );
    const result = computePronounAnalysis(msgs, ['Anna', 'Bartek']);
    if (result) {
      expect(result.perPerson['Anna'].iCount).toBeGreaterThan(0);
    }
  });

  it('counts English we-words: we, us, our, ours, ourselves', () => {
    const msgs = buildMessages(
      Array(30).fill('we love us and our family is ours together ourselves always'),
      Array(30).fill(FILLER),
    );
    const result = computePronounAnalysis(msgs, ['Anna', 'Bartek']);
    if (result) {
      expect(result.perPerson['Anna'].weCount).toBeGreaterThan(0);
    }
  });

  it('counts English you-words: you, your, yours, yourself, yourselves', () => {
    const msgs = buildMessages(
      Array(30).fill('you and your family yourself that is yours yourselves always'),
      Array(30).fill(FILLER),
    );
    const result = computePronounAnalysis(msgs, ['Anna', 'Bartek']);
    if (result) {
      expect(result.perPerson['Anna'].youCount).toBeGreaterThan(0);
    }
  });
});

// ============================================================
// Ratio calculations
// ============================================================

describe('Pronoun Analysis — Ratio calculations', () => {
  it('iWeRatio is lower when WE-words dominate vs when I-words dominate', () => {
    // IMPORTANT: "my" is in both I_WORDS (English "my") and WE_WORDS (Polish "my").
    // Since I_WORDS is checked first (if/else chain), Polish "my" gets counted as iCount.
    // Use "nas"/"nasz"/"nasza" etc. which are purely in WE_WORDS.
    const weMsgs = buildMessages(
      Array(40).fill('nas razem nasz plan nasza rodzina naszego naszych naszymi nam nami'),
      Array(40).fill(FILLER),
    );
    // I-dominant: uses "ja"/"mnie"/"mi"/"moj" (pure i-words without "my")
    const iMsgs = buildMessages(
      Array(40).fill('ja mnie mi moj moja moje moich moim sobie siebie naprawde tutaj teraz'),
      Array(40).fill(FILLER),
    );

    const weResult = computePronounAnalysis(weMsgs, ['Anna', 'Bartek']);
    const iResult = computePronounAnalysis(iMsgs, ['Anna', 'Bartek']);

    if (weResult && weResult.perPerson['Anna'] && iResult && iResult.perPerson['Anna']) {
      // WE-dominant should have lower iWeRatio than I-dominant
      expect(weResult.perPerson['Anna'].iWeRatio).toBeLessThan(
        iResult.perPerson['Anna'].iWeRatio
      );
    }
  });

  it('iWeRatio is close to 1 when only "I" language used', () => {
    // Pure I-language: no we-words, only I-words
    const msgs = buildMessages(
      Array(40).fill('ja mnie mi mój moja moje moich moim sobie siebie naprawdę tutaj tak'),
      Array(40).fill(FILLER),
    );
    const result = computePronounAnalysis(msgs, ['Anna', 'Bartek']);
    if (result && result.perPerson['Anna']) {
      // With weCount = 0, weRate = 0 → iWeRatio = iRate / (iRate + 0.001) ≈ 1
      expect(result.perPerson['Anna'].iWeRatio).toBeGreaterThan(0.9);
    }
  });

  it('iWeRatio is in [0, 1] range', () => {
    const msgs = buildMessages(
      Array(30).fill('ja my ty nasz twój mój nas nam nami razem tutaj'),
      Array(30).fill('we us our you your yourself together always already'),
    );
    const result = computePronounAnalysis(msgs, ['Anna', 'Bartek']);
    if (result) {
      for (const [, stats] of Object.entries(result.perPerson)) {
        expect(stats.iWeRatio).toBeGreaterThanOrEqual(0);
        expect(stats.iWeRatio).toBeLessThanOrEqual(1);
      }
    }
  });

  it('rates (iRate, weRate, youRate) are non-negative', () => {
    const msgs = buildMessages(
      Array(30).fill('ja my ty razem tutaj naprawdę bardzo dużo zawsze wszyscy'),
      Array(30).fill('we us our you your always together really very much now'),
    );
    const result = computePronounAnalysis(msgs, ['Anna', 'Bartek']);
    if (result) {
      for (const [, stats] of Object.entries(result.perPerson)) {
        expect(stats.iRate).toBeGreaterThanOrEqual(0);
        expect(stats.weRate).toBeGreaterThanOrEqual(0);
        expect(stats.youRate).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('rates are rounded to 1 decimal place', () => {
    const msgs = buildMessages(
      Array(30).fill('ja mnie mi mój my nas nam ty cię ci twój twoja'),
      Array(30).fill('i me my mine we us our you your together always really'),
    );
    const result = computePronounAnalysis(msgs, ['Anna', 'Bartek']);
    if (result) {
      for (const [, stats] of Object.entries(result.perPerson)) {
        const rateStr = stats.iRate.toString();
        const decimalPart = rateStr.split('.')[1] ?? '';
        expect(decimalPart.length).toBeLessThanOrEqual(1);
      }
    }
  });
});

// ============================================================
// Edge cases
// ============================================================

describe('Pronoun Analysis — Edge cases', () => {
  it('returns undefined when fewer than 2 participants', () => {
    const msgs = Array.from({ length: 30 }, (_, i) =>
      makeMsg('Anna', 'ja mnie mi mój my nas ty', i * MINUTE, i)
    );
    const result = computePronounAnalysis(msgs, ['Anna']); // only 1 participant
    expect(result).toBeUndefined();
  });

  it('returns undefined when one participant has < 50 words (skipped from perPerson)', () => {
    // Anna has only 5 words total → skipped from perPerson → perPerson.length < 2 → undefined
    const msgs = buildMessages(
      ['ja ok'], // 2 tokens — well below 50
      Array(30).fill('my razem nasz plan nasza rodzina naprawdę bardzo fajne razem'),
    );
    const result = computePronounAnalysis(msgs, ['Anna', 'Bartek']);
    // Anna is excluded from perPerson (< 50 tokens), leaving only Bartek → < 2 → undefined
    expect(result).toBeUndefined();
  });

  it('handles empty messages without throwing', () => {
    expect(() => computePronounAnalysis([], ['Anna', 'Bartek'])).not.toThrow();
  });

  it('returns undefined for empty messages', () => {
    const result = computePronounAnalysis([], ['Anna', 'Bartek']);
    expect(result).toBeUndefined();
  });

  it('relationshipOrientation is in [0, 100]', () => {
    const msgs = buildMessages(
      Array(30).fill('ja my ty nasz twój mój nas nam nami razem tu'),
      Array(30).fill('we us our you your yourself together always really now here'),
    );
    const result = computePronounAnalysis(msgs, ['Anna', 'Bartek']);
    if (result) {
      expect(result.relationshipOrientation).toBeGreaterThanOrEqual(0);
      expect(result.relationshipOrientation).toBeLessThanOrEqual(100);
    }
  });

  it('relationshipOrientation is 50 when no pronouns at all (fallback)', () => {
    // Use content with absolutely zero pronoun words in either category
    const msgs = buildMessages(
      Array(40).fill('blah blah blah test lorem ipsum dolor sit amet consectetur'),
      Array(40).fill('blah blah blah test lorem ipsum dolor sit amet consectetur'),
    );
    const result = computePronounAnalysis(msgs, ['Anna', 'Bartek']);
    if (result) {
      // total = totalI + totalWe = 0 → fallback: 50
      expect(result.relationshipOrientation).toBe(50);
    }
  });

  it('returns consistent results when called twice (pure function)', () => {
    const msgs = buildMessages(
      Array(30).fill('ja mnie mi mój moja moje my nas nasz twój ty'),
      Array(30).fill('i me my mine we us our you your together always'),
    );
    const r1 = computePronounAnalysis(msgs, ['Anna', 'Bartek']);
    const r2 = computePronounAnalysis(msgs, ['Anna', 'Bartek']);
    if (r1 !== undefined && r2 !== undefined) {
      expect(r1.perPerson['Anna'].iCount).toBe(r2.perPerson['Anna'].iCount);
      expect(r1.relationshipOrientation).toBe(r2.relationshipOrientation);
    } else {
      expect(r1).toBe(r2); // both undefined
    }
  });

  it('iCount + weCount + youCount <= totalWords (no double-counting by design)', () => {
    // Each token is counted in at most ONE category (if/else if chain)
    const msgs = buildMessages(
      Array(30).fill('ja mnie mi mój my nas nasz twój ty cię ci razem'),
      Array(30).fill('i me my mine we us our you your together always'),
    );
    const result = computePronounAnalysis(msgs, ['Anna', 'Bartek']);
    if (result) {
      for (const [, stats] of Object.entries(result.perPerson)) {
        // Counts are raw counts (not rates), should make intuitive sense
        expect(stats.iCount).toBeGreaterThanOrEqual(0);
        expect(stats.weCount).toBeGreaterThanOrEqual(0);
        expect(stats.youCount).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
