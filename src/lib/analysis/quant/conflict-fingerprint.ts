/**
 * Conflict Fingerprint — per-person conflict behavior profiling.
 *
 * Extracts behavioral patterns from detected conflict windows:
 * escalation style, de-escalation style, burst patterns, vocabulary shifts,
 * timing changes, and interruption rates.
 *
 * Uses existing detectConflicts() events to identify conflict windows
 * (±30 messages around each ConflictEvent), then compares in-conflict
 * behavior against baseline conversation metrics.
 */

import type { UnifiedMessage } from '../../parsers/types';
import type { ConflictEvent } from './conflicts';
import { countWords, tokenizeWords } from './helpers';

// ============================================================
// Types
// ============================================================

export type EscalationStyle = 'direct_attack' | 'passive_aggressive' | 'silent_withdrawal' | 'mixed';
export type DeescalationStyle = 'apologize' | 'deflect' | 'ghost' | 'topic_change' | 'humor';

export interface PersonConflictProfile {
  escalationStyle: EscalationStyle;
  deescalationStyle: DeescalationStyle;
  /** Average consecutive messages before other person replies (in conflict) */
  avgBurstLengthInConflict: number;
  /** Baseline burst length in normal conversation */
  avgBurstLengthNormal: number;
  /** >1 = writes MORE in conflict, <1 = terse */
  msgLengthRatioConflictVsNormal: number;
  /** Difference from normal response time (negative = faster in conflict) */
  responseTimeShiftMs: number;
  /** Double-texts per 100 messages during conflict */
  doubleTextRateInConflict: number;
  /** Rate at which this person breaks into the other's burst */
  interruptionRate: number;
  /** Top 20 words used disproportionately during conflicts vs normal */
  conflictVocabulary: string[];
  /** Average number of messages until conflict resolves/ends */
  avgConflictDurationMessages: number;
  /** Percentage of conflicts this person initiated (sent first escalation message) */
  conflictInitiationRate: number;
}

export interface ConflictFingerprintResult {
  perPerson: Record<string, PersonConflictProfile>;
  totalConflictWindows: number;
  avgConflictDurationMs: number;
  /** Words appearing disproportionately before escalations */
  topConflictTriggerWords: string[];
  /** False if <3 conflict events detected — results are extrapolated */
  hasEnoughData: boolean;
}

// ============================================================
// Constants
// ============================================================

/** Messages before/after a conflict event to include in the window */
const CONFLICT_WINDOW_PADDING = 30;
/** Minimum conflict events to produce high-confidence results */
const MIN_CONFLICT_EVENTS = 3;
/** Session gap for computing response times */
const SESSION_GAP_MS = 6 * 60 * 60 * 1000;
/** Silence threshold during conversation (not cross-session) */
const MID_CONVERSATION_SILENCE_MS = 2 * 60 * 60 * 1000;

// Passive aggression markers (Polish + English)
const PASSIVE_AGGRESSION_PL = [
  'ok', 'okej', 'no dobra', 'jak chcesz', 'nie ważne', 'nieważne', 'spoko',
  'rób co chcesz', 'dobra', 'aha', 'mhm', 'no ok', 'jak tam chcesz',
  'whatever', 'fine', 'sure', 'okay', 'k', 'nvm',
];

// Apology markers
const APOLOGY_PL = [
  'przepraszam', 'sorry', 'sorki', 'sory', 'moja wina', 'nie chciałem',
  'nie chciałam', 'wybacz', 'przesadziłem', 'przesadziłam', 'masz rację',
];

// Humor/deflection markers
const HUMOR_MARKERS = ['xd', 'xdd', 'xddd', 'haha', 'hahaha', '😂', '🤣', 'lol', 'lmao'];

// Topic change markers
const TOPIC_CHANGE_PL = [
  'a tak w ogóle', 'swoją drogą', 'zmieniając temat', 'btw', 'a propos',
  'nie o tym', 'wracając do', 'anyway',
];

// ============================================================
// Internal helpers
// ============================================================

