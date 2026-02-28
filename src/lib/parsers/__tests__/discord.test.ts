/**
 * Tests for Discord message parser.
 * Discord uses API-fetched data, not file uploads.
 * The parser accepts an array of DiscordMessage objects.
 */
import { describe, it, expect } from 'vitest';
import { parseDiscordMessages } from '../discord';
import type { DiscordMessage, DiscordAttachment, DiscordReaction, DiscordUser } from '../discord';

// ============================================================
// Fixtures
// ============================================================

const BASE_TIMESTAMP = '2024-01-01T10:00:00.000Z';

function makeDiscordUser(overrides?: Partial<DiscordUser>): DiscordUser {
  return {
    id: '111111111',
    username: 'Anna',
    bot: false,
    ...overrides,
  };
}

function makeDiscordMessage(overrides?: Partial<DiscordMessage>): DiscordMessage {
  return {
    id: '1234567890123456',
    type: 0, // DEFAULT
    content: 'Hej wszystkim!',
    author: makeDiscordUser(),
    timestamp: BASE_TIMESTAMP,
    attachments: [],
    ...overrides,
  };
}

// ============================================================
// Basic parsing
// ============================================================

describe('parseDiscordMessages — basic parsing', () => {
  it('parses a Discord messages array into a ParsedConversation', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage(),
      makeDiscordMessage({
        id: '1234567890123457',
        author: makeDiscordUser({ id: '222222222', username: 'Bartek' }),
        content: 'Cześć!',
        timestamp: '2024-01-01T10:01:00.000Z',
      }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.platform).toBe('discord');
    expect(result.messages).toHaveLength(2);
  });

  it('sets title to channelName when provided', () => {
    const result = parseDiscordMessages([makeDiscordMessage()], 'general');
    expect(result.title).toBe('general');
  });

  it('defaults title to "Discord" when channelName is omitted', () => {
    const result = parseDiscordMessages([makeDiscordMessage()]);
    expect(result.title).toBe('Discord');
  });

  it('extracts participant names from author.username when global_name is absent', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ author: makeDiscordUser({ username: 'Anna', global_name: undefined }) }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.participants[0].name).toBe('Anna');
  });

  it('prefers author.global_name over author.username when present', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({
        author: makeDiscordUser({ username: 'anna123', global_name: 'Anna Kowalska' }),
      }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.participants[0].name).toBe('Anna Kowalska');
    expect(result.messages[0].sender).toBe('Anna Kowalska');
  });

  it('deduplicates participants — same author ID appears only once', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ id: '1', content: 'First' }),
      makeDiscordMessage({ id: '2', content: 'Second' }),
      makeDiscordMessage({ id: '3', content: 'Third' }),
    ];
    const result = parseDiscordMessages(messages);
    // All three from the same author (id: '111111111')
    expect(result.participants).toHaveLength(1);
    expect(result.participants[0].name).toBe('Anna');
  });

  it('stores platformId (Discord user ID) on participants', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ author: makeDiscordUser({ id: '999888777', username: 'Anna' }) }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.participants[0].platformId).toBe('999888777');
  });

  it('parses ISO timestamp strings correctly to Unix ms', () => {
    const ts = '2024-06-15T14:30:00.000Z';
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ timestamp: ts }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.messages[0].timestamp).toBe(new Date(ts).getTime());
  });

  it('maps message content to ParsedMessage.content', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ content: 'Hello World' }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.messages[0].content).toBe('Hello World');
  });

  it('sorts messages chronologically (oldest first) regardless of input order', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ id: '2', timestamp: '2024-01-01T10:02:00.000Z', content: 'Third' }),
      makeDiscordMessage({ id: '3', timestamp: '2024-01-01T10:01:00.000Z', content: 'Second' }),
      makeDiscordMessage({ id: '1', timestamp: '2024-01-01T10:00:00.000Z', content: 'First' }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.messages[0].content).toBe('First');
    expect(result.messages[1].content).toBe('Second');
    expect(result.messages[2].content).toBe('Third');
  });

  it('assigns sequential index starting from 0', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ id: '1', timestamp: '2024-01-01T10:00:00.000Z' }),
      makeDiscordMessage({ id: '2', timestamp: '2024-01-01T10:01:00.000Z' }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.messages[0].index).toBe(0);
    expect(result.messages[1].index).toBe(1);
  });

  it('sets isGroup false for 2 participants', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ id: '1', author: makeDiscordUser({ id: '1', username: 'Anna' }) }),
      makeDiscordMessage({ id: '2', author: makeDiscordUser({ id: '2', username: 'Bartek' }) }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.metadata.isGroup).toBe(false);
  });

  it('sets isGroup true for 3+ participants', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ id: '1', author: makeDiscordUser({ id: '1', username: 'Anna' }) }),
      makeDiscordMessage({ id: '2', author: makeDiscordUser({ id: '2', username: 'Bartek' }) }),
      makeDiscordMessage({ id: '3', author: makeDiscordUser({ id: '3', username: 'Celina' }) }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.metadata.isGroup).toBe(true);
  });
});

