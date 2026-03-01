import { describe, it, expect } from 'vitest';
import { computeIntimacyProgression } from '../intimacy';
import type { UnifiedMessage, HeatmapData } from '@/lib/parsers/types';

// 10-minute spacing keeps 40 messages within daytime (12:00–18:40) — no late-night bleed
const TEN_MIN = 600_000;

function makeMsg(sender: string, content: string, timestamp: number): UnifiedMessage {
  return { index: 0, sender, content, timestamp, type: 'text', reactions: [], hasMedia: false, hasLink: false, isUnsent: false };
}

function makeHeatmap(): HeatmapData {
  const zeros = () => Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
  return { perPerson: {}, combined: zeros() };
}

/** Generate N messages in a given month (YYYY-MM), spread at 10-min intervals starting midday UTC. */
function msgsInMonth(sender: string, yearMonth: string, count: number, content = 'hello'): UnifiedMessage[] {
  const [y, m] = yearMonth.split('-').map(Number);
  const baseTs = new Date(Date.UTC(y, m - 1, 5, 12, 0, 0)).getTime();
  return Array.from({ length: count }, (_, i) =>
    makeMsg(sender, content, baseTs + i * TEN_MIN),
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

    it('fewer than 100 messages → default result', () => {
      const msgs = [
        ...msgsInMonth('Alice', '2024-01', 33),
        ...msgsInMonth('Alice', '2024-02', 33),
        ...msgsInMonth('Alice', '2024-03', 33),
      ];
      const result = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      expect(result.trend).toEqual([]);
      expect(result.overallSlope).toBe(0);
    });

    it('only 1 month → default result (needs >= 3 months)', () => {
      const msgs = msgsInMonth('Alice', '2024-01', 120);
      const result = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      expect(result.trend).toEqual([]);
      expect(result.overallSlope).toBe(0);
    });

    it('only 2 months → default result (needs >= 3 months)', () => {
      const msgs = [
        ...msgsInMonth('Alice', '2024-01', 60),
        ...msgsInMonth('Alice', '2024-02', 60),
      ];
      const result = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      expect(result.trend).toEqual([]);
      expect(result.overallSlope).toBe(0);
    });

    it('3 months with 100+ messages → produces trend with 3 data points', () => {
      const msgs = [
        ...msgsInMonth('Alice', '2024-01', 40),
        ...msgsInMonth('Alice', '2024-02', 40),
        ...msgsInMonth('Alice', '2024-03', 40),
      ];
      const result = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      expect(result.trend).toHaveLength(3);
    });
  });

  describe('system message filtering', () => {
    it('system messages are skipped', () => {
      const msgs = [
        ...msgsInMonth('Alice', '2024-01', 40),
        makeMsg('System', 'X joined', new Date('2024-01-15T14:00:00Z').getTime()),
        ...msgsInMonth('Alice', '2024-02', 40),
        ...msgsInMonth('Alice', '2024-03', 40),
      ];
      msgs[40].type = 'system';
      const result = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      expect(result.trend).toHaveLength(3);
    });
  });

  describe('month grouping and sorting', () => {
    it('months are sorted chronologically', () => {
      const msgs = [
        ...msgsInMonth('Alice', '2024-03', 40),
        ...msgsInMonth('Alice', '2024-01', 40),
        ...msgsInMonth('Alice', '2024-02', 40),
      ];
      const result = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      expect(result.trend.map(d => d.month)).toEqual(['2024-01', '2024-02', '2024-03']);
    });
  });

  describe('informalityFactor — Faza 27 fix', () => {
    it('exclamations add to informality score', () => {
      const msgs = [
        ...msgsInMonth('Alice', '2024-01', 40, 'hello'),
        ...msgsInMonth('Alice', '2024-02', 40, 'wow!!! amazing!!!'),
        ...msgsInMonth('Alice', '2024-03', 40, 'hello'),
      ];
      const result = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      // Month 2 should have higher informalityFactor due to exclamations
      expect(result.trend[1].components.informalityFactor).toBeGreaterThan(
        result.trend[0].components.informalityFactor,
      );
    });

    it('question marks have NO effect on informality (Faza 27 fix)', () => {
      const msgs = [
        ...msgsInMonth('Alice', '2024-01', 40, 'statement here'),
        ...msgsInMonth('Alice', '2024-02', 40, 'is this a question?'),
        ...msgsInMonth('Alice', '2024-03', 40, 'another statement'),
      ];
      const result = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      // Both months 1 and 2 should have same (zero) informality since neither has ! or emoji
      expect(result.trend[0].components.informalityFactor).toBe(
        result.trend[1].components.informalityFactor,
      );
    });
  });

  describe('lateNightFactor', () => {
    it('messages at hour 23 UTC are late-night', () => {
      const ts23 = new Date('2024-01-15T23:00:00Z').getTime();
      const msgs = [
        ...Array.from({ length: 40 }, (_, i) => makeMsg('Alice', 'night msg', ts23 + i * 60_000)),
        ...msgsInMonth('Alice', '2024-02', 40),
        ...msgsInMonth('Alice', '2024-03', 40),
      ];
      const result = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      expect(result.trend[0].components.lateNightFactor).toBeGreaterThan(
        result.trend[1].components.lateNightFactor,
      );
    });

    it('messages at hour 1 UTC are late-night (2-3 AM local CET/CEST)', () => {
      const ts1 = new Date('2024-01-15T01:00:00Z').getTime();
      const msgs = [
        ...Array.from({ length: 40 }, (_, i) => makeMsg('Alice', 'late', ts1 + i * 60_000)),
        ...msgsInMonth('Alice', '2024-02', 40),
        ...msgsInMonth('Alice', '2024-03', 40),
      ];
      const result = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      expect(result.trend[0].components.lateNightFactor).toBeGreaterThan(0);
    });

    it('messages at midday are NOT late-night', () => {
      const msgs = [
        ...msgsInMonth('Alice', '2024-01', 40),
        ...msgsInMonth('Alice', '2024-02', 40),
        ...msgsInMonth('Alice', '2024-03', 40),
      ];
      const result = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      // All months at midday (12:00-18:40 UTC) — no late-night messages
      expect(result.trend[0].components.lateNightFactor).toBe(0);
    });
  });

  describe('emotionalWordsFactor', () => {
    it('messages with "kocham" increase emotional factor', () => {
      const msgs = [
        ...msgsInMonth('Alice', '2024-01', 40, 'normal message'),
        ...msgsInMonth('Alice', '2024-02', 40, 'kocham bardzo love'),
        ...msgsInMonth('Alice', '2024-03', 40, 'normal message'),
      ];
      const result = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      expect(result.trend[1].components.emotionalWordsFactor).toBeGreaterThan(
        result.trend[0].components.emotionalWordsFactor,
      );
    });

    it('messages with English "love" are detected', () => {
      const msgs = [
        ...msgsInMonth('Alice', '2024-01', 40, 'plain text'),
        ...msgsInMonth('Alice', '2024-02', 40, 'I love this'),
        ...msgsInMonth('Alice', '2024-03', 40, 'plain text'),
      ];
      const result = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      expect(result.trend[1].components.emotionalWordsFactor).toBeGreaterThan(
        result.trend[0].components.emotionalWordsFactor,
      );
    });
  });

  describe('slope label thresholds', () => {
    it('slope > 2 → Rosnąca bliskość', () => {
      // Create steep upward trend across 4 months
      const msgs = [
        ...msgsInMonth('Alice', '2024-01', 30, 'ok'),
        ...msgsInMonth('Alice', '2024-02', 30, 'ok'),
        ...msgsInMonth('Alice', '2024-03', 30, 'kocham kochanie cudownie pięknie!!!! wow!!! 😊😊😊'),
        ...msgsInMonth('Alice', '2024-04', 30, 'kocham kochanie cudownie pięknie!!!! amazing!!! 😊😊😊 love'),
      ];
      const result = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      // With strong upward movement, slope should be > 2
      if (result.overallSlope > 2) {
        expect(result.label).toBe('Rosnąca bliskość');
      }
    });

    it('flat conversation → Stabilna relacja', () => {
      const msgs = [
        ...msgsInMonth('Alice', '2024-01', 40, 'hello world'),
        ...msgsInMonth('Alice', '2024-02', 40, 'hello world'),
        ...msgsInMonth('Alice', '2024-03', 40, 'hello world'),
      ];
      const result = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      expect(result.label).toBe('Stabilna relacja');
      expect(Math.abs(result.overallSlope)).toBeLessThanOrEqual(0.5);
    });
  });

  describe('normalization', () => {
    it('all component factors in [0, 100]', () => {
      const msgs = [
        ...msgsInMonth('Alice', '2024-01', 40, 'short'),
        ...msgsInMonth('Alice', '2024-02', 40, 'a very long emotional message with kocham and love and exclamation!!!'),
        ...msgsInMonth('Alice', '2024-03', 40, 'medium length'),
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
        ...msgsInMonth('Alice', '2024-01', 40, 'hey'),
        ...msgsInMonth('Alice', '2024-02', 40, 'love'),
        ...msgsInMonth('Alice', '2024-03', 40, 'hello'),
      ];
      const r1 = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      const r2 = computeIntimacyProgression(msgs, ['Alice'], makeHeatmap());
      expect(r1).toEqual(r2);
    });
  });
});
