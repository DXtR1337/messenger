/**
 * Tests for share payload decoding — round-trip, corruption, truncation, empty.
 */
import { describe, it, expect } from 'vitest';
import { compressToEncodedURIComponent } from 'lz-string';
import { encodeShareData } from '../encode';
import { decodeShareData } from '../decode';
import type { StoredAnalysis } from '@/lib/analysis/types';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';

// ============================================================
// Helper: build minimal StoredAnalysis for testing
// (mirrors the helper from encode.test.ts)
// ============================================================

function makeMinimalAnalysis(overrides: Partial<{
  participants: Array<{ name: string }>;
  totalMessages: number;
  healthScore: number;
  executiveSummary: string;
  roastVerdict: string;
}>): StoredAnalysis {
  const participants = overrides.participants ?? [{ name: 'Jan Kowalski' }, { name: 'Anna Nowak' }];

  const conversation: ParsedConversation = {
    platform: 'messenger',
    title: 'Test Chat',
    participants,
    messages: [],
    metadata: {
      totalMessages: overrides.totalMessages ?? 500,
      dateRange: { start: 1700000000000, end: 1702000000000 },
      isGroup: participants.length > 2,
      durationDays: 23,
    },
  };

  const quantitative: QuantitativeAnalysis = {
    perPerson: {},
    timing: {
      perPerson: {},
      conversationInitiations: {},
      conversationEndings: {},
      longestSilence: {
        durationMs: 0,
        startTimestamp: 0,
        endTimestamp: 0,
        lastSender: '',
        nextSender: '',
      },
      lateNightMessages: {},
    },
    engagement: {
      doubleTexts: {},
      maxConsecutive: {},
      messageRatio: {},
      reactionRate: {},
      reactionGiveRate: {},
      reactionReceiveRate: {},
      avgConversationLength: 0,
      totalSessions: 0,
    },
    patterns: {
      monthlyVolume: [],
      weekdayWeekend: { weekday: {}, weekend: {} },
      volumeTrend: 0,
      bursts: [],
    },
    heatmap: { perPerson: {}, combined: [] },
    trends: {
      responseTimeTrend: [],
      messageLengthTrend: [],
      initiationTrend: [],
    },
    badges: [],
    viralScores: undefined,
  };

  const qualitative = overrides.healthScore !== undefined || overrides.executiveSummary || overrides.roastVerdict
    ? {
        pass4: {
          health_score: overrides.healthScore !== undefined
            ? { overall: overrides.healthScore, components: { balance: 70, reciprocity: 65, response_pattern: 80, emotional_safety: 75, growth_trajectory: 60 } }
            : undefined,
          executive_summary: overrides.executiveSummary ?? undefined,
          conversation_personality: undefined,
          key_findings: [],
        },
        roast: overrides.roastVerdict ? { verdict: overrides.roastVerdict } : undefined,
      }
    : undefined;

  return {
    id: 'test-id-123',
    title: 'Test Chat',
    createdAt: Date.now(),
    conversation,
    quantitative,
    qualitative: qualitative as StoredAnalysis['qualitative'],
  };
}

// ============================================================
// Round-trip: encode -> decode -> deep equality
// ============================================================

describe('decodeShareData — round-trip', () => {
  it('round-trips a full payload with health score and summary', () => {
    const analysis = makeMinimalAnalysis({
      healthScore: 72,
      executiveSummary: 'A balanced conversation between two friends.',
      roastVerdict: 'One of them is clearly the sidekick.',
    });

    const encoded = encodeShareData(analysis);
    const decoded = decodeShareData(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded!.v).toBe(1);
    expect(decoded!.healthScore).toBe(72);
    expect(decoded!.participantCount).toBe(2);
    expect(decoded!.messageCount).toBe(500);
    expect(decoded!.dateRange).toEqual({ start: 1700000000000, end: 1702000000000 });
    expect(decoded!.badges).toEqual([]);
    expect(decoded!.keyFindings).toEqual([]);
    // Anonymized — original names replaced
    expect(decoded!.executiveSummary).not.toContain('Jan Kowalski');
    expect(decoded!.roastVerdict).not.toContain('Anna Nowak');
  });

  it('round-trips a payload with no qualitative data (all nulls)', () => {
    const analysis = makeMinimalAnalysis({});

    const encoded = encodeShareData(analysis);
    const decoded = decodeShareData(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded!.v).toBe(1);
    expect(decoded!.healthScore).toBeNull();
    expect(decoded!.executiveSummary).toBeNull();
    expect(decoded!.roastVerdict).toBeNull();
    expect(decoded!.conversationPersonality).toBeNull();
    expect(decoded!.relationshipType).toBeNull();
    expect(decoded!.viralScores).toBeNull();
  });

  it('round-trips payload with 3+ participants (group chat)', () => {
    const analysis = makeMinimalAnalysis({
      participants: [{ name: 'Ala' }, { name: 'Basia' }, { name: 'Celina' }],
      totalMessages: 1200,
      healthScore: 55,
    });

    const encoded = encodeShareData(analysis);
    const decoded = decodeShareData(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded!.participantCount).toBe(3);
    expect(decoded!.messageCount).toBe(1200);
    expect(decoded!.healthScore).toBe(55);
  });

  it('preserves health components through round-trip', () => {
    const analysis = makeMinimalAnalysis({ healthScore: 80 });

    const encoded = encodeShareData(analysis);
    const decoded = decodeShareData(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded!.healthComponents).toEqual({
      balance: 70,
      reciprocity: 65,
      response_pattern: 80,
      emotional_safety: 75,
      growth_trajectory: 60,
    });
  });
});

