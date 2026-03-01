/**
 * Qualitative analysis module for PodTeksT.
 * Client-safe: handles message sampling and context building.
 * Server-side Gemini API logic is in gemini.ts.
 */

import type {
  ParsedConversation,
  QuantitativeAnalysis,
  UnifiedMessage,
  Participant,
} from '../parsers/types';
import { formatDuration } from './quant/response-time-engine';

// ============================================================
// Public types
// ============================================================

export interface SimplifiedMessage {
  sender: string;
  content: string;
  timestamp: number;
  index: number;
}

export interface AnalysisSamples {
  overview: SimplifiedMessage[];
  dynamics: SimplifiedMessage[];
  perPerson: Record<string, SimplifiedMessage[]>;
  quantitativeContext: string;
}

// ============================================================
// Helpers
// ============================================================

function toSimplified(msg: UnifiedMessage): SimplifiedMessage {
  return {
    sender: msg.sender,
    content: msg.content,
    timestamp: msg.timestamp,
    index: msg.index,
  };
}

/** Returns true if the message is eligible for sampling (has text content, not a call/system/unsent) */
function isEligible(msg: UnifiedMessage): boolean {
  if (msg.type === 'call' || msg.type === 'system' || msg.type === 'unsent') return false;
  if (!msg.content || msg.content.trim().length === 0) return false;
  if (msg.isUnsent) return false;
  return true;
}

/** Group messages by month key (YYYY-MM) */
function groupByMonth(messages: SimplifiedMessage[]): Map<string, SimplifiedMessage[]> {
  const groups = new Map<string, SimplifiedMessage[]>();
  for (const msg of messages) {
    const date = new Date(msg.timestamp);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(msg);
    } else {
      groups.set(key, [msg]);
    }
  }
  return groups;
}

