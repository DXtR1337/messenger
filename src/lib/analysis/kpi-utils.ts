import type { QuantitativeAnalysis, ParsedConversation } from '@/lib/parsers/types';

export interface KPICardData {
  id: string;
  value: string;
  label: string;
  trendPercent: number;
  trendDirection: 'up' | 'down' | 'neutral';
  sparklineData: number[];
  iconColor: 'blue' | 'purple' | 'emerald' | 'amber';
  iconType: 'clock' | 'messages' | 'heart' | 'activity';
}

/**
 * Compare average of the last `recentN` items vs the previous `recentN` items
 * and return a percentage change. Returns 0 when there is not enough data.
 */
export function computeTrendPercent(data: number[], recentN: number): number {
  if (data.length < recentN * 2) {
    if (data.length < 2) return 0;
    const mid = Math.floor(data.length / 2);
    const older = data.slice(0, mid);
    const newer = data.slice(mid);
    const avgOld = older.reduce((a, b) => a + b, 0) / older.length;
    const avgNew = newer.reduce((a, b) => a + b, 0) / newer.length;
    if (avgOld === 0) return avgNew > 0 ? 100 : 0;
    return Math.round(((avgNew - avgOld) / avgOld) * 100);
  }

  const recent = data.slice(-recentN);
  const previous = data.slice(-recentN * 2, -recentN);

  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
  const avgPrevious = previous.reduce((a, b) => a + b, 0) / previous.length;

  if (avgPrevious === 0) return avgRecent > 0 ? 100 : 0;
  return Math.round(((avgRecent - avgPrevious) / avgPrevious) * 100);
}

function formatResponseTime(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) {
    const minutes = Math.floor(ms / 60_000);
    const seconds = Math.round((ms % 60_000) / 1000);
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.round((ms % 3_600_000) / 60_000);
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function trendDir(pct: number): 'up' | 'down' | 'neutral' {
  if (pct > 0) return 'up';
  if (pct < 0) return 'down';
  return 'neutral';
}

export function computeKPICards(
  quantitative: QuantitativeAnalysis,
  conversation: ParsedConversation,
): KPICardData[] {
  const participants = conversation.participants.map((p) => p.name);

  // --- 1. Avg Response Time ---
  const medianTimes = participants.map(
    (name) => quantitative.timing.perPerson[name]?.medianResponseTimeMs ?? 0,
  );
  const avgMedian =
    medianTimes.length > 0
      ? medianTimes.reduce((a, b) => a + b, 0) / medianTimes.length
      : 0;

  const responseSparkline = quantitative.trends.responseTimeTrend.map((entry) => {
    const vals = participants.map((name) => entry.perPerson[name] ?? 0);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  });
  const responseTrend = computeTrendPercent(responseSparkline, 3);

  // --- 2. Messages/Day ---
  const durationDays = Math.max(conversation.metadata.durationDays, 1);
  const totalMessages = conversation.metadata.totalMessages;
  const messagesPerDay = totalMessages / durationDays;

  const volumeSparkline = quantitative.patterns.monthlyVolume.map(
    (entry) => entry.total / 30,
  );
  const volumeTrend = computeTrendPercent(volumeSparkline, 3);

  // --- 3. Total Reactions ---
  const totalReactions = participants.reduce(
    (sum, name) => sum + (quantitative.perPerson[name]?.reactionsGiven ?? 0),
    0,
  );

  // Approximate reaction sparkline from monthly volume proportionally
  const totalMsgs = quantitative.patterns.monthlyVolume.reduce(
    (sum, entry) => sum + entry.total,
    0,
  );
  const reactionSparkline = quantitative.patterns.monthlyVolume.map((entry) => {
    const proportion = totalMsgs > 0 ? entry.total / totalMsgs : 0;
    return Math.round(totalReactions * proportion);
  });
  const reactionTrend = computeTrendPercent(reactionSparkline, 3);

  // --- 4. Initiation Ratio ---
  const initiations = quantitative.timing.conversationInitiations;
  const totalInitiations = Object.values(initiations).reduce(
    (sum, count) => sum + count,
    0,
  );

  let dominantInitiator = participants[0] ?? '';
  let dominantCount = 0;
  for (const name of participants) {
    const count = initiations[name] ?? 0;
    if (count > dominantCount) {
      dominantCount = count;
      dominantInitiator = name;
    }
  }
  const dominantPct =
    totalInitiations > 0 ? Math.round((dominantCount / totalInitiations) * 100) : 50;

  const initiationSparkline = quantitative.trends.initiationTrend.map((entry) => {
    const total = Object.values(entry.perPerson).reduce((s, v) => s + v, 0);
    const dominant = entry.perPerson[dominantInitiator] ?? 0;
    return total > 0 ? (dominant / total) * 100 : 50;
  });
  const initiationTrendPct = computeTrendPercent(initiationSparkline, 3);

  return [
    {
      id: 'avg-response-time',
      value: formatResponseTime(avgMedian),
      label: 'Sr. czas odpowiedzi',
      trendPercent: responseTrend,
      trendDirection: trendDir(responseTrend),
      sparklineData: responseSparkline,
      iconColor: 'blue',
      iconType: 'clock',
    },
    {
      id: 'messages-per-day',
      value: messagesPerDay.toFixed(1),
      label: 'Wiadomosci / dzien',
      trendPercent: volumeTrend,
      trendDirection: trendDir(volumeTrend),
      sparklineData: volumeSparkline,
      iconColor: 'purple',
      iconType: 'messages',
    },
    {
      id: 'total-reactions',
      value: totalReactions.toLocaleString(),
      label: 'Laczna liczba reakcji',
      trendPercent: reactionTrend,
      trendDirection: trendDir(reactionTrend),
      sparklineData: reactionSparkline,
      iconColor: 'emerald',
      iconType: 'heart',
    },
    {
      id: 'initiation-ratio',
      value: `${dominantPct}%`,
      label: `Inicjacja: ${dominantInitiator}`,
      trendPercent: initiationTrendPct,
      trendDirection: trendDir(initiationTrendPct),
      sparklineData: initiationSparkline,
      iconColor: 'amber',
      iconType: 'activity',
    },
  ];
}
