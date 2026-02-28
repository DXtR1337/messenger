import { describe, it, expect } from 'vitest';
import { computeRankingPercentiles } from '@/lib/analysis/ranking-percentiles';
import { makeQuant } from '@/lib/__tests__/fixtures';
import type { QuantitativeAnalysis } from '@/lib/parsers/types';

/** Build a quant with complete timing structure for ranking tests. */
function makeRankingQuant(opts?: {
  msgA?: number; msgB?: number;
  rtA?: number; rtB?: number;
  silenceMs?: number;
  initA?: number; initB?: number;
}): QuantitativeAnalysis {
  const msgA = opts?.msgA ?? 1500;
  const msgB = opts?.msgB ?? 1500;
  const rtA = opts?.rtA ?? 300_000;
  const rtB = opts?.rtB ?? 300_000;
  const silenceMs = opts?.silenceMs ?? 43_200_000; // 12h default
  const initA = opts?.initA ?? 50;
  const initB = opts?.initB ?? 50;

  return makeQuant({
    perPerson: {
      Alice: { totalMessages: msgA } as never,
      Bob: { totalMessages: msgB } as never,
    },
    timing: {
      perPerson: {
        Alice: { medianResponseTimeMs: rtA },
        Bob: { medianResponseTimeMs: rtB },
      },
      longestSilence: { durationMs: silenceMs, lastSender: 'Alice' },
      conversationInitiations: { Alice: initA, Bob: initB },
    } as never,
  }, ['Alice', 'Bob']);
}

describe('computeRankingPercentiles', () => {
  describe('output structure', () => {
    it('returns 4 rankings', () => {
      const result = computeRankingPercentiles(makeRankingQuant());
      expect(result.rankings).toHaveLength(4);
    });

    it('has correct metric ids', () => {
      const result = computeRankingPercentiles(makeRankingQuant());
      const ids = result.rankings.map(r => r.metric);
      expect(ids).toEqual(['message_volume', 'response_time', 'ghost_frequency', 'asymmetry']);
    });

    it('each ranking has label, value, percentile, emoji', () => {
      const result = computeRankingPercentiles(makeRankingQuant());
      for (const r of result.rankings) {
        expect(r).toHaveProperty('label');
        expect(r).toHaveProperty('value');
        expect(r).toHaveProperty('percentile');
        expect(r).toHaveProperty('emoji');
        expect(typeof r.percentile).toBe('number');
      }
    });

    it('all percentiles in [0, 100]', () => {
      const result = computeRankingPercentiles(makeRankingQuant());
      for (const r of result.rankings) {
        expect(r.percentile).toBeGreaterThanOrEqual(0);
        expect(r.percentile).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('message_volume', () => {
    it('high volume → high percentile', () => {
      const result = computeRankingPercentiles(makeRankingQuant({ msgA: 5000, msgB: 5000 }));
      const vol = result.rankings.find(r => r.metric === 'message_volume')!;
      expect(vol.value).toBe(10000);
      expect(vol.percentile).toBeGreaterThan(70);
    });

    it('low volume → low percentile', () => {
      const result = computeRankingPercentiles(makeRankingQuant({ msgA: 50, msgB: 50 }));
      const vol = result.rankings.find(r => r.metric === 'message_volume')!;
      expect(vol.value).toBe(100);
      expect(vol.percentile).toBeLessThan(50);
    });
  });

  describe('response_time (inverted — faster=better)', () => {
    it('fast response → high percentile', () => {
      const result = computeRankingPercentiles(makeRankingQuant({ rtA: 60_000, rtB: 120_000 }));
      const rt = result.rankings.find(r => r.metric === 'response_time')!;
      expect(rt.percentile).toBeGreaterThan(50);
    });

    it('slow response → low percentile', () => {
      const result = computeRankingPercentiles(makeRankingQuant({ rtA: 3_600_000, rtB: 7_200_000 }));
      const rt = result.rankings.find(r => r.metric === 'response_time')!;
      expect(rt.percentile).toBeLessThan(50);
    });

    it('zero response time → 50 (default)', () => {
      const result = computeRankingPercentiles(makeRankingQuant({ rtA: 0, rtB: 0 }));
      const rt = result.rankings.find(r => r.metric === 'response_time')!;
      expect(rt.percentile).toBe(50);
    });
  });

  describe('ghost_frequency', () => {
    it('short silence → low ghost percentile', () => {
      const result = computeRankingPercentiles(makeRankingQuant({ silenceMs: 3_600_000 })); // 1h
      const ghost = result.rankings.find(r => r.metric === 'ghost_frequency')!;
      expect(ghost.percentile).toBeLessThan(50);
    });

    it('long silence → high ghost percentile', () => {
      const result = computeRankingPercentiles(makeRankingQuant({ silenceMs: 7 * 24 * 3_600_000 })); // 1 week
      const ghost = result.rankings.find(r => r.metric === 'ghost_frequency')!;
      expect(ghost.percentile).toBeGreaterThan(70);
    });
  });

  describe('asymmetry', () => {
    it('balanced initiations → low asymmetry percentile', () => {
      const result = computeRankingPercentiles(makeRankingQuant({ initA: 50, initB: 50 }));
      const asym = result.rankings.find(r => r.metric === 'asymmetry')!;
      expect(asym.percentile).toBeLessThan(50);
    });

    it('imbalanced initiations → higher asymmetry percentile', () => {
      const result = computeRankingPercentiles(makeRankingQuant({ initA: 90, initB: 10 }));
      const asym = result.rankings.find(r => r.metric === 'asymmetry')!;
      expect(asym.percentile).toBeGreaterThan(70);
    });
  });

  describe('CDF monotonicity', () => {
    it('higher message volume → higher or equal percentile', () => {
      const p1 = computeRankingPercentiles(makeRankingQuant({ msgA: 500, msgB: 500 })).rankings[0].percentile;
      const p2 = computeRankingPercentiles(makeRankingQuant({ msgA: 5000, msgB: 5000 })).rankings[0].percentile;
      expect(p2).toBeGreaterThanOrEqual(p1);
    });
  });

  describe('determinism', () => {
    it('same input → same output', () => {
      const quant = makeRankingQuant();
      const r1 = computeRankingPercentiles(quant);
      const r2 = computeRankingPercentiles(quant);
      expect(r1).toEqual(r2);
    });
  });
});
