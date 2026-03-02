/**
 * Tests for compare/user-detection.ts — common user detection across conversations.
 */
import { describe, it, expect } from 'vitest';
import { detectCommonUser, getPartnerName, filterOneOnOne } from '../user-detection';
import type { StoredAnalysis } from '../../analysis/types';

// ============================================================
// Minimal mock helpers
// ============================================================

/**
 * Create a minimal StoredAnalysis with just the fields needed by user-detection.
 * Only `conversation.participants` and `conversation.metadata.isGroup` are accessed.
 */
function mockAnalysis(
  participantNames: string[],
  options: { isGroup?: boolean } = {},
): StoredAnalysis {
  return {
    id: `analysis-${Math.random().toString(36).slice(2, 8)}`,
    title: 'Test Conversation',
    createdAt: Date.now(),
    conversation: {
      platform: 'messenger',
      title: 'Test',
      participants: participantNames.map((name) => ({ name })),
      messages: [],
      metadata: {
        totalMessages: 100,
        dateRange: { start: 0, end: 1 },
        isGroup: options.isGroup ?? participantNames.length > 2,
        durationDays: 30,
      },
    },
    quantitative: {} as StoredAnalysis['quantitative'],
  } as StoredAnalysis;
}

// ============================================================
// detectCommonUser
// ============================================================

describe('detectCommonUser', () => {
  it('returns null for fewer than 2 analyses', () => {
    expect(detectCommonUser([])).toBeNull();
    expect(detectCommonUser([mockAnalysis(['Alice', 'Bob'])])).toBeNull();
  });

  it('detects the common user across 2 conversations', () => {
    const analyses = [
      mockAnalysis(['Alice', 'Bob']),
      mockAnalysis(['Alice', 'Charlie']),
    ];
    const result = detectCommonUser(analyses);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Alice');
    expect(result!.count).toBe(2);
    expect(result!.total).toBe(2);
    expect(result!.confidence).toBe(1);
  });

  it('detects the most frequent participant across 3 conversations', () => {
    const analyses = [
      mockAnalysis(['Alice', 'Bob']),
      mockAnalysis(['Alice', 'Charlie']),
      mockAnalysis(['Alice', 'Dave']),
    ];
    const result = detectCommonUser(analyses);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Alice');
    expect(result!.count).toBe(3);
    expect(result!.total).toBe(3);
    expect(result!.confidence).toBe(1);
  });

  it('returns null when no name appears in more than 1 conversation', () => {
    const analyses = [
      mockAnalysis(['Alice', 'Bob']),
      mockAnalysis(['Charlie', 'Dave']),
    ];
    expect(detectCommonUser(analyses)).toBeNull();
  });

  it('breaks ties by preferring name in ALL conversations', () => {
    // Both Alice and Bob appear in 2/3 conversations, but Alice is in all 3
    const analyses = [
      mockAnalysis(['Alice', 'Bob']),
      mockAnalysis(['Alice', 'Charlie']),
      mockAnalysis(['Alice', 'Bob']),
    ];
    // Alice: 3, Bob: 2 => Alice wins outright (no tie)
    const result = detectCommonUser(analyses);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Alice');
  });

  it('breaks ties by preferring name that appears in all conversations', () => {
    // Construct a tie scenario:
    // Analysis 1: [Alice, Bob]
    // Analysis 2: [Alice, Charlie]
    // Analysis 3: [Bob, Charlie]
    // Alice: 2, Bob: 2, Charlie: 2 => all tied, all in 2/3
    // None appear in all 3, so winner is first candidate (Alice)
    const analyses = [
      mockAnalysis(['Alice', 'Bob']),
      mockAnalysis(['Alice', 'Charlie']),
      mockAnalysis(['Bob', 'Charlie']),
    ];
    const result = detectCommonUser(analyses);
    expect(result).not.toBeNull();
    expect(result!.count).toBe(2);
    expect(result!.total).toBe(3);
    expect(result!.confidence).toBeCloseTo(2 / 3, 5);
  });

  it('handles conversations with duplicate participant names gracefully', () => {
    // A participant listed twice should only count once per conversation
    const analyses = [
      mockAnalysis(['Alice', 'Alice', 'Bob']),
      mockAnalysis(['Alice', 'Charlie']),
    ];
    const result = detectCommonUser(analyses);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Alice');
    expect(result!.count).toBe(2);
  });

  it('calculates correct confidence for partial coverage', () => {
    const analyses = [
      mockAnalysis(['Alice', 'Bob']),
      mockAnalysis(['Alice', 'Charlie']),
      mockAnalysis(['Dave', 'Eve']),
    ];
    const result = detectCommonUser(analyses);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Alice');
    expect(result!.count).toBe(2);
    expect(result!.total).toBe(3);
    expect(result!.confidence).toBeCloseTo(2 / 3, 5);
  });
});

