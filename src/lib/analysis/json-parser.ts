/**
 * JSON parsing utilities for Gemini API responses.
 *
 * Extracted as a separate module (without 'server-only') so these
 * pure functions can be unit-tested independently of the Gemini SDK.
 *
 * Used by gemini.ts for all AI response parsing.
 */

/**
 * Fix unescaped control characters inside JSON string values.
 * Walks through the string tracking whether we're inside a quoted value;
 * replaces raw control chars (tabs, newlines, etc.) with proper escape sequences.
 */
export function sanitizeJsonString(raw: string): string {
  const out: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];

    if (escaped) {
      out.push(ch);
      escaped = false;
      continue;
    }

    if (ch === '\\' && inString) {
      out.push(ch);
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      out.push(ch);
      continue;
    }

    if (inString) {
      const code = ch.charCodeAt(0);
      if (code < 0x20) {
        if (ch === '\n') { out.push('\\n'); continue; }
        if (ch === '\r') { out.push('\\r'); continue; }
        if (ch === '\t') { out.push('\\t'); continue; }
        out.push('\\u' + code.toString(16).padStart(4, '0'));
        continue;
      }
    }

    out.push(ch);
  }

  return out.join('');
}

/**
 * Find the position of the outermost closing bracket/brace in a JSON string,
 * correctly ignoring brackets inside string values.
 * Returns -1 if no matching bracket found.
 */
function findOutermostClosingBracket(text: string): number {
  const openChar = text[0]; // '{' or '['
  const closeChar = openChar === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;
  let lastClosePos = -1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\' && inString) {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === openChar) {
      depth++;
    } else if (ch === closeChar) {
      depth--;
      lastClosePos = i;
      if (depth === 0) return i; // found the matching close for the outermost open
    }
  }

  // Fallback: return position of the last closing bracket found at any depth
  return lastClosePos;
}

/**
 * Parse a Gemini API response string into typed JSON.
 *
 * Three-stage strategy:
 * 1. Strip markdown fences and extract the first JSON block
 * 2. Attempt direct JSON.parse
 * 3. Fix control characters + trailing commas, then retry
 *
 * Throws if all stages fail.
 */
export function parseGeminiJSON<T>(raw: string): T {
  // Detect Gemini safety refusal (non-JSON response)
  const trimmed = raw.trim();
  if (
    trimmed.startsWith('I cannot') ||
    trimmed.startsWith('I\'m unable') ||
    trimmed.startsWith('I am unable') ||
    trimmed.startsWith('Sorry,') ||
    trimmed.startsWith('I apologize') ||
    trimmed.startsWith('Nie mogę') ||
    trimmed.startsWith('Przepraszam, nie') ||
    trimmed.startsWith('Niestety')
  ) {
    throw new Error(
      `Gemini odmówiło wygenerowania odpowiedzi (safety filter). Odpowiedź: "${trimmed.slice(0, 120)}..."`,
    );
  }

  // Strip markdown code fences if present
  let cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  // Sometimes Gemini wraps JSON in extra text — extract the first { ... } or [ ... ] block
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    const jsonStart = cleaned.search(/[{[]/);
    if (jsonStart >= 0) cleaned = cleaned.slice(jsonStart);
  }

  // Find the outermost closing brace/bracket (string-aware) to truncate trailing garbage
  if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
    const lastClose = findOutermostClosingBracket(cleaned);
    if (lastClose >= 0) cleaned = cleaned.slice(0, lastClose + 1);
  }

  // Attempt 1: direct parse
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Attempt 2: fix unescaped control characters and trailing commas
    try {
      const sanitized = sanitizeJsonString(cleaned)
        .replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(sanitized) as T;
    } catch {
      throw new Error('Błąd parsowania odpowiedzi AI — odpowiedź nie jest poprawnym JSON');
    }
  }
}
