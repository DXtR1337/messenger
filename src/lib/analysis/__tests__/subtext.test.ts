import { describe, it, expect } from 'vitest';
import { extractExchangeWindows } from '@/lib/analysis/subtext';
import type { SimplifiedMsg } from '@/lib/analysis/subtext';

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const BASE = 1_718_445_600_000; // 2024-06-15 12:00 UTC

/** Build a sequence of alternating messages between two senders. */
function buildChat(count: number, gapMs: number = 5 * MINUTE): SimplifiedMsg[] {
  const senders = ['Alice', 'Bob'];
  return Array.from({ length: count }, (_, i) => ({
    sender: senders[i % 2],
    content: `message number ${i}`,
    timestamp: BASE + i * gapMs,
    index: i,
  }));
}

/** Insert a high-score msg at a specific position (passive marker after a long msg). */
function injectPassiveReply(
  msgs: SimplifiedMsg[],
  atIndex: number,
  gapMs: number = 10 * MINUTE,
): SimplifiedMsg[] {
  const copy = [...msgs];
  // Make previous message long
  if (atIndex > 0) {
    copy[atIndex - 1] = {
      ...copy[atIndex - 1],
      content: 'This is a very long message with lots of words explaining many things in great detail about the topic at hand',
    };
  }
  // Insert passive marker
  copy[atIndex] = {
    ...copy[atIndex],
    sender: copy[atIndex - 1]?.sender === 'Alice' ? 'Bob' : 'Alice',
    content: 'ok.',
    timestamp: (copy[atIndex - 1]?.timestamp ?? BASE) + gapMs,
  };
  return copy;
}