/** Extract conflict windows from events — merge overlapping windows */
function extractConflictWindows(
  events: ConflictEvent[],
  totalMessages: number,
): Array<[number, number]> {
  // Only use escalation and cold_silence events (not resolutions)
  const conflictEvents = events.filter(e => e.type === 'escalation' || e.type === 'cold_silence');
  if (conflictEvents.length === 0) return [];

  const rawWindows = conflictEvents.map(e => [
    Math.max(0, e.messageRange[0] - CONFLICT_WINDOW_PADDING),
    Math.min(totalMessages - 1, e.messageRange[1] + CONFLICT_WINDOW_PADDING),
  ] as [number, number]);

  // Merge overlapping windows
  rawWindows.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [rawWindows[0]];
  for (let i = 1; i < rawWindows.length; i++) {
    const last = merged[merged.length - 1];
    if (rawWindows[i][0] <= last[1]) {
      last[1] = Math.max(last[1], rawWindows[i][1]);
    } else {
      merged.push(rawWindows[i]);
    }
  }
  return merged;
}

/** Check if a message index falls within any conflict window */
function isInConflictWindow(index: number, windows: Array<[number, number]>): boolean {
  for (const [start, end] of windows) {
    if (index >= start && index <= end) return true;
    if (index < start) break; // windows are sorted
  }
  return false;
}

/** Count consecutive messages from the same sender starting at an index */
function measureBurstAt(messages: UnifiedMessage[], startIdx: number): number {
  const sender = messages[startIdx].sender;
  let count = 1;
  for (let i = startIdx + 1; i < messages.length; i++) {
    if (messages[i].sender !== sender) break;
    count++;
  }
  return count;
}

/** Compute per-person burst lengths within given message indices */
function computeBurstStats(
  messages: UnifiedMessage[],
  indices: number[],
  personName: string,
): { avgBurstLength: number; doubleTextRate: number } {
  if (indices.length === 0) return { avgBurstLength: 1, doubleTextRate: 0 };

  const bursts: number[] = [];
  let doubleTexts = 0;
  let i = 0;

  while (i < indices.length) {
    const idx = indices[i];
    if (messages[idx].sender !== personName) { i++; continue; }

    let burstLen = 1;
    let j = i + 1;
    while (j < indices.length) {
      const nextIdx = indices[j];
      if (messages[nextIdx].sender !== personName) break;
      // Only count as same burst if indices are consecutive
      if (nextIdx !== indices[j - 1] + 1) break;
      burstLen++;
      j++;
    }
    bursts.push(burstLen);
    if (burstLen >= 2) doubleTexts++;
    i = j;
  }

  const avgBurstLength = bursts.length > 0
    ? bursts.reduce((sum, b) => sum + b, 0) / bursts.length
    : 1;

  const personMsgCount = indices.filter(idx => messages[idx].sender === personName).length;
  const doubleTextRate = personMsgCount > 0 ? (doubleTexts / personMsgCount) * 100 : 0;

  return { avgBurstLength, doubleTextRate };
}

/** Compute average word count for a person's messages within given indices */
function avgWordCount(
  messages: UnifiedMessage[],
  indices: number[],
  personName: string,
): number {
  let totalWords = 0;
  let count = 0;
  for (const idx of indices) {
    if (messages[idx].sender !== personName) continue;
    const words = countWords(messages[idx].content);
    if (words > 0) {
      totalWords += words;
      count++;
    }
  }
  return count > 0 ? totalWords / count : 0;
}

/** Compute average response time for a person within given indices */
function avgResponseTime(
  messages: UnifiedMessage[],
  indices: number[],
  personName: string,
): number {
  const rts: number[] = [];
  for (let i = 1; i < indices.length; i++) {
    const curr = messages[indices[i]];
    const prev = messages[indices[i - 1]];
    if (curr.sender === personName && prev.sender !== personName) {
      const gap = curr.timestamp - prev.timestamp;
      if (gap > 0 && gap < SESSION_GAP_MS) {
        rts.push(gap);
      }
    }
  }
  return rts.length > 0 ? rts.reduce((a, b) => a + b, 0) / rts.length : 0;
}

