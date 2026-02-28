/**
 * Tests for Instagram DM JSON parser.
 */
import { describe, it, expect } from 'vitest';
import {
  validateInstagramJSON,
  parseInstagramJSON,
  mergeInstagramFiles,
} from '../instagram';

// ============================================================
// Fixtures
// ============================================================

const BASE_TIMESTAMP_MS = 1700000000000;

function makeIGExport(overrides?: Partial<{
  participants: Array<{ name: string }>;
  messages: Array<Record<string, unknown>>;
  title: string;
}>) {
  return {
    participants: [{ name: 'Anna' }, { name: 'Bartek' }],
    messages: [
      {
        sender_name: 'Bartek',
        timestamp_ms: BASE_TIMESTAMP_MS + 60000,
        // Use ASCII-safe content in the default fixture.
        // decodeFBString re-encodes bytes as latin-1 → UTF-8, which would corrupt
        // real Polish characters if they were stored as native UTF-8.
        content: 'Hello!',
        type: 'Generic',
      },
      {
        sender_name: 'Anna',
        timestamp_ms: BASE_TIMESTAMP_MS,
        content: 'Hey!',
        type: 'Generic',
      },
    ],
    title: 'Test Chat',
    ...overrides,
  };
}

// ============================================================
// validateInstagramJSON
// ============================================================

