/**
 * Badge / achievement computation for PodTeksT Phase 6A.
 *
 * Awards fun badges to participants based on their messaging patterns.
 * All badge names and evidence strings are in Polish.
 */

import type {
  ParsedConversation,
  Badge,
  PersonMetrics,
  TimingMetrics,
  EngagementMetrics,
  PatternMetrics,
  HeatmapData,
  TrendData,
} from '../parsers/types';

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

/**
 * Given a map of name -> numeric value, return the name with the
 * highest value (or undefined if empty / all zero).
 */
function findWinner(
  values: Record<string, number>,
): { name: string; value: number } | undefined {
  let best: { name: string; value: number } | undefined;
  for (const [name, value] of Object.entries(values)) {
    if (!Number.isFinite(value)) continue;
    if (value <= 0) continue;
    if (!best || value > best.value) {
      best = { name, value };
    }
  }
  return best;
}

/**
 * Given a map of name -> numeric value, return the name with the
 * lowest positive value (for "fastest" type badges).
 */
function findLowest(
  values: Record<string, number>,
): { name: string; value: number } | undefined {
  let best: { name: string; value: number } | undefined;
  for (const [name, value] of Object.entries(values)) {
    if (!Number.isFinite(value) || value <= 0) continue;
    if (!best || value < best.value) {
      best = { name, value };
    }
  }
  return best;
}

/** Format milliseconds to a human-readable Polish duration string. */
function formatDurationMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  return `${days} dni`;
}

/** Format days count for the silence badge. */
function formatSilenceDays(ms: number): string {
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  if (days === 0) {
    const hours = Math.round(ms / (1000 * 60 * 60));
    return `${hours} godzin`;
  }
  return `${days} dni`;
}

// ============================================================
// Streak Computation
// ============================================================

/**
 * Compute the longest streak of consecutive days with at least one
 * message per person. Uses the conversation messages directly.
 */
