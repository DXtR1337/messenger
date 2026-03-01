/**
 * Professional Response Time Analysis Engine
 *
 * Turn-based, overnight-filtered, adaptive session gap detection
 * with composite indices: RTI, RA, GI, IR, EWRT.
 *
 * Based on:
 * - Templeton et al. (2022) PNAS — fast RT signals social connection
 * - Holtzman et al. (2021) JSPR — responsive texting → satisfaction
 * - Christensen & Heavey (1990) — demand/withdraw patterns
 */

import type { UnifiedMessage } from '../../parsers/types';
import { median, percentile, getMonthKey } from './helpers';

// ============================================================
// Constants
// ============================================================

/** Max gap between consecutive same-sender messages to group into one turn */
const BURST_THRESHOLD_MS = 120_000; // 2 min

/** Min adaptive gap clamp */
const MIN_SESSION_GAP_MS = 15 * 60_000; // 15 min

/** Max adaptive gap clamp */
const MAX_SESSION_GAP_MS = 2 * 60 * 60_000; // 2h

/** Default adaptive gap when insufficient data */
const DEFAULT_SESSION_GAP_MS = 30 * 60_000; // 30 min

/** Max gap to count for turn response measurement (use adaptive gap) */
const GHOSTING_WINDOW_MS = 24 * 60 * 60_000; // 24h for ghosting check

/** Sliding window size in ms */
const SLIDING_WINDOW_MS = 30 * 24 * 60 * 60_000; // 30 days

/** Sliding window step in ms */
const SLIDING_STEP_MS = 7 * 24 * 60 * 60_000; // 7 days

/** Response category thresholds in ms */
const CATEGORY_THRESHOLDS = {
  instant: 30_000,      // <30s
  quick: 2 * 60_000,    // <2min
  normal: 15 * 60_000,  // <15min
  delayed: 60 * 60_000, // <1h
  slow: 4 * 60 * 60_000, // <4h
} as const;

// ============================================================
// Types
// ============================================================

export interface Turn {
  sender: string;
  startTimestamp: number;
  endTimestamp: number;
  messageCount: number;
  totalChars: number;
  monthKey: string;
}

export type ResponseCategory =
  | 'instant'
  | 'quick'
  | 'normal'
  | 'delayed'
  | 'slow'
  | 'overnight'
  | 'ghosting';

export interface TurnResponse {
  responder: string;
  initiator: string;
  responseTimeMs: number;
  category: ResponseCategory;
  isOvernight: boolean;
  monthKey: string;
  /** Effort-weighted RT: responseTimeMs / log(1 + totalChars) */
  ewrt: number;
  responderTurn: Turn;
  initiatorTurn: Turn;
}

export interface PersonRTBaseline {
  median: number;
  p25: number;
  p75: number;
  iqr: number;
  mean: number;
  sampleSize: number;
  perHourMedian: number[];   // 24 buckets
  perDowMedian: number[];    // 7 buckets (0=Sun)
  categoryDistribution: Record<ResponseCategory, number>;
}

export interface SlidingWindowEntry {
  windowStart: number;
  windowEnd: number;
  perPerson: Record<string, {
    rti: number;
    medianRt: number;
    sampleSize: number;
  }>;
  ra: number;
  gi: Record<string, number>;
  ir: Record<string, number>;
}

export type AnomalyType =
  | 'sudden_slowdown'
  | 'gradual_withdrawal'
  | 'ghosting_spike'
  | 'initiative_collapse';

export interface RTAnomaly {
  type: AnomalyType;
  person?: string;
  windowIndex: number;
  severity: number;
  description: string;
}

