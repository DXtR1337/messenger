/**
 * Behavioral Chronotype Compatibility from message timestamps.
 *
 * Derives behavioral chronotype (morning person / intermediate / night owl) from
 * the 24h distribution of message activity. Uses weighted circular midpoint as a
 * digital analog to MCTQ's midpoint-of-sleep (MSFsc).
 *
 * References:
 * - Aledavood, T. et al. (2018). Social network differences of chronotypes
 *   identified from mobile phone data. EPJ Data Science, 7(1), 1-13. N=400.
 * - Jarmolowicz, D. P. et al. (2022). Matched chronotypes and relationship
 *   satisfaction. Chronobiology International, 39(4), 566-573. F(1,58)=19.57.
 * - Alikhan, M. F. et al. (2023). Chronotype match moderates work stress recovery.
 *   J. Occupational & Organizational Psychology, 96(3), 615-633. N=79 pairs.
 */

import type { UnifiedMessage } from '../../parsers/types';

export type ChronotypeCategory = 'early_bird' | 'intermediate' | 'night_owl';
export type SocialJetLagLevel = 'none' | 'mild' | 'moderate' | 'severe';

export interface PersonChronotype {
  name: string;
  /** Hour (0-23) of peak messaging activity */
  peakHour: number;
  /** Circular weighted midpoint of 24h message distribution */
  midpoint: number;
  /** Circular midpoint computed only from weekday (Mon-Fri) messages */
  weekdayMidpoint: number;
  /** Circular midpoint computed only from weekend (Sat-Sun) messages */
  weekendMidpoint: number;
  /** |weekdayMidpoint - weekendMidpoint| in hours (Roenneberg 2012) */
  socialJetLagHours: number;
  /** Qualitative social jet lag label */
  socialJetLagLevel: SocialJetLagLevel;
  category: ChronotypeCategory;
  /** Polish label */
  label: string;
  emoji: string;
  /** Message counts per hour (0-23) */
  hourlyDistribution: number[];
}

export interface ChronotypeCompatibility {
  persons: [PersonChronotype, PersonChronotype];
  /** Circular distance between midpoints in hours */
  deltaHours: number;
  /** Compatibility score 0-100 */
  matchScore: number;
  interpretation: string;
  isCompatible: boolean;
  /** Average social jet lag across both participants (hours) */
  avgSocialJetLag?: number;
}

/** Circular weighted mean over 24 hours */
function circularMidpoint(hourlyDist: number[]): number {
  const total = hourlyDist.reduce((a, b) => a + b, 0);
  if (total === 0) return 12;
  let sinSum = 0;
  let cosSum = 0;
  for (let h = 0; h < 24; h++) {
    const angle = (h / 24) * 2 * Math.PI;
    sinSum += Math.sin(angle) * hourlyDist[h];
    cosSum += Math.cos(angle) * hourlyDist[h];
  }
  const meanAngle = Math.atan2(sinSum / total, cosSum / total);
  return Math.round(((meanAngle / (2 * Math.PI)) * 24 + 24) % 24 * 10) / 10;
}

function peakHour(hourlyDist: number[]): number {
  let max = 0;
  let peak = 12;
  for (let h = 0; h < 24; h++) {
    if (hourlyDist[h] > max) { max = hourlyDist[h]; peak = h; }
  }
  return peak;
}

function categorize(midpoint: number): { category: ChronotypeCategory; label: string; emoji: string } {
  if (midpoint < 10) return { category: 'early_bird', label: 'Ranny ptaszek', emoji: '🌅' };
  if (midpoint >= 20) return { category: 'night_owl', label: 'Nocna sowa', emoji: '🦉' };
  return { category: 'intermediate', label: 'Typ pośredni', emoji: '☀️' };
}

/** Circular delta between two 24h midpoints */
function circularDelta(a: number, b: number): number {
  const raw = Math.abs(a - b);
  return Math.min(raw, 24 - raw);
}

/**
 * Map chronotype delta (hours between midpoints) to compatibility score 0–100.
 * Heuristic step curve — Jarmolowicz (2022) found that chronotype mismatch predicts
 * lower relationship satisfaction (F(1,58)=19.57), but published no continuous
 * hour-to-score mapping. These thresholds are hand-tuned:
 *   <=1h: 95 (nearly identical rhythms)
 *   <=2h: 80 (normal variation within couples)
 *   <=3h: 60 (noticeable but manageable)
 *   <=4h: 40 (early bird vs intermediate)
 *   <=6h: 20 (significant mismatch)
 *   >6h:  5 (extreme — one sleeps while other is active)
 */
