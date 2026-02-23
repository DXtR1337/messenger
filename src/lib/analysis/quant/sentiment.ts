/**
 * Client-side sentiment analysis for Polish and English chat messages.
 *
 * Dictionary-based approach with ~200 positive and ~200 negative words
 * covering informal chat language, slang, and emotionally loaded terms
 * in both Polish (with diacritics + ASCII fallbacks) and English.
 */

import type { UnifiedMessage } from '../../parsers/types';
import type { PersonAccumulator } from './types';
import { getMonthKey } from './helpers';

// ============================================================
// Types
// ============================================================

export interface SentimentScore {
  positive: number;
  negative: number;
  total: number;
  /** Normalized score: (positive - negative) / total, range -1 to 1. 0 if no matches. */
  score: number;
}

export interface PersonSentimentStats {
  /** Average sentiment score across all messages, range -1 to 1 */
  avgSentiment: number;
  /** Fraction of messages with positive sentiment (score > 0) */
  positiveRatio: number;
  /** Fraction of messages with negative sentiment (score < 0) */
  negativeRatio: number;
  /** Fraction of messages with neutral sentiment (score = 0) */
  neutralRatio: number;
  /** Standard deviation of per-message sentiment scores — higher = more volatile */
  emotionalVolatility: number;
}

export type SentimentTrend = Array<{
  month: string;
  perPerson: Record<string, number>;
}>;

export interface SentimentAnalysis {
  perPerson: Record<string, PersonSentimentStats>;
  sentimentTrend: SentimentTrend;
}

// ============================================================
// Diacritics Stripping
// ============================================================

const DIACRITICS_MAP: Record<string, string> = {
  'ą': 'a', // ą
  'ć': 'c', // ć
  'ę': 'e', // ę
  'ł': 'l', // ł
  'ń': 'n', // ń
  'ó': 'o', // ó
  'ś': 's', // ś
  'ź': 'z', // ź
  'ż': 'z', // ż
};

/** Strip Polish diacritics from a string. */
function stripDiacritics(text: string): string {
  let result = '';
  for (const ch of text) {
    result += DIACRITICS_MAP[ch] ?? ch;
  }
  return result;
}

/**
 * Given a list of words, produce a Set containing each word
 * and its ASCII-stripped variant (if different).
 */
function buildDictionary(words: string[]): Set<string> {
  const dict = new Set<string>();
  for (const word of words) {
    const lower = word.toLowerCase();
    dict.add(lower);
    const stripped = stripDiacritics(lower);
    if (stripped !== lower) {
      dict.add(stripped);
    }
  }
  return dict;
}

// ============================================================
// Word Dictionaries
// ============================================================

