/**
 * Emotional Granularity Score.
 *
 * Measures the diversity of emotion categories a person uses in their messages.
 * High granularity (many distinct emotion categories) correlates with better
 * emotional regulation; low granularity (binary good/bad) correlates with
 * depression and anxiety.
 *
 * References:
 * - Vishnubhotla, K. et al. (2024). Emotion Granularity from Text: An
 *   Aggregate-Level Indicator of Mental Health. EMNLP 2024, pp. 19168-19185.
 * - Suvak, M. K. et al. (2011). Emotional granularity: Associations with trauma,
 *   PTSD, and PTG. Journal of Traumatic Stress, 24(3), 256-265.
 * - Kashdan, T. B. et al. (2015). How are you feeling? Psychological Science, 26(12).
 */

import type { UnifiedMessage } from '../../parsers/types';

export interface PersonEmotionalGranularity {
  distinctCategories: number;
  emotionalWordCount: number;
  /** Polish-labeled category counts */
  categoryCounts: Record<string, number>;
  granularityScore: number;
  dominantCategory: string;
  /** Average Jaccard similarity of emotion categories per message — 0=isolated (high granularity), 1=all co-occur (low granularity) */
  categoryCooccurrenceIndex: number;
  /** Granularity adjusted for co-occurrence: granularityScore * (1 - cooccurrenceIndex * 0.3) */
  granularityScoreV2: number;
}

export interface EmotionalGranularityResult {
  perPerson: Record<string, PersonEmotionalGranularity>;
  higherGranularity: string;
}

