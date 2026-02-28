/**
 * Snapshot regression test for the full quantitative pipeline.
 *
 * Uses a canonical 200-message conversation between Alice and Bob
 * spanning 3 months with mixed Polish/English content.
 * Any unintended change to the quantitative engine will break this snapshot.
 */
import { describe, it, expect } from 'vitest';
import { computeQuantitativeAnalysis } from '@/lib/analysis/quantitative';
import { makeMsg, makeConversation, resetMsgIndex, BASE_TS, HOUR, DAY, MINUTE } from '@/lib/__tests__/fixtures';
import type { UnifiedMessage } from '@/lib/parsers/types';

/** Build a deterministic 200-message conversation. */
function buildCanonicalConversation() {
  resetMsgIndex();
  const msgs: UnifiedMessage[] = [];
  const senders = ['Alice', 'Bob'];

  // Month 1: 80 messages, normal cadence (every ~1h), some with emoji/reactions
  for (let i = 0; i < 80; i++) {
    const sender = senders[i % 2];
    const ts = BASE_TS + i * HOUR;
    const content = i % 10 === 0
      ? 'Cześć! Jak tam dzisiaj? 😊'
      : i % 7 === 0
        ? 'haha lol that was so funny 😂'
        : i % 5 === 0
          ? 'nie wiem co o tym myślę...'
          : `wiadomość numer ${i}`;
    msgs.push(makeMsg(sender, content, ts, {
      reactions: i % 15 === 0 ? [{ reaction: '❤️', actor: senders[(i + 1) % 2] }] : [],
      hasMedia: i % 20 === 0,
      hasLink: i % 25 === 0,
    }));
  }

  // Month 2: 60 messages, slightly slower (every ~2h), some double-texts
  const month2Start = BASE_TS + 30 * DAY;
  for (let i = 0; i < 60; i++) {
    const sender = i % 3 === 0 ? 'Alice' : 'Bob'; // Bob messages more
    const ts = month2Start + i * 2 * HOUR;
    const content = i % 8 === 0
      ? 'Kocham Cię ❤️'
      : i % 6 === 0
        ? 'sorry za zwłokę, byłam zajęta'
        : `msg miesiąc 2 nr ${i}`;
    msgs.push(makeMsg(sender, content, ts, {
      reactions: i % 10 === 0 ? [{ reaction: '👍', actor: senders[(i + 1) % 2] }] : [],
    }));
  }

  // Month 3: 60 messages, faster (every 30min), more emotional
  const month3Start = BASE_TS + 60 * DAY;
  for (let i = 0; i < 60; i++) {
    const sender = senders[i % 2];
    const ts = month3Start + i * 30 * MINUTE;
    const content = i % 5 === 0
      ? 'Dlaczego ty zawsze tak robisz?!'
      : i % 4 === 0
        ? 'przepraszam, nie chciałem...'
        : i % 3 === 0
          ? 'ok.'
          : `msg miesiąc 3 nr ${i}`;
    msgs.push(makeMsg(sender, content, ts, {
      reactions: i % 8 === 0 ? [{ reaction: '😮', actor: senders[(i + 1) % 2] }] : [],
    }));
  }

  return makeConversation(['Alice', 'Bob'], msgs);
}

describe('quantitative pipeline snapshot', () => {
  const conv = buildCanonicalConversation();
  const result = computeQuantitativeAnalysis(conv);

  it('computes without errors', () => {
    expect(result).toBeDefined();
  });

  it('has all top-level keys', () => {
    expect(result).toHaveProperty('perPerson');
    expect(result).toHaveProperty('timing');
    expect(result).toHaveProperty('engagement');
    expect(result).toHaveProperty('patterns');
    expect(result).toHaveProperty('heatmap');
    expect(result).toHaveProperty('trends');
  });

  it('perPerson has both participants', () => {
    expect(Object.keys(result.perPerson).sort()).toEqual(['Alice', 'Bob']);
  });

  it('total messages match', () => {
    const totalFromPerPerson = Object.values(result.perPerson).reduce(
      (sum, p) => sum + p.totalMessages, 0,
    );
    expect(totalFromPerPerson).toBe(200);
  });

  it('timing.perPerson has both participants', () => {
    expect(Object.keys(result.timing.perPerson).sort()).toEqual(['Alice', 'Bob']);
  });

  it('engagement fields are populated', () => {
    expect(result.engagement.totalSessions).toBeGreaterThan(0);
    expect(result.engagement.avgConversationLength).toBeGreaterThan(0);
  });

  it('patterns.monthlyVolume has entries', () => {
    expect(result.patterns.monthlyVolume.length).toBeGreaterThan(0);
  });

  it('heatmap.combined has 7x24 shape', () => {
    expect(result.heatmap.combined).toHaveLength(7);
    for (const row of result.heatmap.combined) {
      expect(row).toHaveLength(24);
    }
  });

  it('snapshot matches', () => {
    expect(result).toMatchSnapshot();
  });
});