const POSITIVE_WORDS_RAW = [
  // --- Polish: affection, love, admiration ---
  'kocham', 'kochanie', 'kochany', 'kochana', 'kochani',
  'uwielbiam', 'lubię', 'lubie', 'adoruję', 'adoruje',
  'tęsknię', 'tesknię', 'tesknie',
  'przytulam', 'buziaki', 'całuski', 'caluski', 'buziak',
  'serce', 'serduszko', 'skarbie', 'kotku', 'misiu',

  // --- Polish: praise, enthusiasm ---
  'cudownie', 'cudowny', 'cudowna', 'cudowne',
  'świetnie', 'świetny', 'świetna', 'świetne',
  'super', 'mega', 'ekstra', 'extra',
  'pięknie', 'piękny', 'piękna', 'piękne',
  'wspaniale', 'wspaniały', 'wspaniała', 'wspaniałe',
  'genialnie', 'genialny', 'genialna', 'genialne',
  'fantastycznie', 'fantastyczny', 'fantastyczna', 'fantastyczne',
  'niesamowicie', 'niesamowite', 'niesamowity', 'niesamowita',
  'idealnie', 'idealne', 'idealny', 'idealna',
  'ślicznie', 'śliczny', 'śliczna', 'śliczne',
  'rewelacja', 'rewelacyjnie', 'rewelacyjny', 'rewelacyjna',
  'perfekcyjnie', 'perfekcyjny', 'perfekcyjna',

  // --- Polish: positive adjectives / states ---
  'dobrze', 'dobry', 'dobra', 'dobre',
  'fajnie', 'fajny', 'fajna', 'fajne',
  'miło', 'miły', 'miła', 'miłe',
  'przyjemnie', 'przyjemny', 'przyjemna',
  'najlepszy', 'najlepsza', 'najlepsze', 'najlepiej',
  'szczęśliwy', 'szczęśliwa', 'szczęśliwe', 'szczęście',
  'zadowolony', 'zadowolona', 'zadowolone',
  'wdzięczny', 'wdzięczna', 'wdzięczne',
  'dumny', 'dumna', 'dumne',
  'radość', 'radosny', 'radosna', 'radosne',
  'spokojny', 'spokojna', 'spokojne', 'spokojnie',
  'uroczy', 'urocza', 'urocze',

  // --- Polish: exclamations, reactions ---
  'brawo', 'brawa', 'gratulacje', 'gratki',
  'dziękuję', 'dzięki', 'dzięks', 'dziena',
  'hurra', 'hura', 'jejku', 'ooo', 'oho',
  'wreszcie', 'nareszcie',
  'udało', 'udany', 'udana', 'udane',
  'sukces', 'wygrana', 'wygraliśmy',

  // --- Polish: slang, informal positive ---
  'zajebiście', 'zajebisty', 'zajebista', 'zajebiste',
  'spoko', 'spokojko', 'spokojna', 'spoczko',
  'kozak', 'kozacki', 'kozacka', 'kozacko',
  'petarda', 'bomba', 'czad', 'czadowy', 'czadowa',
  'sztos', 'sztosiwo', 'sztosik',
  'cudo', 'cud',
  'masakra', // positive slang context
  'git', 'gitara', 'gituwa',
  'odpał', 'odpal', 'odjazd', 'odjazdowy', 'odjazdowa',
  'niezły', 'niezła', 'niezle', 'niezłe',
  'zarąbisty', 'zarąbista', 'zarabisty', 'zarabista',
  'wow', 'łał', 'lal',

  // --- Polish: emotional engagement ---
  'cieszę', 'ciesze', 'cieszysz', 'cieszymy', 'cieszę się',
  'zachwycam', 'zachwycony', 'zachwycona', 'zachwycające',

  // --- English: love, affection ---
  'love', 'adore', 'cherish', 'miss', 'hug', 'kiss',
  'darling', 'sweetheart', 'babe', 'baby', 'honey',

  // --- English: praise, enthusiasm ---
  'amazing', 'awesome', 'great', 'perfect', 'beautiful',
  'wonderful', 'lovely', 'excellent', 'brilliant', 'incredible',
  'fantastic', 'outstanding', 'superb', 'magnificent', 'spectacular',
  'phenomenal', 'remarkable', 'extraordinary', 'fabulous', 'marvelous',

  // --- English: positive states ---
  'happy', 'glad', 'grateful', 'thankful', 'proud',
  'excited', 'thrilled', 'delighted', 'pleased', 'joyful',
  'blessed', 'lucky', 'cheerful', 'optimistic', 'hopeful',
  'confident', 'content', 'satisfied', 'peaceful', 'calm',

  // --- English: reactions, exclamations ---
  'thank', 'thanks', 'congrats', 'congratulations', 'bravo',
  'wow', 'omg', 'yay', 'woohoo', 'hurray',
  'finally', 'success', 'winning',

  // --- English: slang, informal positive ---
  'fire', 'lit', 'sick', 'dope', 'epic',
  'goat', 'based', 'bussin', 'vibes', 'slay',
  'iconic', 'legendary', 'insane', 'unreal', 'godly',
  'nice', 'cool', 'sweet', 'chill', 'solid',
  'best',
];

