/**
 * Quantitative metrics computation engine for PodTeksT.
 *
 * Computes all numerical/statistical metrics from a parsed conversation
 * without any AI involvement. Designed for a single-pass approach over
 * the messages array with O(n) complexity for the main loop.
 *
 * Performance target: <200ms for 50,000 messages.
 *
 * Submodules:
 * - quant/helpers.ts   -- utility functions (text, stats, dates, freq maps)
 * - quant/bursts.ts    -- burst detection logic
 * - quant/trends.ts    -- trend/time-series calculations
 * - quant/reciprocity.ts -- reciprocity and balance metrics
 * - quant/types.ts     -- internal accumulator types
 */

import type {
  ParsedConversation,
  UnifiedMessage,
  QuantitativeAnalysis,
  PersonMetrics,
  TimingMetrics,
  EngagementMetrics,
  PatternMetrics,
  HeatmapData,
} from '../parsers/types';
import { computeViralScores } from './viral-scores';
import { computeBadges } from './badges';
import { computeCatchphrases, computeBestTimeToText } from './catchphrases';
import { computeNetworkMetrics } from './network';
import { linearRegressionSlope } from './constants';

import {
  extractEmojis,
  countWords,
  tokenizeWords,
  median,
  filterResponseTimeOutliers,
  getMonthKey,
  getDayKey,
  isLateNight,
  isWeekend,
  topN,
  topNWords,
  topNPhrases,
  detectBursts,
  computeTrends,
  computeReciprocityIndex,
  createPersonAccumulator,
} from './quant';
import type { PersonAccumulator } from './quant';

// ============================================================
// Constants
// ============================================================

const SESSION_GAP_MS = 6 * 60 * 60 * 1000; // 6 hours

// ============================================================
// Main Computation Function
// ============================================================

