/**
 * Tests for Telegram JSON parser.
 */
import { describe, it, expect } from 'vitest';
import {
  validateTelegramJSON,
  parseTelegramJSON,
} from '../telegram';

// ============================================================
// Fixtures
// ============================================================

function makeTGMessage(overrides?: Record<string, unknown>) {
  return {
    id: 1,
    type: 'message',
    date: '2024-01-01T10:00:00',
    date_unixtime: '1704103200',
    from: 'Anna',
    from_id: 'user111',
    text: 'Hej!',
    ...overrides,
  };
}

function makeTGExport(overrides?: Record<string, unknown>) {
  return {
    name: 'Test Chat',
    type: 'personal_chat',
    id: 12345,
    messages: [
      makeTGMessage(),
      makeTGMessage({
        id: 2,
        date: '2024-01-01T10:01:00',
        date_unixtime: '1704103260',
        from: 'Bartek',
        from_id: 'user222',
        text: 'Cześć!',
      }),
    ],
    ...overrides,
  };
}

// ============================================================
// validateTelegramJSON
// ============================================================

describe('validateTelegramJSON', () => {
  it('returns true for a valid Telegram export', () => {
    expect(validateTelegramJSON(makeTGExport())).toBe(true);
  });

  it('returns true for an export with empty messages array', () => {
    // Unlike Instagram, Telegram validator accepts empty messages
    expect(validateTelegramJSON(makeTGExport({ messages: [] }))).toBe(true);
  });

  it('returns false for null', () => {
    expect(validateTelegramJSON(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(validateTelegramJSON(undefined)).toBe(false);
  });

  it('returns false for a plain string', () => {
    expect(validateTelegramJSON('not an object')).toBe(false);
  });

  it('returns false for a number', () => {
    expect(validateTelegramJSON(42)).toBe(false);
  });

  it('returns false when name field is missing', () => {
    const { name: _n, ...withoutName } = makeTGExport();
    expect(validateTelegramJSON(withoutName)).toBe(false);
  });

  it('returns false when type field is missing', () => {
    const { type: _t, ...withoutType } = makeTGExport();
    expect(validateTelegramJSON(withoutType)).toBe(false);
  });

  it('returns false when id field is missing', () => {
    const { id: _i, ...withoutId } = makeTGExport();
    expect(validateTelegramJSON(withoutId)).toBe(false);
  });

  it('returns false when messages field is missing', () => {
    const { messages: _m, ...withoutMessages } = makeTGExport();
    expect(validateTelegramJSON(withoutMessages)).toBe(false);
  });

  it('returns false when id is a string instead of number', () => {
    expect(validateTelegramJSON(makeTGExport({ id: '12345' }))).toBe(false);
  });

  it('returns true when first message has date_unixtime (no date required separately)', () => {
    const raw = makeTGExport({
      messages: [
        { id: 1, type: 'message', date_unixtime: '1704103200', from: 'Anna', text: 'Hi' },
      ],
    });
    expect(validateTelegramJSON(raw)).toBe(true);
  });

  it('returns true when first message has date but no date_unixtime', () => {
    const raw = makeTGExport({
      messages: [
        { id: 1, type: 'message', date: '2024-01-01T10:00:00', from: 'Anna', text: 'Hi' },
      ],
    });
    expect(validateTelegramJSON(raw)).toBe(true);
  });

  it('returns false when first message has neither date nor date_unixtime', () => {
    const raw = makeTGExport({
      messages: [
        { id: 1, type: 'message', from: 'Anna', text: 'Hi' },
      ],
    });
    expect(validateTelegramJSON(raw)).toBe(false);
  });
});

// ============================================================
// parseTelegramJSON — basic parsing
// ============================================================

describe('parseTelegramJSON — basic parsing', () => {
  it('parses valid Telegram export into a ParsedConversation', () => {
    const result = parseTelegramJSON(makeTGExport());
    expect(result.platform).toBe('telegram');
    expect(result.messages).toHaveLength(2);
  });

  it('extracts conversation name as title', () => {
    const result = parseTelegramJSON(makeTGExport({ name: 'Anna & Bartek' }));
    expect(result.title).toBe('Anna & Bartek');
  });

  it('derives participant names from message authors (not a participants array)', () => {
    const result = parseTelegramJSON(makeTGExport());
    const names = result.participants.map((p) => p.name);
    expect(names).toContain('Anna');
    expect(names).toContain('Bartek');
  });

  it('preserves message order (Telegram exports are already chronological)', () => {
    const result = parseTelegramJSON(makeTGExport());
    expect(result.messages[0].sender).toBe('Anna');
    expect(result.messages[1].sender).toBe('Bartek');
  });

  it('uses date_unixtime for timestamp when available', () => {
    const result = parseTelegramJSON(makeTGExport());
    // date_unixtime: '1704103200' → 1704103200000 ms
    expect(result.messages[0].timestamp).toBe(1704103200 * 1000);
  });

  it('falls back to parsing date ISO string when date_unixtime is absent', () => {
    const raw = makeTGExport({
      messages: [
        makeTGMessage({
          date: '2024-01-01T10:00:00',
          date_unixtime: undefined,
        }),
      ],
    });
    const result = parseTelegramJSON(raw);
    const expected = new Date('2024-01-01T10:00:00').getTime();
    expect(result.messages[0].timestamp).toBe(expected);
  });

  it('assigns sequential index starting from 0', () => {
    const result = parseTelegramJSON(makeTGExport());
    expect(result.messages[0].index).toBe(0);
    expect(result.messages[1].index).toBe(1);
  });

  it('sets isGroup false for 2 participants', () => {
    const result = parseTelegramJSON(makeTGExport());
    expect(result.metadata.isGroup).toBe(false);
  });

  it('collects unique participants — same author appearing multiple times counts once', () => {
    const raw = makeTGExport({
      messages: [
        makeTGMessage({ id: 1, from: 'Anna', text: 'Hi' }),
        makeTGMessage({ id: 2, from: 'Anna', text: 'Hello again' }),
        makeTGMessage({ id: 3, from: 'Bartek', text: 'Hey' }),
      ],
    });
    const result = parseTelegramJSON(raw);
    expect(result.participants).toHaveLength(2);
  });
});

// ============================================================
// parseTelegramJSON — text field parsing
// ============================================================

describe('parseTelegramJSON — text field parsing', () => {
  it('handles simple string text field', () => {
    const raw = makeTGExport({
      messages: [makeTGMessage({ text: 'Hello World' })],
    });
    const result = parseTelegramJSON(raw);
    expect(result.messages[0].content).toBe('Hello World');
  });

  it('handles text as array of strings — concatenates them', () => {
    const raw = makeTGExport({
      messages: [makeTGMessage({ text: ['Hello', ' ', 'World'] })],
    });
    const result = parseTelegramJSON(raw);
    expect(result.messages[0].content).toBe('Hello World');
  });

  it('handles text as array of entity objects — extracts .text from each', () => {
    const raw = makeTGExport({
      messages: [
        makeTGMessage({
          text: [
            { type: 'bold', text: 'Important' },
            { type: 'plain', text: ' message' },
          ],
        }),
      ],
    });
    const result = parseTelegramJSON(raw);
    expect(result.messages[0].content).toBe('Important message');
  });

  it('handles text as mixed array of strings and entity objects', () => {
    const raw = makeTGExport({
      messages: [
        makeTGMessage({
          text: [
            'Check this: ',
            { type: 'link', text: 'https://example.com' },
          ],
        }),
      ],
    });
    const result = parseTelegramJSON(raw);
    expect(result.messages[0].content).toBe('Check this: https://example.com');
  });

  it('handles empty text array — produces empty content', () => {
    const raw = makeTGExport({
      messages: [makeTGMessage({ text: [] })],
    });
    const result = parseTelegramJSON(raw);
    expect(result.messages[0].content).toBe('');
  });

  it('handles empty string text — produces empty content', () => {
    const raw = makeTGExport({
      messages: [makeTGMessage({ text: '' })],
    });
    const result = parseTelegramJSON(raw);
    expect(result.messages[0].content).toBe('');
  });
});

// ============================================================
// parseTelegramJSON — service message filtering
// ============================================================

describe('parseTelegramJSON — service message filtering', () => {
  it('excludes messages with type "service"', () => {
    const raw = makeTGExport({
      messages: [
        makeTGMessage({ id: 1, type: 'service', text: '', action: 'phone_call' }),
        makeTGMessage({ id: 2, type: 'message', text: 'Regular message', from: 'Anna' }),
      ],
    });
    const result = parseTelegramJSON(raw);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].content).toBe('Regular message');
  });

  it('classifies messages with action field as "system" (included in output but marked system)', () => {
    // parseTelegramJSON skips type !== 'message', but action-field messages still have
    // type === 'message'. classifyType() returns 'system' for them, and they ARE included
    // in the messages array — just with type: 'system'.
    const raw = makeTGExport({
      messages: [
        makeTGMessage({ id: 1, action: 'invite_members', text: '' }),
        makeTGMessage({ id: 2, text: 'Normal message' }),
      ],
    });
    const result = parseTelegramJSON(raw);
    // Both messages are included: one as 'system', one as 'text'
    expect(result.messages).toHaveLength(2);
    const systemMsg = result.messages.find((m) => m.type === 'system');
    const normalMsg = result.messages.find((m) => m.type === 'text');
    expect(systemMsg).toBeDefined();
    expect(normalMsg?.content).toBe('Normal message');
    // totalMessages in metadata excludes system messages
    expect(result.metadata.totalMessages).toBe(1);
  });

  it('excludes messages with missing from field', () => {
    const raw = makeTGExport({
      messages: [
        // message without 'from' — anonymous/system
        { id: 1, type: 'message', date: '2024-01-01T10:00:00', date_unixtime: '1704103200', text: 'System' },
        makeTGMessage({ id: 2, from: 'Anna', text: 'Normal' }),
      ],
    });
    const result = parseTelegramJSON(raw);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].content).toBe('Normal');
  });

  it('includes regular messages (type: "message")', () => {
    const result = parseTelegramJSON(makeTGExport());
    expect(result.messages).toHaveLength(2);
    expect(result.messages.every((m) => m.type !== 'system')).toBe(true);
  });
});

