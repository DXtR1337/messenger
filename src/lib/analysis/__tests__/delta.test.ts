import { describe, it, expect } from 'vitest';
import { computeDelta } from '@/lib/analysis/delta';
import type { DeltaMetric } from '@/lib/analysis/delta';
import { makeQuant, makeConversation, makeMsg, BASE_TS, DAY } from '@/lib/__tests__/fixtures';
import type { QuantitativeAnalysis, ParsedConversation } from '@/lib/parsers/types';

function makeAnalysisInput(opts?: {
  totalMessages?: number;
  durationDays?: number;
  totalWords?: [number, number];
  totalSessions?: number;
  medianResponseMs?: [number, number];
  avgMsgLength?: [number, number];
  volumeTrend?: number;
  createdAt?: number;
  id?: string;
}) {
  const names = ['Alice', 'Bob'];
  const totalMessages = opts?.totalMessages ?? 1000;
  const durationDays = opts?.durationDays ?? 30;
  const totalWordsA = opts?.totalWords?.[0] ?? 5000;
  const totalWordsB = opts?.totalWords?.[1] ?? 3000;
  const totalSessions = opts?.totalSessions ?? 20;
  const medianA = opts?.medianResponseMs?.[0] ?? 300_000;
  const medianB = opts?.medianResponseMs?.[1] ?? 300_000;
  const avgLenA = opts?.avgMsgLength?.[0] ?? 10;
  const avgLenB = opts?.avgMsgLength?.[1] ?? 8;
  const volumeTrend = opts?.volumeTrend ?? 0;

  const quant = makeQuant({
    perPerson: {
      Alice: { totalWords: totalWordsA, averageMessageLength: avgLenA } as never,
      Bob: { totalWords: totalWordsB, averageMessageLength: avgLenB } as never,
    },
    timing: {
      perPerson: {
        Alice: { medianResponseTimeMs: medianA },
        Bob: { medianResponseTimeMs: medianB },
      },
    } as never,
    engagement: { totalSessions } as never,
    patterns: { volumeTrend } as never,
  }, names) as QuantitativeAnalysis;

  const conv = makeConversation(names, [
    makeMsg('Alice', 'hi', BASE_TS),
  ], {
    metadata: { totalMessages, durationDays, dateRange: { start: BASE_TS, end: BASE_TS + durationDays * DAY }, isGroup: false } as never,
  }) as ParsedConversation;

  return { quantitative: quant, conversation: conv, createdAt: opts?.createdAt ?? BASE_TS, id: opts?.id ?? 'prev-id' };
}

