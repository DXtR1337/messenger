import { describe, it, expect } from 'vitest';
import {
  getPercentile,
  getAllPercentiles,
  getPercentileForKPI,
} from '@/lib/analysis/percentiles';

describe('getPercentile', () => {
  describe('responseTimeMinutes (lower is better)', () => {
    it('4 min (< 5 threshold) → percentile=90', () => {
      expect(getPercentile('responseTimeMinutes', 4).percentile).toBe(90);
    });

    it('5 min (= threshold, <=) → percentile=90', () => {
      expect(getPercentile('responseTimeMinutes', 5).percentile).toBe(90);
    });

    it('6 min (> 5, <= 15) → percentile=75', () => {
      expect(getPercentile('responseTimeMinutes', 6).percentile).toBe(75);
    });

    it('15 min (= threshold) → percentile=75', () => {
      expect(getPercentile('responseTimeMinutes', 15).percentile).toBe(75);
    });

    it('16 min (> 15, <= 60) → percentile=50', () => {
      expect(getPercentile('responseTimeMinutes', 16).percentile).toBe(50);
    });

    it('60 min → percentile=50', () => {
      expect(getPercentile('responseTimeMinutes', 60).percentile).toBe(50);
    });

    it('61 min (> 60, <= 240) → percentile=25', () => {
      expect(getPercentile('responseTimeMinutes', 61).percentile).toBe(25);
    });

    it('240 min → percentile=25', () => {
      expect(getPercentile('responseTimeMinutes', 240).percentile).toBe(25);
    });

    it('241 min (> 240) → default percentile=10', () => {
      expect(getPercentile('responseTimeMinutes', 241).percentile).toBe(10);
    });
  });

  describe('messagesPerDay (higher is better)', () => {
    it('50/day (>= 50) → percentile=95', () => {
      expect(getPercentile('messagesPerDay', 50).percentile).toBe(95);
    });

    it('51/day → percentile=95', () => {
      expect(getPercentile('messagesPerDay', 51).percentile).toBe(95);
    });

    it('20/day → percentile=85', () => {
      expect(getPercentile('messagesPerDay', 20).percentile).toBe(85);
    });

    it('10/day → percentile=70', () => {
      expect(getPercentile('messagesPerDay', 10).percentile).toBe(70);
    });

    it('5/day → percentile=50', () => {
      expect(getPercentile('messagesPerDay', 5).percentile).toBe(50);
    });

    it('4/day (below all) → default=10', () => {
      expect(getPercentile('messagesPerDay', 4).percentile).toBe(10);
    });
  });

  describe('healthScore (higher is better)', () => {
    it('80 → percentile=90', () => {
      expect(getPercentile('healthScore', 80).percentile).toBe(90);
    });

    it('79 (< 80, >= 65) → percentile=75', () => {
      expect(getPercentile('healthScore', 79).percentile).toBe(75);
    });

    it('65 → percentile=75', () => {
      expect(getPercentile('healthScore', 65).percentile).toBe(75);
    });

    it('50 → percentile=50', () => {
      expect(getPercentile('healthScore', 50).percentile).toBe(50);
    });

    it('35 → percentile=25', () => {
      expect(getPercentile('healthScore', 35).percentile).toBe(25);
    });

    it('34 (below all) → default=10', () => {
      expect(getPercentile('healthScore', 34).percentile).toBe(10);
    });
  });

  describe('formatLabel', () => {
    it('percentile=90 → Top 10%', () => {
      expect(getPercentile('healthScore', 80).label).toBe('Top 10%');
    });

    it('percentile=75 → Top 25%', () => {
      expect(getPercentile('healthScore', 65).label).toBe('Top 25%');
    });

    it('percentile=50 → Top 50%', () => {
      expect(getPercentile('healthScore', 50).label).toBe('Top 50%');
    });

    it('percentile=25 → Bottom 75%', () => {
      expect(getPercentile('healthScore', 35).label).toBe('Bottom 75%');
    });

    it('percentile=10 → Bottom 90%', () => {
      expect(getPercentile('healthScore', 10).label).toBe('Bottom 90%');
    });
  });

  describe('formatLabelPl', () => {
    it('percentile >=50 → Top N%', () => {
      expect(getPercentile('healthScore', 80).labelPl).toBe('Top 10%');
    });

    it('percentile <50 → Dolne N%', () => {
      expect(getPercentile('healthScore', 35).labelPl).toBe('Dolne 75%');
    });

    it('percentile=10 → Dolne 90%', () => {
      expect(getPercentile('healthScore', 10).labelPl).toBe('Dolne 90%');
    });
  });

  describe('output shape', () => {
    it('has metric, value, percentile, label, labelPl', () => {
      const result = getPercentile('healthScore', 75);
      expect(result).toHaveProperty('metric');
      expect(result).toHaveProperty('value');
      expect(result).toHaveProperty('percentile');
      expect(result).toHaveProperty('label');
      expect(result).toHaveProperty('labelPl');
    });

    it('metric is Polish name', () => {
      expect(getPercentile('responseTimeMinutes', 5).metric).toBe('Czas odpowiedzi');
      expect(getPercentile('messagesPerDay', 10).metric).toBe('Wiadomości/dzień');
    });
  });
});

describe('getAllPercentiles', () => {
  it('no fields → empty array', () => {
    expect(getAllPercentiles({})).toEqual([]);
  });

  it('responseTimeMs=0 → omitted (guard: > 0)', () => {
    expect(getAllPercentiles({ responseTimeMs: 0 })).toEqual([]);
  });

  it('responseTimeMs=300000 (5min) → included, converts to minutes', () => {
    const results = getAllPercentiles({ responseTimeMs: 300_000 });
    expect(results).toHaveLength(1);
    expect(results[0].percentile).toBe(90); // 5 min = top 10%
  });

  it('all 5 fields → returns 5 results', () => {
    const results = getAllPercentiles({
      responseTimeMs: 300_000,
      messagesPerDay: 25,
      healthScore: 75,
      uniqueEmoji: 15,
      monthsSpan: 24,
    });
    expect(results).toHaveLength(5);
  });

  it('messagesPerDay=0 → omitted', () => {
    expect(getAllPercentiles({ messagesPerDay: 0 })).toEqual([]);
  });
});

describe('getPercentileForKPI', () => {
  it('avg-response-time with valid ms → converts to minutes', () => {
    const result = getPercentileForKPI('avg-response-time', 300_000);
    expect(result).not.toBeNull();
    expect(result!.percentile).toBe(90); // 5 min
  });

  it('avg-response-time with 0 → null', () => {
    expect(getPercentileForKPI('avg-response-time', 0)).toBeNull();
  });

  it('avg-response-time with negative → null', () => {
    expect(getPercentileForKPI('avg-response-time', -1)).toBeNull();
  });

  it('messages-per-day with valid value', () => {
    const result = getPercentileForKPI('messages-per-day', 25);
    expect(result).not.toBeNull();
    expect(result!.percentile).toBe(85);
  });

  it('messages-per-day with 0 → null', () => {
    expect(getPercentileForKPI('messages-per-day', 0)).toBeNull();
  });

  it('unknown card id → null', () => {
    expect(getPercentileForKPI('unknown-card', 100)).toBeNull();
  });
});