// ============================================================
// parseTelegramJSON — media detection
// ============================================================

describe('parseTelegramJSON — media detection', () => {
  it('detects photo attachments', () => {
    const raw = makeTGExport({
      messages: [
        makeTGMessage({
          photo: '(File not included. Change data exporting settings to download.)',
          text: '',
        }),
      ],
    });
    const result = parseTelegramJSON(raw);
    expect(result.messages[0].type).toBe('media');
    expect(result.messages[0].hasMedia).toBe(true);
  });

  it('detects file attachments via file field', () => {
    const raw = makeTGExport({
      messages: [
        makeTGMessage({
          file: 'files/document.pdf',
          text: '',
        }),
      ],
    });
    const result = parseTelegramJSON(raw);
    expect(result.messages[0].type).toBe('media');
    expect(result.messages[0].hasMedia).toBe(true);
  });

  it('detects voice messages (media_type: "voice_message")', () => {
    const raw = makeTGExport({
      messages: [
        makeTGMessage({
          media_type: 'voice_message',
          file: 'audio/voice.ogg',
          text: '',
        }),
      ],
    });
    const result = parseTelegramJSON(raw);
    expect(result.messages[0].type).toBe('media');
    expect(result.messages[0].hasMedia).toBe(true);
  });

  it('detects video files (media_type: "video_file")', () => {
    const raw = makeTGExport({
      messages: [
        makeTGMessage({
          media_type: 'video_file',
          file: 'videos/clip.mp4',
          text: '',
        }),
      ],
    });
    const result = parseTelegramJSON(raw);
    expect(result.messages[0].type).toBe('media');
    expect(result.messages[0].hasMedia).toBe(true);
  });

  it('detects sticker messages via sticker_emoji field — type is "sticker"', () => {
    const raw = makeTGExport({
      messages: [
        makeTGMessage({
          sticker_emoji: '😊',
          media_type: 'sticker',
          text: '',
        }),
      ],
    });
    const result = parseTelegramJSON(raw);
    expect(result.messages[0].type).toBe('sticker');
    // Content for sticker messages is the sticker_emoji itself
    expect(result.messages[0].content).toBe('😊');
  });

  it('detects call messages via duration_seconds field', () => {
    const raw = makeTGExport({
      messages: [
        makeTGMessage({
          duration_seconds: 120,
          text: '',
        }),
      ],
    });
    const result = parseTelegramJSON(raw);
    expect(result.messages[0].type).toBe('call');
  });

  it('classifies plain URL-only content as link', () => {
    const raw = makeTGExport({
      messages: [
        makeTGMessage({ text: 'https://example.com' }),
      ],
    });
    const result = parseTelegramJSON(raw);
    expect(result.messages[0].type).toBe('link');
  });

  it('sets hasLink true when content contains https URL (even for non-link type)', () => {
    const raw = makeTGExport({
      messages: [
        makeTGMessage({ text: 'Check https://example.com for details' }),
      ],
    });
    const result = parseTelegramJSON(raw);
    // Content has URL but is not a pure URL — classified as 'text'
    expect(result.messages[0].type).toBe('text');
    expect(result.messages[0].hasLink).toBe(true);
  });
});