/** Deterministic-ish random sample from an array (Fisher-Yates partial shuffle) */
function randomSample<T>(arr: T[], count: number): T[] {
  if (count >= arr.length) return [...arr];
  const copy = [...arr];
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(Math.random() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

/**
 * Stratified sample: groups by month, weights recent months more heavily.
 * Recent = last 25% of the time range. Gets 60% of the budget.
 */
function stratifiedSample(
  messages: SimplifiedMessage[],
  target: number,
): SimplifiedMessage[] {
  if (messages.length <= target) return [...messages];

  const byMonth = groupByMonth(messages);
  const monthKeys = [...byMonth.keys()].sort();

  if (monthKeys.length === 0) return [];

  // Split into old (first 75%) and recent (last 25%)
  const recentCutoff = Math.max(1, Math.ceil(monthKeys.length * 0.75));
  const oldMonths = monthKeys.slice(0, recentCutoff);
  const recentMonths = monthKeys.slice(recentCutoff);

  // If all months fall into "old" (only 1-3 months total), treat them all as recent
  const hasRecentBucket = recentMonths.length > 0;

  const oldBudget = hasRecentBucket ? Math.floor(target * 0.4) : target;
  const recentBudget = hasRecentBucket ? target - oldBudget : 0;

  const result: SimplifiedMessage[] = [];

  // Sample from old months
  if (oldMonths.length > 0 && oldBudget > 0) {
    const perMonth = Math.max(1, Math.floor(oldBudget / oldMonths.length));
    for (const key of oldMonths) {
      const bucket = byMonth.get(key);
      if (bucket) {
        result.push(...randomSample(bucket, perMonth));
      }
    }
  }

  // Sample from recent months
  if (recentMonths.length > 0 && recentBudget > 0) {
    const perMonth = Math.max(1, Math.floor(recentBudget / recentMonths.length));
    for (const key of recentMonths) {
      const bucket = byMonth.get(key);
      if (bucket) {
        result.push(...randomSample(bucket, perMonth));
      }
    }
  }

  // If we haven't hit the target due to rounding, top up from the full set
  if (result.length < target) {
    const resultIndices = new Set(result.map(m => m.index));
    const remaining = messages.filter(m => !resultIndices.has(m.index));
    const topUp = randomSample(remaining, target - result.length);
    result.push(...topUp);
  }

  // Trim if we went over (due to small buckets getting minimum 1 each)
  const trimmed = result.length > target ? result.slice(0, target) : result;

  // Sort chronologically
  return trimmed.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Sample messages around inflection points:
 * - Messages with reactions
 * - Messages near long silences (>48h gaps)
 * - Messages near volume inflection points (>30% change month over month)
 * - Longest messages (high signal density)
 */
function inflectionSample(
  messages: SimplifiedMessage[],
  allMessages: UnifiedMessage[],
  quantitative: QuantitativeAnalysis,
  target: number,
): SimplifiedMessage[] {
  const candidates = new Set<number>();

  // Messages with reactions (emotionally significant)
  for (const msg of allMessages) {
    if (msg.reactions.length > 0 && isEligible(msg)) {
      candidates.add(msg.index);
    }
  }

  // Messages near long silences (>48h gaps)
  const GAP_THRESHOLD_MS = 48 * 60 * 60 * 1000;
  for (let i = 1; i < allMessages.length; i++) {
    const gap = allMessages[i].timestamp - allMessages[i - 1].timestamp;
    if (gap > GAP_THRESHOLD_MS) {
      // Add messages around the gap (3 before, 3 after)
      for (let j = Math.max(0, i - 3); j <= Math.min(allMessages.length - 1, i + 2); j++) {
        if (isEligible(allMessages[j])) {
          candidates.add(allMessages[j].index);
        }
      }
    }
  }

  // Messages near monthly volume inflection points (>30% change)
  const monthlyVolume = quantitative.patterns.monthlyVolume;
  const inflectionMonths = new Set<string>();
  for (let i = 1; i < monthlyVolume.length; i++) {
    const prev = monthlyVolume[i - 1].total;
    const curr = monthlyVolume[i].total;
    if (prev > 0) {
      const changeRatio = Math.abs(curr - prev) / prev;
      if (changeRatio > 0.3) {
        inflectionMonths.add(monthlyVolume[i].month);
      }
    }
  }

  for (const msg of allMessages) {
    if (!isEligible(msg)) continue;
    const date = new Date(msg.timestamp);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (inflectionMonths.has(monthKey)) {
      candidates.add(msg.index);
    }
  }

  // Longest messages (high signal density) — top 5% by word count
  const eligibleByLength = allMessages
    .filter(isEligible)
    .sort((a, b) => b.content.split(/\s+/).length - a.content.split(/\s+/).length);
  const topCount = Math.max(10, Math.ceil(eligibleByLength.length * 0.05));
  for (let i = 0; i < Math.min(topCount, eligibleByLength.length); i++) {
    candidates.add(eligibleByLength[i].index);
  }

  // Build the simplified message list from candidates
  const indexToMessage = new Map<number, SimplifiedMessage>();
  for (const msg of messages) {
    indexToMessage.set(msg.index, msg);
  }

  // Also build from allMessages for candidates not already in simplified set
  for (const msg of allMessages) {
    if (candidates.has(msg.index) && !indexToMessage.has(msg.index) && isEligible(msg)) {
      indexToMessage.set(msg.index, toSimplified(msg));
    }
  }

  const candidateMessages = [...candidates]
    .filter(idx => indexToMessage.has(idx))
    .map(idx => indexToMessage.get(idx)!);

  if (candidateMessages.length <= target) {
    return candidateMessages.sort((a, b) => a.timestamp - b.timestamp);
  }

  return randomSample(candidateMessages, target).sort((a, b) => a.timestamp - b.timestamp);
}

// ============================================================
// Public: Sampling (client-side)
// ============================================================

/**
 * Sample messages from a conversation for AI analysis.
 * Used client-side before sending to the API.
 */
export function sampleMessages(
  conversation: ParsedConversation,
  quantitative: QuantitativeAnalysis,
): AnalysisSamples {
  const eligible = conversation.messages.filter(isEligible).map(toSimplified);

  if (eligible.length < 10) {
    throw new Error('Za mało wiadomości do analizy AI — potrzeba minimum 10 wiadomości z treścią.');
  }

  // Overview: 250 messages, stratified by month, 60% weight on recent 25%
  const overview = stratifiedSample(eligible, 250);

  // Dynamics: 200 messages around inflection points
  const dynamics = inflectionSample(eligible, conversation.messages, quantitative, 200);

  // Per person: 150 per participant, stratified
  // For large groups (8+), only profile top 8 participants by message count
  // to keep payload size and Gemini API call count manageable
  const MAX_PROFILED_PARTICIPANTS = 8;
  const participantsToProfile = conversation.participants.length > MAX_PROFILED_PARTICIPANTS
    ? [...conversation.participants]
        .sort((a, b) => (quantitative.perPerson[b.name]?.totalMessages ?? 0) - (quantitative.perPerson[a.name]?.totalMessages ?? 0))
        .slice(0, MAX_PROFILED_PARTICIPANTS)
    : conversation.participants;

  const perPerson: Record<string, SimplifiedMessage[]> = {};
  for (const participant of participantsToProfile) {
    const personMessages = eligible.filter(m => m.sender === participant.name);
    perPerson[participant.name] = stratifiedSample(personMessages, 150);
  }

  const quantitativeContext = buildQuantitativeContext(quantitative, conversation.participants);

  return {
    overview,
    dynamics,
    perPerson,
    quantitativeContext,
  };
}

// ============================================================
// Public: Context builders
// ============================================================

/**
 * Build a text summary of quantitative metrics for Claude context.
 */
export function buildQuantitativeContext(
  quantitative: QuantitativeAnalysis,
  participants: Participant[],
): string {
  const lines: string[] = ['QUANTITATIVE METRICS SUMMARY:', ''];
  const names = participants.map(p => p.name);

  // Current date — temporal anchor for AI reasoning about recency and time gaps
  const now = new Date();
  lines.push(`CURRENT DATE: ${now.toISOString().split('T')[0]} (${now.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })})`);

  // Date range — derived from monthly volume, critical for AI to generate correct dates
  const monthlyVolume = quantitative.patterns.monthlyVolume;
  if (monthlyVolume.length > 0) {
    const firstMonth = monthlyVolume[0].month;
    const lastMonth = monthlyVolume[monthlyVolume.length - 1].month;
    lines.push(`CONVERSATION DATE RANGE: ${firstMonth} to ${lastMonth}`);
    const lastDate = new Date(lastMonth + '-01');
    const monthsSinceEnd = Math.max(0, Math.round((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
    if (monthsSinceEnd > 0) {
      lines.push(`TIME SINCE LAST MESSAGE: ~${monthsSinceEnd} months ago`);
    }
    lines.push('IMPORTANT: All inflection_points approximate_date values MUST fall within this date range. Do NOT generate dates outside this range.');
    lines.push('');
  }

  // Monthly volume breakdown — helps AI place events in time
  if (monthlyVolume.length > 0) {
    lines.push('MONTHLY MESSAGE VOLUME:');
    for (const mv of monthlyVolume) {
      lines.push(`  ${mv.month}: ${mv.total} messages`);
    }
    lines.push('');
  }

  // Volume
  lines.push('MESSAGE VOLUME:');
  for (const name of names) {
    const pm = quantitative.perPerson[name];
    if (pm) {
      lines.push(
        `  ${name}: ${pm.totalMessages} messages, ${pm.totalWords} words, avg ${pm.averageMessageLength.toFixed(1)} words/msg`,
      );
    }
  }

  // Ratios
  lines.push('');
  lines.push('MESSAGE RATIO:');
  for (const name of names) {
    const ratio = quantitative.engagement.messageRatio[name];
    if (ratio !== undefined) {
      lines.push(`  ${name}: ${(ratio * 100).toFixed(1)}%`);
    }
  }

  // Timing
  lines.push('');
  lines.push('RESPONSE TIMES:');
  for (const name of names) {
    const timing = quantitative.timing.perPerson[name];
    if (timing) {
      const medianMs = timing.medianResponseTimeMs;
      const timeStr = medianMs < 60_000
        ? `${Math.round(medianMs / 1_000)}s`
        : medianMs < 3_600_000
          ? `${Math.round(medianMs / 60_000)} min`
          : `${(medianMs / 3_600_000).toFixed(1)}h`;
      lines.push(`  ${name}: median ${timeStr} (avg ${Math.round(timing.averageResponseTimeMs / 1_000)}s)`);
    }
  }

  // Professional RT Engine context (turn-based, overnight-filtered)
  const rta = quantitative.responseTimeAnalysis;
  if (rta) {
    lines.push('');
    lines.push('RESPONSE TIME ENGINE (turn-based, overnight-filtered):');
    lines.push(`  Adaptive session gap: ${formatDuration(rta.adaptiveSessionGapMs)}`);
    for (const name of names) {
      const b = rta.perPerson[name];
      if (b) {
        lines.push(`  ${name}: baseline median ${formatDuration(b.median)}, RTI=${rta.rti[name]?.toFixed(1) ?? '?'}, GI=${((rta.ghostingIndex[name] ?? 0) * 100).toFixed(1)}%, IR=${((rta.initiativeRatio[name] ?? 0) * 100).toFixed(1)}%`);
      }
    }
    lines.push(`  Response Asymmetry: ${rta.responseAsymmetry.toFixed(2)} — trend: ${rta.responseAsymmetryTrend}`);

    // Monthly RTI trend
    const firstPersonWithMonthly = names.find(n => rta.monthlyRti[n]?.length > 0);
    if (firstPersonWithMonthly) {
      lines.push('  MONTHLY RTI TREND:');
      const allMonths = new Set<string>();
      for (const name of names) {
        for (const entry of rta.monthlyRti[name] ?? []) {
          allMonths.add(entry.month);
        }
      }
      const sortedMonths = [...allMonths].sort();
      for (const month of sortedMonths) {
        const parts = names.map(name => {
          const entry = rta.monthlyRti[name]?.find(e => e.month === month);
          return entry ? `${name}=${entry.rti.toFixed(1)}` : null;
        }).filter(Boolean);
        if (parts.length > 0) {
          lines.push(`    ${month}: ${parts.join(', ')}`);
        }
      }
    }

    // Anomalies
    if (rta.anomalies.length > 0) {
      lines.push('  ANOMALIES:');
      for (const a of rta.anomalies) {
        lines.push(`    - ${a.type} (${a.person ?? 'global'}): ${a.description}`);
      }
    }
  }

  // Initiations
  lines.push('');
  lines.push('CONVERSATION INITIATIONS:');
  for (const name of names) {
    const count = quantitative.timing.conversationInitiations[name];
    if (count !== undefined) {
      lines.push(`  ${name}: ${count} times`);
    }
  }

  // Double texting
  lines.push('');
  lines.push('DOUBLE TEXTING (messages without reply, >2min gap between same-sender messages):');
  lines.push('NOTE: In Polish texting culture, people use Enter as a comma — sending 5 messages in 30 seconds is ONE thought, not double-texting. These counts already filter out Enter-as-comma patterns (<2min gaps). Only count genuine "came back after silence to send more" events.');
  for (const name of names) {
    const count = quantitative.engagement.doubleTexts[name];
    if (count !== undefined) {
      lines.push(`  ${name}: ${count} times`);
    }
  }

  // Reactions
  lines.push('');
  lines.push('REACTIONS:');
  for (const name of names) {
    const pm = quantitative.perPerson[name];
    if (pm) {
      lines.push(`  ${name}: gave ${pm.reactionsGiven}, received ${pm.reactionsReceived}`);
    }
  }

  // Questions
  lines.push('');
  lines.push('QUESTIONS ASKED:');
  for (const name of names) {
    const pm = quantitative.perPerson[name];
    if (pm) {
      lines.push(`  ${name}: ${pm.questionsAsked}`);
    }
  }

  // Volume trend
  lines.push('');
  const trend = quantitative.patterns.volumeTrend;
  const trendDir = trend > 0.1 ? 'increasing' : trend < -0.1 ? 'decreasing' : 'stable';
  lines.push(`OVERALL VOLUME TREND: ${trendDir} (${trend > 0 ? '+' : ''}${trend.toFixed(2)})`);

  // Sessions
  lines.push('');
  lines.push(
    `CONVERSATION SESSIONS: ${quantitative.engagement.totalSessions} total, avg ${quantitative.engagement.avgConversationLength.toFixed(1)} messages/session`,
  );

  // Longest silence
  const silence = quantitative.timing.longestSilence;
  const silenceDays = Math.round(silence.durationMs / 86_400_000);
  lines.push('');
  lines.push(
    `LONGEST SILENCE: ${silenceDays} days (last message by ${silence.lastSender}, broken by ${silence.nextSender})`,
  );

  return lines.join('\n');
}