// ============================================================
// Author handling — bots
// ============================================================

describe('parseDiscordMessages — author handling', () => {
  it('includes messages from human authors (bot: false)', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ author: makeDiscordUser({ bot: false }) }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.messages).toHaveLength(1);
  });

  it('excludes messages from bot authors (author.bot: true)', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ author: makeDiscordUser({ id: '1', username: 'Human' }) }),
      makeDiscordMessage({
        id: '2',
        author: makeDiscordUser({ id: '999', username: 'MyBot', bot: true }),
        content: 'I am a bot',
      }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].sender).toBe('Human');
  });

  it('bot authors are excluded from participants list', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ author: makeDiscordUser({ id: '1', username: 'Human' }) }),
      makeDiscordMessage({
        id: '2',
        author: makeDiscordUser({ id: '999', username: 'BotUser', bot: true }),
      }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.participants).toHaveLength(1);
    expect(result.participants[0].name).toBe('Human');
  });
});

// ============================================================
// Message type filtering — Discord message types
// ============================================================

describe('parseDiscordMessages — Discord message type filtering', () => {
  it('includes type 0 (DEFAULT) messages', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ type: 0, content: 'Normal message' }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.messages).toHaveLength(1);
  });

  it('includes type 19 (REPLY) messages', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ id: '1', type: 0 }),
      makeDiscordMessage({
        id: '2',
        type: 19,
        content: 'A reply',
        message_reference: { message_id: '1' },
      }),
    ];
    const result = parseDiscordMessages(messages);
    // Type 19 (REPLY) is a USER_MESSAGE_TYPE and should be included in sorted messages
    expect(result.messages.some((m) => m.content === 'A reply')).toBe(true);
  });

  it('excludes non-user system message types (e.g. type 6 = PINS_ADD)', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ id: '1', type: 0, content: 'Normal' }),
      makeDiscordMessage({ id: '2', type: 6, content: '' }), // PINS_ADD system message
    ];
    const result = parseDiscordMessages(messages);
    // Type 6 should be excluded from final sorted output (only types 0 and 19 in sorted)
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].content).toBe('Normal');
  });
});

// ============================================================
// Attachments
// ============================================================

describe('parseDiscordMessages — attachments', () => {
  it('detects image attachments by content_type and classifies as "media"', () => {
    const attachment: DiscordAttachment = {
      id: 'att1',
      filename: 'photo.jpg',
      content_type: 'image/jpeg',
      size: 102400,
      url: 'https://cdn.discordapp.com/attachments/photo.jpg',
    };
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ attachments: [attachment], content: '' }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.messages[0].type).toBe('media');
    expect(result.messages[0].hasMedia).toBe(true);
  });

  it('detects video attachments by content_type and classifies as "media"', () => {
    const attachment: DiscordAttachment = {
      id: 'att2',
      filename: 'clip.mp4',
      content_type: 'video/mp4',
      size: 1024000,
      url: 'https://cdn.discordapp.com/attachments/clip.mp4',
    };
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ attachments: [attachment], content: '' }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.messages[0].type).toBe('media');
    expect(result.messages[0].hasMedia).toBe(true);
  });

  it('detects generic file attachments (no content_type) as "media"', () => {
    const attachment: DiscordAttachment = {
      id: 'att3',
      filename: 'document.pdf',
      size: 51200,
      url: 'https://cdn.discordapp.com/attachments/document.pdf',
    };
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ attachments: [attachment], content: '' }),
    ];
    const result = parseDiscordMessages(messages);
    // Any attachment (regardless of content_type) is classified as 'media'
    expect(result.messages[0].type).toBe('media');
    expect(result.messages[0].hasMedia).toBe(true);
  });

  it('sets hasMedia false for messages with empty attachments array', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ attachments: [], content: 'Just text' }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.messages[0].hasMedia).toBe(false);
  });
});

