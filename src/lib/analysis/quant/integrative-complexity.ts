/**
 * Integrative Complexity (IC) — measures structural sophistication of thinking.
 *
 * IC has two components:
 * - Differentiation: recognizing multiple dimensions or perspectives (score 2-3)
 * - Integration: connecting differentiated dimensions into coherent frameworks (score 4-7)
 *
 * Score 1 = black-and-white thinking; Score 7 = maximum complexity.
 * In chat contexts we use a simplified heuristic: phrase detection (AutoIC).
 *
 * Declining IC during a conversation correlates with conflict escalation
 * (Suedfeld & Tetlock, 1977; Tetlock, 1981).
 *
 * References:
 * - Suedfeld, P. & Tetlock, P. E. (1977). Integrative complexity of communications
 *   in international crises. Journal of Conflict Resolution, 21(1), 169-184.
 * - Conway, L. G. et al. (2014). Automated IC scoring. Political Psychology, 35(1), 65-88.
 *   Test-retest stability r=0.30-0.50 — IC is state not pure trait.
 */

import type { UnifiedMessage } from '../../parsers/types';

export interface PersonICStats {
  /** Differentiation phrases detected */
  differentiationCount: number;
  /** Integration phrases detected */
  integrationCount: number;
  /** Normalized IC score 0-100 */
  icScore: number;
  /** Linear slope of monthly IC — negative = declining (escalation risk) */
  trend: number;
  /** Phrases found (for display) */
  examplePhrases: string[];
}

export interface IntegrativeComplexityResult {
  perPerson: Record<string, PersonICStats>;
  /** Who shows higher IC */
  higherIC: string;
  /** How much IC correlates with conflict months (-1 to 1) */
  conflictCorrelation: number;
}

// ============================================================
// Phrase dictionaries
// ============================================================

const DIFFERENTIATION_PL = new Set([
  'z drugiej strony', 'z jednej strony', 'aczkolwiek', 'jednak', 'mimo to',
  'niemniej jednak', 'chociaż', 'chyba że', 'o ile', 'pod warunkiem że',
  'z kolei', 'natomiast', 'ale z innej strony', 'z innej perspektywy',
  'pomimo że', 'mimo że', 'choć', 'aczkolwiek', 'wprawdzie', 'jakkolwiek',
  'z drugiej strony jednak', 'owszem ale', 'zgadza się ale', 'rozumiem ale',
  'masz rację ale', 'masz rację jednak', 'owszem jednak',
]);

const INTEGRATION_PL = new Set([
  'biorąc pod uwagę', 'zatem', 'stąd wynika', 'co oznacza że',
  'uwzględniając', 'w związku z tym', 'łącząc to', 'podsumowując',
  'ostatecznie', 'to pokazuje że', 'wynika z tego', 'na tej podstawie',
  'w konsekwencji', 'co prowadzi do', 'z czego wynika', 'mając to na uwadze',
  'patrząc na to całościowo', 'biorąc to wszystko razem',
]);

const DIFFERENTIATION_EN = new Set([
  'on the other hand', 'on one hand', 'however', 'although', 'but at the same time',
  'nevertheless', 'nonetheless', 'despite', 'even though', 'even if',
  'alternatively', 'in contrast', 'whereas', 'while', 'granted but',
  'admittedly', 'true but', 'fair enough but', 'you have a point but',
]);

const INTEGRATION_EN = new Set([
  'therefore', 'thus', 'hence', 'consequently', 'as a result',
  'taking everything into account', 'all things considered', 'in conclusion',
  'it follows that', 'which means that', 'putting it together',
  'integrating these', 'balancing these', 'weighing both sides',
]);

// ============================================================
// Core computation
// ============================================================

function containsPhrase(text: string, phrases: Set<string>): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const phrase of phrases) {
    if (lower.includes(phrase)) found.push(phrase);
  }
  return found;
}

