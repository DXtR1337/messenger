/**
 * Pronoun Analysis — Pennebaker (2011).
 *
 * Computes I/We/You pronoun rates per person. The I/We ratio is a validated
 * relationship health signal: high "we" usage indicates relationship orientation,
 * while high "I" usage indicates self-focus.
 *
 * Full Polish declension coverage to avoid undercounting in a highly inflected language.
 *
 * IMPORTANT — Polish pro-drop grammar:
 * Polish is a pro-drop language: subject pronouns are regularly OMITTED because
 * verb conjugations encode person, number, and gender. "Broniłam" (I was defending,
 * feminine) encodes "I" + gender within the verb form — no explicit pronoun needed.
 * Consequence: when a Polish speaker explicitly uses "ja" (I) or "my" (we), it carries
 * PRAGMATIC EMPHASIS or CONTRAST — it is a marked, non-neutral choice.
 * English LIWC norms (I ≈ 4–6‰, We ≈ 0.5–1.5‰ of all words) cannot be directly
 * applied to Polish text. Rates will be systematically lower in Polish-dominant
 * conversations. Require ≥200 words per person for stable I-rates; ≥1000 for We-rates.
 *
 * References:
 * - Pennebaker, J. W. (2011). The Secret Life of Pronouns.
 * - Szymczyk, Żakowicz, & Stemplewska-Żakowicz (2012). Przegląd Psychologiczny, 55(2).
 * - LIWC minimum: ≥100 words (skepticism), ≥200 for stable I-rates (practical minimum).
 */

import type { UnifiedMessage, PronounAnalysis, PersonPronounStats } from '../../parsers/types';

export type { PronounAnalysis, PersonPronounStats };

// ============================================================
// Pronoun Dictionaries (full Polish declension + English)
// ============================================================

// I-words: first person singular — all cases
const I_WORDS = new Set([
  // Polish: ja (nom), mnie (gen/acc), mi (dat), mną (instr), mnie (loc)
  'ja', 'mnie', 'mi', 'mną', 'mna',
  // Polish possessives: mój/moja/moje — all cases
  'mój', 'moj', 'moja', 'moje', 'moich', 'moim', 'moimi',
  'mojej', 'mojemu', 'moją', 'moja', 'moich',
  // Polish: reflexive forms that imply "I"
  'sobie', 'siebie',
  // English
  'i', 'me', 'my', 'mine', 'myself',
]);

// We-words: first person plural — all cases
const WE_WORDS = new Set([
  // Polish: my (nom), nas (gen/acc/loc), nam (dat), nami (instr)
  'my', 'nas', 'nam', 'nami',
  // Polish possessives: nasz/nasza/nasze — all cases
  'nasz', 'nasza', 'nasze', 'naszego', 'naszej', 'naszemu',
  'naszym', 'naszą', 'nasza', 'naszych', 'naszymi',
  // English
  'we', 'us', 'our', 'ours', 'ourselves',
]);

// You-words: second person — all cases
const YOU_WORDS = new Set([
  // Polish singular: ty (nom), ciebie/cię (gen/acc), ci/tobie (dat), tobą (instr), tobie (loc)
  'ty', 'ciebie', 'cię', 'cie', 'ci', 'tobie', 'tobą', 'toba',
  // Polish singular possessives: twój/twoja/twoje — all cases
  'twój', 'twoj', 'twoja', 'twoje', 'twojego', 'twojej', 'twojemu',
  'twoim', 'twoją', 'twoja', 'twoich', 'twoimi',
  // Polish plural: wy (nom), was (gen/acc/loc), wam (dat), wami (instr)
  'wy', 'was', 'wam', 'wami',
  // Polish plural possessives: wasz/wasza/wasze
  'wasz', 'wasza', 'wasze', 'waszego', 'waszej', 'waszemu',
  'waszym', 'waszą', 'wasza', 'waszych', 'waszymi',
  // English
  'you', 'your', 'yours', 'yourself', 'yourselves',
]);

// ============================================================
// Tokenizer
// ============================================================

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .split(/[\s.,!?;:()\[\]{}"'\-\/\\<>@#$%^&*+=|~`]+/)
    .filter((w) => w.length >= 1);
}

// ============================================================
// Core Computation
// ============================================================

export function computePronounAnalysis(
  messages: UnifiedMessage[],
  participantNames: string[],
): PronounAnalysis | undefined {
  if (participantNames.length < 2) return undefined;

  const stats: Record<string, { iCount: number; weCount: number; youCount: number; totalWords: number }> = {};
  for (const name of participantNames) {
    stats[name] = { iCount: 0, weCount: 0, youCount: 0, totalWords: 0 };
  }

  for (const msg of messages) {
    if (!msg.content || !stats[msg.sender]) continue;
    const tokens = tokenize(msg.content);
    const s = stats[msg.sender];
    s.totalWords += tokens.length;

    for (const token of tokens) {
      if (I_WORDS.has(token)) s.iCount++;
      else if (WE_WORDS.has(token)) s.weCount++;
      else if (YOU_WORDS.has(token)) s.youCount++;
    }
  }

  const perPerson: Record<string, PersonPronounStats> = {};
  let totalI = 0;
  let totalWe = 0;

  for (const name of participantNames) {
    const s = stats[name];
    // LIWC recommends ≥100 words minimum; 200 is practical minimum for stable I-rates.
    // Polish pro-drop means explicit pronoun rates are inherently lower — be generous.
    if (s.totalWords < 200) continue;

    const iRate = (s.iCount / s.totalWords) * 1000;
    const weRate = (s.weCount / s.totalWords) * 1000;
    const youRate = (s.youCount / s.totalWords) * 1000;

    perPerson[name] = {
      iCount: s.iCount,
      weCount: s.weCount,
      youCount: s.youCount,
      iRate: Math.round(iRate * 10) / 10,
      weRate: Math.round(weRate * 10) / 10,
      youRate: Math.round(youRate * 10) / 10,
      // Bounded proportion 0-1: avoids unbounded ratio when weRate ≈ 0
      iWeRatio: Math.round((iRate / (iRate + weRate + 0.001)) * 100) / 100,
    };

    totalI += s.iCount;
    totalWe += s.weCount;
  }

  if (Object.keys(perPerson).length < 2) return undefined;

  // Relationship orientation: we/(i+we) * 100
  const total = totalI + totalWe;
  const relationshipOrientation = total > 0 ? Math.round((totalWe / total) * 100) : 50;

  return { perPerson, relationshipOrientation };
}
