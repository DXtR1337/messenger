/**
 * Conversation fingerprint — deterministic hash to identify
 * the same conversation across multiple uploads.
 * Uses Web Crypto API (SHA-256).
 */

export async function computeConversationFingerprint(
  participants: string[],
  platform: string,
  firstMessageTimestamp: number,
): Promise<string> {
  // Normalize: sort names, lowercase, trim
  const sortedNames = [...participants].map(n => n.trim().toLowerCase()).sort();
  
  // Round timestamp to day to handle slight variations in export
  const dayTimestamp = Math.floor(firstMessageTimestamp / 86_400_000) * 86_400_000;
  
  const input = JSON.stringify({
    participants: sortedNames,
    platform,
    startDay: dayTimestamp,
  });
  
  // crypto.subtle is unavailable in non-secure contexts (HTTP localhost)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback: simple string hash for non-secure contexts
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