describe('computeDelta', () => {
  describe('output structure', () => {
    it('returns exactly 6 metrics', () => {
      const prev = makeAnalysisInput({ createdAt: BASE_TS, id: 'prev-1' });
      const curr = makeAnalysisInput({ createdAt: BASE_TS + 7 * DAY });
      const result = computeDelta(curr, prev);
      expect(result.metrics).toHaveLength(6);
    });

    it('metric labels in expected order', () => {
      const prev = makeAnalysisInput({ createdAt: BASE_TS, id: 'prev-1' });
      const curr = makeAnalysisInput({ createdAt: BASE_TS + DAY });
      const labels = computeDelta(curr, prev).metrics.map(m => m.label);
      expect(labels).toEqual([
        'Wiadomości', 'Słowa', 'Sesje',
        'Śr. czas odp.', 'Śr. długość msg', 'Trend wolumenu',
      ]);
    });

    it('daysSinceLastAnalysis computed correctly', () => {
      const prev = makeAnalysisInput({ createdAt: BASE_TS, id: 'prev-1' });
      const curr = makeAnalysisInput({ createdAt: BASE_TS + 14 * DAY });
      const result = computeDelta(curr, prev);
      expect(result.daysSinceLastAnalysis).toBe(14);
    });

    it('preserves previousAnalysisId', () => {
      const prev = makeAnalysisInput({ createdAt: BASE_TS, id: 'test-prev-id' });
      const curr = makeAnalysisInput({ createdAt: BASE_TS + DAY });
      expect(computeDelta(curr, prev).previousAnalysisId).toBe('test-prev-id');
    });
  });

  describe('metric: Wiadomości', () => {
    it('more messages → up, isImprovement=true', () => {
      const prev = makeAnalysisInput({ totalMessages: 500, createdAt: BASE_TS, id: 'p' });
      const curr = makeAnalysisInput({ totalMessages: 800, createdAt: BASE_TS + DAY });
      const m = computeDelta(curr, prev).metrics[0];
      expect(m.previous).toBe(500);
      expect(m.current).toBe(800);
      expect(m.delta).toBe(300);
      expect(m.direction).toBe('up');
      expect(m.isImprovement).toBe(true);
    });

    it('fewer messages → down, isImprovement=false', () => {
      const prev = makeAnalysisInput({ totalMessages: 800, createdAt: BASE_TS, id: 'p' });
      const curr = makeAnalysisInput({ totalMessages: 500, createdAt: BASE_TS + DAY });
      const m = computeDelta(curr, prev).metrics[0];
      expect(m.direction).toBe('down');
      expect(m.isImprovement).toBe(false);
    });

    it('same count → neutral', () => {
      const prev = makeAnalysisInput({ totalMessages: 500, createdAt: BASE_TS, id: 'p' });
      const curr = makeAnalysisInput({ totalMessages: 500, createdAt: BASE_TS + DAY });
      const m = computeDelta(curr, prev).metrics[0];
      expect(m.direction).toBe('neutral');
    });
  });

  describe('metric: Śr. czas odp. (lower is better)', () => {
    it('faster response → down → isImprovement=true', () => {
      const prev = makeAnalysisInput({ medianResponseMs: [600_000, 600_000], createdAt: BASE_TS, id: 'p' });
      const curr = makeAnalysisInput({ medianResponseMs: [300_000, 300_000], createdAt: BASE_TS + DAY });
      const m = computeDelta(curr, prev).metrics[3];
      expect(m.label).toBe('Śr. czas odp.');
      expect(m.direction).toBe('down');
      expect(m.isImprovement).toBe(true);
    });

    it('slower response → up → isImprovement=false', () => {
      const prev = makeAnalysisInput({ medianResponseMs: [300_000, 300_000], createdAt: BASE_TS, id: 'p' });
      const curr = makeAnalysisInput({ medianResponseMs: [600_000, 600_000], createdAt: BASE_TS + DAY });
      const m = computeDelta(curr, prev).metrics[3];
      expect(m.direction).toBe('up');
      expect(m.isImprovement).toBe(false);
    });
  });

  describe('metric: Śr. długość msg (neutral)', () => {
    it('isImprovement is always false (neutral metric)', () => {
      const prev = makeAnalysisInput({ avgMsgLength: [5, 5], createdAt: BASE_TS, id: 'p' });
      const curr = makeAnalysisInput({ avgMsgLength: [15, 15], createdAt: BASE_TS + DAY });
      const m = computeDelta(curr, prev).metrics[4];
      expect(m.label).toBe('Śr. długość msg');
      expect(m.direction).toBe('up');
      expect(m.isImprovement).toBe(false); // always neutral
    });
  });

  describe('deltaPercent', () => {
    it('500 → 800 = 60% increase', () => {
      const prev = makeAnalysisInput({ totalMessages: 500, createdAt: BASE_TS, id: 'p' });
      const curr = makeAnalysisInput({ totalMessages: 800, createdAt: BASE_TS + DAY });
      const m = computeDelta(curr, prev).metrics[0];
      expect(m.deltaPercent).toBe(60);
    });

    it('previous=0 → deltaPercent=0 (division guard)', () => {
      const prev = makeAnalysisInput({ totalSessions: 0, createdAt: BASE_TS, id: 'p' });
      const curr = makeAnalysisInput({ totalSessions: 10, createdAt: BASE_TS + DAY });
      const m = computeDelta(curr, prev).metrics[2]; // Sesje
      expect(m.deltaPercent).toBe(0);
    });
  });

  describe('determinism', () => {
    it('same input → same output', () => {
      const prev = makeAnalysisInput({ totalMessages: 500, createdAt: BASE_TS, id: 'p' });
      const curr = makeAnalysisInput({ totalMessages: 800, createdAt: BASE_TS + DAY });
      expect(computeDelta(curr, prev)).toEqual(computeDelta(curr, prev));
    });
  });
});