// Emotion lexicon: 12 categories, Polish + English
const EMOTION_LEXICON: Record<string, string[]> = {
  joy: [
    'szczęśliwy', 'szczęśliwa', 'szczęście', 'radość', 'radosny', 'radosna', 'cieszę', 'cieszy',
    'wesoły', 'wesoła', 'uśmiech', 'śmieję', 'śmieje', 'bawię', 'fajnie', 'super', 'świetnie',
    'ekstra', 'bomba', 'bosko', 'cudownie', 'wspaniale',
    'happy', 'happiness', 'joy', 'joyful', 'glad', 'pleased', 'delighted', 'cheerful',
    'great', 'wonderful', 'amazing', 'fantastic', 'awesome',
  ],
  sadness: [
    'smutny', 'smutna', 'smutek', 'smutno', 'płaczę', 'płakał', 'płakała', 'żal',
    'żałuję', 'tęsknię', 'tęsknota', 'boli', 'martwię', 'żałosne', 'ponuro', 'ponury',
    'sad', 'sadness', 'unhappy', 'depressed', 'miserable', 'crying', 'lonely',
    'hopeless', 'heartbroken', 'grief', 'sorrow', 'miss',
  ],
  anger: [
    'zły', 'zła', 'złość', 'wkurwiony', 'wkurwiona', 'wkurwia', 'wkurw',
    'wściekły', 'wściekła', 'wściekłość', 'irytuje', 'irytacja', 'denerwuje',
    'nerwy', 'nienawidzę', 'nienawiść', 'furia', 'agresja', 'cholera',
    'angry', 'anger', 'furious', 'rage', 'mad', 'annoyed', 'irritated', 'hate',
    'pissed', 'livid', 'enraged', 'hatred',
  ],
  fear: [
    'boję', 'boi', 'strach', 'straszny', 'straszna', 'przerażony', 'przerażona',
    'przerażenie', 'lęk', 'niepokój', 'panika', 'nerwowy', 'nerwowa', 'stresuje',
    'afraid', 'fear', 'scared', 'terrified', 'anxious', 'worried', 'nervous',
    'panic', 'dread', 'frightened', 'horror',
  ],
  surprise: [
    'zaskoczony', 'zaskoczona', 'zaskoczenie', 'niesamowite', 'nie do wiary',
    'serio', 'poważnie', 'niemożliwe', 'szok', 'wow', 'no nie',
    'surprised', 'shocking', 'unexpected', 'unbelievable', 'omg', 'seriously',
    'astonished', 'amazed', 'stunned', 'whoa',
  ],
  disgust: [
    'obrzydliwy', 'obrzydliwa', 'obrzydzenie', 'ohydny', 'fuj', 'wstręt',
    'mdli', 'paskudny', 'paskudna',
    'disgusting', 'disgusted', 'gross', 'revolting', 'yuck', 'horrible', 'nasty',
  ],
  anticipation: [
    'czekam', 'nie mogę się doczekać', 'podekscytowany', 'podekscytowana',
    'mam nadzieję', 'planuję', 'zamierzam', 'już nie mogę',
    'looking forward', 'excited about', 'anticipating', 'hopeful', 'eager',
  ],
  trust: [
    'ufam', 'zaufanie', 'liczę na', 'wierzę', 'lojalny', 'lojalna',
    'bezpiecznie', 'spokojnie', 'komfort', 'swobodnie',
    'trust', 'rely', 'believe', 'confident', 'safe', 'secure', 'loyal',
  ],
  frustration: [
    'frustracja', 'sfrustrowany', 'sfrustrowana', 'nie rozumiem', 'nie działa',
    'bez sensu', 'po co', 'znowu', 'zawsze tak samo', 'nieskutecznie', 'nic nie wychodzi',
    'frustrated', 'frustrating', 'useless', 'pointless', 'again', 'always',
  ],
  affection: [
    'kocham', 'lubię cię', 'tęsknię za', 'miłość', 'serdeczność', 'ciepło',
    'blisko', 'bliski', 'bliska', 'przytulić', 'buzi', 'całuję', 'misiu', 'kotku',
    'love', 'adore', 'cherish', 'fond', 'affectionate', 'hugs', 'kiss',
    'miss you', 'darling', 'sweetheart', 'babe',
  ],
  loneliness: [
    'samotny', 'samotna', 'samotność', 'sam', 'sama', 'bez ciebie', 'pusty', 'pusta',
    'nikt', 'nikogo', 'odizolowany',
    'lonely', 'alone', 'isolated', 'empty', 'nobody',
  ],
  pride: [
    'dumny', 'dumna', 'duma', 'udało mi się', 'osiągnąłem', 'osiągnęłam', 'udało',
    'w końcu', 'nareszcie', 'pochwała',
    'proud', 'accomplished', 'achieved', 'succeeded', 'finally', 'nailed it',
  ],
};

export const EMOTION_CATEGORY_LABELS: Record<string, string> = {
  joy: 'Radość',
  sadness: 'Smutek',
  anger: 'Złość',
  fear: 'Strach/Lęk',
  surprise: 'Zaskoczenie',
  disgust: 'Odraza',
  anticipation: 'Antycypacja',
  trust: 'Zaufanie',
  frustration: 'Frustracja',
  affection: 'Czułość',
  loneliness: 'Samotność',
  pride: 'Duma',
};

// Reverse lookup: word → category list
const WORD_TO_CATS = new Map<string, string[]>();
for (const [cat, words] of Object.entries(EMOTION_LEXICON)) {
  for (const word of words) {
    const existing = WORD_TO_CATS.get(word) ?? [];
    existing.push(cat);
    WORD_TO_CATS.set(word, existing);
  }
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2);
}

/**
 * Score = 70% diversity + 30% coverage.
 * - Diversity (70% weight): fraction of the 12 emotion categories used. Prioritized because
 *   range of emotions used is the core granularity signal (Kashdan 2015).
 * - Coverage (30% weight): emotional word density. ×300 maps 0–0.33 density to 0–100;
 *   10% emotion word density → max coverage score. Typical chat: 3–8% emotional words.
 */
function computeScore(distinctCats: number, emotionWords: number, totalWords: number): number {
  if (totalWords < 50) return 0;
  const diversityScore = (distinctCats / 12) * 70;
  const coverageScore = Math.min(30, (emotionWords / totalWords) * 300);
  return Math.round(Math.min(100, diversityScore + coverageScore));
}