const NEGATIVE_WORDS_RAW = [
  // --- Polish: hatred, contempt ---
  'nienawidzę', 'nienawidze', 'nienawiść', 'nienawisc',
  'pogarda', 'odraza', 'wstręt', 'wstret',
  'obrzydliwe', 'obrzydliwy', 'obrzydliwa',

  // --- Polish: negative intensifiers ---
  'okropnie', 'okropny', 'okropna', 'okropne',
  'strasznie', 'straszny', 'straszna', 'straszne',
  'beznadziejnie', 'beznadziejny', 'beznadziejna', 'beznadziejne',
  'fatalnie', 'fatalny', 'fatalna', 'fatalne',
  'tragicznie', 'tragiczny', 'tragiczna', 'tragiczne',
  'żałosne', 'żałosny', 'żałosna', 'zalosne', 'zalosny', 'zalosna',
  'kiepski', 'kiepska', 'kiepskie', 'kiepsko',
  'słaby', 'słaba', 'słabe', 'słabo',

  // --- Polish: anger, irritation ---
  'wkurza', 'wkurzony', 'wkurzona', 'wkurzające', 'wkurzajace',
  'wkurwiający', 'wkurwiająca', 'wkurwiajacy', 'wkurwiajaca',
  'denerwuje', 'denerwujący', 'denerwujaca',
  'zdenerwowany', 'zdenerwowana', 'zdenerwowane',
  'sfrustrowany', 'sfrustrowana', 'sfrustrowane',
  'wściekły', 'wściekła', 'wsciekly', 'wscieka',
  'zły', 'zła', 'złe', 'złość', 'zlosc',
  'gniew', 'gniewny', 'gniewna',

  // --- Polish: sadness, suffering ---
  'smutno', 'smutny', 'smutna', 'smutne', 'smutek',
  'przykro', 'przykry', 'przykra',
  'boli', 'ból', 'bol', 'bolące', 'bolace',
  'cierpię', 'cierpie', 'cierpienie',
  'martwię', 'martwi', 'martwię się', 'martwie',
  'płaczę', 'placze', 'płakać', 'plakac',
  'samotny', 'samotna', 'samotne', 'samotność', 'samotnosc',
  'nieszczęśliwy', 'nieszczęśliwa', 'nieszczęśliwe',
  'nieszczęsliwy', 'nieszczęsliwa',

  // --- Polish: disappointment, failure ---
  'rozczarowany', 'rozczarowana', 'rozczarowane', 'rozczarowanie',
  'zawiedziony', 'zawiedziona', 'zawiedzeni',
  'załamany', 'załamana', 'zalamany', 'zalamana',
  'porażka', 'porazka', 'klęska', 'kleska',
  'zawód', 'zawod', 'katastrofa', 'koszmar',
  'dramat', 'dramatyczny', 'dramatyczna',
  'dno',

  // --- Polish: fear, anxiety ---
  'boję', 'boje', 'boję się', 'strach', 'lęk', 'lek',
  'obawa', 'obawy', 'przerażony', 'przerazony',
  'przerażona', 'przerazona',
  'niepokój', 'niepokoj', 'nerwowy', 'nerwowa',
  'panika', 'stres', 'stresujący', 'stresujacy',

  // --- Polish: guilt, shame ---
  'wstyd', 'wina', 'winny', 'winna',
  'żal', 'zal', 'żałuję', 'zaluję', 'zaluje',
  // 'przepraszam' and 'sorry' removed — apologies are repair behaviors (Gottman), not negative sentiment

  // --- Polish: negative social ---
  'toksyczny', 'toksyczna', 'toksyczne',
  'manipulacja', 'manipuluje', 'manipulujący',
  'kłamstwo', 'klamstwo', 'kłamca', 'klamca', 'kłamiesz', 'klamiesz',
  'zdrada', 'zdrajca', 'zdradzić', 'zdradza',
  'oszustwo', 'oszust', 'oszustka',
  'ignorujesz', 'ignoruje', 'olewa', 'olewasz', 'olejesz',

  // --- Polish: profanity ---
  'cholera', 'kurwa', 'kurde', 'kurcze',
  'szlag', 'do diabła', 'do cholery',
  'pierdolę', 'pierdole', 'pierdol',
  'jebać', 'jebac', 'jebany', 'jebana',
  'gówno', 'gowno',
  'spierdolić', 'spierdolic', 'spierdalaj',
  'chuj', 'chujowy', 'chujowa',

  // --- Polish: negation markers ---
  'brak', 'nigdy', 'niestety',
  'rozpacz', 'bezsens', 'bezsensu',
  'frustracja', 'frustrujące', 'frustrujace',
  'zgnilizna',

  // --- English: anger, hatred ---
  'hate', 'angry', 'furious', 'rage', 'enraged',
  'annoying', 'annoyed', 'irritating', 'irritated',
  'pissed', 'mad', 'livid',

  // --- English: sadness, suffering ---
  'sad', 'upset', 'depressed', 'miserable', 'heartbroken',
  'cry', 'crying', 'tears', 'sobbing',
  'lonely', 'alone', 'empty', 'numb', 'hopeless',
  'devastated', 'broken', 'shattered',

  // --- English: fear, anxiety ---
  'scared', 'afraid', 'terrified', 'anxious', 'worried',
  'nervous', 'panicked', 'dread', 'frightened',

  // --- English: negative adjectives ---
  'terrible', 'horrible', 'awful', 'disgusting', 'gross',
  'worst', 'stupid', 'idiot', 'pathetic', 'ridiculous',
  'ugly', 'dumb', 'lame', 'trash', 'garbage',
  'toxic', 'boring', 'cringe', 'crappy', 'lousy',
  'useless', 'worthless', 'pointless', 'meaningless',

  // --- English: disappointment ---
  'disappointed', 'frustrated', 'failed', 'failure',
  'regret', 'shame', 'guilty', 'blame',
  'sorry', 'never', 'nothing', 'nobody',

  // --- English: profanity ---
  'fuck', 'fucking', 'shit', 'shitty', 'damn',
  'ass', 'asshole', 'bastard', 'bitch',
  'wtf', 'stfu',
];

