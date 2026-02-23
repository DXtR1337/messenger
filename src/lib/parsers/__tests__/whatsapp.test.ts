/**
 * Tests for WhatsApp .txt export parser.
 */
import { describe, it, expect } from 'vitest';
import { parseWhatsAppText } from '../whatsapp';

// ============================================================
// Helper: build a WhatsApp export text
// ============================================================

function wa(lines: string[]): string {
  return lines.join('\n');
}

// ============================================================
// Date format support
// ============================================================

describe('parseWhatsAppText — date formats', () => {
  it('parses DD.MM.YYYY, HH:MM (Polish Android format)', () => {
    const text = wa([
      '01.02.2024, 14:23 - Ania: Hej',
      '01.02.2024, 14:24 - Bartek: Siema',
    ]);
    const result = parseWhatsAppText(text);
    expect(result.platform).toBe('whatsapp');
    expect(result.participants).toHaveLength(2);
    expect(result.messages.filter(m => m.type !== 'system')).toHaveLength(2);
    expect(result.messages.find(m => m.sender === 'Ania')?.content).toBe('Hej');
  });

  it('parses [DD/MM/YYYY, h:mm AM/PM] (English bracketed format)', () => {
    const text = wa([
      '[01/02/2024, 2:23 PM] - Ania: Hey there',
      '[01/02/2024, 2:24 PM] - Bob: Hi!',
    ]);
    const result = parseWhatsAppText(text);
    expect(result.participants).toHaveLength(2);
    expect(result.messages.filter(m => m.type !== 'system')).toHaveLength(2);
  });

  it('parses YYYY-MM-DD (ISO date format)', () => {
    const text = wa([
      '[2024-01-02, 14:23:45] - Alice: Hello',
      '[2024-01-02, 14:24:00] - Bob: World',
    ]);
    const result = parseWhatsAppText(text);
    expect(result.participants).toHaveLength(2);
    const alice = result.messages.find(m => m.sender === 'Alice');
    expect(alice?.content).toBe('Hello');
  });

  it('handles 12-hour time with AM/PM correctly', () => {
    const text = wa([
      '01/02/2024, 12:30 PM - Alice: Noon message',
      '01/02/2024, 12:30 AM - Bob: Midnight message',
    ]);
    const result = parseWhatsAppText(text);
    const msgs = result.messages.filter(m => m.type !== 'system');
    expect(msgs).toHaveLength(2);
    // 12:30 AM < 12:30 PM chronologically
    const bobMsg = msgs.find(m => m.sender === 'Bob');
    const aliceMsg = msgs.find(m => m.sender === 'Alice');
    // Midnight (00:30) should be earlier than noon (12:30)
    expect(bobMsg!.timestamp).toBeLessThan(aliceMsg!.timestamp);
  });
});

// ============================================================
// Multiline messages
// ============================================================

describe('parseWhatsAppText — multiline messages', () => {
  it('joins continuation lines into the previous message', () => {
    const text = wa([
      '01.02.2024, 14:23 - Ania: First line',
      'Second line of the same message',
      'Third line too',
      '01.02.2024, 14:25 - Bartek: Reply',
    ]);
    const result = parseWhatsAppText(text);
    const userMsgs = result.messages.filter(m => m.type !== 'system');
    expect(userMsgs).toHaveLength(2);
    expect(userMsgs[0].content).toContain('First line');
    expect(userMsgs[0].content).toContain('Second line');
    expect(userMsgs[0].content).toContain('Third line');
  });
});

// ============================================================
// Media messages
// ============================================================

