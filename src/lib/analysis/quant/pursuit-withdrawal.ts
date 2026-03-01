/**
 * Pursuit-Withdrawal Detection — identifies cyclical patterns where
 * one person sends multiple unanswered messages (pursuit) followed
 * by extended silence from the other (withdrawal).
 *
 * Pure quantitative analysis — no AI needed.
 *
 * Demand marker content analysis (added in Faza 33):
 * Timing-only detection causes false positives — 4 consecutive excited
 * messages about a fun topic look identical to 4 desperate "are you there?"
 * messages. To fix this, we check whether any message in a burst contains
 * a demand marker (e.g. "halo?", "odpowiedz", "??", "are you there").
 *
 * Gating logic:
 *   - 6+ consecutive messages → always flagged (that many unanswered
 *     messages is pursuit regardless of content)
 *   - 4-5 consecutive messages → only flagged if at least one message
 *     in the burst contains a demand marker
 *
 * This significantly reduces false positives for normal rapid chatting
 * while preserving detection of genuine pursuit behavior.
 */

import type { UnifiedMessage } from '../../parsers/types';
import type { PursuitWithdrawalAnalysis, PursuitWithdrawalCycle } from '../../parsers/types';
import { ENTER_AS_COMMA_MS } from '../constants';

// ────────────────────────────────────────────────────────────────
// Demand markers — phrases that indicate the sender is actively
// seeking a response, not just chatting enthusiastically.
// Bilingual (PL + EN) to match the project's dual-language support.
// ────────────────────────────────────────────────────────────────

const DEMAND_MARKERS_PL: readonly string[] = [
  'dlaczego nie odpisujesz',
  'czemu nie odpisujesz',
  'halo',
  'halo?',
  'hej?',
  'odpowiedz',
  'odpisz',
  'no odpisz',
  'jesteś tam',
  'jesteś tam?',
  'ej',
  'ej?',
  'no hej',
  'napisz coś',
  'czekam',
];

const DEMAND_MARKERS_EN: readonly string[] = [
  'hello?',
  'are you there',
  'why aren\'t you responding',
  'answer me',
  'respond',
  'hey?',
  'you there?',
];

// Punctuation-only demand patterns (language-agnostic)
const DEMAND_MARKERS_PUNCTUATION: readonly string[] = [
  '??',
  '???',
  '????',
];

/**
 * Check whether a message's content contains any demand marker.
 * Normalized to lowercase for case-insensitive matching.
 * Punctuation-only markers use exact match (after trim) to avoid
 * false positives from question marks inside normal sentences.
 */
export function containsDemandMarker(content: string): boolean {
  if (!content) return false;
  const lower = content.toLowerCase().trim();
  if (!lower) return false;

  // Punctuation-only markers: the entire message (trimmed) must be
  // just question marks to count — avoids matching "what??" in a sentence
  for (const marker of DEMAND_MARKERS_PUNCTUATION) {
    if (lower === marker) return true;
  }

  // Text markers: substring match (e.g. "hej, odpisz mi" contains "odpisz")
  for (const marker of DEMAND_MARKERS_PL) {
    if (lower.includes(marker)) return true;
  }
  for (const marker of DEMAND_MARKERS_EN) {
    if (lower.includes(marker)) return true;
  }

  return false;
}

/** Minimum consecutive messages to always flag as pursuit (no demand marker needed) */
const ALWAYS_FLAG_THRESHOLD = 6;

// Re-export the types so consumers can import from here
export type { PursuitWithdrawalAnalysis, PursuitWithdrawalCycle };

/**
 * Detect pursuit-withdrawal cycles from message patterns.
 *
 * A cycle is defined as:
 *   1. Pursuit: 3+ consecutive messages from the same person within 30-minute windows
 *   2. Withdrawal: the next response arrives after a 2+ hour silence
 *
 * @returns Analysis result, or undefined if fewer than 2 cycles detected
 */