// ============================================================
// parseTelegramJSON — reactions
// ============================================================

describe('parseTelegramJSON — reactions', () => {
  it('parses reactions with recent field into per-person reactions', () => {
    const raw = makeTGExport({
      messages: [
        makeTGMessage({
          reactions: [
            {
              emoji: '👍',
              count: 1,
              recent: [{ from: 'Bartek', date: '2024-01-01T10:05:00' }],
            },
          ],
        }),
      ],
    });
    const result = parseTelegramJSON(raw);
    expect(result.messages[0].reactions).toHaveLength(1);
    expect(result.messages[0].reactions[0].emoji).toBe('👍');
    expect(result.messages[0].reactions[0].actor).toBe('Bartek');
  });

  it('handles multiple people reacting to the same emoji', () => {
    const raw = makeTGExport({
      messages: [
        makeTGMessage({
          reactions: [
            {
              emoji: '❤️',
              count: 2,
              recent: [
                { from: 'Bartek', date: '2024-01-01T10:05:00' },
                { from: 'Celina', date: '2024-01-01T10:06:00' },
              ],
            },
          ],
        }),
      ],
    });
    const result = parseTelegramJSON(raw);
    expect(result.messages[0].reactions).toHaveLength(2);
    expect(result.messages[0].reactions[0].actor).toBe('Bartek');
    expect(result.messages[0].reactions[1].actor).toBe('Celina');
  });

  it('handles messages with no reactions', () => {
    const result = parseTelegramJSON(makeTGExport());
    expect(result.messages[0].reactions).toHaveLength(0);
  });

  it('handles reactions without recent field — produces no reactions', () => {
    const raw = makeTGExport({
      messages: [
        makeTGMessage({
          reactions: [
            {
              emoji: '👍',
              count: 3,
              // no recent field
            },
          ],
        }),
      ],
    });
    const result = parseTelegramJSON(raw);
    // Without 'recent', the loop over r.recent is skipped → 0 reactions
    expect(result.messages[0].reactions).toHaveLength(0);
  });
});

