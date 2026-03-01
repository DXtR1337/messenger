/**
 * Auto-detection of chat export format.
 */

export type ChatFormat = 'messenger' | 'instagram' | 'whatsapp' | 'telegram' | 'discord' | 'unknown';

/**
 * Detect the chat format from a file and its parsed JSON data.
 * WhatsApp is detected by .txt extension.
 * JSON formats are distinguished by structure heuristics.
 */
export function detectFormat(fileName: string, jsonData?: unknown): ChatFormat {
  // WhatsApp: always .txt
  if (fileName.endsWith('.txt')) return 'whatsapp';

  if (!jsonData || typeof jsonData !== 'object') return 'unknown';
  const data = jsonData as Record<string, unknown>;

  // Discord: messages[] with author.username structure (Discord export tools)
  if (Array.isArray(data.messages)) {
    const msgs = data.messages as Record<string, unknown>[];
    const first = msgs[0];
    if (first && typeof first === 'object' && first !== null) {
      const author = (first as Record<string, unknown>).author;
      if (author && typeof author === 'object' && author !== null && 'username' in (author as Record<string, unknown>)) {
        return 'discord';
      }
    }
  }

  // Telegram: has "name", "type", "id" (number), messages with "from" and "date_unixtime"
  if (
    typeof data.name === 'string' &&
    typeof data.type === 'string' &&
    typeof data.id === 'number' &&
    Array.isArray(data.messages)
  ) {
    const msgs = data.messages as Record<string, unknown>[];
    const first = msgs.find((m) => m.type === 'message');
    if (first && 'from' in first && ('date_unixtime' in first || 'date' in first)) {
      return 'telegram';
    }
  }

  // Messenger / Instagram: both have participants[] and messages[] with sender_name
  if (Array.isArray(data.participants) && Array.isArray(data.messages)) {
    // Both are Meta exports — nearly identical format.
    // Heuristic: Messenger exports include thread_path containing 'inbox' or 'e2ee_cutover';
    // Instagram DM exports typically lack thread_path or have different patterns.
    if (typeof data.thread_path === 'string') {
      const threadPath = (data.thread_path as string).toLowerCase();
      // Known Messenger thread_path prefixes
      if (threadPath.includes('inbox') || threadPath.includes('e2ee_cutover') || threadPath.includes('filtered_threads') || threadPath.includes('message_requests')) {
        return 'messenger';
      }
      return 'instagram';
    }
    // If thread_path exists (even as undefined/null), it's likely Messenger
    if ('thread_path' in data) {
      return 'messenger';
    }
    // No thread_path at all — check for Instagram-specific fields
    // Instagram exports often have 'thread_type' or lack 'is_still_participant'
    if (!('is_still_participant' in data)) {
      return 'instagram';
    }
    return 'messenger';
  }

  return 'unknown';
}
