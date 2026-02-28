import { describe, it, expect } from 'vitest';
import { computeTrendPercent, computeKPICards } from '@/lib/analysis/kpi-utils';
import { makeQuant, makeConversation, makeMsg, BASE_TS, HOUR } from '@/lib/__tests__/fixtures';

// ── computeTrendPercent ──────────────────────────────────────

describe('computeTrendPercent', () => {
  describe('insufficient data', () => {
    it('empty array → 0', () => {
      expect(computeTrendPercent([], 3)).toBe(0);
    });

    it('single element → 0', () => {
      expect(computeTrendPercent([100], 3)).toBe(0);
    });
  });

  describe('short data fallback (length < recentN * 2)', () => {
    it('[100, 200] → 100% increase', () => {
      expect(computeTrendPercent([100, 200], 3)).toBe(100);
    });

    it('[200, 100] → -50% decrease', () => {
      expect(computeTrendPercent([200, 100], 3)).toBe(-50);
    });

    it('[100, 100] → 0 (no change)', () => {
      expect(computeTrendPercent([100, 100], 3)).toBe(0);
    });

    it('[0, 100] → 100 (zero previous, positive new)', () => {
      expect(computeTrendPercent([0, 100], 3)).toBe(100);
    });

    it('[0, 0] → 0 (both zero)', () => {
      expect(computeTrendPercent([0, 0], 3)).toBe(0);
    });

    it('3 elements with recentN=3 → fallback (3 < 6)', () => {
      // mid = floor(3/2) = 1; older=[100], newer=[200,300]; avgOld=100, avgNew=250 → 150%
      expect(computeTrendPercent([100, 200, 300], 3)).toBe(150);
    });
  });

  describe('normal path (length >= recentN * 2)', () => {
    it('6 elements, recentN=3: [100,100,100, 200,200,200] → 100%', () => {
      expect(computeTrendPercent([100, 100, 100, 200, 200, 200], 3)).toBe(100);
    });

    it('uses last 2*recentN elements only', () => {
      // 8 elements, recentN=3: recent=[60,60,60], previous=[40,40,40] → 50%
      expect(computeTrendPercent([10, 20, 40, 40, 40, 60, 60, 60], 3)).toBe(50);
    });

    it('zero previous avg → 100 if recent > 0', () => {
      expect(computeTrendPercent([0, 0, 0, 10, 10, 10], 3)).toBe(100);
    });

    it('zero both → 0', () => {
      expect(computeTrendPercent([0, 0, 0, 0, 0, 0], 3)).toBe(0);
    });

    it('decrease rounds correctly: [100,100,100, 70,70,70] → -30%', () => {
      expect(computeTrendPercent([100, 100, 100, 70, 70, 70], 3)).toBe(-30);
    });
  });

  describe('determinism', () => {
    it('same input → same output', () => {
      const data = [50, 80, 100, 120, 150, 200];
      expect(computeTrendPercent(data, 3)).toBe(computeTrendPercent(data, 3));
    });
  });
});

// ── computeKPICards ──────────────────────────────────────────