export interface ResponseTimeAnalysis {
  adaptiveSessionGapMs: number;
  turns: Turn[];
  responses: TurnResponse[];
  perPerson: Record<string, PersonRTBaseline>;
  /** Response Time Index: per-person current median / baseline median */
  rti: Record<string, number>;
  /** Response Asymmetry: ratio of slower median to faster median */
  responseAsymmetry: number;
  /** RA trend direction: 'diverging' | 'converging' | 'stable' */
  responseAsymmetryTrend: 'diverging' | 'converging' | 'stable';
  /** Ghosting Index per person: fraction of turns left unanswered within 24h */
  ghostingIndex: Record<string, number>;
  /** Initiative Ratio per person: fraction of sessions initiated */
  initiativeRatio: Record<string, number>;
  /** Global EWRT per person */
  ewrt: Record<string, number>;
  /** Monthly RTI per person */
  monthlyRti: Record<string, Array<{ month: string; rti: number }>>;
  /** Monthly RA */
  monthlyRa: Array<{ month: string; ra: number }>;
  /** Sliding window analysis */
  slidingWindows: SlidingWindowEntry[];
  /** Detected anomalies */
  anomalies: RTAnomaly[];
}

// ============================================================
// Main Function
// ============================================================

export function computeResponseTimeAnalysis(
  messages: UnifiedMessage[],
  participantNames: string[],
): ResponseTimeAnalysis | undefined {
  if (messages.length < 30) return undefined;

  // 1. Adaptive session gap
  const adaptiveSessionGapMs = computeAdaptiveSessionGap(messages);

  // 2. Build turns
  const turns = buildTurns(messages);
  if (turns.length < 5) return undefined;

  // 3. Measure turn responses
  const responses = measureTurnResponses(turns, adaptiveSessionGapMs);
  if (responses.length < 10) return undefined;

  // 4. Per-person baselines
  const perPerson: Record<string, PersonRTBaseline> = {};
  for (const name of participantNames) {
    const baseline = computePersonBaseline(responses, name);
    if (baseline) {
      perPerson[name] = baseline;
    }
  }

  // Need at least 2 participants with baselines for meaningful analysis
  const baselineNames = Object.keys(perPerson);
  if (baselineNames.length < 2) return undefined;

  // 5. RTI (overall — current vs baseline = 1.0 by definition for global)
  const rti: Record<string, number> = {};
  for (const name of baselineNames) {
    rti[name] = 1.0; // Global RTI is baseline by definition
  }

  // 6. Response Asymmetry
  const medians = baselineNames.map(n => perPerson[n].median);
  const maxMedian = Math.max(...medians);
  const minMedian = Math.min(...medians);
  const responseAsymmetry = minMedian > 0 ? maxMedian / minMedian : 1;

  // 7. Monthly RTI
  const monthlyRti: Record<string, Array<{ month: string; rti: number }>> = {};
  for (const name of baselineNames) {
    monthlyRti[name] = computeMonthlyRti(responses, perPerson[name], name);
  }

  // 8. Monthly RA
  const monthlyRa = computeMonthlyRa(responses, baselineNames);

  // 9. RA trend
  const responseAsymmetryTrend = computeRaTrend(monthlyRa);

  // 10. Ghosting Index
  const ghostingIndex: Record<string, number> = {};
  for (const name of baselineNames) {
    ghostingIndex[name] = computeGhostingIndex(turns, name);
  }

  // 11. Initiative Ratio
  const initiativeRatio: Record<string, number> = {};
  for (const name of baselineNames) {
    initiativeRatio[name] = computeInitiativeRatio(turns, adaptiveSessionGapMs, name);
  }

  // 12. Global EWRT
  const ewrt: Record<string, number> = {};
  for (const name of baselineNames) {
    const personEwrt = responses
      .filter(r => r.responder === name && !r.isOvernight)
      .map(r => r.ewrt);
    ewrt[name] = personEwrt.length > 0 ? median(personEwrt) : 0;
  }

  // 13. Sliding windows
  const slidingWindows = computeSlidingWindows(
    responses, turns, adaptiveSessionGapMs, perPerson, baselineNames,
  );

  // 14. Anomalies
  const anomalies = detectAnomalies(slidingWindows, baselineNames);

  return {
    adaptiveSessionGapMs,
    turns,
    responses,
    perPerson,
    rti,
    responseAsymmetry,
    responseAsymmetryTrend,
    ghostingIndex,
    initiativeRatio,
    ewrt,
    monthlyRti,
    monthlyRa,
    slidingWindows,
    anomalies,
  };
}

