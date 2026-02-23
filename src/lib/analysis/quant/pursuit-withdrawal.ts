/**
 * Pursuit-Withdrawal Detection — identifies cyclical patterns where
 * one person sends multiple unanswered messages (pursuit) followed
 * by extended silence from the other (withdrawal).
 *
 * Pure quantitative analysis — no AI needed.
 */

import type { UnifiedMessage } from '../../parsers/types';
import type { PursuitWithdrawalAnalysis, PursuitWithdrawalCycle } from '../../parsers/types';

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

  let i = 0;
  while (i < messages.length) {
    const sender = messages[i].sender;
    let consecutiveCount = 0;
    const pursuitStart = messages[i].timestamp;

    // Count consecutive messages from the same person within the pursuit window
    while (
      i < messages.length &&
      messages[i].sender === sender &&
      (consecutiveCount === 0 ||
        messages[i].timestamp - messages[i - 1].timestamp < PURSUIT_WINDOW_MS)
    ) {
      consecutiveCount++;
      i++;
    }

    // Only count as pursuit if 3+ messages without reply
    if (consecutiveCount >= MIN_CONSECUTIVE && i < messages.length) {
      const nextMsg = messages[i];
      const silenceDuration = nextMsg.timestamp - messages[i - 1].timestamp;

      // Withdrawal = next message takes >2h to arrive
      if (silenceDuration > WITHDRAWAL_THRESHOLD_MS) {
        cycles.push({
          pursuitTimestamp: pursuitStart,
          withdrawalDurationMs: silenceDuration,
          pursuitMessageCount: consecutiveCount,
          // Resolved if the other person eventually replies (not the pursuer talking to themselves again)
          resolved: nextMsg.sender !== sender,
        });
        pursuitSenders.push(sender);
      }
    }

    // Prevent infinite loop when consecutiveCount is 0 (system messages etc.)
    if (consecutiveCount === 0) i++;
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
  // If difference < 10% of total cycles, roles are ambiguous — label as "mutual"
  const isBalanced = cycles.length > 0 && (topCount - bottomCount) / cycles.length < 0.1;
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
