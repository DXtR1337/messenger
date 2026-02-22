/**
 * Conflict detection module for quantitative analysis.
 *
 * Detects conflict events in conversations based on three signals:
 * 1. Escalation — sudden message length increase in back-and-forth exchanges
 * 2. Cold silence — long gap after intense messaging
 * 3. Resolution — conversation resumption after cold silence
 *
 * Conservative thresholds: better to miss a conflict than false-positive
 * on normal conversation patterns.
 */

import type { UnifiedMessage } from '../../parsers/types';
import { getDayKey, countWords } from './helpers';

// ============================================================
// Types
// ============================================================

export type ConflictType = 'escalation' | 'cold_silence' | 'resolution';

export interface ConflictEvent {
  type: ConflictType;
  timestamp: number;
  /** YYYY-MM-DD */
  date: string;
  /** Involved participants */
  participants: string[];
  /** Human-readable description (Polish) */
  description: string;
  /** Severity 1-3 */
  severity: number;
  /** Related message indices (start..end) */
  messageRange: [number, number];
}

export interface ConflictAnalysis {
  events: ConflictEvent[];
  /** Total detected conflicts */
  totalConflicts: number;
  /** Most conflict-prone participant */
  mostConflictProne?: string;
}

// ============================================================
// Constants
// ============================================================

const ROLLING_WINDOW_SIZE = 10;
const ESCALATION_MULTIPLIER = 2;
/** Two spikes within this window confirm an escalation */
const ESCALATION_CONFIRM_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
/** Minimum gap between reported escalation events to avoid clustering */
const MIN_ESCALATION_GAP_MS = 4 * 60 * 60 * 1000; // 4 hours
/** Intensity threshold: messages per hour to consider "intense" */
const INTENSE_MSG_PER_HOUR = 8;
/** Minimum silence duration after intense exchange to flag */
const COLD_SILENCE_MS = 24 * 60 * 60 * 1000; // 24 hours
/** How far back to look for intensity before a silence gap */
const INTENSITY_LOOKBACK_MS = 60 * 60 * 1000; // 1 hour
/** Messages to inspect before a silence gap */
const PRE_SILENCE_MSG_COUNT = 5;

// ============================================================
// Internal helpers
// ============================================================

/** Compute rolling average word count for a person from their recent messages. */
function getRollingAverage(window: number[]): number {
  if (window.length === 0) return 0;
  return window.reduce((sum, v) => sum + v, 0) / window.length;
}

/**
 * Count messages in a time range (lookback from a given index).
 * Returns count of messages whose timestamp falls within [endTs - windowMs, endTs].
 */
function countMessagesInWindow(
  messages: UnifiedMessage[],
  endIndex: number,
  windowMs: number,
): number {
  const endTs = messages[endIndex].timestamp;
  const startTs = endTs - windowMs;
  let count = 0;
  for (let i = endIndex; i >= 0; i--) {
    if (messages[i].timestamp < startTs) break;
    count++;
  }
  return count;
}

/**
 * Check if the last N messages before an index involve back-and-forth
 * (at least 2 distinct senders).
 */
function isBackAndForth(
  messages: UnifiedMessage[],
  endIndex: number,
  count: number,
): boolean {
  const senders = new Set<string>();
  const start = Math.max(0, endIndex - count + 1);
  for (let i = start; i <= endIndex; i++) {
    senders.add(messages[i].sender);
  }
  return senders.size >= 2;
}

/** Collect unique participant names from a message range. */
function getParticipantsInRange(
  messages: UnifiedMessage[],
  start: number,
  end: number,
): string[] {
  const names = new Set<string>();
  for (let i = start; i <= end; i++) {
    names.add(messages[i].sender);
  }
  return [...names];
}

/** Format hours from milliseconds, rounded to nearest integer. */
function formatHours(ms: number): number {
  return Math.round(ms / (60 * 60 * 1000));
}

// ============================================================
// Escalation detection
// ============================================================

interface SpikeEvent {
  index: number;
  timestamp: number;
  sender: string;
}

/** Varied escalation description templates */
const ESCALATION_TEMPLATES = [
  (names: string, mult: string) => `Gorąca wymiana między ${names} — wiadomości ${mult}x dłuższe niż zwykle`,
  (names: string, mult: string) => `Napięta rozmowa ${names} — nagły skok długości wiadomości (${mult}x)`,
  (names: string, _mult: string) => `Eskalacja emocji: ${names} piszą znacznie dłuższe wiadomości`,
  (names: string, mult: string) => `Intensywna wymiana zdań — ${names} (${mult}x średniej)`,
  (names: string, _mult: string) => `Wzajemne długie odpowiedzi — ${names} wchodzą w gorącą dyskusję`,
];

