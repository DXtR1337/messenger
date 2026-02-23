/**
 * Language Style Matching (LSM) — Ireland & Pennebaker (2010).
 *
 * Computes function word similarity between conversation participants.
 * Higher LSM (closer to 1.0) indicates greater linguistic synchrony,
 * which predicts relationship quality and engagement.
 *
 * Uses 9 function word categories (simplified LIWC):
 * articles, prepositions, auxiliary verbs, conjunctions, negations,
 * quantifiers, personal pronouns, impersonal pronouns, adverbs.
 *
 * Bilingual: Polish + English function word dictionaries.
 *
 * Reference: Ireland, M. E., & Pennebaker, J. W. (2010).
 * Language style matching predicts relationship initiation and stability.
 * Psychological Science, 21(10), 1547-1553.
 */

import type { UnifiedMessage, LSMResult } from '../../parsers/types';

export type { LSMResult };

// ============================================================
// Function Word Dictionaries (PL + EN)
// ============================================================

const CATEGORIES: Record<string, Set<string>> = {
  articles: new Set([
    // English
    'a', 'an', 'the',
    // Polish (demonstratives used as articles)
    'ten', 'ta', 'to', 'tej', 'tego', 'temu', 'tym', 'te', 'tych',
  ]),
  prepositions: new Set([
    // Polish (invariant)
    'w', 'na', 'do', 'za', 'z', 'ze', 'od', 'po', 'przy', 'nad', 'pod',
    'przed', 'między', 'przez', 'dla', 'bez', 'wśród', 'wsrod', 'obok',
    'koło', 'kolo', 'wokół', 'wokol', 'wobec', 'poza', 'mimo',
    // English
    'in', 'on', 'at', 'for', 'with', 'to', 'from', 'by', 'of',
    'about', 'into', 'through', 'during', 'before', 'after',
    'above', 'below', 'between', 'under', 'over', 'near',
  ]),
  auxiliaryVerbs: new Set([
    // Polish
    'jest', 'są', 'był', 'była', 'było', 'byli', 'były',
    'będzie', 'bedzie', 'będą', 'beda', 'jestem', 'jesteś', 'jestes',
    'jesteśmy', 'jestesmy', 'byłem', 'byłam', 'bylam', 'bylem',
    'można', 'mozna', 'trzeba', 'powinno', 'może', 'moze',
    // English
    'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'shall', 'should', 'can', 'could',
    'may', 'might', 'must',
  ]),
  conjunctions: new Set([
    // Polish (invariant)
    'i', 'ale', 'lub', 'albo', 'bo', 'ponieważ', 'poniewaz',
    'więc', 'wiec', 'dlatego', 'jednak', 'natomiast', 'chociaż', 'chociaz',
    'że', 'ze', 'żeby', 'zeby', 'czy', 'gdyby', 'gdy', 'kiedy',
    // English
    'and', 'but', 'or', 'because', 'so', 'yet', 'nor',
    'although', 'though', 'while', 'since', 'unless', 'until',
    'if', 'when', 'where', 'that', 'which', 'who',
  ]),
  negations: new Set([
    // Polish
    'nie', 'nigdy', 'żaden', 'zaden', 'żadna', 'zadna', 'żadne', 'zadne',
    'nic', 'nikt', 'nigdzie', 'ani',
    // English
    'not', 'no', 'never', 'none', 'nothing', 'nobody', 'nowhere', 'neither',
  ]),
  quantifiers: new Set([
    // Polish
    'wszystko', 'wszystkie', 'wszyscy', 'każdy', 'kazdy', 'każda', 'kazda',
    'kilka', 'kilku', 'dużo', 'duzo', 'mało', 'malo', 'trochę', 'troche',
    'wiele', 'wielu', 'parę', 'pare', 'niektóre', 'niektore',
    // English
    'all', 'some', 'many', 'few', 'every', 'each', 'much',
    'several', 'any', 'most', 'both', 'enough', 'more', 'less',
  ]),
  personalPronouns: new Set([
    // Polish (all declension forms)
    'ja', 'mnie', 'mi', 'mną', 'mna',
    'ty', 'ciebie', 'ci', 'cię', 'cie', 'tobą', 'toba',
    'on', 'go', 'mu', 'nim', 'niego', 'niej', 'nią', 'nia',
    'ona', 'jej',
    'my', 'nas', 'nam', 'nami',
    'wy', 'was', 'wam', 'wami',
    'oni', 'one', 'ich', 'im', 'nimi',
    // English
    'i', 'me', 'you', 'he', 'him', 'she', 'her',
    'we', 'us', 'they', 'them', 'it',
  ]),
  impersonalPronouns: new Set([
    // Polish
    'to', 'tamto', 'coś', 'cos', 'ktoś', 'ktos',
    'czegoś', 'czegos', 'kogoś', 'kogos', 'komuś', 'komus',
    'sobie', 'siebie', 'się', 'sie',
    // English
    'this', 'that', 'these', 'those',
    'something', 'someone', 'anything', 'anyone',
    'everything', 'everyone', 'itself', 'themselves',
  ]),
  adverbs: new Set([
    // Polish
    'bardzo', 'naprawdę', 'naprawde', 'zawsze', 'właśnie', 'wlasnie',
    'już', 'juz', 'jeszcze', 'tylko', 'też', 'tez', 'również', 'rowniez',
    'chyba', 'raczej', 'pewnie', 'może', 'moze', 'jakoś', 'jakos',
    'dość', 'dosc', 'dosyć', 'dosyc', 'całkiem', 'calkiem',
    // English
    'very', 'really', 'always', 'just', 'still', 'already',
    'also', 'too', 'even', 'quite', 'pretty', 'almost',
    'often', 'sometimes', 'probably', 'maybe', 'perhaps',
  ]),
};

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