// ============================================================
// Corrupted base64 input
// ============================================================

describe('decodeShareData — corrupted base64', () => {
  it('returns null for random garbage string', () => {
    expect(decodeShareData('!!garbage_not_base64@@##$$')).toBeNull();
  });

  it('returns null for a base64 string that does not decompress to JSON', () => {
    // btoa produces valid base64 but lz-string won't decompress it
    const fakeBase64 = btoa('this is not lz-compressed data at all');
    expect(decodeShareData(fakeBase64)).toBeNull();
  });

  it('returns null for unicode junk characters', () => {
    expect(decodeShareData('\u0000\uFFFF\uD800')).toBeNull();
  });

  it('returns null for a string with only special characters', () => {
    expect(decodeShareData('+++///===')).toBeNull();
  });
});

// ============================================================
// Truncated data
// ============================================================

describe('decodeShareData — truncated data', () => {
  it('returns null when a valid encoded string is cut in half', () => {
    const analysis = makeMinimalAnalysis({ healthScore: 50, executiveSummary: 'Test summary for truncation' });
    const encoded = encodeShareData(analysis);

    // Cut the string in half
    const truncated = encoded.slice(0, Math.floor(encoded.length / 2));
    expect(decodeShareData(truncated)).toBeNull();
  });

  it('returns null when only the first few characters remain', () => {
    const analysis = makeMinimalAnalysis({ healthScore: 99 });
    const encoded = encodeShareData(analysis);

    const truncated = encoded.slice(0, 5);
    expect(decodeShareData(truncated)).toBeNull();
  });

  it('returns null when significant tail portion is removed', () => {
    const analysis = makeMinimalAnalysis({ healthScore: 42 });
    const encoded = encodeShareData(analysis);

    // Remove the last 20% — enough to corrupt the compressed payload
    const truncated = encoded.slice(0, Math.floor(encoded.length * 0.8));
    expect(decodeShareData(truncated)).toBeNull();
  });
});

// ============================================================
// Empty payload
// ============================================================

describe('decodeShareData — empty / minimal payload', () => {
  it('returns null for empty string', () => {
    expect(decodeShareData('')).toBeNull();
  });

  it('returns null for single whitespace character', () => {
    expect(decodeShareData(' ')).toBeNull();
  });

  it('decodes a manually constructed minimal valid payload', () => {
    const minimalPayload = {
      v: 1,
      healthScore: null,
      healthComponents: null,
      executiveSummary: null,
      viralScores: null,
      badges: [],
      conversationPersonality: null,
      participantCount: 0,
      messageCount: 0,
      dateRange: { start: 0, end: 0 },
      roastVerdict: null,
      relationshipType: null,
      keyFindings: [],
    };

    const encoded = compressToEncodedURIComponent(JSON.stringify(minimalPayload));
    const decoded = decodeShareData(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded!.v).toBe(1);
    expect(decoded!.participantCount).toBe(0);
    expect(decoded!.messageCount).toBe(0);
    expect(decoded!.badges).toEqual([]);
    expect(decoded!.keyFindings).toEqual([]);
    expect(decoded!.healthScore).toBeNull();
  });

  it('returns null for valid compressed empty object', () => {
    const encoded = compressToEncodedURIComponent(JSON.stringify({}));
    expect(decodeShareData(encoded)).toBeNull();
  });

  it('returns null for valid compressed empty array', () => {
    const encoded = compressToEncodedURIComponent(JSON.stringify([]));
    expect(decodeShareData(encoded)).toBeNull();
  });

  it('returns null for valid compressed null', () => {
    const encoded = compressToEncodedURIComponent(JSON.stringify(null));
    expect(decodeShareData(encoded)).toBeNull();
  });
});
