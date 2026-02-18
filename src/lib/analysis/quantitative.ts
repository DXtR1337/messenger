/**
 * Quantitative metrics computation engine for ChatScope.
 *
 * Computes all numerical/statistical metrics from a parsed conversation
 * without any AI involvement. Designed for a single-pass approach over
 * the messages array with O(n) complexity for the main loop.
 *
 * Performance target: <200ms for 50,000 messages.
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
  TrendData,
  ReciprocityIndex,
} from '../parsers/types';
import { computeViralScores } from './viral-scores';
import { computeBadges } from './badges';
import { computeCatchphrases, computeBestTimeToText } from './catchphrases';
import { computeNetworkMetrics } from './network';
import { STOPWORDS, linearRegressionSlope } from './constants';

// ============================================================
// Constants
// ============================================================

const SESSION_GAP_MS = 6 * 60 * 60 * 1000; // 6 hours


// ============================================================
// Helper Functions
// ============================================================

function extractEmojis(text: string): string[] {
  const emojiRegex = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu;
  return text.match(emojiRegex) ?? [];
}

function countWords(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}


function getMonthKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 7);
}

function getDayKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function isLateNight(timestamp: number): boolean {
  const hour = new Date(timestamp).getHours();
  return hour >= 22 || hour < 4;
}

function isWeekend(timestamp: number): boolean {
  const day = new Date(timestamp).getDay();
  return day === 0 || day === 6;
}

/** Return top N items from a frequency map, sorted descending. */
function topN(
  map: Map<string, number>,
  n: number,
): Array<{ emoji: string; count: number }> {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([emoji, count]) => ({ emoji, count }));
}

/** Generic top-N for word/phrase frequency maps. */
function topNWords(
  map: Map<string, number>,
  n: number,
): Array<{ word: string; count: number }> {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([word, count]) => ({ word, count }));
}

function topNPhrases(
  map: Map<string, number>,
  n: number,
): Array<{ phrase: string; count: number }> {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([phrase, count]) => ({ phrase, count }));
}

