import { describe, it, expect } from 'vitest';
import { detectFormat } from '../detect';

describe('detectFormat', () => {
  it('detects Messenger JSON format', () => {
    const messengerData = {
      participants: [{ name: 'Alice' }, { name: 'Bob' }],
      messages: [
        { sender_name: 'Alice', timestamp_ms: 1700000000000, content: 'Hi', type: 'Generic' },
      ],
      title: 'Alice and Bob',
      is_still_participant: true,
      thread_path: 'inbox/Bob_123',
    };

    expect(detectFormat('message_1.json', messengerData)).toBe('messenger');
  });

  it('detects WhatsApp format from .txt extension', () => {
    expect(detectFormat('chat.txt')).toBe('whatsapp');
    expect(detectFormat('WhatsApp Chat with John.txt')).toBe('whatsapp');
    expect(detectFormat('export.txt', undefined)).toBe('whatsapp');
  });

  it('detects Telegram JSON format', () => {
    const telegramData = {
      name: 'Chat Name',
      type: 'personal_chat',
      id: 123456789,
      messages: [
        {
          id: 1,
          type: 'message',
          from: 'Alice',
          date_unixtime: '1700000000',
          text: 'Hello',
        },
      ],
    };

    expect(detectFormat('result.json', telegramData)).toBe('telegram');
  });

  it('returns unknown for invalid/empty data', () => {
    expect(detectFormat('data.json', null)).toBe('unknown');
    expect(detectFormat('data.json', undefined)).toBe('unknown');
    expect(detectFormat('data.json', 'just a string')).toBe('unknown');
    expect(detectFormat('data.json', { random: 'object' })).toBe('unknown');
  });

  it('returns unknown for non-txt file without valid JSON data', () => {
    expect(detectFormat('file.json')).toBe('unknown');
    expect(detectFormat('file.csv')).toBe('unknown');
  });

  it('prefers WhatsApp detection for .txt even if JSON data is provided', () => {
    const messengerData = {
      participants: [{ name: 'Alice' }],
      messages: [],
      title: 'test',
    };
    expect(detectFormat('chat.txt', messengerData)).toBe('whatsapp');
  });

  it('detects Telegram with date field instead of date_unixtime', () => {
    const telegramData = {
      name: 'Group Chat',
      type: 'private_group',
      id: 987654321,
      messages: [
        {
          id: 1,
          type: 'message',
          from: 'Bob',
          date: '2024-01-15T10:30:00',
          text: 'Hey',
        },
      ],
    };

    expect(detectFormat('result.json', telegramData)).toBe('telegram');
  });
});
