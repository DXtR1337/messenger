/**
 * Tests for chat format auto-detection.
 */
import { describe, it, expect } from 'vitest';
import { detectFormat } from '../detect';
import type { ChatFormat } from '../detect';

describe('detectFormat', () => {
  // ============================================================
  // WhatsApp detection (by file extension)
  // ============================================================

  it('detects WhatsApp by .txt extension', () => {
    expect(detectFormat('chat.txt')).toBe('whatsapp');
  });

  it('detects WhatsApp .txt regardless of JSON data', () => {
    // Even if jsonData is provided, .txt means WhatsApp
    expect(detectFormat('export.txt', { some: 'data' })).toBe('whatsapp');
  });

  // ============================================================
  // Telegram detection
  // ============================================================

  it('detects Telegram JSON by structure (name, type, id, messages with from/date_unixtime)', () => {
    const telegramData = {
      name: 'Chat Name',
      type: 'personal_chat',
      id: 12345,
      messages: [
        { type: 'message', from: 'Alice', date_unixtime: '1700000000', text: 'Hello' },
      ],
    };
    expect(detectFormat('result.json', telegramData)).toBe('telegram');
  });

  it('detects Telegram with date field instead of date_unixtime', () => {
    const telegramData = {
      name: 'Chat Name',
      type: 'personal_chat',
      id: 12345,
      messages: [
        { type: 'message', from: 'Alice', date: '2024-01-02T14:23:00', text: 'Hello' },
      ],
    };
    expect(detectFormat('result.json', telegramData)).toBe('telegram');
  });

  // ============================================================
  // Messenger detection
  // ============================================================

  it('detects Messenger JSON by participants + messages arrays with thread_path', () => {
    const messengerData = {
      participants: [{ name: 'Alice' }, { name: 'Bob' }],
      messages: [
        { sender_name: 'Alice', timestamp_ms: 1700000000000, content: 'Hi', type: 'Generic' },
      ],
      title: 'Alice and Bob',
      thread_path: 'inbox/AliceBob_abc123',
      is_still_participant: true,
    };
    expect(detectFormat('message_1.json', messengerData)).toBe('messenger');
  });

  it('detects Messenger E2EE format (e2ee_cutover thread_path)', () => {
    const messengerData = {
      participants: [{ name: 'Alice' }, { name: 'Bob' }],
      messages: [
        { sender_name: 'Alice', timestamp_ms: 1700000000000, content: 'Hi', type: 'Generic' },
      ],
      title: 'Alice and Bob',
      thread_path: 'e2ee_cutover/AliceBob_abc123',
      is_still_participant: true,
    };
    expect(detectFormat('message_1.json', messengerData)).toBe('messenger');
  });

  it('detects Messenger with is_still_participant but no thread_path', () => {
    const messengerData = {
      participants: [{ name: 'Alice' }, { name: 'Bob' }],
      messages: [
        { sender_name: 'Alice', timestamp_ms: 1700000000000, content: 'Hi', type: 'Generic' },
      ],
      title: 'Alice and Bob',
      is_still_participant: true,
    };
    expect(detectFormat('message_1.json', messengerData)).toBe('messenger');
  });

  it('detects Instagram JSON (no thread_path, no is_still_participant)', () => {
    const instagramData = {
      participants: [{ name: 'User1' }, { name: 'User2' }],
      messages: [
        { sender_name: 'User1', timestamp_ms: 1700000000000, content: 'Hey', type: 'Generic' },
      ],
      title: 'User1 and User2',
    };
    expect(detectFormat('instagram.json', instagramData)).toBe('instagram');
  });

  // ============================================================
  // Unknown / edge cases
  // ============================================================

  it('returns unknown for non-.txt file with no JSON data', () => {
    expect(detectFormat('data.json')).toBe('unknown');
  });

  it('returns unknown for non-.txt file with null jsonData', () => {
    expect(detectFormat('data.json', null)).toBe('unknown');
  });

  it('returns unknown for JSON that does not match any pattern', () => {
    const randomData = {
      foo: 'bar',
      items: [1, 2, 3],
    };
    expect(detectFormat('data.json', randomData)).toBe('unknown');
  });

  it('returns unknown for empty object', () => {
    expect(detectFormat('data.json', {})).toBe('unknown');
  });

  it('returns unknown for Telegram-like data missing messages array', () => {
    const partial = {
      name: 'Chat',
      type: 'personal_chat',
      id: 12345,
    };
    expect(detectFormat('data.json', partial)).toBe('unknown');
  });
});
