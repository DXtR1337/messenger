/**
 * Facebook Messenger JSON parser.
 * 
 * Critical: Facebook exports encode all strings as latin-1 escaped unicode.
 * Without decoding, Polish characters (ą, ę, ś, ć, etc.) and emoji are garbled.
 * The decodeFBString function MUST be applied to every string field.
 */

import type { ParsedConversation, UnifiedMessage, Participant, Reaction } from './types';

// ============================================================
// Facebook Unicode Decoding
// ============================================================

/**
 * Decode Facebook's broken unicode encoding.
 * Facebook exports text as if it were latin-1, but it's actually UTF-8 bytes.
 * We need to reinterpret the character codes as raw bytes and decode as UTF-8.
 * 
 * Example: "Cze\u00c5\u009b\u00c4\u0087" → "Cześć"
 */
export function decodeFBString(str: string | undefined | null): string {
  if (!str) return '';
  try {
    const bytes = new Uint8Array(str.split('').map(c => c.charCodeAt(0)));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    // If decoding fails, return original — it might already be correct
    return str;
  }
}

// ============================================================
// Raw Facebook JSON Types
// ============================================================

interface FBReaction {
  reaction: string;
  actor: string;
}

/** Standard Facebook export format */
interface FBMessage {
  sender_name: string;
  timestamp_ms: number;
  content?: string;
  type: string;
  is_unsent?: boolean;
  reactions?: FBReaction[];
  photos?: Array<{ uri: string; creation_timestamp: number }>;
  videos?: Array<{ uri: string; creation_timestamp: number }>;
  audio_files?: Array<{ uri: string; creation_timestamp: number }>;
  gifs?: Array<{ uri: string }>;
  sticker?: { uri: string };
  share?: { link?: string; share_text?: string };
  call_duration?: number;
}

interface FBConversation {
  participants: Array<{ name: string }>;
  messages: FBMessage[];
  title: string;
  is_still_participant: boolean;
  thread_path: string;
}

/** Alternative export format (e.g. chat export tools) */
interface AltMessage {
  senderName: string;
  timestamp: number;
  text?: string;
  type: string;
  isUnsent?: boolean;
  reactions?: FBReaction[];
  media?: Array<{ uri?: string }>;
}

interface AltConversation {
  participants: string[];
  messages: AltMessage[];
  threadName: string;
}

// ============================================================
// Validation
// ============================================================

export function validateMessengerJSON(data: unknown): data is FBConversation {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.participants)) return false;
  if (!Array.isArray(obj.messages)) return false;
  if (typeof obj.title !== 'string') return false;

  // Check first message has required fields
  if (obj.messages.length > 0) {
    const firstMsg = obj.messages[0] as Record<string, unknown>;
    if (typeof firstMsg.sender_name !== 'string') return false;
    if (typeof firstMsg.timestamp_ms !== 'number') return false;
  }

  return true;
}

function validateAltFormat(data: unknown): data is AltConversation {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.participants)) return false;
  if (!Array.isArray(obj.messages)) return false;
  if (typeof obj.threadName !== 'string') return false;

  if (obj.messages.length > 0) {
    const firstMsg = obj.messages[0] as Record<string, unknown>;
    if (typeof firstMsg.senderName !== 'string') return false;
    if (typeof firstMsg.timestamp !== 'number') return false;
  }

  return true;
}

function parseAltConversation(data: AltConversation): ParsedConversation {
  const participants: Participant[] = data.participants.map(name => ({ name }));

  // Sort chronologically (oldest first)
  const sortedMessages = [...data.messages].sort((a, b) => a.timestamp - b.timestamp);

  const messages: UnifiedMessage[] = sortedMessages.map((msg, index) => {
    const content = msg.text ?? '';
    let type: UnifiedMessage['type'] = 'text';
    if (msg.isUnsent) type = 'unsent';
    else if (msg.type === 'call') type = 'call';
    else if (msg.type === 'system') type = 'system';
    else if (msg.media?.length && !content) type = 'media';

    return {
      index,
      sender: msg.senderName,
      content,
      timestamp: msg.timestamp,
      type,
      reactions: (msg.reactions ?? []).map(r => ({
        emoji: r.reaction,
        actor: r.actor,
      })),
      hasMedia: Boolean(msg.media?.length),
      hasLink: false,
      isUnsent: Boolean(msg.isUnsent),
    };
  });

  const timestamps = messages.map(m => m.timestamp);
  const start = Math.min(...timestamps);
  const end = Math.max(...timestamps);
  const durationDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));

  // Derive title from threadName (strip trailing _number)
  const title = data.threadName.replace(/_\d+$/, '');

  return {
    platform: 'messenger',
    title,
    participants,
    messages,
    metadata: {
      totalMessages: messages.length,
      dateRange: { start, end },
      isGroup: participants.length > 2,
      durationDays,
    },
  };
}

