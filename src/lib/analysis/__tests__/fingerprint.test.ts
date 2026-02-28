import { describe, it, expect } from 'vitest';
import { computeConversationFingerprint } from '@/lib/analysis/fingerprint';

const TS_2024_06_15 = 1_718_445_600_000; // 2024-06-15 12:00 UTC
const ONE_DAY = 86_400_000;

describe('computeConversationFingerprint', () => {
  describe('determinism', () => {
    it('same input → same hash', async () => {
      const h1 = await computeConversationFingerprint(['Alice', 'Bob'], 'messenger', TS_2024_06_15);
      const h2 = await computeConversationFingerprint(['Alice', 'Bob'], 'messenger', TS_2024_06_15);
      expect(h1).toBe(h2);
    });
  });

  describe('participant order independence', () => {
    it('[Alice, Bob] === [Bob, Alice]', async () => {
      const h1 = await computeConversationFingerprint(['Alice', 'Bob'], 'messenger', TS_2024_06_15);
      const h2 = await computeConversationFingerprint(['Bob', 'Alice'], 'messenger', TS_2024_06_15);
      expect(h1).toBe(h2);
    });

    it('[C, A, B] === [B, C, A]', async () => {
      const h1 = await computeConversationFingerprint(['C', 'A', 'B'], 'messenger', TS_2024_06_15);
      const h2 = await computeConversationFingerprint(['B', 'C', 'A'], 'messenger', TS_2024_06_15);
      expect(h1).toBe(h2);
    });
  });

  describe('name normalization', () => {
    it('case insensitive: Alice === alice === ALICE', async () => {
      const h1 = await computeConversationFingerprint(['Alice', 'Bob'], 'messenger', TS_2024_06_15);
      const h2 = await computeConversationFingerprint(['alice', 'bob'], 'messenger', TS_2024_06_15);
      const h3 = await computeConversationFingerprint(['ALICE', 'BOB'], 'messenger', TS_2024_06_15);
      expect(h1).toBe(h2);
      expect(h2).toBe(h3);
    });

    it('trims whitespace', async () => {
      const h1 = await computeConversationFingerprint(['Alice', 'Bob'], 'messenger', TS_2024_06_15);
      const h2 = await computeConversationFingerprint(['  Alice  ', ' Bob '], 'messenger', TS_2024_06_15);
      expect(h1).toBe(h2);
    });
  });

  describe('day-rounding', () => {
    it('timestamps within same day → same hash', async () => {
      const morning = TS_2024_06_15;          // 12:00 UTC
      const evening = TS_2024_06_15 + 40_000_000; // ~23:06 UTC same day
      const h1 = await computeConversationFingerprint(['A', 'B'], 'messenger', morning);
      const h2 = await computeConversationFingerprint(['A', 'B'], 'messenger', evening);
      expect(h1).toBe(h2);
    });

    it('timestamps on different days → different hash', async () => {
      const h1 = await computeConversationFingerprint(['A', 'B'], 'messenger', TS_2024_06_15);
      const h2 = await computeConversationFingerprint(['A', 'B'], 'messenger', TS_2024_06_15 + ONE_DAY);
      expect(h1).not.toBe(h2);
    });
  });

  describe('platform sensitivity', () => {
    it('different platform → different hash', async () => {
      const h1 = await computeConversationFingerprint(['A', 'B'], 'messenger', TS_2024_06_15);
      const h2 = await computeConversationFingerprint(['A', 'B'], 'whatsapp', TS_2024_06_15);
      expect(h1).not.toBe(h2);
    });
  });

  describe('different participants → different hash', () => {
    it('[Alice, Bob] ≠ [Alice, Charlie]', async () => {
      const h1 = await computeConversationFingerprint(['Alice', 'Bob'], 'messenger', TS_2024_06_15);
      const h2 = await computeConversationFingerprint(['Alice', 'Charlie'], 'messenger', TS_2024_06_15);
      expect(h1).not.toBe(h2);
    });
  });

  describe('output format', () => {
    it('returns a hex string', async () => {
      const hash = await computeConversationFingerprint(['A', 'B'], 'messenger', TS_2024_06_15);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('non-empty output', async () => {
      const hash = await computeConversationFingerprint(['A', 'B'], 'messenger', TS_2024_06_15);
      expect(hash.length).toBeGreaterThan(0);
    });
  });
});