export function computeQuantitativeAnalysis(
  conversation: ParsedConversation,
): QuantitativeAnalysis {
  const { messages, participants } = conversation;
  const participantNames = participants.map((p) => p.name);

  // ── Initialize per-person accumulators ──────────────────────
  const accumulators = new Map<string, PersonAccumulator>();
  for (const name of participantNames) {
    accumulators.set(name, createPersonAccumulator());
  }

  // ── Timing / session accumulators ──────────────────────────
  const conversationInitiations: Record<string, number> = {};
  const conversationEndings: Record<string, number> = {};
  const lateNightMessages: Record<string, number> = {};
  for (const name of participantNames) {
    conversationInitiations[name] = 0;
    conversationEndings[name] = 0;
    lateNightMessages[name] = 0;
  }

  let longestSilence = {
    durationMs: 0,
    startTimestamp: 0,
    endTimestamp: 0,
    lastSender: '',
    nextSender: '',
  };

  let totalSessions = 0;

  // ── Engagement accumulators ────────────────────────────────
  const doubleTexts: Record<string, number> = {};
  const maxConsecutive: Record<string, number> = {};
  for (const name of participantNames) {
    doubleTexts[name] = 0;
    maxConsecutive[name] = 0;
  }

  // ── Heatmap accumulators ───────────────────────────────────
  const heatmapPerPerson: Record<string, number[][]> = {};
  for (const name of participantNames) {
    heatmapPerPerson[name] = Array.from({ length: 7 }, () =>
      new Array<number>(24).fill(0),
    );
  }
  const heatmapCombined: number[][] = Array.from({ length: 7 }, () =>
    new Array<number>(24).fill(0),
  );

  // ── Pattern accumulators ───────────────────────────────────
  // Monthly volume: month -> perPerson counts
  const monthlyVolumeMap = new Map<string, Record<string, number>>();
  // Weekday / weekend
  const weekdayCount: Record<string, number> = {};
  const weekendCount: Record<string, number> = {};
  for (const name of participantNames) {
    weekdayCount[name] = 0;
    weekendCount[name] = 0;
  }
  // Daily counts for burst detection
  const dailyCounts = new Map<string, number>();

  // ── Trend accumulators ─────────────────────────────────────
  // Monthly initiations for trend
  const monthlyInitiations = new Map<string, Record<string, number>>();

  // ── Consecutive message tracking ───────────────────────────
  let consecutiveCount = 0;
  let consecutiveSender = '';

  // ============================================================
  // MAIN PASS: iterate over messages once
  // ============================================================

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const sender = msg.sender;

    // Ensure accumulator exists for unexpected senders (e.g. someone
    // who sent a message but isn't in the participants array)
    if (!accumulators.has(sender)) {
      accumulators.set(sender, createPersonAccumulator());
      conversationInitiations[sender] = 0;
      conversationEndings[sender] = 0;
      lateNightMessages[sender] = 0;
      doubleTexts[sender] = 0;
      maxConsecutive[sender] = 0;
      weekdayCount[sender] = 0;
      weekendCount[sender] = 0;
      heatmapPerPerson[sender] = Array.from({ length: 7 }, () =>
        new Array<number>(24).fill(0),
      );
    }

    const acc = accumulators.get(sender)!;
    const prevMsg: UnifiedMessage | undefined = i > 0 ? messages[i - 1] : undefined;
    const gap = prevMsg ? msg.timestamp - prevMsg.timestamp : 0;

    // ── Basic counts ─────────────────────────────────────────
    acc.totalMessages++;
    const wordCount = countWords(msg.content);
    acc.totalWords += wordCount;
    acc.totalCharacters += msg.content.length;

    // ── Longest / shortest message (skip empty content) ──────
    if (msg.content.trim().length > 0) {
      if (wordCount > acc.longestMessage.length) {
        acc.longestMessage = {
          content: msg.content,
          length: wordCount,
          timestamp: msg.timestamp,
        };
      }
      if (wordCount > 0 && wordCount < acc.shortestMessage.length) {
        acc.shortestMessage = {
          content: msg.content,
          length: wordCount,
          timestamp: msg.timestamp,
        };
      }
    }

    // ── Emoji tracking ───────────────────────────────────────
    const emojis = extractEmojis(msg.content);
    if (emojis.length > 0) {
      acc.messagesWithEmoji++;
      acc.emojiCount += emojis.length;
      for (const emoji of emojis) {
        acc.emojiFreq.set(emoji, (acc.emojiFreq.get(emoji) ?? 0) + 1);
      }
    }

    // ── Question detection ───────────────────────────────────
    const contentWithoutUrls = msg.content.replace(/https?:\/\/\S+/g, '');
    if (contentWithoutUrls.includes('?')) {
      acc.questionsAsked++;
    }

    // ── Word / phrase frequency ──────────────────────────────
    if (msg.content.trim().length > 0) {
      const tokens = tokenizeWords(msg.content);
      for (const word of tokens) {
        acc.wordFreq.set(word, (acc.wordFreq.get(word) ?? 0) + 1);
      }
      // Bigrams
      for (let j = 0; j < tokens.length - 1; j++) {
        const bigram = `${tokens[j]} ${tokens[j + 1]}`;
        acc.phraseFreq.set(bigram, (acc.phraseFreq.get(bigram) ?? 0) + 1);
      }
    }

    // ── Media / links / unsent ───────────────────────────────
    if (msg.hasMedia) acc.mediaShared++;
    if (msg.hasLink) acc.linksShared++;
    if (msg.isUnsent) acc.unsentMessages++;

    // ── Reactions ────────────────────────────────────────────
    // Reactions on this message: the actors gave reactions, this sender received them
    for (const reaction of msg.reactions) {
      acc.reactionsReceived++;

      // Credit the actor who gave the reaction
      const actorAcc = accumulators.get(reaction.actor);
      if (actorAcc) {
        actorAcc.reactionsGiven++;
        actorAcc.reactionsGivenFreq.set(
          reaction.emoji,
          (actorAcc.reactionsGivenFreq.get(reaction.emoji) ?? 0) + 1,
        );
      }
    }

    // ── Messages received tracking (for reaction rate) ───────
    // Every message sent by sender is "received" by all other participants
    for (const [name, otherAcc] of accumulators) {
      if (name !== sender) {
        otherAcc.messagesReceived++;
      }
    }

    // ── Session / gap detection ──────────────────────────────
    if (i === 0) {
      // First message is always a session initiation
      totalSessions = 1;
      conversationInitiations[sender]++;

      // Track monthly initiation
      const monthKey = getMonthKey(msg.timestamp);
      if (!monthlyInitiations.has(monthKey)) {
        const init: Record<string, number> = {};
        for (const name of participantNames) init[name] = 0;
        monthlyInitiations.set(monthKey, init);
      }
      const monthInit = monthlyInitiations.get(monthKey)!;
      if (!(sender in monthInit)) monthInit[sender] = 0;
      monthInit[sender]++;
    } else if (prevMsg && gap >= SESSION_GAP_MS) {
      // New session: previous message ended old session, current starts new
      totalSessions++;
      conversationEndings[prevMsg.sender]++;
      conversationInitiations[sender]++;

      // Track monthly initiation
      const monthKey = getMonthKey(msg.timestamp);
      if (!monthlyInitiations.has(monthKey)) {
        const init: Record<string, number> = {};
        for (const name of participantNames) init[name] = 0;
        monthlyInitiations.set(monthKey, init);
      }
      const monthInit = monthlyInitiations.get(monthKey)!;
      if (!(sender in monthInit)) monthInit[sender] = 0;
      monthInit[sender]++;
    }

    // ── Longest silence ──────────────────────────────────────
    if (prevMsg && gap > longestSilence.durationMs) {
      longestSilence = {
        durationMs: gap,
        startTimestamp: prevMsg.timestamp,
        endTimestamp: msg.timestamp,
        lastSender: prevMsg.sender,
        nextSender: sender,
      };
    }

    // ── Response time ────────────────────────────────────────
    // Only count when sender differs from previous AND gap < 6h
    if (prevMsg && prevMsg.sender !== sender && gap < SESSION_GAP_MS) {
      acc.responseTimes.push(gap);

      const monthKey = getMonthKey(msg.timestamp);
      if (!acc.monthlyResponseTimes.has(monthKey)) {
        acc.monthlyResponseTimes.set(monthKey, []);
      }
      acc.monthlyResponseTimes.get(monthKey)!.push(gap);
    }

    // ── Late night messages ──────────────────────────────────
    if (isLateNight(msg.timestamp)) {
      lateNightMessages[sender]++;
    }

    // ── Consecutive / double-text tracking ───────────────────
    if (sender === consecutiveSender) {
      consecutiveCount++;
    } else {
      // Finalize previous run
      if (consecutiveSender && consecutiveCount >= 2) {
        doubleTexts[consecutiveSender]++;
      }
      if (consecutiveSender) {
        maxConsecutive[consecutiveSender] = Math.max(
          maxConsecutive[consecutiveSender] ?? 0,
          consecutiveCount,
        );
      }
      consecutiveSender = sender;
      consecutiveCount = 1;
    }

    // ── Heatmap ──────────────────────────────────────────────
    const date = new Date(msg.timestamp);
    const dayOfWeek = date.getDay(); // 0=Sunday
    const hour = date.getHours();
    heatmapPerPerson[sender][dayOfWeek][hour]++;
    heatmapCombined[dayOfWeek][hour]++;

    // ── Monthly volume ───────────────────────────────────────
    const monthKey = getMonthKey(msg.timestamp);
    if (!monthlyVolumeMap.has(monthKey)) {
      const perPerson: Record<string, number> = {};
      for (const name of participantNames) perPerson[name] = 0;
      monthlyVolumeMap.set(monthKey, perPerson);
    }
    const monthRecord = monthlyVolumeMap.get(monthKey)!;
    if (!(sender in monthRecord)) monthRecord[sender] = 0;
    monthRecord[sender]++;

    // ── Weekday / weekend ────────────────────────────────────
    if (isWeekend(msg.timestamp)) {
      weekendCount[sender]++;
    } else {
      weekdayCount[sender]++;
    }

    // ── Daily count (for burst detection) ────────────────────
    const dayKey = getDayKey(msg.timestamp);
    dailyCounts.set(dayKey, (dailyCounts.get(dayKey) ?? 0) + 1);

    // ── Monthly word count for message length trend ──────────
    if (!acc.monthlyWordCounts.has(monthKey)) {
      acc.monthlyWordCounts.set(monthKey, []);
    }
    acc.monthlyWordCounts.get(monthKey)!.push(wordCount);
  }

  // ── Finalize last consecutive run ──────────────────────────
  if (consecutiveSender) {
    if (consecutiveCount >= 2) {
      doubleTexts[consecutiveSender]++;
    }
    maxConsecutive[consecutiveSender] = Math.max(
      maxConsecutive[consecutiveSender] ?? 0,
      consecutiveCount,
    );
  }

  // ── Mark the last message as a conversation ending ─────────
  if (messages.length > 0) {
    const lastMsg = messages[messages.length - 1];
    conversationEndings[lastMsg.sender]++;
  }

  // ============================================================
  // ============================================================
  // POST-PROCESSING: derive final metrics from accumulators
  // ============================================================

  const perPerson = buildPerPersonMetrics(accumulators);
  const timingPerPerson = buildTimingPerPerson(accumulators);

  const timing: TimingMetrics = {
    perPerson: timingPerPerson,
    conversationInitiations,
    conversationEndings,
    longestSilence,
    lateNightMessages,
  };

  const totalMessages = messages.length;
  const engagement = buildEngagementMetrics(
    accumulators,
    totalMessages,
    totalSessions,
    doubleTexts,
    maxConsecutive,
  );

  const patterns = buildPatternMetrics(
    monthlyVolumeMap,
    weekdayCount,
    weekendCount,
    dailyCounts,
  );

  // ── Heatmap data ───────────────────────────────────────────
  const heatmap: HeatmapData = {
    perPerson: heatmapPerPerson,
    combined: heatmapCombined,
  };

  const sortedMonths = [...monthlyVolumeMap.keys()].sort();

  // ── Trend data ─────────────────────────────────────────────
  const trends = computeTrends(
    accumulators,
    sortedMonths,
    monthlyInitiations,
    participantNames,
  );

  // ── Phase 6A: viral/fun metrics ────────────────────────────
  const quantitativeBase = { perPerson, timing, engagement, patterns, heatmap, trends };
  const viralScores = computeViralScores(quantitativeBase, conversation);
  const badges = computeBadges(quantitativeBase, conversation);
  const bestTimeToText = computeBestTimeToText(quantitativeBase, participantNames);
  const catchphrases = computeCatchphrases(conversation);

  // ── Network metrics (group chats only) ─────────────────────
  const networkMetrics = conversation.metadata.isGroup
    ? computeNetworkMetrics(conversation.messages, participantNames)
    : undefined;

  // ── Reciprocity Index ──────────────────────────────────────
  const reciprocityIndex = computeReciprocityIndex(engagement, timing, perPerson, participantNames);

  return {
    perPerson,
    timing,
    engagement,
    patterns,
    heatmap,
    trends,
    viralScores,
    badges,
    bestTimeToText,
    catchphrases,
    networkMetrics,
    reciprocityIndex,
  };
}