describe('parseWhatsAppText — media', () => {
  it('classifies <Media omitted> as media type', () => {
    const text = wa([
      '01.02.2024, 14:23 - Ania: <Media omitted>',
      '01.02.2024, 14:24 - Bartek: Nice pic',
    ]);
    const result = parseWhatsAppText(text);
    const ania = result.messages.find(m => m.sender === 'Ania');
    expect(ania?.type).toBe('media');
    expect(ania?.hasMedia).toBe(true);
  });

  it('classifies file attached pattern as media', () => {
    const text = wa([
      '01.02.2024, 14:23 - Ania: photo.jpg (file attached)',
      '01.02.2024, 14:24 - Bartek: ok',
    ]);
    const result = parseWhatsAppText(text);
    const ania = result.messages.find(m => m.sender === 'Ania');
    expect(ania?.type).toBe('media');
  });

  it('classifies messages with URLs as link type', () => {
    const text = wa([
      '01.02.2024, 14:23 - Ania: Check https://example.com/page',
      '01.02.2024, 14:24 - Bartek: Thanks',
    ]);
    const result = parseWhatsAppText(text);
    const ania = result.messages.find(m => m.sender === 'Ania');
    expect(ania?.type).toBe('link');
    expect(ania?.hasLink).toBe(true);
  });
});

// ============================================================
// System messages
// ============================================================

describe('parseWhatsAppText — system messages', () => {
  it('detects encryption notice as system message', () => {
    const text = wa([
      '01.02.2024, 14:22 - Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.',
      '01.02.2024, 14:23 - Ania: Hej',
      '01.02.2024, 14:24 - Bartek: Siema',
    ]);
    const result = parseWhatsAppText(text);
    const system = result.messages.filter(m => m.type === 'system');
    expect(system.length).toBeGreaterThanOrEqual(1);
    // Participants should only include Ania and Bartek
    expect(result.participants).toHaveLength(2);
  });

  it('classifies "This message was deleted" as system message (detected by indicator match)', () => {
    // WhatsApp parser detects "this message was deleted" in SYSTEM_MESSAGE_INDICATORS,
    // so even with a sender prefix, the line is classified as a system message
    const text = wa([
      '01.02.2024, 14:23 - Ania: This message was deleted',
      '01.02.2024, 14:24 - Bartek: What did you say?',
    ]);
    const result = parseWhatsAppText(text);
    const systemMsgs = result.messages.filter(m => m.type === 'system');
    expect(systemMsgs.length).toBeGreaterThanOrEqual(1);
    // The deleted message is treated as system, not as a user "unsent"
    const deletedMsg = systemMsgs.find(m => m.content.toLowerCase().includes('this message was deleted'));
    expect(deletedMsg).toBeDefined();
  });

  it('counts only user messages in totalMessages metadata', () => {
    const text = wa([
      '01.02.2024, 14:22 - Messages and calls are end-to-end encrypted.',
      '01.02.2024, 14:23 - Ania: Hello',
      '01.02.2024, 14:24 - Bartek: Hi',
    ]);
    const result = parseWhatsAppText(text);
    // totalMessages should count only user messages, not system
    expect(result.metadata.totalMessages).toBe(2);
  });
});

// ============================================================
// Edge cases
// ============================================================

describe('parseWhatsAppText — edge cases', () => {
  it('strips BOM from beginning of text', () => {
    const text = '\uFEFF' + wa([
      '01.02.2024, 14:23 - Ania: Hej',
      '01.02.2024, 14:24 - Bartek: Siema',
    ]);
    const result = parseWhatsAppText(text);
    expect(result.participants).toHaveLength(2);
  });

  it('throws when file has only system messages', () => {
    const text = wa([
      '01.02.2024, 14:22 - Messages and calls are end-to-end encrypted.',
    ]);
    expect(() => parseWhatsAppText(text)).toThrow('No user messages found');
  });

  it('builds title from participant names', () => {
    const text = wa([
      '01.02.2024, 14:23 - Ania: Hey',
      '01.02.2024, 14:24 - Bartek: Hi',
    ]);
    const result = parseWhatsAppText(text);
    expect(result.title).toBe('Ania i Bartek');
  });

  it('computes correct durationDays', () => {
    const text = wa([
      '01.01.2024, 10:00 - Ania: Start',
      '31.01.2024, 10:00 - Bartek: End',
    ]);
    const result = parseWhatsAppText(text);
    expect(result.metadata.durationDays).toBe(30);
  });
});