export function computeEmotionalGranularity(
  messages: UnifiedMessage[],
  participantNames: string[],
): EmotionalGranularityResult | undefined {
  if (participantNames.length < 2) return undefined;

  const stats: Record<string, {
    catCounts: Record<string, number>;
    emotionWords: number;
    totalWords: number;
    // Co-occurrence: count messages with 1+ emotion words, and those with 2+ distinct categories
    msgsWithEmotion: number;
    msgsWithMultipleCats: number;
  }> = {};
  for (const name of participantNames) {
    stats[name] = { catCounts: {}, emotionWords: 0, totalWords: 0, msgsWithEmotion: 0, msgsWithMultipleCats: 0 };
  }

  for (const msg of messages) {
    if (!msg.content || !stats[msg.sender]) continue;
    const tokens = tokenize(msg.content);
    const s = stats[msg.sender];
    s.totalWords += tokens.length;

    // Track categories found in this message
    const msgCats = new Set<string>();
    for (const token of tokens) {
      const cats = WORD_TO_CATS.get(token);
      if (cats) {
        s.emotionWords++;
        for (const cat of cats) {
          s.catCounts[cat] = (s.catCounts[cat] ?? 0) + 1;
          msgCats.add(cat);
        }
      }
    }

    if (msgCats.size >= 1) s.msgsWithEmotion++;
    if (msgCats.size >= 2) s.msgsWithMultipleCats++;
  }

  const perPerson: Record<string, PersonEmotionalGranularity> = {};
  for (const name of participantNames) {
    const s = stats[name];
    if (s.totalWords < 200) continue;

    const distinct = Object.keys(s.catCounts).length;
    const score = computeScore(distinct, s.emotionWords, s.totalWords);

    // Co-occurrence index: fraction of emotional messages where 2+ categories appear simultaneously
    const cooccurrenceIndex = s.msgsWithEmotion > 0
      ? Math.round((s.msgsWithMultipleCats / s.msgsWithEmotion) * 100) / 100
      : 0;

    // V2 score: penalize for high co-occurrence (indicates low differentiation, not true granularity).
    // ×0.3: moderate 30% max reduction for same-category co-occurrence.
    // Prevents double-counting emotions that always appear together, but doesn't over-penalize
    // messages that legitimately contain multiple distinct emotions (e.g., bittersweet).
    // Clamp cooccurrenceIndex to [0, 1] to prevent negative scores from floating-point edge cases.
    const clampedCooccurrence = Math.min(1, Math.max(0, cooccurrenceIndex));
    const granularityScoreV2 = Math.max(0, Math.round(score * (1 - clampedCooccurrence * 0.3)));

    // Dominant category
    let dominantCat = 'joy';
    let maxCount = 0;
    for (const [cat, cnt] of Object.entries(s.catCounts)) {
      if (cnt > maxCount) { maxCount = cnt; dominantCat = cat; }
    }

    // Relabel to Polish
    const labeledCounts: Record<string, number> = {};
    for (const [cat, cnt] of Object.entries(s.catCounts)) {
      labeledCounts[EMOTION_CATEGORY_LABELS[cat] ?? cat] = cnt;
    }

    perPerson[name] = {
      distinctCategories: distinct,
      emotionalWordCount: s.emotionWords,
      categoryCounts: labeledCounts,
      granularityScore: score,
      dominantCategory: EMOTION_CATEGORY_LABELS[dominantCat] ?? dominantCat,
      categoryCooccurrenceIndex: cooccurrenceIndex,
      granularityScoreV2,
    };
  }

  if (Object.keys(perPerson).length < 2) return undefined;

  const sorted = participantNames
    .filter(n => perPerson[n])
    .sort((a, b) => perPerson[b].granularityScoreV2 - perPerson[a].granularityScoreV2);

  return { perPerson, higherGranularity: sorted[0] };
}
