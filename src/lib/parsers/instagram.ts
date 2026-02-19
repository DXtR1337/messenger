/**
 * Instagram DM JSON parser for PodTeksT.
 * Instagram exports from Meta use nearly identical format to Messenger.
 * Same Facebook unicode encoding applies — reuse decodeFBString.
 */

import type {
  ParsedConversation,
  UnifiedMessage,
  Participant,
  Reaction,
} from './types';
import { decodeFBString } from './messenger';

// ── Validation ─────────────────────────────────────────────

export function validateInstagramJSON(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.participants)) return false;
  if (!Array.isArray(obj.messages)) return false;
  if (obj.messages.length === 0) return false;

  const firstMsg = (obj.messages as Record<string, unknown>[])[0];
  if (!firstMsg) return false;

  return (
    typeof firstMsg.sender_name === 'string' &&
    typeof firstMsg.timestamp_ms === 'number'
  );
}

// ── Parser ─────────────────────────────────────────────────

interface RawIGMessage {
  sender_name: string;
  timestamp_ms: number;
  content?: string;
  type?: string;
  is_unsent?: boolean;
  reactions?: Array<{ reaction: string; actor: string }>;
  photos?: unknown[];
  videos?: unknown[];
  audio_files?: unknown[];
  share?: { link?: string };
  sticker?: unknown;
  call_duration?: number;
}

interface RawIGExport {
  participants: Array<{ name: string }>;
  messages: RawIGMessage[];
  title?: string;
  thread_path?: string;
}

function classifyMessageType(
  msg: RawIGMessage,
): UnifiedMessage['type'] {
  if (msg.is_unsent) return 'unsent';
  if (msg.call_duration !== undefined) return 'call';
  if (msg.sticker) return 'sticker';
  if (msg.share?.link) return 'link';
  if (
    (msg.photos && msg.photos.length > 0) ||
    (msg.videos && msg.videos.length > 0) ||
    (msg.audio_files && msg.audio_files.length > 0)
  )
    return 'media';
  return 'text';
}

export function parseInstagramJSON(data: unknown): ParsedConversation {
  if (!validateInstagramJSON(data)) {
    throw new Error('Nieprawidłowy format eksportu Instagram DM');
  }

  const raw = data as RawIGExport;

  const participantNames = raw.participants.map((p) => decodeFBString(p.name));
  const participants: Participant[] = participantNames.map((name) => ({ name }));

  // Messages come newest-first — reverse for chronological
  const sortedRaw = [...raw.messages].reverse();

  const messages: UnifiedMessage[] = sortedRaw.map((msg, idx) => {
    const reactions: Reaction[] = (msg.reactions ?? []).map((r) => ({
      emoji: decodeFBString(r.reaction),
      actor: decodeFBString(r.actor),
    }));

    return {
      index: idx,
      sender: decodeFBString(msg.sender_name),
      content: msg.content ? decodeFBString(msg.content) : '',
      timestamp: msg.timestamp_ms,
      type: classifyMessageType(msg),
      reactions,
      hasMedia:
        (msg.photos?.length ?? 0) > 0 ||
        (msg.videos?.length ?? 0) > 0 ||
        (msg.audio_files?.length ?? 0) > 0,
      hasLink: !!msg.share?.link,
      isUnsent: !!msg.is_unsent,
    };
  });

  const nonSystem = messages.filter((m) => m.type !== 'system');
  const timestamps = nonSystem.map((m) => m.timestamp);
  const start = Math.min(...timestamps);
  const end = Math.max(...timestamps);
  const durationDays = Math.max(1, Math.round((end - start) / 86_400_000));

  const title = raw.title ? decodeFBString(raw.title) : participantNames.join(' & ');

  return {
    platform: 'instagram',
    title,
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

export function mergeInstagramFiles(files: unknown[]): ParsedConversation {
  if (files.length === 0) throw new Error('Brak plików do przetworzenia');
  if (files.length === 1) return parseInstagramJSON(files[0]);

  const conversations = files.map((f) => parseInstagramJSON(f));
  const allMessages = conversations.flatMap((c) => c.messages);

  allMessages.sort((a, b) => a.timestamp - b.timestamp);
  allMessages.forEach((m, i) => {
    m.index = i;
  });

  const base = conversations[0];
  const nonSystem = allMessages.filter((m) => m.type !== 'system');
  const timestamps = nonSystem.map((m) => m.timestamp);
  const start = Math.min(...timestamps);
  const end = Math.max(...timestamps);

  return {
    ...base,
    messages: allMessages,
    metadata: {
      totalMessages: nonSystem.length,
      dateRange: { start, end },
      isGroup: base.participants.length > 2,
      durationDays: Math.max(1, Math.round((end - start) / 86_400_000)),
    },
  };
}