function detectEscalations(messages: UnifiedMessage[]): ConflictEvent[] {
  const events: ConflictEvent[] = [];

  // Per-person rolling word count windows
  const rollingWindows = new Map<string, number[]>();

  // Track recent spike events for confirmation
  const recentSpikes: SpikeEvent[] = [];

  // Timestamp of last reported escalation — for dedup
  let lastEscalationTs = 0;
  let templateIndex = 0;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const words = countWords(msg.content);

    // Skip non-text or empty messages
    if (words === 0) continue;

    // Get or create rolling window for this sender
    if (!rollingWindows.has(msg.sender)) {
      rollingWindows.set(msg.sender, []);
    }
    const window = rollingWindows.get(msg.sender)!;

    const avg = getRollingAverage(window);

    // Check for spike: word count > 2x rolling average, must have enough history
    const isSpike =
      window.length >= 5 &&
      avg > 0 &&
      words > ESCALATION_MULTIPLIER * avg;

    // Check for back-and-forth pattern: previous message from different sender
    const prevMsg = i > 0 ? messages[i - 1] : null;
    const isBackAndForthPattern = prevMsg !== null && prevMsg.sender !== msg.sender;

    if (isSpike && isBackAndForthPattern) {
      recentSpikes.push({ index: i, timestamp: msg.timestamp, sender: msg.sender });
    }

    // Update rolling window
    window.push(words);
    if (window.length > ROLLING_WINDOW_SIZE) {
      window.shift();
    }

    // Prune old spikes outside the confirmation window
    while (
      recentSpikes.length > 0 &&
      msg.timestamp - recentSpikes[0].timestamp > ESCALATION_CONFIRM_WINDOW_MS
    ) {
      recentSpikes.shift();
    }

    // Confirm escalation: 2+ spikes from different senders within the window
    if (recentSpikes.length >= 2) {
      const spikeParticipants = new Set(recentSpikes.map((s) => s.sender));
      if (spikeParticipants.size >= 2) {
        const firstSpike = recentSpikes[0];

        // Skip if too close to last reported escalation
        if (firstSpike.timestamp - lastEscalationTs < MIN_ESCALATION_GAP_MS) {
          recentSpikes.length = 0;
          continue;
        }

        const participants = [...spikeParticipants];
        const namesStr = participants.join(' i ');
        const multiplier = avg > 0 ? (words / avg).toFixed(1) : '2';
        const template = ESCALATION_TEMPLATES[templateIndex % ESCALATION_TEMPLATES.length];
        templateIndex++;

        events.push({
          type: 'escalation',
          timestamp: firstSpike.timestamp,
          date: getDayKey(firstSpike.timestamp),
          participants,
          description: template(namesStr, multiplier),
          severity: recentSpikes.length >= 3 ? 3 : 2,
          messageRange: [firstSpike.index, i],
        });

        lastEscalationTs = firstSpike.timestamp;
        // Clear spikes after confirming to avoid duplicate events
        recentSpikes.length = 0;
      }
    }
  }

  return events;
}

// ============================================================
// Cold silence detection
// ============================================================

/** Minimum gap between cold silence events to avoid clustering */
const MIN_SILENCE_GAP_MS = 12 * 60 * 60 * 1000; // 12 hours

function formatSilenceDuration(hours: number): string {
  if (hours >= 168) return `${Math.round(hours / 24)} dni`;
  if (hours >= 48) return `${Math.round(hours / 24)} dni (${hours}h)`;
  return `${hours}h`;
}

const SILENCE_TEMPLATES = [
  (dur: string, msgCount: number) => `Zimna cisza — ${dur} bez wiadomości po ${msgCount} msg/h`,
  (dur: string, _mc: number) => `Nagłe milczenie na ${dur} po gorącej wymianie`,
  (dur: string, msgCount: number) => `Z ${msgCount} msg/h do zera — ${dur} ciszy`,
  (dur: string, _mc: number) => `Radio silence: ${dur} po intensywnej rozmowie`,
];

function detectColdSilences(messages: UnifiedMessage[]): ConflictEvent[] {
  const events: ConflictEvent[] = [];
  let lastSilenceTs = 0;
  let templateIndex = 0;

  for (let i = 1; i < messages.length; i++) {
    const gap = messages[i].timestamp - messages[i - 1].timestamp;

    // Only consider gaps > 24h
    if (gap < COLD_SILENCE_MS) continue;

    // Dedup: skip if too close to last silence
    if (messages[i - 1].timestamp - lastSilenceTs < MIN_SILENCE_GAP_MS) continue;

    // Check intensity in the hour before the silence started
    const msgCountBeforeGap = countMessagesInWindow(
      messages,
      i - 1,
      INTENSITY_LOOKBACK_MS,
    );

    // Need at least INTENSE_MSG_PER_HOUR messages in the preceding hour
    if (msgCountBeforeGap < INTENSE_MSG_PER_HOUR) continue;

    // Check that the pre-silence messages are back-and-forth (not monologue)
    if (!isBackAndForth(messages, i - 1, PRE_SILENCE_MSG_COUNT)) continue;

    const rangeStart = Math.max(0, i - PRE_SILENCE_MSG_COUNT);
    const participants = getParticipantsInRange(messages, rangeStart, i - 1);
    const hours = formatHours(gap);
    const durStr = formatSilenceDuration(hours);
    const template = SILENCE_TEMPLATES[templateIndex % SILENCE_TEMPLATES.length];
    templateIndex++;

    events.push({
      type: 'cold_silence',
      timestamp: messages[i - 1].timestamp,
      date: getDayKey(messages[i - 1].timestamp),
      participants,
      description: template(durStr, msgCountBeforeGap),
      severity: hours >= 72 ? 3 : hours >= 48 ? 2 : 1,
      messageRange: [rangeStart, i],
    });

    lastSilenceTs = messages[i - 1].timestamp;
  }

  return events;
}

