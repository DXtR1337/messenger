import { describe, it, expect } from 'vitest';
import {
  computeHealthScore,
  getHealthScoreLabel,
  normalizeByVolume,
  HEALTH_SCORE_WEIGHTS,
} from '@/lib/analysis/health-score';
import type { HealthScoreComponents } from '@/lib/analysis/health-score';

function makeComponents(overrides?: Partial<HealthScoreComponents>): HealthScoreComponents {
  return {
    balance: 50,
    reciprocity: 50,
    response_pattern: 50,
    emotional_safety: 50,
    growth_trajectory: 50,
    ...overrides,
  };
}

describe('HEALTH_SCORE_WEIGHTS', () => {
  it('weights sum to 1.0', () => {
    const sum = HEALTH_SCORE_WEIGHTS.BALANCE +
      HEALTH_SCORE_WEIGHTS.RECIPROCITY +
      HEALTH_SCORE_WEIGHTS.RESPONSE_PATTERN +
      HEALTH_SCORE_WEIGHTS.EMOTIONAL_SAFETY +
      HEALTH_SCORE_WEIGHTS.GROWTH;
    expect(sum).toBe(1.0);
  });
});

describe('computeHealthScore', () => {
  describe('weighted formula', () => {
    it('all components=0 → overall=0', () => {
      const result = computeHealthScore(makeComponents({
        balance: 0, reciprocity: 0, response_pattern: 0, emotional_safety: 0, growth_trajectory: 0,
      }));
      expect(result.overall).toBe(0);
    });

    it('all components=100 → overall=100', () => {
      const result = computeHealthScore(makeComponents({
        balance: 100, reciprocity: 100, response_pattern: 100, emotional_safety: 100, growth_trajectory: 100,
      }));
      expect(result.overall).toBe(100);
    });

    it('all components=50 → overall=50', () => {
      const result = computeHealthScore(makeComponents());
      expect(result.overall).toBe(50);
    });

    it('verifies exact formula: b*0.25 + r*0.20 + rp*0.20 + es*0.20 + g*0.15', () => {
      const result = computeHealthScore(makeComponents({
        balance: 80, reciprocity: 60, response_pattern: 70, emotional_safety: 50, growth_trajectory: 40,
      }));
      // 80*0.25 + 60*0.20 + 70*0.20 + 50*0.20 + 40*0.15 = 20+12+14+10+6 = 62
      expect(result.overall).toBe(62);
    });

    it('another formula check', () => {
      const result = computeHealthScore(makeComponents({
        balance: 100, reciprocity: 0, response_pattern: 0, emotional_safety: 0, growth_trajectory: 0,
      }));
      // 100*0.25 = 25
      expect(result.overall).toBe(25);
    });
  });

  describe('clamping', () => {
    it('never exceeds 100', () => {
      const result = computeHealthScore(makeComponents({
        balance: 100, reciprocity: 100, response_pattern: 100, emotional_safety: 100, growth_trajectory: 100,
      }));
      expect(result.overall).toBeLessThanOrEqual(100);
    });

    it('never below 0', () => {
      const result = computeHealthScore(makeComponents({
        balance: 0, reciprocity: 0, response_pattern: 0, emotional_safety: 0, growth_trajectory: 0,
      }));
      expect(result.overall).toBeGreaterThanOrEqual(0);
    });
  });

  describe('label assignment', () => {
    it('overall=80 → Zdrowa', () => {
      const result = computeHealthScore(makeComponents({
        balance: 80, reciprocity: 80, response_pattern: 80, emotional_safety: 80, growth_trajectory: 80,
      }));
      expect(result.label).toBe('Zdrowa');
    });

    it('overall=62 → Stabilna', () => {
      const result = computeHealthScore(makeComponents({
        balance: 80, reciprocity: 60, response_pattern: 70, emotional_safety: 50, growth_trajectory: 40,
      }));
      expect(result.label).toBe('Stabilna');
    });
  });

  describe('explanation', () => {
    it('auto-generates explanation when none provided', () => {
      const result = computeHealthScore(makeComponents());
      expect(result.explanation).toBeTruthy();
      expect(typeof result.explanation).toBe('string');
    });

    it('uses custom explanation when provided', () => {
      const result = computeHealthScore(makeComponents(), 'Custom explanation');
      expect(result.explanation).toBe('Custom explanation');
    });

    it('mentions weakest component when < 50', () => {
      const result = computeHealthScore(makeComponents({
        balance: 80, reciprocity: 80, response_pattern: 80, emotional_safety: 30, growth_trajectory: 80,
      }));
      expect(result.explanation).toContain('bezpieczeństwo emocjonalne');
    });

    it('mentions strongest component when >= 70', () => {
      const result = computeHealthScore(makeComponents({
        balance: 90, reciprocity: 40, response_pattern: 40, emotional_safety: 40, growth_trajectory: 40,
      }));
      expect(result.explanation).toContain('równowaga sił');
    });
  });

  describe('output shape', () => {
    it('has overall, components, label, explanation', () => {
      const result = computeHealthScore(makeComponents());
      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('components');
      expect(result).toHaveProperty('label');
      expect(result).toHaveProperty('explanation');
    });

    it('overall is an integer', () => {
      const result = computeHealthScore(makeComponents({ balance: 33, reciprocity: 77 }));
      expect(Number.isInteger(result.overall)).toBe(true);
    });
  });
});