// ============================================================
// Sub-algorithms
// ============================================================

/**
 * Compute adaptive session gap from message inter-arrival times.
 * Take gaps <1h, find p75, multiply by 2, clamp [15min, 2h].
 */
function computeAdaptiveSessionGap(messages: UnifiedMessage[]): number {
  if (messages.length < 2) return DEFAULT_SESSION_GAP_MS;

  const gaps: number[] = [];
  for (let i = 1; i < messages.length; i++) {
    const gap = messages[i].timestamp - messages[i - 1].timestamp;
    if (gap > 0 && gap < 3_600_000) { // <1h
      gaps.push(gap);
    }
  }

  if (gaps.length < 20) return DEFAULT_SESSION_GAP_MS;

  const sorted = [...gaps].sort((a, b) => a - b);
  const p75 = percentile(sorted, 75);
  const adaptive = p75 * 2;

  return Math.max(MIN_SESSION_GAP_MS, Math.min(MAX_SESSION_GAP_MS, adaptive));
}

/**
 * Group consecutive same-sender messages with <2min gap into turns.
 */
function buildTurns(messages: UnifiedMessage[]): Turn[] {
  if (messages.length === 0) return [];

  const turns: Turn[] = [];
  let currentTurn: Turn = {
    sender: messages[0].sender,
    startTimestamp: messages[0].timestamp,
    endTimestamp: messages[0].timestamp,
    messageCount: 1,
    totalChars: messages[0].content.length,
    monthKey: getMonthKey(messages[0].timestamp),
  };

  for (let i = 1; i < messages.length; i++) {
    const msg = messages[i];
    const gap = msg.timestamp - currentTurn.endTimestamp;
    const sameSender = msg.sender === currentTurn.sender;

    if (sameSender && gap < BURST_THRESHOLD_MS) {
      // Continue current turn
      currentTurn.endTimestamp = msg.timestamp;
      currentTurn.messageCount++;
      currentTurn.totalChars += msg.content.length;
    } else {
      // Finish current turn, start new one
      turns.push(currentTurn);
      currentTurn = {
        sender: msg.sender,
        startTimestamp: msg.timestamp,
        endTimestamp: msg.timestamp,
        messageCount: 1,
        totalChars: msg.content.length,
        monthKey: getMonthKey(msg.timestamp),
      };
    }
  }
  turns.push(currentTurn);

  return turns;
}

/**
 * Measure response times between consecutive turns by different senders.
 * Skip cross-session responses (gap > adaptiveGap).
 */
function measureTurnResponses(turns: Turn[], adaptiveGapMs: number): TurnResponse[] {
  const responses: TurnResponse[] = [];

  for (let i = 0; i < turns.length - 1; i++) {
    const prev = turns[i];
    const curr = turns[i + 1];

    // Only measure when sender changes
    if (prev.sender === curr.sender) continue;

    const rt = curr.startTimestamp - prev.endTimestamp;

    // Skip negative or zero RT
    if (rt <= 0) continue;

    const overnight = isOvernightResponse(prev, curr);

    // Skip cross-session gaps — but allow overnight responses through
    if (rt > adaptiveGapMs && !overnight) continue;

    const category = classifyResponseTime(rt, overnight);
    const ewrt = rt / Math.log(1 + Math.max(1, curr.totalChars));

    responses.push({
      responder: curr.sender,
      initiator: prev.sender,
      responseTimeMs: rt,
      category,
      isOvernight: overnight,
      monthKey: curr.monthKey,
      ewrt,
      responderTurn: curr,
      initiatorTurn: prev,
    });
  }

  return responses;
}

