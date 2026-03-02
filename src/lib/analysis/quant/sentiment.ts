/**
 * Client-side sentiment analysis for Polish and English chat messages.
 *
 * Dictionary-based approach covering informal chat language, slang,
 * and emotionally loaded terms in Polish (with diacritics + ASCII fallbacks)
 * and English.
 *
 * Sources:
 *   - POSITIVE_WORDS_RAW / NEGATIVE_WORDS_RAW: manually curated base
 *     (plWordNet-emo / polemo2.0 additions, CC-BY 4.0;
 *      Zaśko-Zielińska et al. 2015, Kocoń et al. 2019, Nielsen 2011)
 *   - PL_EMO_POSITIVE / PL_EMO_NEGATIVE: extended plWordNet-emo forms
 *   - NAWL_POSITIVE / NAWL_NEGATIVE: Nencki Affective Word List — Basic Emotions
 *     Riegel et al. (2015), PLoS ONE 10(7):e0132305 (CC-BY 4.0)
 *     2902 Polish words rated on happiness/anger/sadness/fear/disgust (1–9 scale).
 *     Positive: hap_M_all > 4.5 AND avg(neg emotions) < 3.0
 *     Negative: avg(neg emotions) > 4.0 AND hap_M_all < 3.0
 *   - PL_EXTENDED_POSITIVE / PL_EXTENDED_NEGATIVE: additional manually curated
 *     Polish words validated against linguistic usage.
 *   - SP_POSITIVE / SP_NEGATIVE: sentiment-polish npm package v1.0.0 (MIT)
 *     AFINN-165 translated to Polish by Kuba Wolanin. ~1349 positive, ~2437 negative words.
 *     https://github.com/kubawolanin/sentiment-polish
 *     Embedded statically (no runtime import) for client-side bundle compatibility.
 *     "przepraszam" excluded from SP_NEGATIVE (Gottman repair behavior, not negativity).
 *   - NAWL_PL_POSITIVE / NAWL_PL_NEGATIVE: extended NAWL Polish word list from
 *     nrc-polish.ts (Riegel et al. 2015). 498 positive, 503 negative words.
 *     Additional forms not covered by the NAWL_POSITIVE set above.
 *   - PLWN_POSITIVE / PLWN_NEGATIVE: plWordNet 3.0 emotion annotations (plwn-sentiment.ts)
 *     Source: Wrocław University of Science and Technology (WUST)
 *     Maziarz et al. (2012, 2016). plWordNet — The Polish WordNet.
 *     477,881 lexical units analyzed; 10,549 with emotion annotation (##A1/##A2);
 *     1,442 ambiguous excluded; final: 1,949 positive + 4,707 negative lemmas.
 *
 * Total dictionary size (after deduplication via Set):
 *   Positive: ~5000+ unique word forms (incl. diacritic-stripped ASCII variants)
 *   Negative: ~8000+ unique word forms
 *
 * Raw word form counts (before dedup):
 *   POSITIVE_WORDS_RAW: 271 | PL_EMO_POSITIVE: 195 | NAWL_POSITIVE: 480 | PL_EXTENDED_POSITIVE: 106
 *   SP_POSITIVE: 1349 | NAWL_PL_POSITIVE: 498 | PLWN_POSITIVE: 1949
 *   NEGATIVE_WORDS_RAW: 304 | PL_EMO_NEGATIVE: 182 | NAWL_NEGATIVE: 139 | PL_EXTENDED_NEGATIVE: 150
 *   SP_NEGATIVE: 2437 | NAWL_PL_NEGATIVE: 503 | PLWN_NEGATIVE: 4707
 */

import type { UnifiedMessage } from '../../parsers/types';
import type { PersonAccumulator } from './types';
import { getMonthKey } from './helpers';
import { NAWL_PL_POSITIVE, NAWL_PL_NEGATIVE } from './nrc-polish';
import { PLWN_POSITIVE, PLWN_NEGATIVE } from './plwn-sentiment';

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
 * Polish inflection fallback: generate candidate nominative/base forms from
 * an inflected token and return any that exist in the provided dictionary set.
 *
 * Strategy: strip the most common inflectional suffixes from the token, then
 * try re-attaching the nominative endings the dictionary actually contains
 * (e.g. strip "-emu" from "cudownemu" → "cudown", try "cudowny" / "cudowna" /
 * "cudowne" / "cudownie" etc.).
 *
 * This avoids the need for a full stemmer while covering the vast majority of
 * sentiment-bearing adjective / participle / noun inflection in Polish chat.
 *
 * Returns the polarity if any candidate matches, undefined otherwise.
 *
 * NOT exported — internal implementation detail.
 */
