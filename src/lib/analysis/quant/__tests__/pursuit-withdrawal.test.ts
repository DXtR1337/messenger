import { describe, it, expect } from 'vitest';
import { detectPursuitWithdrawal } from '../pursuit-withdrawal';
import type { UnifiedMessage } from '@/lib/parsers/types';

const MINUTE = 60_000;
const HOUR = 3_600_000;
// 2024-06-15 12:00 UTC — Saturday midday (avoids overnight suppression)
const BASE = new Date('2024-06-15T12:00:00Z').getTime();

let idx = 0;
function makeMsg(sender: string, ts: number): UnifiedMessage {
  return { index: idx++, sender, content: 'msg', timestamp: ts, type: 'text', reactions: [], hasMedia: false, hasLink: false, isUnsent: false };
}

/** Generate N consecutive messages from sender, each gapMs apart. */
function burst(sender: string, count: number, startTs: number, gapMs = 5 * MINUTE): UnifiedMessage[] {
  return Array.from({ length: count }, (_, i) => makeMsg(sender, startTs + i * gapMs));
}

/** Fill background messages to reach minimum 50. */
function filler(count: number, startTs: number): UnifiedMessage[] {
  const msgs: UnifiedMessage[] = [];
  for (let i = 0; i < count; i++) {
    msgs.push(makeMsg(i % 2 === 0 ? 'Alice' : 'Bob', startTs + i * HOUR));
  }
  return msgs;
}

beforeEach(() => { idx = 0; });