/**
 * Check if a response spans overnight hours.
 * Previous turn ends 21:00-03:00 AND current turn starts 06:00-12:00 AND gap 4-14h.
 */
function isOvernightResponse(prevTurn: Turn, currTurn: Turn): boolean {
  const prevHour = new Date(prevTurn.endTimestamp).getHours();
  const currHour = new Date(currTurn.startTimestamp).getHours();
  const gapMs = currTurn.startTimestamp - prevTurn.endTimestamp;
  const gapHours = gapMs / 3_600_000;

  const prevIsLateNight = prevHour >= 21 || prevHour < 3;
  const currIsMorning = currHour >= 6 && currHour < 12;

  return prevIsLateNight && currIsMorning && gapHours >= 4 && gapHours <= 14;
}

/**
 * Classify response time into a category.
 */
function classifyResponseTime(rtMs: number, isOvernight: boolean): ResponseCategory {
  if (isOvernight) return 'overnight';
  if (rtMs < CATEGORY_THRESHOLDS.instant) return 'instant';
  if (rtMs < CATEGORY_THRESHOLDS.quick) return 'quick';
  if (rtMs < CATEGORY_THRESHOLDS.normal) return 'normal';
  if (rtMs < CATEGORY_THRESHOLDS.delayed) return 'delayed';
  if (rtMs < CATEGORY_THRESHOLDS.slow) return 'slow';
  return 'ghosting';
}

/**
 * Compute per-person RT baseline from non-overnight responses.
 */
function computePersonBaseline(
  responses: TurnResponse[],
  person: string,
): PersonRTBaseline | undefined {
  const personResponses = responses.filter(
    r => r.responder === person && !r.isOvernight,
  );

  if (personResponses.length < 5) return undefined;

  const rts = personResponses.map(r => r.responseTimeMs);
  const sorted = [...rts].sort((a, b) => a - b);

  const med = median(rts);
  const p25Val = percentile(sorted, 25);
  const p75Val = percentile(sorted, 75);
  const iqr = p75Val - p25Val;
  const mean = rts.reduce((a, b) => a + b, 0) / rts.length;

  // Per-hour medians (24 buckets)
  const perHourBuckets: number[][] = Array.from({ length: 24 }, () => []);
  for (const r of personResponses) {
    const hour = new Date(r.initiatorTurn.endTimestamp).getHours();
    perHourBuckets[hour].push(r.responseTimeMs);
  }
  const perHourMedian = perHourBuckets.map(b => b.length > 0 ? median(b) : med);

  // Per-DOW medians (7 buckets, 0=Sun)
  const perDowBuckets: number[][] = Array.from({ length: 7 }, () => []);
  for (const r of personResponses) {
    const dow = new Date(r.initiatorTurn.endTimestamp).getDay();
    perDowBuckets[dow].push(r.responseTimeMs);
  }
  const perDowMedian = perDowBuckets.map(b => b.length > 0 ? median(b) : med);

  // Category distribution
  const categoryDistribution: Record<ResponseCategory, number> = {
    instant: 0, quick: 0, normal: 0, delayed: 0, slow: 0, overnight: 0, ghosting: 0,
  };
  // Count all responses (including overnight) for distribution
  const allPersonResponses = responses.filter(r => r.responder === person);
  for (const r of allPersonResponses) {
    categoryDistribution[r.category]++;
  }
  // Normalize to fractions
  const totalForDist = allPersonResponses.length;
  if (totalForDist > 0) {
    for (const cat of Object.keys(categoryDistribution) as ResponseCategory[]) {
      categoryDistribution[cat] /= totalForDist;
    }
  }

  return {
    median: med,
    p25: p25Val,
    p75: p75Val,
    iqr,
    mean,
    sampleSize: personResponses.length,
    perHourMedian,
    perDowMedian,
    categoryDistribution,
  };
}