/**
 * Compute Language Style Matching between participants.
 * Only works for 2-person conversations (dyadic LSM).
 */
export function computeLSM(messages: UnifiedMessage[], participantNames: string[]): LSMResult | undefined {
  if (participantNames.length < 2) return undefined;

  // Split messages by person and tokenize
  const personTokens: Record<string, string[]> = {};
  for (const name of participantNames) {
    personTokens[name] = [];
  }

  for (const msg of messages) {
    if (!msg.content || !personTokens[msg.sender]) continue;
    personTokens[msg.sender].push(...tokenize(msg.content));
  }

  const nameA = participantNames[0];
  const nameB = participantNames[1];
  const tokensA = personTokens[nameA];
  const tokensB = personTokens[nameB];

  if (tokensA.length < 50 || tokensB.length < 50) return undefined;

  // Count function words per category per person
  const perCategory: Record<string, number> = {};
  const ratesA: Record<string, number> = {};
  const ratesB: Record<string, number> = {};

  for (const [catName, catWords] of Object.entries(CATEGORIES)) {
    let countA = 0;
    let countB = 0;

    for (const t of tokensA) {
      if (catWords.has(t)) countA++;
    }
    for (const t of tokensB) {
      if (catWords.has(t)) countB++;
    }

    // Rates per word
    ratesA[catName] = countA / tokensA.length;
    ratesB[catName] = countB / tokensB.length;

    // Skip categories where neither person uses these words — avoids false "perfect match"
    // (1 - 0/ε = 1.0 when both are 0, which inflates the overall LSM score)
    const MIN_RATE = 0.001;
    if (ratesA[catName] < MIN_RATE && ratesB[catName] < MIN_RATE) continue;

    // LSM formula: 1 - |rateA - rateB| / (rateA + rateB + 0.0001)
    perCategory[catName] = 1 - Math.abs(ratesA[catName] - ratesB[catName]) / (ratesA[catName] + ratesB[catName] + 0.0001);
  }

  // Overall: mean of INCLUDED categories only (empty categories excluded above)
  const catValues = Object.values(perCategory);
  if (catValues.length === 0) return undefined;
  const overall = catValues.reduce((a, b) => a + b, 0) / catValues.length;

  const interpretation =
    overall >= 0.85 ? 'Wysoka synchronizacja językowa — silna spójność komunikacyjna'
    : overall >= 0.70 ? 'Umiarkowana synchronizacja — dobra kompatybilność stylu'
    : overall >= 0.55 ? 'Niska synchronizacja — wyraźne różnice w stylu komunikacji'
    : 'Bardzo niska synchronizacja — odmienne style komunikacji';

  // Style proximity: who is closer to the shared midpoint of both profiles?
  // NOTE: This measures static proximity — NOT temporal adaptation over time.
  // Only uses scored categories (same set as overall LSM to ensure consistency).
  let deviationA = 0;
  let deviationB = 0;
  const scoredCats = Object.keys(perCategory);
  for (const cat of scoredCats) {
    const avg = (ratesA[cat] + ratesB[cat]) / 2;
    deviationA += Math.abs(ratesA[cat] - avg);
    deviationB += Math.abs(ratesB[cat] - avg);
  }
  // The person with LOWER deviation is closer to the midpoint — labeled as "chameleon"
  const asymmetryScore = Math.round(Math.abs(deviationA - deviationB) * 1000) / 1000;
  const adaptationDirection = asymmetryScore > 0.005 ? {
    chameleon: deviationA < deviationB ? nameA : nameB,
    asymmetryScore,
  } : undefined;

  return {
    overall: Math.round(overall * 100) / 100,
    perCategory,
    interpretation,
    adaptationDirection,
  };
}
