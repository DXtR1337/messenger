/**
 * Gottman Four Horsemen — client-side derivation from CPS patterns.
 *
 * Maps Communication Pattern Screening results to Gottman's four
 * predictors of relationship dissolution: Criticism, Contempt,
 * Defensiveness, and Stonewalling.
 */

import type { CPSResult } from './communication-patterns';
import type { QuantitativeAnalysis } from '../parsers/types';

export interface HorsemanResult {
  id: 'criticism' | 'contempt' | 'defensiveness' | 'stonewalling';
  label: string;
  emoji: string;
  present: boolean;
  severity: 'none' | 'mild' | 'moderate' | 'severe';
  score: number; // 0-100
  evidence: string[];
}

export interface GottmanResult {
  horsemen: HorsemanResult[];
  activeCount: number;
  riskLevel: string;
}

/**
 * Derive Gottman Four Horsemen from CPS results + quantitative data.
 *
 * Mapping:
 * - Criticism ← CPS Control & Perfectionism + Self-Focused Communication
 * - Contempt ← CPS Manipulation & Low Empathy + high reaction imbalance
 * - Defensiveness ← CPS Passive Aggression + CPS Suspicion & Distrust
 * - Stonewalling ← CPS Intimacy Avoidance + CPS Emotional Distance + ghost risk
 */
export function computeGottmanHorsemen(
  cps?: CPSResult,
  quant?: QuantitativeAnalysis,
): GottmanResult | undefined {
  if (!cps) return undefined;

  // CPS stores results as patterns: Record<string, CPSPatternResult>
  // Each pattern has yesCount and total
  const get = (key: string): number => {
    const p = cps.patterns[key];
    if (!p) return 0;
    return p.total > 0 ? (p.yesCount / p.total) * 100 : 0;
  };

  // Ghost risk as additional signal for stonewalling
  const maxGhostRisk = quant?.viralScores?.ghostRisk
    ? Math.max(...Object.values(quant.viralScores.ghostRisk).map(g => g.score))
    : 0;

  // Response asymmetry signal for contempt
  const names = quant ? Object.keys(quant.perPerson) : [];
  const responseAsymmetry = names.length >= 2
    ? Math.abs(
        (quant!.timing.perPerson[names[0]]?.medianResponseTimeMs ?? 0) -
        (quant!.timing.perPerson[names[1]]?.medianResponseTimeMs ?? 0),
      ) / 60_000 // in minutes
    : 0;

  // --- Criticism ---
  const criticismScore = Math.min(100, Math.round(
    get('control_perfectionism') * 0.6 + get('self_focused') * 0.4,
  ));
  const criticismEvidence: string[] = [];
  if (get('control_perfectionism') > 50) criticismEvidence.push('Wysoki wzorzec kontroli i perfekcjonizmu');
  if (get('self_focused') > 50) criticismEvidence.push('Egocentryczny styl komunikacji');

  // --- Contempt ---
  const contemptBase = get('manipulation_low_empathy') * 0.5 + get('dramatization') * 0.3;
  const contemptAsymmetryBoost = Math.min(20, responseAsymmetry / 5);
  const contemptScore = Math.min(100, Math.round(contemptBase + contemptAsymmetryBoost));
  const contemptEvidence: string[] = [];
  if (get('manipulation_low_empathy') > 50) contemptEvidence.push('Wzorce instrumentalnej komunikacji i niskiej empatii');
  if (responseAsymmetry > 30) contemptEvidence.push(`Asymetria odpowiedzi: ${Math.round(responseAsymmetry)} min`);

  // --- Defensiveness ---
  const defensivenessScore = Math.min(100, Math.round(
    get('passive_aggression') * 0.5 + get('suspicion_distrust') * 0.5,
  ));
  const defensivenessEvidence: string[] = [];
  if (get('passive_aggression') > 50) defensivenessEvidence.push('Bierno-agresywne wzorce komunikacji');
  if (get('suspicion_distrust') > 50) defensivenessEvidence.push('Podejrzliwość i brak zaufania');

  // --- Stonewalling ---
  const stonewallingBase = get('intimacy_avoidance') * 0.4 + get('emotional_distance') * 0.4;
  const stonewallingGhostBoost = maxGhostRisk * 0.2;
  const stonewallingScore = Math.min(100, Math.round(stonewallingBase + stonewallingGhostBoost));
  const stonewallingEvidence: string[] = [];
  if (get('intimacy_avoidance') > 50) stonewallingEvidence.push('Unikanie intymności');
  if (get('emotional_distance') > 50) stonewallingEvidence.push('Dystans emocjonalny');
  if (maxGhostRisk > 50) stonewallingEvidence.push(`Ghost Risk: ${Math.round(maxGhostRisk)}%`);

  function getSeverity(score: number): HorsemanResult['severity'] {
    if (score >= 70) return 'severe';
    if (score >= 45) return 'moderate';
    if (score >= 25) return 'mild';
    return 'none';
  }

  const horsemen: HorsemanResult[] = [
    {
      id: 'criticism',
      label: 'Krytycyzm',
      emoji: '⚔️',
      present: criticismScore >= 25,
      severity: getSeverity(criticismScore),
      score: criticismScore,
      evidence: criticismEvidence,
    },
    {
      id: 'contempt',
      label: 'Pogarda',
      emoji: '🗡️',
      present: contemptScore >= 25,
      severity: getSeverity(contemptScore),
      score: contemptScore,
      evidence: contemptEvidence,
    },
    {
      id: 'defensiveness',
      label: 'Defensywność',
      emoji: '🛡️',
      present: defensivenessScore >= 25,
      severity: getSeverity(defensivenessScore),
      score: defensivenessScore,
      evidence: defensivenessEvidence,
    },
    {
      id: 'stonewalling',
      label: 'Stonewalling',
      emoji: '🧱',
      present: stonewallingScore >= 25,
      severity: getSeverity(stonewallingScore),
      score: stonewallingScore,
      evidence: stonewallingEvidence,
    },
  ];

  const activeCount = horsemen.filter(h => h.present).length;

  let riskLevel: string;
  if (activeCount >= 4) riskLevel = 'Krytyczny — wszystkie 4 jeźdźce aktywne';
  else if (activeCount >= 3) riskLevel = 'Wysoki — 3 z 4 jeźdźców aktywne';
  else if (activeCount >= 2) riskLevel = 'Podwyższony — 2 jeźdźce aktywne';
  else if (activeCount >= 1) riskLevel = 'Umiarkowany — 1 jeździec aktywny';
  else riskLevel = 'Niski — brak aktywnych jeźdźców';

  return { horsemen, activeCount, riskLevel };
}

export const GOTTMAN_DISCLAIMER =
  'Ta analiza mapuje wzorce komunikacyjne na koncepty Gottmana w sposób heurystyczny, ' +
  'nie metodą obserwacyjną (SPAFF). Wyniki mają charakter orientacyjny, nie diagnostyczny.';