// ============================================================
// Stickers
// ============================================================

describe('parseDiscordMessages — stickers', () => {
  it('classifies messages with sticker_items as "sticker"', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({
        sticker_items: [{ name: 'wave_sticker' }],
        content: '',
      }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.messages[0].type).toBe('sticker');
  });

  it('uses first sticker name as message content', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({
        sticker_items: [{ name: 'wave_sticker' }],
        content: '',
      }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.messages[0].content).toBe('wave_sticker');
  });
});

// ============================================================
// Links
// ============================================================

describe('parseDiscordMessages — link detection', () => {
  it('classifies pure URL content as "link"', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ content: 'https://example.com' }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.messages[0].type).toBe('link');
    expect(result.messages[0].hasLink).toBe(true);
  });

  it('classifies empty content with embeds as "link"', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ content: '', embeds: [{ url: 'https://example.com' }] }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.messages[0].type).toBe('link');
  });

  it('sets hasLink true for text messages containing http URL', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ content: 'Check this out: https://example.com' }),
    ];
    const result = parseDiscordMessages(messages);
    // Not a pure URL, so type stays 'text', but hasLink is true
    expect(result.messages[0].type).toBe('text');
    expect(result.messages[0].hasLink).toBe(true);
  });
});

// ============================================================
// Reactions
// ============================================================

describe('parseDiscordMessages — reactions', () => {
  it('maps emoji reactions to ParsedMessage reactions', () => {
    const reactions: DiscordReaction[] = [
      { emoji: { id: null, name: '👍' }, count: 2 },
    ];
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ reactions }),
    ];
    const result = parseDiscordMessages(messages);
    // 1 entry per emoji type, with count field
    expect(result.messages[0].reactions).toHaveLength(1);
    expect(result.messages[0].reactions[0].emoji).toBe('👍');
    expect(result.messages[0].reactions[0].count).toBe(2);
  });

  it('uses "unknown" as actor (Discord API does not expose individual reactors)', () => {
    const reactions: DiscordReaction[] = [
      { emoji: { id: null, name: '❤️' }, count: 1 },
    ];
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ reactions }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.messages[0].reactions[0].actor).toBe('unknown');
  });

  it('handles multiple different emoji reactions', () => {
    const reactions: DiscordReaction[] = [
      { emoji: { id: null, name: '👍' }, count: 1 },
      { emoji: { id: null, name: '😂' }, count: 3 },
    ];
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ reactions }),
    ];
    const result = parseDiscordMessages(messages);
    // 1 entry per emoji type
    expect(result.messages[0].reactions).toHaveLength(2);
    expect(result.messages[0].reactions[0].emoji).toBe('👍');
    expect(result.messages[0].reactions[0].count).toBe(1);
    expect(result.messages[0].reactions[1].emoji).toBe('😂');
    expect(result.messages[0].reactions[1].count).toBe(3);
  });

  it('handles messages with no reactions field', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ reactions: undefined }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.messages[0].reactions).toHaveLength(0);
  });

  it('handles messages with empty reactions array', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ reactions: [] }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.messages[0].reactions).toHaveLength(0);
  });
});

// ============================================================
// Reply threading
// ============================================================