/** Tokenize text to lowercase words (letters only, min 2 chars). */
function tokenizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .split(/[\s.,!?;:()\[\]{}"'\-\/\\<>@#$%^&*+=|~`]+/)
    .filter(w => w.length >= 2 && !STOPWORDS.has(w));
}

// ============================================================
// Accumulator Types (internal, not exported)
// ============================================================

interface PersonAccumulator {
  totalMessages: number;
  totalWords: number;
  totalCharacters: number;
  longestMessage: { content: string; length: number; timestamp: number };
  shortestMessage: { content: string; length: number; timestamp: number };
  messagesWithEmoji: number;
  emojiCount: number;
  emojiFreq: Map<string, number>;
  questionsAsked: number;
  mediaShared: number;
  linksShared: number;
  reactionsGiven: number;
  reactionsReceived: number;
  reactionsGivenFreq: Map<string, number>;
  unsentMessages: number;
  /** Response times when this person responded to someone else */
  responseTimes: number[];
  /** Monthly response times for trend computation */
  monthlyResponseTimes: Map<string, number[]>;
  /** Monthly word counts for message length trend */
  monthlyWordCounts: Map<string, number[]>;
  /** Messages received from others (for reaction rate computation) */
  messagesReceived: number;
  /** Word frequency map (excluding stopwords) */
  wordFreq: Map<string, number>;
  /** Bigram frequency map */
  phraseFreq: Map<string, number>;
}

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
    accumulators.set(name, {
      totalMessages: 0,
      totalWords: 0,
      totalCharacters: 0,
      longestMessage: { content: '', length: 0, timestamp: 0 },
      shortestMessage: { content: '', length: Infinity, timestamp: 0 },
      messagesWithEmoji: 0,
      emojiCount: 0,
      emojiFreq: new Map(),
      questionsAsked: 0,
      mediaShared: 0,
      linksShared: 0,
      reactionsGiven: 0,
      reactionsReceived: 0,
      reactionsGivenFreq: new Map(),
      unsentMessages: 0,
      responseTimes: [],
      monthlyResponseTimes: new Map(),
      monthlyWordCounts: new Map(),
      messagesReceived: 0,
      wordFreq: new Map(),
      phraseFreq: new Map(),
    });
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
      accumulators.set(sender, {
        totalMessages: 0,
        totalWords: 0,
        totalCharacters: 0,
        longestMessage: { content: '', length: 0, timestamp: 0 },
        shortestMessage: { content: '', length: Infinity, timestamp: 0 },
        messagesWithEmoji: 0,
        emojiCount: 0,
        emojiFreq: new Map(),
        questionsAsked: 0,
        mediaShared: 0,
        linksShared: 0,
        reactionsGiven: 0,
        reactionsReceived: 0,
        reactionsGivenFreq: new Map(),
        unsentMessages: 0,
        responseTimes: [],
        monthlyResponseTimes: new Map(),
        monthlyWordCounts: new Map(),
        messagesReceived: 0,
        wordFreq: new Map(),
        phraseFreq: new Map(),
      });
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
  // POST-PROCESSING: derive final metrics from accumulators
  // ============================================================

  // ── Per-person metrics ─────────────────────────────────────
  const perPerson: Record<string, PersonMetrics> = {};
  for (const [name, acc] of accumulators) {
    // Fix shortestMessage if no non-empty message was found
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

  // ── Timing metrics per person ──────────────────────────────
  const timingPerPerson: TimingMetrics['perPerson'] = {};
  for (const [name, acc] of accumulators) {
    const rts = acc.responseTimes;
    const avg =
      rts.length > 0 ? rts.reduce((a, b) => a + b, 0) / rts.length : 0;
    const med = median(rts);
    const fastest = rts.length > 0 ? rts.reduce((a, b) => a < b ? a : b, rts[0]) : 0;
    const slowest = rts.length > 0 ? rts.reduce((a, b) => a > b ? a : b, rts[0]) : 0;

    // Response time trend: compute monthly averages, then linear regression
    const monthKeys = [...acc.monthlyResponseTimes.keys()].sort();
    const monthlyAvgs = monthKeys.map((mk) => {
      const times = acc.monthlyResponseTimes.get(mk)!;
      return times.reduce((a, b) => a + b, 0) / times.length;
    });
    const rtTrend = linearRegressionSlope(monthlyAvgs);

    timingPerPerson[name] = {
      averageResponseTimeMs: avg,
      medianResponseTimeMs: med,
      fastestResponseMs: fastest,
      slowestResponseMs: slowest,
      responseTimeTrend: rtTrend,
    };
  }

  const timing: TimingMetrics = {
    perPerson: timingPerPerson,
    conversationInitiations,
    conversationEndings,
    longestSilence,
    lateNightMessages,
  };

  // ── Engagement metrics ─────────────────────────────────────
  const totalMessages = messages.length;
  const messageRatio: Record<string, number> = {};
  const reactionRate: Record<string, number> = {};
  for (const [name, acc] of accumulators) {
    messageRatio[name] = totalMessages > 0 ? acc.totalMessages / totalMessages : 0;
    // Reaction rate: reactions given / messages received from others
    // messagesReceived was incremented for each message sent by someone else
    reactionRate[name] =
      acc.messagesReceived > 0 ? acc.reactionsGiven / acc.messagesReceived : 0;
  }

  const engagement: EngagementMetrics = {
    doubleTexts,
    maxConsecutive,
    messageRatio,
    reactionRate,
    avgConversationLength:
      totalSessions > 0 ? totalMessages / totalSessions : totalMessages,
    totalSessions,
  };

  // ── Pattern metrics ────────────────────────────────────────

  // Monthly volume array sorted chronologically
  const sortedMonths = [...monthlyVolumeMap.keys()].sort();
  const monthlyVolume = sortedMonths.map((month) => {
    const pp = monthlyVolumeMap.get(month)!;
    const total = Object.values(pp).reduce((a, b) => a + b, 0);
    return { month, perPerson: pp, total };
  });

  // Volume trend: linear regression on monthly totals
  const monthlyTotals = monthlyVolume.map((mv) => mv.total);
  const volumeTrend = linearRegressionSlope(monthlyTotals);

  // Burst detection: days where count > 3x rolling 7-day average
  const bursts = detectBursts(dailyCounts);

  const patterns: PatternMetrics = {
    monthlyVolume,
    weekdayWeekend: {
      weekday: weekdayCount,
      weekend: weekendCount,
    },
    volumeTrend,
    bursts,
  };

  // ── Heatmap data ───────────────────────────────────────────
  const heatmap: HeatmapData = {
    perPerson: heatmapPerPerson,
    combined: heatmapCombined,
  };

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
// Burst Detection
// ============================================================

function detectBursts(
  dailyCounts: Map<string, number>,
): PatternMetrics['bursts'] {
  const sortedDays = [...dailyCounts.keys()].sort();
  if (sortedDays.length < 8) return [];

  const dayValues: Array<{ day: string; count: number }> = sortedDays.map(
    (day) => ({
      day,
      count: dailyCounts.get(day) ?? 0,
    }),
  );

  // Compute rolling 7-day average for each day
  // For the first 7 days, use the overall average as baseline
  const overallAvg =
    dayValues.reduce((sum, d) => sum + d.count, 0) / dayValues.length;

  const burstDays: Array<{ day: string; count: number }> = [];

  for (let i = 0; i < dayValues.length; i++) {
    let rollingAvg: number;
    if (i < 7) {
      rollingAvg = overallAvg;
    } else {
      let sum = 0;
      for (let j = i - 7; j < i; j++) {
        sum += dayValues[j].count;
      }
      rollingAvg = sum / 7;
    }

    if (dayValues[i].count > 3 * rollingAvg && rollingAvg > 0) {
      burstDays.push(dayValues[i]);
    }
  }

  // Merge consecutive burst days into burst periods
  // Two days are "consecutive" if they are within 1 calendar day of each other
  if (burstDays.length === 0) return [];

  const bursts: PatternMetrics['bursts'] = [];
  let currentBurst = {
    startDate: burstDays[0].day,
    endDate: burstDays[0].day,
    messageCount: burstDays[0].count,
    days: 1,
  };

  for (let i = 1; i < burstDays.length; i++) {
    const prevDate = new Date(currentBurst.endDate + 'T00:00:00Z');
    const currDate = new Date(burstDays[i].day + 'T00:00:00Z');
    const diffDays =
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays <= 1) {
      // Extend current burst
      currentBurst.endDate = burstDays[i].day;
      currentBurst.messageCount += burstDays[i].count;
      currentBurst.days++;
    } else {
      // Finalize current burst and start new one
      bursts.push({
        startDate: currentBurst.startDate,
        endDate: currentBurst.endDate,
        messageCount: currentBurst.messageCount,
        avgDaily: currentBurst.messageCount / currentBurst.days,
      });
      currentBurst = {
        startDate: burstDays[i].day,
        endDate: burstDays[i].day,
        messageCount: burstDays[i].count,
        days: 1,
      };
    }
  }

  // Push final burst
  bursts.push({
    startDate: currentBurst.startDate,
    endDate: currentBurst.endDate,
    messageCount: currentBurst.messageCount,
    avgDaily: currentBurst.messageCount / currentBurst.days,
  });

  return bursts;
}

// ============================================================
// Trend Computation
// ============================================================

function computeTrends(
  accumulators: Map<string, PersonAccumulator>,
  sortedMonths: string[],
  monthlyInitiations: Map<string, Record<string, number>>,
  participantNames: string[],
): TrendData {
  // ── Response time trend ────────────────────────────────────
  const responseTimeTrend: TrendData['responseTimeTrend'] = sortedMonths.map(
    (month) => {
      const pp: Record<string, number> = {};
      for (const [name, acc] of accumulators) {
        const times = acc.monthlyResponseTimes.get(month);
        if (times && times.length > 0) {
          pp[name] = times.reduce((a, b) => a + b, 0) / times.length;
        } else {
          pp[name] = 0;
        }
      }
      return { month, perPerson: pp };
    },
  );

  // ── Message length trend ───────────────────────────────────
  const messageLengthTrend: TrendData['messageLengthTrend'] = sortedMonths.map(
    (month) => {
      const pp: Record<string, number> = {};
      for (const [name, acc] of accumulators) {
        const words = acc.monthlyWordCounts.get(month);
        if (words && words.length > 0) {
          pp[name] = words.reduce((a, b) => a + b, 0) / words.length;
        } else {
          pp[name] = 0;
        }
      }
      return { month, perPerson: pp };
    },
  );

  // ── Initiation trend ──────────────────────────────────────
  const initiationTrend: TrendData['initiationTrend'] = sortedMonths.map(
    (month) => {
      const initiations = monthlyInitiations.get(month);
      const pp: Record<string, number> = {};
      for (const name of participantNames) {
        pp[name] = initiations?.[name] ?? 0;
      }
      // Also include any extra senders not in original participantNames
      if (initiations) {
        for (const name of Object.keys(initiations)) {
          if (!(name in pp)) {
            pp[name] = initiations[name];
          }
        }
      }
      return { month, perPerson: pp };
    },
  );

  return {
    responseTimeTrend,
    messageLengthTrend,
    initiationTrend,
  };
}

// ============================================================
// Reciprocity Index
// ============================================================

/**
 * Compute reciprocity index — a composite metric measuring balance
 * between participants. 0 = one-sided, 50 = perfectly balanced.
 * Only meaningful for 2-person conversations.
 */
function computeReciprocityIndex(
  engagement: EngagementMetrics,
  timing: TimingMetrics,
  perPerson: Record<string, PersonMetrics>,
  participantNames: string[],
): ReciprocityIndex {
  // Default: balanced
  const defaultResult: ReciprocityIndex = {
    overall: 50,
    messageBalance: 50,
    initiationBalance: 50,
    responseTimeSymmetry: 50,
    reactionBalance: 50,
  };

  if (participantNames.length < 2) return defaultResult;

  // Use first two participants for 1:1 analysis
  const [a, b] = participantNames;

  // 1. Message Balance: how close to 50/50 is the message split?
  const ratioA = engagement.messageRatio[a] ?? 0.5;
  // Score: 50 when ratioA = 0.5, 0 when ratioA = 0 or 1
  const messageBalance = Math.round(100 * (1 - 2 * Math.abs(ratioA - 0.5)));

  // 2. Initiation Balance: who starts conversations?
  const initA = timing.conversationInitiations[a] ?? 0;
  const initB = timing.conversationInitiations[b] ?? 0;
  const totalInits = initA + initB;
  const initiationBalance = totalInits > 0
    ? Math.round(100 * (1 - 2 * Math.abs(initA / totalInits - 0.5)))
    : 50;

  // 3. Response Time Symmetry: are response times similar?
  const rtA = timing.perPerson[a]?.medianResponseTimeMs ?? 0;
  const rtB = timing.perPerson[b]?.medianResponseTimeMs ?? 0;
  let responseTimeSymmetry = 50;
  if (rtA > 0 && rtB > 0) {
    const ratio = Math.min(rtA, rtB) / Math.max(rtA, rtB); // 0-1, 1 = same
    responseTimeSymmetry = Math.round(ratio * 100);
  } else if (rtA === 0 && rtB === 0) {
    responseTimeSymmetry = 50; // no data
  }

  // 4. Reaction Balance: do they react to each other equally?
  const reactA = perPerson[a]?.reactionsGiven ?? 0;
  const reactB = perPerson[b]?.reactionsGiven ?? 0;
  const totalReacts = reactA + reactB;
  const reactionBalance = totalReacts > 0
    ? Math.round(100 * (1 - 2 * Math.abs(reactA / totalReacts - 0.5)))
    : 50;

  // Overall: equal weight average of all 4 sub-scores
  const overall = Math.round(
    (messageBalance + initiationBalance + responseTimeSymmetry + reactionBalance) / 4
  );

  return {
    overall,
    messageBalance,
    initiationBalance,
    responseTimeSymmetry,
    reactionBalance,
  };
}