// ============================================================
// Parser
// ============================================================

function classifyMessage(msg: FBMessage): UnifiedMessage['type'] {
  if (msg.is_unsent) return 'unsent';
  if (msg.type === 'Call') return 'call';
  if (msg.type === 'Subscribe' || msg.type === 'Unsubscribe') return 'system';
  if (msg.sticker) return 'sticker';
  if (msg.share?.link) return 'link';
  if (msg.photos?.length || msg.videos?.length || msg.audio_files?.length || msg.gifs?.length) {
    return msg.content ? 'text' : 'media';
  }
  return 'text';
}

function parseReactions(reactions: FBReaction[] | undefined): Reaction[] {
  if (!reactions) return [];
  return reactions.map(r => ({
    emoji: decodeFBString(r.reaction),
    actor: decodeFBString(r.actor),
  }));
}

export function parseMessengerJSON(data: unknown): ParsedConversation {
  // Try alternative format first (senderName/text/threadName)
  if (validateAltFormat(data)) {
    return parseAltConversation(data);
  }

  if (!validateMessengerJSON(data)) {
    throw new Error(
      'Invalid Messenger JSON format. Expected a Facebook Messenger export with "participants", "messages", and "title" fields.'
    );
  }

  const fb = data as FBConversation;

  // Decode participant names
  const participants: Participant[] = fb.participants.map(p => ({
    name: decodeFBString(p.name),
  }));

  // Facebook exports messages in reverse chronological order (newest first)
  // We reverse to get chronological order (oldest first)
  const sortedMessages = [...fb.messages].reverse();

  // Parse all messages
  const messages: UnifiedMessage[] = sortedMessages.map((msg, index) => {
    const content = decodeFBString(msg.content);
    const type = classifyMessage(msg);
    
    return {
      index,
      sender: decodeFBString(msg.sender_name),
      content: content,
      timestamp: msg.timestamp_ms,
      type,
      reactions: parseReactions(msg.reactions),
      hasMedia: Boolean(msg.photos?.length || msg.videos?.length || msg.audio_files?.length || msg.gifs?.length),
      hasLink: Boolean(msg.share?.link),
      isUnsent: Boolean(msg.is_unsent),
    };
  });

  // Compute metadata
  const timestamps = messages.map(m => m.timestamp);
  const start = Math.min(...timestamps);
  const end = Math.max(...timestamps);
  const durationDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));

  return {
    platform: 'messenger',
    title: decodeFBString(fb.title),
    participants,
    messages,
    metadata: {
      totalMessages: messages.length,
      dateRange: { start, end },
      isGroup: participants.length > 2,
      durationDays,
    },
  };
}

// ============================================================
// Multi-file support
// ============================================================

/**
 * Facebook splits long conversations into multiple JSON files
 * (message_1.json, message_2.json, etc.).
 * This function merges them into a single ParsedConversation.
 */
export function mergeMessengerFiles(files: unknown[]): ParsedConversation {
  if (files.length === 0) throw new Error('No files provided');
  if (files.length === 1) return parseMessengerJSON(files[0]);

  const parsed = files.map(f => parseMessengerJSON(f));
  
  // Merge all messages and re-sort chronologically
  const allMessages = parsed
    .flatMap(p => p.messages)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((msg, index) => ({ ...msg, index })); // Re-index

  const first = parsed[0];
  const timestamps = allMessages.map(m => m.timestamp);
  const start = Math.min(...timestamps);
  const end = Math.max(...timestamps);
  const durationDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));

  return {
    platform: 'messenger',
    title: first.title,
    participants: first.participants,
    messages: allMessages,
    metadata: {
      totalMessages: allMessages.length,
      dateRange: { start, end },
      isGroup: first.metadata.isGroup,
      durationDays,
    },
  };
}