describe('computeKPICards', () => {
  function makeKPIData() {
    const quant = makeQuant({
      perPerson: {
        Alice: { totalWords: 5000, averageMessageLength: 10, reactionsGiven: 30 } as never,
        Bob: { totalWords: 3000, averageMessageLength: 6, reactionsGiven: 20 } as never,
      },
      timing: {
        perPerson: {
          Alice: { medianResponseTimeMs: 120_000 }, // 2 min
          Bob: { medianResponseTimeMs: 180_000 },   // 3 min
        },
        conversationInitiations: { Alice: 60, Bob: 40 },
      } as never,
      trends: {
        responseTimeTrend: [],
        messageLengthTrend: [],
        initiationTrend: [],
      },
      patterns: {
        monthlyVolume: [
          { month: '2024-01', perPerson: { Alice: 200, Bob: 100 }, total: 300 },
          { month: '2024-02', perPerson: { Alice: 200, Bob: 100 }, total: 300 },
        ],
        volumeTrend: 0,
      } as never,
    }, ['Alice', 'Bob']);

    const conv = makeConversation(['Alice', 'Bob'], [
      makeMsg('Alice', 'hi', BASE_TS),
      makeMsg('Bob', 'hello', BASE_TS + HOUR),
    ], {
      metadata: {
        totalMessages: 5000,
        durationDays: 100,
        dateRange: { start: BASE_TS, end: BASE_TS + 100 * 86_400_000 },
        isGroup: false,
      } as never,
    });

    return { quant, conv };
  }

  it('returns exactly 4 cards', () => {
    const { quant, conv } = makeKPIData();
    const cards = computeKPICards(quant, conv);
    expect(cards).toHaveLength(4);
  });

  it('card ids are correct', () => {
    const { quant, conv } = makeKPIData();
    const ids = computeKPICards(quant, conv).map(c => c.id);
    expect(ids).toEqual(['avg-response-time', 'messages-per-day', 'total-reactions', 'initiation-ratio']);
  });

  it('card 0: avg response time = avg of Alice(120s) + Bob(180s) = 150s → "2m 30s"', () => {
    const { quant, conv } = makeKPIData();
    const card = computeKPICards(quant, conv)[0];
    expect(card.numericValue).toBe(150_000);
    expect(card.value).toBe('2m 30s');
    expect(card.iconColor).toBe('blue');
    expect(card.iconType).toBe('clock');
  });

  it('card 1: messages/day = 5000/100 = 50.0', () => {
    const { quant, conv } = makeKPIData();
    const card = computeKPICards(quant, conv)[1];
    expect(card.numericValue).toBe(50);
    expect(card.value).toBe('50.0');
    expect(card.iconColor).toBe('purple');
  });

  it('card 2: total reactions = 30 + 20 = 50', () => {
    const { quant, conv } = makeKPIData();
    const card = computeKPICards(quant, conv)[2];
    expect(card.numericValue).toBe(50);
    expect(card.iconColor).toBe('emerald');
  });

  it('card 3: initiation ratio — Alice dominant (60/100 = 60%)', () => {
    const { quant, conv } = makeKPIData();
    const card = computeKPICards(quant, conv)[3];
    expect(card.numericValue).toBe(60);
    expect(card.value).toBe('60%');
    expect(card.label).toContain('Alice');
    expect(card.iconColor).toBe('amber');
  });

  it('each card has trendDirection ∈ {up, down, neutral}', () => {
    const { quant, conv } = makeKPIData();
    for (const card of computeKPICards(quant, conv)) {
      expect(['up', 'down', 'neutral']).toContain(card.trendDirection);
    }
  });

  it('empty trends → trendPercent = 0 for all cards', () => {
    const { quant, conv } = makeKPIData();
    for (const card of computeKPICards(quant, conv)) {
      expect(card.trendPercent).toBe(0);
    }
  });

  describe('formatResponseTime via card value', () => {
    it('< 60s → seconds format', () => {
      const quant = makeQuant({
        timing: {
          perPerson: {
            Alice: { medianResponseTimeMs: 30_000 },
            Bob: { medianResponseTimeMs: 30_000 },
          },
          conversationInitiations: { Alice: 10, Bob: 10 },
        } as never,
      }, ['Alice', 'Bob']);
      const conv = makeConversation(['Alice', 'Bob'], [], {
        metadata: { totalMessages: 100, durationDays: 10, dateRange: { start: 0, end: 0 }, isGroup: false } as never,
      });
      const card = computeKPICards(quant, conv)[0];
      expect(card.value).toBe('30s');
    });

    it('>= 1h → hours format', () => {
      const quant = makeQuant({
        timing: {
          perPerson: {
            Alice: { medianResponseTimeMs: 5_400_000 }, // 1h 30m
            Bob: { medianResponseTimeMs: 5_400_000 },
          },
          conversationInitiations: { Alice: 10, Bob: 10 },
        } as never,
      }, ['Alice', 'Bob']);
      const conv = makeConversation(['Alice', 'Bob'], [], {
        metadata: { totalMessages: 100, durationDays: 10, dateRange: { start: 0, end: 0 }, isGroup: false } as never,
      });
      const card = computeKPICards(quant, conv)[0];
      expect(card.value).toBe('1h 30m');
    });
  });
});