const POSITIVE_DICT = buildDictionary(POSITIVE_WORDS_RAW);
const NEGATIVE_DICT = buildDictionary(NEGATIVE_WORDS_RAW);

// ============================================================
// Tokenization (sentiment-specific)
// ============================================================

/**
 * Tokenize text to lowercase words for sentiment matching.
 * More permissive than the helpers.ts tokenizer — keeps short words
 * like "no", "ok", "zły" and does NOT filter stopwords,
 * since many sentiment words overlap with stopwords.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    // Normalize English contractions before splitting on apostrophes
    .replace(/\b(don|can|won|isn|aren|wasn|weren|hasn|haven|doesn|didn|couldn|wouldn|shouldn)'t\b/g, '$1t')
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .split(/[\s.,!?;:()\[\]{}"'\-\/\\<>@#$%^&*+=|~`]+/)
    .filter((w) => w.length >= 2);
}

// ============================================================
// Core Scoring
// ============================================================

// Negation particles — 2-token lookahead flips positive → negative
const NEGATION_PARTICLES = new Set([
  // Polish
  'nie', 'bez', 'ani',
  // English (tokenizer normalizes "don't"→"dont", "can't"→"cant", etc.)
  'not', 'dont', 'cant', 'wont', 'isnt', 'arent', 'wasnt',
  'werent', 'hasnt', 'havent', 'doesnt', 'didnt', 'couldnt',
  'wouldnt', 'shouldnt', 'never', 'no',
]);
const NEGATION_WINDOW = 2; // look ahead up to 2 tokens ("nie jestem szczęśliwy", "not really happy")

/**
 * Compute sentiment score for a single text string.
 *
 * Tokenizes to lowercase words, counts positive and negative
 * dictionary matches, returns normalized score.
 *
 * Negation handling: Polish (nie, bez, ani) and English (not, don't, never, etc.)
 * particles followed by a positive word within 2 tokens flip that positive → negative.
 */
export function computeSentimentScore(text: string): SentimentScore {
  const tokens = tokenize(text);
  let positive = 0;
  let negative = 0;

  // First pass: mark negated indices (positive→negative and negative→positive)
  const negatedIndices = new Set<number>();    // positive words flipped to negative
  const negatedNegIndices = new Set<number>(); // negative words flipped to positive
  const consumedNegations = new Set<number>();

  for (let i = 0; i < tokens.length; i++) {
    if (!NEGATION_PARTICLES.has(tokens[i])) continue;

    // Look ahead up to NEGATION_WINDOW tokens for a sentiment word to flip
    for (let j = 1; j <= NEGATION_WINDOW && i + j < tokens.length; j++) {
      const ahead = tokens[i + j];
      if (POSITIVE_DICT.has(ahead)) {
        negatedIndices.add(i + j);    // positive → negative ("nie lubię")
        consumedNegations.add(i);
        break;
      }
      if (NEGATIVE_DICT.has(ahead)) {
        negatedNegIndices.add(i + j); // negative → positive ("nie mam problemu")
        consumedNegations.add(i);
        break;
      }
    }
  }

  // Second pass: score tokens with negation awareness
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (consumedNegations.has(i)) continue; // skip consumed negation particle

    if (negatedIndices.has(i)) {
      // Positive word flipped by negation → count as negative
      negative++;
    } else if (negatedNegIndices.has(i)) {
      // Negative word flipped by negation → count as positive
      positive++;
    } else if (POSITIVE_DICT.has(token)) {
      positive++;
    } else if (NEGATIVE_DICT.has(token)) {
      negative++;
    }
  }

  const total = positive + negative;
  const score = total > 0 ? (positive - negative) / total : 0;

  return { positive, negative, total, score };
}

