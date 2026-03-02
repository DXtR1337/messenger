import { describe, it, expect } from 'vitest';
import { detectCommunicationGaps } from '../gaps';
import type { CommunicationGap } from '../gaps';

const DAY = 86_400_000;

function makeMsg(timestamp: number, sender: string) {
  return { timestamp, sender };
}

function makeMonthlyVolume(months: Array<[string, number]>) {
  return months.map(([month, total]) => ({ month, total }));
}

describe('detectCommunicationGaps', () => {
  it('returns empty for conversations with <2 messages', () => {
    expect(detectCommunicationGaps([], [])).toEqual([]);
    expect(detectCommunicationGaps([makeMsg(1000, 'A')], [])).toEqual([]);
  });

  it('returns empty when no gaps exceed 7 days', () => {
    const t0 = Date.parse('2024-01-01T12:00:00Z');
    const messages = [
      makeMsg(t0, 'A'),
      makeMsg(t0 + 1 * DAY, 'B'),
      makeMsg(t0 + 2 * DAY, 'A'),
      makeMsg(t0 + 5 * DAY, 'B'),
      makeMsg(t0 + 6 * DAY, 'A'),
    ];
    expect(detectCommunicationGaps(messages, [])).toEqual([]);
  });

  it('detects a single gap >7 days', () => {
    const t0 = Date.parse('2024-01-01T12:00:00Z');
    const messages = [
      makeMsg(t0, 'A'),
      makeMsg(t0 + 1 * DAY, 'B'),
      makeMsg(t0 + 10 * DAY, 'A'), // 9-day gap
    ];
    const result = detectCommunicationGaps(messages, []);
    expect(result).toHaveLength(1);
    expect(result[0].durationDays).toBe(9);
    expect(result[0].lastSender).toBe('B');
    expect(result[0].nextSender).toBe('A');
    expect(result[0].classification).toBe('cooling_off');
  });

  it('detects multiple gaps and sorts by duration descending', () => {
    const t0 = Date.parse('2024-01-01T12:00:00Z');
    const messages = [
      makeMsg(t0, 'A'),
      makeMsg(t0 + 10 * DAY, 'B'),       // 10-day gap
      makeMsg(t0 + 12 * DAY, 'A'),
      makeMsg(t0 + 50 * DAY, 'B'),       // 38-day gap
      makeMsg(t0 + 52 * DAY, 'A'),
      makeMsg(t0 + 75 * DAY, 'B'),       // 23-day gap
    ];
    const result = detectCommunicationGaps(messages, []);
    expect(result).toHaveLength(3);
    // Sorted by duration desc: 38, 23, 10
    expect(result[0].durationDays).toBe(38);
    expect(result[1].durationDays).toBe(23);
    expect(result[2].durationDays).toBe(10);
  });

  it('classifies cooling_off (7-14 days)', () => {
    const t0 = Date.parse('2024-01-01T12:00:00Z');
    const messages = [
      makeMsg(t0, 'A'),
      makeMsg(t0 + 8 * DAY, 'B'),
    ];
    const result = detectCommunicationGaps(messages, []);
    expect(result[0].classification).toBe('cooling_off');
  });

  it('classifies potential_breakup (14-30 days)', () => {
    const t0 = Date.parse('2024-01-01T12:00:00Z');
    const messages = [
      makeMsg(t0, 'A'),
      makeMsg(t0 + 20 * DAY, 'B'),
    ];
    const result = detectCommunicationGaps(messages, []);
    expect(result[0].classification).toBe('potential_breakup');
  });

  it('classifies extended_separation (30+ days)', () => {
    const t0 = Date.parse('2024-01-01T12:00:00Z');
    const messages = [
      makeMsg(t0, 'A'),
      makeMsg(t0 + 60 * DAY, 'B'),
    ];
    const result = detectCommunicationGaps(messages, []);
    expect(result[0].classification).toBe('extended_separation');
    expect(result[0].durationDays).toBe(60);
  });

  it('caps at 15 gaps', () => {
    const t0 = Date.parse('2024-01-01T12:00:00Z');
    // 20 gaps of 8 days each
    const messages = [];
    for (let i = 0; i < 21; i++) {
      messages.push(makeMsg(t0 + i * 10 * DAY, i % 2 === 0 ? 'A' : 'B'));
    }
    const result = detectCommunicationGaps(messages, []);
    expect(result.length).toBeLessThanOrEqual(15);
  });

  it('includes volume before/after from monthlyVolume', () => {
    const t0 = Date.parse('2024-09-05T12:00:00Z');
    const messages = [
      makeMsg(t0, 'Laura'),
      makeMsg(t0 + 35 * DAY, 'Michał'), // 35-day gap: Sep 5 → Oct 10
    ];
    const monthlyVolume = makeMonthlyVolume([
      ['2024-08', 200],
      ['2024-09', 285],
      ['2024-10', 142],
    ]);
    const result = detectCommunicationGaps(messages, monthlyVolume);
    expect(result).toHaveLength(1);
    expect(result[0].volumeBefore).toBe(285); // Sep (last msg before gap)
    expect(result[0].volumeAfter).toBe(142);  // Oct (first msg after gap)
  });

  it('boundary: exactly 7 days is detected', () => {
    const t0 = Date.parse('2024-01-01T12:00:00Z');
    const messages = [
      makeMsg(t0, 'A'),
      makeMsg(t0 + 7 * DAY, 'B'),
    ];
    const result = detectCommunicationGaps(messages, []);
    expect(result).toHaveLength(1);
    expect(result[0].durationDays).toBe(7);
    expect(result[0].classification).toBe('cooling_off');
  });

  it('boundary: 6.9 days is NOT detected', () => {
    const t0 = Date.parse('2024-01-01T12:00:00Z');
    const messages = [
      makeMsg(t0, 'A'),
      makeMsg(t0 + 6.9 * DAY, 'B'),
    ];
    const result = detectCommunicationGaps(messages, []);
    expect(result).toHaveLength(0);
  });

  it('boundary: exactly 14 days = potential_breakup', () => {
    const t0 = Date.parse('2024-01-01T12:00:00Z');
    const messages = [
      makeMsg(t0, 'A'),
      makeMsg(t0 + 14 * DAY, 'B'),
    ];
    const result = detectCommunicationGaps(messages, []);
    expect(result[0].classification).toBe('potential_breakup');
  });

  it('boundary: exactly 30 days = extended_separation', () => {
    const t0 = Date.parse('2024-01-01T12:00:00Z');
    const messages = [
      makeMsg(t0, 'A'),
      makeMsg(t0 + 30 * DAY, 'B'),
    ];
    const result = detectCommunicationGaps(messages, []);
    expect(result[0].classification).toBe('extended_separation');
  });
});
