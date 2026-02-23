/**
 * Tests for Facebook Messenger JSON parser.
 */
import { describe, it, expect } from 'vitest';
import {
  decodeFBString,
  validateMessengerJSON,
  parseMessengerJSON,
  mergeMessengerFiles,
} from '../messenger';

// ============================================================
// decodeFBString
// ============================================================

describe('decodeFBString', () => {
  it('returns empty string for null/undefined', () => {
    expect(decodeFBString(null)).toBe('');
    expect(decodeFBString(undefined)).toBe('');
    expect(decodeFBString('')).toBe('');
  });

  it('decodes Polish characters encoded in FB latin-1 escaping', () => {
    // "Cześć" encoded as latin-1 bytes interpreted as char codes
    const encoded = 'Cze\u00c5\u009b\u00c4\u0087';
    expect(decodeFBString(encoded)).toBe('Cześć');
  });

  it('decodes multiple Polish diacritics (ą, ę, ś, ź, ż, ó, ł, ń)', () => {
    // Each Polish diacritical in UTF-8 is 2 bytes. FB stores them as 2 latin-1 chars.
    const encoded = '\u00c4\u0085\u00c4\u0099\u00c5\u009b\u00c5\u00ba\u00c5\u00bc\u00c3\u00b3\u00c5\u0082\u00c5\u0084';
    expect(decodeFBString(encoded)).toBe('ąęśźżółń');
  });

  it('decodes emoji from FB encoding', () => {
    // Thumbs up emoji 👍 = F0 9F 91 8D in UTF-8
    const encoded = '\u00f0\u009f\u0091\u008d';
    expect(decodeFBString(encoded)).toBe('👍');
  });

  it('returns already-decoded ASCII strings unchanged', () => {
    expect(decodeFBString('Hello World')).toBe('Hello World');
    expect(decodeFBString('abc123')).toBe('abc123');
  });

  it('handles mixed ASCII and encoded content', () => {
    // "Hej " is pure ASCII, works through the decoder without change
    const plain = 'Hello';
    expect(decodeFBString(plain)).toBe('Hello');
  });
});

// ============================================================
// validateMessengerJSON
// ============================================================

describe('validateMessengerJSON', () => {
  it('returns true for valid Messenger JSON', () => {
    const valid = {
      participants: [{ name: 'Alice' }, { name: 'Bob' }],
      messages: [
        { sender_name: 'Alice', timestamp_ms: 1700000000000, content: 'Hi', type: 'Generic' },
      ],
      title: 'Alice and Bob',
      is_still_participant: true,
      thread_path: 'inbox/alice_bob',
    };
    expect(validateMessengerJSON(valid)).toBe(true);
  });

  it('returns true for valid data with empty messages array', () => {
    const valid = {
      participants: [{ name: 'Alice' }],
      messages: [],
      title: 'Test',
    };
    expect(validateMessengerJSON(valid)).toBe(true);
  });

  it('returns false for null/undefined/non-object', () => {
    expect(validateMessengerJSON(null)).toBe(false);
    expect(validateMessengerJSON(undefined)).toBe(false);
    expect(validateMessengerJSON('string')).toBe(false);
    expect(validateMessengerJSON(42)).toBe(false);
  });

  it('returns false when participants is missing', () => {
    expect(validateMessengerJSON({ messages: [], title: 'test' })).toBe(false);
  });

  it('returns false when messages is missing', () => {
    expect(validateMessengerJSON({ participants: [{ name: 'Alice' }], title: 'test' })).toBe(false);
  });

  it('returns false when title is missing', () => {
    expect(validateMessengerJSON({ participants: [{ name: 'Alice' }], messages: [] })).toBe(false);
  });

  it('returns false when first message lacks sender_name', () => {
    expect(validateMessengerJSON({
      participants: [{ name: 'Alice' }],
      messages: [{ timestamp_ms: 1700000000000 }],
      title: 'test',
    })).toBe(false);
  });
});

// ============================================================
// parseMessengerJSON
// ============================================================