// ============================================================
// Post-Processing Builders
// ============================================================

/** Build final PersonMetrics from accumulators. */
function buildPerPersonMetrics(
  accumulators: Map<string, PersonAccumulator>,
): Record<string, PersonMetrics> {
  const perPerson: Record<string, PersonMetrics> = {};
  for (const [name, acc] of accumulators) {
    const shortestMessage =
      acc.shortestMessage.length === Infinity
        ? { content: '', length: 0, timestamp: 0 }
        : acc.shortestMessage;

    perPerson[name] = {
      totalMessages: acc.totalMessages,
      totalWords: acc.totalWords,
      totalCharacters: acc.totalCharacters,
      averageMessageLength:
        acc.totalMessages > 0 ? acc.totalWords / acc.totalMessages : 0,
      averageMessageChars:
        acc.totalMessages > 0 ? acc.totalCharacters / acc.totalMessages : 0,
      longestMessage: acc.longestMessage,
      shortestMessage,
      messagesWithEmoji: acc.messagesWithEmoji,
      emojiCount: acc.emojiCount,
      topEmojis: topN(acc.emojiFreq, 10),
      questionsAsked: acc.questionsAsked,
      mediaShared: acc.mediaShared,
      linksShared: acc.linksShared,
      reactionsGiven: acc.reactionsGiven,
      reactionsReceived: acc.reactionsReceived,
      topReactionsGiven: topN(acc.reactionsGivenFreq, 5),
      unsentMessages: acc.unsentMessages,
      topWords: topNWords(acc.wordFreq, 20),
      topPhrases: topNPhrases(acc.phraseFreq, 10),
      uniqueWords: acc.wordFreq.size,
      vocabularyRichness: acc.totalWords > 0 ? acc.wordFreq.size / acc.totalWords : 0,
    };
  }
  return perPerson;
}