/** Count interruptions — person sends message while other person is mid-burst */
function countInterruptions(
  messages: UnifiedMessage[],
  indices: number[],
  personName: string,
): number {
  let interruptions = 0;
  let currentBurstSender: string | null = null;
  let burstLength = 0;

  for (const idx of indices) {
    const sender = messages[idx].sender;
    if (sender === currentBurstSender) {
      burstLength++;
    } else {
      // Sender changed — check if this is an interruption (other person was mid-burst with 2+ messages)
      if (sender === personName && currentBurstSender !== null && burstLength >= 2) {
        interruptions++;
      }
      currentBurstSender = sender;
      burstLength = 1;
    }
  }
  return interruptions;
}

/** Build TF-IDF-like scores comparing conflict vocabulary vs normal */
function extractConflictVocabulary(
  messages: UnifiedMessage[],
  conflictIndices: number[],
  normalIndices: number[],
  personName: string,
): string[] {
  const conflictFreq = new Map<string, number>();
  const normalFreq = new Map<string, number>();
  let conflictTotal = 0;
  let normalTotal = 0;

  for (const idx of conflictIndices) {
    if (messages[idx].sender !== personName) continue;
    const words = tokenizeWords(messages[idx].content);
    for (const w of words) {
      conflictFreq.set(w, (conflictFreq.get(w) ?? 0) + 1);
      conflictTotal++;
    }
  }

  for (const idx of normalIndices) {
    if (messages[idx].sender !== personName) continue;
    const words = tokenizeWords(messages[idx].content);
    for (const w of words) {
      normalFreq.set(w, (normalFreq.get(w) ?? 0) + 1);
      normalTotal++;
    }
  }

  if (conflictTotal === 0) return [];

  // Score each word by (conflictRate / normalRate) ratio
  const scores: Array<{ word: string; score: number }> = [];
  for (const [word, count] of conflictFreq) {
    if (count < 2) continue; // Need at least 2 occurrences
    const conflictRate = count / conflictTotal;
    const normalCount = normalFreq.get(word) ?? 0;
    const normalRate = normalTotal > 0 ? (normalCount + 0.5) / normalTotal : 0.001;
    const ratio = conflictRate / normalRate;
    if (ratio > 2) { // Word appears 2x+ more often in conflicts
      scores.push({ word, score: ratio });
    }
  }

  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(s => s.word);
}

/** Classify escalation style from behavioral metrics */
function classifyEscalationStyle(
  lengthRatio: number,
  burstLength: number,
  passiveAggressionRate: number,
  silenceRate: number,
): EscalationStyle {
  // Count how many styles are indicated
  const directScore = (lengthRatio > 1.3 ? 1 : 0) + (burstLength > 3 ? 1 : 0);
  const passiveScore = passiveAggressionRate > 0.15 ? 2 : passiveAggressionRate > 0.05 ? 1 : 0;
  const silentScore = silenceRate > 0.3 ? 2 : silenceRate > 0.15 ? 1 : 0;

  const max = Math.max(directScore, passiveScore, silentScore);
  if (max === 0) return 'mixed';
  if (directScore === passiveScore || directScore === silentScore || passiveScore === silentScore) return 'mixed';
  if (directScore === max) return 'direct_attack';
  if (passiveScore === max) return 'passive_aggressive';
  return 'silent_withdrawal';
}

/** Classify de-escalation style from message content patterns */
function classifyDeescalationStyle(
  messages: UnifiedMessage[],
  conflictEndIndices: number[],
  personName: string,
): DeescalationStyle {
  let apologies = 0;
  let humor = 0;
  let topicChanges = 0;
  let ghosted = 0;
  let total = 0;

  for (const endIdx of conflictEndIndices) {
    // Look at the last 5 messages from this person before conflict ends
    const lookback = 5;
    let found = false;
    for (let i = endIdx; i >= Math.max(0, endIdx - 15); i--) {
      if (messages[i].sender !== personName) continue;
      const lower = messages[i].content.toLowerCase();

      if (APOLOGY_PL.some(a => lower.includes(a))) { apologies++; found = true; break; }
      if (HUMOR_MARKERS.some(h => lower.includes(h))) { humor++; found = true; break; }
      if (TOPIC_CHANGE_PL.some(t => lower.includes(t))) { topicChanges++; found = true; break; }

      if (--total >= lookback) break;
    }
    if (!found) ghosted++;
    total++;
  }

  if (total === 0) return 'deflect';

  const max = Math.max(apologies, humor, topicChanges, ghosted);
  if (max === apologies) return 'apologize';
  if (max === humor) return 'humor';
  if (max === topicChanges) return 'topic_change';
  if (max === ghosted) return 'ghost';
  return 'deflect';
}