function lookupInflectedPolish(
  token: string,
  posDict: Set<string>,
  negDict: Set<string>,
): 'positive' | 'negative' | undefined {
  // Lowered from 5 to 3 to catch inflected forms of short Polish emotional
  // words: "złego" (of "zły"), "złym", "bólu" (of "ból"), "żalu" (of "żal").
  // Safe because 3-letter tokens are too short for suffix stripping anyway.
  if (token.length < 3) return undefined;

  // Suffix → endings to try (longest first to avoid partial strips)
  // Each entry: [suffix_to_strip, ...endings_to_try_after_stripping]
  // Minimum stem length after stripping: 2 chars (lowered from 4 for short roots like "zł-").
  const INFLECTION_MAP: Array<[string, string[]]> = [
    // Present participle (gerundive) — strip -ującego/-ującemu → try -ujący/-ująca/-ujące/-ujący
    ['ującego', ['ujący', 'ująca', 'ujące']],
    ['ującemu', ['ujący', 'ująca', 'ujące']],
    ['ującą',   ['ujący', 'ująca', 'ujące']],
    ['ującym',  ['ujący', 'ująca', 'ujące']],
    ['ując',    ['ujący', 'ująca', 'ujące']],

    // Soft-stem adjective gen/dat (-iego / -iemu → -i / -y / -ie)
    ['iego',    ['y', 'a', 'e', 'i', 'ie']],
    ['iemu',    ['y', 'a', 'e', 'i', 'ie']],

    // Hard-stem adjective gen/dat (-ego / -emu → -y / -a / -e / -ie / -nie)
    ['ego',     ['y', 'a', 'e', 'ie', 'nie']],
    ['emu',     ['y', 'a', 'e', 'ie', 'nie']],

    // Instrumental/locative adjective (-ymi / -imi → -y / -a / -e)
    ['ymi',     ['y', 'a', 'e']],
    ['imi',     ['y', 'a', 'e', 'i']],

    // Plural gen adjective (-ych / -ich → -y / -a / -e)
    ['ych',     ['y', 'a', 'e']],
    ['ich',     ['y', 'a', 'e', 'i']],

    // Feminine gen/dat singular (-iej → -a / -ie / -y / base)
    ['iej',     ['a', 'ie', 'y', '']],

    // Noun dative (-owi → base)
    ['owi',     ['', 'a']],

    // Noun plural (-ami / -ach / -om → base / -a)
    ['ami',     ['', 'a']],
    ['ach',     ['', 'a', 'ie']],
    ['om',      ['', 'a']],

    // Noun abstract (-ości / -ość → -y / -a / base)
    ['ości',    ['y', 'a', 'ość']],

    // Verb past tense (-łem / -łam / -łeś / -łaś → -ć / base)
    ['łem',     ['ć', 'ać', 'yć', '']],
    ['łam',     ['ć', 'ać', 'yć', '']],
    ['łeś',     ['ć', 'ać', 'yć', '']],
    ['łaś',     ['ć', 'ać', 'yć', '']],
  ];

  for (const [suffix, endings] of INFLECTION_MAP) {
    if (!token.endsWith(suffix)) continue;
    const root = token.slice(0, -suffix.length);
    if (root.length < 2) continue;

    for (const ending of endings) {
      const candidate = root + ending;
      if (posDict.has(candidate)) return 'positive';
      if (negDict.has(candidate)) return 'negative';

      // Also try with diacritics stripped (handles ASCII-typed input)
      const strippedCandidate = stripDiacritics(candidate);
      if (strippedCandidate !== candidate) {
        if (posDict.has(strippedCandidate)) return 'positive';
        if (negDict.has(strippedCandidate)) return 'negative';
      }
    }
    // Found the right suffix group — no need to try others
    break;
  }

  return undefined;
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

// === plWordNet-emo / polemo2.0 additions (CC-BY 4.0) ===
// Zaśko-Zielińska et al. (2015) plWordNet-emo, Kocoń et al. (2019) polemo2.0
// Manually curated to avoid false positives; no duplicates with POSITIVE_WORDS_RAW above.

const PL_EMO_POSITIVE: readonly string[] = [
  // Polish: admiration, wonder
  'zachwyt', 'zachwycający', 'zachwycająca', 'zachwycająco',
  'zachwycam', // already in POSITIVE_WORDS_RAW as 'zachwycam' — kept for safety (buildDictionary deduplicates via Set)
  'olśniewający', 'olśniewająca', 'olśniewająco',
  'przepiękny', 'przepiękna', 'przepięknie',
  'bajeczny', 'bajeczna', 'bajeczne', 'bajeczni', 'bajeczność',
  'niezwykły', 'niezwykła', 'niezwykłe', 'niezwykle',
  'wyjątkowy', 'wyjątkowa', 'wyjątkowe', 'wyjątkowo',
  'doskonały', 'doskonała', 'doskonałe', 'doskonale',
  'wyśmienity', 'wyśmienita', 'wyśmienicie',
  'zafascynowany', 'zafascynowana', 'zafascynowanie',
  'entuzjastyczny', 'entuzjastyczna', 'entuzjastycznie', 'entuzjazm',

  // Polish: love & warmth (extended forms)
  'rozkochany', 'rozkochana', 'rozkochani',
  'zakochany', 'zakochana', 'zakochani',
  'tęskno', // complement to 'tęsknię' already in dict
  'serdeczny', 'serdeczna', 'serdecznie',
  'czuły', 'czuła', 'czułe', 'czule',
  'kochani', // already may exist as 'kochani' — safe duplicate

  // Polish: happiness, well-being
  'szczęśliwie', // complement to existing forms
  'błogi', 'błoga', 'błogo', 'błogość',
  'rozkoszny', 'rozkoszna', 'rozkosznie', 'rozkosz',
  'radośnie', // complement to existing 'radosny' family
  'uśmiech', 'uśmiechnięty', 'uśmiechnięta', 'uśmiechać',
  'pogodny', 'pogodna', 'pogodnie', 'pogoda', // mood-weather overlap — pogodny=sunny/cheerful
  'wesoły', 'wesoła', 'wesoło', 'wesołość',
  'promieniejący', 'promieniejąca', 'promienny', 'promiennie',
  'beztroski', 'beztroska', 'beztroski', // carefree
  'życzliwy', 'życzliwa', 'życzliwie', 'życzliwość',

  // Polish: safety, calm
  'bezpieczny', 'bezpieczna', 'bezpiecznie', 'bezpieczeństwo',
  'harmonijny', 'harmonijnie', 'harmonia',
  'opiekuńczy', 'opiekuńcza', 'opiekuńczo',
  'troskliwy', 'troskliwa', 'troskliwie', 'troska',
  'uzdrawiający', 'uzdrawiająca',

  // Polish: pride, achievement
  'dumnie', // complement to 'dumny/dumna' in dict
  'wartościowy', 'wartościowa', 'wartościowe',
  'niezastąpiony', 'niezastąpiona',
  'bezcenny', 'bezcenna', 'bezcenne',
  'zasługuje', 'zasługujesz', 'zasłużony', 'zasłużona',

  // Polish: gratitude, inspiration
  'wdzięcznie', // complement to 'wdzięczny/wdzięczna' in dict
  'zainspirowany', 'zainspirowana', 'zainspirowanie',
  'inspirujący', 'inspirująca', 'inspirująco',
  'motywujący', 'motywująca', 'motywująco',
  'budujący', 'budująca', 'budująco',
  'pozytywny', 'pozytywna', 'pozytywnie', 'pozytywność',

  // Polish: comfort, healing
  'pocieszający', 'pocieszająca', 'pocieszająco',
  'wspierający', 'wspierająca', 'wsparcie',
  'pomocny', 'pomocna', 'pomocnie',
  'rozumiejący', 'rozumiejąca',

  // English: admiration (not already in dict)
  'gorgeous', 'stunning', 'breathtaking', 'dazzling', 'glorious',
  'charming', 'delightful', 'enchanting', 'captivating',
  'exceptional', 'terrific', 'splendid',

  // English: care, emotional support
  'caring', 'thoughtful', 'supportive', 'compassionate', 'empathetic',
  'nurturing', 'kind', 'generous', 'gentle', 'patient',
  'warm', 'tender', 'devoted', 'faithful', 'loyal',

  // English: positive states (not already in dict)
  'elated', 'euphoric', 'overjoyed', 'ecstatic', 'radiant', 'vibrant',
  'inspired', 'motivated', 'energized', 'empowered',
  'adore', // already in dict — harmless duplicate via Set

  // English: gratitude / appreciation
  'appreciate', 'appreciated', 'grateful', // 'grateful' already in dict — deduped
  'treasured', 'cherished', 'valued',
  'precious',
];

const PL_EMO_NEGATIVE: readonly string[] = [
  // Polish: intensified negativity
  'koszmarny', 'koszmarnie', 'koszmarność',
  'wstrętny', 'wstrętna', 'wstrętnie', // 'wstręt' already in dict; forms are new
  'obrzydliwość', 'obrzydliwie', // base forms already in dict; adverb new
  'straszliwy', 'straszliwie',
  'okropność', // base 'okropny' already in dict

  // Polish: anger (extended)
  'wkurwiony', 'wkurwiona', // base wkurwia in dict; adjective forms new
  'wkurwia', // already in dict as 'wkurwia' — safe
  'sfrustrowanie',
  'rozgniewany', 'rozgniewana',
  'oburzony', 'oburzona', 'oburzające', 'oburzenie',
  'zirytowany', 'zirytowana', 'irytujący', 'irytująca', 'irytacja',
  'wściekłość', // complement to 'wściekły/wściekła' in dict
  'złość', // already in dict — harmless
  'zdenerwowanie',

  // Polish: hurt, betrayal, relationship pain
  'zdradził', 'zdradziła', 'zdradzić',
  'kłamie', 'kłamał', 'kłamała',
  'manipuluje', 'manipulował', 'manipulowała',
  'ignoruje', 'ignorował', 'ignorowała',
  'porzucił', 'porzuciła', 'porzucenie',
  'opuścił', 'opuściła', 'opuszczony', 'opuszczona',
  'urażony', 'urażona', 'uraza',
  'zraniony', 'zraniona', 'zranienie',
  'skrzywdzony', 'skrzywdzona', 'krzywda',
  'zawiodłem', 'zawiodłam', 'zawiodłeś', 'zawiodłaś',
  'zdrajca', // already in dict — harmless

  // Polish: despair, breakdown
  'zrozpaczony', 'zrozpaczona', 'rozpaczliwy', 'rozpaczliwie',
  'zdewastowany', 'zdewastowana',
  'zdruzgotany', 'zdruzgotana',
  'bezsilny', 'bezsilna', 'bezsilność',
  'bezsensowny', 'bezsensowna', 'bezsensownie',
  'przygnębiony', 'przygnębiona', 'przygnębienie',
  'zniechęcony', 'zniechęcona', 'zniechęcenie',
  'zagubiony', 'zagubiona', 'zagubienie',
  'wyczerpany', 'wyczerpana', 'wyczerpanie',
  'zmęczony', 'zmęczona', 'zmęczenie',
  'znudzony', 'znudzona', 'znudzenie',
  'apatyczny', 'apatyczna', 'apatia',

  // Polish: fear (extended)
  'przerażający', 'przerażająca', 'przerażająco',
  'spanikowany', 'spanikowana',
  'przeraźliwy', 'przeraźliwie',

  // Polish: toxicity, harm
  'agresywny', 'agresywna', 'agresywnie', 'agresja',
  'brutalny', 'brutalna', 'brutalnie', 'brutalność',
  'przemoc', 'przemocowy', 'przemocowa',
  'destrukcyjny', 'destrukcyjna', 'destrukcyjnie',
  'toksyczność', // base 'toksyczny' already in dict

  // Polish: loneliness, isolation
  'samotność', // already in dict as 'samotność' — harmless
  'odrzucony', 'odrzucona', 'odrzucenie',
  'wykluczony', 'wykluczona', 'wykluczenie',
  'niezrozumiany', 'niezrozumiana',

  // English: strong negative emotions (not already in dict)
  'dreadful', 'vile', 'despicable', 'repulsive', 'revolting',
  'hateful', 'loathsome',
  'anguish', 'despair', 'desolate', 'grief', 'torment', 'agony',
  'traumatic', 'traumatized', 'overwhelmed',
  'suffocating', 'trapped', 'draining', 'exhausting',

  // English: relationship harm
  'betrayed', 'abandoned', 'rejected', 'dismissed', 'belittled',
  'manipulative', 'controlling', 'abusive', 'selfish',
  'cruel', 'mean', 'nasty', 'vicious', 'hurtful',
  'humiliated', 'humiliation',
  'contempt', 'disgrace', 'degraded',
  'isolated', 'ignored', // 'ignored' may not be in dict (only ignorujesz etc.)

  // English: hopelessness
  'hopeless', // already in dict — harmless
  'helpless', 'powerless', 'defeated', 'broken', // 'broken' already in dict — harmless
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

// ============================================================
// NAWL (Nencki Affective Word List) — Riegel et al. (2015), PLoS ONE
// ============================================================
// 2902 Polish words rated on 5 basic emotions (1–9 scale).
// Source: https://doi.org/10.1371/journal.pone.0132305 (CC-BY 4.0)
// Extraction: positive = hap_M_all > 4.5 AND avg(ang+sad+fea+dis) < 3.0
//             negative = avg(ang+sad+fea+dis) > 4.0 AND hap_M_all < 3.0
// Extracted: 480 positive, 139 negative (deduplicated by buildDictionary Set)

const NAWL_POSITIVE: readonly string[] = [
  'akceptować', 'aktywność', 'aktywny', 'altanka', 'ambitny', 'anioł', 'aplauz', 'aromat', 'aromatyczny', 'atrakcyjny',
  'autorytet', 'awans', 'azyl', 'bajka', 'bawić', 'bezpieczny', 'biesiada', 'biust', 'blask', 'bliski',
  'bliskość', 'błogosławiony', 'błyskotliwy', 'bogaty', 'bóg', 'brat', 'brylantowy', 'bukiet', 'bystry', 'całować',
  'cel', 'chichot', 'chichotać', 'chleb', 'chronić', 'ciastko', 'ciasto', 'ciekawy', 'ciepły', 'córka',
  'cud', 'cukierek', 'czar', 'czarodziejski', 'czysty', 'czytać', 'ćwiczyć', 'dawać', 'dbać', 'deser',
  'diamentowy', 'dobroduszny', 'dobrodziejstwo', 'doceniać', 'dochód', 'dokładność', 'dom', 'domostwo', 'dostawać', 'doznawać',
  'drzewo', 'dumny', 'dyplom', 'działanie', 'dziecko', 'dziedziczyć', 'dzielny', 'dzieło', 'dziewczyna', 'dziękować',
  'dźwięk', 'efekt', 'ekstaza', 'energiczny', 'erotyczny', 'euforyczny', 'fantazja', 'film', 'fortuna', 'fotografować',
  'genialny', 'geniusz', 'gitara', 'gol', 'gotówka', 'gra', 'grać', 'gwiazda', 'harmonia', 'hobby',
  'hojny', 'honor', 'humor', 'huśtawka', 'hymn', 'idealny', 'idylla', 'impreza', 'instrument', 'inteligentny',
  'istnieć', 'jabłkowy', 'jasność', 'jazda', 'jechać', 'jedwabny', 'jeść', 'jezioro', 'kakao', 'kanaryjski',
  'kariera', 'karnawałowy', 'kasa', 'klejnot', 'kobieta', 'kochać', 'kochany', 'kolega', 'kolorowy', 'komfort',
  'komiczny', 'kominek', 'kompan', 'koncert', 'koniczyna', 'krajobraz', 'kreatywny', 'księżniczka', 'księżyc', 'kształcić',
  'kurort', 'kwiat', 'las', 'latać', 'lato', 'laur', 'lekkość', 'lemoniada', 'leżeć', 'lilia',
  'lizak', 'lojalny', 'lubić', 'luksusowy', 'ładny', 'łagodzić', 'łazienki', 'łąka', 'łóżko', 'magiczny',
  'maj', 'maksimum', 'malinowy', 'malować', 'małżeński', 'małżonek', 'mama', 'mamusia', 'mango', 'marzyć',
  'masaż', 'matka', 'mądrość', 'medal', 'melodyjny', 'mężczyzna', 'mieszkać', 'milion', 'miłość', 'miły',
  'miód', 'mistrz', 'miś', 'morze', 'motywować', 'móc', 'muzyk', 'muzyka', 'myśleć', 'nabytek',
  'nadmorski', 'nadzieja', 'nagradzać', 'narodziny', 'naturalny', 'niebo', 'niemowlę', 'oaza', 'obejmować', 'obrączka',
  'ocean', 'ochota', 'ochraniać', 'odetchnąć', 'odlatywać', 'odpowiedzialny', 'odwaga', 'odważny', 'odżywać', 'ogród',
  'ojciec', 'ojczyzna', 'oklaski', 'oklaskiwać', 'opieka', 'opiekuńczy', 'optymistyczny', 'osiągać', 'osiągnięcie', 'oswoić',
  'oszczędności', 'oświadczyny', 'otrzymywać', 'owocowy', 'pachnieć', 'pamiątka', 'panda', 'para', 'park', 'partner',
  'paryż', 'pasjonujący', 'pełnia', 'perfumy', 'pielęgnować', 'pieniądze', 'pies', 'pieścić', 'piosenka', 'piwo',
  'plaża', 'pochwała', 'podarować', 'podniecający', 'podróż', 'podróżować', 'poduszka', 'podziękowanie', 'pojętny', 'pokój',
  'polana', 'pomagać', 'pomocny', 'pomysł', 'ponadczasowy', 'posiłek', 'poślubić', 'powieść', 'powietrze', 'powitalny',
  'powrót', 'pozdrawiać', 'pozytywny', 'pożądanie', 'praca', 'pragnąć', 'prawdziwy', 'premiera', 'prezent', 'profesjonalny',
  'prysznic', 'przebaczyć', 'przełom', 'przełomowy', 'przerwa', 'przezwyciężać', 'przeżycie', 'przyjaciel', 'przyjemność', 'ptak',
  'puchar', 'rabat', 'radosny', 'radość', 'raj', 'ratować', 'rejs', 'rekordowy', 'reprezentować', 'rodzinny',
  'rosnąć', 'rower', 'roześmiany', 'rozkoszny', 'rozkwitać', 'rozmawiać', 'rozmowny', 'rozradowany', 'rozsądny', 'rozum',
  'rozumieć', 'rozwiązanie', 'róża', 'rześki', 'safari', 'samowystarczalny', 'satyryczny', 'satysfakcjonować', 'schronienie', 'seks',
  'sen', 'sens', 'serce', 'sierpień', 'silny', 'siła', 'siostra', 'sjesta', 'skakać', 'skarb',
  'skarbiec', 'skowronek', 'sława', 'słoneczny', 'słoń', 'słońce', 'sobota', 'soczysty', 'spać', 'spełniać',
  'spełnienie', 'spokojny', 'spokój', 'spontaniczny', 'sport', 'spotkanie', 'stek', 'sukces', 'super', 'syn',
  'szafirowy', 'szaleć', 'szampan', 'szansa', 'szczenię', 'szczery', 'szczęście', 'szczęśliwy', 'szczyt', 'sztama',
  'sztuka', 'śliczny', 'ślub', 'śmiech', 'śnić', 'śpiew', 'śpiewać', 'świat', 'świąteczny', 'świetny',
  'święto', 'świętować', 'talent', 'tańczyć', 'tata', 'tatry', 'teatr', 'toast', 'tolerancja', 'tort',
  'towarzysz', 'towarzyszyć', 'triumfalny', 'tropiki', 'troskliwy', 'truskawkowy', 'trwały', 'tulipan', 'turystyczny', 'tworzenie',
  'twórczy', 'uczcić', 'uczucie', 'udany', 'ufać', 'ulepszać', 'ulga', 'upojny', 'urlop', 'uroczy',
  'uroczystość', 'urodziny', 'uśmiech', 'utalentowany', 'uwalniać', 'uzdolniony', 'uzdrowienie', 'uznanie', 'uzyskać', 'wakacje',
  'wartościowy', 'wdzięk', 'weekend', 'weselny', 'wesoły', 'wiara', 'widok', 'widzieć', 'wieczny', 'wieczór',
  'wiedza', 'wiedzieć', 'wielkanocny', 'wierność', 'wierny', 'wierzyć', 'willa', 'wino', 'winogrono', 'wiosenny',
  'wiosna', 'witalny', 'wiwat', 'wiwatować', 'wnuk', 'woda', 'wolność', 'wspaniały', 'wsparcie', 'wspierać',
  'wycieczka', 'wyczekiwany', 'wygodny', 'wygrany', 'wygrywać', 'wyjątkowy', 'wykształcenie', 'wykształcony', 'wykwintny', 'wynagrodzenie',
  'wynalazca', 'wypoczęty', 'wypoczynek', 'wyruszać', 'wyspa', 'wysportowany', 'wytchnienie', 'wytrwały', 'wytworny', 'wyzwolony',
  'wznosić', 'zachwycać', 'zadbać', 'zadowolony', 'zaistnieć', 'zaleta', 'zapach', 'zapas', 'zapraszać', 'zaproszenie',
  'zarabiać', 'zaręczony', 'zasłużony', 'zaufany', 'zbawienny', 'zdobywać', 'zdolność', 'zdrowie', 'zdrowy', 'zgoda',
  'zjeżdżalnia', 'złoto', 'zmysłowy', 'znać', 'znajomy', 'znakomity', 'zrelaksowany', 'związek', 'zwiększać', 'zwycięstwo',
  'zwycięzca', 'zwyciężać', 'zyskiwać', 'źrebię', 'żart', 'żartować', 'życie', 'życzenie', 'życzyć', 'żywy',
];

const NAWL_NEGATIVE: readonly string[] = [
  'agresywny', 'alkoholik', 'awantura', 'bandyta', 'bankructwo', 'barbarzyńca', 'bestialski', 'bezcześcić', 'bezduszny', 'bić',
  'bieda', 'boleć', 'bomba', 'ból', 'brakować', 'cham', 'cierpieć', 'cierpienie', 'donosić', 'dręczyciel',
  'dręczyć', 'dusić', 'faszyzm', 'getto', 'gnębić', 'grozić', 'groźba', 'grób', 'guz', 'holocaust',
  'kara', 'katastrofa', 'katować', 'katusze', 'kłamać', 'kłamstwo', 'kneblować', 'kompromitujący', 'komunistyczny', 'konać',
  'koncentracyjny', 'konflikt', 'kraść', 'krwawy', 'kryzys', 'krzyk', 'krzywdzić', 'ludobójstwo', 'łajdak', 'malaria',
  'martwy', 'masakra', 'męczarnia', 'mord', 'morderstwo', 'mordować', 'napadać', 'napastować', 'narkotyk', 'nazista',
  'nieszczęście', 'nieuczciwy', 'niewierność', 'niewierny', 'niewolnica', 'niewolniczy', 'nieżywy', 'nikotyna', 'nowotwór', 'obrabować',
  'ofiara', 'okrutny', 'oszust', 'oszustwo', 'owdowieć', 'pasożyt', 'piekło', 'podejrzewać', 'podły', 'podstęp',
  'pogrzebać', 'porażka', 'poronić', 'powódź', 'przemoc', 'przestępstwo', 'ranić', 'rozbój', 'rozwód', 'rzeź',
  'sadystyczny', 'samobójstwo', 'samotność', 'skorumpowany', 'słabość', 'strach', 'szubienica', 'śmierć', 'śmierdzący', 'terrorystyczny',
  'tortura', 'torturować', 'tracić', 'traumatyczny', 'trucizna', 'tyć', 'tyfus', 'tyran', 'unicestwić', 'utonąć',
  'wojna', 'wrzeszczeć', 'wtargnąć', 'wyć', 'wypadek', 'zabić', 'zabójca', 'zabójstwo', 'zadłużenie', 'zadłużony',
  'zagazować', 'zakładnik', 'zamach', 'zaraza', 'zarażać', 'zawodzić', 'zazdrość', 'zbankrutować', 'zbrodnia', 'zdradzić',
  'zdychać', 'zginąć', 'zgon', 'złodziej', 'zmarły', 'zmusić', 'zmuszać', 'zwyrodnialec', 'żałoba',
];

// ============================================================
// Extended manually curated Polish additions
// ============================================================
// Linguistically validated words not already covered by above sources.
// Focus: everyday conversational positivity/negativity in chat contexts.

const PL_EXTENDED_POSITIVE: readonly string[] = [
  // Emotional warmth, connection
  'celebrować', 'ciepło', 'darować', 'dbały', 'dbała', 'delikatnie', 'delikatny', 'delikatna',
  'dotykać', 'empatia', 'entuzjazm', 'fascynacja', 'gorąco', 'jasny', 'jasna', 'jasność',
  'kochać', 'komfortowy', 'komfortowa', 'łagodny', 'łagodna', 'łagodnie', 'lekki', 'lekka', 'lekko',
  'lubię', 'luz', 'miłosny', 'miłosna', 'normalnie', 'obfitość', 'optymista', 'optymizm',
  'piękność', 'plany', 'pogodny', 'pogodna', 'pomaga', 'pomost', 'poprawa', 'powodzenie',
  'przytulny', 'przytulna', 'przytulność', 'przytulić', 'pyszne', 'pyszny', 'pyszna',
  'raduj', 'razem', 'rozkosz', 'różnorodność', 'ślicznie', 'stabilny', 'stabilna',
  'staranny', 'staranna', 'sukcesy', 'szacunek', 'szczerość', 'szczera', 'szczerej',
  'ufać', 'uprzejmy', 'uprzejma', 'uprzejmość', 'uroczo', 'wesoło', 'współpraca',
  'wygrać', 'wygrana', 'wyzwanie', 'zaufanie', 'zdrowie', 'zrozumienie', 'zaufana',
  'życzliwy', 'życzliwa', 'życzliwość',
  // Exclamations / reactions
  'ach', 'bajkowy', 'bajkowo', 'błogość', 'błogi', 'hej', 'hurra', 'hura', 'juhu',
  // English additions (chat-relevant positive not in existing dict)
  'wholesome', 'heartwarming', 'uplifting', 'fulfilling', 'rewarding', 'meaningful',
  'refreshing', 'cozy', 'comfy', 'exciting', 'adorable', 'playful', 'joyous',
  'blissful', 'serene', 'vibrant', 'radiant', 'nurturing',
];

const PL_EXTENDED_NEGATIVE: readonly string[] = [
  // Psychological / emotional pain
  'apatia', 'apatyczny', 'apatyczna', 'beznadziejność', 'brzydzę', 'brzydki', 'brzydka',
  'chaos', 'chory', 'chora', 'ciężar', 'ciężki', 'ciężka', 'deprymujący', 'deprymująca',
  'depresja', 'depresyjny', 'depresyjna', 'dezorientacja', 'dławić', 'dramatycznie',
  'duszność', 'fałsz', 'fałszywy', 'fałszywa', 'głupio', 'głupi', 'głupia',
  'groza', 'groźny', 'groźna', 'irytacja', 'irytujący', 'irytująca', 'irytować',
  'kłamca', 'krytykować', 'krzywdzić', 'lęk', 'lękowy', 'lękowa',
  'marny', 'marna', 'marnie', 'melancholia', 'melancholijny', 'melancholijna',
  'morderczy', 'mordercza', 'nadużycie', 'narzekać', 'nieszczerość', 'nieszczery', 'nieszczera',
  'nieszczęśliwy', 'nieszczęśliwa', 'niesprawiedliwy', 'niesprawiedliwa',
  'niezrozumiany', 'niezrozumiana', 'nuda', 'nudny', 'nudna',
  'paskudny', 'paskudna', 'pesymizm', 'pesymista', 'pesymistyczny', 'pesymistyczna',
  'płakać', 'podstępny', 'podstępna', 'pogardzać', 'porzucenie',
  'przerażenie', 'przykrość', 'przykry', 'przykra', 'przykro',
  'rozgoryczenie', 'rozgoryczony', 'smutek', 'smutny', 'smutna', 'smutno',
  'stresujący', 'stresująca', 'surowość', 'szok', 'tęsknota', 'tragedia',
  'trudno', 'trudny', 'trudna', 'trwoga', 'udręka', 'utrata', 'więzić',
  'wstyd', 'wyolbrzymiać', 'zagrożenie', 'zazdrosny', 'zazdrosna',
  'zdesperowany', 'zdesperowana', 'złamane', 'żal', 'żałować', 'zły', 'zła', 'źle',
  // English additions (chat-relevant negative not in existing dict)
  'dreadful', 'vile', 'despicable', 'repulsive', 'revolting', 'hateful', 'loathsome',
  'anguish', 'desolate', 'torment', 'agony', 'traumatic', 'traumatized', 'overwhelmed',
  'suffocating', 'trapped', 'draining', 'exhausting', 'betray', 'betrayal',
  'abandoned', 'rejected', 'dismissed', 'belittled', 'manipulative', 'controlling',
  'abusive', 'cruel', 'vicious', 'hurtful', 'humiliated', 'humiliation',
  'contempt', 'disgrace', 'degraded', 'isolated', 'helpless', 'powerless', 'defeated',
];


// ============================================================
// sentiment-polish npm v1.0.0 (MIT) — AFINN-165 translated to Polish
// Kubawolanin/sentiment-polish: https://github.com/kubawolanin/sentiment-polish
// Extracted statically for client-side bundle compatibility (no runtime import).
// Positive: 1349 words | Negative: 2437 words (przepraszam excluded — Gottman repair)
// ============================================================

const SP_POSITIVE: readonly string[] = [
  "absorbująca", "absorbujące", "absorbujący", "adoracja", "adorować", "adorowanie", "akceptuje", "akcja",
  "akcje", "aktywna", "aktywne", "aktywny", "alleluja", "altruistyczna", "altruistyczne", "altruistyczny",
  "ambitny", "angażować", "apetyt", "arcydzieła", "arcydzieło", "atrakcja", "atrakcyjność", "atrakcyjny",
  "aura", "autorytet", "badanie", "bajecznie", "bawić", "beatyfikować", "bezinteresowna", "bezinteresowne",
  "bezinteresowny", "bezpieczeństwo", "bezpieczna", "bezpieczne", "bezpiecznie", "bezpieczniejsze", "bezpieczny", "bezproblemowo",
  "bezszwowy", "beztroski", "biesiadny", "blask", "błoga", "błogi", "błogie", "błogosławić",
  "błogosławieństwa", "błogosławieństwo", "błogość", "błyszcza", "błyszcząca", "błyszczące", "błyszczący", "błyszcze",
  "błyszczy", "bogactwo", "bogato", "bogatsi", "bogaty", "bohater", "bohaterowie", "bóg",
  "brakowało", "bravura", "brawo", "brilliances", "bronić", "bródkowy", "buziaki", "celowy",
  "ceniona", "cenione", "ceniony", "charytatywna", "charytatywne", "charytatywny", "charyzma", "chcieć",
  "chęci", "chętny", "chroni", "chroniona", "chronione", "chroniony", "chwalona", "chwalone",
  "chwalony", "chwała", "cichy", "ciekawy", "ciepła", "ciepłe", "ciepło", "ciepły",
  "ciesząc", "cieszyć", "cnotliwa", "cnotliwe", "cnotliwy", "cud", "cudowna", "cudowne",
  "cudownie", "cudowny", "czarująca", "czarujące", "czarujący", "czczona", "czczone", "czczony",
  "czoło", "czujny", "czuła", "czułe", "czułość", "czuły", "czysty", "czyści",
  "darowizna", "darowizny", "daruje", "dbanie", "decydująca", "decydujące", "decydujący", "dedykowane",
  "delikatny", "diament", "dilligence", "dobrobyt", "dobroczyńca", "dobroczyńców", "dobroć", "dobry",
  "docenia", "doceniać", "doceniająca", "doceniające", "doceniający", "doceniane", "dojrzała", "dojrzałe",
  "dojrzały", "dopasowanie", "doping", "dopingować", "dopracowuje", "dopuszczać", "dosięgnąć", "doskonale",
  "doskonała", "doskonałe", "doskonałość", "doskonały", "dostatni", "dostępny", "dotacja", "dotacje",
  "dowcipny", "droga", "drogi", "drogie", "drogo", "duch", "dumnie", "dumny",
  "duży", "dzielić", "dzielna", "dzielne", "dzielny", "dzięki", "efektywna", "efektywne",
  "efektywny", "ekscytująca", "ekscytujące", "ekscytujący", "ekshilarates", "ekskluzywna", "ekskluzywne", "ekskluzywny",
  "ekstatyczna", "ekstatyczne", "ekstatyczny", "elegancki", "elegancko", "empatyczna", "empatyczne", "empatyczny",
  "energetyczna", "energetyczne", "energetyczny", "energiczna", "energiczne", "energiczny", "entuzjastyczna", "entuzjastyczne",
  "entuzjastyczny", "estetycznie", "etyczna", "etyczne", "etyczny", "euforia", "euforyk", "fachowo",
  "fajne", "faktycznie", "fantastyczna", "fantastyczne", "fantastyczny", "fascynacja", "fascynować", "fascynująca",
  "fascynujące", "fascynujący", "fascynuje", "favourited", "faworyzowane", "fenomenalnie", "figlarny", "filantropia",
  "flagowy", "fortuna", "ftw", "galanteria", "gazowana", "godność", "godny", "gorliwa",
  "gorliwe", "gorliwy", "grad", "gratulacja", "gratulacje", "gratyfikacja", "grot", "gruby",
  "gust", "gwarancja", "ha", "hahaha", "hahahah", "harmonia", "harmonijnie", "harmonijny",
  "hehe", "heroiczna", "heroiczne", "heroiczny", "hojnie", "hojny", "hołd", "honor",
  "horyzont", "humanitarny", "humor", "humorystyczna", "humorystyczne", "humorystyczny", "humourous", "hurra",
  "idealna", "idealne", "idealny", "imponować", "imponująca", "imponujące", "imponujący", "innowacja",
  "innowacje", "innowacyjne", "inspiracja", "inspirować", "inspirująca", "inspirujące", "inspirujący", "inspiruje",
  "integralność", "inteligentny", "intensywna", "intensywne", "intensywny", "intymność", "iskra", "jakości",
  "jakość", "jasność", "jasny", "jezus", "jowialna", "jowialne", "jowialny", "kapitał",
  "kapryśny", "kibic", "klejnot", "klejnoty", "kocha", "kochać", "kochająca", "kochające",
  "kochający", "kochał", "kochanie", "kojąca", "kojące", "kojący", "kolejny", "komedia",
  "komfort", "komiczna", "komiczne", "komiczny", "kompetencji", "kompetentny", "komplement", "komplementy",
  "konkurencyjny", "korzystając", "korzystnie", "korzystny", "korzyści", "korzyść", "krzepki", "kurtuazja",
  "lansowana", "lansowane", "lansowany", "lawl", "leniwa", "leniwe", "leniwy", "lepszy",
  "lmfao", "lojalność", "lol", "lolol", "lololol", "lolololol", "lool", "loool",
  "looool", "lubi", "lubić", "lubił", "lukratywna", "lukratywne", "lukratywny", "luksus",
  "ładna", "ładne", "ładnie", "ładny", "łagodny", "łagodząca", "łagodzące", "łagodzący",
  "łagodzi", "łagodzić", "łał", "łaska", "łaskawy", "łatwo", "łatwość", "machinacje",
  "majątek", "malownicza", "malownicze", "malowniczy", "marzenia", "materia", "mądrość", "mądry",
  "mądrzejszy", "medal", "medytacyjny", "metodyczna", "metodyczne", "metodycznie", "metodyczny", "miła",
  "miłe", "miłość", "miłośnicy", "miły", "mistrz", "mistrzowie", "młodzieńcza", "młodzieńcze",
  "młodzieńczy", "modernizacja", "modernizacje", "motywacja", "motywować", "motywowanie", "możliwości", "na",
  "nabożna", "nabożne", "nabożny", "nabyty", "nadzieja", "nadzieje", "nagroda", "nagrody",
  "nagrodzona", "nagrodzone", "nagrodzony", "najczystsze", "najfatalniejszy", "najjaśniejszy", "najlepiej", "najlepsza",
  "najmądrzejszy", "najmodniejszy", "najsilniejszy", "najsłodszy", "najszczęśliwszy", "największy", "najwyższy", "namiętny",
  "natarczywa", "natarczywe", "natarczywy", "natchniona", "natchnione", "natchniony", "naturalna", "naturalne",
  "naturalny", "natychmiast", "niebiański", "niebo", "niedobitek", "niedrogie", "nienaruszona", "nienaruszone",
  "nienaruszony", "nieodparcie", "nieodparty", "niesamowita", "niesamowite", "niesamowity", "nieskazitelna", "nieskazitelne",
  "nieskazitelny", "nieśmiertelna", "nieśmiertelne", "nieśmiertelny", "nietrująca", "nietrujące", "nietrujący", "nieustraszona",
  "nieustraszone", "nieustraszoność", "nieustraszony", "niewrażliwa", "niewrażliwe", "niewrażliwy", "niezapomniana", "niezapomniane",
  "niezapomniany", "niezawodnie", "niezawodność", "niezawodny", "niezłomny", "niezniszczalna", "niezrównana", "niezrównane",
  "niezrównany", "niezwyciężona", "niezwyciężone", "niezwyciężony", "obiecał", "obietnica", "obietnice", "obrona",
  "obrońca", "obrońców", "obsesję", "ochraniać", "oczarować", "oczyścić", "odciążyć", "oddana",
  "oddane", "oddany", "odjechana", "odjechane", "odjechany", "odkurzacz", "odporny", "odpowiedni",
  "odpowiednio", "odpowiedzialna", "odpowiedzialne", "odpowiedzialność", "odpowiedzialny", "odpuszcza", "odpuszczając", "odświeżająco",
  "odwaga", "odważna", "odważne", "odważnie", "odważny", "okazja", "oklaski", "oklaskiwać",
  "oklaskiwana", "oklaskiwane", "oklaskiwany", "oks", "olbrzymi", "ominięcie", "opieka", "opłacalna",
  "opłacalne", "opłacalny", "optymistyczna", "optymistyczne", "optymistyczny", "optymizm", "osada", "osiąga",
  "osiągając", "osiągalna", "osiągalne", "osiągalny", "osiągnął", "osiągnęła", "osiągnęło", "osiągnięcia",
  "osiągnięcie", "ostrożna", "ostrożne", "ostrożnie", "ostrożność", "ostrożny", "oszałamiająca", "oszałamiające",
  "oszałamiający", "oszczędności", "oślepiająca", "oślepiające", "oślepiający", "oświeca", "oświecać", "oświecenie",
  "oświecona", "oświecone", "oświecony", "otrzeźwiająca", "otrzeźwiające", "otrzeźwiający", "ożywia", "panująca",
  "panujące", "panujący", "pardon", "pardoning", "pasja", "perspektywa", "pewna", "pewne",
  "pewni", "pewny", "pielęgnacja", "pielęgnować", "pielęgnuje", "piękna", "piękno", "piękny",
  "płodny", "pobudza", "pobudzająca", "pobudzające", "pobudzający", "pobudzanie", "pocałunek", "pochłonięta",
  "pochłonięte", "pochłonięty", "pochwala", "pochwalić", "pochwała", "pochwałe", "pochwały", "pociągać",
  "pociągająca", "pociągające", "pociągający", "pocieszająca", "pocieszające", "pocieszający", "podarować", "podekscytowana",
  "podekscytowane", "podekscytowany", "podniecać", "podniecenie", "podniecona", "podniecone", "podniecony", "podnieść",
  "podobieństwo", "podtrzymywalna", "podtrzymywalne", "podtrzymywalny", "podziękować", "podziw", "podziwia", "podziwiać",
  "podziwiana", "pogodzić", "pogratulować", "pogrubienie", "pojednania", "pojednanie", "pokorny", "pokój",
  "polecić", "pomaga", "pomocny", "poparcie", "poparła", "popełnić", "popiera", "poprawa",
  "poprawia", "popularność", "popularny", "porywająca", "porywające", "porywający", "postęp", "poszanowanie",
  "poszukiwania", "poświęcenie", "potężna", "potężne", "potężny", "potwierdza", "potwierdzone", "powierzone",
  "powieść", "powitać", "powitał", "powitanie", "powodzenie", "pozdrowienia", "pozytywna", "pozytywne",
  "pozytywnie", "pozytywny", "pożądana", "pożądane", "pożądany", "pragnąc", "pragnąca", "pragnące",
  "pragnący", "pragnienie", "prawda", "prawdziwa", "prawdziwe", "prawdziwy", "prawna", "prawne",
  "prawnie", "prawny", "prawość", "prawowita", "prawowite", "prawowity", "prezent", "prężna",
  "prężne", "prężny", "proaktywne", "promować", "promowanie", "promuje", "proste", "prostota",
  "proszę", "prowadząca", "prowadzące", "prowadzący", "przebaczenie", "przebaczono", "przebaczyć", "przebiegła",
  "przebiegłe", "przebiegły", "przebój", "przedsiębiorcza", "przedsiębiorcze", "przedsiębiorczy", "przejrzystość", "przekazane",
  "przekonać", "przekonana", "przekonane", "przekonany", "przekonuje", "przełom", "przemiła", "przemiłe",
  "przemiły", "przepyszny", "przerażająca", "przerażające", "przerażający", "przestronna", "przestronne", "przestronny",
  "przetrwanie", "przewidywanie", "przeżył", "przyciąga", "przyciąganie", "przyciągnęła", "przydatność", "przydatny",
  "przygoda", "przygody", "przygotowana", "przygotowane", "przygotowany", "przyjaciel", "przyjazny", "przyjaźń",
  "przyjąć", "przyjemne", "przyjemność", "przyjemny", "przyjęcie", "przyjęta", "przyjęte", "przyjęty",
  "przyjmowanie", "przyjmuje", "przysiek", "przysługa", "przysmaki", "przystojny", "przytulać", "przytulanie",
  "przytulność", "przywództwo", "przywraca", "przywracać", "przywracanie", "przywrócona", "przywrócone", "przywrócony",
  "przyznanie", "pyszne", "radosny", "radość", "radośnie", "rafinowana", "rafinowane", "rafinowany",
  "raj", "raptured", "raptures", "ratować", "ratownik", "ratuje", "ratyfikowana", "rofl",
  "roflcopter", "roflmao", "romans", "romantyczna", "romantyczne", "romantycznie", "romantyczny", "rotfl",
  "rotflmfao", "rotflol", "rozbawiona", "rozbawione", "rozbawiony", "rozbrykana", "rozbrykane", "rozbrykany",
  "rozgrzesza", "rozgrzeszać", "rozgrzeszyć", "rozkład", "rozkosz", "rozkoszne", "rozliczenia", "rozrywka",
  "rozstrzyganie", "rozszerzać", "roztropność", "rozum", "rozważna", "rozważne", "rozważny", "rozwiązać",
  "rozwiązana", "rozwiązane", "rozwiązania", "rozwiązanie", "rozwiązany", "rozwiązuje", "rozwikłać", "rozwój",
  "róża", "rygorystyczna", "rygorystyczne", "rygorystyczny", "ryzykowna", "ryzykowne", "ryzykowny", "rześki",
  "salut", "salutowanie", "saluty", "satysfakcjonująca", "satysfakcjonujące", "satysfakcjonujący", "seksowna", "seksowne",
  "seksowny", "sentyment", "serdeczna", "serdeczne", "serdecznie", "serdeczny", "sięga", "silna",
  "silne", "silniejszy", "silny", "skarb", "skarby", "skoncentrowana", "skoncentrowane", "skoncentrowany",
  "skuteczność", "sława", "sławna", "sławne", "sławny", "słodkie", "słodsze", "słusznie",
  "słynna", "słynne", "słynny", "solidarność", "solidny", "spełnia", "spełnić", "spełnienie",
  "spełniona", "spełnione", "spełniony", "spoko", "spokojna", "spokojnie", "spokojny", "sprawiedliwość",
  "sprawy", "sprytny", "sprzyja", "sprzymierzyć", "stabilna", "stabilne", "stabilny", "strasznie",
  "stymulować", "stymulowane", "stymuluje", "sukces", "super", "sympatyczna", "sympatyczne", "sympatyczny",
  "szacunek", "szanowana", "szanowane", "szanowany", "szansa", "szanse", "szczerosc", "szczery",
  "szczerze", "szczęściarz", "szczęście", "szczęśliwa", "szczęśliwe", "szczęśliwy", "szlachetny", "szufelka",
  "szybki", "szybko", "szyk", "śliczna", "śliczne", "śliczny", "śmiała", "śmiałe",
  "śmiałek", "śmiały", "śmiech", "śnić", "świąteczna", "świąteczne", "świąteczny", "świeży",
  "świętować", "świętuje", "taaak", "tak", "talent", "targi", "tęsknota", "tkliwość",
  "tolerancja", "tolerancyjny", "top", "triumf", "troska", "trudniejsze", "trwała", "trwałe",
  "trwały", "tryumfalna", "tryumfalne", "tryumfalny", "twardo", "twórcza", "twórcze", "twórczy",
  "uczciwość", "uczucie", "udana", "udane", "udany", "ufnie", "ufny", "ugruntowana",
  "uhonorowanie", "ukochana", "ukochane", "ukochany", "ukończyć", "ulepszać", "ulepszona", "ulepszone",
  "ulepszony", "ulubiona", "ulubione", "ulubiony", "ulżyło", "umiejętności", "umowa", "umożliwiać",
  "uniewinnia", "uniewinniająca", "uniewinniające", "uniewinniający", "uniewinnić", "uniewinniona", "uniewinnione", "uniewinniony",
  "upiększać", "upodmiotowienie", "uprawniona", "uprawomocnić", "uprzejmie", "uprzejmość", "uprzejmy", "uprzywilejowana",
  "uprzywilejowane", "uprzywilejowany", "uradowana", "uradowane", "uradowany", "uratował", "urocza", "urocze",
  "uroczo", "uroczy", "uroczystości", "uroczystość", "uroczysty", "urok", "uruchomiona", "uspokaja",
  "uspokajać", "uspokajająca", "uspokajające", "uspokajający", "uspokajona", "uspokajone", "uspokajony", "uspokojona",
  "uspokojone", "uspokojony", "usprawiedliwiona", "usprawiedliwione", "usprawiedliwiony", "ustalona", "uszczęśliwiona", "uszczęśliwione",
  "uszczęśliwiony", "uścisk", "uśmiech", "utrzymana", "utrzymane", "utrzymany", "uwielbiał", "uwielbiam",
  "uwielbienie", "uzasadnione", "uznana", "uznane", "uznanie", "uznany", "wartość", "ważna",
  "ważne", "ważny", "wdzięczna", "wdzięczne", "wdzięczny", "wdzięk", "wentylator", "wesoła",
  "wesołe", "wesoło", "wesołość", "wesoły", "wiara", "wibrująca", "wibrujące", "wibrujący",
  "wielki", "wierny", "większy", "wigor", "winwin", "witalność", "witamina", "witamy",
  "wiwatował", "wizja", "wizje", "wizjoner", "właściwa", "właściwe", "właściwy", "wnikliwość",
  "wolna", "wolne", "wolności", "wolność", "wolny", "woohoo", "wooo", "woow",
  "wowow", "wowww", "wpływowy", "wskazana", "wskazane", "wskazany", "wskrzesić", "wspaniale",
  "wspaniała", "wspaniałe", "wspaniały", "wsparcie", "wspiera", "wspierająca", "wspierające", "wspierający",
  "wspólne", "współczucie", "współczująca", "współczujące", "współczujący", "wstrząśnięta", "wstrząśnięte", "wstrząśnięty",
  "wszechobecny", "wszechstronna", "wszechstronne", "wszechstronny", "wybawienie", "wybitny", "wyczyszczone", "wygodnie",
  "wygodny", "wygrał", "wygrywa", "wyjaśnia", "wykupiona", "wykupione", "wykupiony", "wynagrodzona",
  "wynagrodzone", "wynagrodzony", "wyrafinowana", "wyrafinowane", "wyrafinowany", "wyraźnie", "wyrozumiała", "wyrozumiałe",
  "wyrozumiały", "wystająca", "wystające", "wystający", "wytrzymała", "wytrzymałe", "wytrzymałość", "wytrzymały",
  "wzmacnia", "wzmacniać", "wzmacniająca", "wzmacniające", "wzmacniający", "wzmocniona", "wzmocnione", "wzmocniony",
  "wzrasta", "wzrosła", "wzrost", "wzrostu", "wzruszająca", "wzruszające", "wzruszający", "xo",
  "zaabsorbowana", "zaabsorbowane", "zaabsorbowany", "zaakceptować", "zaangażowanie", "zaawansowane", "zabawa", "zabawna",
  "zabawne", "zabawny", "zabezpiecza", "zabezpieczone", "zabiegać", "zachęca", "zachęcać", "zachęcająca",
  "zachęcające", "zachęcający", "zachęta", "zachłanna", "zachłanne", "zachłanny", "zachwycać", "zachwycająca",
  "zachwycające", "zachwycający", "zachwyci", "zachwycona", "zachwycone", "zachwycony", "zachwyt", "zachwytu",
  "zadatek", "zadbana", "zadbane", "zadbany", "zadowolona", "zadowolone", "zadowolony", "zadziwiać",
  "zadziwiająca", "zadziwiające", "zadziwiający", "zafascynowana", "zafascynowane", "zafascynowany", "zainteresowana", "zainteresowane",
  "zainteresowania", "zainteresowanie", "zainteresowany", "zaintrygowana", "zaintrygowane", "zaintrygowany", "zajebista", "zajebiste",
  "zajebisty", "zajebiście", "zajefajne", "zakochana", "zakochane", "zakochany", "zaleca", "zalecana",
  "zalety", "zamożna", "zamożne", "zamożny", "zapalona", "zapalone", "zapalony", "zapewnić",
  "zapewnienie", "zapisać", "zapisane", "zapraszam", "zasalutował", "zasiłek", "zaskakująca", "zaskakujące",
  "zaskakujący", "zaspokoić", "zaspokojona", "zaspokojone", "zaspokojony", "zaszczycona", "zaszczycone", "zaszczycony",
  "zaślepienie", "zatwierdza", "zatwierdzanie", "zatwierdzenie", "zatwierdzona", "zatwierdzone", "zatwierdzony", "zaufana",
  "zaufane", "zaufanie", "zaufany", "zauważalna", "zauważalne", "zauważalny", "zawiła", "zawiłe",
  "zawiły", "zbawienie", "zdatność", "zdecydowana", "zdecydowane", "zdecydowany", "zdobyć", "zdolna",
  "zdolne", "zdolność", "zdolny", "zdrowy", "zdumieć", "zdumienie", "zdumiewająca", "zdumiewające",
  "zdumiewająco", "zdumiewający", "zdumiona", "zdumione", "zdumiony", "zestalać", "zestalona", "zestalone",
  "zestalony", "zgoda", "zgody", "zgrabny", "zimozielona", "zimozielone", "zimozielony", "zjednoczona",
  "zjednoczone", "zjednoczony", "złoto", "złowieszcza", "złowieszcze", "złowieszczy", "zmodernizować", "zmodernizowane",
  "zmotywowana", "zmotywowane", "zmotywowany", "zmuszona", "zmuszone", "zmuszony", "znacząca", "znaczące",
  "znaczący", "znaczenie", "znaczna", "znaczne", "znaczny", "znakomita", "znakomite", "znakomity",
  "zobowiązana", "zobowiązane", "zobowiązany", "zobowiązuje", "zrelaksowana", "zrelaksowane", "zrelaksowany", "zrównoważona",
  "zrównoważone", "zrównoważony", "zuchwała", "zuchwałe", "zuchwały", "zwiększać", "zwolennicy", "zwolnienie",
  "zwolniona", "zwolnione", "zwolniony", "zwycięski", "zwycięstwa", "zwycięstwo", "zwycięzca", "zwycięzcy",
  "zyczenia", "zysk", "zyskał", "zyski", "zyskując", "żarliwa", "żarliwe", "żarliwy",
  "żart", "żarty", "życzenia", "życzenie", "życzliwa", "życzliwe", "życzliwość", "życzliwy",
  "żywa", "żywe", "żywiołowy", "żywo", "żywy"
];

const SP_NEGATIVE: readonly string[] = [
  "admonished", "afektowana", "afektowane", "afektowany", "agoniści", "agonizuje", "agresja", "agresji",
  "agresywna", "agresywne", "agresywnie", "agresywność", "agresywny", "akcentowana", "akcentowane", "akcentowany",
  "alarm", "alarmista", "alarmistami", "alienacja", "amatorski", "ambiwalentny", "analfabetyzm", "animozja",
  "antagonistyczna", "antagonistyczne", "antagonistyczny", "anty", "anulowanie", "anuluj", "anuluje", "apatia",
  "apatyczna", "apatyczne", "apatyczny", "apeshit", "apokaliptyczna", "apokaliptyczne", "apokaliptyczny", "aresztować",
  "aresztowana", "aresztowane", "aresztowania", "aresztowanie", "aresztowany", "arogancki", "arsehole", "atak",
  "ataków", "awarie", "awenges", "bagatelizować", "bałagan", "bamboy", "banalna", "banalne",
  "banalny", "bandyta", "bankructwo", "bankster", "barbarzyńca", "barbarzyński", "bariera", "beczenie",
  "bereaves", "bezbronna", "bezbronne", "bezbronny", "bezcelowy", "bezczynność", "bezdomny", "bezkompromisowość",
  "bezlitosny", "bezładu", "bezmyślna", "bezmyślne", "bezmyślny", "beznadziejnie", "beznadziejność", "beznadziejny",
  "bezowocny", "bezprawna", "bezprawne", "bezprawny", "bezradny", "bezrobocie", "bezrobotny", "bezrozumnie",
  "bezsenność", "bezsilna", "bezsilne", "bezsilny", "bezskutecznie", "bezużyteczna", "bezużyteczne", "bezużyteczność",
  "bezużyteczny", "bezwartościowy", "bezwzględny", "bezzębny", "bicie", "biedniejsze", "biernie", "bierny",
  "bita", "bite", "bitwa", "bitwy", "bity", "bla", "blizna", "blizny",
  "blok", "blokada", "bloki", "bloking", "blokować", "błąd", "błędny", "błędów",
  "błędy", "błyszczka", "bojaźliwa", "bojaźliwe", "bojaźliwy", "bojkot", "bojkotowanie", "bojkoty",
  "bolesny", "boleściwa", "boleściwe", "boleściwy", "boleść", "boli", "bomba", "boycotted",
  "ból", "brak", "braki", "brakująca", "brakujące", "brakujący", "brooding", "brud",
  "brudniejszy", "brudny", "brutalna", "brutalne", "brutalnie", "brutalny", "brzdęknięcie", "brzydki",
  "brzydota", "brzydzić", "bumelant", "bummer", "bunt", "buntownik", "bzdurnie", "bzdury",
  "cenzor", "cenzorzy", "cenzurowana", "cenzurowane", "cenzurowany", "chagrined", "chaos", "chaotyczna",
  "chaotyczne", "chaotyczny", "chciwa", "chciwe", "chciwość", "chciwy", "chełpliwa", "chełpliwe",
  "chełpliwy", "chides", "chiding", "chlapa", "chłodzenie", "cholera", "cholernie", "cholerny",
  "choroba", "choroby", "chory", "chowana", "chowane", "chowany", "chuj", "chuligan",
  "chuligani", "chuligaństwo", "chwiejny", "ciąć", "ciemność", "cierpi", "cierpiał", "cierpiąca",
  "cierpiące", "cierpiący", "cierpiących", "cierpienie", "cierpko", "cięcia", "cięcie", "ciężary",
  "ciężko", "cocksucker", "cocksuckers", "crappy", "crazier", "cunt", "cycki", "cyniczna",
  "cyniczne", "cyniczny", "cynik", "cynizm", "czarnuch", "czarnuchy", "czas", "czeka",
  "czop", "ćwok", "daremny", "deadening", "deficyt", "deformacje", "degradować", "degraduje",
  "dehumanized", "dehumanizes", "dehumanizowanie", "deklamator", "demonstracja", "demoralizowana", "demoralizowane", "demoralizowany",
  "demoralizuje", "denerwować", "denerwująca", "denerwujące", "denerwujący", "denerwuje", "denier", "denijczycy",
  "deplorująca", "deplorujące", "deplorujący", "deportacja", "deportacje", "deportować", "deportowana", "deportowane",
  "deportowanie", "deportowany", "deportuje", "depresja", "derides", "despotyczna", "despotyczne", "despotycznie",
  "despotyczny", "destrukcyjny", "deszczowy", "dewastacja", "dewastacje", "dezaprobata", "dezinformacja", "dezorientować",
  "dipshit", "disparages", "dithering", "dławiki", "dług", "dokuczliwa", "dokuczliwe", "dokuczliwy",
  "dość", "dotknięta", "dotknięte", "dotknięty", "downer", "drags", "draniu", "drań",
  "drapieżna", "drapieżne", "drapieżny", "drażliwa", "drażliwe", "drażliwy", "drażni", "dreading",
  "drwić", "drwina", "drwiny", "drżąca", "drżące", "drżący", "drżenie", "dupek",
  "dylemat", "dymienie", "dysfunkcja", "dyskryminacyjny", "dyskryminować", "dyskryminowane", "dyskryminuje", "dyskutowanie",
  "dystansuje", "dziecinna", "dziecinne", "dziecinny", "dziwaczna", "dziwaczne", "dziwaczny", "dziwka",
  "dziwna", "dziwne", "dziwnie", "dziwny", "dźgnięta", "dźgnięte", "dźgnięty", "egoizm",
  "eksmisja", "eksploatacja", "eksploatowana", "eksploatowane", "eksploatowany", "eksponuje", "ekstremista", "ekstremistów",
  "ewakuacja", "ewakuować", "ewakuowana", "ewakuowane", "ewakuowany", "fagoty", "fainthearted", "fake",
  "faker", "fałsz", "fałszować", "fałszowanie", "fałszywa", "fałszywe", "fałszywie", "fałszywy",
  "farsa", "faszystowski", "faszyści", "fatalna", "fatalne", "fatalny", "faul", "fiasko",
  "fiut", "flopsy", "fobia", "foreclosures", "frasobliwa", "frasobliwe", "frasobliwy", "frikin",
  "frustruje", "gagged", "głodować", "głodująca", "głodujące", "głodujący", "głośny", "głód",
  "głupcy", "głupek", "głupi", "głupio", "głupkowaty", "głupota", "gniew", "gniewna",
  "gniewne", "gniewny", "gnojek", "gorączka", "gorliwcy", "gorliwiec", "gorsząca", "gorszące",
  "gorszący", "gorsze", "gorszy", "gorzej", "gorzki", "gorzko", "gotowy", "gówno",
  "greenwash", "grozi", "grozić", "groźba", "groźby", "groźny", "grób", "gruzy",
  "grypa", "grzech", "grzechy", "grzeszny", "grzywna", "grzywne", "grzywny", "guz",
  "gwałciciel", "gwałtowna", "gwałtowne", "gwałtownie", "gwałtowny", "hamować", "handlarz", "haniebny",
  "hańba", "hejterzy", "histeria", "histeryczna", "histeryczne", "histeryczny", "histeryka", "hospitalizowana",
  "hospitalizowane", "hospitalizowany", "humbug", "icky", "idiota", "idiotyczna", "idiotyczne", "idiotyczny",
  "idiotyzm", "ignorancja", "ignorować", "ignoruje", "imbecyl", "imitacja", "impas", "impeachments",
  "impedes", "indoktrynacja", "indoktrynana", "indoktrynane", "indoktrynany", "indoktrynować", "indoktrynowane", "inediable",
  "infantylna", "infantylne", "infantylny", "infekcja", "infekcje", "infekować", "infekowanie", "infekuje",
  "infesting", "infestuje", "infracts", "infuriates", "inkwizycja", "inwalidztwo", "inwazja", "ironia",
  "ironiczna", "ironiczne", "ironiczny", "irracjonalna", "irracjonalne", "irracjonalny", "irytować", "irytująca",
  "irytujące", "irytujący", "jadowita", "jadowite", "jadowity", "jebać", "jebak", "jebana",
  "jebane", "jebanie", "jebany", "jebańce", "jebią", "jebiąc", "jebiąca", "jebiące",
  "jebiący", "jebie", "jęczeć", "jędza", "jęk", "jęki", "jęknął", "jęknęła",
  "jęknęło", "kadzidła", "kadzidło", "karać", "karane", "karanie", "karny", "katastrofa",
  "katastrofalna", "katastrofalne", "katastrofalny", "katastrofy", "kawałki", "kicha", "kichać", "kichanie",
  "kłamca", "kłamcy", "kłopot", "kłopotliwa", "kłopotliwe", "kłopotliwy", "kłopoty", "knebel",
  "kody", "kogut", "kolidować", "kolizja", "kolizje", "komplikuje", "konflikt", "konflikty",
  "kontrowersje", "kontrowersyjne", "kontrowersyjnie", "kontrowersyjny", "kontuzje", "korupcja", "kosztowna", "kosztowne",
  "kosztowny", "kpina", "kpiny", "kradnie", "kradzież", "kraść", "krosna", "krótkowzroczna",
  "krótkowzroczne", "krótkowzroczność", "krótkowzroczny", "kruszenia", "krwawy", "kryminalista", "krytyk", "krytyka",
  "krytykować", "krytykowana", "krytykowane", "krytykowany", "krytyków", "krytykując", "krytykuje", "kryzys",
  "krzyczał", "krzycząc", "krzyk", "krzyki", "krzywa", "krzywe", "krzywoprzysięstwo", "krzywy",
  "kulawy", "kurwa", "kutas", "kutasiarz", "kwestionowana", "kwestionowane", "kwestionowany", "lekceważąc",
  "lekceważenie", "lekkomyślna", "lekkomyślne", "lekkomyślny", "letarg", "lękliwa", "lękliwe", "lękliwy",
  "lobbował", "lobby", "lobbysta", "lobbystami", "los", "luźny", "lżenie", "łapówki",
  "łatwowierność", "łatwowierny", "łzy", "majdan", "makabryczna", "makabryczne", "makabryczny", "maldevelopment",
  "maltretowanie", "manipulacja", "manipulowane", "manipulowanie", "marnie", "marnotrawstwo", "matczyna", "mdła",
  "mdłe", "mdły", "melancholia", "memoriam", "męcząca", "męczące", "męczący", "męczyć",
  "męka", "miażdżąca", "miażdżące", "miażdżący", "minusem", "miscast", "mispricing", "misreport",
  "misreports", "mit", "mongering", "monopolizacja", "monopolizuje", "monotonia", "monotonna", "monotonne",
  "monotonny", "mop", "morderca", "mordercza", "mordercze", "morderczy", "morderstwa", "morderstwo",
  "mordęga", "mordowanie", "mroczna", "mroczne", "mroczny", "mrok", "mrowie", "mściciel",
  "mściciele", "mściwa", "mściwe", "mściwy", "mumpish", "murzyn", "murzyni", "mylące",
  "naciągnięcie", "nacisk", "nadąsana", "nadąsane", "nadąsany", "nadęta", "nadęte", "nadęty",
  "nadopiekuńcza", "nadopiekuńcze", "nadopiekuńczy", "nadstawa", "nadużycia", "nadużycie", "nadużywane", "nadużywanie",
  "nadwaga", "nagana", "naganiacz", "naiwna", "naiwne", "naiwny", "najbrudniejszy", "najciemniejszy",
  "najcięższe", "najgorszy", "najniższy", "najuboższy", "nakłada", "nakręcenie", "nakrzyczeć", "naładowana",
  "naładowane", "naładowany", "nałożone", "napadająca", "napadające", "napadający", "napastowanie", "napięcie",
  "napominać", "naprężenie", "narazić", "narażona", "narażone", "narażony", "narcyzm", "narozrabiać",
  "narusza", "naruszać", "naruszenia", "naruszenie", "naruszona", "naruszone", "naruszony", "narzekać",
  "narzucać", "następstwo", "nastrojowy", "natrysk", "nawiedzać", "nawiedzana", "nawiedzane", "nawiedzany",
  "nawiedzenie", "negatywna", "negatywne", "negatywny", "nerwowo", "nerwowość", "nerwowy", "nerwy",
  "nękać", "nękana", "nękane", "nękany", "nie", "niebezpieczeństwo", "niebezpieczna", "niebezpieczne",
  "niebezpiecznie", "niebezpieczny", "niechęć", "niechętny", "niechlujny", "nieczynna", "nieczynne", "nieczynny",
  "niedbała", "niedbałe", "niedbały", "niedobory", "niedobór", "niedobrze", "niedogodność", "niedogotowana",
  "niedogotowane", "niedogotowany", "niedonoszona", "niedonoszone", "niedonoszony", "niedopasowanie", "niedorozwinięta", "niedorozwinięte",
  "niedorozwinięty", "niedorzeczna", "niedorzeczne", "niedorzeczny", "niedoskonała", "niedoskonałe", "niedoskonały", "niedostępne",
  "niedoszacowana", "niedoszacowane", "niedoszacowanie", "niedoszacowany", "nieefektywnie", "nieetyczna", "nieetyczne", "nieetyczny",
  "niegodny", "niegodziwa", "niegodziwe", "niegodziwość", "niegodziwy", "niegrzeczna", "niegrzeczne", "niegrzeczny",
  "niehigieniczna", "niehigieniczne", "niehigieniczny", "nieinteligentny", "nieistotny", "niejasny", "niekochana", "niekochane",
  "niekochany", "niekompetencja", "niekompetentny", "niekompletny", "niekorzystnie", "niekorzystny", "niekorzyść", "nielegalna",
  "nielegalne", "nielegalnie", "nielegalny", "nielogiczna", "nielogiczne", "nielogiczny", "nieludzki", "nieład",
  "nieładny", "niemowlę", "niemożliwie", "niemożność", "nienaukowy", "nienawidząca", "nienawidzące", "nienawidzący",
  "nienawidzę", "nienawidzi", "nienawidzić", "nienawidzona", "nienawidzone", "nienawidzony", "nienawiść", "nieobecnych",
  "nieobsługiwane", "nieodebranych", "nieodpowiedzialna", "nieodpowiedzialne", "nieodpowiedzialnie", "nieodpowiedzialny", "nieodwracalna", "nieodwracalne",
  "nieodwracalnie", "nieodwracalny", "nieparlamentarny", "niepełnosprawność", "niepełny", "niepewna", "niepewne", "niepewny",
  "niepocieszona", "niepocieszone", "niepocieszony", "niepoczytalność", "niepokojąca", "niepokojące", "niepokojący", "niepokoje",
  "niepokojenie", "niepokój", "nieporozumienie", "niepotwierdzona", "niepotwierdzone", "niepotwierdzony", "niepowodzenie", "niepożądana",
  "niepożądane", "niepożądany", "nieprawdziwa", "nieprawdziwe", "nieprawdziwy", "nieproporcjonalna", "nieproporcjonalne", "nieproporcjonalny",
  "nieprzebaczalna", "nieprzebaczalne", "nieprzebaczalny", "nieprzejrzystość", "nieprzyjemność", "nieprzyjemny", "nieprzyzwoita", "nieprzyzwoite",
  "nieprzyzwoitość", "nieprzyzwoity", "nierówna", "nierówne", "nierówny", "nieskupiona", "nieskupione", "nieskupiony",
  "nieskuteczna", "nieskuteczne", "nieskuteczność", "nieskuteczny", "niesmaczne", "niesmak", "niespełnione", "niespokojny",
  "niespójny", "niesprawiedliwa", "niesprawiedliwe", "niesprawiedliwie", "niesprawiedliwość", "niesprawiedliwy", "niesprzedana", "niesprzedane",
  "niesprzedany", "niestety", "niestosowność", "nieszczelność", "nieszczęście", "nieszczęśliwa", "nieszczęśliwe", "nieszczęśliwy",
  "nieślubny", "nieśmiała", "nieśmiałe", "nieśmiały", "nieśmieszne", "nieświadomy", "nietrwała", "nietrwałe",
  "nietrwały", "nieubłagana", "nieubłagane", "nieubłagany", "nieuczciwa", "nieuczciwe", "nieuczciwy", "nieudana",
  "nieudane", "nieudany", "nieudolna", "nieudolne", "nieudolny", "nieufność", "nieufny", "nieumyślna",
  "nieumyślne", "nieumyślnie", "nieumyślny", "nieuprzejmy", "niewdzięczna", "niewdzięczne", "niewdzięczny", "niewesoła",
  "niewesołe", "niewesoły", "niewierząca", "niewierzące", "niewierzący", "niewłaściwa", "niewłaściwe", "niewłaściwie",
  "niewłaściwy", "niewolnictwo", "niewolnik", "niewolników", "niewrażliwość", "niewybaczalna", "niewybaczalne", "niewybaczalny",
  "niewydolność", "niewygoda", "niewygodny", "niewykorzystana", "niewykorzystane", "niewykorzystany", "niewymieniona", "niewymienione",
  "niewymieniony", "niewypał", "niewypłacalna", "niewypłacalne", "niewypłacalny", "niewystarczająca", "niewystarczające", "niewystarczająco",
  "niewystarczający", "niewyszukana", "niewyszukane", "niewyszukany", "niewzruszona", "niewzruszone", "niewzruszony", "niezabezpieczona",
  "niezadowalająca", "niezadowalające", "niezadowalający", "niezadowolenie", "niezadowolona", "niezadowolone", "niezadowolony", "niezatwierdzona",
  "niezatwierdzone", "niezbadane", "niezdecydowana", "niezdecydowane", "niezdecydowany", "niezdolna", "niezdolne", "niezdolny",
  "niezdrowy", "niezgoda", "nieznośny", "niezręczna", "niezręczne", "niezręczny", "niezrozumiała", "niezrozumiałe",
  "niezrozumiały", "niezrozumiana", "niezrozumiane", "niezrozumiany", "niszcza", "niszcząca", "niszczące", "niszczący",
  "niszcze", "niszczenie", "niszczy", "niszczycielski", "niszczyć", "nonsens", "notoryczna", "notoryczne",
  "notoryczny", "nowicjusz", "nowotwór", "nuda", "nudny", "nudziarz", "obawa", "obciążająca",
  "obciążające", "obciążający", "obciążenie", "obciążone", "obłudny", "obojętność", "obojętny", "obowiązkowy",
  "obrabować", "obraza", "obrazić", "obrazoburcza", "obrazoburcze", "obrazoburczy", "obraźliwa", "obraźliwe",
  "obraźliwy", "obrażona", "obrażone", "obrażony", "obrzydliwa", "obrzydliwe", "obrzydliwy", "oburzająca",
  "oburzające", "oburzający", "oburzenie", "oburzona", "oburzone", "oburzony", "obwinianie", "obwiniona",
  "obwinione", "obwiniony", "oczekiwano", "odcięcie", "odczłowieczać", "odeprzeć", "oderwana", "oderwane",
  "oderwany", "odkłada", "odkładanie", "odkosz", "odmawia", "odmawiając", "odmowa", "odmowy",
  "odmówił", "odmówiono", "odosobniona", "odosobnione", "odosobniony", "odpychająca", "odpychające", "odpychający",
  "odpychana", "odpychane", "odpychany", "odraczać", "odraza", "odrazu", "odrażająca", "odrażające",
  "odrażający", "odroczenie", "odrzuca", "odrzucać", "odrzucenia", "odrzucenie", "odrzucona", "odrzucone",
  "odrzucony", "odrzuć", "odrzuty", "odsłaniając", "odstraszająca", "odstraszające", "odstraszający", "odszkodowanie",
  "odwołana", "odwołane", "odwołany", "odwrócona", "odwrócone", "odwrócony", "ofensywa", "offline",
  "ofiara", "ofiary", "ogień", "ogłuszająca", "ogłuszające", "ogłuszający", "ogranicza", "ograniczać",
  "ograniczająca", "ograniczające", "ograniczający", "ograniczanie", "ograniczenie", "ograniczeń", "ograniczona", "ograniczone",
  "ograniczony", "ohydny", "okpiona", "okpione", "okpiony", "okropne", "okropny", "okrucieństwo",
  "okrutny", "okrycie", "oksymoron", "oops", "opłakiwać", "opłakiwana", "opłakiwane", "opłakiwany",
  "opłat", "opór", "opóźniać", "opóźnienia", "opóźnienie", "opóźniona", "opóźnione", "opóźniony",
  "opresje", "opuszczona", "opuszczone", "opuszczony", "orzechy", "osioł", "osiowane", "oskarżać",
  "oskarżanie", "oskarżenia", "oskarżenie", "oskarżona", "oskarżone", "oskarżony", "osłabiać", "osłabienie",
  "osłabiona", "osłabione", "osłabiony", "ospała", "ospałe", "ospały", "ostryzje", "ostrzał",
  "ostrzec", "ostrzega", "ostrzejszy", "ostrzeżenia", "ostrzeżenie", "ostrzeżona", "ostrzeżone", "ostrzeżony",
  "osuszona", "osuszone", "osuszony", "oszalała", "oszalałe", "oszalały", "oszczercza", "oszczercze",
  "oszczerczy", "oszołomiona", "oszołomione", "oszołomiony", "oszukać", "oszukana", "oszukane", "oszukany",
  "oszukańcza", "oszukańcze", "oszukańczy", "oszukiwanie", "oszust", "oszustwa", "oszustwami", "oszustwo",
  "oszuści", "otulina", "ouch", "overran", "oversell", "overselling", "pamiętliwa", "pamiętliwe",
  "pamiętliwy", "panika", "paniki", "panować", "papieros", "paradoks", "paraliżować", "parodia",
  "parsknął", "parsknęła", "parsknęło", "parszywa", "parszywe", "parszywy", "paskudny", "pech",
  "pedał", "penalizowanie", "penalizuje", "pesymistyczna", "pesymistyczne", "pesymistyczny", "pesymizm", "pęk",
  "piekielna", "piekielne", "piekielny", "piekło", "pieprzona", "pieprzone", "pieprzony", "pierdole",
  "pierdolę", "pierdoli", "pierdolić", "pierdolona", "pierdolone", "pierdolony", "pijana", "pijane",
  "pijany", "pika", "pilna", "pilne", "pilny", "pissing", "pistolet", "pizda",
  "plaga", "plagi", "plamić", "plądrowanie", "plodding", "plotki", "płacz", "płacze",
  "płakać", "płakał", "płakała", "płakało", "pobłażliwa", "pobłażliwe", "pobłażliwy", "pobudzenie",
  "pocięte", "podejrzana", "podejrzane", "podejrzany", "podejrzanych", "podejrzewać", "podła", "podłe",
  "podły", "podstępny", "podważa", "podważona", "podważone", "podważony", "pogarda", "pogardliwa",
  "pogardliwe", "pogardliwie", "pogardliwy", "pogardzie", "pogarszać", "pogarszona", "pogarszone", "pogarszony",
  "pogłębia", "pogłębiają", "pogrzeb", "pogrzeby", "pogwałcić", "poirytowana", "poirytowane", "poirytowany",
  "pokonać", "pokonana", "pokonane", "pokonany", "pokrycie", "pomaganie", "pomijając", "pominięte",
  "pomniejszać", "pomszczona", "pomszczone", "pomszczony", "pomścić", "pomyłka", "ponieść", "ponuro",
  "ponury", "popełniona", "popełnione", "popełniony", "popieprzona", "popieprzone", "popieprzony", "popłoch",
  "porwana", "porwane", "porwania", "porwanie", "porwany", "porzucenie", "porzucić", "porzucone",
  "posądzać", "poszkodowana", "poszkodowane", "poszkodowany", "poślizg", "potępia", "potępiać", "potępienie",
  "potrzebująca", "potrzebujące", "potrzebujący", "powalona", "powalone", "powalony", "powolna", "powolne",
  "powolny", "powstrzymując", "pozbawienie", "pozostawiać", "pozwać", "pozwana", "pozwane", "pozwany",
  "pozwy", "prblm", "prblms", "pretekst", "problem", "problemy", "propaganda", "protest",
  "protestować", "protestująca", "protestujące", "protestujący", "protesty", "prowokuje", "przebrana", "przebrane",
  "przebrania", "przebranie", "przebrany", "przecenić", "przeciągnięta", "przeciągnięte", "przeciągnięty", "przeciążać",
  "przeciętność", "przeciwnik", "przegrana", "przegrane", "przegrany", "przegrywająca", "przegrywające", "przegrywający",
  "przekazywanie", "przekleństwo", "przeklęta", "przeklęte", "przeklęty", "przeklinał", "przekłuwa", "przekraczać",
  "przekręcanie", "przekupić", "przekupiona", "przekupione", "przekupiony", "przekupstwo", "przeładowanie", "przemoc",
  "przemocą", "przemycać", "przemycanie", "przemycona", "przemycone", "przemycony", "przeoczenie", "przeoczone",
  "przepraszać", "przepraszał", "przeprosiny", "przerażona", "przerażone", "przerażony", "przerwać", "przerwał",
  "przerwanie", "przerwy", "przerywając", "przesada", "przesadne", "przesadny", "przesady", "przesadza",
  "przesłuchiwana", "przesłuchiwane", "przesłuchiwany", "przestarzała", "przestarzałe", "przestarzały", "przestępca", "przestępcy",
  "przestępstw", "przestępstwo", "przestraszona", "przestraszone", "przestraszony", "przestraszyć", "przesunięta", "przesunięte",
  "przesunięty", "przeszkadza", "przeszkadzać", "przeszkadzał", "przeszkoda", "przeszkody", "prześladowana", "prześladowane",
  "prześladowanie", "prześladowany", "przewinienia", "przyczajona", "przyczajone", "przyczajony", "przygnębiać", "przygnębiająca",
  "przygnębiające", "przygnębiający", "przygnębiona", "przygnębione", "przygnębiony", "przymus", "przypadkowo", "przypadkowy",
  "przysięga", "przysięgać", "przystanki", "przyznać", "przyznaje", "przyznał", "przyzwoita", "przyzwoite",
  "przyzwoity", "pseudonauka", "psota", "psychopatyczna", "psychopatyczne", "psychopatyczny", "pułapka", "pushy",
  "pustka", "pusty", "pytająca", "pytające", "pytający", "ragująca", "ragujące", "ragujący",
  "ranna", "ranne", "ranny", "ranters", "rants", "rasistami", "rasistowski", "rasizm",
  "ratunek", "rebeliantów", "recesja", "reperkusje", "represjonować", "reprimanding", "reprimands", "rezygnacja",
  "rezygnować", "rezygnuje", "robing", "roboty", "rozbite", "rozczarowana", "rozczarowane", "rozczarowania",
  "rozczarowanie", "rozczarowany", "rozdarty", "rozdrażnia", "rozgniewana", "rozgniewane", "rozgniewany", "rozgoryczona",
  "rozgoryczone", "rozgoryczony", "rozmaz", "rozmyte", "rozpacz", "rozpraszać", "rozsądny", "roztargnienie",
  "roztargniona", "roztargnione", "roztargniony", "roztrzepana", "roztrzepane", "roztrzepany", "rozwalona", "rozwalone",
  "rozwalony", "rozwścieczona", "rozwścieczone", "rozwścieczony", "rozwścieczyć", "rozzłoszczona", "rozzłoszczone", "rozzłoszczony",
  "ruina", "rygiel", "ryzyka", "ryzyko", "rzepak", "sabotaż", "sam", "samobójcza",
  "samobójcze", "samobójczy", "samobójstw", "samobójstwo", "samolubny", "samotny", "samozgodne", "sarkastyczna",
  "sarkastyczne", "sarkastyczny", "savange", "savanges", "sceptycy", "sceptycyzm", "sceptyczna", "sceptyczne",
  "sceptyczny", "sceptyk", "seksista", "seksistyczne", "sfałszowane", "sfrustrowana", "sfrustrowane", "sfrustrowany",
  "shithead", "shoody", "siki", "singleminded", "skamieniałe", "skandal", "skandale", "skandaliczna",
  "skandaliczne", "skandaliczny", "skarga", "skaza", "skazana", "skazane", "skazanie", "skazany",
  "skażenie", "skażona", "skażone", "skażony", "skąpy", "skłamał", "skłonność", "skorumpowana",
  "skorumpowane", "skorumpowany", "skórki", "skradziona", "skradzione", "skradziony", "skruszona", "skruszone",
  "skruszony", "skrzywdzona", "skrzywdzone", "skrzywdzony", "skurcz", "skurczona", "skurczone", "skurczony",
  "skurwielu", "skurwysyn", "slumping", "słabo", "słabości", "słabość", "słaby", "smętny",
  "smog", "smród", "smutek", "smutny", "snubbing", "snubs", "soczysty", "spadanie",
  "spam", "spamerze", "spamerzy", "spamowanie", "spekulacyjny", "spekulować", "spięta", "spięte",
  "spiętrzyć", "spięty", "spisek", "sporny", "spór", "sprawca", "sprawców", "sprowokować",
  "sprowokowana", "sprowokowane", "sprowokowany", "sprzeczna", "sprzeczne", "sprzeczny", "sprzeniewierzenie", "spustoszenie",
  "sroga", "srogi", "srogie", "ssać", "stabs", "stalled", "stalling", "starves",
  "stereotyp", "stereotypowy", "stękanie", "stłumiona", "stłumione", "stłumiony", "stoisko", "strach",
  "stracona", "stracone", "stracony", "strajk", "strajkująca", "strajkujące", "strajkujący", "straszliwa",
  "straszliwe", "straszliwy", "straszne", "straszny", "straty", "stresor", "stresory", "stronnicza",
  "stronnicze", "stronniczość", "stronniczy", "strzelać", "sueing", "suka", "suki", "sumowanie",
  "surowo", "surowy", "swędząca", "swędzące", "swędzący", "szaleńców", "szaleństwo", "szalona",
  "szalone", "szalony", "szał", "szantaż", "szantażowana", "szantażowane", "szantażowanie", "szantażowany",
  "szantażuje", "szarpnięcie", "szary", "szkoda", "szkodliwa", "szkodliwe", "szkodliwy", "szkody",
  "szmata", "szmugluje", "szorstki", "szumowiny", "szydzić", "ścigać", "ścigana", "ścigane",
  "ścigany", "śledziennik", "ślepy", "śmieci", "śmierć", "śmierdząca", "śmierdzące", "śmierdzący",
  "śmierdzi", "śmiertelna", "śmiertelne", "śmiertelnie", "śmiertelność", "śmiertelny", "śmieszny", "takielunek",
  "tard", "tchórz", "tchórzliwa", "tchórzliwe", "tchórzliwy", "terror", "terrorysta", "terrorystami",
  "terroryzować", "terroryzowane", "terroryzuje", "tęsknić", "tnąca", "tnące", "tnący", "toksyczna",
  "toksyczne", "toksyczny", "topór", "torturować", "torturowana", "torturowane", "torturowanie", "torturowany",
  "tortury", "totalitarny", "totalitaryzm", "touting", "traci", "tragedia", "tragedie", "tragiczna",
  "tragiczne", "tragiczny", "traumatyczna", "traumatyczne", "traumatyczny", "truciznach", "trudność", "trudny",
  "trwonienie", "trzęsienie", "twat", "tyłek", "tyrada", "tyran", "tyranianie", "tyrans",
  "ubliżać", "ubliżająca", "ubliżające", "ubliżający", "uboga", "ubogi", "ubogie", "ubolewa",
  "ubolewać", "ubolewał", "ubóstwo", "uciążliwa", "uciążliwe", "uciążliwy", "ucieczka", "ucieka",
  "uciekając", "ucisk", "uciskana", "uciskane", "uciskany", "uciszająca", "uciszające", "uciszający",
  "uczulona", "uczulone", "uczulony", "udać", "udaje", "udaremniać", "udaremnienie", "udaremniona",
  "udaremnione", "udaremniony", "udawanie", "uderzenia", "uduszone", "ugh", "ujarzmiać", "ukarana",
  "ukarane", "ukarany", "ukłucie", "ukośniki", "ukradłem", "ukryć", "ukrywanie", "umierać",
  "umierająca", "umierające", "umierający", "unieruchomiona", "unieruchomione", "unieruchomiony", "unikać", "unikając",
  "uniknąć", "upadek", "upadł", "upadła", "upadłe", "upadły", "uparty", "upiorny",
  "upłynął", "upłynęła", "upłynęło", "upokorzenie", "upokorzona", "upokorzone", "upokorzony", "upomniana",
  "upomniane", "upomniany", "upośledza", "upośledzenie", "upośledzone", "upraszcza", "uproszczenie", "uproszczona",
  "uproszczone", "uproszczony", "uprościć", "uprowadzenia", "uprowadzenie", "uprowadzona", "uprowadzone", "uprowadzony",
  "upuszczać", "uraz", "urazy", "urażona", "urażone", "urażony", "usunąć", "uszkodzić",
  "uszkodzona", "uszkodzone", "uszkodzony", "utknął", "utknęła", "utknęło", "utonął", "utonęła",
  "utonęło", "utonie", "utopić", "utrapienie", "utrata", "utrudnia", "utrudniać", "uwiedziona",
  "uwiedzione", "uwiedziony", "uwięzienie", "uwięziona", "uwięzione", "uwięziony", "uzdrawia", "używana",
  "używane", "używany", "victimizes", "wad", "wada", "wadliwa", "wadliwe", "wadliwy",
  "wady", "walcząc", "walcząca", "walczące", "walczący", "walczyć", "walczył", "walka",
  "walki", "wanker", "wariat", "wątpić", "wątpienie", "wątpliwa", "wątpliwe", "wątpliwy",
  "wdowy", "werdykt", "werdyktów", "westchnienie", "więzienie", "więzień", "więźniowie", "wiktymizacja",
  "wina", "winić", "winna", "winne", "winny", "winy", "wkurw", "wkurwi",
  "wkurwia", "wkurwić", "wkurwili", "wkurwił", "wkurwiła", "wkurwiło", "wkurwiły", "włamanie",
  "włamywacz", "wojna", "wrak", "wrażliwa", "wrażliwe", "wrażliwość", "wrażliwy", "wroga",
  "wrogi", "wrogie", "wrogowie", "wróg", "wrzask", "wrzaskliwa", "wrzaskliwe", "wrzaskliwy",
  "wrzawa", "wstrząsająca", "wstrząsające", "wstrząsający", "wstrząsy", "wstyd", "wścibski", "wściekła",
  "wściekłe", "wściekłość", "wściekły", "wtf", "wtff", "wtfff", "wybielić", "wybryk",
  "wybuch", "wybuchy", "wyciekła", "wyciekłe", "wyciekły", "wycofanie", "wyczerpana", "wyczerpane",
  "wyczerpany", "wyczuwał", "wydalona", "wydalone", "wydalony", "wydrążona", "wydrążone", "wydrążony",
  "wygięcie", "wygnać", "wyjść", "wykluczać", "wykluczenie", "wykoleić", "wykolejenia", "wykolejona",
  "wykolejone", "wykolejony", "wykorzystać", "wykorzystywania", "wykroczenie", "wyłączenie", "wyłączona", "wyłączone",
  "wyłączony", "wyłom", "wymagające", "wymazać", "wymęczona", "wymęczone", "wymęczony", "wymiociny",
  "wymiotował", "wymioty", "wymuszona", "wymuszone", "wymuszony", "wyolbrzymiać", "wypadek", "wypadki",
  "wypłaty", "wyprzedzona", "wyprzedzone", "wyprzedzony", "wyrzuca", "wyrzucenie", "wysypisko", "wysypka",
  "wyszczerbienie", "wyśmiewanie", "wywrotowy", "wyzwanie", "wyzywająca", "wyzywające", "wyzywający", "yucky",
  "zaatakowana", "zaatakowane", "zaatakowany", "zabicie", "zabić", "zabija", "zabita", "zabite",
  "zabity", "zablokowana", "zablokowane", "zablokowany", "zaborcza", "zaborcze", "zaborczy", "zabójstwa",
  "zabójstwo", "zabrania", "zabroniona", "zabronione", "zabroniony", "zaburzenia", "zaburzona", "zaburzone",
  "zaburzony", "zachmurzone", "zachowane", "zadać", "zadaje", "zadane", "zadanie", "zadławienie",
  "zagłodzona", "zagłodzone", "zagłodzony", "zagroził", "zagrożenie", "zagrożeń", "zagrożona", "zagrożone",
  "zagrożony", "zakaz", "zakazać", "zakazana", "zakazane", "zakazany", "zakaźny", "zakażenie",
  "zakłamać", "zakłopotana", "zakłopotane", "zakłopotania", "zakłopotanie", "zakłopotany", "zakłócać", "zakłócenia",
  "zakłócenie", "zakłóceń", "zakłócona", "zakłócone", "zakłócony", "zakręcona", "zakręcone", "zakręcony",
  "zalana", "zalane", "zalany", "zamach", "zamieszek", "zamieszki", "zamyślona", "zamyślone",
  "zamyślony", "zanieczyszczać", "zanieczyszczają", "zanieczyszczająca", "zanieczyszczające", "zanieczyszczający", "zanieczyszczających", "zanieczyszczenia",
  "zanieczyszczenie", "zanieczyszczeń", "zanieczyszczona", "zanieczyszczone", "zanieczyszczony", "zanieczyścić", "zaniedbana", "zaniedbane",
  "zaniedbanie", "zaniedbany", "zaniedbując", "zaniedbuje", "zaniepokojona", "zaniepokojone", "zaniepokojony", "zanika",
  "zaniżone", "zaostrza", "zaostrzona", "zaostrzone", "zaostrzony", "zaostrzyć", "zapada", "zaparcie",
  "zapierająca", "zapierające", "zapierający", "zapłacić", "zapobiec", "zapobiega", "zapobiegać", "zapobieganie",
  "zapodziać", "zapominalski", "zapomniałem", "zapomniana", "zapomniane", "zapomniany", "zapomnieć", "zaprzecza",
  "zaprzeczać", "zaprzeczając", "zapytał", "zaraźliwa", "zaraźliwe", "zaraźliwy", "zarażona", "zarażone",
  "zarażony", "zarozumiała", "zarozumiałe", "zarozumiały", "zarzut", "zarzuty", "zaskarżyć", "zaskoczona",
  "zaskoczone", "zaskoczony", "zasmucać", "zasmucona", "zasmucone", "zasmucony", "zastraszają", "zastraszanie",
  "zastraszenie", "zastraszona", "zastraszone", "zastraszony", "zastraszyć", "zaszokować", "zasztyletować", "zatkane",
  "zatruć", "zatrute", "zatrzasnąć", "zatrzymać", "zatrzymana", "zatrzymane", "zatrzymanie", "zatrzymany",
  "zawieszać", "zawieszona", "zawieszone", "zawieszony", "zawieść", "zawodnik", "zawstydzić", "zawstydzona",
  "zawstydzone", "zawstydzony", "zazdrosny", "zazdroszczę", "zazdrość", "zażądał", "zażenowanie", "zbesztać",
  "zboczeniec", "zbolała", "zbolałe", "zbolały", "zbrodnie", "zdania", "zdanie", "zdeformowana",
  "zdeformowane", "zdeformowany", "zdegradowana", "zdegradowane", "zdegradowany", "zdemoralizować", "zdenerwowana", "zdenerwowane",
  "zdenerwowanie", "zdenerwowany", "zderzenie", "zdesperowana", "zdesperowane", "zdesperowany", "zdewastowana", "zdewastowane",
  "zdewastowany", "zdezorganizowana", "zdezorganizowane", "zdezorganizowany", "zdezorientowana", "zdezorientowane", "zdezorientowany", "zdrada",
  "zdrady", "zdradzać", "zdradzieckie", "zdradzona", "zdradzone", "zdradzony", "zdrętwiała", "zdrętwiałe",
  "zdrętwiały", "zdyskontowane", "zdyskredytowana", "zdyskredytowane", "zdyskredytowany", "zdyskwalifikowana", "zdyskwalifikowane", "zdyskwalifikowany",
  "zemsta", "zepsuty", "zgnieciona", "zgniecione", "zgnieciony", "zgniła", "zgniłe", "zgniły",
  "zgwałcona", "zgwałcone", "zgwałcony", "zielonkawy", "zignorowane", "zirytowana", "zirytowane", "zirytowany",
  "zjadliwa", "zjadliwe", "zjadliwy", "zjeb", "zła", "złagodzi", "złamana", "złamane",
  "złamany", "złe", "zło", "złodupiec", "złości", "złośliwa", "złośliwe", "złośliwy",
  "złowroga", "złowrogi", "złowrogie", "zły", "zmarła", "zmarłe", "zmarły", "zmarnować",
  "zmarnowana", "zmarnowane", "zmarnowanie", "zmarnowany", "zmarszczki", "zmarszczona", "zmarszczone", "zmarszczony",
  "zmartwienie", "zmartwiona", "zmartwione", "zmartwiony", "zmącić", "zmęczenie", "zmęczona", "zmęczone",
  "zmęczony", "zmiażdżyć", "zmieszana", "zmieszane", "zmieszany", "zmonopolizować", "zmówienie", "zmywarka",
  "zmywarki", "zniechęcona", "zniechęcone", "zniechęcony", "zniecierpliwiona", "zniecierpliwione", "zniecierpliwiony", "zniekształca",
  "zniekształcać", "zniekształcając", "zniekształcenie", "zniekształcona", "zniekształcone", "zniekształcony", "znienawidzona", "znienawidzone",
  "znienawidzony", "znieważona", "znieważone", "znieważony", "zniewolona", "zniewolone", "zniewolony", "znika",
  "znikać", "zniknął", "zniknęła", "zniknęło", "zniszczenie", "zniszczona", "zniszczone", "zniszczony",
  "zniszczyć", "znudzona", "znudzone", "znudzony", "zranienie", "zrezygnowana", "zrezygnowane", "zrezygnowany",
  "zrujnować", "zrujnowana", "zrujnowane", "zrujnowany", "zwariowana", "zwariowane", "zwariowany", "zwisająca",
  "zwisające", "zwisający", "zwłoki", "zwodnicza", "zwodnicze", "zwodniczy", "zwodzi", "źle",
  "żal", "żałoba", "żałoby", "żałosne", "żałosny", "żałośnie", "żałowałem", "żałuje",
  "żądania", "żądanie", "żenująca", "żenujące", "żenujący"
];

const POSITIVE_DICT = buildDictionary([
  ...POSITIVE_WORDS_RAW,
  ...PL_EMO_POSITIVE,
  ...NAWL_POSITIVE,
  ...PL_EXTENDED_POSITIVE,
  ...SP_POSITIVE,
  ...NAWL_PL_POSITIVE,
  ...PLWN_POSITIVE,
]);
const NEGATIVE_DICT = buildDictionary([
  ...NEGATIVE_WORDS_RAW,
  ...PL_EMO_NEGATIVE,
  ...NAWL_NEGATIVE,
  ...PL_EXTENDED_NEGATIVE,
  ...SP_NEGATIVE,
  ...NAWL_PL_NEGATIVE,
  ...PLWN_NEGATIVE,
]);


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

// Negation particles — split by language so we apply only the right set per message
const NEGATION_PL = new Set(['nie', 'bez', 'ani']);
const NEGATION_EN = new Set([
  // tokenizer normalizes "don't"→"dont", "can't"→"cant", etc.
  'not', 'dont', 'cant', 'wont', 'isnt', 'arent', 'wasnt',
  'werent', 'hasnt', 'havent', 'doesnt', 'didnt', 'couldnt',
  'wouldnt', 'shouldnt', 'never',
  // 'no' excluded — in Polish "no" is a confirmation filler ("no tak", "no dobra", "no elo")
]);
const NEGATION_WINDOW = 3; // 3-token lookahead (Cruz et al. 2015: optimal 3-4 tokens for short text)

// English sentence markers — words that reliably signal the message is in English.
// Chosen to be absent/rare in Polish chat (even without diacritics).
const EN_SENTENCE_RE = /\b(the|this|that|with|from|they|them|their|you're|i'm|i'll|i've|we're|it's|that's|what's|there's|here's|she's|he's)\b/i;

// Pre-built combined set (cached, avoids allocation per message)
const NEGATION_BOTH = new Set([...NEGATION_PL, ...NEGATION_EN]);

/**
 * Pick the right negation set for a message.
 * Default: Polish-only (app is PL-first, most chats are Polish — even without diacritics).
 * English negation particles added only when clear English markers detected.
 */
function getNegationSet(text: string): Set<string> {
  return EN_SENTENCE_RE.test(text) ? NEGATION_BOTH : NEGATION_PL;
}

/**
 * Resolve the sentiment polarity of a single token.
 *
 * Order:
 *   1. Exact match in POSITIVE_DICT / NEGATIVE_DICT (fast path, Set.has O(1))
 *   2. Diacritic-stripped exact match (handles ASCII input like "szczesliwy")
 *   3. Inflection fallback via lookupInflectedPolish — catches Polish adjective /
 *      participle / noun case forms that are not stored verbatim in the
 *      dictionary (e.g. "szczęśliwemu", "cudownego", "wstrętnych").
 *
 * Returns 'positive', 'negative', or undefined (no match).
 */
/**
 * Collapse repeated letters — common in chat emphasis: "suuuper"→"super",
 * "kuuurwa"→"kurwa", "niiice"→"nice", "kochaaaam"→"kocham".
 * Tries collapsing to 2 then 1 repeated char.
 */
function dedupeLetters(token: string): string {
  return token.replace(/(.)\1{2,}/g, '$1$1');  // 3+ same char → 2
}
function dedupeLettersSingle(token: string): string {
  return token.replace(/(.)\1+/g, '$1');         // 2+ same char → 1
}

// ============================================================
// Typo Tolerance — QWERTY keyboard-aware edit distance 1
// ============================================================
// ~80% of misspellings are single-char errors (Damerau 1964).
// We generate edit-distance-1 candidates and check Set.has().
// Only keyboard-adjacent substitutions are considered to minimize
// false positives. Min word length: 5 chars.

/** QWERTY keyboard adjacency — each key maps to its physically adjacent keys. */
const QWERTY_NEIGHBORS: Record<string, string> = {
  'q': 'wa', 'w': 'qeasd', 'e': 'wrdsf', 'r': 'etfgd',
  't': 'rygfh', 'y': 'tuhgj', 'u': 'yijhk', 'i': 'uojkl',
  'o': 'ipkl', 'p': 'ol',
  'a': 'qwsxz', 's': 'awedxzc', 'd': 'serfcxv', 'f': 'drtgcvb',
  'g': 'ftyhvbn', 'h': 'gyujbnm', 'j': 'huiknm', 'k': 'jiolm',
  'l': 'kop',
  'z': 'asx', 'x': 'zsdc', 'c': 'xdfv', 'v': 'cfgb',
  'b': 'vghn', 'n': 'bhjm', 'm': 'njk',
};

const TYPO_MIN_LENGTH = 5;

/**
 * Generate edit-distance-1 candidates for typo correction.
 * Returns empty array for tokens shorter than TYPO_MIN_LENGTH.
 *
 * Covers: transpositions (~5-8%), deletions (~22%), keyboard-adjacent substitutions (~66%).
 * Insertions covered implicitly — if user inserted an extra char, the deletion candidate
 * removes it to recover the dictionary form.
 */
function generateTypoCandidates(token: string): string[] {
  if (token.length < TYPO_MIN_LENGTH) return [];

  const candidates: string[] = [];

  // 1. Transpositions — swap adjacent chars ("kocahm" → "kocham")
  for (let i = 0; i < token.length - 1; i++) {
    if (token[i] !== token[i + 1]) {
      candidates.push(token.slice(0, i) + token[i + 1] + token[i] + token.slice(i + 2));
    }
  }

  // 2. Deletions — remove one char ("kochham" → "kocham")
  for (let i = 0; i < token.length; i++) {
    candidates.push(token.slice(0, i) + token.slice(i + 1));
  }

  // 3. Keyboard-adjacent substitutions only ("kochsm" → "kocham", a→s adjacent)
  for (let i = 0; i < token.length; i++) {
    const neighbors = QWERTY_NEIGHBORS[token[i]];
    if (!neighbors) continue;
    for (const neighbor of neighbors) {
      candidates.push(token.slice(0, i) + neighbor + token.slice(i + 1));
    }
  }

  return candidates;
}

/** LRU cache for typo lookups to avoid recomputation on repeated tokens. */
const TYPO_CACHE = new Map<string, 'positive' | 'negative' | 'none'>();
const TYPO_CACHE_MAX = 2000;

function typoCacheLookup(token: string): 'positive' | 'negative' | undefined {
  const cached = TYPO_CACHE.get(token);
  if (cached !== undefined) return cached === 'none' ? undefined : cached;

  const candidates = generateTypoCandidates(token);
  let posHit = false;
  let negHit = false;
  for (const c of candidates) {
    if (POSITIVE_DICT.has(c)) posHit = true;
    if (NEGATIVE_DICT.has(c)) negHit = true;
    if (posHit && negHit) break; // ambiguous — stop early
  }

  let result: 'positive' | 'negative' | 'none' = 'none';
  if (posHit && !negHit) result = 'positive';
  else if (negHit && !posHit) result = 'negative';
  // If both → ambiguous → 'none' (no match)

  // Evict oldest entries when cache is full
  if (TYPO_CACHE.size >= TYPO_CACHE_MAX) {
    const firstKey = TYPO_CACHE.keys().next().value;
    if (firstKey !== undefined) TYPO_CACHE.delete(firstKey);
  }
  TYPO_CACHE.set(token, result);

  return result === 'none' ? undefined : result;
}

function resolvePolarity(token: string): 'positive' | 'negative' | undefined {
  // 1. Exact match (fast path)
  if (POSITIVE_DICT.has(token)) return 'positive';
  if (NEGATIVE_DICT.has(token)) return 'negative';

  // 2. Chat emphasis dedup: "suuuper"→"super", "kochaaaam"→"kocham"
  const deduped2 = dedupeLetters(token);
  if (deduped2 !== token) {
    if (POSITIVE_DICT.has(deduped2)) return 'positive';
    if (NEGATIVE_DICT.has(deduped2)) return 'negative';
  }
  const deduped1 = dedupeLettersSingle(token);
  if (deduped1 !== token && deduped1 !== deduped2) {
    if (POSITIVE_DICT.has(deduped1)) return 'positive';
    if (NEGATIVE_DICT.has(deduped1)) return 'negative';
  }

  // 3. Typo tolerance — keyboard-aware edit distance 1 (Damerau 1964)
  const typoResult = typoCacheLookup(token);
  if (typoResult) return typoResult;

  // 4. Inflection fallback — generates candidate base forms from the inflected token
  return lookupInflectedPolish(token, POSITIVE_DICT, NEGATIVE_DICT);
}

// TODO: Consider using weighted scoring instead of binary +1/-1.
// The SP_POSITIVE/SP_NEGATIVE words come from AFINN-165 (Nielsen 2011)
// which has integer weights -5 to +5. Binary scoring loses intensity info
// (e.g. "bastard" at -5 treated same as "slightly" at -1).
// Challenge: other dictionaries (plWordNet, NAWL) don't have AFINN weights.

/**
 * Compute sentiment score for a single text string.
 *
 * Tokenizes to lowercase words, counts positive and negative
 * dictionary matches, returns normalized score.
 *
 * Negation handling: Polish (nie, bez, ani) and English (not, don't, never, etc.)
 * particles followed by a positive word within 3 tokens flip that positive → negative.
 *
 * Inflection fallback: tokens that miss the exact-match dictionary are passed
 * through lookupInflectedPolish() which generates candidate base forms by
 * stripping inflectional suffixes and re-attaching nominative endings, so that
 * inflected forms (e.g. "szczęśliwemu", "cudownego", "kochającego") are scored.
 */
export function computeSentimentScore(text: string): SentimentScore {
  const tokens = tokenize(text);
  const negationSet = getNegationSet(text);
  let positive = 0;
  let negative = 0;

  // First pass: mark negated indices (positive→negative and negative→positive)
  const negatedIndices = new Set<number>();    // positive words flipped to negative
  const negatedNegIndices = new Set<number>(); // negative words flipped to positive
  const consumedNegations = new Set<number>();

  for (let i = 0; i < tokens.length; i++) {
    if (!negationSet.has(tokens[i])) continue;

    // Look ahead up to NEGATION_WINDOW tokens for a sentiment word to flip
    for (let j = 1; j <= NEGATION_WINDOW && i + j < tokens.length; j++) {
      const ahead = tokens[i + j];
      const polarity = resolvePolarity(ahead);
      if (polarity === 'positive') {
        negatedIndices.add(i + j);    // positive → negative ("nie lubię")
        consumedNegations.add(i);
        break;
      }
      if (polarity === 'negative') {
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
    } else {
      const polarity = resolvePolarity(token);
      if (polarity === 'positive') positive++;
      else if (polarity === 'negative') negative++;
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

  // Standard deviation for emotional volatility.
  // With <20 scored messages, stddev is noisy and unreliable — return 0.
  let emotionalVolatility = 0;
  if (totalScored >= 20) {
    const squaredDiffs = scores.map((s) => (s - avgSentiment) ** 2);
    const variance = squaredDiffs.reduce((acc, d) => acc + d, 0) / totalScored;
    emotionalVolatility = Math.sqrt(variance);
  }

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
