/**
 * Temporal Focus / Future Orientation.
 *
 * Measures whether a person's language is oriented toward the past, present, or future.
 * Uses marker-based approach (analog to LIWC temporal tense categories) adapted for Polish.
 *
 * Low future orientation in romantic relationships correlates with avoidant attachment style
 * (Vanderbilt, Brinberg & Lu, 2025 — future-focused language ↑ in anxious attachment).
 * Declining future orientation over conversation timeline = growing relational disengagement.
 *
 * References:
 * - Pennebaker, J. W. et al. (2007). Linguistic Inquiry and Word Count (LIWC 2007).
 *   Temporal focus categories: focuspast, focuspresent, focusfuture.
 * - Vanderbilt, Brinberg & Lu (2025). Attachment and texting behavior in couples.
 *   Journal of Language and Social Psychology. DOI: 10.1177/0261927X251344949.
 * - Dzogang, F. et al. (2017). Diurnal variations of psychometric indicators in Twitter
 *   content. PLoS ONE, 12(11). Negative affect peaks late evening.
 */

import type { UnifiedMessage } from '../../parsers/types';

export interface PersonTemporalFocus {
  pastRate: number;     // markers per 1000 words
  presentRate: number;
  futureRate: number;
  /** futureRate / (pastRate + presentRate + futureRate + 0.001) — 0 to 1 */
  futureIndex: number;
  orientation: 'retrospective' | 'present_focused' | 'prospective';
  label: string;  // Polish label
}

export interface TemporalFocusResult {
  perPerson: Record<string, PersonTemporalFocus>;
  /** Monthly trend of futureIndex per person */
  monthlyFutureTrend: Array<{ month: string; perPerson: Record<string, number> }>;
  /** Who is more future-oriented */
  moreProspective: string;
  interpretation: string;
}

// ============================================================
// Temporal marker dictionaries
// ============================================================

const PAST_MARKERS_PL = new Set([
  'wczoraj', 'poprzednio', 'kiedyś', 'dawniej', 'tamtego', 'ostatnio',
  'było', 'byłem', 'byłam', 'byłeś', 'byłaś', 'byli', 'byliśmy',
  'miałem', 'miałam', 'miałeś', 'miałaś', 'miał', 'miała',
  'robiłem', 'robiłam', 'robiłeś', 'robiłaś', 'zrobiłem', 'zrobiłam',
  'pamiętam', 'pamiętasz', 'pamiętał', 'pamiętała',
  'wtedy', 'wtedy gdy', 'w tamtym czasie', 'jeszcze jak', 'za czasów',
  'niegdyś', 'onegdaj', 'z przeszłości', 'z tyłu',
  'poszedłem', 'poszłam', 'pojechałem', 'pojechałam', 'wrócił', 'wróciła',
  'zobaczyłem', 'zobaczyłam', 'powiedziałem', 'powiedziałam',
]);

const PRESENT_MARKERS_PL = new Set([
  'teraz', 'dziś', 'dzisiaj', 'aktualnie', 'w tej chwili', 'obecnie',
  'właśnie', 'na razie', 'w tym momencie', 'w tej chwili',
  'jestem', 'jest', 'jesteś', 'jesteśmy', 'są',
  'mam', 'masz', 'ma', 'mamy',
  'robię', 'robi', 'robisz', 'robimy',
  'idę', 'idziesz', 'idzie', 'idziemy',
]);

const FUTURE_MARKERS_PL = new Set([
  'jutro', 'pojutrze', 'wkrótce', 'za tydzień', 'za miesiąc', 'za rok',
  'niebawem', 'w przyszłości', 'pewnego dnia', 'kiedyś będę',
  'planuję', 'zamierzam', 'chcę', 'chciałbym', 'chciałabym',
  'będę', 'będziesz', 'będzie', 'będziemy', 'będziecie', 'będą',
  'zrobię', 'pójdę', 'pojadę', 'wróco', 'wrócę', 'spotkamy',
  'może kiedyś', 'marzę o', 'marzę że', 'marzę żeby',
  'nadzieja', 'mam nadzieję', 'liczę na', 'plany', 'plan',
  'chciałem', 'chciałam',  // intentional past as future wish marker
]);

const PAST_MARKERS_EN = new Set([
  'yesterday', 'last week', 'last month', 'last year', 'ago', 'used to',
  'back then', 'in the past', 'before', 'previously', 'formerly',
  'was', 'were', 'had', 'did', 'went', 'said', 'thought', 'felt', 'knew',
  'remembered', 'remember when',
]);

const PRESENT_MARKERS_EN = new Set([
  'now', 'today', 'currently', 'at the moment', 'right now', 'these days',
  'am', 'is', 'are', 'have', 'has', 'do', 'does', 'go', 'come', 'get',
]);

const FUTURE_MARKERS_EN = new Set([
  'tomorrow', 'next week', 'next month', 'next year', 'soon', 'eventually',
  'someday', 'one day', 'in the future', 'will', "won't", 'gonna', 'going to',
  'plan to', 'planning', 'intend', 'want to', 'hope to', 'dream of', 'expect',
  'looking forward', 'can\'t wait',
]);

// ============================================================
// Core computation
// ============================================================

