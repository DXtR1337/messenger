/**
 * Discord message parser for PodTeksT.
 * Converts raw Discord API message objects to ParsedConversation format.
 * Discord messages come directly from the API — no file-based export.
 */

import type {
  ParsedConversation,
  UnifiedMessage,
  Participant,
  Reaction,
} from './types';

// ── Raw Discord API types ──────────────────────────────────

export interface DiscordUser {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  bot?: boolean;
}

export interface DiscordAttachment {
  id: string;
  filename: string;
  content_type?: string;
  size: number;
  url: string;
}

export interface DiscordReaction {
  emoji: { id?: string | null; name: string };
  count: number;
}

export interface DiscordMessage {
  id: string;
  type: number;
  content: string;
  author: DiscordUser;
  timestamp: string; // ISO8601
  edited_timestamp?: string | null;
  attachments: DiscordAttachment[];
  reactions?: DiscordReaction[];
  embeds?: unknown[];
  mentions?: DiscordUser[];
  message_reference?: { message_id?: string } | null;
  sticker_items?: Array<{ name: string }>;
}

export interface DiscordChannel {
  id: string;
  name?: string;
  type: number;
  guild_id?: string;
}

// ── Discord message type constants ──────────────────────────
// Type 0 = DEFAULT, Type 19 = REPLY — these are user messages
const USER_MESSAGE_TYPES = new Set([0, 19]);

// ── Helpers ─────────────────────────────────────────────────

function classifyType(msg: DiscordMessage): UnifiedMessage['type'] {
  if (!USER_MESSAGE_TYPES.has(msg.type)) return 'system';
  if (msg.sticker_items && msg.sticker_items.length > 0) return 'sticker';

  const hasAttachments = msg.attachments.length > 0;
  const isMediaAttachment = msg.attachments.some((a) => {
    const ct = a.content_type ?? '';
    return ct.startsWith('image/') || ct.startsWith('video/') || ct.startsWith('audio/');
  });

  if (hasAttachments && isMediaAttachment) return 'media';
  if (hasAttachments) return 'media';

  const content = msg.content.trim();
  if (!content && msg.embeds && msg.embeds.length > 0) return 'link';
  if (/^https?:\/\/\S+$/i.test(content)) return 'link';

  return 'text';
}

function getDisplayName(author: DiscordUser): string {
  return author.global_name ?? author.username;
}

// ── Parser ──────────────────────────────────────────────────

export function parseDiscordMessages(
  messages: DiscordMessage[],
  channelName?: string,
): ParsedConversation {
  // Filter out bot messages and non-user message types
  // Type 7 = GUILD_MEMBER_JOIN — include for participant discovery but filter from sorted later
  const userMessages = messages.filter(
    (m) => !m.author.bot && USER_MESSAGE_TYPES.has(m.type),
  );

  // Collect unique participants
  const nameMap = new Map<string, DiscordUser>();
  for (const msg of userMessages) {
    if (!nameMap.has(msg.author.id)) {
      nameMap.set(msg.author.id, msg.author);
    }
  }

  const participants: Participant[] = [...nameMap.values()].map((user) => ({
    name: getDisplayName(user),
    platformId: user.id,
  }));

  // Sort messages chronologically (Discord API returns newest first)
  const sorted = [...userMessages]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Build Discord message ID → index map for reply resolution
  const idToIndex = new Map<string, number>();
  for (let i = 0; i < sorted.length; i++) {
    idToIndex.set(sorted[i].id, i);
  }

  // Build set of participant display names for mention filtering
  const participantNameSet = new Set(participants.map((p) => p.name));

  const unified: UnifiedMessage[] = [];
  let idx = 0;

  for (const msg of sorted) {
    const msgType = classifyType(msg);
    const content = msg.content;

    const reactions: Reaction[] = [];
    if (msg.reactions) {
      for (const r of msg.reactions) {
        // Guard against missing emoji data from Discord API
        if (!r.emoji?.name) continue;
        // Discord API doesn't tell us WHO reacted in GET messages endpoint
        // Single entry per emoji type with count — avoids N duplicate entries
        reactions.push({
          emoji: r.emoji.name,
          actor: 'unknown',
          count: r.count,
        });
      }
    }

    // Resolve @mentions to display names (filter bots, keep only known participants)
    const mentionNames = (msg.mentions ?? [])
      .filter((u) => !u.bot)
      .map((u) => getDisplayName(u))
      .filter((name) => participantNameSet.has(name));

    // Resolve reply reference to message index
    const replyToId = msg.message_reference?.message_id;
    const replyToIndex = replyToId ? idToIndex.get(replyToId) : undefined;

    unified.push({
      index: idx++,
      sender: getDisplayName(msg.author),
      content: msgType === 'sticker' ? (msg.sticker_items?.[0]?.name ?? '') : content,
      timestamp: new Date(msg.timestamp).getTime(),
      type: msgType,
      reactions,
      hasMedia: msg.attachments.length > 0,
      hasLink:
        msgType === 'link' ||
        content.includes('http://') ||
        content.includes('https://'),
      isUnsent: false,
      mentions: mentionNames.length > 0 ? mentionNames : undefined,
      replyToIndex,
      isEdited: !!msg.edited_timestamp,
    });
  }

  const timestamps = unified.map((m) => m.timestamp).filter((t) => t > 0);
  const start = timestamps.length > 0 ? timestamps.reduce((a, b) => a < b ? a : b, timestamps[0]) : 0;
  const end = timestamps.length > 0 ? timestamps.reduce((a, b) => a > b ? a : b, timestamps[0]) : 0;
  const durationDays = Math.max(1, Math.round((end - start) / 86_400_000));

  return {
    platform: 'discord',
    title: channelName ?? 'Discord',
    participants,
    messages: unified,
    metadata: {
      totalMessages: unified.length,
      dateRange: { start, end },
      isGroup: participants.length > 2,
      durationDays,
    },
  };
}