// ============================================================
// Per-Person Aggregation
// ============================================================

/**
 * Compute sentiment statistics for all messages from one person.
 *
 * Returns average sentiment, positive/negative/neutral ratios,
 * and emotional volatility (standard deviation of per-message scores).
 */
export function computePersonSentiment(
  messages: UnifiedMessage[],
): PersonSentimentStats {
  if (messages.length === 0) {
    return {
      avgSentiment: 0,
      positiveRatio: 0,
      negativeRatio: 0,
      neutralRatio: 1,
      emotionalVolatility: 0,
    };
  }

  const scores: number[] = [];
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;

  for (const msg of messages) {
    if (!msg.content || msg.type !== 'text') continue;
    const result = computeSentimentScore(msg.content);
    scores.push(result.score);

    if (result.score > 0) positiveCount++;
    else if (result.score < 0) negativeCount++;
    else neutralCount++;
  }

  const totalScored = scores.length;
  if (totalScored === 0) {
    return {
      avgSentiment: 0,
      positiveRatio: 0,
      negativeRatio: 0,
      neutralRatio: 1,
      emotionalVolatility: 0,
    };
  }

  const sum = scores.reduce((acc, s) => acc + s, 0);
  const avgSentiment = sum / totalScored;

  // Standard deviation for emotional volatility
  const squaredDiffs = scores.map((s) => (s - avgSentiment) ** 2);
  const variance = squaredDiffs.reduce((acc, d) => acc + d, 0) / totalScored;
  const emotionalVolatility = Math.sqrt(variance);

  return {
    avgSentiment,
    positiveRatio: positiveCount / totalScored,
    negativeRatio: negativeCount / totalScored,
    neutralRatio: neutralCount / totalScored,
    emotionalVolatility,
  };
}

// ============================================================
// Monthly Trend
// ============================================================

/**
 * Compute per-person monthly average sentiment score.
 *
 * Groups messages by month and person, computes average sentiment
 * for each bucket, producing a time-series for trend visualization.
 */
export function computeSentimentTrend(
  _accumulators: Map<string, PersonAccumulator>,
  sortedMonths: string[],
  messages: UnifiedMessage[],
  participantNames: string[],
): SentimentTrend {
  // Build monthly sentiment sums and counts per person
  const monthlyScores = new Map<
    string,
    Map<string, { sum: number; count: number }>
  >();

  for (const month of sortedMonths) {
    const personMap = new Map<string, { sum: number; count: number }>();
    for (const name of participantNames) {
      personMap.set(name, { sum: 0, count: 0 });
    }
    monthlyScores.set(month, personMap);
  }

  for (const msg of messages) {
    if (!msg.content || msg.type !== 'text') continue;

    const month = getMonthKey(msg.timestamp);
    const personMap = monthlyScores.get(month);
    if (!personMap) continue;

    const result = computeSentimentScore(msg.content);
    const entry = personMap.get(msg.sender);
    if (entry) {
      entry.sum += result.score;
      entry.count += 1;
    } else {
      // Sender not in original participantNames — track anyway
      personMap.set(msg.sender, { sum: result.score, count: 1 });
    }
  }

  return sortedMonths.map((month) => {
    const personMap = monthlyScores.get(month)!;
    const perPerson: Record<string, number> = {};

    for (const [name, data] of personMap) {
      perPerson[name] = data.count > 0 ? data.sum / data.count : 0;
    }

    return { month, perPerson };
  });
}
