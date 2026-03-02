/**
 * Tests for Conflict Fingerprint module.
 *
 * Key facts from reading conflict-fingerprint.ts:
 * - computeConflictFingerprint(messages, participantNames, conflictEvents): ConflictFingerprintResult | undefined
 * - Returns undefined when messages.length < 50 OR participantNames.length < 2
 * - When no conflict windows exist, returns an extrapolated fingerprint (hasEnoughData: false)
 * - hasEnoughData = true only when >= 3 escalation/cold_silence events
 * - Conflict windows are +-30 messages around each escalation/cold_silence event
 * - Resolution events are excluded from window extraction
 */
import { describe, it, expect } from 'vitest';
import { computeConflictFingerprint } from '../conflict-fingerprint';
import type { ConflictFingerprintResult } from '../conflict-fingerprint';
import type { UnifiedMessage } from '@/lib/parsers/types';
import type { ConflictEvent } from '../conflicts';

// ============================================================
// Fixture helpers
// ============================================================

function makeMsg(
  sender: string,
  content: string,
  timestamp: number,
  index: number = 0,
): UnifiedMessage {
  return {
    index,
    sender,
    timestamp,
    content,
    type: 'text',
    reactions: [],
    hasMedia: false,
    hasLink: false,
    isUnsent: false,
  };
}

const MINUTE = 60 * 1000;

/**
 * Build a conversation of N alternating messages between two senders.
 * Timestamps are spaced 1 minute apart.
 */
function buildConversation(
  n: number,
  senderA = 'Anna',
  senderB = 'Bartek',
  baseTs = 1_700_000_000_000,
  contentFn?: (i: number, sender: string) => string,
): UnifiedMessage[] {
  const msgs: UnifiedMessage[] = [];
  for (let i = 0; i < n; i++) {
    const sender = i % 2 === 0 ? senderA : senderB;
    const content = contentFn
      ? contentFn(i, sender)
      : `Message ${i} from ${sender}`;
    msgs.push(makeMsg(sender, content, baseTs + i * MINUTE, i));
  }
  return msgs;
}

function makeEscalationEvent(
  startIdx: number,
  endIdx: number,
  timestamp: number,
  severity: number = 2,
  participants: string[] = ['Anna', 'Bartek'],
): ConflictEvent {
  return {
    type: 'escalation',
    timestamp,
    date: new Date(timestamp).toISOString().slice(0, 10),
    participants,
    description: 'Test escalation event',
    severity,
    messageRange: [startIdx, endIdx],
  };
}

function makeResolutionEvent(
  startIdx: number,
  endIdx: number,
  timestamp: number,
): ConflictEvent {
  return {
    type: 'resolution',
    timestamp,
    date: new Date(timestamp).toISOString().slice(0, 10),
    participants: ['Anna', 'Bartek'],
    description: 'Test resolution event',
    severity: 1,
    messageRange: [startIdx, endIdx],
  };
}

// ============================================================
// Undefined / guard returns
// ============================================================

describe('ConflictFingerprint — guard clauses', () => {
  it('returns undefined for empty messages array', () => {
    const result = computeConflictFingerprint([], ['Anna', 'Bartek'], []);
    expect(result).toBeUndefined();
  });

  it('returns undefined when fewer than 50 messages', () => {
    const msgs = buildConversation(49);
    const result = computeConflictFingerprint(msgs, ['Anna', 'Bartek'], []);
    expect(result).toBeUndefined();
  });

  it('returns undefined for single participant', () => {
    const msgs = buildConversation(100, 'Anna', 'Anna');
    const result = computeConflictFingerprint(msgs, ['Anna'], []);
    expect(result).toBeUndefined();
  });

  it('returns defined result for exactly 50 messages with 2 participants', () => {
    const msgs = buildConversation(50);
    const result = computeConflictFingerprint(msgs, ['Anna', 'Bartek'], []);
    expect(result).toBeDefined();
  });
});

// ============================================================
// No conflict events — extrapolated fingerprint
// ============================================================