describe('getHealthScoreLabel', () => {
  it('80 → Zdrowa', () => expect(getHealthScoreLabel(80)).toBe('Zdrowa'));
  it('100 → Zdrowa', () => expect(getHealthScoreLabel(100)).toBe('Zdrowa'));
  it('79 → Stabilna', () => expect(getHealthScoreLabel(79)).toBe('Stabilna'));
  it('60 → Stabilna', () => expect(getHealthScoreLabel(60)).toBe('Stabilna'));
  it('59 → Wymaga uwagi', () => expect(getHealthScoreLabel(59)).toBe('Wymaga uwagi'));
  it('40 → Wymaga uwagi', () => expect(getHealthScoreLabel(40)).toBe('Wymaga uwagi'));
  it('39 → Niepokojąca', () => expect(getHealthScoreLabel(39)).toBe('Niepokojąca'));
  it('0 → Niepokojąca', () => expect(getHealthScoreLabel(0)).toBe('Niepokojąca'));
});

describe('normalizeByVolume', () => {
  it('totalMessages < minMessages → penalty applied', () => {
    // value=100, total=25, min=50 → 100 * (25/50) = 50
    expect(normalizeByVolume(100, 25, 50)).toBe(50);
  });

  it('totalMessages = minMessages → no penalty, log factor applied', () => {
    const result = normalizeByVolume(100, 50);
    // logFactor = log10(50)/log10(10000) ≈ 1.699/4 ≈ 0.4247
    // result = 100 * (0.7 + 0.3 * 0.4247) = 100 * 0.8274 ≈ 82.74
    expect(result).toBeGreaterThan(80);
    expect(result).toBeLessThan(90);
  });

  it('totalMessages = 10000 → full scale', () => {
    const result = normalizeByVolume(100, 10000);
    // logFactor = log10(10000)/log10(10000) = 1
    // result = 100 * (0.7 + 0.3 * 1) = 100 * 1.0 = 100
    expect(result).toBe(100);
  });

  it('totalMessages > 10000 → capped at 10000', () => {
    const result = normalizeByVolume(100, 50000);
    // min(50000, 10000) = 10000, same as above
    expect(result).toBe(100);
  });

  it('totalMessages = 1 → heavy penalty', () => {
    // value=100, total=1, min=50 → 100 * (1/50) = 2
    expect(normalizeByVolume(100, 1, 50)).toBe(2);
  });

  it('returns positive for positive inputs', () => {
    expect(normalizeByVolume(80, 100)).toBeGreaterThan(0);
  });
});
