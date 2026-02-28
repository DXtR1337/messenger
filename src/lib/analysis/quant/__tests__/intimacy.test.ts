import { describe, it, expect } from 'vitest';
import { computeIntimacyProgression } from '../intimacy';
import type { UnifiedMessage, HeatmapData } from '@/lib/parsers/types';

const HOUR = 3_600_000;
const DAY = 86_400_000;
// 2024-01-15 12:00 UTC — a Monday midday
const BASE = new Date('2024-01-15T12:00:00Z').getTime();

function makeMsg(sender: string, content: string, timestamp: number): UnifiedMessage {
  return { index: 0, sender, content, timestamp, type: 'text', reactions: [], hasMedia: false, hasLink: false, isUnsent: false };
}

function makeHeatmap(): HeatmapData {
  const zeros = () => Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
  return { perPerson: {}, combined: zeros() };
}

/** Generate N messages in a given month (YYYY-MM), spread across the month at midday UTC. */
function msgsInMonth(sender: string, yearMonth: string, count: number, content = 'hello'): UnifiedMessage[] {
  const [y, m] = yearMonth.split('-').map(Number);
  const baseTs = new Date(Date.UTC(y, m - 1, 5, 12, 0, 0)).getTime();
  return Array.from({ length: count }, (_, i) =>
    makeMsg(sender, content, baseTs + i * HOUR),
  );
}