/**
 * Compute monthly RTI for a person.
 * RTI = monthMedian / baselineMedian (1.0 = baseline, >1 = slower, <1 = faster)
 */
function computeMonthlyRti(
  responses: TurnResponse[],
  baseline: PersonRTBaseline,
  person: string,
): Array<{ month: string; rti: number }> {
  if (baseline.median === 0) return [];

  const monthMap = new Map<string, number[]>();
  for (const r of responses) {
    if (r.responder !== person || r.isOvernight) continue;
    const existing = monthMap.get(r.monthKey);
    if (existing) {
      existing.push(r.responseTimeMs);
    } else {
      monthMap.set(r.monthKey, [r.responseTimeMs]);
    }
  }

  const result: Array<{ month: string; rti: number }> = [];
  const sortedMonths = [...monthMap.keys()].sort();

  for (const month of sortedMonths) {
    const rts = monthMap.get(month)!;
    if (rts.length < 3) continue; // Skip months with too few samples
    const monthMedian = median(rts);
    result.push({ month, rti: monthMedian / baseline.median });
  }

  return result;
}

/**
 * Compute monthly Response Asymmetry between participants.
 */
function computeMonthlyRa(
  responses: TurnResponse[],
  participants: string[],
): Array<{ month: string; ra: number }> {
  if (participants.length < 2) return [];

  const monthSet = new Set<string>();
  for (const r of responses) monthSet.add(r.monthKey);
  const sortedMonths = [...monthSet].sort();

  const result: Array<{ month: string; ra: number }> = [];

  for (const month of sortedMonths) {
    const monthResponses = responses.filter(r => r.monthKey === month && !r.isOvernight);
    const medians: number[] = [];

    for (const name of participants) {
      const rts = monthResponses.filter(r => r.responder === name).map(r => r.responseTimeMs);
      if (rts.length >= 2) {
        medians.push(median(rts));
      }
    }

    if (medians.length >= 2) {
      const maxM = Math.max(...medians);
      const minM = Math.min(...medians);
      result.push({ month, ra: minM > 0 ? maxM / minM : 1 });
    }
  }

  return result;
}

/**
 * Determine RA trend from monthly RA values.
 */