// ============================================================
// Resolution detection
// ============================================================

const RESOLUTION_TEMPLATES = [
  (dur: string, who: string) => `${who} przerywa ciszę po ${dur} — spokojniejszy ton`,
  (dur: string, who: string) => `Wznowienie po ${dur} — ${who} pisze pierwszy/a`,
  (dur: string, _who: string) => `Powrót do rozmowy po ${dur} ciszy, krótsze wiadomości`,
];

function detectResolutions(
  messages: UnifiedMessage[],
  coldSilences: ConflictEvent[],
): ConflictEvent[] {
  const events: ConflictEvent[] = [];
  let templateIndex = 0;

  for (const silence of coldSilences) {
    const resumeIndex = silence.messageRange[1];

    // Need at least 5 messages after silence to assess resolution
    if (resumeIndex + 5 > messages.length) continue;

    // Compute average word count for the 5 messages before silence
    const preStart = Math.max(0, silence.messageRange[0]);
    const preEnd = silence.messageRange[1] - 1;
    let preWordSum = 0;
    let preWordCount = 0;
    for (let i = preStart; i <= preEnd; i++) {
      const w = countWords(messages[i].content);
      if (w > 0) {
        preWordSum += w;
        preWordCount++;
      }
    }
    const preAvg = preWordCount > 0 ? preWordSum / preWordCount : 0;

    // Compute average word count for the 5 messages after silence
    let postWordSum = 0;
    let postWordCount = 0;
    for (let i = resumeIndex; i < resumeIndex + 5 && i < messages.length; i++) {
      const w = countWords(messages[i].content);
      if (w > 0) {
        postWordSum += w;
        postWordCount++;
      }
    }
    const postAvg = postWordCount > 0 ? postWordSum / postWordCount : 0;

    // Resolution: post-silence messages are shorter (calmer tone)
    if (preAvg > 0 && postAvg < preAvg) {
      const gap = messages[resumeIndex].timestamp - messages[preEnd].timestamp;
      const hours = formatHours(gap);
      const durStr = formatSilenceDuration(hours);
      const firstSender = messages[resumeIndex].sender;
      const participants = getParticipantsInRange(
        messages,
        resumeIndex,
        Math.min(resumeIndex + 4, messages.length - 1),
      );

      const template = RESOLUTION_TEMPLATES[templateIndex % RESOLUTION_TEMPLATES.length];
      templateIndex++;

      events.push({
        type: 'resolution',
        timestamp: messages[resumeIndex].timestamp,
        date: getDayKey(messages[resumeIndex].timestamp),
        participants,
        description: template(durStr, firstSender),
        severity: 1,
        messageRange: [resumeIndex, Math.min(resumeIndex + 4, messages.length - 1)],
      });
    }
  }

  return events;
}

// ============================================================
// Most conflict-prone participant
// ============================================================

function findMostConflictProne(
  events: ConflictEvent[],
  participantNames: string[],
): string | undefined {
  if (events.length === 0 || participantNames.length === 0) return undefined;

  const counts = new Map<string, number>();
  for (const name of participantNames) {
    counts.set(name, 0);
  }

  for (const event of events) {
    // Weight escalations more heavily than other types
    const weight = event.type === 'escalation' ? 2 : 1;
    for (const p of event.participants) {
      counts.set(p, (counts.get(p) ?? 0) + weight);
    }
  }

  let maxName: string | undefined;
  let maxCount = 0;
  for (const [name, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      maxName = name;
    }
  }

  return maxName;
}

// ============================================================
// Public API
// ============================================================

/**
 * Detect conflict events in a conversation.
 *
 * Analyzes message patterns to identify escalations (sudden length spikes
 * in back-and-forth exchanges), cold silences (long gaps after intense
 * messaging), and resolutions (calmer resumption after silence).
 *
 * Conservative thresholds minimize false positives at the cost of
 * potentially missing subtle conflicts.
 */
export function detectConflicts(
  messages: UnifiedMessage[],
  participantNames: string[],
): ConflictAnalysis {
  const emptyResult: ConflictAnalysis = {
    events: [],
    totalConflicts: 0,
  };

  // Need a meaningful conversation to detect conflicts
  if (messages.length < 20) return emptyResult;

  const escalations = detectEscalations(messages);
  const coldSilences = detectColdSilences(messages);
  const resolutions = detectResolutions(messages, coldSilences);

  // Merge and sort all events chronologically
  const allEvents = [...escalations, ...coldSilences, ...resolutions].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  // Only count escalations and cold silences as actual conflicts
  const conflictCount = escalations.length + coldSilences.length;

  return {
    events: allEvents,
    totalConflicts: conflictCount,
    mostConflictProne: findMostConflictProne(allEvents, participantNames),
  };
}
