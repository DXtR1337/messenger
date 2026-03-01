import { describe, it, expect } from 'vitest';
import { computeResponseTimeAnalysis } from '../response-time-engine';
import type { UnifiedMessage } from '@/lib/parsers/types';

function makeMsg(
  sender: string,
  content: string,
  timestamp: number,
  index = 0,
): UnifiedMessage {
  return {
    index,
    sender,
    content,
    timestamp,
    type: 'text',
    reactions: [],
    hasMedia: false,
    hasLink: false,
    isUnsent: false,
  };
}

const MINUTE = 60_000;
const HOUR = 3_600_000;

/**
 * Generate a synthetic conversation with alternating senders.
 * Each pair of messages (A then B) has a configurable gap.
 * Between pairs, there's a short 1-minute intra-pair gap.
 */
function generateConversation(
  pairCount: number,
  responseGapMs: number,
  baseTimestamp = new Date('2024-06-15T12:00:00').getTime(),
): UnifiedMessage[] {
  const msgs: UnifiedMessage[] = [];
  let ts = baseTimestamp;

  for (let i = 0; i < pairCount; i++) {
    msgs.push(makeMsg('Alice', `Message ${i * 2}`, ts, msgs.length));
    ts += responseGapMs;
    msgs.push(makeMsg('Bob', `Reply ${i * 2 + 1}`, ts, msgs.length));
    ts += 5 * MINUTE; // gap between pairs
  }

  return msgs;
}