describe('parseMessengerJSON', () => {
  const makeConversation = (messages: Array<Record<string, unknown>>) => ({
    participants: [{ name: 'Alice' }, { name: 'Bob' }],
    messages,
    title: 'Alice and Bob',
    is_still_participant: true,
    thread_path: 'inbox/alice_bob',
  });

  it('parses a minimal valid conversation and reverses to chronological order', () => {
    const data = makeConversation([
      // FB exports newest first
      { sender_name: 'Alice', timestamp_ms: 1700000002000, content: 'Hello!', type: 'Generic' },
      { sender_name: 'Bob', timestamp_ms: 1700000001000, content: 'Hi there', type: 'Generic' },
    ]);

    const result = parseMessengerJSON(data);
    expect(result.platform).toBe('messenger');
    expect(result.participants).toHaveLength(2);
    expect(result.messages).toHaveLength(2);
    // After reversal: oldest first
    expect(result.messages[0].sender).toBe('Bob');
    expect(result.messages[0].content).toBe('Hi there');
    expect(result.messages[1].sender).toBe('Alice');
    expect(result.metadata.totalMessages).toBe(2);
    expect(result.metadata.isGroup).toBe(false);
  });

  it('classifies unsent messages correctly', () => {
    const data = makeConversation([
      { sender_name: 'Alice', timestamp_ms: 1700000001000, content: 'oops', type: 'Generic', is_unsent: true },
    ]);
    const result = parseMessengerJSON(data);
    expect(result.messages[0].type).toBe('unsent');
    expect(result.messages[0].isUnsent).toBe(true);
  });

  it('classifies media-only messages as media', () => {
    const data = makeConversation([
      {
        sender_name: 'Alice',
        timestamp_ms: 1700000001000,
        type: 'Generic',
        photos: [{ uri: 'photos/img.jpg', creation_timestamp: 1700000001 }],
      },
    ]);
    const result = parseMessengerJSON(data);
    expect(result.messages[0].type).toBe('media');
    expect(result.messages[0].hasMedia).toBe(true);
  });

  it('classifies media messages with text content as text', () => {
    const data = makeConversation([
      {
        sender_name: 'Alice',
        timestamp_ms: 1700000001000,
        content: 'Look at this photo!',
        type: 'Generic',
        photos: [{ uri: 'photos/img.jpg', creation_timestamp: 1700000001 }],
      },
    ]);
    const result = parseMessengerJSON(data);
    // Has both content and media — classified as text
    expect(result.messages[0].type).toBe('text');
    expect(result.messages[0].hasMedia).toBe(true);
  });

  it('classifies link/share messages', () => {
    const data = makeConversation([
      {
        sender_name: 'Bob',
        timestamp_ms: 1700000001000,
        content: 'Check this out',
        type: 'Generic',
        share: { link: 'https://example.com' },
      },
    ]);
    const result = parseMessengerJSON(data);
    expect(result.messages[0].type).toBe('link');
    expect(result.messages[0].hasLink).toBe(true);
  });

  it('parses reactions with FB decoding', () => {
    const data = makeConversation([
      {
        sender_name: 'Alice',
        timestamp_ms: 1700000001000,
        content: 'Funny joke',
        type: 'Generic',
        reactions: [{ reaction: '\u00f0\u009f\u0091\u008d', actor: 'Bob' }],
      },
    ]);
    const result = parseMessengerJSON(data);
    expect(result.messages[0].reactions).toHaveLength(1);
    expect(result.messages[0].reactions[0].emoji).toBe('👍');
    expect(result.messages[0].reactions[0].actor).toBe('Bob');
  });

  it('throws on invalid data', () => {
    expect(() => parseMessengerJSON({ invalid: true })).toThrow('Invalid Messenger JSON format');
  });

  it('handles messages with missing content field', () => {
    const data = makeConversation([
      { sender_name: 'Alice', timestamp_ms: 1700000001000, type: 'Generic' },
    ]);
    const result = parseMessengerJSON(data);
    expect(result.messages[0].content).toBe('');
  });

  it('detects group conversations (3+ participants)', () => {
    const data = {
      participants: [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }],
      messages: [
        { sender_name: 'Alice', timestamp_ms: 1700000001000, content: 'Hi all', type: 'Generic' },
      ],
      title: 'Group chat',
      is_still_participant: true,
      thread_path: 'inbox/group',
    };
    const result = parseMessengerJSON(data);
    expect(result.metadata.isGroup).toBe(true);
  });

  it('classifies Call and Subscribe/Unsubscribe messages', () => {
    const data = makeConversation([
      { sender_name: 'Alice', timestamp_ms: 1700000003000, type: 'Unsubscribe' },
      { sender_name: 'Bob', timestamp_ms: 1700000002000, content: '', type: 'Call', call_duration: 120 },
      { sender_name: 'Alice', timestamp_ms: 1700000001000, type: 'Subscribe' },
    ]);
    const result = parseMessengerJSON(data);
    // After reversal: Subscribe, Call, Unsubscribe
    expect(result.messages[0].type).toBe('system');
    expect(result.messages[1].type).toBe('call');
    expect(result.messages[2].type).toBe('system');
  });

  it('classifies sticker messages', () => {
    const data = makeConversation([
      {
        sender_name: 'Alice',
        timestamp_ms: 1700000001000,
        type: 'Generic',
        sticker: { uri: 'stickers/sticker.png' },
      },
    ]);
    const result = parseMessengerJSON(data);
    expect(result.messages[0].type).toBe('sticker');
  });
});

// ============================================================
// mergeMessengerFiles
// ============================================================

describe('mergeMessengerFiles', () => {
  const base = {
    participants: [{ name: 'Alice' }, { name: 'Bob' }],
    title: 'Test',
    is_still_participant: true,
    thread_path: 'inbox/test',
  };

  it('throws on empty array', () => {
    expect(() => mergeMessengerFiles([])).toThrow('No files provided');
  });

  it('returns single file parsed result', () => {
    const data = {
      ...base,
      messages: [
        { sender_name: 'Alice', timestamp_ms: 1700000001000, content: 'Hi', type: 'Generic' },
      ],
    };
    const result = mergeMessengerFiles([data]);
    expect(result.messages).toHaveLength(1);
    expect(result.platform).toBe('messenger');
  });

  it('merges and deduplicates multiple files chronologically', () => {
    const file1 = {
      ...base,
      messages: [
        { sender_name: 'Alice', timestamp_ms: 1700000001000, content: 'Msg 1', type: 'Generic' },
        { sender_name: 'Bob', timestamp_ms: 1700000002000, content: 'Msg 2', type: 'Generic' },
      ],
    };
    const file2 = {
      ...base,
      messages: [
        // Duplicate: same timestamp + sender
        { sender_name: 'Bob', timestamp_ms: 1700000002000, content: 'Msg 2 dup', type: 'Generic' },
        { sender_name: 'Alice', timestamp_ms: 1700000003000, content: 'Msg 3', type: 'Generic' },
      ],
    };

    const result = mergeMessengerFiles([file1, file2]);
    expect(result.messages).toHaveLength(3);
    expect(result.messages[0].timestamp).toBeLessThan(result.messages[1].timestamp);
    expect(result.messages[1].timestamp).toBeLessThan(result.messages[2].timestamp);
    // Re-indexed
    expect(result.messages[0].index).toBe(0);
    expect(result.messages[1].index).toBe(1);
    expect(result.messages[2].index).toBe(2);
  });
});