// ============================================================
// Public API
// ============================================================

/**
 * Compute per-person conflict behavior fingerprints.
 *
 * Uses conflict events from detectConflicts() to identify conflict windows,
 * then compares in-conflict behavior against baseline conversation metrics.
 */
export function computeConflictFingerprint(
  messages: UnifiedMessage[],
  participantNames: string[],
  conflictEvents: ConflictEvent[],
): ConflictFingerprintResult | undefined {
  if (messages.length < 50 || participantNames.length < 2) return undefined;

  const windows = extractConflictWindows(conflictEvents, messages.length);
  const hasEnoughData = conflictEvents.filter(e => e.type !== 'resolution').length >= MIN_CONFLICT_EVENTS;

  // Build conflict vs normal index sets
  const conflictIndicesSet = new Set<number>();
  for (const [start, end] of windows) {
    for (let i = start; i <= end; i++) {
      conflictIndicesSet.add(i);
    }
  }
  const conflictIndices = [...conflictIndicesSet].sort((a, b) => a - b);
  const normalIndices = Array.from({ length: messages.length }, (_, i) => i)
    .filter(i => !conflictIndicesSet.has(i));

  // If no conflicts at all, build minimal extrapolated fingerprint
  if (windows.length === 0) {
    const perPerson: Record<string, PersonConflictProfile> = {};
    for (const name of participantNames) {
      const allIndices = Array.from({ length: messages.length }, (_, i) => i);
      const { avgBurstLength } = computeBurstStats(messages, allIndices, name);
      const avgLen = avgWordCount(messages, allIndices, name);

      perPerson[name] = {
        escalationStyle: 'mixed',
        deescalationStyle: 'deflect',
        avgBurstLengthInConflict: avgBurstLength,
        avgBurstLengthNormal: avgBurstLength,
        msgLengthRatioConflictVsNormal: 1,
        responseTimeShiftMs: 0,
        doubleTextRateInConflict: 0,
        interruptionRate: 0,
        conflictVocabulary: [],
        avgConflictDurationMessages: 0,
        conflictInitiationRate: 50,
      };
    }
    return {
      perPerson,
      totalConflictWindows: 0,
      avgConflictDurationMs: 0,
      topConflictTriggerWords: [],
      hasEnoughData: false,
    };
  }

  // Compute per-person profiles
  const perPerson: Record<string, PersonConflictProfile> = {};

  // Conflict end indices for de-escalation classification
  const conflictEndIndices = windows.map(([, end]) => end);

  // Compute average conflict duration in ms
  const conflictDurationsMs: number[] = [];
  for (const [start, end] of windows) {
    if (end > start) {
      conflictDurationsMs.push(messages[end].timestamp - messages[start].timestamp);
    }
  }
  const avgConflictDurationMs = conflictDurationsMs.length > 0
    ? conflictDurationsMs.reduce((a, b) => a + b, 0) / conflictDurationsMs.length
    : 0;

  // Track who initiated each conflict (first message in escalation event)
  const initiationCounts = new Map<string, number>();
  for (const event of conflictEvents) {
    if (event.type !== 'escalation') continue;
    const firstMsg = messages[event.messageRange[0]];
    if (firstMsg) {
      initiationCounts.set(firstMsg.sender, (initiationCounts.get(firstMsg.sender) ?? 0) + 1);
    }
  }
  const totalInitiations = [...initiationCounts.values()].reduce((a, b) => a + b, 0);

  for (const name of participantNames) {
    // Burst stats in conflict vs normal
    const conflictBurst = computeBurstStats(messages, conflictIndices, name);
    const normalBurst = computeBurstStats(messages, normalIndices, name);

    // Message length ratio
    const conflictAvgLen = avgWordCount(messages, conflictIndices, name);
    const normalAvgLen = avgWordCount(messages, normalIndices, name);
    const msgLengthRatio = normalAvgLen > 0 ? conflictAvgLen / normalAvgLen : 1;

    // Response time shift
    const conflictRT = avgResponseTime(messages, conflictIndices, name);
    const normalRT = avgResponseTime(messages, normalIndices, name);
    const rtShift = conflictRT - normalRT;

    // Interruptions
    const totalConflictMsgs = conflictIndices.filter(i => messages[i].sender === name).length;
    const interruptions = countInterruptions(messages, conflictIndices, name);
    const interruptionRate = totalConflictMsgs > 0 ? interruptions / totalConflictMsgs : 0;

    // Conflict vocabulary
    const vocabulary = extractConflictVocabulary(messages, conflictIndices, normalIndices, name);

    // Passive aggression rate in conflict
    let paCount = 0;
    for (const idx of conflictIndices) {
      if (messages[idx].sender !== name) continue;
      const lower = messages[idx].content.toLowerCase();
      if (PASSIVE_AGGRESSION_PL.some(pa => lower === pa || lower.startsWith(pa + ' '))) paCount++;
    }
    const paRate = totalConflictMsgs > 0 ? paCount / totalConflictMsgs : 0;

    // Silence rate: how often this person stops responding during conflict
    let silenceCount = 0;
    for (const [start, end] of windows) {
      let lastFromPerson = -1;
      for (let i = start; i <= end; i++) {
        if (messages[i].sender === name) lastFromPerson = i;
      }
      // If person stops sending well before window ends
      if (lastFromPerson >= 0 && lastFromPerson < end - 5) {
        const gapAfter = messages[end].timestamp - messages[lastFromPerson].timestamp;
        if (gapAfter > MID_CONVERSATION_SILENCE_MS) silenceCount++;
      }
    }
    const silenceRate = windows.length > 0 ? silenceCount / windows.length : 0;

    // Conflict duration in messages
    const avgDurationMsgs = windows.length > 0
      ? windows.reduce((sum, [s, e]) => sum + (e - s + 1), 0) / windows.length
      : 0;

    // Initiation rate
    const personInitiations = initiationCounts.get(name) ?? 0;
    const initiationRate = totalInitiations > 0
      ? (personInitiations / totalInitiations) * 100
      : 50;

    perPerson[name] = {
      escalationStyle: classifyEscalationStyle(msgLengthRatio, conflictBurst.avgBurstLength, paRate, silenceRate),
      deescalationStyle: classifyDeescalationStyle(messages, conflictEndIndices, name),
      avgBurstLengthInConflict: Math.round(conflictBurst.avgBurstLength * 10) / 10,
      avgBurstLengthNormal: Math.round(normalBurst.avgBurstLength * 10) / 10,
      msgLengthRatioConflictVsNormal: Math.round(msgLengthRatio * 100) / 100,
      responseTimeShiftMs: Math.round(rtShift),
      doubleTextRateInConflict: Math.round(conflictBurst.doubleTextRate * 10) / 10,
      interruptionRate: Math.round(interruptionRate * 100) / 100,
      conflictVocabulary: vocabulary,
      avgConflictDurationMessages: Math.round(avgDurationMsgs),
      conflictInitiationRate: Math.round(initiationRate),
    };
  }

  // Top conflict trigger words (words appearing in 10 messages before escalations)
  const triggerWordFreq = new Map<string, number>();
  for (const event of conflictEvents) {
    if (event.type !== 'escalation') continue;
    const lookback = Math.max(0, event.messageRange[0] - 10);
    for (let i = lookback; i < event.messageRange[0]; i++) {
      const words = tokenizeWords(messages[i].content);
      for (const w of words) {
        triggerWordFreq.set(w, (triggerWordFreq.get(w) ?? 0) + 1);
      }
    }
  }
  const topConflictTriggerWords = [...triggerWordFreq.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);

  return {
    perPerson,
    totalConflictWindows: windows.length,
    avgConflictDurationMs: Math.round(avgConflictDurationMs),
    topConflictTriggerWords,
    hasEnoughData,
  };
}