describe('validateInstagramJSON', () => {
  it('returns true for a valid IG export', () => {
    expect(validateInstagramJSON(makeIGExport())).toBe(true);
  });

  it('returns false for null', () => {
    expect(validateInstagramJSON(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(validateInstagramJSON(undefined)).toBe(false);
  });

  it('returns false for a plain string', () => {
    expect(validateInstagramJSON('not an object')).toBe(false);
  });

  it('returns false for a number', () => {
    expect(validateInstagramJSON(42)).toBe(false);
  });

  it('returns false when participants field is missing', () => {
    const { participants: _p, ...withoutParticipants } = makeIGExport();
    expect(validateInstagramJSON(withoutParticipants)).toBe(false);
  });

  it('returns false when messages field is missing', () => {
    const { messages: _m, ...withoutMessages } = makeIGExport();
    expect(validateInstagramJSON(withoutMessages)).toBe(false);
  });

  it('returns false when messages array is empty', () => {
    // Instagram validator rejects empty messages — unlike Telegram
    expect(validateInstagramJSON(makeIGExport({ messages: [] }))).toBe(false);
  });

  it('returns false when first message lacks sender_name', () => {
    expect(validateInstagramJSON({
      participants: [{ name: 'Anna' }],
      messages: [{ timestamp_ms: BASE_TIMESTAMP_MS }],
      title: 'test',
    })).toBe(false);
  });

  it('returns false when first message lacks timestamp_ms', () => {
    expect(validateInstagramJSON({
      participants: [{ name: 'Anna' }],
      messages: [{ sender_name: 'Anna' }],
      title: 'test',
    })).toBe(false);
  });

  it('returns false when participants is not an array', () => {
    expect(validateInstagramJSON({
      participants: 'Anna',
      messages: [{ sender_name: 'Anna', timestamp_ms: BASE_TIMESTAMP_MS }],
      title: 'test',
    })).toBe(false);
  });
});

// ============================================================
// parseInstagramJSON — basic parsing
// ============================================================

describe('parseInstagramJSON — basic parsing', () => {
  it('parses valid IG export into a ParsedConversation', () => {
    const result = parseInstagramJSON(makeIGExport());
    expect(result.platform).toBe('instagram');
    expect(result.participants).toHaveLength(2);
    expect(result.messages).toHaveLength(2);
  });

  it('sets title from the export title field', () => {
    const result = parseInstagramJSON(makeIGExport({ title: 'Anna & Bartek' }));
    expect(result.title).toBe('Anna & Bartek');
  });

  it('falls back to participant names joined by & when title is absent', () => {
    const raw = makeIGExport();
    const { title: _t, ...withoutTitle } = raw;
    const result = parseInstagramJSON(withoutTitle);
    // Title should be built from participant names
    expect(result.title).toContain('Anna');
    expect(result.title).toContain('Bartek');
  });

  it('extracts correct participant names', () => {
    const result = parseInstagramJSON(makeIGExport());
    const names = result.participants.map((p) => p.name);
    expect(names).toContain('Anna');
    expect(names).toContain('Bartek');
  });

  it('reverses messages from newest-first to chronological (oldest first)', () => {
    // makeIGExport: array order is [Bartek@+60000, Anna@BASE], newest-first.
    // After reversal, Anna (older) should be at index 0.
    const result = parseInstagramJSON(makeIGExport());
    expect(result.messages[0].sender).toBe('Anna');
    expect(result.messages[0].timestamp).toBe(BASE_TIMESTAMP_MS);
    expect(result.messages[0].content).toBe('Hey!');
    expect(result.messages[1].sender).toBe('Bartek');
    expect(result.messages[1].timestamp).toBe(BASE_TIMESTAMP_MS + 60000);
    expect(result.messages[1].content).toBe('Hello!');
  });

  it('preserves message content', () => {
    const result = parseInstagramJSON(makeIGExport());
    expect(result.messages[0].content).toBe('Hey!');
    expect(result.messages[1].content).toBe('Hello!');
  });

  it('assigns sequential index starting from 0', () => {
    const result = parseInstagramJSON(makeIGExport());
    expect(result.messages[0].index).toBe(0);
    expect(result.messages[1].index).toBe(1);
  });

  it('sets isGroup false for 2 participants', () => {
    const result = parseInstagramJSON(makeIGExport());
    expect(result.metadata.isGroup).toBe(false);
  });

  it('sets totalMessages count excluding system messages', () => {
    const result = parseInstagramJSON(makeIGExport());
    expect(result.metadata.totalMessages).toBe(2);
  });

  it('handles messages with missing content field (returns empty string)', () => {
    const raw = makeIGExport({
      messages: [
        {
          sender_name: 'Anna',
          timestamp_ms: BASE_TIMESTAMP_MS,
          type: 'Generic',
          // no content field
        },
      ],
    });
    const result = parseInstagramJSON(raw);
    expect(result.messages[0].content).toBe('');
  });
});

// ============================================================
// parseInstagramJSON — FB Unicode decoding
// ============================================================

describe('parseInstagramJSON — FB Unicode decoding', () => {
  it('decodes FB latin-1 escaped Polish characters in content', () => {
    // "Cześć" encoded as latin-1 bytes
    const raw = makeIGExport({
      messages: [
        {
          sender_name: 'Anna',
          timestamp_ms: BASE_TIMESTAMP_MS,
          content: 'Cze\u00c5\u009b\u00c4\u0087',
          type: 'Generic',
        },
      ],
    });
    const result = parseInstagramJSON(raw);
    expect(result.messages[0].content).toBe('Cześć');
  });

  it('decodes FB-encoded emoji in content', () => {
    // Thumbs up 👍 = F0 9F 91 8D in UTF-8, encoded as 4 latin-1 chars
    const raw = makeIGExport({
      messages: [
        {
          sender_name: 'Anna',
          timestamp_ms: BASE_TIMESTAMP_MS,
          content: '\u00f0\u009f\u0091\u008d',
          type: 'Generic',
        },
      ],
    });
    const result = parseInstagramJSON(raw);
    expect(result.messages[0].content).toBe('👍');
  });

  it('decodes FB-encoded participant names', () => {
    const raw = makeIGExport({
      participants: [
        { name: 'Cze\u00c5\u009b\u00c4\u0087' }, // "Cześć"
        { name: 'Bartek' },
      ],
      messages: [
        {
          sender_name: 'Cze\u00c5\u009b\u00c4\u0087',
          timestamp_ms: BASE_TIMESTAMP_MS,
          content: 'Hi',
          type: 'Generic',
        },
      ],
    });
    const result = parseInstagramJSON(raw);
    expect(result.participants[0].name).toBe('Cześć');
    expect(result.messages[0].sender).toBe('Cześć');
  });

  it('passes already-correct ASCII content through unchanged', () => {
    const raw = makeIGExport({
      messages: [
        {
          sender_name: 'Anna',
          timestamp_ms: BASE_TIMESTAMP_MS,
          content: 'Hello World',
          type: 'Generic',
        },
      ],
    });
    const result = parseInstagramJSON(raw);
    expect(result.messages[0].content).toBe('Hello World');
  });
});

// ============================================================
// parseInstagramJSON — message type classification
// ============================================================

describe('parseInstagramJSON — message type classification', () => {
  it('classifies plain text message as "text"', () => {
    const raw = makeIGExport({
      messages: [
        {
          sender_name: 'Anna',
          timestamp_ms: BASE_TIMESTAMP_MS,
          content: 'Hello',
          type: 'Generic',
        },
      ],
    });
    const result = parseInstagramJSON(raw);
    expect(result.messages[0].type).toBe('text');
  });

  it('classifies photo-only message as "media"', () => {
    const raw = makeIGExport({
      messages: [
        {
          sender_name: 'Anna',
          timestamp_ms: BASE_TIMESTAMP_MS,
          type: 'Generic',
          photos: [{ uri: 'photos/img.jpg', creation_timestamp: 1700000001 }],
        },
      ],
    });
    const result = parseInstagramJSON(raw);
    expect(result.messages[0].type).toBe('media');
    expect(result.messages[0].hasMedia).toBe(true);
  });

  it('classifies video attachments as "media"', () => {
    const raw = makeIGExport({
      messages: [
        {
          sender_name: 'Anna',
          timestamp_ms: BASE_TIMESTAMP_MS,
          type: 'Generic',
          videos: [{ uri: 'videos/clip.mp4', creation_timestamp: 1700000001 }],
        },
      ],
    });
    const result = parseInstagramJSON(raw);
    expect(result.messages[0].type).toBe('media');
    expect(result.messages[0].hasMedia).toBe(true);
  });

  it('classifies audio_files attachments as "media"', () => {
    const raw = makeIGExport({
      messages: [
        {
          sender_name: 'Anna',
          timestamp_ms: BASE_TIMESTAMP_MS,
          type: 'Generic',
          audio_files: [{ uri: 'audio/voice.m4a', creation_timestamp: 1700000001 }],
        },
      ],
    });
    const result = parseInstagramJSON(raw);
    expect(result.messages[0].type).toBe('media');
    expect(result.messages[0].hasMedia).toBe(true);
  });

  it('classifies message with content AND photos as "media" (photos branch takes precedence)', () => {
    // Instagram classifyMessageType checks photos BEFORE checking for text content
    // This differs from Messenger where content + media = 'text'
    const raw = makeIGExport({
      messages: [
        {
          sender_name: 'Anna',
          timestamp_ms: BASE_TIMESTAMP_MS,
          content: 'Look at this photo!',
          type: 'Generic',
          photos: [{ uri: 'photos/img.jpg', creation_timestamp: 1700000001 }],
        },
      ],
    });
    const result = parseInstagramJSON(raw);
    expect(result.messages[0].type).toBe('media');
    expect(result.messages[0].hasMedia).toBe(true);
    // Content is still preserved
    expect(result.messages[0].content).toBe('Look at this photo!');
  });

  it('classifies share link messages as "link"', () => {
    const raw = makeIGExport({
      messages: [
        {
          sender_name: 'Anna',
          timestamp_ms: BASE_TIMESTAMP_MS,
          content: 'Check this',
          type: 'Generic',
          share: { link: 'https://example.com' },
        },
      ],
    });
    const result = parseInstagramJSON(raw);
    expect(result.messages[0].type).toBe('link');
    expect(result.messages[0].hasLink).toBe(true);
  });

  it('classifies sticker messages as "sticker"', () => {
    const raw = makeIGExport({
      messages: [
        {
          sender_name: 'Anna',
          timestamp_ms: BASE_TIMESTAMP_MS,
          type: 'Generic',
          sticker: { uri: 'stickers/sticker.png' },
        },
      ],
    });
    const result = parseInstagramJSON(raw);
    expect(result.messages[0].type).toBe('sticker');
  });

  it('classifies call messages as "call"', () => {
    const raw = makeIGExport({
      messages: [
        {
          sender_name: 'Anna',
          timestamp_ms: BASE_TIMESTAMP_MS,
          type: 'Generic',
          call_duration: 60,
        },
      ],
    });
    const result = parseInstagramJSON(raw);
    expect(result.messages[0].type).toBe('call');
  });

  it('classifies unsent messages as "unsent"', () => {
    const raw = makeIGExport({
      messages: [
        {
          sender_name: 'Anna',
          timestamp_ms: BASE_TIMESTAMP_MS,
          content: 'oops',
          type: 'Generic',
          is_unsent: true,
        },
      ],
    });
    const result = parseInstagramJSON(raw);
    expect(result.messages[0].type).toBe('unsent');
    expect(result.messages[0].isUnsent).toBe(true);
  });

  it('includes messages with is_unsent: false normally', () => {
    const raw = makeIGExport({
      messages: [
        {
          sender_name: 'Anna',
          timestamp_ms: BASE_TIMESTAMP_MS,
          content: 'normal',
          type: 'Generic',
          is_unsent: false,
        },
      ],
    });
    const result = parseInstagramJSON(raw);
    expect(result.messages[0].type).toBe('text');
    expect(result.messages[0].isUnsent).toBe(false);
  });

  it('sets hasMedia false for plain text messages', () => {
    const result = parseInstagramJSON(makeIGExport({
      messages: [
        {
          sender_name: 'Anna',
          timestamp_ms: BASE_TIMESTAMP_MS,
          content: 'Hi',
          type: 'Generic',
        },
      ],
    }));
    expect(result.messages[0].hasMedia).toBe(false);
  });

  it('sets hasLink false for plain text messages', () => {
    const result = parseInstagramJSON(makeIGExport({
      messages: [
        {
          sender_name: 'Anna',
          timestamp_ms: BASE_TIMESTAMP_MS,
          content: 'Hi',
          type: 'Generic',
        },
      ],
    }));
    expect(result.messages[0].hasLink).toBe(false);
  });
});

// ============================================================
// parseInstagramJSON — reactions
// ============================================================

describe('parseInstagramJSON — reactions', () => {
  it('parses message reactions with FB-decoded emoji', () => {
    const raw = makeIGExport({
      messages: [
        {
          sender_name: 'Anna',
          timestamp_ms: BASE_TIMESTAMP_MS,
          content: 'Funny joke',
          type: 'Generic',
          // 👍 encoded as FB latin-1 escaping
          reactions: [{ reaction: '\u00f0\u009f\u0091\u008d', actor: 'Bartek' }],
        },
      ],
    });
    const result = parseInstagramJSON(raw);
    expect(result.messages[0].reactions).toHaveLength(1);
    expect(result.messages[0].reactions[0].emoji).toBe('👍');
    expect(result.messages[0].reactions[0].actor).toBe('Bartek');
  });

  it('parses multiple reactions on a single message', () => {
    const raw = makeIGExport({
      messages: [
        {
          sender_name: 'Anna',
          timestamp_ms: BASE_TIMESTAMP_MS,
          content: 'Great news!',
          type: 'Generic',
          reactions: [
            { reaction: '❤️', actor: 'Bartek' },
            { reaction: '😂', actor: 'Bartek' },
          ],
        },
      ],
    });
    const result = parseInstagramJSON(raw);
    expect(result.messages[0].reactions).toHaveLength(2);
  });

  it('handles messages with no reactions (empty array)', () => {
    const raw = makeIGExport({
      messages: [
        {
          sender_name: 'Anna',
          timestamp_ms: BASE_TIMESTAMP_MS,
          content: 'Hi',
          type: 'Generic',
          reactions: [],
        },
      ],
    });
    const result = parseInstagramJSON(raw);
    expect(result.messages[0].reactions).toHaveLength(0);
  });

  it('handles messages with no reactions field at all', () => {
    const raw = makeIGExport({
      messages: [
        {
          sender_name: 'Anna',
          timestamp_ms: BASE_TIMESTAMP_MS,
          content: 'Hi',
          type: 'Generic',
        },
      ],
    });
    const result = parseInstagramJSON(raw);
    expect(result.messages[0].reactions).toHaveLength(0);
  });
});

// ============================================================
// parseInstagramJSON — error handling
// ============================================================

describe('parseInstagramJSON — error handling', () => {
  it('throws with Polish error message for invalid data', () => {
    expect(() => parseInstagramJSON({ invalid: true })).toThrow(
      'Nieprawidłowy format eksportu Instagram DM',
    );
  });

  it('throws on null input', () => {
    expect(() => parseInstagramJSON(null)).toThrow('Nieprawidłowy format eksportu Instagram DM');
  });

  it('throws on missing participants field', () => {
    expect(() => parseInstagramJSON({
      messages: [{ sender_name: 'Anna', timestamp_ms: BASE_TIMESTAMP_MS }],
      title: 'test',
    })).toThrow('Nieprawidłowy format eksportu Instagram DM');
  });

  it('throws on missing messages field', () => {
    expect(() => parseInstagramJSON({
      participants: [{ name: 'Anna' }],
      title: 'test',
    })).toThrow('Nieprawidłowy format eksportu Instagram DM');
  });

  it('throws on empty messages array', () => {
    expect(() => parseInstagramJSON({
      participants: [{ name: 'Anna' }, { name: 'Bartek' }],
      messages: [],
      title: 'test',
    })).toThrow('Nieprawidłowy format eksportu Instagram DM');
  });
});

// ============================================================
// parseInstagramJSON — group chats
// ============================================================

describe('parseInstagramJSON — group chats', () => {
  it('handles 3 participants and sets isGroup to true', () => {
    const raw = makeIGExport({
      participants: [{ name: 'Anna' }, { name: 'Bartek' }, { name: 'Celina' }],
    });
    const result = parseInstagramJSON(raw);
    expect(result.participants).toHaveLength(3);
    expect(result.metadata.isGroup).toBe(true);
  });

  it('sets isGroup false for exactly 2 participants', () => {
    const result = parseInstagramJSON(makeIGExport());
    expect(result.metadata.isGroup).toBe(false);
  });
});

// ============================================================
// mergeInstagramFiles
// ============================================================

describe('mergeInstagramFiles', () => {
  it('throws on empty array', () => {
    expect(() => mergeInstagramFiles([])).toThrow('Brak plików do przetworzenia');
  });

  it('returns single file parsed result when only one file given', () => {
    const result = mergeInstagramFiles([makeIGExport()]);
    expect(result.platform).toBe('instagram');
    expect(result.messages).toHaveLength(2);
  });

  it('merges two files and sorts by timestamp', () => {
    const file1 = makeIGExport({
      messages: [
        { sender_name: 'Anna', timestamp_ms: BASE_TIMESTAMP_MS + 120000, content: 'Later', type: 'Generic' },
        { sender_name: 'Anna', timestamp_ms: BASE_TIMESTAMP_MS, content: 'First', type: 'Generic' },
      ],
    });
    const file2 = makeIGExport({
      messages: [
        { sender_name: 'Bartek', timestamp_ms: BASE_TIMESTAMP_MS + 60000, content: 'Middle', type: 'Generic' },
      ],
    });

    const result = mergeInstagramFiles([file1, file2]);
    expect(result.messages).toHaveLength(3);
    expect(result.messages[0].content).toBe('First');
    expect(result.messages[1].content).toBe('Middle');
    expect(result.messages[2].content).toBe('Later');
  });

  it('re-indexes messages after merge (0-based)', () => {
    const file1 = makeIGExport({
      messages: [
        { sender_name: 'Anna', timestamp_ms: BASE_TIMESTAMP_MS + 60000, content: 'B', type: 'Generic' },
        { sender_name: 'Anna', timestamp_ms: BASE_TIMESTAMP_MS, content: 'A', type: 'Generic' },
      ],
    });
    const file2 = makeIGExport({
      messages: [
        { sender_name: 'Bartek', timestamp_ms: BASE_TIMESTAMP_MS + 120000, content: 'C', type: 'Generic' },
      ],
    });

    const result = mergeInstagramFiles([file1, file2]);
    expect(result.messages[0].index).toBe(0);
    expect(result.messages[1].index).toBe(1);
    expect(result.messages[2].index).toBe(2);
  });
});