/** Build per-person timing metrics from accumulators. */
function buildTimingPerPerson(
  accumulators: Map<string, PersonAccumulator>,
): TimingMetrics['perPerson'] {
  const timingPerPerson: TimingMetrics['perPerson'] = {};
  for (const [name, acc] of accumulators) {
    const rts = filterResponseTimeOutliers(acc.responseTimes);
    const avg =
      rts.length > 0 ? rts.reduce((a, b) => a + b, 0) / rts.length : 0;
    const med = median(rts);
    const fastest = rts.length > 0 ? rts.reduce((a, b) => a < b ? a : b, rts[0]) : 0;
    const slowest = rts.length > 0 ? rts.reduce((a, b) => a > b ? a : b, rts[0]) : 0;

    const monthKeys = [...acc.monthlyResponseTimes.keys()].sort();
    const monthlyMedians = monthKeys.map((mk) => {
      const times = filterResponseTimeOutliers(acc.monthlyResponseTimes.get(mk)!);
      return median(times);
    });
    const rtTrend = linearRegressionSlope(monthlyMedians);

    timingPerPerson[name] = {
      averageResponseTimeMs: avg,
      medianResponseTimeMs: med,
      fastestResponseMs: fastest,
      slowestResponseMs: slowest,
      responseTimeTrend: rtTrend,
    };
  }
  return timingPerPerson;
}

