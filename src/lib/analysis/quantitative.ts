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
  PersonSentimentStats,
  TimingMetrics,
  EngagementMetrics,
  PatternMetrics,
  HeatmapData,
} from '../parsers/types';
import { computeViralScores } from './viral-scores';
import { computeBadges } from './badges';
import { computeCatchphrases, computeBestTimeToText } from './catchphrases';
import { computeNetworkMetrics } from './network';
import { linearRegressionSlope, SESSION_GAP_MS, ENTER_AS_COMMA_MS } from './constants';

import {
  extractEmojis,
  countWords,
  tokenizeWords,
  tokenizeAll,
  median,
  percentile,
  stdDev,
  trimmedMean,
  skewness,
  filterResponseTimeOutliers,
  filterResponseTimeOutliersWithStats,
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
  computeResponseTimeDistribution,
  computeYearMilestones,
  computePersonSentiment,
  computeSentimentTrend,
  detectConflicts,
  computeIntimacyProgression,
  detectPursuitWithdrawal,
  computeLSM,
  computePronounAnalysis,
  computeChronotypeCompatibility,
  computeShiftSupportRatio,
  computeEmotionalGranularity,
  computeBidResponseRatio,
  computeIntegrativeComplexity,
  computeTemporalFocus,
  computeRepairPatterns,
  computeConflictFingerprint,
  computeResponseTimeAnalysis,
  detectCommunicationGaps,
  createPersonAccumulator,
} from './quant';
import type { PersonAccumulator } from './quant';
import { computeRankingPercentiles } from './ranking-percentiles';

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

  // Normalized lookup for reaction actors: handles FB encoding quirks where
  // the actor name in reactions may differ from participants by whitespace,
  // NFC/NFD form, or minor encoding inconsistencies (e.g. ł, ą, ę).
  // Three-tier matching: exact → NFC normalized → ASCII-folded (diacritics stripped)
  const normalizedActorLookup = new Map<string, string>();
  const asciiFoldedActorLookup = new Map<string, string>();
  for (const name of accumulators.keys()) {
    normalizedActorLookup.set(name.trim().normalize('NFC').toLowerCase(), name);
    // ASCII fold: strip combining diacritical marks for fuzzy matching
    const folded = name.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\u0142/g, 'l').replace(/\u0141/g, 'L');
    asciiFoldedActorLookup.set(folded, name);
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

  // Significant silences: all gaps >3 days, sorted desc, top 15
  const THREE_DAYS_MS = 3 * 86_400_000;
  const significantSilencesRaw: Array<{
    startTimestamp: number;
    endTimestamp: number;
    durationMs: number;
    lastSender: string;
    nextSender: string;
  }> = [];

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
  // Enter-as-comma awareness: consecutive messages from the same sender
  // within ENTER_AS_COMMA_MS are ONE logical message (Enter used as punctuation).
  // A "double text" only counts when same-sender runs are separated by >2min gaps.
  let consecutiveCount = 0;
  let consecutiveSender = '';
  let consecutiveRunStart = 0; // timestamp of current run's first message
  let lastSameSenderTimestamp = 0; // timestamp of the previous message in current run
  let doubleTextRuns = 0; // how many >2min gap sub-runs within a consecutive sender block

  // ── Burst-aware response time: track first unanswered message per sender ──
  // When A sends multiple messages before B replies, RT should measure from
  // A's FIRST unanswered message (actual perceived wait time), not the last.
  let firstUnansweredSender = '';
  let firstUnansweredTimestamp = 0;

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
      // Full token stream for MTLD (includes stopwords — McCarthy & Jarvis 2010)
      const allTokens = tokenizeAll(msg.content);
      for (const t of allTokens) acc.tokensList.push(t);
    }

    // ── Media / links / unsent ───────────────────────────────
    if (msg.hasMedia) acc.mediaShared++;
    if (msg.hasLink) acc.linksShared++;
    if (msg.isUnsent) acc.unsentMessages++;

    // ── Reactions ────────────────────────────────────────────
    // Reactions on this message: the actors gave reactions, this sender received them
    for (const reaction of msg.reactions) {
      // Discord aggregates reactions into a single entry with count field
      const reactionCount = reaction.count ?? 1;
      acc.reactionsReceived += reactionCount;

      // Credit the actor who gave the reaction.
      // Three-tier matching to handle FB encoding quirks where reaction.actor
      // may differ from participant name by whitespace, NFC/NFD, latin-1, or
      // diacritical mark encoding inconsistencies (ł → l, ą → a, etc.).
      let resolvedActorName: string | undefined;
      if (accumulators.has(reaction.actor)) {
        resolvedActorName = reaction.actor;
      } else {
        const trimmed = reaction.actor.trim();
        resolvedActorName = normalizedActorLookup.get(trimmed.normalize('NFC').toLowerCase());
        if (!resolvedActorName) {
          // ASCII fold: strip combining marks + hardcode ł→l for Polish
          const folded = trimmed.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\u0142/g, 'l');
          resolvedActorName = asciiFoldedActorLookup.get(folded);
        }
      }
      const actorAcc = resolvedActorName ? accumulators.get(resolvedActorName) : undefined;
      if (actorAcc) {
        actorAcc.reactionsGiven += reactionCount;
        actorAcc.reactionsGivenFreq.set(
          reaction.emoji,
          (actorAcc.reactionsGivenFreq.get(reaction.emoji) ?? 0) + reactionCount,
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

    // ── Significant silences (>3 days) ───────────────────────
    if (prevMsg && gap >= THREE_DAYS_MS) {
      significantSilencesRaw.push({
        durationMs: gap,
        startTimestamp: prevMsg.timestamp,
        endTimestamp: msg.timestamp,
        lastSender: prevMsg.sender,
        nextSender: sender,
      });
    }

    // ── Response time (burst-aware) ──────────────────────────
    // Track the first unanswered message in a burst. When A sends 5 messages
    // then B replies, RT = time from A's FIRST message to B's reply (actual
    // perceived wait time), not from A's last message.
    if (prevMsg && prevMsg.sender !== sender) {
      // Sender changed — this is a reply. Measure RT from first unanswered.
      const rtStart = firstUnansweredTimestamp > 0 ? firstUnansweredTimestamp : prevMsg.timestamp;
      const adjustedGap = msg.timestamp - rtStart;
      if (adjustedGap > 0 && adjustedGap < SESSION_GAP_MS) {
        acc.responseTimes.push(adjustedGap);

        const monthKey = getMonthKey(msg.timestamp);
        if (!acc.monthlyResponseTimes.has(monthKey)) {
          acc.monthlyResponseTimes.set(monthKey, []);
        }
        acc.monthlyResponseTimes.get(monthKey)!.push(adjustedGap);
      }
      // New sender starts — track their first message as unanswered
      firstUnansweredSender = sender;
      firstUnansweredTimestamp = msg.timestamp;
    } else if (prevMsg && prevMsg.sender === sender) {
      // Same sender continues — keep the first unanswered timestamp
      // (don't update it; we want the FIRST message in the burst)
    } else {
      // First message in conversation
      firstUnansweredSender = sender;
      firstUnansweredTimestamp = msg.timestamp;
    }

    // ── Late night messages ──────────────────────────────────
    if (isLateNight(msg.timestamp)) {
      lateNightMessages[sender]++;
    }

    // ── Consecutive / double-text tracking ───────────────────
    // Enter-as-comma: messages from the same sender within 2min = one logical message.
    // A "double text" = same sender sends messages separated by >2min gaps without reply.
    if (sender === consecutiveSender) {
      consecutiveCount++;
      // Check if this message is >2min after the previous same-sender message
      if (msg.timestamp - lastSameSenderTimestamp > ENTER_AS_COMMA_MS) {
        doubleTextRuns++;
      }
      lastSameSenderTimestamp = msg.timestamp;
    } else {
      // Finalize previous run — only count as double-text if there were >2min gap sub-runs
      if (consecutiveSender && doubleTextRuns > 0) {
        doubleTexts[consecutiveSender] += doubleTextRuns;
      }
      if (consecutiveSender) {
        maxConsecutive[consecutiveSender] = Math.max(
          maxConsecutive[consecutiveSender] ?? 0,
          consecutiveCount,
        );
      }
      consecutiveSender = sender;
      consecutiveCount = 1;
      consecutiveRunStart = msg.timestamp;
      lastSameSenderTimestamp = msg.timestamp;
      doubleTextRuns = 0;
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
    if (doubleTextRuns > 0) {
      doubleTexts[consecutiveSender] += doubleTextRuns;
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

  // ── Significant silences: sort desc, cap at 15 ──────────
  significantSilencesRaw.sort((a, b) => b.durationMs - a.durationMs);
  const significantSilences = significantSilencesRaw.slice(0, 15);

  const perPerson = buildPerPersonMetrics(accumulators);
  const timingPerPerson = buildTimingPerPerson(accumulators);

  const timing: TimingMetrics = {
    perPerson: timingPerPerson,
    conversationInitiations,
    conversationEndings,
    longestSilence,
    lateNightMessages,
    significantSilences,
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

  // -- Language Style Matching (Ireland & Pennebaker, 2010) --
  // Hoisted before viral scores because LSM feeds into compatibility score
  const lsm = computeLSM(messages, participantNames);

  // ── Phase 6A: viral/fun metrics ────────────────────────────
  const quantitativeBase = {
    perPerson, timing, engagement, patterns, heatmap, trends,
    lsmOverallScore: lsm?.overall,
  };
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

  // -- Response Time Distribution --
  const responseTimeDistribution = computeResponseTimeDistribution(accumulators);

  // -- Year Milestones --
  const yearMilestones = computeYearMilestones(patterns.monthlyVolume);

  // -- Sentiment Analysis --
  const sentimentPerPerson: Record<string, PersonSentimentStats> = {};
  const messagesBySender = new Map<string, UnifiedMessage[]>();
  for (const msg of messages) {
    if (!messagesBySender.has(msg.sender)) messagesBySender.set(msg.sender, []);
    messagesBySender.get(msg.sender)!.push(msg);
  }
  for (const name of participantNames) {
    sentimentPerPerson[name] = computePersonSentiment(messagesBySender.get(name) ?? []);
  }
  const sentimentAnalysis = { perPerson: sentimentPerPerson };

  // -- Sentiment Trend (added to trends) --
  const sentimentTrend = computeSentimentTrend(accumulators, sortedMonths, messages, participantNames);
  const trendsWithSentiment = { ...trends, sentimentTrend };

  // -- Conflict Analysis --
  const conflictAnalysis = detectConflicts(messages, participantNames);

  // -- Conflict Fingerprint (per-person conflict behavior profiles) --
  const conflictFingerprint = computeConflictFingerprint(messages, participantNames, conflictAnalysis.events);

  // -- Intimacy Progression --
  const intimacyProgression = computeIntimacyProgression(messages, participantNames, heatmap);

  // -- Pursuit-Withdrawal Detection --
  const pursuitWithdrawal = detectPursuitWithdrawal(messages, participantNames);

  // -- Pronoun Analysis (Pennebaker, 2011) --
  const pronounAnalysis = computePronounAnalysis(messages, participantNames);

  // -- Chronotype Compatibility (Aledavood 2018; Randler 2017) --
  const chronotypeCompatibility = computeChronotypeCompatibility(messages, participantNames);

  // -- Shift-Support Ratio (Derber 1979; Vangelisti 1990) --
  const shiftSupportResult = computeShiftSupportRatio(messages, participantNames);

  // -- Emotion Vocabulary Diversity (Vishnubhotla 2024) --
  const emotionalGranularity = computeEmotionalGranularity(messages, participantNames);

  // -- Bid-Response Ratio (Gottman 1999) --
  const bidResponseResult = computeBidResponseRatio(messages, participantNames);

  // -- Cognitive Complexity Indicator (heuristic, inspired by Suedfeld & Tetlock 1977) --
  const integrativeComplexity = computeIntegrativeComplexity(messages, participantNames);

  // -- Temporal Focus / Future Orientation (Pennebaker LIWC 2007) --
  const temporalFocus = computeTemporalFocus(messages, participantNames);

  // -- Conversational Repair Patterns (Schegloff, Jefferson & Sacks 1977) --
  const repairPatterns = computeRepairPatterns(messages, participantNames);

  // -- Professional Response Time Analysis (Templeton 2022, Holtzman 2021) --
  const responseTimeAnalysis = computeResponseTimeAnalysis(messages, participantNames);

  // -- Communication Gaps (>7 days) for Tryb Eks breakup detection --
  const communicationGaps = detectCommunicationGaps(messages, patterns.monthlyVolume);

  // Build base result for ranking percentiles
  const baseResult: QuantitativeAnalysis = {
    perPerson,
    timing,
    engagement,
    patterns,
    heatmap,
    trends: trendsWithSentiment,
    viralScores,
    badges,
    bestTimeToText,
    catchphrases,
    networkMetrics,
    reciprocityIndex,
    responseTimeDistribution,
    yearMilestones,
    sentimentAnalysis,
    conflictAnalysis,
    conflictFingerprint,
    intimacyProgression,
    pursuitWithdrawal,
    lsm,
    pronounAnalysis,
    chronotypeCompatibility,
    shiftSupportResult,
    emotionalGranularity,
    bidResponseResult,
    integrativeComplexity,
    temporalFocus,
    repairPatterns,
    responseTimeAnalysis,
    communicationGaps,
  };

  // -- Ranking Percentiles (needs full result) --
  const rankingPercentiles = computeRankingPercentiles(baseResult);

  return {
    ...baseResult,
    rankingPercentiles,
    _version: 3, // Bumped: Phase 1-2 audit changes (response time stats, Guiraud's R, burst RT, etc.)
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
      vocabularyRichness: (() => {
        // MTLD (Measure of Textual Lexical Diversity) — McCarthy & Jarvis 2010.
        // Unlike Guiraud/TTR, MTLD does NOT vary with text length (eta²=0.79 for Guiraud).
        // Algorithm: sequentially process tokens, count "factors" (points where
        // TTR drops below 0.72). MTLD = totalTokens / factors.
        // Typical MTLD: 40-60 casual, 70-100 formal, 100+ literary.
        const tokens = acc.tokensList;
        if (!tokens || tokens.length < 50) return 0;
        const TTR_THRESHOLD = 0.72;
        let factors = 0;
        // Forward pass
        let segStart = 0;
        const segWords = new Set<string>();
        for (let i = 0; i < tokens.length; i++) {
          segWords.add(tokens[i]);
          const segLen = i - segStart + 1;
          const ttr = segWords.size / segLen;
          if (ttr <= TTR_THRESHOLD) {
            factors++;
            segStart = i + 1;
            segWords.clear();
          }
        }
        // Partial factor at end
        if (segStart < tokens.length) {
          const remaining = tokens.length - segStart;
          const segWordsRemaining = segWords.size;
          const ttr = segWordsRemaining / remaining;
          if (ttr < 1.0) {
            factors += (1 - ttr) / (1 - TTR_THRESHOLD);
          }
        }
        // Reverse pass for stability (bidirectional MTLD)
        let factorsRev = 0;
        segStart = tokens.length - 1;
        segWords.clear();
        for (let i = tokens.length - 1; i >= 0; i--) {
          segWords.add(tokens[i]);
          const segLen = segStart - i + 1;
          const ttr = segWords.size / segLen;
          if (ttr <= TTR_THRESHOLD) {
            factorsRev++;
            segStart = i - 1;
            segWords.clear();
          }
        }
        if (segStart >= 0) {
          const remaining = segStart + 1;
          const segWordsRemaining = segWords.size;
          const ttr = segWordsRemaining / remaining;
          if (ttr < 1.0) {
            factorsRev += (1 - ttr) / (1 - TTR_THRESHOLD);
          }
        }
        const mtldFwd = factors > 0 ? tokens.length / factors : tokens.length;
        const mtldRev = factorsRev > 0 ? tokens.length / factorsRev : tokens.length;
        return Math.round(((mtldFwd + mtldRev) / 2) * 100) / 100;
      })(),
      // Per-1000-messages normalized rates — enable cross-conversation comparison
      questionsAskedPer1k: acc.totalMessages > 0 ? Math.round((acc.questionsAsked / acc.totalMessages) * 1000) : 0,
      mediaSharedPer1k: acc.totalMessages > 0 ? Math.round((acc.mediaShared / acc.totalMessages) * 1000) : 0,
      linksSharedPer1k: acc.totalMessages > 0 ? Math.round((acc.linksShared / acc.totalMessages) * 1000) : 0,
      emojiRatePer1k: acc.totalMessages > 0 ? Math.round((acc.messagesWithEmoji / acc.totalMessages) * 1000) : 0,
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
    const { filtered: rts, q1, q3, iqr } = filterResponseTimeOutliersWithStats(acc.responseTimes);
    const avg =
      rts.length > 0 ? rts.reduce((a, b) => a + b, 0) / rts.length : 0;
    const med = median(rts);
    const fastest = rts.length > 0 ? rts.reduce((a, b) => a < b ? a : b, rts[0]) : 0;
    const slowest = rts.length > 0 ? rts.reduce((a, b) => a > b ? a : b, rts[0]) : 0;

    // Full descriptive statistics
    const sorted = rts.length > 0 ? [...rts].sort((a, b) => a - b) : [];
    const p75 = sorted.length > 0 ? percentile(sorted, 75) : 0;
    const p90 = sorted.length > 0 ? percentile(sorted, 90) : 0;
    const p95 = sorted.length > 0 ? percentile(sorted, 95) : 0;
    const sd = stdDev(rts);
    const tMean = trimmedMean(rts, 0.1);
    const skew = skewness(rts);

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
      trimmedMeanMs: tMean,
      stdDevMs: sd,
      q1Ms: q1,
      q3Ms: q3,
      iqrMs: iqr,
      p75Ms: p75,
      p90Ms: p90,
      p95Ms: p95,
      skewness: skew,
      sampleSize: rts.length,
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
  const reactionGiveRate: Record<string, number> = {};
  const reactionReceiveRate: Record<string, number> = {};
  for (const [name, acc] of accumulators) {
    messageRatio[name] = totalMessages > 0 ? acc.totalMessages / totalMessages : 0;
    reactionRate[name] =
      acc.messagesReceived > 0 ? acc.reactionsGiven / acc.messagesReceived : 0;
    reactionGiveRate[name] =
      acc.totalMessages > 0 ? acc.reactionsGiven / acc.totalMessages : 0;
    reactionReceiveRate[name] =
      acc.totalMessages > 0 ? acc.reactionsReceived / acc.totalMessages : 0;
  }

  return {
    doubleTexts,
    maxConsecutive,
    messageRatio,
    reactionRate,
    reactionGiveRate,
    reactionReceiveRate,
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