function computeStreaks(
  conversation: ParsedConversation,
): Record<string, number> {
  // Collect the set of unique days each person sent messages
  const daysPerPerson = new Map<string, Set<string>>();

  for (const msg of conversation.messages) {
    if (!daysPerPerson.has(msg.sender)) {
      daysPerPerson.set(msg.sender, new Set());
    }
    const dayKey = new Date(msg.timestamp).toISOString().slice(0, 10);
    daysPerPerson.get(msg.sender)!.add(dayKey);
  }

  const streaks: Record<string, number> = {};

  for (const [name, daySet] of daysPerPerson) {
    const sortedDays = [...daySet].sort();
    if (sortedDays.length === 0) {
      streaks[name] = 0;
      continue;
    }

    let maxStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < sortedDays.length; i++) {
      const prevDate = new Date(sortedDays[i - 1] + 'T00:00:00Z');
      const currDate = new Date(sortedDays[i] + 'T00:00:00Z');
      const diffDays =
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

      if (Math.round(diffDays) === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    streaks[name] = maxStreak;
  }

  return streaks;
}

// ============================================================
// Main Export
// ============================================================

export function computeBadges(
  quantitative: QuantitativeInput,
  conversation: ParsedConversation,
): Badge[] {
  const badges: Badge[] = [];
  const names = conversation.participants.map((p) => p.name);
  const { perPerson, timing, engagement, heatmap } = quantitative;

  // ── 1. Night Owl — "Nocny Marek" ────────────────────────
  {
    const lateNightPct: Record<string, number> = {};
    for (const name of names) {
      const total = perPerson[name]?.totalMessages ?? 0;
      const lateNight = timing.lateNightMessages[name] ?? 0;
      lateNightPct[name] = total > 0 ? (lateNight / total) * 100 : 0;
    }
    const winner = findWinner(lateNightPct);
    if (winner && winner.value > 0) {
      badges.push({
        id: 'night-owl',
        name: 'Nocny Marek',
        emoji: '\u{1F989}',
        description: 'Najwyższy % wiadomości wysłanych między 22:00 a 4:00',
        holder: winner.name,
        evidence: `${winner.value.toFixed(1)}% wiadomości po 22:00`,
      });
    }
  }

  // ── 2. Early Bird — "Ranny Ptaszek" ─────────────────────
  {
    const earlyBirdPct: Record<string, number> = {};
    for (const name of names) {
      const total = perPerson[name]?.totalMessages ?? 0;
      let earlyCount = 0;
      const matrix = heatmap.perPerson[name];
      if (matrix) {
        for (let day = 0; day < 7; day++) {
          for (let hour = 0; hour < 8; hour++) {
            earlyCount += matrix[day][hour];
          }
        }
      }
      earlyBirdPct[name] = total > 0 ? (earlyCount / total) * 100 : 0;
    }
    const winner = findWinner(earlyBirdPct);
    if (winner && winner.value > 0) {
      badges.push({
        id: 'early-bird',
        name: 'Ranny Ptaszek',
        emoji: '\u{1F426}',
        description: 'Najwyższy % wiadomości wysłanych przed 8:00',
        holder: winner.name,
        evidence: `${winner.value.toFixed(1)}% wiadomości przed 8:00`,
      });
    }
  }

  // ── 3. Ghost Champion — "Ghosting Champion" ──────────────
  {
    const silence = timing.longestSilence;
    if (silence.durationMs > 0 && silence.lastSender) {
      badges.push({
        id: 'ghost-champion',
        name: 'Ghosting Champion',
        emoji: '\u{1F47B}',
        description: 'Wysłał(a) ostatnią wiadomość przed najdłuższą ciszą',
        holder: silence.lastSender,
        evidence: `Cisza trwała ${formatSilenceDays(silence.durationMs)}`,
      });
    }
  }

  // ── 4. Double Texter ─────────────────────────────────────
  {
    const winner = findWinner(engagement.doubleTexts);
    if (winner && winner.value > 0) {
      badges.push({
        id: 'double-texter',
        name: 'Double Texter',
        emoji: '\u{1F4AC}',
        description: 'Najczęściej pisał(a) wielokrotnie bez odpowiedzi',
        holder: winner.name,
        evidence: `${winner.value} razy pisał(a) bez odpowiedzi`,
      });
    }
  }

  // ── 5. Novelist — "Powieściopisarz" ──────────────────────
  {
    const avgLengths: Record<string, number> = {};
    for (const name of names) {
      avgLengths[name] = perPerson[name]?.averageMessageLength ?? 0;
    }
    const winner = findWinner(avgLengths);
    if (winner && winner.value > 0) {
      badges.push({
        id: 'novelist',
        name: 'Powieściopisarz',
        emoji: '\u{1F4D6}',
        description: 'Najwyższa średnia długość wiadomości',
        holder: winner.name,
        evidence: `Średnio ${winner.value.toFixed(1)} słów/wiadomość`,
      });
    }
  }

  // ── 6. Speed Demon ───────────────────────────────────────
  {
    const medianRts: Record<string, number> = {};
    for (const name of names) {
      medianRts[name] = timing.perPerson[name]?.medianResponseTimeMs ?? 0;
    }
    const winner = findLowest(medianRts);
    if (winner && winner.value > 0) {
      badges.push({
        id: 'speed-demon',
        name: 'Speed Demon',
        emoji: '\u{26A1}',
        description: 'Najszybsza mediana czasu odpowiedzi',
        holder: winner.name,
        evidence: `Mediana odpowiedzi: ${formatDurationMs(winner.value)}`,
      });
    }
  }

  // ── 7. Emoji Monarch — "Emoji King/Queen" ────────────────
  {
    const emojiRates: Record<string, number> = {};
    for (const name of names) {
      const total = perPerson[name]?.totalMessages ?? 0;
      const emojiCount = perPerson[name]?.emojiCount ?? 0;
      emojiRates[name] = total > 0 ? emojiCount / total : 0;
    }
    const winner = findWinner(emojiRates);
    if (winner && winner.value > 0) {
      badges.push({
        id: 'emoji-monarch',
        name: 'Emoji King/Queen',
        emoji: '\u{1F602}',
        description: 'Najwyższy stosunek emoji na wiadomość',
        holder: winner.name,
        evidence: `${winner.value.toFixed(2)} emoji na wiadomość`,
      });
    }
  }

  // ── 8. Initiator — "Inicjator" ──────────────────────────
  {
    const totalInitiations = Object.values(timing.conversationInitiations).reduce(
      (a, b) => a + b,
      0,
    );
    const winner = findWinner(timing.conversationInitiations);
    if (winner && winner.value > 0 && totalInitiations > 0) {
      const pct = (winner.value / totalInitiations) * 100;
      badges.push({
        id: 'initiator',
        name: 'Inicjator',
        emoji: '\u{1F501}',
        description: 'Najczęściej rozpoczynał(a) rozmowy',
        holder: winner.name,
        evidence: `Rozpoczął(ęła) ${pct.toFixed(0)}% rozmów`,
      });
    }
  }

  // ── 9. Heart Bomber (skip for Discord — reactionsGiven is always 0) ──
  {
    const hasReactionData = names.some((n) => (perPerson[n]?.topReactionsGiven ?? []).length > 0);
    if (hasReactionData) {
      const heartCounts: Record<string, number> = {};
      for (const name of names) {
        const reactions = perPerson[name]?.topReactionsGiven ?? [];
        let hearts = 0;
        for (const reaction of reactions) {
          if (/\u2764|\u{1F493}|\u{1F496}|\u{1F497}|\u{1F498}|\u{1F499}|\u{1F49A}|\u{1F49B}|\u{1F49C}|\u{1F5A4}|\u{1F90D}|\u{1F90E}|\u{1FA77}|\u{2763}|\u{1F9E1}/u.test(reaction.emoji)) {
            hearts += reaction.count;
          }
        }
        heartCounts[name] = hearts;
      }
      const winner = findWinner(heartCounts);
      if (winner && winner.value > 0) {
        badges.push({
          id: 'heart-bomber',
          name: 'Heart Bomber',
          emoji: '\u{2764}\u{FE0F}',
          description: 'Najwięcej reakcji serduszkowych',
          holder: winner.name,
          evidence: `${winner.value} reakcji \u{2764}\u{FE0F}`,
        });
      }
    }
  }

  // ── 10. Link Lord ────────────────────────────────────────
  {
    const linkCounts: Record<string, number> = {};
    for (const name of names) {
      linkCounts[name] = perPerson[name]?.linksShared ?? 0;
    }
    const winner = findWinner(linkCounts);
    if (winner && winner.value > 0) {
      badges.push({
        id: 'link-lord',
        name: 'Link Lord',
        emoji: '\u{1F4CE}',
        description: 'Najwięcej udostępnionych linków',
        holder: winner.name,
        evidence: `${winner.value} udostępnionych linków`,
      });
    }
  }

  // ── 11. Streak Master ────────────────────────────────────
  {
    const streaks = computeStreaks(conversation);
    const winner = findWinner(streaks);
    if (winner && winner.value > 1) {
      badges.push({
        id: 'streak-master',
        name: 'Streak Master',
        emoji: '\u{1F525}',
        description: 'Najdłuższa seria dni z rzędu z wiadomościami',
        holder: winner.name,
        evidence: `${winner.value} dni z rzędu`,
      });
    }
  }

  // ── 12. Question Master — "Detektyw" ─────────────────────
  {
    const questionCounts: Record<string, number> = {};
    for (const name of names) {
      questionCounts[name] = perPerson[name]?.questionsAsked ?? 0;
    }
    const winner = findWinner(questionCounts);
    if (winner && winner.value > 0) {
      badges.push({
        id: 'question-master',
        name: 'Detektyw',
        emoji: '\u{1F50D}',
        description: 'Najwięcej zadanych pytań',
        holder: winner.name,
        evidence: `Zadał(a) ${winner.value} pytań`,
      });
    }
  }

  // ── 13. Mention Magnet — "Magnes na @" (Discord) ────────
  {
    const mentionCounts: Record<string, number> = {};
    for (const name of names) {
      mentionCounts[name] = perPerson[name]?.mentionsReceived ?? 0;
    }
    const winner = findWinner(mentionCounts);
    if (winner && winner.value > 5) {
      badges.push({
        id: 'mention-magnet',
        name: 'Magnes na @',
        emoji: '\u{1F4E2}',
        description: 'Najczęściej wspominany (@) przez innych',
        holder: winner.name,
        evidence: `${winner.value} wzmianek`,
      });
    }
  }

  // ── 14. Reply King — "Król odpowiedzi" (Discord) ────────
  {
    const replyCounts: Record<string, number> = {};
    for (const name of names) {
      replyCounts[name] = perPerson[name]?.repliesSent ?? 0;
    }
    const winner = findWinner(replyCounts);
    if (winner && winner.value > 10) {
      badges.push({
        id: 'reply-king',
        name: 'Król odpowiedzi',
        emoji: '\u{21A9}\u{FE0F}',
        description: 'Najczęściej odpowiadał(a) na wiadomości (reply)',
        holder: winner.name,
        evidence: `${winner.value} odpowiedzi`,
      });
    }
  }

  // ── 15. Edit Lord — "Perfekcjonista" (Discord) ──────────
  {
    const editCounts: Record<string, number> = {};
    for (const name of names) {
      editCounts[name] = perPerson[name]?.editedMessages ?? 0;
    }
    const winner = findWinner(editCounts);
    if (winner && winner.value > 5) {
      badges.push({
        id: 'edit-lord',
        name: 'Perfekcjonista',
        emoji: '\u{270F}\u{FE0F}',
        description: 'Najczęściej edytował(a) swoje wiadomości',
        holder: winner.name,
        evidence: `${winner.value} edytowanych wiadomości`,
      });
    }
  }

  return badges;
}
