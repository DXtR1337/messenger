/**
 * Tests for share URL encoding and decoding.
 */
import { describe, it, expect } from 'vitest';
import { encodeShareData, buildShareUrl } from '../encode';
import { decodeShareData } from '../decode';
import type { StoredAnalysis } from '../../analysis/types';
import type { ParsedConversation, QuantitativeAnalysis } from '../../parsers/types';

// ============================================================
// Helper: build minimal StoredAnalysis for testing
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
// encodeShareData + decodeShareData roundtrip
// ============================================================

describe('encodeShareData + decodeShareData', () => {
  it('roundtrips basic analysis data', () => {
    const analysis = makeMinimalAnalysis({
      healthScore: 72,
      executiveSummary: 'A balanced conversation.',
    });

    const encoded = encodeShareData(analysis);
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = decodeShareData(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.v).toBe(1);
    expect(decoded!.healthScore).toBe(72);
    expect(decoded!.messageCount).toBe(500);
    expect(decoded!.participantCount).toBe(2);
    expect(decoded!.dateRange.start).toBe(1700000000000);
    expect(decoded!.dateRange.end).toBe(1702000000000);
  });

  it('anonymizes participant names in the encoded data', () => {
    const analysis = makeMinimalAnalysis({
      participants: [{ name: 'Jan Kowalski' }, { name: 'Anna Nowak' }],
      executiveSummary: 'Jan Kowalski dominates while Anna Nowak listens.',
      roastVerdict: 'Jan Kowalski is the drama queen and Anna Nowak enables it.',
    });

    const encoded = encodeShareData(analysis);
    const decoded = decodeShareData(encoded);
    expect(decoded).not.toBeNull();

    // Real names should be replaced with Osoba A/B
    expect(decoded!.executiveSummary).not.toContain('Jan Kowalski');
    expect(decoded!.executiveSummary).not.toContain('Anna Nowak');
    expect(decoded!.executiveSummary).toContain('Osoba A');
    expect(decoded!.executiveSummary).toContain('Osoba B');

    expect(decoded!.roastVerdict).not.toContain('Jan Kowalski');
    expect(decoded!.roastVerdict).toContain('Osoba A');
    expect(decoded!.roastVerdict).toContain('Osoba B');
  });
});

// ============================================================
// buildShareUrl
// ============================================================

describe('buildShareUrl', () => {
  it('produces a URL starting with expected origin and /share/ path', () => {
    const analysis = makeMinimalAnalysis({ healthScore: 50 });
    const url = buildShareUrl(analysis);

    // In Node (no window), origin falls back to https://podtekst.app
    expect(url).toContain('https://podtekst.app/share/');
    expect(url.length).toBeGreaterThan('https://podtekst.app/share/'.length);
  });

  it('produces a URL whose payload can be decoded back', () => {
    const analysis = makeMinimalAnalysis({ healthScore: 85 });
    const url = buildShareUrl(analysis);

    // Extract the encoded part after /share/
    const encoded = url.split('/share/')[1];
    expect(encoded).toBeTruthy();

    const decoded = decodeShareData(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.healthScore).toBe(85);
  });
});

// ============================================================
// decodeShareData — error cases
// ============================================================

describe('decodeShareData — error cases', () => {
  it('returns null for empty string', () => {
    expect(decodeShareData('')).toBeNull();
  });

  it('returns null for random garbage string', () => {
    expect(decodeShareData('not-valid-compressed-data!!!')).toBeNull();
  });

  it('returns null for valid JSON that does not match payload schema', () => {
    // lz-string compress a valid JSON that is not a SharePayload
    const { compressToEncodedURIComponent } = require('lz-string');
    const encoded = compressToEncodedURIComponent(JSON.stringify({ foo: 'bar' }));
    expect(decodeShareData(encoded)).toBeNull();
  });

  it('returns null for payload with wrong version', () => {
    const { compressToEncodedURIComponent } = require('lz-string');
    const payload = {
      v: 2,
      participantCount: 2,
      messageCount: 100,
      dateRange: { start: 0, end: 0 },
      badges: [],
      keyFindings: [],
    };
    const encoded = compressToEncodedURIComponent(JSON.stringify(payload));
    expect(decodeShareData(encoded)).toBeNull();
  });
});

// ============================================================
// Edge cases
// ============================================================

describe('share encoding — edge cases', () => {
  it('handles special characters in names during anonymization', () => {
    const analysis = makeMinimalAnalysis({
      participants: [{ name: 'Józef Śliwiński' }, { name: 'Małgorzata Żółkiewska' }],
      executiveSummary: 'Józef Śliwiński i Małgorzata Żółkiewska rozmawiają.',
    });

    const encoded = encodeShareData(analysis);
    const decoded = decodeShareData(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.executiveSummary).toContain('Osoba A');
    expect(decoded!.executiveSummary).toContain('Osoba B');
    expect(decoded!.executiveSummary).not.toContain('Józef');
    expect(decoded!.executiveSummary).not.toContain('Małgorzata');
  });

  it('handles analysis with no qualitative data', () => {
    const analysis = makeMinimalAnalysis({});
    const encoded = encodeShareData(analysis);
    const decoded = decodeShareData(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.healthScore).toBeNull();
    expect(decoded!.executiveSummary).toBeNull();
    expect(decoded!.roastVerdict).toBeNull();
  });
});
