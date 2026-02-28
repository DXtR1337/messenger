/**
 * WhatsApp .txt export parser.
 *
 * WhatsApp exports vary wildly by locale and OS:
 *   Android PL:  01.02.2024, 14:23 - Ania: Hej
 *   Android EN:  [01/02/2024, 2:23 PM] Ania: Hey
 *   iOS:         [2024-01-02, 14:23:45] Ania: Hey
 *
 * System messages have no "name: message" structure, just a date and text.
 * Multi-line messages are lines that do NOT start with a date pattern.
 * Media messages contain "<Media omitted>" or "(file attached)".
 */

import type { ParsedConversation, UnifiedMessage, Participant } from './types';

// ============================================================
// URL detection regex (simplified, catches most http/https links)
// ============================================================

const URL_REGEX = /https?:\/\/[^\s<>'"]+/i;

// ============================================================
// Date/time parsing
// ============================================================

/**
 * Regex matching the start of a WhatsApp message line.
 *
 * Group 1: full date string  (e.g. "01.02.2024" or "2024-01-02")
 * Group 2: full time string  (e.g. "14:23" or "2:23:45 PM")
 * Group 3: separator + rest of line after date/time prefix
 *
 * The date part accepts:  DD.MM.YYYY  DD/MM/YYYY  MM/DD/YYYY  YYYY-MM-DD
 *   with 1-4 digit components and .,/- separators.
 * The time part accepts:  HH:MM  HH:MM:SS  h:mm AM/PM  h:mm:ss AM/PM
 *   with : or . as separator.
 */
const LINE_START_REGEX =
  /^\[?(\d{1,4}[.\/-]\d{1,2}[.\/-]\d{1,4}),?\s+(\d{1,2}[:.]\d{2}(?:[:.]\d{2})?(?:\s*[AaPp][Mm])?)\]?\s*[-\u2013\u2014]\s*/;

/**
 * After stripping the date/time prefix, a user message looks like:
 *   SenderName: message text
 * System messages have no colon-separated sender.
 *
 * The sender name can contain spaces, emoji, phone numbers with +,
 * but it never contains a colon, so we match up to the first colon.
 */
const SENDER_CONTENT_REGEX = /^(.+?):\s([\s\S]*)$/;

// ============================================================
// Date string -> timestamp
// ============================================================

interface DateParts {
  year: number;
  month: number; // 1-12
  day: number;
}

/**
 * Try to parse a date string that can be:
 *   DD.MM.YYYY | DD/MM/YYYY | MM/DD/YYYY | YYYY-MM-DD
 *
 * Heuristic to distinguish DD/MM from MM/DD:
 *   - If separator is '-' and first part is 4 digits -> YYYY-MM-DD
 *   - If first part > 12 -> it must be DD (DD/MM/YYYY)
 *   - If second part > 12 -> it must be DD (MM/DD/YYYY)
 *   - Otherwise default to DD/MM/YYYY (more common outside US)
 */
function parseDateString(dateStr: string): DateParts {
  const parts = dateStr.split(/[.\/-]/);
  if (parts.length !== 3) {
    throw new Error(`Cannot parse date: "${dateStr}"`);
  }

  const nums = parts.map(Number);

  // YYYY-MM-DD format (ISO)
  if (dateStr.includes('-') && parts[0].length === 4) {
    return { year: nums[0], month: nums[1], day: nums[2] };
  }

  let day: number;
  let month: number;
  let year: number;

  const a = nums[0];
  const b = nums[1];
  const c = nums[2];

  // Determine year — usually the last component
  // If 2-digit year, expand: 00-69 -> 2000s, 70-99 -> 1900s
  year = c;
  if (year < 100) {
    year = year < 70 ? 2000 + year : 1900 + year;
  }

  // Distinguish DD/MM from MM/DD
  if (a > 12) {
    // a can't be a month, so a=day b=month
    day = a;
    month = b;
  } else if (b > 12) {
    // b can't be a month, so a=month b=day (US format)
    month = a;
    day = b;
  } else {
    // Ambiguous — default to DD/MM (non-US, more common for WhatsApp)
    day = a;
    month = b;
  }

  return { year, month, day };
}

/**
 * Parse a time string like "14:23", "14:23:45", "2:23 PM", "2.23.45 pm".
 */
function parseTimeString(timeStr: string): { hours: number; minutes: number; seconds: number } {
  const trimmed = timeStr.trim();
  const isPM = /[Pp][Mm]/.test(trimmed);
  const isAM = /[Aa][Mm]/.test(trimmed);

  // Strip AM/PM
  const numericPart = trimmed.replace(/\s*[AaPp][Mm]\s*/, '').trim();
  const parts = numericPart.split(/[:.]/);

  let hours = Number(parts[0]);
  const minutes = Number(parts[1] ?? 0);
  const seconds = Number(parts[2] ?? 0);

  // Convert 12-hour to 24-hour
  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return { hours, minutes, seconds };
}

/**
 * Combine date and time strings into a Unix timestamp in milliseconds.
 */
function parseWhatsAppDate(dateStr: string, timeStr: string): number {
  const { year, month, day } = parseDateString(dateStr);
  const { hours, minutes, seconds } = parseTimeString(timeStr);

  const date = new Date(year, month - 1, day, hours, minutes, seconds);
  return date.getTime();
}

// ============================================================
// Message type classification
// ============================================================

const MEDIA_OMITTED_PATTERNS = [
  '<media omitted>',
  '<multimedia omitido>',
  '<archivo omitido>',
  '<medien ausgeschlossen>',
  '<media weggelaten>',
  'image omitted',
  'video omitted',
  'audio omitted',
  'sticker omitted',
  'gif omitted',
  'document omitted',
  'contact card omitted',
];

const FILE_ATTACHED_REGEX = /\.(jpg|jpeg|png|gif|webp|mp4|mp3|opus|ogg|pdf|docx?|xlsx?|pptx?|zip|rar)\s*\(file attached\)/i;

function isMediaMessage(content: string): boolean {
  const lower = content.toLowerCase().trim();
  if (MEDIA_OMITTED_PATTERNS.some(pattern => lower === pattern)) return true;
  if (FILE_ATTACHED_REGEX.test(content)) return true;
  return false;
}

function isLinkMessage(content: string): boolean {
  return URL_REGEX.test(content);
}

function classifyWhatsAppMessage(content: string): UnifiedMessage['type'] {
  if (isMediaMessage(content)) return 'media';
  if (isLinkMessage(content)) return 'link';
  return 'text';
}

// ============================================================
// System message detection
// ============================================================

const SYSTEM_MESSAGE_INDICATORS = [
  'messages and calls are end-to-end encrypted',
  'wiadomości oraz połączenia są szyfrowane',
  'created group',
  'utworzył',
  'changed the subject',
  'zmienił',
  'changed the group description',
  'changed this group',
  'added',
  'dodał',
  'removed',
  'usunął',
  'left',
  'opuścił',
  'joined using',
  'dołączył',
  'security code changed',
  'you were added',
  "you're now an admin",
  'disappearing messages',
  'wiadomości znikające',
  'missed voice call',
  'missed video call',
  'this message was deleted',
  'ta wiadomość została usunięta',
  'you deleted this message',
  'usunąłeś tę wiadomość',
];

/**
 * Determine whether a line (after the date prefix is stripped) is a system
 * message rather than a user message. System messages have no "Name: text"
 * structure — the rest of the line is just descriptive text.
 */
function isSystemMessage(restOfLine: string): boolean {
  // If there's no colon at all, it's definitely a system message
  if (!restOfLine.includes(':')) return true;

  // Check known system patterns
  const lower = restOfLine.toLowerCase();
  return SYSTEM_MESSAGE_INDICATORS.some(indicator => lower.includes(indicator));
}

// ============================================================
// Main parser
// ============================================================

interface RawMessage {
  timestamp: number;
  sender: string;
  content: string;
  isSystem: boolean;
}

export function parseWhatsAppText(text: string): ParsedConversation {
  // Strip BOM
  const cleaned = text.replace(/^\uFEFF/, '');

  const lines = cleaned.split(/\r?\n/);

  const rawMessages: RawMessage[] = [];
  let currentMessage: RawMessage | null = null;

  for (const line of lines) {
    // Skip completely empty lines (but they could be part of a multi-line message)
    if (line.trim() === '' && currentMessage === null) continue;

    const dateMatch = LINE_START_REGEX.exec(line);

    if (dateMatch) {
      // Flush previous message
      if (currentMessage) {
        rawMessages.push(currentMessage);
      }

      const dateStr = dateMatch[1];
      const timeStr = dateMatch[2];
      const restOfLine = line.slice(dateMatch[0].length);

      let timestamp: number;
      try {
        timestamp = parseWhatsAppDate(dateStr, timeStr);
      } catch {
        // If date parsing fails, treat line as continuation of previous message
        if (currentMessage) {
          currentMessage.content += '\n' + line;
        }
        continue;
      }

      // Check if this is a system message or user message
      if (isSystemMessage(restOfLine)) {
        currentMessage = {
          timestamp,
          sender: '',
          content: restOfLine,
          isSystem: true,
        };
      } else {
        // Try to extract sender and content
        const senderMatch = SENDER_CONTENT_REGEX.exec(restOfLine);
        if (senderMatch) {
          currentMessage = {
            timestamp,
            sender: senderMatch[1].trim(),
            content: senderMatch[2],
            isSystem: false,
          };
        } else {
          // Fallback: treat as system message
          currentMessage = {
            timestamp,
            sender: '',
            content: restOfLine,
            isSystem: true,
          };
        }
      }
    } else {
      // Line does not start with a date — it's a continuation of the previous message
      if (currentMessage) {
        if (currentMessage.content.length > 100_000) {
          currentMessage.content = currentMessage.content.slice(0, 100_000) + '\n[...treść obcięta]';
        } else {
          currentMessage.content += '\n' + line;
        }
      }
      // If no current message exists, skip orphan lines
    }
  }

  // Flush the last message
  if (currentMessage) {
    rawMessages.push(currentMessage);
  }

  // Filter out system messages and build unified messages
  const participantSet = new Set<string>();
  const messages: UnifiedMessage[] = [];
  let index = 0;

  for (const raw of rawMessages) {
    if (raw.isSystem) {
      // Include system messages in the output for completeness,
      // but they don't count toward participant extraction
      messages.push({
        index,
        sender: raw.sender || 'System',
        content: raw.content.trim(),
        timestamp: raw.timestamp,
        type: 'system',
        reactions: [],
        hasMedia: false,
        hasLink: false,
        isUnsent: false,
      });
      index++;
      continue;
    }

    participantSet.add(raw.sender);

    const content = raw.content.trim();
    const type = classifyWhatsAppMessage(content);

    // Check for deleted/unsent messages
    const lowerContent = content.toLowerCase();
    const isUnsent =
      lowerContent === 'this message was deleted' ||
      lowerContent === 'you deleted this message' ||
      lowerContent === 'ta wiadomość została usunięta' ||
      lowerContent === 'usunąłeś tę wiadomość';

    messages.push({
      index,
      sender: raw.sender,
      content,
      timestamp: raw.timestamp,
      type: isUnsent ? 'unsent' : type,
      reactions: [], // WhatsApp exports don't include reactions
      hasMedia: type === 'media',
      hasLink: type === 'link' || isLinkMessage(content),
      isUnsent,
    });
    index++;
  }

  // Build participants list
  const participants: Participant[] = Array.from(participantSet).map(name => ({
    name,
  }));

  // Filter to only non-system messages for metadata
  const userMessages = messages.filter(m => m.type !== 'system');

  if (userMessages.length === 0) {
    throw new Error(
      'No user messages found in the WhatsApp export. The file may be empty or contain only system messages.'
    );
  }

  // Compute metadata
  const timestamps = userMessages.map(m => m.timestamp);
  const start = timestamps.reduce((a, b) => a < b ? a : b, timestamps[0]);
  const end = timestamps.reduce((a, b) => a > b ? a : b, timestamps[0]);
  const durationDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));

  // Build title from participant names
  const title =
    participants.length <= 3
      ? participants.map(p => p.name).join(' i ')
      : `${participants[0].name} i ${participants.length - 1} innych`;

  return {
    platform: 'whatsapp',
    title,
    participants,
    messages,
    metadata: {
      totalMessages: userMessages.length,
      dateRange: { start, end },
      isGroup: participants.length > 2,
      durationDays,
    },
  };
}