function countMarkers(tokens: string[], markers: Set<string>): number {
  let count = 0;
  for (const token of tokens) {
    if (markers.has(token)) count++;
  }
  // Also check bigrams/trigrams
  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = tokens[i] + ' ' + tokens[i + 1];
    if (markers.has(bigram)) count++;
    if (i < tokens.length - 2) {
      const trigram = bigram + ' ' + tokens[i + 2];
      if (markers.has(trigram)) count++;
    }
  }
  return count;
}

/**
 * Classify temporal orientation from futureIndex.
 * Thresholds 0.35/0.20: empirical from observed Polish chat patterns, NOT LIWC-calibrated.
 * Polish chat typically shows higher present-tense markers than LIWC English norms
 * (common verb forms like "jest", "mam", "robię" are high-frequency present markers),
 * so the futureIndex is naturally compressed. These thresholds account for that.
 */
function classify(futureIndex: number): { orientation: PersonTemporalFocus['orientation']; label: string } {
  if (futureIndex >= 0.35) return { orientation: 'prospective', label: 'Prospektywny/a' };
  if (futureIndex >= 0.20) return { orientation: 'present_focused', label: 'Teraźniejszy/a' };
  return { orientation: 'retrospective', label: 'Retrospektywny/a' };
}

export function computeTemporalFocus(
  messages: UnifiedMessage[],
  participantNames: string[],
): TemporalFocusResult | undefined {
  if (participantNames.length < 2) return undefined;

  const stats: Record<string, {
    past: number; present: number; future: number; words: number;
    monthly: Record<string, { past: number; present: number; future: number; words: number }>;
  }> = {};

  for (const name of participantNames) {
    stats[name] = { past: 0, present: 0, future: 0, words: 0, monthly: {} };
  }

  for (const msg of messages) {
    if (!msg.content || !stats[msg.sender]) continue;
    const s = stats[msg.sender];
    const tokens = msg.content.toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 2);

    s.words += tokens.length;
    s.past += countMarkers(tokens, PAST_MARKERS_PL) + countMarkers(tokens, PAST_MARKERS_EN);
    s.present += countMarkers(tokens, PRESENT_MARKERS_PL) + countMarkers(tokens, PRESENT_MARKERS_EN);
    s.future += countMarkers(tokens, FUTURE_MARKERS_PL) + countMarkers(tokens, FUTURE_MARKERS_EN);

    const month = new Date(msg.timestamp).toISOString().slice(0, 7);
    if (!s.monthly[month]) s.monthly[month] = { past: 0, present: 0, future: 0, words: 0 };
    const m = s.monthly[month];
    m.words += tokens.length;
    m.past += countMarkers(tokens, PAST_MARKERS_PL) + countMarkers(tokens, PAST_MARKERS_EN);
    m.present += countMarkers(tokens, PRESENT_MARKERS_PL) + countMarkers(tokens, PRESENT_MARKERS_EN);
    m.future += countMarkers(tokens, FUTURE_MARKERS_PL) + countMarkers(tokens, FUTURE_MARKERS_EN);
  }

  const perPerson: Record<string, PersonTemporalFocus> = {};
  for (const name of participantNames) {
    const s = stats[name];
    if (s.words < 500) continue;

    const perMille = s.words / 1000;
    const pastRate = Math.round((s.past / perMille) * 10) / 10;
    const presentRate = Math.round((s.present / perMille) * 10) / 10;
    const futureRate = Math.round((s.future / perMille) * 10) / 10;
    const total = pastRate + presentRate + futureRate;
    const futureIndex = total > 0 ? Math.min(1, futureRate / (total + 0.001)) : 0;
    const { orientation, label } = classify(futureIndex);

    perPerson[name] = {
      pastRate,
      presentRate,
      futureRate,
      futureIndex: Math.round(futureIndex * 100) / 100,
      orientation,
      label,
    };
  }

  const validNames = participantNames.filter(n => perPerson[n]);
  if (validNames.length < 2) return undefined;

  // Monthly future trend
  const allMonths = [...new Set(
    validNames.flatMap(n => Object.keys(stats[n].monthly))
  )].sort();

  const monthlyFutureTrend = allMonths.map(month => {
    const monthPerPerson: Record<string, number> = {};
    for (const name of validNames) {
      const m = stats[name].monthly[month];
      if (m && m.words >= 50) {
        const tot = (m.past + m.present + m.future) / (m.words / 1000);
        monthPerPerson[name] = tot > 0
          ? Math.round((m.future / (m.words / 1000)) / (tot + 0.001) * 100) / 100
          : 0;
      } else {
        monthPerPerson[name] = 0;
      }
    }
    return { month, perPerson: monthPerPerson };
  });

  const sorted = [...validNames].sort((a, b) => perPerson[b].futureIndex - perPerson[a].futureIndex);
  const moreProspective = sorted[0];

  const aFuture = perPerson[validNames[0]].orientation;
  const bFuture = perPerson[validNames[1]].orientation;
  let interpretation: string;
  if (aFuture === bFuture) {
    interpretation = `Oboje wykazują podobną orientację czasową: ${perPerson[validNames[0]].label.toLowerCase()}.`;
  } else {
    interpretation = `${moreProspective} jest bardziej ${perPerson[moreProspective].label.toLowerCase()} — częściej mówi o przyszłości i planach.`;
  }

  return { perPerson, monthlyFutureTrend, moreProspective, interpretation };
}