/** Build engagement metrics from accumulators. */
function buildEngagementMetrics(
  accumulators: Map<string, PersonAccumulator>,
  totalMessages: number,
  totalSessions: number,
  doubleTexts: Record<string, number>,
  maxConsecutive: Record<string, number>,
): EngagementMetrics {
  const messageRatio: Record<string, number> = {};
  const reactionRate: Record<string, number> = {};
  for (const [name, acc] of accumulators) {
    messageRatio[name] = totalMessages > 0 ? acc.totalMessages / totalMessages : 0;
    reactionRate[name] =
      acc.messagesReceived > 0 ? acc.reactionsGiven / acc.messagesReceived : 0;
  }

  return {
    doubleTexts,
    maxConsecutive,
    messageRatio,
    reactionRate,
    avgConversationLength:
      totalSessions > 0 ? totalMessages / totalSessions : totalMessages,
    totalSessions,
  };
}

/** Build pattern metrics from accumulated data. */
function buildPatternMetrics(
  monthlyVolumeMap: Map<string, Record<string, number>>,
  weekdayCount: Record<string, number>,
  weekendCount: Record<string, number>,
  dailyCounts: Map<string, number>,
): PatternMetrics {
  const sortedMonths = [...monthlyVolumeMap.keys()].sort();
  const monthlyVolume = sortedMonths.map((month) => {
    const pp = monthlyVolumeMap.get(month)!;
    const total = Object.values(pp).reduce((a, b) => a + b, 0);
    return { month, perPerson: pp, total };
  });

  const monthlyTotals = monthlyVolume.map((mv) => mv.total);
  const volumeTrend = linearRegressionSlope(monthlyTotals);
  const bursts = detectBursts(dailyCounts);

  return {
    monthlyVolume,
    weekdayWeekend: {
      weekday: weekdayCount,
      weekend: weekendCount,
    },
    volumeTrend,
    bursts,
  };
}
