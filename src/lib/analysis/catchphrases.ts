/**
 * Catchphrase detection and best-time-to-text computation
 * for PodTeksT Phase 6A.
 *
 * Finds unique phrases per person via n-gram analysis and determines
 * optimal contact windows from heatmap data.
 */

import type {
  ParsedConversation,
  CatchphraseResult,
  CatchphraseEntry,
  BestTimeToText,
  PersonMetrics,
  TimingMetrics,
  EngagementMetrics,
  PatternMetrics,
  HeatmapData,
  TrendData,
} from '../parsers/types';
import { STOPWORDS } from './constants';

/** Subset of QuantitativeAnalysis fields needed by this module. */
interface QuantitativeInput {
  perPerson: Record<string, PersonMetrics>;
  timing: TimingMetrics;
  engagement: EngagementMetrics;
  patterns: PatternMetrics;
  heatmap: HeatmapData;
  trends: TrendData;
}

// ============================================================
// Helpers
// ============================================================

/** Tokenize text to lowercase words (letters/digits only, min 2 chars, no stopwords). */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .split(/[\s.,!?;:()\[\]{}"'\-\/\\<>@#$%^&*+=|~`]+/)
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w));
}

/** Polish day-of-week names, indexed by JS getDay() (0=Sunday). */
const POLISH_DAYS: Record<number, string> = {
  0: 'Niedziela',
  1: 'Poniedziałek',
  2: 'Wtorek',
  3: 'Środa',
  4: 'Czwartek',
  5: 'Piątek',
  6: 'Sobota',
};

/** Plural form for Polish day names used in the bestWindow string. */
const POLISH_DAYS_PLURAL: Record<number, string> = {
  0: 'Niedziele',
  1: 'Poniedziałki',
  2: 'Wtorki',
  3: 'Środy',
  4: 'Czwartki',
  5: 'Piątki',
  6: 'Soboty',
};

/** Format hour as "HH:00" string. */
function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

// ============================================================
// Catchphrases
// ============================================================

export function computeCatchphrases(
  conversation: ParsedConversation,
): CatchphraseResult {
  const names = conversation.participants.map((p) => p.name);

  // Collect n-grams per person
  const bigramsPerPerson = new Map<string, Map<string, number>>();
  const trigramsPerPerson = new Map<string, Map<string, number>>();

  for (const name of names) {
    bigramsPerPerson.set(name, new Map());
    trigramsPerPerson.set(name, new Map());
  }

  for (const msg of conversation.messages) {
    if (!msg.content.trim()) continue;

    const bigramMap = bigramsPerPerson.get(msg.sender);
    const trigramMap = trigramsPerPerson.get(msg.sender);
    if (!bigramMap || !trigramMap) continue;

    const tokens = tokenize(msg.content);

    // Bigrams
    for (let j = 0; j < tokens.length - 1; j++) {
      const bigram = `${tokens[j]} ${tokens[j + 1]}`;
      bigramMap.set(bigram, (bigramMap.get(bigram) ?? 0) + 1);
    }

    // Trigrams
    for (let j = 0; j < tokens.length - 2; j++) {
      const trigram = `${tokens[j]} ${tokens[j + 1]} ${tokens[j + 2]}`;
      trigramMap.set(trigram, (trigramMap.get(trigram) ?? 0) + 1);
    }
  }

  // Compute global phrase counts (across all people)
  const globalPhraseCount = new Map<string, number>();
  for (const name of names) {
    const bigrams = bigramsPerPerson.get(name);
    const trigrams = trigramsPerPerson.get(name);
    if (bigrams) {
      for (const [phrase, count] of bigrams) {
        globalPhraseCount.set(phrase, (globalPhraseCount.get(phrase) ?? 0) + count);
      }
    }
    if (trigrams) {
      for (const [phrase, count] of trigrams) {
        globalPhraseCount.set(phrase, (globalPhraseCount.get(phrase) ?? 0) + count);
      }
    }
  }

  // Build catchphrases per person
  const result: Record<string, CatchphraseEntry[]> = {};

  for (const name of names) {
    const candidates: CatchphraseEntry[] = [];
    const bigrams = bigramsPerPerson.get(name);
    const trigrams = trigramsPerPerson.get(name);

    // Process bigrams
    if (bigrams) {
      for (const [phrase, count] of bigrams) {
        if (count < 3) continue;
        const globalCount = globalPhraseCount.get(phrase) ?? count;
        const uniqueness = globalCount > 0 ? count / globalCount : 0;
        if (uniqueness < 0.6) continue;
        candidates.push({
          phrase,
          count,
          uniqueness: Number.isFinite(uniqueness) ? Math.round(uniqueness * 100) / 100 : 0,
        });
      }
    }

    // Process trigrams
    if (trigrams) {
      for (const [phrase, count] of trigrams) {
        if (count < 3) continue;
        const globalCount = globalPhraseCount.get(phrase) ?? count;
        const uniqueness = globalCount > 0 ? count / globalCount : 0;
        if (uniqueness < 0.6) continue;
        candidates.push({
          phrase,
          count,
          uniqueness: Number.isFinite(uniqueness) ? Math.round(uniqueness * 100) / 100 : 0,
        });
      }
    }

    // Sort by count * uniqueness descending, take top 8
    candidates.sort((a, b) => b.count * b.uniqueness - a.count * a.uniqueness);
    result[name] = candidates.slice(0, 8);
  }

  return { perPerson: result };
}

// ============================================================
// Best Time to Text
// ============================================================

export function computeBestTimeToText(
  quantitative: QuantitativeInput,
  participantNames: string[],
): BestTimeToText {
  const result: BestTimeToText['perPerson'] = {};

  for (const name of participantNames) {
    const matrix = quantitative.heatmap.perPerson[name];
    if (!matrix) {
      result[name] = {
        bestDay: 'Brak danych',
        bestHour: 0,
        bestWindow: 'Brak danych',
        avgResponseMs: quantitative.timing.perPerson[name]?.medianResponseTimeMs ?? 0,
      };
      continue;
    }

    // Find the day+hour with the highest message count
    let maxCount = 0;
    let bestDay = 0;
    let bestHour = 0;

    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const count = matrix[day][hour];
        if (count > maxCount) {
          maxCount = count;
          bestDay = day;
          bestHour = hour;
        }
      }
    }

    // Build 2-hour window (centered if possible, but snap to even boundaries)
    const windowStart = bestHour > 0 ? bestHour : 0;
    const windowEnd = Math.min(windowStart + 2, 24);

    const dayName = POLISH_DAYS[bestDay] ?? 'Brak danych';
    const dayPlural = POLISH_DAYS_PLURAL[bestDay] ?? dayName;
    const windowStr = `${dayPlural} ${formatHour(windowStart)}-${formatHour(windowEnd)}`;

    result[name] = {
      bestDay: dayName,
      bestHour,
      bestWindow: windowStr,
      avgResponseMs: quantitative.timing.perPerson[name]?.medianResponseTimeMs ?? 0,
    };
  }

  return { perPerson: result };
}
