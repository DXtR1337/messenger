/**
 * Delta metrics — computes differences between two analyses
 * of the same conversation for longitudinal tracking.
 */

import type { QuantitativeAnalysis, ParsedConversation } from '@/lib/parsers/types';

// ── Types ────────────────────────────────────────────────

export interface DeltaMetric {
  label: string;       // Polish label
  previous: number;
  current: number;
  delta: number;       // current - previous
  deltaPercent: number; // (delta / previous) * 100, 0 if previous is 0
  unit: string;        // 'msg', 'słów', 'ms', '%', etc.
  direction: 'up' | 'down' | 'neutral';  // up = delta > 0
  isImprovement: boolean; // context-dependent (e.g., more messages = good, slower response = bad)
}

export interface DeltaMetrics {
  metrics: DeltaMetric[];
  daysSinceLastAnalysis: number;
  previousAnalysisId: string;
  previousCreatedAt: number;
}

// ── Helpers ──────────────────────────────────────────────

function getDirection(delta: number): 'up' | 'down' | 'neutral' {
  if (Math.abs(delta) < 0.001) return 'neutral';
  return delta > 0 ? 'up' : 'down';
}

function calcDeltaPercent(delta: number, previous: number): number {
  if (previous === 0) return 0;
  return (delta / previous) * 100;
}

function buildMetric(
  label: string,
  previous: number,
  current: number,
  unit: string,
  moreIsBetter: boolean,
): DeltaMetric {
  const delta = current - previous;
  const direction = getDirection(delta);
  const isImprovement =
    direction === 'neutral'
      ? false
      : moreIsBetter
        ? direction === 'up'
        : direction === 'down';

  return {
    label,
    previous,
    current,
    delta,
    deltaPercent: calcDeltaPercent(delta, previous),
    unit,
    direction,
    isImprovement,
  };
}

/**
 * Average a numeric value across all participants in a Record.
 * Returns 0 when the record is empty.
 */
function averageOfRecord(record: Record<string, number>): number {
  const values = Object.values(record);
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// ── Main ─────────────────────────────────────────────────

export function computeDelta(
  current: {
    quantitative: QuantitativeAnalysis;
    conversation: ParsedConversation;
    createdAt: number;
  },
  previous: {
    quantitative: QuantitativeAnalysis;
    conversation: ParsedConversation;
    id: string;
    createdAt: number;
  },
): DeltaMetrics {
  const cq = current.quantitative;
  const pq = previous.quantitative;

  const metrics: DeltaMetric[] = [];

  // 1. Wiadomości — total message count
  const currentTotalMessages = current.conversation.metadata.totalMessages;
  const previousTotalMessages = previous.conversation.metadata.totalMessages;
  metrics.push(
    buildMetric('Wiadomości', previousTotalMessages, currentTotalMessages, 'msg', true),
  );

  // 2. Słowa — total words
  const currentTotalWords = Object.values(cq.perPerson).reduce(
    (sum, p) => sum + p.totalWords,
    0,
  );
  const previousTotalWords = Object.values(pq.perPerson).reduce(
    (sum, p) => sum + p.totalWords,
    0,
  );
  metrics.push(
    buildMetric('Słowa', previousTotalWords, currentTotalWords, 'słów', true),
  );

  // 3. Sesje — total sessions
  const currentSessions = cq.engagement.totalSessions;
  const previousSessions = pq.engagement.totalSessions;
  metrics.push(
    buildMetric('Sesje', previousSessions, currentSessions, 'sesji', true),
  );

  // 4. Śr. czas odp. — average median response time across all participants
  const currentAvgResponse = averageOfRecord(
    Object.fromEntries(
      Object.entries(cq.timing.perPerson).map(([name, data]) => [
        name,
        data.medianResponseTimeMs,
      ]),
    ),
  );
  const previousAvgResponse = averageOfRecord(
    Object.fromEntries(
      Object.entries(pq.timing.perPerson).map(([name, data]) => [
        name,
        data.medianResponseTimeMs,
      ]),
    ),
  );
  metrics.push(
    buildMetric(
      'Śr. czas odp.',
      previousAvgResponse,
      currentAvgResponse,
      'ms',
      false, // lower response time = improvement
    ),
  );

  // 5. Śr. długość msg — average message length across all participants
  const currentAvgLength = averageOfRecord(
    Object.fromEntries(
      Object.entries(cq.perPerson).map(([name, data]) => [
        name,
        data.averageMessageLength,
      ]),
    ),
  );
  const previousAvgLength = averageOfRecord(
    Object.fromEntries(
      Object.entries(pq.perPerson).map(([name, data]) => [
        name,
        data.averageMessageLength,
      ]),
    ),
  );
  // Neutral — longer messages are not inherently better or worse
  const avgLengthDelta = currentAvgLength - previousAvgLength;
  metrics.push({
    label: 'Śr. długość msg',
    previous: previousAvgLength,
    current: currentAvgLength,
    delta: avgLengthDelta,
    deltaPercent: calcDeltaPercent(avgLengthDelta, previousAvgLength),
    unit: 'słów',
    direction: getDirection(avgLengthDelta),
    isImprovement: false, // neutral — neither direction is inherently better
  });

  // 6. Trend wolumenu — volume trend slope change
  const currentTrend = cq.patterns.volumeTrend;
  const previousTrend = pq.patterns.volumeTrend;
  metrics.push(
    buildMetric('Trend wolumenu', previousTrend, currentTrend, '%', true),
  );

  // Days since last analysis
  const daysSinceLastAnalysis = Math.round(
    (current.createdAt - previous.createdAt) / 86_400_000,
  );

  return {
    metrics,
    daysSinceLastAnalysis,
    previousAnalysisId: previous.id,
    previousCreatedAt: previous.createdAt,
  };
}