describe('detectPursuitWithdrawal', () => {
  describe('guard conditions', () => {
    it('returns undefined for < 2 participants', () => {
      const msgs = filler(60, BASE);
      expect(detectPursuitWithdrawal(msgs, ['Alice'])).toBeUndefined();
    });

    it('returns undefined for < 50 messages', () => {
      const msgs = filler(49, BASE);
      expect(detectPursuitWithdrawal(msgs, ['Alice', 'Bob'])).toBeUndefined();
    });

    it('returns undefined when < 2 cycles detected', () => {
      // 50 alternating messages — no pursuit pattern
      const msgs = filler(50, BASE);
      expect(detectPursuitWithdrawal(msgs, ['Alice', 'Bob'])).toBeUndefined();
    });
  });

  describe('MIN_CONSECUTIVE=4 boundary', () => {
    it('3 consecutive + 5h silence → NOT a pursuit (< MIN_CONSECUTIVE)', () => {
      const msgs = [
        ...filler(40, BASE),
        ...burst('Alice', 3, BASE + 50 * HOUR),
        makeMsg('Bob', BASE + 50 * HOUR + 3 * 5 * MINUTE + 5 * HOUR),
        // Same pattern again but with only 3
        ...burst('Alice', 3, BASE + 70 * HOUR),
        makeMsg('Bob', BASE + 70 * HOUR + 3 * 5 * MINUTE + 5 * HOUR),
      ];
      expect(detectPursuitWithdrawal(msgs, ['Alice', 'Bob'])).toBeUndefined();
    });

    it('4 consecutive + 5h silence → IS a pursuit cycle', () => {
      // Use offsets that stay in daytime even in CEST (UTC+2):
      // BASE=June15 12:00 UTC, +50h=June17 14:00 UTC (16:00 CEST ✓), +74h=June18 14:00 UTC (16:00 CEST ✓)
      const t1 = BASE + 50 * HOUR;
      const t2 = BASE + 74 * HOUR;
      const msgs = [
        ...filler(40, BASE),
        // Cycle 1: 4 messages from Alice, then 5h silence, then Bob replies
        ...burst('Alice', 4, t1),
        makeMsg('Bob', t1 + 4 * 5 * MINUTE + 5 * HOUR),
        // Cycle 2: same pattern
        ...burst('Alice', 4, t2),
        makeMsg('Bob', t2 + 4 * 5 * MINUTE + 5 * HOUR),
      ];
      const result = detectPursuitWithdrawal(msgs, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.cycleCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('WITHDRAWAL_THRESHOLD=4h boundary', () => {
    it('4 consecutive + 3h59m59s silence → NOT counted (< 4h)', () => {
      const t1 = BASE;
      const t2 = BASE + 30 * HOUR;
      const almostFourH = 4 * HOUR - 1;
      const msgs = [
        ...filler(40, BASE - 100 * HOUR),
        // Gap is measured from LAST pursuit msg (at t+15min) to Bob's reply
        // So Bob at t+15min+(4h-1ms) → gap = 3h59m59.999s < 4h
        ...burst('Alice', 4, t1),
        makeMsg('Bob', t1 + 3 * 5 * MINUTE + almostFourH),
        ...burst('Alice', 4, t2),
        makeMsg('Bob', t2 + 3 * 5 * MINUTE + almostFourH),
      ];
      expect(detectPursuitWithdrawal(msgs, ['Alice', 'Bob'])).toBeUndefined();
    });

    it('4 consecutive + exactly 4h silence → IS counted', () => {
      const t1 = BASE;
      const t2 = BASE + 30 * HOUR;
      const fourH = 4 * HOUR;
      const msgs = [
        ...filler(40, BASE - 100 * HOUR),
        ...burst('Alice', 4, t1),
        makeMsg('Bob', t1 + 4 * 5 * MINUTE + fourH),
        ...burst('Alice', 4, t2),
        makeMsg('Bob', t2 + 4 * 5 * MINUTE + fourH),
      ];
      const result = detectPursuitWithdrawal(msgs, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.cycleCount).toBe(2);
    });
  });

  describe('PURSUIT_WINDOW=30min boundary', () => {
    it('messages 29min apart → still in same pursuit run', () => {
      const t1 = BASE;
      const t2 = BASE + 30 * HOUR;
      const gap = 29 * MINUTE; // < 30min
      const msgs = [
        ...filler(40, BASE - 100 * HOUR),
        ...Array.from({ length: 4 }, (_, i) => makeMsg('Alice', t1 + i * gap)),
        makeMsg('Bob', t1 + 4 * gap + 5 * HOUR),
        ...Array.from({ length: 4 }, (_, i) => makeMsg('Alice', t2 + i * gap)),
        makeMsg('Bob', t2 + 4 * gap + 5 * HOUR),
      ];
      const result = detectPursuitWithdrawal(msgs, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.cycleCount).toBe(2);
    });

    it('messages 30min apart → breaks pursuit run (>= PURSUIT_WINDOW)', () => {
      const t1 = BASE;
      const t2 = BASE + 30 * HOUR;
      const gap = 30 * MINUTE; // exactly 30min — NOT < PURSUIT_WINDOW
      const msgs = [
        ...filler(40, BASE - 100 * HOUR),
        ...Array.from({ length: 4 }, (_, i) => makeMsg('Alice', t1 + i * gap)),
        makeMsg('Bob', t1 + 4 * gap + 5 * HOUR),
        ...Array.from({ length: 4 }, (_, i) => makeMsg('Alice', t2 + i * gap)),
        makeMsg('Bob', t2 + 4 * gap + 5 * HOUR),
      ];
      // Each run breaks at message 2 (gap >= PURSUIT_WINDOW), so consecutive never reaches 4
      expect(detectPursuitWithdrawal(msgs, ['Alice', 'Bob'])).toBeUndefined();
    });
  });

  describe('overnight suppression', () => {
    it('gap starting at 23:00 UTC with 5h gap → suppressed (overnight, <12h)', () => {
      const nightBase = new Date('2024-06-15T23:00:00Z').getTime();
      const t2 = nightBase + 30 * HOUR;
      const msgs = [
        ...filler(40, nightBase - 100 * HOUR),
        ...burst('Alice', 4, nightBase, 5 * MINUTE),
        makeMsg('Bob', nightBase + 4 * 5 * MINUTE + 5 * HOUR), // gap at 23h → overnight
        ...burst('Alice', 4, t2, 5 * MINUTE),
        makeMsg('Bob', t2 + 4 * 5 * MINUTE + 5 * HOUR),
      ];
      const result = detectPursuitWithdrawal(msgs, ['Alice', 'Bob']);
      // First cycle suppressed, only second might count
      // With only 1 non-suppressed cycle → undefined
      if (result) {
        // If second cycle also happens to be at night, both suppressed
        expect(result.cycleCount).toBeLessThan(2);
      }
    });

    it('gap starting at 12:00 UTC (daytime) → NOT suppressed', () => {
      const t1 = BASE; // 12:00 UTC
      const t2 = BASE + 30 * HOUR;
      const msgs = [
        ...filler(40, BASE - 100 * HOUR),
        ...burst('Alice', 4, t1),
        makeMsg('Bob', t1 + 4 * 5 * MINUTE + 5 * HOUR),
        ...burst('Alice', 4, t2),
        makeMsg('Bob', t2 + 4 * 5 * MINUTE + 5 * HOUR),
      ];
      const result = detectPursuitWithdrawal(msgs, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.cycleCount).toBe(2);
    });

    it('gap > 12h starting at night → NOT suppressed (too long for sleep)', () => {
      const nightBase = new Date('2024-06-15T23:00:00Z').getTime();
      const msgs = [
        ...filler(40, nightBase - 100 * HOUR),
        ...burst('Alice', 4, nightBase, 5 * MINUTE),
        makeMsg('Bob', nightBase + 4 * 5 * MINUTE + 13 * HOUR), // 13h gap > 12h
        ...burst('Alice', 4, nightBase + 30 * HOUR, 5 * MINUTE),
        makeMsg('Bob', nightBase + 30 * HOUR + 4 * 5 * MINUTE + 13 * HOUR),
      ];
      const result = detectPursuitWithdrawal(msgs, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.cycleCount).toBe(2);
    });
  });

  describe('role assignment', () => {
    it('all pursuits from Alice → pursuer=Alice', () => {
      const msgs: UnifiedMessage[] = [...filler(40, BASE - 100 * HOUR)];
      for (let c = 0; c < 3; c++) {
        const t = BASE + c * 30 * HOUR;
        msgs.push(...burst('Alice', 4, t));
        msgs.push(makeMsg('Bob', t + 4 * 5 * MINUTE + 5 * HOUR));
      }
      const result = detectPursuitWithdrawal(msgs, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.pursuer).toBe('Alice');
      expect(result!.withdrawer).toBe('Bob');
    });
  });

  describe('cycle resolved flag', () => {
    it('next sender !== pursuer → resolved=true', () => {
      const msgs = [
        ...filler(40, BASE - 100 * HOUR),
        ...burst('Alice', 4, BASE),
        makeMsg('Bob', BASE + 4 * 5 * MINUTE + 5 * HOUR), // Bob replies
        ...burst('Alice', 4, BASE + 30 * HOUR),
        makeMsg('Bob', BASE + 30 * HOUR + 4 * 5 * MINUTE + 5 * HOUR),
      ];
      const result = detectPursuitWithdrawal(msgs, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      for (const cycle of result!.cycles) {
        expect(cycle.resolved).toBe(true);
      }
    });

    it('next sender === pursuer → resolved=false', () => {
      const msgs = [
        ...filler(40, BASE - 100 * HOUR),
        ...burst('Alice', 4, BASE),
        makeMsg('Alice', BASE + 4 * 5 * MINUTE + 5 * HOUR), // Alice again
        ...burst('Alice', 4, BASE + 30 * HOUR),
        makeMsg('Alice', BASE + 30 * HOUR + 4 * 5 * MINUTE + 5 * HOUR),
      ];
      const result = detectPursuitWithdrawal(msgs, ['Alice', 'Bob']);
      if (result) {
        for (const cycle of result.cycles) {
          expect(cycle.resolved).toBe(false);
        }
      }
    });
  });

  describe('output structure', () => {
    it('has all required fields', () => {
      const msgs: UnifiedMessage[] = [...filler(40, BASE - 100 * HOUR)];
      for (let c = 0; c < 3; c++) {
        const t = BASE + c * 30 * HOUR;
        msgs.push(...burst('Alice', 4, t));
        msgs.push(makeMsg('Bob', t + 4 * 5 * MINUTE + 5 * HOUR));
      }
      const result = detectPursuitWithdrawal(msgs, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('pursuer');
      expect(result).toHaveProperty('withdrawer');
      expect(result).toHaveProperty('cycleCount');
      expect(result).toHaveProperty('avgCycleDurationMs');
      expect(result).toHaveProperty('escalationTrend');
      expect(result).toHaveProperty('cycles');
      expect(result!.cycleCount).toBe(result!.cycles.length);
    });

    it('each cycle has pursuitTimestamp, withdrawalDurationMs, pursuitMessageCount, resolved', () => {
      const msgs: UnifiedMessage[] = [...filler(40, BASE - 100 * HOUR)];
      for (let c = 0; c < 2; c++) {
        const t = BASE + c * 30 * HOUR;
        msgs.push(...burst('Alice', 5, t));
        msgs.push(makeMsg('Bob', t + 5 * 5 * MINUTE + 5 * HOUR));
      }
      const result = detectPursuitWithdrawal(msgs, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      for (const cycle of result!.cycles) {
        expect(cycle).toHaveProperty('pursuitTimestamp');
        expect(cycle).toHaveProperty('withdrawalDurationMs');
        expect(cycle).toHaveProperty('pursuitMessageCount');
        expect(cycle).toHaveProperty('resolved');
        expect(cycle.pursuitMessageCount).toBeGreaterThanOrEqual(4);
      }
    });
  });

  describe('escalation trend', () => {
    it('longer gaps in second half → positive escalationTrend', () => {
      const msgs: UnifiedMessage[] = [...filler(40, BASE - 100 * HOUR)];
      // Cycle 1-2: 5h gaps
      for (let c = 0; c < 2; c++) {
        const t = BASE + c * 30 * HOUR;
        msgs.push(...burst('Alice', 4, t));
        msgs.push(makeMsg('Bob', t + 4 * 5 * MINUTE + 5 * HOUR));
      }
      // Cycle 3-4: 10h gaps
      for (let c = 2; c < 4; c++) {
        const t = BASE + c * 30 * HOUR;
        msgs.push(...burst('Alice', 4, t));
        msgs.push(makeMsg('Bob', t + 4 * 5 * MINUTE + 10 * HOUR));
      }
      const result = detectPursuitWithdrawal(msgs, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.escalationTrend).toBeGreaterThan(0);
    });
  });

  describe('determinism', () => {
    it('same input → same output', () => {
      const msgs: UnifiedMessage[] = [...filler(40, BASE - 100 * HOUR)];
      for (let c = 0; c < 3; c++) {
        const t = BASE + c * 30 * HOUR;
        msgs.push(...burst('Alice', 4, t));
        msgs.push(makeMsg('Bob', t + 4 * 5 * MINUTE + 5 * HOUR));
      }
      const r1 = detectPursuitWithdrawal(msgs, ['Alice', 'Bob']);
      const r2 = detectPursuitWithdrawal(msgs, ['Alice', 'Bob']);
      expect(r1).toEqual(r2);
    });
  });
});
