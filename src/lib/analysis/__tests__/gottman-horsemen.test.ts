import { describe, it, expect } from 'vitest';
import { computeGottmanHorsemen } from '@/lib/analysis/gottman-horsemen';
import type { CPSResult } from '@/lib/analysis/communication-patterns';
import { makeQuant } from '@/lib/__tests__/fixtures';

function makeCPS(overrides?: Partial<Record<string, { yesCount: number; total: number }>>): CPSResult {
  const patterns: Record<string, { yesCount: number; total: number }> = {
    control_perfectionism: { yesCount: 0, total: 10 },
    self_focused: { yesCount: 0, total: 10 },
    manipulation_low_empathy: { yesCount: 0, total: 10 },
    dramatization: { yesCount: 0, total: 10 },
    passive_aggression: { yesCount: 0, total: 10 },
    suspicion_distrust: { yesCount: 0, total: 10 },
    intimacy_avoidance: { yesCount: 0, total: 10 },
    emotional_distance: { yesCount: 0, total: 10 },
    ...overrides,
  };
  return { patterns } as CPSResult;
}

describe('computeGottmanHorsemen', () => {
  describe('guard conditions', () => {
    it('cps=undefined → undefined', () => {
      expect(computeGottmanHorsemen(undefined)).toBeUndefined();
    });

    it('cps provided → returns result', () => {
      expect(computeGottmanHorsemen(makeCPS())).toBeDefined();
    });
  });

  describe('output structure', () => {
    it('returns 4 horsemen', () => {
      const result = computeGottmanHorsemen(makeCPS())!;
      expect(result.horsemen).toHaveLength(4);
    });

    it('horsemen ids are correct', () => {
      const result = computeGottmanHorsemen(makeCPS())!;
      const ids = result.horsemen.map(h => h.id);
      expect(ids).toEqual(['criticism', 'contempt', 'defensiveness', 'stonewalling']);
    });

    it('each horseman has label, emoji, present, severity, score, evidence', () => {
      const result = computeGottmanHorsemen(makeCPS())!;
      for (const h of result.horsemen) {
        expect(h).toHaveProperty('label');
        expect(h).toHaveProperty('emoji');
        expect(typeof h.present).toBe('boolean');
        expect(['none', 'mild', 'moderate', 'severe']).toContain(h.severity);
        expect(h.score).toBeGreaterThanOrEqual(0);
        expect(h.score).toBeLessThanOrEqual(100);
        expect(Array.isArray(h.evidence)).toBe(true);
      }
    });
  });

  describe('criticism formula', () => {
    it('control=60% + selfFocused=40% → score = 60*0.6 + 40*0.4 = 52', () => {
      const cps = makeCPS({
        control_perfectionism: { yesCount: 6, total: 10 },
        self_focused: { yesCount: 4, total: 10 },
      });
      const result = computeGottmanHorsemen(cps)!;
      const criticism = result.horsemen.find(h => h.id === 'criticism')!;
      expect(criticism.score).toBe(52);
    });

    it('both zero → score=0, severity=none, present=false', () => {
      const result = computeGottmanHorsemen(makeCPS())!;
      const criticism = result.horsemen.find(h => h.id === 'criticism')!;
      expect(criticism.score).toBe(0);
      expect(criticism.severity).toBe('none');
      expect(criticism.present).toBe(false);
    });
  });

  describe('contempt formula', () => {
    it('manipulation=80% + dramatization=60% → base = 80*0.5 + 60*0.3 = 58, no asymmetry boost', () => {
      const cps = makeCPS({
        manipulation_low_empathy: { yesCount: 8, total: 10 },
        dramatization: { yesCount: 6, total: 10 },
      });
      const result = computeGottmanHorsemen(cps)!;
      const contempt = result.horsemen.find(h => h.id === 'contempt')!;
      expect(contempt.score).toBe(58);
    });

    it('response asymmetry boost capped at 20', () => {
      const cps = makeCPS({
        manipulation_low_empathy: { yesCount: 5, total: 10 },
      });
      const quant = makeQuant({
        timing: {
          perPerson: {
            Alice: { medianResponseTimeMs: 60_000 },   // 1 min
            Bob: { medianResponseTimeMs: 6_060_000 },   // 101 min → diff = 100 min
          },
        } as never,
      }, ['Alice', 'Bob']);
      const result = computeGottmanHorsemen(cps, quant)!;
      const contempt = result.horsemen.find(h => h.id === 'contempt')!;
      // base=50*0.5=25, asymmetry=100min/5=20 (capped), total=45
      expect(contempt.score).toBe(45);
    });
  });

  describe('defensiveness formula', () => {
    it('passive=50% + suspicion=50% → score = 50*0.5 + 50*0.5 = 50', () => {
      const cps = makeCPS({
        passive_aggression: { yesCount: 5, total: 10 },
        suspicion_distrust: { yesCount: 5, total: 10 },
      });
      const result = computeGottmanHorsemen(cps)!;
      const def = result.horsemen.find(h => h.id === 'defensiveness')!;
      expect(def.score).toBe(50);
    });
  });

  describe('stonewalling formula', () => {
    it('intimacy_avoidance=50% + emotional_distance=50% → base = 50*0.4 + 50*0.4 = 40', () => {
      const cps = makeCPS({
        intimacy_avoidance: { yesCount: 5, total: 10 },
        emotional_distance: { yesCount: 5, total: 10 },
      });
      const result = computeGottmanHorsemen(cps)!;
      const sw = result.horsemen.find(h => h.id === 'stonewalling')!;
      expect(sw.score).toBe(40);
    });

    it('ghost risk boost: ghostRisk=80 adds 80*0.2=16', () => {
      const cps = makeCPS({
        intimacy_avoidance: { yesCount: 5, total: 10 },
        emotional_distance: { yesCount: 5, total: 10 },
      });
      const quant = makeQuant({
        viralScores: {
          ghostRisk: {
            Alice: { score: 80 },
            Bob: { score: 40 },
          },
        } as never,
      });
      const result = computeGottmanHorsemen(cps, quant)!;
      const sw = result.horsemen.find(h => h.id === 'stonewalling')!;
      // base=40 + ghostBoost=80*0.2=16 → 56
      expect(sw.score).toBe(56);
    });
  });

  describe('severity thresholds', () => {
    it('score=0 → none', () => {
      const result = computeGottmanHorsemen(makeCPS())!;
      expect(result.horsemen[0].severity).toBe('none');
    });

    it('score=24 → none (< 25)', () => {
      // 24% of 60% weight: need control=40% (gives 24)
      const cps = makeCPS({
        control_perfectionism: { yesCount: 4, total: 10 }, // 40*0.6=24
      });
      const result = computeGottmanHorsemen(cps)!;
      const crit = result.horsemen.find(h => h.id === 'criticism')!;
      expect(crit.score).toBe(24);
      expect(crit.severity).toBe('none');
      expect(crit.present).toBe(false);
    });

    it('score=25 → mild, present=true', () => {
      // Need score exactly 25: defensiveness=50*0.5=25 with 50% passive
      const cps = makeCPS({
        passive_aggression: { yesCount: 5, total: 10 }, // 50*0.5=25
      });
      const result = computeGottmanHorsemen(cps)!;
      const def = result.horsemen.find(h => h.id === 'defensiveness')!;
      expect(def.score).toBe(25);
      expect(def.severity).toBe('mild');
      expect(def.present).toBe(true);
    });

    it('score=45 → moderate', () => {
      const cps = makeCPS({
        passive_aggression: { yesCount: 9, total: 10 }, // 90*0.5=45
      });
      const result = computeGottmanHorsemen(cps)!;
      const def = result.horsemen.find(h => h.id === 'defensiveness')!;
      expect(def.score).toBe(45);
      expect(def.severity).toBe('moderate');
    });

    it('score=70 → severe', () => {
      const cps = makeCPS({
        passive_aggression: { yesCount: 10, total: 10 }, // 100*0.5=50
        suspicion_distrust: { yesCount: 10, total: 10 },  // 100*0.5=50 → total=100
      });
      const result = computeGottmanHorsemen(cps)!;
      const def = result.horsemen.find(h => h.id === 'defensiveness')!;
      expect(def.score).toBe(100);
      expect(def.severity).toBe('severe');
    });
  });

  describe('activeCount and riskLevel', () => {
    it('all zero → activeCount=0, risk=Niski', () => {
      const result = computeGottmanHorsemen(makeCPS())!;
      expect(result.activeCount).toBe(0);
      expect(result.riskLevel).toContain('Niski');
    });

    it('1 horseman active → Niskie ryzyko', () => {
      const cps = makeCPS({
        control_perfectionism: { yesCount: 10, total: 10 }, // criticism=60, present
      });
      const result = computeGottmanHorsemen(cps)!;
      expect(result.activeCount).toBe(1);
      expect(result.riskLevel).toContain('Niskie ryzyko');
    });

    it('all 4 active → Podwyższone ryzyko', () => {
      const cps = makeCPS({
        control_perfectionism: { yesCount: 10, total: 10 },
        self_focused: { yesCount: 10, total: 10 },
        manipulation_low_empathy: { yesCount: 10, total: 10 },
        dramatization: { yesCount: 10, total: 10 },
        passive_aggression: { yesCount: 10, total: 10 },
        suspicion_distrust: { yesCount: 10, total: 10 },
        intimacy_avoidance: { yesCount: 10, total: 10 },
        emotional_distance: { yesCount: 10, total: 10 },
      });
      const result = computeGottmanHorsemen(cps)!;
      expect(result.activeCount).toBe(4);
      expect(result.riskLevel).toContain('Podwyższone ryzyko');
    });
  });

  describe('evidence generation', () => {
    it('high control → evidence includes „kontroli i perfekcjonizmu"', () => {
      const cps = makeCPS({
        control_perfectionism: { yesCount: 8, total: 10 }, // 80% > 50%
      });
      const result = computeGottmanHorsemen(cps)!;
      const crit = result.horsemen.find(h => h.id === 'criticism')!;
      expect(crit.evidence.some(e => e.includes('kontroli'))).toBe(true);
    });

    it('no patterns → empty evidence arrays', () => {
      const result = computeGottmanHorsemen(makeCPS())!;
      for (const h of result.horsemen) {
        expect(h.evidence).toEqual([]);
      }
    });
  });

  describe('determinism', () => {
    it('same input → same output', () => {
      const cps = makeCPS({ control_perfectionism: { yesCount: 5, total: 10 } });
      const r1 = computeGottmanHorsemen(cps);
      const r2 = computeGottmanHorsemen(cps);
      expect(r1).toEqual(r2);
    });
  });
});