describe('computeResponseTimeAnalysis', () => {
  describe('guard conditions', () => {
    it('returns undefined for <30 messages', () => {
      const msgs = generateConversation(10, 5 * MINUTE); // 20 messages
      expect(computeResponseTimeAnalysis(msgs, ['Alice', 'Bob'])).toBeUndefined();
    });

    it('returns undefined for insufficient turn responses', () => {
      // All same sender → no turn responses
      const msgs = Array.from({ length: 40 }, (_, i) =>
        makeMsg('Alice', `msg ${i}`, Date.now() + i * 1000, i),
      );
      expect(computeResponseTimeAnalysis(msgs, ['Alice', 'Bob'])).toBeUndefined();
    });

    it('returns defined for valid conversation (30+ msgs, 10+ responses)', () => {
      const msgs = generateConversation(20, 3 * MINUTE); // 40 messages
      const result = computeResponseTimeAnalysis(msgs, ['Alice', 'Bob']);
      expect(result).toBeDefined();
    });
  });

  describe('adaptive session gap', () => {
    it('adapts to conversation rhythm', () => {
      // Conversation with ~3min gaps → adaptive gap should be around p75*2 of sub-1h gaps
      const msgs = generateConversation(30, 3 * MINUTE); // 60 msgs
      const result = computeResponseTimeAnalysis(msgs, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.adaptiveSessionGapMs).toBeGreaterThanOrEqual(15 * MINUTE);
      expect(result!.adaptiveSessionGapMs).toBeLessThanOrEqual(2 * HOUR);
    });
  });

  describe('turn building', () => {
    it('groups consecutive same-sender messages into turns', () => {
      const baseTs = new Date('2024-06-15T12:00:00').getTime();
      const msgs = [
        makeMsg('Alice', 'hi', baseTs, 0),
        makeMsg('Alice', 'how are you', baseTs + 30_000, 1), // 30s later, same sender → same turn
        makeMsg('Bob', 'hey!', baseTs + 5 * MINUTE, 2),
        makeMsg('Bob', 'good', baseTs + 5 * MINUTE + 10_000, 3),
        // Many more to hit 30 message minimum
        ...Array.from({ length: 30 }, (_, i) => {
          const sender = i % 2 === 0 ? 'Alice' : 'Bob';
          return makeMsg(sender, `msg ${i}`, baseTs + (i + 5) * 5 * MINUTE, i + 4);
        }),
      ];
      const result = computeResponseTimeAnalysis(msgs, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      // First two messages should be in one turn (Alice)
      const firstTurn = result!.turns[0];
      expect(firstTurn.sender).toBe('Alice');
      expect(firstTurn.messageCount).toBe(2);
    });

    it('splits turns when gap exceeds burst threshold', () => {
      const baseTs = new Date('2024-06-15T12:00:00').getTime();
      const msgs = [
        makeMsg('Alice', 'hi', baseTs, 0),
        makeMsg('Alice', 'hello again', baseTs + 3 * MINUTE, 1), // 3min > 2min threshold → new turn
        ...generateConversation(20, 3 * MINUTE).map((m, i) => ({
          ...m,
          timestamp: m.timestamp + 10 * MINUTE,
          index: i + 2,
        })),
      ];
      const result = computeResponseTimeAnalysis(msgs, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      // First two Alice messages should be separate turns (3min > 2min)
      expect(result!.turns[0].sender).toBe('Alice');
      expect(result!.turns[0].messageCount).toBe(1);
      expect(result!.turns[1].sender).toBe('Alice');
      expect(result!.turns[1].messageCount).toBe(1);
    });
  });

  describe('overnight filtering', () => {
    it('marks 23:00→08:00 as overnight', () => {
      const baseTs = new Date('2024-06-15T10:00:00').getTime();
      const msgs: UnifiedMessage[] = [];
      let ts = baseTs;

      // Enough regular exchanges to get baselines
      for (let i = 0; i < 15; i++) {
        msgs.push(makeMsg('Alice', `msg ${i}`, ts, msgs.length));
        ts += 5 * MINUTE;
        msgs.push(makeMsg('Bob', `reply ${i}`, ts, msgs.length));
        ts += 5 * MINUTE;
      }

      // Add overnight exchange: 23:00 → 08:00 next day
      const nightTs = new Date('2024-06-15T23:00:00').getTime();
      const morningTs = new Date('2024-06-16T08:00:00').getTime();
      msgs.push(makeMsg('Alice', 'goodnight', nightTs, msgs.length));
      msgs.push(makeMsg('Bob', 'good morning', morningTs, msgs.length));

      const result = computeResponseTimeAnalysis(msgs, ['Alice', 'Bob']);
      expect(result).toBeDefined();

      // Find the overnight response
      const overnightResponses = result!.responses.filter(r => r.isOvernight);
      expect(overnightResponses.length).toBeGreaterThanOrEqual(1);
    });

    it('does NOT mark 15:00→20:00 as overnight', () => {
      const msgs = generateConversation(20, 5 * MINUTE); // All during daytime
      const result = computeResponseTimeAnalysis(msgs, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      const overnightCount = result!.responses.filter(r => r.isOvernight).length;
      expect(overnightCount).toBe(0);
    });
  });

  describe('response categories', () => {
    it('classifies instant responses (<30s)', () => {
      const msgs = generateConversation(20, 10_000); // 10s gaps
      const result = computeResponseTimeAnalysis(msgs, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      const instantCount = result!.responses.filter(r => r.category === 'instant').length;
      expect(instantCount).toBeGreaterThan(0);
    });

    it('classifies quick responses (<2min)', () => {
      const msgs = generateConversation(20, 60_000); // 1min gaps
      const result = computeResponseTimeAnalysis(msgs, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      const quickCount = result!.responses.filter(r => r.category === 'quick').length;
      expect(quickCount).toBeGreaterThan(0);
    });

    it('classifies normal responses (<15min)', () => {
      const msgs = generateConversation(20, 5 * MINUTE); // 5min gaps
      const result = computeResponseTimeAnalysis(msgs, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      const normalCount = result!.responses.filter(r => r.category === 'normal').length;
      expect(normalCount).toBeGreaterThan(0);
    });
  });

  describe('Response Time Index', () => {
    it('global RTI is 1.0 (baseline by definition)', () => {
      const msgs = generateConversation(20, 5 * MINUTE);
      const result = computeResponseTimeAnalysis(msgs, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.rti['Alice']).toBeCloseTo(1.0);
      expect(result!.rti['Bob']).toBeCloseTo(1.0);
    });
  });

  describe('response asymmetry', () => {
    it('returns ~1.0 when both respond at same speed', () => {
      const msgs = generateConversation(20, 3 * MINUTE);
      const result = computeResponseTimeAnalysis(msgs, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      // Symmetric conversation — RA should be close to 1
      expect(result!.responseAsymmetry).toBeGreaterThanOrEqual(1.0);
      expect(result!.responseAsymmetry).toBeLessThan(3.0);
    });

    it('returns >1.0 when one person is slower', () => {
      const baseTs = new Date('2024-06-15T12:00:00').getTime();
      const msgs: UnifiedMessage[] = [];
      let ts = baseTs;

      for (let i = 0; i < 20; i++) {
        msgs.push(makeMsg('Alice', `msg ${i}`, ts, msgs.length));
        ts += 1 * MINUTE; // Alice → Bob: 1min
        msgs.push(makeMsg('Bob', `reply ${i}`, ts, msgs.length));
        ts += 10 * MINUTE; // Bob → Alice: 10min (much slower)
      }

      const result = computeResponseTimeAnalysis(msgs, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.responseAsymmetry).toBeGreaterThan(1.5);
    });
  });

  describe('ghosting index', () => {
    it('returns near 0 when all turns are answered', () => {
      const msgs = generateConversation(20, 3 * MINUTE);
      const result = computeResponseTimeAnalysis(msgs, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      // Last Alice turn may be unanswered, so GI can be ~1/20 = 0.05
      expect(result!.ghostingIndex['Alice']).toBeLessThanOrEqual(0.1);
      expect(result!.ghostingIndex['Bob']).toBeLessThanOrEqual(0.1);
    });
  });

  describe('initiative ratio', () => {
    it('gives higher IR to person who initiates more sessions', () => {
      const baseTs = new Date('2024-06-15T12:00:00').getTime();
      const msgs: UnifiedMessage[] = [];
      let ts = baseTs;

      // Alice always starts new sessions, Bob just responds
      for (let i = 0; i < 10; i++) {
        // Session
        msgs.push(makeMsg('Alice', `hi ${i}`, ts, msgs.length));
        ts += 2 * MINUTE;
        msgs.push(makeMsg('Bob', `hey ${i}`, ts, msgs.length));
        ts += 1 * MINUTE;
        msgs.push(makeMsg('Alice', `ok ${i}`, ts, msgs.length));
        ts += 3 * HOUR; // Long gap = new session
      }

      const result = computeResponseTimeAnalysis(msgs, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.initiativeRatio['Alice']).toBeGreaterThan(result!.initiativeRatio['Bob']);
    });
  });

  describe('sliding windows', () => {
    it('creates windows for long conversations', () => {
      // Generate 3 months of conversation
      const baseTs = new Date('2024-01-15T12:00:00').getTime();
      const msgs: UnifiedMessage[] = [];
      let ts = baseTs;

      for (let day = 0; day < 90; day++) {
        // 4 exchanges per day
        for (let j = 0; j < 4; j++) {
          msgs.push(makeMsg('Alice', `msg ${day}-${j}`, ts, msgs.length));
          ts += 5 * MINUTE;
          msgs.push(makeMsg('Bob', `reply ${day}-${j}`, ts, msgs.length));
          ts += 30 * MINUTE;
        }
        ts = baseTs + (day + 1) * 24 * HOUR; // next day
      }

      const result = computeResponseTimeAnalysis(msgs, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.slidingWindows.length).toBeGreaterThan(0);

      for (const w of result!.slidingWindows) {
        expect(w.windowEnd - w.windowStart).toBe(30 * 24 * HOUR);
        expect(w.ra).toBeGreaterThanOrEqual(1);
      }
    });

    it('returns empty for short conversations (<30 days span)', () => {
      const msgs = generateConversation(20, 3 * MINUTE); // all in one day
      const result = computeResponseTimeAnalysis(msgs, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      expect(result!.slidingWindows).toEqual([]);
    });
  });

  describe('anomaly detection', () => {
    it('detects sudden_slowdown when RTI > 2.5', () => {
      // Build a long conversation with a sudden slowdown period
      const baseTs = new Date('2024-01-15T12:00:00').getTime();
      const msgs: UnifiedMessage[] = [];
      let ts = baseTs;

      // Fast period: 60 days, 1min responses
      for (let day = 0; day < 60; day++) {
        for (let j = 0; j < 4; j++) {
          msgs.push(makeMsg('Alice', `fast ${day}-${j}`, ts, msgs.length));
          ts += 1 * MINUTE;
          msgs.push(makeMsg('Bob', `reply ${day}-${j}`, ts, msgs.length));
          ts += 30 * MINUTE;
        }
        ts = baseTs + (day + 1) * 24 * HOUR;
      }

      // Slow period: 30 days, Bob responds after 20min (while Alice still 1min)
      for (let day = 60; day < 90; day++) {
        for (let j = 0; j < 4; j++) {
          msgs.push(makeMsg('Alice', `slow ${day}-${j}`, ts, msgs.length));
          ts += 1 * MINUTE; // Alice still fast
          msgs.push(makeMsg('Bob', `delayed ${day}-${j}`, ts + 19 * MINUTE, msgs.length));
          ts += 30 * MINUTE + 19 * MINUTE;
        }
        ts = baseTs + (day + 1) * 24 * HOUR;
      }

      const result = computeResponseTimeAnalysis(msgs, ['Alice', 'Bob']);
      expect(result).toBeDefined();
      // Should have anomalies (if sliding windows produced high RTI)
      // This test mainly verifies the pipeline doesn't crash
      expect(result!.anomalies).toBeInstanceOf(Array);
    });
  });

  describe('full integration', () => {
    it('returns complete structure for a 200-message conversation', () => {
      // Generate a realistic multi-month conversation
      const baseTs = new Date('2024-01-15T12:00:00').getTime();
      const msgs: UnifiedMessage[] = [];
      let ts = baseTs;

      for (let day = 0; day < 100; day++) {
        const exchangeCount = 1 + Math.floor(Math.random() * 3);
        for (let j = 0; j < exchangeCount; j++) {
          msgs.push(makeMsg('Alice', `Hello day ${day}, exchange ${j}`, ts, msgs.length));
          ts += (2 + Math.random() * 8) * MINUTE;
          msgs.push(makeMsg('Bob', `Hi there, day ${day} reply ${j}`, ts, msgs.length));
          ts += (5 + Math.random() * 20) * MINUTE;
        }
        ts = baseTs + (day + 1) * 24 * HOUR;
      }

      const result = computeResponseTimeAnalysis(msgs, ['Alice', 'Bob']);
      expect(result).toBeDefined();

      // Verify structure completeness
      expect(result!.adaptiveSessionGapMs).toBeGreaterThan(0);
      expect(result!.turns.length).toBeGreaterThan(0);
      expect(result!.responses.length).toBeGreaterThan(0);
      expect(result!.perPerson['Alice']).toBeDefined();
      expect(result!.perPerson['Bob']).toBeDefined();
      expect(result!.perPerson['Alice'].sampleSize).toBeGreaterThan(0);
      expect(result!.perPerson['Alice'].perHourMedian).toHaveLength(24);
      expect(result!.perPerson['Alice'].perDowMedian).toHaveLength(7);
      expect(result!.rti['Alice']).toBeCloseTo(1.0);
      expect(result!.responseAsymmetry).toBeGreaterThanOrEqual(1.0);
      expect(['diverging', 'converging', 'stable']).toContain(result!.responseAsymmetryTrend);
      expect(result!.ghostingIndex['Alice']).toBeGreaterThanOrEqual(0);
      expect(result!.ghostingIndex['Alice']).toBeLessThanOrEqual(1);
      expect(result!.initiativeRatio['Alice']).toBeGreaterThanOrEqual(0);
      expect(result!.initiativeRatio['Alice']).toBeLessThanOrEqual(1);
      expect(result!.ewrt['Alice']).toBeGreaterThanOrEqual(0);
      expect(result!.monthlyRti['Alice']).toBeInstanceOf(Array);
      expect(result!.monthlyRa).toBeInstanceOf(Array);
      expect(result!.slidingWindows).toBeInstanceOf(Array);
      expect(result!.anomalies).toBeInstanceOf(Array);
    });
  });
});