describe('ConflictFingerprint — no conflicts (extrapolated)', () => {
  it('returns hasEnoughData: false when no conflict events', () => {
    const msgs = buildConversation(60);
    const result = computeConflictFingerprint(msgs, ['Anna', 'Bartek'], []);
    expect(result).toBeDefined();
    expect(result!.hasEnoughData).toBe(false);
  });

  it('returns totalConflictWindows: 0 when no events', () => {
    const msgs = buildConversation(60);
    const result = computeConflictFingerprint(msgs, ['Anna', 'Bartek'], []);
    expect(result!.totalConflictWindows).toBe(0);
  });

  it('returns escalationStyle "mixed" and deescalationStyle "deflect" when no conflicts', () => {
    const msgs = buildConversation(60);
    const result = computeConflictFingerprint(msgs, ['Anna', 'Bartek'], []);
    expect(result!.perPerson['Anna'].escalationStyle).toBe('mixed');
    expect(result!.perPerson['Anna'].deescalationStyle).toBe('deflect');
    expect(result!.perPerson['Bartek'].escalationStyle).toBe('mixed');
  });

  it('returns msgLengthRatioConflictVsNormal = 1 when no conflicts', () => {
    const msgs = buildConversation(60);
    const result = computeConflictFingerprint(msgs, ['Anna', 'Bartek'], []);
    expect(result!.perPerson['Anna'].msgLengthRatioConflictVsNormal).toBe(1);
    expect(result!.perPerson['Bartek'].msgLengthRatioConflictVsNormal).toBe(1);
  });

  it('returns empty conflictVocabulary when no conflicts', () => {
    const msgs = buildConversation(60);
    const result = computeConflictFingerprint(msgs, ['Anna', 'Bartek'], []);
    expect(result!.perPerson['Anna'].conflictVocabulary).toEqual([]);
    expect(result!.perPerson['Bartek'].conflictVocabulary).toEqual([]);
  });
});

// ============================================================
// With conflict events
// ============================================================

describe('ConflictFingerprint — with conflict events', () => {
  it('returns hasEnoughData: true with >= 3 escalation events', () => {
    const msgs = buildConversation(200);
    const baseTs = msgs[0].timestamp;
    const events: ConflictEvent[] = [
      makeEscalationEvent(20, 25, baseTs + 20 * MINUTE),
      makeEscalationEvent(80, 85, baseTs + 80 * MINUTE),
      makeEscalationEvent(140, 145, baseTs + 140 * MINUTE),
    ];
    const result = computeConflictFingerprint(msgs, ['Anna', 'Bartek'], events);
    expect(result).toBeDefined();
    expect(result!.hasEnoughData).toBe(true);
  });

  it('returns hasEnoughData: false with < 3 escalation events', () => {
    const msgs = buildConversation(200);
    const baseTs = msgs[0].timestamp;
    const events: ConflictEvent[] = [
      makeEscalationEvent(20, 25, baseTs + 20 * MINUTE),
      makeEscalationEvent(80, 85, baseTs + 80 * MINUTE),
    ];
    const result = computeConflictFingerprint(msgs, ['Anna', 'Bartek'], events);
    expect(result).toBeDefined();
    expect(result!.hasEnoughData).toBe(false);
  });

  it('totalConflictWindows counts merged windows correctly', () => {
    const msgs = buildConversation(200);
    const baseTs = msgs[0].timestamp;
    // Two events close together (will merge) + one far away
    const events: ConflictEvent[] = [
      makeEscalationEvent(50, 55, baseTs + 50 * MINUTE),
      makeEscalationEvent(60, 65, baseTs + 60 * MINUTE), // overlaps window of first
      makeEscalationEvent(150, 155, baseTs + 150 * MINUTE), // separate
    ];
    const result = computeConflictFingerprint(msgs, ['Anna', 'Bartek'], events);
    expect(result).toBeDefined();
    // First two should merge (50-30=20..65+30=95), third (150-30=120..185)
    expect(result!.totalConflictWindows).toBe(2);
  });

  it('resolution events do not create conflict windows', () => {
    const msgs = buildConversation(200);
    const baseTs = msgs[0].timestamp;
    const events: ConflictEvent[] = [
      makeResolutionEvent(50, 55, baseTs + 50 * MINUTE),
      makeResolutionEvent(100, 105, baseTs + 100 * MINUTE),
      makeResolutionEvent(150, 155, baseTs + 150 * MINUTE),
    ];
    const result = computeConflictFingerprint(msgs, ['Anna', 'Bartek'], events);
    expect(result).toBeDefined();
    // Resolution events are excluded from window extraction
    expect(result!.totalConflictWindows).toBe(0);
    expect(result!.hasEnoughData).toBe(false);
  });

  it('perPerson profiles exist for all named participants', () => {
    const msgs = buildConversation(200);
    const baseTs = msgs[0].timestamp;
    const events: ConflictEvent[] = [
      makeEscalationEvent(50, 55, baseTs + 50 * MINUTE),
    ];
    const result = computeConflictFingerprint(msgs, ['Anna', 'Bartek'], events);
    expect(result).toBeDefined();
    expect(result!.perPerson).toHaveProperty('Anna');
    expect(result!.perPerson).toHaveProperty('Bartek');
  });

  it('conflictInitiationRate sums to ~100 across participants', () => {
    const msgs = buildConversation(200);
    const baseTs = msgs[0].timestamp;
    const events: ConflictEvent[] = [
      makeEscalationEvent(50, 55, baseTs + 50 * MINUTE),
      makeEscalationEvent(100, 105, baseTs + 100 * MINUTE),
      makeEscalationEvent(150, 155, baseTs + 150 * MINUTE),
    ];
    const result = computeConflictFingerprint(msgs, ['Anna', 'Bartek'], events);
    expect(result).toBeDefined();
    const annaRate = result!.perPerson['Anna'].conflictInitiationRate;
    const bartekRate = result!.perPerson['Bartek'].conflictInitiationRate;
    expect(annaRate + bartekRate).toBeCloseTo(100, 0);
  });
});