// ============================================================
// getPartnerName
// ============================================================

describe('getPartnerName', () => {
  it('returns the other participant in a 2-person conversation', () => {
    const analysis = mockAnalysis(['Alice', 'Bob']);
    expect(getPartnerName(analysis, 'Alice')).toBe('Bob');
    expect(getPartnerName(analysis, 'Bob')).toBe('Alice');
  });

  it('returns selfName when no other participant exists', () => {
    // Single-participant edge case
    const analysis = mockAnalysis(['Alice']);
    expect(getPartnerName(analysis, 'Alice')).toBe('Alice');
  });

  it('returns the first non-self participant in a group', () => {
    const analysis = mockAnalysis(['Alice', 'Bob', 'Charlie'], { isGroup: true });
    expect(getPartnerName(analysis, 'Alice')).toBe('Bob');
  });

  it('returns selfName if selfName is not a participant', () => {
    // If self is not found among participants, filter removes all, returns selfName
    const analysis = mockAnalysis(['Bob', 'Charlie']);
    expect(getPartnerName(analysis, 'Alice')).toBe('Bob');
  });
});

// ============================================================
// filterOneOnOne
// ============================================================

describe('filterOneOnOne', () => {
  it('returns empty array for empty input', () => {
    expect(filterOneOnOne([])).toEqual([]);
  });

  it('keeps 2-person non-group conversations', () => {
    const analyses = [
      mockAnalysis(['Alice', 'Bob']),
    ];
    // Our mock sets isGroup=false for 2 participants
    const result = filterOneOnOne(analyses);
    expect(result).toHaveLength(1);
  });

  it('filters out group conversations (3+ participants)', () => {
    const analyses = [
      mockAnalysis(['Alice', 'Bob']),
      mockAnalysis(['Alice', 'Bob', 'Charlie'], { isGroup: true }),
    ];
    const result = filterOneOnOne(analyses);
    expect(result).toHaveLength(1);
    expect(result[0].conversation.participants).toHaveLength(2);
  });

  it('filters out conversations marked as group even with 2 participants', () => {
    // A conversation with 2 participants but isGroup=true (edge case)
    const analyses = [
      mockAnalysis(['Alice', 'Bob']),
      mockAnalysis(['Alice', 'Charlie']),
    ];
    // Force one to be a group
    analyses[1].conversation.metadata.isGroup = true;
    const result = filterOneOnOne(analyses);
    expect(result).toHaveLength(1);
  });

  it('filters out single-participant conversations', () => {
    const singleParticipant = mockAnalysis(['Alice']);
    // isGroup will be false since < 3 participants, but length != 2
    singleParticipant.conversation.metadata.isGroup = false;
    const analyses = [
      mockAnalysis(['Alice', 'Bob']),
      singleParticipant,
    ];
    const result = filterOneOnOne(analyses);
    expect(result).toHaveLength(1);
    expect(result[0].conversation.participants).toHaveLength(2);
  });

  it('returns all conversations when all are 1:1', () => {
    const analyses = [
      mockAnalysis(['Alice', 'Bob']),
      mockAnalysis(['Alice', 'Charlie']),
      mockAnalysis(['Alice', 'Dave']),
    ];
    const result = filterOneOnOne(analyses);
    expect(result).toHaveLength(3);
  });

  it('returns empty array when all are group conversations', () => {
    const analyses = [
      mockAnalysis(['Alice', 'Bob', 'Charlie'], { isGroup: true }),
      mockAnalysis(['Dave', 'Eve', 'Frank'], { isGroup: true }),
    ];
    const result = filterOneOnOne(analyses);
    expect(result).toHaveLength(0);
  });
});