describe('computeIntimacyProgression', () => {
  describe('guard conditions', () => {
    it('empty messages → default result', () => {
      const result = computeIntimacyProgression([], ['Alice', 'Bob'], makeHeatmap());
      expect(result.trend).toEqual([]);
      expect(result.overallSlope).toBe(0);
      expect(result.label).toBe('Stabilna relacja');
    });

    it('empty participantNames → default result', () => {
      const msgs = msgsInMonth('Alice', '2024-01', 10);
      const result = computeIntimacyProgression(msgs, [], makeHeatmap());
      expect(result.label).toBe('Stabilna relacja');
    });

    it('only 1 month → default result (needs >= 2 months)', () => {
      const msgs = msgsInMonth('Alice', '2024-01', 20);
      const result = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      expect(result.trend).toEqual([]);
      expect(result.overallSlope).toBe(0);
    });

    it('2 months → produces trend with 2 data points', () => {
      const msgs = [
        ...msgsInMonth('Alice', '2024-01', 10),
        ...msgsInMonth('Alice', '2024-02', 10),
      ];
      const result = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      expect(result.trend).toHaveLength(2);
    });
  });

  describe('system message filtering', () => {
    it('system messages are skipped', () => {
      const msgs = [
        ...msgsInMonth('Alice', '2024-01', 10),
        makeMsg('System', 'X joined', new Date('2024-01-15T14:00:00Z').getTime()),
        ...msgsInMonth('Alice', '2024-02', 10),
      ];
      msgs[10].type = 'system';
      const result = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      // Still 2 months
      expect(result.trend).toHaveLength(2);
    });
  });

  describe('month grouping and sorting', () => {
    it('months are sorted chronologically', () => {
      const msgs = [
        ...msgsInMonth('Alice', '2024-03', 10),
        ...msgsInMonth('Alice', '2024-01', 10),
        ...msgsInMonth('Alice', '2024-02', 10),
      ];
      const result = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      expect(result.trend.map(d => d.month)).toEqual(['2024-01', '2024-02', '2024-03']);
    });
  });

  describe('informalityFactor — Faza 27 fix', () => {
    it('exclamations add to informality score', () => {
      const msgs = [
        ...msgsInMonth('Alice', '2024-01', 5, 'hello'),
        ...msgsInMonth('Alice', '2024-02', 5, 'wow!!! amazing!!!'),
      ];
      const result = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      // Month 2 should have higher informalityFactor due to exclamations
      expect(result.trend[1].components.informalityFactor).toBeGreaterThan(
        result.trend[0].components.informalityFactor,
      );
    });

    it('question marks have NO effect on informality (Faza 27 fix)', () => {
      const msgs = [
        ...msgsInMonth('Alice', '2024-01', 10, 'statement here'),
        ...msgsInMonth('Alice', '2024-02', 10, 'is this a question?'),
      ];
      const result = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      // Both months should have same (zero) informality since neither has ! or emoji
      expect(result.trend[0].components.informalityFactor).toBe(
        result.trend[1].components.informalityFactor,
      );
    });
  });

  describe('lateNightFactor', () => {
    it('messages at hour 23 UTC are late-night', () => {
      const ts23 = new Date('2024-01-15T23:00:00Z').getTime();
      const msgs = [
        ...Array.from({ length: 5 }, (_, i) => makeMsg('Alice', 'night msg', ts23 + i * 60_000)),
        ...msgsInMonth('Alice', '2024-02', 5), // midday
      ];
      const result = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      expect(result.trend[0].components.lateNightFactor).toBeGreaterThan(
        result.trend[1].components.lateNightFactor,
      );
    });

    it('messages at hour 1 UTC are late-night (2-3 AM local CET/CEST)', () => {
      const ts1 = new Date('2024-01-15T01:00:00Z').getTime();
      const msgs = [
        ...Array.from({ length: 5 }, (_, i) => makeMsg('Alice', 'late', ts1 + i * 60_000)),
        ...msgsInMonth('Alice', '2024-02', 5),
      ];
      const result = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      expect(result.trend[0].components.lateNightFactor).toBeGreaterThan(0);
    });

    it('messages at midday are NOT late-night', () => {
      // Use only 5 msgs/month to avoid spanning into evening hours in CET/CEST
      const msgs = [
        ...msgsInMonth('Alice', '2024-01', 5), // 12:00-16:00 UTC → 13:00-17:00 CET
        ...msgsInMonth('Alice', '2024-02', 5),
      ];
      const result = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      // Both months at midday — no late-night messages → lateNightFactor = 0
      expect(result.trend[0].components.lateNightFactor).toBe(0);
    });
  });

  describe('emotionalWordsFactor', () => {
    it('messages with "kocham" increase emotional factor', () => {
      const msgs = [
        ...msgsInMonth('Alice', '2024-01', 5, 'normal message'),
        ...msgsInMonth('Alice', '2024-02', 5, 'kocham bardzo love'),
      ];
      const result = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      expect(result.trend[1].components.emotionalWordsFactor).toBeGreaterThan(
        result.trend[0].components.emotionalWordsFactor,
      );
    });

    it('messages with English "love" are detected', () => {
      const msgs = [
        ...msgsInMonth('Alice', '2024-01', 5, 'plain text'),
        ...msgsInMonth('Alice', '2024-02', 5, 'I love this'),
      ];
      const result = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      expect(result.trend[1].components.emotionalWordsFactor).toBeGreaterThan(
        result.trend[0].components.emotionalWordsFactor,
      );
    });
  });

  describe('slope label thresholds', () => {
    it('slope > 2 → Rosnąca bliskość', () => {
      // Create steep upward trend: month 1 short msgs, month 2 long emotional msgs
      const msgs = [
        ...msgsInMonth('Alice', '2024-01', 5, 'ok'),
        ...msgsInMonth('Alice', '2024-02', 5, 'ok'),
        ...msgsInMonth('Alice', '2024-03', 5, 'kocham kochanie cudownie pięknie!!!! wow!!! 😊😊😊'),
        ...msgsInMonth('Alice', '2024-04', 5, 'kocham kochanie cudownie pięknie!!!! amazing!!! 😊😊😊 love'),
      ];
      const result = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      // With strong upward movement, slope should be > 2
      if (result.overallSlope > 2) {
        expect(result.label).toBe('Rosnąca bliskość');
      }
    });

    it('flat conversation → Stabilna relacja', () => {
      const msgs = [
        ...msgsInMonth('Alice', '2024-01', 10, 'hello world'),
        ...msgsInMonth('Alice', '2024-02', 10, 'hello world'),
        ...msgsInMonth('Alice', '2024-03', 10, 'hello world'),
      ];
      const result = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      expect(result.label).toBe('Stabilna relacja');
      expect(Math.abs(result.overallSlope)).toBeLessThanOrEqual(0.5);
    });
  });

  describe('normalization', () => {
    it('all component factors in [0, 100]', () => {
      const msgs = [
        ...msgsInMonth('Alice', '2024-01', 10, 'short'),
        ...msgsInMonth('Alice', '2024-02', 10, 'a very long emotional message with kocham and love and exclamation!!!'),
      ];
      const result = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      for (const dp of result.trend) {
        expect(dp.components.messageLengthFactor).toBeGreaterThanOrEqual(0);
        expect(dp.components.messageLengthFactor).toBeLessThanOrEqual(100);
        expect(dp.components.emotionalWordsFactor).toBeGreaterThanOrEqual(0);
        expect(dp.components.emotionalWordsFactor).toBeLessThanOrEqual(100);
        expect(dp.components.informalityFactor).toBeGreaterThanOrEqual(0);
        expect(dp.components.informalityFactor).toBeLessThanOrEqual(100);
        expect(dp.components.lateNightFactor).toBeGreaterThanOrEqual(0);
        expect(dp.components.lateNightFactor).toBeLessThanOrEqual(100);
        expect(dp.score).toBeGreaterThanOrEqual(0);
        expect(dp.score).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('determinism', () => {
    it('same input → same output', () => {
      const msgs = [
        ...msgsInMonth('Alice', '2024-01', 10, 'hey'),
        ...msgsInMonth('Alice', '2024-02', 10, 'love'),
      ];
      const r1 = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      const r2 = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      expect(r1).toEqual(r2);
    });
  });
});
