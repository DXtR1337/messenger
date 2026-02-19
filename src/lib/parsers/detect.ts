/**
 * Auto-detection of chat export format.
 */

export type ChatFormat = 'messenger' | 'instagram' | 'whatsapp' | 'telegram' | 'unknown';

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
    // Both are Meta exports — nearly identical format
    // Default to messenger (Instagram can use the same parser with platform override)
    return 'messenger';
  }

  return 'unknown';
}
