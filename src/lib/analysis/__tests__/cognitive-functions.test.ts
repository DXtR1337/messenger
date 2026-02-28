import { describe, it, expect } from 'vitest';
import { computeCognitiveFunctions } from '@/lib/analysis/cognitive-functions';
import type { CognitiveFunctionsResult } from '@/lib/analysis/cognitive-functions';

describe('computeCognitiveFunctions', () => {
  describe('guard conditions', () => {
    it('returns undefined for < 2 profiles', () => {
      expect(computeCognitiveFunctions({ Alice: { mbti: { type: 'INFJ' } } })).toBeUndefined();
    });

    it('returns undefined for 2 profiles without MBTI', () => {
      expect(computeCognitiveFunctions({ Alice: {}, Bob: {} })).toBeUndefined();
    });

    it('returns undefined when only 1 has valid MBTI', () => {
      expect(computeCognitiveFunctions({
        Alice: { mbti: { type: 'INFJ' } },
        Bob: {},
      })).toBeUndefined();
    });

    it('returns undefined for invalid MBTI type string', () => {
      expect(computeCognitiveFunctions({
        Alice: { mbti: { type: 'XXXX' } },
        Bob: { mbti: { type: 'INFJ' } },
      })).toBeUndefined();
    });
  });

  describe('MBTI → cognitive function stacks', () => {
    it('INFJ → Ni-Fe-Ti-Se', () => {
      const result = computeCognitiveFunctions({
        Alice: { mbti: { type: 'INFJ' } },
        Bob: { mbti: { type: 'ENTP' } },
      })!;
      expect(result.stacks['Alice']).toEqual({
        dominant: 'Ni', auxiliary: 'Fe', tertiary: 'Ti', inferior: 'Se',
      });
    });

    it('ENTP → Ne-Ti-Fe-Si', () => {
      const result = computeCognitiveFunctions({
        Alice: { mbti: { type: 'INFJ' } },
        Bob: { mbti: { type: 'ENTP' } },
      })!;
      expect(result.stacks['Bob']).toEqual({
        dominant: 'Ne', auxiliary: 'Ti', tertiary: 'Fe', inferior: 'Si',
      });
    });

    it('ESTJ → Te-Si-Ne-Fi', () => {
      const result = computeCognitiveFunctions({
        Alice: { mbti: { type: 'ESTJ' } },
        Bob: { mbti: { type: 'INFP' } },
      })!;
      expect(result.stacks['Alice']).toEqual({
        dominant: 'Te', auxiliary: 'Si', tertiary: 'Ne', inferior: 'Fi',
      });
    });

    it('ISFP → Fi-Se-Ni-Te', () => {
      const result = computeCognitiveFunctions({
        Alice: { mbti: { type: 'ISFP' } },
        Bob: { mbti: { type: 'ENTJ' } },
      })!;
      expect(result.stacks['Alice']).toEqual({
        dominant: 'Fi', auxiliary: 'Se', tertiary: 'Ni', inferior: 'Te',
      });
    });

    it('case insensitive (infj works)', () => {
      const result = computeCognitiveFunctions({
        Alice: { mbti: { type: 'infj' } },
        Bob: { mbti: { type: 'entp' } },
      });
      expect(result).toBeDefined();
      expect(result!.stacks['Alice'].dominant).toBe('Ni');
    });
  });

  describe('clash generation', () => {
    it('always produces exactly 3 clashes', () => {
      const result = computeCognitiveFunctions({
        Alice: { mbti: { type: 'INFJ' } },
        Bob: { mbti: { type: 'ENTP' } },
      })!;
      expect(result.clashes).toHaveLength(3);
    });

    it('clash 0 = dominant vs dominant', () => {
      const result = computeCognitiveFunctions({
        Alice: { mbti: { type: 'INFJ' } }, // Ni
        Bob: { mbti: { type: 'ENTP' } },   // Ne
      })!;
      expect(result.clashes[0].personA.func).toBe('Ni');
      expect(result.clashes[0].personA.role).toBe('dominant');
      expect(result.clashes[0].personB.func).toBe('Ne');
      expect(result.clashes[0].personB.role).toBe('dominant');
    });

    it('clash 1 = auxiliary vs auxiliary', () => {
      const result = computeCognitiveFunctions({
        Alice: { mbti: { type: 'INFJ' } }, // Fe
        Bob: { mbti: { type: 'ENTP' } },   // Ti
      })!;
      expect(result.clashes[1].personA.func).toBe('Fe');
      expect(result.clashes[1].personA.role).toBe('auxiliary');
      expect(result.clashes[1].personB.func).toBe('Ti');
      expect(result.clashes[1].personB.role).toBe('auxiliary');
    });

    it('clash 2 = A dominant vs B inferior', () => {
      const result = computeCognitiveFunctions({
        Alice: { mbti: { type: 'INFJ' } }, // Ni vs Si
        Bob: { mbti: { type: 'ENTP' } },
      })!;
      expect(result.clashes[2].personA.role).toBe('dominant');
      expect(result.clashes[2].personB.role).toBe('inferior');
    });

    it('each clash has description and compatibility score', () => {
      const result = computeCognitiveFunctions({
        Alice: { mbti: { type: 'ESTJ' } },
        Bob: { mbti: { type: 'INFP' } },
      })!;
      for (const clash of result.clashes) {
        expect(typeof clash.description).toBe('string');
        expect(clash.description.length).toBeGreaterThan(5);
        expect(clash.compatibility).toBeGreaterThanOrEqual(0);
        expect(clash.compatibility).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('compatibility scoring', () => {
    it('same function → 85', () => {
      // INFJ vs INFJ → Ni vs Ni
      const result = computeCognitiveFunctions({
        Alice: { mbti: { type: 'INFJ' } },
        Bob: { mbti: { type: 'INFJ' } },
      })!;
      expect(result.clashes[0].compatibility).toBe(85); // Ni vs Ni
    });

    it('same base different attitude → 65 (e.g., Fe vs Fi)', () => {
      // INFJ (Fe aux) vs INFP (Fi dom) — clash 2: INFJ dom(Ni) vs INFP inferior(Te)
      // Better: ESFJ (Fe dom) vs ISFP (Fi dom) → dominant Fe vs Fi
      const result = computeCognitiveFunctions({
        Alice: { mbti: { type: 'ESFJ' } }, // Fe dom
        Bob: { mbti: { type: 'ISFP' } },   // Fi dom
      })!;
      expect(result.clashes[0].compatibility).toBe(65); // Fe vs Fi = same base F
    });

    it('complementary opposites → 40 (e.g., Te vs Fi)', () => {
      // ESTJ (Te dom) vs INFP (Fi dom) → T vs F
      const result = computeCognitiveFunctions({
        Alice: { mbti: { type: 'ESTJ' } },
        Bob: { mbti: { type: 'INFP' } },
      })!;
      expect(result.clashes[0].compatibility).toBe(40); // Te vs Fi → T/F complementary
    });

    it('other combos → 55 (e.g., Te vs Se)', () => {
      // ESTJ (Te dom) vs ESFP (Se dom) → T vs S = neither same-base nor complementary
      const result = computeCognitiveFunctions({
        Alice: { mbti: { type: 'ESTJ' } },
        Bob: { mbti: { type: 'ESFP' } },
      })!;
      expect(result.clashes[0].compatibility).toBe(55); // Te vs Se
    });
  });

  describe('overall compatibility', () => {
    it('equals average of 3 clash compatibilities', () => {
      const result = computeCognitiveFunctions({
        Alice: { mbti: { type: 'INFJ' } },
        Bob: { mbti: { type: 'ENTP' } },
      })!;
      const avg = Math.round(
        result.clashes.reduce((s, c) => s + c.compatibility, 0) / 3,
      );
      expect(result.overallCompatibility).toBe(avg);
    });

    it('same types → overall = 70 (dom-dom=85, aux-aux=85, dom-inf Fe/Ti=40)', () => {
      const result = computeCognitiveFunctions({
        Alice: { mbti: { type: 'ENFJ' } },
        Bob: { mbti: { type: 'ENFJ' } },
      })!;
      // ENFJ: Fe-Ni-Se-Ti. Clashes: Fe/Fe=85, Ni/Ni=85, Fe/Ti=40 → avg=70
      expect(result.overallCompatibility).toBe(70);
    });
  });

  describe('determinism', () => {
    it('same input → same output', () => {
      const profiles = {
        Alice: { mbti: { type: 'INFJ' } },
        Bob: { mbti: { type: 'ENTP' } },
      };
      const r1 = computeCognitiveFunctions(profiles);
      const r2 = computeCognitiveFunctions(profiles);
      expect(r1).toEqual(r2);
    });
  });
});