// ============================================================
// Output shape and value ranges
// ============================================================

describe('ConflictFingerprint — output shape', () => {
  it('result has expected top-level keys', () => {
    const msgs = buildConversation(100);
    const baseTs = msgs[0].timestamp;
    const events: ConflictEvent[] = [
      makeEscalationEvent(30, 35, baseTs + 30 * MINUTE),
    ];
    const result = computeConflictFingerprint(msgs, ['Anna', 'Bartek'], events);
    expect(result).toBeDefined();
    expect(result).toHaveProperty('perPerson');
    expect(result).toHaveProperty('totalConflictWindows');
    expect(result).toHaveProperty('avgConflictDurationMs');
    expect(result).toHaveProperty('topConflictTriggerWords');
    expect(result).toHaveProperty('hasEnoughData');
  });

  it('PersonConflictProfile has all expected fields', () => {
    const msgs = buildConversation(100);
    const baseTs = msgs[0].timestamp;
    const events: ConflictEvent[] = [
      makeEscalationEvent(30, 35, baseTs + 30 * MINUTE),
    ];
    const result = computeConflictFingerprint(msgs, ['Anna', 'Bartek'], events);
    expect(result).toBeDefined();
    const profile = result!.perPerson['Anna'];
    expect(profile).toHaveProperty('escalationStyle');
    expect(profile).toHaveProperty('deescalationStyle');
    expect(profile).toHaveProperty('avgBurstLengthInConflict');
    expect(profile).toHaveProperty('avgBurstLengthNormal');
    expect(profile).toHaveProperty('msgLengthRatioConflictVsNormal');
    expect(profile).toHaveProperty('responseTimeShiftMs');
    expect(profile).toHaveProperty('doubleTextRateInConflict');
    expect(profile).toHaveProperty('interruptionRate');
    expect(profile).toHaveProperty('conflictVocabulary');
    expect(profile).toHaveProperty('avgConflictDurationMessages');
    expect(profile).toHaveProperty('conflictInitiationRate');
  });

  it('escalationStyle is one of the valid types', () => {
    const msgs = buildConversation(100);
    const baseTs = msgs[0].timestamp;
    const events: ConflictEvent[] = [
      makeEscalationEvent(30, 35, baseTs + 30 * MINUTE),
    ];
    const result = computeConflictFingerprint(msgs, ['Anna', 'Bartek'], events);
    expect(result).toBeDefined();
    const validStyles = ['direct_attack', 'passive_aggressive', 'silent_withdrawal', 'mixed'];
    expect(validStyles).toContain(result!.perPerson['Anna'].escalationStyle);
    expect(validStyles).toContain(result!.perPerson['Bartek'].escalationStyle);
  });

  it('deescalationStyle is one of the valid types', () => {
    const msgs = buildConversation(100);
    const baseTs = msgs[0].timestamp;
    const events: ConflictEvent[] = [
      makeEscalationEvent(30, 35, baseTs + 30 * MINUTE),
    ];
    const result = computeConflictFingerprint(msgs, ['Anna', 'Bartek'], events);
    expect(result).toBeDefined();
    const validStyles = ['apologize', 'deflect', 'ghost', 'topic_change', 'humor'];
    expect(validStyles).toContain(result!.perPerson['Anna'].deescalationStyle);
    expect(validStyles).toContain(result!.perPerson['Bartek'].deescalationStyle);
  });

  it('avgConflictDurationMs is non-negative', () => {
    const msgs = buildConversation(200);
    const baseTs = msgs[0].timestamp;
    const events: ConflictEvent[] = [
      makeEscalationEvent(50, 55, baseTs + 50 * MINUTE),
      makeEscalationEvent(100, 105, baseTs + 100 * MINUTE),
    ];
    const result = computeConflictFingerprint(msgs, ['Anna', 'Bartek'], events);
    expect(result!.avgConflictDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('topConflictTriggerWords is an array of strings', () => {
    const msgs = buildConversation(200);
    const baseTs = msgs[0].timestamp;
    const events: ConflictEvent[] = [
      makeEscalationEvent(50, 55, baseTs + 50 * MINUTE),
    ];
    const result = computeConflictFingerprint(msgs, ['Anna', 'Bartek'], events);
    expect(Array.isArray(result!.topConflictTriggerWords)).toBe(true);
  });
});