// ============================================================
// parseTelegramJSON — forwarded messages
// ============================================================

describe('parseTelegramJSON — forwarded messages', () => {
  it('includes forwarded messages in parsed output', () => {
    const raw = makeTGExport({
      messages: [
        makeTGMessage({
          forwarded_from: 'SomeChannel',
          text: 'Forwarded content',
        }),
      ],
    });
    const result = parseTelegramJSON(raw);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].content).toBe('Forwarded content');
  });
});

// ============================================================
// parseTelegramJSON — error handling
// ============================================================

describe('parseTelegramJSON — error handling', () => {
  it('throws with Polish error message for invalid data', () => {
    expect(() => parseTelegramJSON({ invalid: true })).toThrow(
      'Nieprawidłowy format eksportu Telegram',
    );
  });

  it('throws on null input', () => {
    expect(() => parseTelegramJSON(null)).toThrow('Nieprawidłowy format eksportu Telegram');
  });

  it('throws on string input', () => {
    expect(() => parseTelegramJSON('not json')).toThrow('Nieprawidłowy format eksportu Telegram');
  });

  it('throws on missing messages field', () => {
    expect(() =>
      parseTelegramJSON({ name: 'Chat', type: 'personal_chat', id: 1 })
    ).toThrow('Nieprawidłowy format eksportu Telegram');
  });
});

// ============================================================
// parseTelegramJSON — group chats
// ============================================================

describe('parseTelegramJSON — group chats', () => {
  it('handles 3+ participants and sets isGroup to true', () => {
    const raw = makeTGExport({
      messages: [
        makeTGMessage({ id: 1, from: 'Anna', text: 'Hi' }),
        makeTGMessage({ id: 2, from: 'Bartek', text: 'Hey' }),
        makeTGMessage({ id: 3, from: 'Celina', text: 'Hello' }),
      ],
    });
    const result = parseTelegramJSON(raw);
    expect(result.participants).toHaveLength(3);
    expect(result.metadata.isGroup).toBe(true);
  });
});

// ============================================================
// parseTelegramJSON — empty conversations
// ============================================================

describe('parseTelegramJSON — empty conversations', () => {
  it('handles empty messages array gracefully — returns 0 messages', () => {
    const raw = makeTGExport({ messages: [] });
    const result = parseTelegramJSON(raw);
    expect(result.messages).toHaveLength(0);
    expect(result.participants).toHaveLength(0);
    expect(result.metadata.totalMessages).toBe(0);
  });
});