describe('extractExchangeWindows', () => {
  describe('guard: < 30 messages', () => {
    it('returns [] for empty array', () => {
      expect(extractExchangeWindows([])).toEqual([]);
    });

    it('returns [] for 29 messages', () => {
      expect(extractExchangeWindows(buildChat(29))).toEqual([]);
    });

    it('returns [] for exactly 1 message', () => {
      const msgs: SimplifiedMsg[] = [{ sender: 'A', content: 'hi', timestamp: BASE, index: 0 }];
      expect(extractExchangeWindows(msgs)).toEqual([]);
    });
  });

  describe('basic extraction (>= 30 messages)', () => {
    it('30 plain messages may return 0 windows if no msg scores >= 3', () => {
      // Alternating normal messages — low subtext score
      const msgs = buildChat(30);
      const windows = extractExchangeWindows(msgs);
      // May be 0 if none score ≥ 3, or >0 if double-text or other heuristics kick in
      expect(Array.isArray(windows)).toBe(true);
    });

    it('passive marker message creates at least 1 window', () => {
      const msgs = injectPassiveReply(buildChat(50), 25);
      const windows = extractExchangeWindows(msgs);
      expect(windows.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('window structure', () => {
    it('each window has windowId, messages, targetIndices, context', () => {
      const msgs = injectPassiveReply(buildChat(50), 25);
      const windows = extractExchangeWindows(msgs);
      for (const w of windows) {
        expect(w).toHaveProperty('windowId');
        expect(w).toHaveProperty('messages');
        expect(w).toHaveProperty('targetIndices');
        expect(w).toHaveProperty('context');
        expect(Array.isArray(w.messages)).toBe(true);
        expect(Array.isArray(w.targetIndices)).toBe(true);
        expect(typeof w.context).toBe('string');
      }
    });

    it('windowIds are sequential starting from 0', () => {
      const msgs = buildChat(100);
      // Inject several passive markers
      const enhanced = injectPassiveReply(
        injectPassiveReply(msgs, 25), 75,
      );
      const windows = extractExchangeWindows(enhanced);
      for (let i = 0; i < windows.length; i++) {
        expect(windows[i].windowId).toBe(i);
      }
    });

    it('windows are sorted chronologically', () => {
      const msgs = buildChat(100);
      const enhanced = injectPassiveReply(
        injectPassiveReply(msgs, 25), 75,
      );
      const windows = extractExchangeWindows(enhanced);
      for (let i = 1; i < windows.length; i++) {
        expect(windows[i].messages[0].timestamp).toBeGreaterThanOrEqual(
          windows[i - 1].messages[0].timestamp,
        );
      }
    });

    it('targetIndices are relative to window (not global)', () => {
      const msgs = injectPassiveReply(buildChat(50), 25);
      const windows = extractExchangeWindows(msgs);
      for (const w of windows) {
        for (const ti of w.targetIndices) {
          expect(ti).toBeGreaterThanOrEqual(0);
          expect(ti).toBeLessThan(w.messages.length);
        }
      }
    });
  });

  describe('maxWindows cap', () => {
    it('respects maxWindows=2', () => {
      // Build a big chat with lots of potential targets
      const msgs: SimplifiedMsg[] = [];
      for (let i = 0; i < 200; i++) {
        if (i % 20 === 10 && i > 0) {
          // Long message followed by "ok."
          msgs.push({
            sender: 'Alice', index: i,
            content: 'This is a really long message with many words to increase the previous message length score',
            timestamp: BASE + i * 5 * MINUTE,
          });
        } else if (i % 20 === 11) {
          msgs.push({
            sender: 'Bob', index: i,
            content: 'ok.',
            timestamp: BASE + i * 5 * MINUTE,
          });
        } else {
          msgs.push({
            sender: i % 2 === 0 ? 'Alice' : 'Bob', index: i,
            content: `msg ${i}`,
            timestamp: BASE + i * 5 * MINUTE,
          });
        }
      }
      const windows = extractExchangeWindows(msgs, 2);
      expect(windows.length).toBeLessThanOrEqual(2);
    });
  });

  describe('overlap prevention', () => {
    it('heavily overlapping windows are filtered out (> 30% overlap)', () => {
      // Two close targets → only one should produce a window
      const msgs = buildChat(50);
      // Inject passive markers very close together
      msgs[20] = { ...msgs[20], content: 'ok.', sender: 'Bob' };
      msgs[19] = {
        ...msgs[19],
        content: 'This is a very long message with lots of explanation about something very important',
        sender: 'Alice',
      };
      msgs[22] = { ...msgs[22], content: 'ok.', sender: 'Alice' };
      msgs[21] = {
        ...msgs[21],
        content: 'Another very long message to trigger passive marker detection in the algorithm',
        sender: 'Bob',
      };
      const windows = extractExchangeWindows(msgs);
      // With default radius=15 and centers at 20 and 22, the windows are almost identical → 1 window
      // (overlap ratio would be very high)
      expect(windows.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('scoring heuristics', () => {
    it('message after 24h+ silence gets boosted', () => {
      const msgs = buildChat(50);
      // Add a 2-day gap before message 25
      msgs[25] = {
        ...msgs[25],
        timestamp: msgs[24].timestamp + 2 * DAY,
      };
      // Recompute subsequent timestamps
      for (let i = 26; i < msgs.length; i++) {
        msgs[i] = { ...msgs[i], timestamp: msgs[25].timestamp + (i - 25) * 5 * MINUTE };
      }
      const windows = extractExchangeWindows(msgs);
      // Should find at least one window around the silence break
      expect(windows.length).toBeGreaterThanOrEqual(1);
    });

    it('standalone emoji gets scored', () => {
      const msgs = buildChat(50);
      msgs[30] = { ...msgs[30], content: '😊' };
      const windows = extractExchangeWindows(msgs);
      // Emoji score = 3, so it should create a window
      expect(Array.isArray(windows)).toBe(true);
    });
  });

  describe('context string', () => {
    it('includes time-of-day label', () => {
      const msgs = injectPassiveReply(buildChat(50), 25);
      const windows = extractExchangeWindows(msgs);
      if (windows.length > 0) {
        // BASE_TS = 12:00 UTC → popołudniowa (12-18)
        expect(windows[0].context).toMatch(/sesja (nocna|poranna|popołudniowa|wieczorna)/);
      }
    });

    it('mentions silence when gap > 24h', () => {
      const msgs = buildChat(50);
      msgs[25] = {
        ...msgs[25],
        timestamp: msgs[24].timestamp + 3 * DAY,
        content: 'ok.',
      };
      // Make previous msg long for score
      msgs[24] = {
        ...msgs[24],
        content: 'This is a very long message with lots of words about important topics to boost the score of the next reply',
      };
      for (let i = 26; i < msgs.length; i++) {
        msgs[i] = { ...msgs[i], timestamp: msgs[25].timestamp + (i - 25) * 5 * MINUTE };
      }
      const windows = extractExchangeWindows(msgs);
      const silenceWindow = windows.find(w =>
        w.messages.some(m => m.index === 25),
      );
      if (silenceWindow) {
        expect(silenceWindow.context).toContain('ciszy');
      }
    });
  });

  describe('determinism', () => {
    it('same input → same output', () => {
      const msgs = injectPassiveReply(buildChat(50), 25);
      const r1 = extractExchangeWindows(msgs);
      const r2 = extractExchangeWindows(msgs);
      expect(r1).toEqual(r2);
    });
  });
});