export function detectPursuitWithdrawal(
  messages: UnifiedMessage[],
  participantNames: string[],
): PursuitWithdrawalAnalysis | undefined {
  if (participantNames.length < 2 || messages.length < 50) return undefined;

  const cycles: PursuitWithdrawalCycle[] = [];
  // Track which sender triggered each pursuit for role assignment
  const pursuitSenders: string[] = [];

  const PURSUIT_WINDOW_MS = 30 * 60 * 1000; // 30 minutes between consecutive messages
  const WITHDRAWAL_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours of silence (2h gaps are normal: lunch, meetings, commute)
  const MIN_CONSECUTIVE = 4; // minimum messages to count as pursuit (3 is normal message-splitting)

  /** Returns true if this gap is plausibly just sleep/routine.
   *  Extended window 21:00–09:00 accounts for timezone uncertainty.
   *  Gaps >12h always suppressed regardless of hour — could be day off. */
  function isOvernightGap(startTs: number, gapMs: number): boolean {
    if (gapMs > 12 * 3600_000) return true; // >12h — always suppress (could be day off, not withdrawal)
    const hour = new Date(startTs).getHours();
    return hour >= 21 || hour < 9;
  }

  let i = 0;
  while (i < messages.length) {
    const sender = messages[i].sender;
    let logicalMessageCount = 0; // counts logical messages (Enter-as-comma consolidated)
    let lastLogicalTimestamp = 0; // timestamp of last logical message boundary
    const pursuitStart = messages[i].timestamp;
    const burstStartIdx = i; // track burst range for demand marker check

    // Count consecutive messages from the same person within the pursuit window.
    // Enter-as-comma: messages within ENTER_AS_COMMA_MS of each other count as
    // ONE logical message (sender uses Enter as punctuation, not as separate thoughts).
    while (
      i < messages.length &&
      messages[i].sender === sender &&
      (logicalMessageCount === 0 ||
        messages[i].timestamp - messages[i - 1].timestamp < PURSUIT_WINDOW_MS)
    ) {
      // Only count as a new logical message if >2min since previous same-sender msg
      if (logicalMessageCount === 0 || messages[i].timestamp - lastLogicalTimestamp > ENTER_AS_COMMA_MS) {
        logicalMessageCount++;
        lastLogicalTimestamp = messages[i].timestamp;
      }
      i++;
    }

    const burstEndIdx = i; // exclusive end of the burst

    // Only count as pursuit if MIN_CONSECUTIVE logical messages without reply
    if (logicalMessageCount >= MIN_CONSECUTIVE && i < messages.length) {
      const nextMsg = messages[i];
      const silenceDuration = nextMsg.timestamp - messages[i - 1].timestamp;

      // Withdrawal = next message takes >4h to arrive AND gap is not just overnight sleep
      if (silenceDuration >= WITHDRAWAL_THRESHOLD_MS && !isOvernightGap(messages[i - 1].timestamp, silenceDuration)) {

        // Demand marker gating: for borderline bursts (4-5 messages), require
        // at least one message to contain a demand marker. This prevents
        // flagging enthusiastic chatting (e.g. sharing links, reacting to news)
        // as pursuit. Bursts of 6+ are always flagged — that volume of
        // unanswered messages is pursuit behavior regardless of content.
        const needsDemandCheck = logicalMessageCount < ALWAYS_FLAG_THRESHOLD;
        let hasDemandContent = false;

        if (needsDemandCheck) {
          for (let j = burstStartIdx; j < burstEndIdx; j++) {
            if (containsDemandMarker(messages[j].content)) {
              hasDemandContent = true;
              break;
            }
          }
        }

        if (!needsDemandCheck || hasDemandContent) {
          cycles.push({
            pursuitTimestamp: pursuitStart,
            withdrawalDurationMs: silenceDuration,
            pursuitMessageCount: logicalMessageCount,
            // Resolved if the other person eventually replies (not the pursuer talking to themselves again)
            resolved: nextMsg.sender !== sender,
          });
          pursuitSenders.push(sender);
        }
      }
    }

    // Prevent infinite loop when logicalMessageCount is 0 (system messages etc.)
    if (logicalMessageCount === 0) i++;
  }

  // Need at least 2 cycles for a meaningful pattern
  if (cycles.length < 2) return undefined;

  // Determine who is the pursuer vs withdrawer by counting pursuit bursts per sender
  const pursuitBySender: Record<string, number> = {};
  for (const name of participantNames) pursuitBySender[name] = 0;

  for (const sender of pursuitSenders) {
    pursuitBySender[sender] = (pursuitBySender[sender] ?? 0) + 1;
  }

  const sorted = Object.entries(pursuitBySender).sort((a, b) => b[1] - a[1]);
  const topCount = sorted[0]?.[1] ?? 0;
  const bottomCount = sorted.length > 1 ? sorted[sorted.length - 1][1] : 0;
  // If difference < 20% of total cycles, roles are ambiguous — label as "mutual"
  // Raised from 10% to reduce false labeling in near-symmetric patterns
  const isBalanced = cycles.length > 0 && (topCount - bottomCount) / cycles.length < 0.2;
  const pursuer = isBalanced ? 'mutual' : (sorted[0]?.[0] ?? participantNames[0]);
  const withdrawer = isBalanced ? 'mutual' : (sorted.length > 1 ? sorted[sorted.length - 1][0] : participantNames[1]);

  // Average withdrawal duration across all cycles
  const avgCycleDurationMs =
    cycles.reduce((sum, c) => sum + c.withdrawalDurationMs, 0) / cycles.length;

  // Escalation trend: compare first-half average duration vs second-half
  // Positive = cycles getting longer (escalating), negative = improving
  const mid = Math.floor(cycles.length / 2);
  const firstHalfAvg =
    cycles.slice(0, mid).reduce((sum, c) => sum + c.withdrawalDurationMs, 0) /
    Math.max(mid, 1);
  const secondHalfAvg =
    cycles.slice(mid).reduce((sum, c) => sum + c.withdrawalDurationMs, 0) /
    Math.max(cycles.length - mid, 1);
  const escalationTrend = firstHalfAvg > 0 ? secondHalfAvg / firstHalfAvg - 1 : 0;

  return {
    pursuer,
    withdrawer,
    cycleCount: cycles.length,
    avgCycleDurationMs,
    escalationTrend,
    cycles,
  };
}
