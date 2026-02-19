import { describe, it, expect } from 'vitest';
import { decodeFBString, parseMessengerJSON, validateMessengerJSON, mergeMessengerFiles } from '../messenger';

// ============================================================
// decodeFBString
// ============================================================

describe('decodeFBString', () => {
  it('returns ASCII text unchanged', () => {
    expect(decodeFBString('Hello world')).toBe('Hello world');
  });

  it('decodes Polish characters encoded by Facebook', () => {
    const encoded = 'CzeÅÄ';
    expect(decodeFBString(encoded)).toBe('Cześć');
  });

  it('decodes emoji encoded by Facebook', () => {
    const encoded = 'ð';
    expect(decodeFBString(encoded)).toBe('😍');
  });

  it('returns empty string for null/undefined/empty', () => {
    expect(decodeFBString(null)).toBe('');
    expect(decodeFBString(undefined)).toBe('');
    expect(decodeFBString('')).toBe('');
  });

  it('passes through already-decoded text', () => {
    expect(decodeFBString('Simple ASCII')).toBe('Simple ASCII');
  });

  it('decodes Polish characters group', () => {
    const encoded = 'ÄÄÃ³ÅÅ';
    expect(decodeFBString(encoded)).toBe('ąęółń');
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
      thread_path: 'inbox/Bob_123',
    };
    expect(validateMessengerJSON(valid)).toBe(true);
  });

  it('returns false for null', () => {
    expect(validateMessengerJSON(null)).toBe(false);
  });

  it('returns false for missing participants', () => {
    expect(validateMessengerJSON({ messages: [], title: 'test' })).toBe(false);
  });

  it('returns false for missing title', () => {
    expect(validateMessengerJSON({ participants: [], messages: [] })).toBe(false);
  });

  it('returns true for empty messages array (valid structure)', () => {
    const data = {
      participants: [{ name: 'Alice' }],
      messages: [],
      title: 'Solo',
      is_still_participant: true,
      thread_path: 'inbox/Solo_1',
    };
    expect(validateMessengerJSON(data)).toBe(true);
  });
});

// ============================================================
// parseMessengerJSON
// ============================================================

