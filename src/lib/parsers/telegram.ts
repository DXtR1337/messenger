/**
 * Telegram JSON parser for PodTeksT.
 * Telegram exports are proper UTF-8 — no encoding issues.
 * The `text` field can be a string or an array of mixed strings/objects.
 */

import type {
  ParsedConversation,
  UnifiedMessage,
  Participant,
  Reaction,
} from './types';

// ── Raw types ──────────────────────────────────────────────

interface RawTelegramTextEntity {
  type: string;
  text: string;
}

type RawTelegramText = string | Array<string | RawTelegramTextEntity>;

interface RawTelegramReaction {
  emoji: string;
  count: number;
  recent?: Array<{ from: string; date: string }>;
}

interface RawTelegramMessage {
  id: number;
  type: string;
  date: string;
  date_unixtime?: string;
  from?: string;
  from_id?: string;
  text: RawTelegramText;
  text_entities?: RawTelegramTextEntity[];
  reply_to_message_id?: number;
  forwarded_from?: string | null;
  photo?: string;
  file?: string;
  media_type?: string;
  sticker_emoji?: string;
  reactions?: RawTelegramReaction[];
  duration_seconds?: number;
  action?: string;
}

interface RawTelegramExport {
  name: string;
  type: string;
  id: number;
  messages: RawTelegramMessage[];
}

// ── Helpers ────────────────────────────────────────────────

function flattenText(text: RawTelegramText): string {
  if (typeof text === 'string') return text;
  return text
    .map((part) => (typeof part === 'string' ? part : part.text ?? ''))
    .join('');
}

function parseTimestamp(msg: RawTelegramMessage): number {
  if (msg.date_unixtime) {
    return parseInt(msg.date_unixtime, 10) * 1000;
  }
  return new Date(msg.date).getTime();
}

function classifyType(msg: RawTelegramMessage): UnifiedMessage['type'] {
  if (msg.type === 'service') return 'system';
  if (msg.action) return 'system';
  if (msg.sticker_emoji) return 'sticker';
  if (msg.duration_seconds !== undefined) return 'call';
  if (msg.photo || msg.media_type === 'video_file' || msg.media_type === 'voice_message' || msg.media_type === 'video_message') return 'media';
  if (msg.file) return 'media';

  const content = flattenText(msg.text);
  if (/^https?:\/\/\S+$/i.test(content.trim())) return 'link';

  return 'text';
}

// ── Validation ─────────────────────────────────────────────

export function validateTelegramJSON(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  if (typeof obj.name !== 'string') return false;
  if (typeof obj.type !== 'string') return false;
  if (typeof obj.id !== 'number') return false;
  if (!Array.isArray(obj.messages)) return false;

  if (obj.messages.length === 0) return true;

  const first = (obj.messages as Record<string, unknown>[])[0];
  return !!(first && ('date' in first || 'date_unixtime' in first));
}

// ── Parser ─────────────────────────────────────────────────

export function parseTelegramJSON(data: unknown): ParsedConversation {
  if (!validateTelegramJSON(data)) {
    throw new Error('Nieprawidłowy format eksportu Telegram');
  }

  const raw = data as RawTelegramExport;

  // Collect unique participant names from messages
  const nameSet = new Set<string>();
  for (const msg of raw.messages) {
    if (msg.from && msg.type === 'message') {
      nameSet.add(msg.from);
    }
  }

  const participants: Participant[] = [...nameSet].map((name) => ({
    name,
    platformId: undefined,
  }));

  // Telegram messages are already chronological
  const messages: UnifiedMessage[] = [];
  let idx = 0;

  for (const msg of raw.messages) {
    if (msg.type !== 'message') continue;
    if (!msg.from) continue;

    const content = flattenText(msg.text);
    const msgType = classifyType(msg);

    const reactions: Reaction[] = [];
    if (msg.reactions) {
      for (const r of msg.reactions) {
        if (r.recent) {
          for (const person of r.recent) {
            reactions.push({
              emoji: r.emoji,
              actor: person.from,
              timestamp: new Date(person.date).getTime(),
            });
          }
        }
      }
    }

    messages.push({
      index: idx++,
      sender: msg.from,
      content: msgType === 'sticker' ? (msg.sticker_emoji ?? '') : content,
      timestamp: parseTimestamp(msg),
      type: msgType,
      reactions,
      hasMedia: !!msg.photo || !!msg.file || !!msg.media_type,
      hasLink: msgType === 'link' || (content.includes('http://') || content.includes('https://')),
      isUnsent: false,
    });
  }

  const nonSystem = messages.filter((m) => m.type !== 'system');
  const timestamps = nonSystem.map((m) => m.timestamp).filter((t) => t > 0);
  const start = timestamps.length > 0 ? Math.min(...timestamps) : 0;
  const end = timestamps.length > 0 ? Math.max(...timestamps) : 0;
  const durationDays = Math.max(1, Math.round((end - start) / 86_400_000));

  return {
    platform: 'telegram',
    title: raw.name,
    participants,
    messages,
    metadata: {
      totalMessages: nonSystem.length,
      dateRange: { start, end },
      isGroup: participants.length > 2,
      durationDays,
    },
  };
}