function scoreFromDelta(delta: number): number {
  if (delta <= 1) return 95;
  if (delta <= 2) return 80;
  if (delta <= 3) return 60;
  if (delta <= 4) return 40;
  if (delta <= 6) return 20;
  return 5;
}

function interpret(score: number, delta: number): string {
  const d = delta.toFixed(1);
  if (score >= 90) return `Doskonała zgodność (delta ${d}h) — podobne rytmy aktywności ułatwiają wspólny rytm relacji.`;
  if (score >= 75) return `Dobra zgodność (delta ${d}h) — rytmy nakładają się, łatwo znaleźć wspólny czas.`;
  if (score >= 55) return `Umiarkowana zgodność (delta ${d}h) — pewne różnice, ale do zaakceptowania.`;
  if (score >= 35) return `Niska zgodność (delta ${d}h) — wyraźnie różne rytmy mogą tworzyć napięcia.`;
  return `Bardzo niska zgodność (delta ${d}h) — krańcowo różne chronotypy; jeden aktywny gdy drugi odpoczywa.`;
}

function socialJetLagLevel(lagHours: number): SocialJetLagLevel {
  if (lagHours < 1) return 'none';
  if (lagHours < 2) return 'mild';
  if (lagHours < 4) return 'moderate';
  return 'severe';
}

export function computeChronotypeCompatibility(
  messages: UnifiedMessage[],
  participantNames: string[],
): ChronotypeCompatibility | undefined {
  if (participantNames.length !== 2) return undefined;

  const [nameA, nameB] = participantNames;
  const distA = new Array<number>(24).fill(0);
  const distB = new Array<number>(24).fill(0);
  const wdA = new Array<number>(24).fill(0); // weekday A
  const wdB = new Array<number>(24).fill(0); // weekday B
  const weA = new Array<number>(24).fill(0); // weekend A
  const weB = new Array<number>(24).fill(0); // weekend B

  for (const msg of messages) {
    const d = new Date(msg.timestamp);
    const h = d.getHours();
    const dow = d.getDay(); // 0=Sun, 6=Sat
    const isWE = dow === 0 || dow === 6;
    if (msg.sender === nameA) {
      distA[h]++;
      if (isWE) weA[h]++; else wdA[h]++;
    } else if (msg.sender === nameB) {
      distB[h]++;
      if (isWE) weB[h]++; else wdB[h]++;
    }
  }

  if (distA.reduce((a, b) => a + b, 0) < 20 || distB.reduce((a, b) => a + b, 0) < 20) return undefined;

  const midA = circularMidpoint(distA);
  const midB = circularMidpoint(distB);

  // Social jet lag — use overall midpoint if weekday/weekend sample too small
  const wdMidA = wdA.reduce((a, b) => a + b, 0) >= 10 ? circularMidpoint(wdA) : midA;
  const weMidA = weA.reduce((a, b) => a + b, 0) >= 10 ? circularMidpoint(weA) : midA;
  const wdMidB = wdB.reduce((a, b) => a + b, 0) >= 10 ? circularMidpoint(wdB) : midB;
  const weMidB = weB.reduce((a, b) => a + b, 0) >= 10 ? circularMidpoint(weB) : midB;

  const lagA = circularDelta(wdMidA, weMidA);
  const lagB = circularDelta(wdMidB, weMidB);
  const avgLag = Math.round(((lagA + lagB) / 2) * 10) / 10;

  const catA = categorize(midA);
  const catB = categorize(midB);
  const delta = circularDelta(midA, midB);
  const score = scoreFromDelta(delta);

  return {
    persons: [
      {
        name: nameA,
        peakHour: peakHour(distA),
        midpoint: midA,
        weekdayMidpoint: Math.round(wdMidA * 10) / 10,
        weekendMidpoint: Math.round(weMidA * 10) / 10,
        socialJetLagHours: Math.round(lagA * 10) / 10,
        socialJetLagLevel: socialJetLagLevel(lagA),
        ...catA,
        hourlyDistribution: distA,
      },
      {
        name: nameB,
        peakHour: peakHour(distB),
        midpoint: midB,
        weekdayMidpoint: Math.round(wdMidB * 10) / 10,
        weekendMidpoint: Math.round(weMidB * 10) / 10,
        socialJetLagHours: Math.round(lagB * 10) / 10,
        socialJetLagLevel: socialJetLagLevel(lagB),
        ...catB,
        hourlyDistribution: distB,
      },
    ],
    deltaHours: Math.round(delta * 10) / 10,
    matchScore: score,
    interpretation: interpret(score, delta),
    isCompatible: score >= 60,
    avgSocialJetLag: avgLag,
  };
}