describe('parseDiscordMessages — reply threading', () => {
  it('resolves reply reference to replyToIndex', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({
        id: 'msg1',
        timestamp: '2024-01-01T10:00:00.000Z',
        content: 'Original',
      }),
      makeDiscordMessage({
        id: 'msg2',
        type: 19,
        timestamp: '2024-01-01T10:01:00.000Z',
        content: 'Reply',
        message_reference: { message_id: 'msg1' },
      }),
    ];
    const result = parseDiscordMessages(messages);
    // msg2 is a reply to msg1 which is at index 0
    const replyMsg = result.messages.find((m) => m.content === 'Reply');
    expect(replyMsg?.replyToIndex).toBe(0);
  });

  it('sets replyToIndex undefined when message has no reply reference', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ content: 'Standalone message' }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.messages[0].replyToIndex).toBeUndefined();
  });
});

// ============================================================
// Mentions
// ============================================================

describe('parseDiscordMessages — mentions', () => {
  it('includes @mentions of known participants', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({
        id: '1',
        author: makeDiscordUser({ id: '1', username: 'Anna' }),
        content: 'Hey Bartek!',
        mentions: [makeDiscordUser({ id: '2', username: 'Bartek' })],
      }),
      makeDiscordMessage({
        id: '2',
        author: makeDiscordUser({ id: '2', username: 'Bartek' }),
        content: 'Yes?',
      }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.messages[0].mentions).toContain('Bartek');
  });

  it('excludes bot mentions from the mentions list', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({
        content: 'Hey bot',
        mentions: [makeDiscordUser({ id: '999', username: 'SomeBot', bot: true })],
      }),
    ];
    const result = parseDiscordMessages(messages);
    // Bot mentions are filtered out
    expect(result.messages[0].mentions).toBeUndefined();
  });

  it('sets mentions to undefined when there are no mentions', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ mentions: [] }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.messages[0].mentions).toBeUndefined();
  });
});

// ============================================================
// Edited messages
// ============================================================

describe('parseDiscordMessages — edited messages', () => {
  it('sets isEdited true when edited_timestamp is present', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ edited_timestamp: '2024-01-01T10:05:00.000Z' }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.messages[0].isEdited).toBe(true);
  });

  it('sets isEdited false when edited_timestamp is null', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ edited_timestamp: null }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.messages[0].isEdited).toBe(false);
  });

  it('sets isEdited false when edited_timestamp is absent', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage(),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.messages[0].isEdited).toBe(false);
  });
});

// ============================================================
// Edge cases
// ============================================================

describe('parseDiscordMessages — edge cases', () => {
  it('handles empty messages array gracefully', () => {
    const result = parseDiscordMessages([]);
    expect(result.platform).toBe('discord');
    expect(result.messages).toHaveLength(0);
    expect(result.participants).toHaveLength(0);
    expect(result.metadata.totalMessages).toBe(0);
  });

  it('handles single-author messages (1 participant)', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ id: '1', content: 'First' }),
      makeDiscordMessage({ id: '2', content: 'Second' }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.participants).toHaveLength(1);
    expect(result.messages).toHaveLength(2);
  });

  it('handles messages with empty content (attachments-only)', () => {
    const attachment: DiscordAttachment = {
      id: 'att1',
      filename: 'image.png',
      content_type: 'image/png',
      size: 51200,
      url: 'https://cdn.discordapp.com/attachments/image.png',
    };
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ content: '', attachments: [attachment] }),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.messages[0].content).toBe('');
    expect(result.messages[0].type).toBe('media');
    expect(result.messages[0].hasMedia).toBe(true);
  });

  it('sets totalMessages to count of included user messages', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage({ id: '1', author: makeDiscordUser({ id: '1', username: 'Anna' }) }),
      makeDiscordMessage({ id: '2', author: makeDiscordUser({ id: '2', username: 'Bartek' }) }),
      // Bot — excluded
      makeDiscordMessage({ id: '3', author: makeDiscordUser({ id: '999', username: 'Bot', bot: true }) }),
    ];
    const result = parseDiscordMessages(messages);
    // 2 human messages, 1 bot excluded
    expect(result.metadata.totalMessages).toBe(2);
  });

  it('sets isUnsent to false for all Discord messages (Discord has no unsent concept)', () => {
    const messages: DiscordMessage[] = [
      makeDiscordMessage(),
    ];
    const result = parseDiscordMessages(messages);
    expect(result.messages[0].isUnsent).toBe(false);
  });
});