function detectIC(content: string): { diff: number; integ: number; phrases: string[] } {
  const diffPhrases = [
    ...containsPhrase(content, DIFFERENTIATION_PL),
    ...containsPhrase(content, DIFFERENTIATION_EN),
  ];
  const integPhrases = [
    ...containsPhrase(content, INTEGRATION_PL),
    ...containsPhrase(content, INTEGRATION_EN),
  ];
  return { diff: diffPhrases.length, integ: integPhrases.length, phrases: [...diffPhrases, ...integPhrases] };
}

/** Normalize raw IC to 0-100 scale using sigmoid-like compression */
function normalizeIC(rawDiff: number, rawInteg: number, totalMessages: number): number {
  if (totalMessages < 10) return 0;
  // IC = (diff + integ*2) per 100 messages, compressed to 0-100
  const raw = (rawDiff + rawInteg * 2) / totalMessages * 100;
  // Compress: typical values 0-15 → map to 0-100
  return Math.round(Math.min(100, raw * 6.5));
}

/** Simple linear trend from array of monthly values */
function linearTrend(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : Math.round((num / den) * 100) / 100;
}

export function computeIntegrativeComplexity(
  messages: UnifiedMessage[],
  participantNames: string[],
): IntegrativeComplexityResult | undefined {
  if (participantNames.length < 2) return undefined;

  const stats: Record<string, {
    diff: number;
    integ: number;
    total: number;
    examplePhrases: string[];
    monthlyRaw: Record<string, { diff: number; integ: number; total: number }>;
  }> = {};

  for (const name of participantNames) {
    stats[name] = { diff: 0, integ: 0, total: 0, examplePhrases: [], monthlyRaw: {} };
  }

  for (const msg of messages) {
    if (!msg.content || !stats[msg.sender]) continue;
    const s = stats[msg.sender];
    s.total++;

    const { diff, integ, phrases } = detectIC(msg.content);
    s.diff += diff;
    s.integ += integ;
    if (phrases.length > 0 && s.examplePhrases.length < 5) {
      s.examplePhrases.push(...phrases.filter(p => !s.examplePhrases.includes(p)));
    }

    const month = new Date(msg.timestamp).toISOString().slice(0, 7);
    if (!s.monthlyRaw[month]) s.monthlyRaw[month] = { diff: 0, integ: 0, total: 0 };
    s.monthlyRaw[month].diff += diff;
    s.monthlyRaw[month].integ += integ;
    s.monthlyRaw[month].total++;
  }

  const perPerson: Record<string, PersonICStats> = {};
  for (const name of participantNames) {
    const s = stats[name];
    if (s.total < 30) continue;

    const icScore = normalizeIC(s.diff, s.integ, s.total);

    // Monthly IC scores for trend
    const months = Object.keys(s.monthlyRaw).sort();
    const monthlyScores = months.map(m => {
      const mr = s.monthlyRaw[m];
      return normalizeIC(mr.diff, mr.integ, mr.total);
    });
    const trend = linearTrend(monthlyScores);

    perPerson[name] = {
      differentiationCount: s.diff,
      integrationCount: s.integ,
      icScore,
      trend,
      examplePhrases: s.examplePhrases.slice(0, 5),
    };
  }

  const validNames = participantNames.filter(n => perPerson[n]);
  if (validNames.length < 2) return undefined;

  // Check if any IC phrases detected at all
  const totalPhrases = validNames.reduce((sum, n) =>
    sum + perPerson[n].differentiationCount + perPerson[n].integrationCount, 0);
  if (totalPhrases < 3) return undefined;

  const sorted = [...validNames].sort((a, b) => perPerson[b].icScore - perPerson[a].icScore);

  // Conflict correlation: negative IC trend in conflict months (simplified — return 0 if no conflict data)
  const conflictCorrelation = 0;

  return {
    perPerson,
    higherIC: sorted[0],
    conflictCorrelation,
  };
}