function makeMinimalConversation(overrides?: {
  participants?: Array<{ name: string }>;
  messages?: Array<Record<string, unknown>>;
  title?: string;
}) {
  return {
    participants: overrides?.participants ?? [{ name: 'Alice' }, { name: 'Bob' }],
    messages: overrides?.messages ?? [
      { sender_name: 'Bob', timestamp_ms: 1700000050000, content: 'Hey!', type: 'Generic' },
      { sender_name: 'Alice', timestamp_ms: 1700000040000, content: 'How are you?', type: 'Generic' },
      { sender_name: 'Bob', timestamp_ms: 1700000030000, content: 'Good, thanks', type: 'Generic' },
      { sender_name: 'Alice', timestamp_ms: 1700000020000, content: 'Nice', type: 'Generic' },
      { sender_name: 'Bob', timestamp_ms: 1700000010000, content: 'Hello', type: 'Generic' },
    ],
    title: overrides?.title ?? 'Alice and Bob',
    is_still_participant: true,
    thread_path: 'inbox/Bob_123',
  };
}
describe('parseMessengerJSON', () => {
  it('parses a valid minimal conversation with 2 participants and 5 messages', () => {
    const data = makeMinimalConversation();
    const result = parseMessengerJSON(data);

    expect(result.platform).toBe('messenger');
    expect(result.title).toBe('Alice and Bob');
    expect(result.participants).toHaveLength(2);
    expect(result.participants[0].name).toBe('Alice');
    expect(result.participants[1].name).toBe('Bob');
    expect(result.messages).toHaveLength(5);
    expect(result.metadata.totalMessages).toBe(5);
    expect(result.metadata.isGroup).toBe(false);
  });

  it('sorts messages chronologically (oldest first)', () => {
    const data = makeMinimalConversation();
    const result = parseMessengerJSON(data);
    expect(result.messages[0].content).toBe('Hello');
    expect(result.messages[0].timestamp).toBe(1700000010000);
    expect(result.messages[4].content).toBe('Hey!');
    expect(result.messages[4].timestamp).toBe(1700000050000);
  });

  it('handles empty messages array', () => {
    const data = makeMinimalConversation({ messages: [] });
    const result = parseMessengerJSON(data);
    expect(result.messages).toHaveLength(0);
    expect(result.metadata.totalMessages).toBe(0);
  });

  it('parses messages with reactions', () => {
    const data = makeMinimalConversation({
      messages: [{
        sender_name: 'Alice', timestamp_ms: 1700000010000, content: 'Funny joke', type: 'Generic',
        reactions: [{ reaction: 'ð', actor: 'Bob' }],
      }],
    });
    const result = parseMessengerJSON(data);
    expect(result.messages[0].reactions).toHaveLength(1);
    expect(result.messages[0].reactions[0].emoji).toBe('😂');
    expect(result.messages[0].reactions[0].actor).toBe('Bob');
  });

  it('parses messages with photos/media', () => {
    const data = makeMinimalConversation({
      messages: [{
        sender_name: 'Alice', timestamp_ms: 1700000010000, type: 'Generic',
        photos: [{ uri: 'photos/image.jpg', creation_timestamp: 1700000010 }],
      }],
    });
    const result = parseMessengerJSON(data);
    expect(result.messages[0].hasMedia).toBe(true);
    expect(result.messages[0].type).toBe('media');
    expect(result.messages[0].content).toBe('');
  });

  it('classifies unsent messages', () => {
    const data = makeMinimalConversation({
      messages: [{ sender_name: 'Bob', timestamp_ms: 1700000010000, content: 'deleted', type: 'Generic', is_unsent: true }],
    });
    const result = parseMessengerJSON(data);
    expect(result.messages[0].type).toBe('unsent');
    expect(result.messages[0].isUnsent).toBe(true);
  });

  it('classifies sticker messages', () => {
    const data = makeMinimalConversation({
      messages: [{ sender_name: 'Alice', timestamp_ms: 1700000010000, type: 'Generic', sticker: { uri: 'stickers/s.png' } }],
    });
    const result = parseMessengerJSON(data);
    expect(result.messages[0].type).toBe('sticker');
  });

  it('classifies link/share messages', () => {
    const data = makeMinimalConversation({
      messages: [{ sender_name: 'Bob', timestamp_ms: 1700000010000, content: 'Check this', type: 'Generic', share: { link: 'https://example.com' } }],
    });
    const result = parseMessengerJSON(data);
    expect(result.messages[0].type).toBe('link');
    expect(result.messages[0].hasLink).toBe(true);
  });

  it('classifies call messages', () => {
    const data = makeMinimalConversation({
      messages: [{ sender_name: 'Alice', timestamp_ms: 1700000010000, type: 'Call', call_duration: 120 }],
    });
    const result = parseMessengerJSON(data);
    expect(result.messages[0].type).toBe('call');
  });

  it('detects group chat with 3+ participants', () => {
    const data = makeMinimalConversation({
      participants: [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }],
    });
    const result = parseMessengerJSON(data);
    expect(result.metadata.isGroup).toBe(true);
  });

  it('decodes Facebook-encoded participant names', () => {
    const data = makeMinimalConversation({
      participants: [{ name: 'CzeÅÄ' }, { name: 'Bob' }],
      messages: [{ sender_name: 'CzeÅÄ', timestamp_ms: 1700000010000, content: 'Hi', type: 'Generic' }],
      title: 'CzeÅÄ and Bob',
    });
    const result = parseMessengerJSON(data);
    expect(result.participants[0].name).toBe('Cześć');
    expect(result.messages[0].sender).toBe('Cześć');
    expect(result.title).toBe('Cześć and Bob');
  });

  it('throws on invalid JSON structure', () => {
    expect(() => parseMessengerJSON({ foo: 'bar' })).toThrow();
    expect(() => parseMessengerJSON(null)).toThrow();
    expect(() => parseMessengerJSON('not an object')).toThrow();
  });
});
// ============================================================
// mergeMessengerFiles
// ============================================================

describe('mergeMessengerFiles', () => {
  it('throws when given empty array', () => {
    expect(() => mergeMessengerFiles([])).toThrow('No files provided');
  });

  it('returns single file result unchanged', () => {
    const data = makeMinimalConversation();
    const result = mergeMessengerFiles([data]);
    expect(result.messages).toHaveLength(5);
    expect(result.title).toBe('Alice and Bob');
  });

  it('merges multiple files and deduplicates', () => {
    const file1 = makeMinimalConversation({
      messages: [
        { sender_name: 'Alice', timestamp_ms: 1700000030000, content: 'Msg3', type: 'Generic' },
        { sender_name: 'Bob', timestamp_ms: 1700000020000, content: 'Msg2', type: 'Generic' },
        { sender_name: 'Alice', timestamp_ms: 1700000010000, content: 'Msg1', type: 'Generic' },
      ],
    });
    const file2 = makeMinimalConversation({
      messages: [
        { sender_name: 'Bob', timestamp_ms: 1700000050000, content: 'Msg5', type: 'Generic' },
        { sender_name: 'Alice', timestamp_ms: 1700000040000, content: 'Msg4', type: 'Generic' },
        { sender_name: 'Alice', timestamp_ms: 1700000030000, content: 'Msg3', type: 'Generic' },
      ],
    });
    const result = mergeMessengerFiles([file1, file2]);
    expect(result.messages).toHaveLength(5);
    expect(result.messages[0].content).toBe('Msg1');
    expect(result.messages[4].content).toBe('Msg5');
  });
});