function computeRaTrend(
  monthlyRa: Array<{ month: string; ra: number }>,
): 'diverging' | 'converging' | 'stable' {
  if (monthlyRa.length < 4) return 'stable';

  const halfIdx = Math.floor(monthlyRa.length / 2);
  const firstHalf = monthlyRa.slice(0, halfIdx);
  const secondHalf = monthlyRa.slice(halfIdx);

  const avgFirst = firstHalf.reduce((s, e) => s + e.ra, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((s, e) => s + e.ra, 0) / secondHalf.length;

  const delta = avgSecond - avgFirst;
  if (delta > 0.3) return 'diverging';
  if (delta < -0.3) return 'converging';
  return 'stable';
}

/**
 * Compute Ghosting Index for a person.
 * For each turn NOT by this person, check if they respond within 24h.
 * GI = unanswered / total directed at them.
 */
function computeGhostingIndex(turns: Turn[], person: string): number {
  let directedAtPerson = 0;
  let unanswered = 0;

  for (let i = 0; i < turns.length; i++) {
    // Skip turns BY this person — we want turns DIRECTED AT them
    if (turns[i].sender === person) continue;
    directedAtPerson++;

    // Look for next turn by this person
    let found = false;
    for (let j = i + 1; j < turns.length; j++) {
      if (turns[j].sender === person) {
        const gap = turns[j].startTimestamp - turns[i].endTimestamp;
        if (gap <= GHOSTING_WINDOW_MS) {
          found = true;
        }
        break; // Either found or gap too large
      }
      // If someone else responds before this person, the turn was still directed
      // at this person (they were the one being "pinged")
      if (turns[j].sender !== turns[i].sender) {
        // In multi-person chats, another person responded. Skip for 2-person.
        break;
      }
    }

    if (!found) unanswered++;
  }

  return directedAtPerson > 0 ? unanswered / directedAtPerson : 0;
}

/**
 * Compute Initiative Ratio for a person.
 * Group turns into sessions (gap > adaptiveGap = new session).
 * IR = sessions initiated by person / total sessions.
 */
function computeInitiativeRatio(
  turns: Turn[],
  adaptiveGapMs: number,
  person: string,
): number {
  if (turns.length === 0) return 0;

  let totalSessions = 1;
  let initiatedByPerson = turns[0].sender === person ? 1 : 0;

  for (let i = 1; i < turns.length; i++) {
    const gap = turns[i].startTimestamp - turns[i - 1].endTimestamp;
    if (gap > adaptiveGapMs) {
      totalSessions++;
      if (turns[i].sender === person) {
        initiatedByPerson++;
      }
    }
  }

  return totalSessions > 0 ? initiatedByPerson / totalSessions : 0;
}

/**
 * Compute sliding window analysis (30-day window, 7-day step).
 */
function computeSlidingWindows(
  responses: TurnResponse[],
  turns: Turn[],
  adaptiveGapMs: number,
  baselines: Record<string, PersonRTBaseline>,
  participants: string[],
): SlidingWindowEntry[] {
  if (responses.length === 0) return [];

  const allTimestamps = responses.map(r => r.responderTurn.startTimestamp);
  const minTs = Math.min(...allTimestamps);
  const maxTs = Math.max(...allTimestamps);

  // Need at least one full window
  if (maxTs - minTs < SLIDING_WINDOW_MS) return [];

  const windows: SlidingWindowEntry[] = [];

  for (let start = minTs; start + SLIDING_WINDOW_MS <= maxTs + SLIDING_STEP_MS; start += SLIDING_STEP_MS) {
    const end = start + SLIDING_WINDOW_MS;

    const windowResponses = responses.filter(
      r => r.responderTurn.startTimestamp >= start && r.responderTurn.startTimestamp < end,
    );

    if (windowResponses.length < 5) continue;

    const perPerson: Record<string, { rti: number; medianRt: number; sampleSize: number }> = {};
    for (const name of participants) {
      const personRts = windowResponses
        .filter(r => r.responder === name && !r.isOvernight)
        .map(r => r.responseTimeMs);

      if (personRts.length >= 3 && baselines[name]) {
        const med = median(personRts);
        perPerson[name] = {
          rti: baselines[name].median > 0 ? med / baselines[name].median : 1,
          medianRt: med,
          sampleSize: personRts.length,
        };
      }
    }

    // Window-level RA
    const windowMedians = Object.values(perPerson).map(p => p.medianRt);
    let ra = 1;
    if (windowMedians.length >= 2) {
      const maxM = Math.max(...windowMedians);
      const minM = Math.min(...windowMedians);
      ra = minM > 0 ? maxM / minM : 1;
    }

    // Window GI
    const windowTurns = turns.filter(
      t => t.startTimestamp >= start && t.startTimestamp < end,
    );
    const gi: Record<string, number> = {};
    for (const name of participants) {
      gi[name] = computeGhostingIndex(windowTurns, name);
    }

    // Window IR
    const ir: Record<string, number> = {};
    for (const name of participants) {
      ir[name] = computeInitiativeRatio(windowTurns, adaptiveGapMs, name);
    }

    windows.push({ windowStart: start, windowEnd: end, perPerson, ra, gi, ir });
  }

  return windows;
}

/**
 * Detect anomalies from sliding window data.
 */
function detectAnomalies(
  windows: SlidingWindowEntry[],
  participants: string[],
): RTAnomaly[] {
  if (windows.length < 3) return [];

  const anomalies: RTAnomaly[] = [];

  for (const name of participants) {
    // Extract RTI series for this person
    const rtiSeries: Array<{ idx: number; rti: number }> = [];
    for (let i = 0; i < windows.length; i++) {
      const pp = windows[i].perPerson[name];
      if (pp) {
        rtiSeries.push({ idx: i, rti: pp.rti });
      }
    }

    // sudden_slowdown: RTI > 2.5 in any window
    for (const entry of rtiSeries) {
      if (entry.rti > 2.5) {
        anomalies.push({
          type: 'sudden_slowdown',
          person: name,
          windowIndex: entry.idx,
          severity: Math.min(1, (entry.rti - 2.5) / 2.5),
          description: `${name}: RTI=${entry.rti.toFixed(1)} (2.5x wolniej niż baseline)`,
        });
      }
    }

    // gradual_withdrawal: RTI monotonically increasing over 3+ consecutive windows
    if (rtiSeries.length >= 3) {
      let consecutiveIncrease = 1;
      let startIdx = rtiSeries[0].idx;

      for (let i = 1; i < rtiSeries.length; i++) {
        if (rtiSeries[i].rti > rtiSeries[i - 1].rti) {
          consecutiveIncrease++;
          if (consecutiveIncrease >= 3) {
            const startRti = rtiSeries[i - consecutiveIncrease + 1].rti;
            const endRti = rtiSeries[i].rti;
            anomalies.push({
              type: 'gradual_withdrawal',
              person: name,
              windowIndex: rtiSeries[i].idx,
              severity: Math.min(1, (endRti - startRti) / 2),
              description: `${name}: RTI rośnie nieprzerwanie od ${consecutiveIncrease} okien (${startRti.toFixed(1)}→${endRti.toFixed(1)})`,
            });
          }
        } else {
          consecutiveIncrease = 1;
          startIdx = rtiSeries[i].idx;
        }
      }
    }

    // ghosting_spike: GI jumps >20pp between adjacent windows
    for (let i = 1; i < windows.length; i++) {
      const prevGi = windows[i - 1].gi[name];
      const currGi = windows[i].gi[name];
      if (prevGi !== undefined && currGi !== undefined) {
        const delta = currGi - prevGi;
        if (delta > 0.20) {
          anomalies.push({
            type: 'ghosting_spike',
            person: name,
            windowIndex: i,
            severity: Math.min(1, delta / 0.5),
            description: `${name}: GI skoczyło o ${(delta * 100).toFixed(0)}pp (${(prevGi * 100).toFixed(0)}%→${(currGi * 100).toFixed(0)}%)`,
          });
        }
      }
    }

    // initiative_collapse: IR < 0.15 for 3+ consecutive windows
    let lowIrStreak = 0;
    for (let i = 0; i < windows.length; i++) {
      const ir = windows[i].ir[name];
      if (ir !== undefined && ir < 0.15) {
        lowIrStreak++;
        if (lowIrStreak >= 3) {
          anomalies.push({
            type: 'initiative_collapse',
            person: name,
            windowIndex: i,
            severity: Math.min(1, (0.15 - ir) / 0.15),
            description: `${name}: IR < 15% przez ${lowIrStreak} kolejnych okien`,
          });
        }
      } else {
        lowIrStreak = 0;
      }
    }
  }

  return anomalies;
}

// ============================================================
// Formatting helpers (for context building)
// ============================================================

/** Format milliseconds as human-readable duration. */
export function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1_000)}s`;
  if (ms < 3_600_000) {
    const min = Math.floor(ms / 60_000);
    const sec = Math.round((ms % 60_000) / 1_000);
    return sec > 0 ? `${min}min ${sec}s` : `${min}min`;
  }
  const h = Math.floor(ms / 3_600_000);
  const min = Math.round((ms % 3_600_000) / 60_000);
  return min > 0 ? `${h}h ${min}min` : `${h}h`;
}
