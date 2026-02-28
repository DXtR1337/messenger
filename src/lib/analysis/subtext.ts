/**
 * Subtext Decoder — types and helpers.
 * Decodes the hidden meaning behind conversation messages.
 */

// ============================================================
// Types
// ============================================================

export type SubtextCategory =
  | 'deflection'         // unikanie tematu
  | 'hidden_anger'       // ukryty gniew
  | 'seeking_validation' // szukanie potwierdzenia
  | 'power_move'         // gra o władzę
  | 'genuine'            // szczere (brak podtekstu)
  | 'testing'            // testowanie partnera
  | 'guilt_trip'         // wzbudzanie poczucia winy
  | 'passive_aggressive' // bierna agresja
  | 'love_signal'        // ukryty sygnał miłości
  | 'insecurity'         // niepewność
  | 'distancing'         // dystansowanie się
  | 'humor_shield';      // humor jako tarcza

export interface SubtextItem {
  originalMessage: string;
  sender: string;
  timestamp: number;
  subtext: string;
  emotion: string;
  confidence: number;
  category: SubtextCategory;
  isHighlight: boolean;
  exchangeContext: string;
  windowId: number;
  surroundingMessages: Array<{
    sender: string;
    content: string;
    timestamp: number;
  }>;
}

export interface SubtextSummary {
  hiddenEmotionBalance: Record<string, number>;
  mostDeceptivePerson: string;
  deceptionScore: Record<string, number>;
  topCategories: Array<{ category: SubtextCategory; count: number }>;
  biggestReveal: SubtextItem;
}

export interface SubtextResult {
  items: SubtextItem[];
  summary: SubtextSummary;
  disclaimer: string;
  analyzedAt: number;
}

// ============================================================
// Constants
// ============================================================

export const SUBTEXT_DISCLAIMER =
  'Analiza podtekstów opiera się na wzorcach językowych i kontekście konwersacji. ' +
  'Wyniki mają charakter rozrywkowy i interpretacyjny — nie stanowią diagnozy psychologicznej. ' +
  'Prawdziwe intencje rozmówców mogą się różnić od interpretacji AI.';

/** Category display metadata — Polish labels and colors */
export const CATEGORY_META: Record<SubtextCategory, { label: string; color: string; emoji: string }> = {
  deflection:         { label: 'Unikanie tematu',        color: '#f59e0b', emoji: '🔀' },
  hidden_anger:       { label: 'Ukryty gniew',           color: '#ef4444', emoji: '🌋' },
  seeking_validation: { label: 'Szukanie potwierdzenia',  color: '#8b5cf6', emoji: '🙏' },
  power_move:         { label: 'Gra o władzę',           color: '#dc2626', emoji: '♟️' },
  genuine:            { label: 'Szczere',                 color: '#10b981', emoji: '💚' },
  testing:            { label: 'Testowanie',              color: '#f97316', emoji: '🧪' },
  guilt_trip:         { label: 'Wzbudzanie winy',        color: '#be185d', emoji: '😔' },
  passive_aggressive: { label: 'Bierna agresja',          color: '#e11d48', emoji: '🙃' },
  love_signal:        { label: 'Ukryty sygnał miłości',  color: '#ec4899', emoji: '💜' },
  insecurity:         { label: 'Niepewność',              color: '#6366f1', emoji: '🫣' },
  distancing:         { label: 'Dystansowanie się',       color: '#64748b', emoji: '🧊' },
  humor_shield:       { label: 'Humor jako tarcza',       color: '#eab308', emoji: '🤡' },
};

// ============================================================
// Exchange extraction helpers (server-side)
// ============================================================

export interface SimplifiedMsg {
  sender: string;
  content: string;
  timestamp: number;
  index: number;
}

export interface ExchangeWindow {
  windowId: number;
  messages: SimplifiedMsg[];
  targetIndices: number[];
  context: string;
}

/** Passive markers — short messages that often hide deeper meaning */
const PASSIVE_MARKERS = new Set([
  'ok', 'ok.', 'ok...', 'okej', 'okey',
  'spoko', 'spoko.', 'spoko...',
  'dobra', 'dobra.',
  'jak chcesz', 'jak tam chcesz',
  'nie ważne', 'nieważne', 'nvm',
  'nic', 'nic.',
  'mhm', 'mhm.',
  'no', 'no.',
  'yhm', 'ta',
  'jasne', 'jasne.',
  'super', 'super.',
  'fajnie', 'fajnie.',
  'git', 'git.',
  'w porządku', 'w porzo',
  'luz', 'luz.',
  'whatever',
  '...', '..', '.',
  '😊', '🙂', '👍', '😐', '🙃',
]);

/** Detect if a message has high subtext potential */
function subtextScore(msg: SimplifiedMsg, prev: SimplifiedMsg | undefined, next: SimplifiedMsg | undefined): number {
  let score = 0;
  const text = msg.content.trim().toLowerCase();
  const wordCount = msg.content.split(/\s+/).length;

  // Passive markers
  if (PASSIVE_MARKERS.has(text)) score += 5;

  // Very short reply to a long message
  if (prev && prev.sender !== msg.sender) {
    const prevWords = prev.content.split(/\s+/).length;
    if (prevWords > 20 && wordCount <= 3) score += 4;
    if (prevWords > 10 && wordCount === 1) score += 3;
  }

  // Delayed response within a session (>15 min gap but within same session <6h)
  if (prev) {
    const gapMs = msg.timestamp - prev.timestamp;
    const gapMinutes = gapMs / 60_000;
    if (gapMinutes > 120 && gapMinutes < 360 && prev.sender !== msg.sender) score += 3;
    if (gapMinutes > 240 && gapMinutes < 360) score += 2;
  }

  // Message right after a long silence (>24h)
  if (prev) {
    const gapMs = msg.timestamp - prev.timestamp;
    if (gapMs > 24 * 60 * 60 * 1000) score += 4;
  }

  // Ends with "..."
  if (text.endsWith('...') || text.endsWith('..')) score += 2;

  // Contains question marks after statements
  if (text.includes('?') && !text.startsWith('co') && !text.startsWith('jak') && !text.startsWith('kiedy')) score += 1;

  // Standalone emoji (no text)
  if (/^[\p{Emoji_Presentation}\p{Emoji}\uFE0F]+$/u.test(text) && wordCount <= 2) score += 3;

  // Double-texting (same sender as previous)
  if (prev && prev.sender === msg.sender) score += 1;

  // Next message changes topic abruptly (simple heuristic: sender change after a long message)
  if (next && next.sender === msg.sender && wordCount > 15) score += 1;

  return score;
}

/**
 * Extract exchange windows from a conversation for subtext analysis.
 * Each window contains ~30 messages of context around a high-potential interest point.
 * Server-side only — operates on the full message list.
 */
export function extractExchangeWindows(
  messages: SimplifiedMsg[],
  maxWindows: number = 25,
  windowRadius: number = 15,
): ExchangeWindow[] {
  if (messages.length < 30) return [];

  // Score every message for subtext potential
  const scored: Array<{ index: number; score: number }> = [];
  for (let i = 0; i < messages.length; i++) {
    const prev = i > 0 ? messages[i - 1] : undefined;
    const next = i < messages.length - 1 ? messages[i + 1] : undefined;
    const score = subtextScore(messages[i], prev, next);
    if (score >= 3) {
      scored.push({ index: i, score });
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Select top interest points, ensuring windows don't overlap too much
  const selectedCenters: number[] = [];
  const usedRanges: Array<[number, number]> = [];

  for (const { index } of scored) {
    if (selectedCenters.length >= maxWindows) break;

    const start = Math.max(0, index - windowRadius);
    const end = Math.min(messages.length - 1, index + windowRadius);

    // Check overlap with existing windows (allow up to 30% overlap)
    const hasHeavyOverlap = usedRanges.some(([rs, re]) => {
      const overlapStart = Math.max(start, rs);
      const overlapEnd = Math.min(end, re);
      if (overlapEnd <= overlapStart) return false;
      const overlapSize = overlapEnd - overlapStart;
      const windowSize = end - start;
      return overlapSize / windowSize > 0.3;
    });

    if (!hasHeavyOverlap) {
      selectedCenters.push(index);
      usedRanges.push([start, end]);
    }
  }

  // Sort windows chronologically
  selectedCenters.sort((a, b) => a - b);

  // Build windows
  return selectedCenters.map((center, i) => {
    const start = Math.max(0, center - windowRadius);
    const end = Math.min(messages.length - 1, center + windowRadius);
    const windowMessages = messages.slice(start, end + 1);

    // Detect context: what happened around this point?
    const prevGap = center > 0
      ? (messages[center].timestamp - messages[center - 1].timestamp) / (60 * 60 * 1000)
      : 0;
    const hour = new Date(messages[center].timestamp).getHours();
    const timeOfDay = hour < 6 ? 'nocna' : hour < 12 ? 'poranna' : hour < 18 ? 'popołudniowa' : 'wieczorna';

    let context = `sesja ${timeOfDay}`;
    if (prevGap > 24) {
      const days = Math.round(prevGap / 24);
      context = `po ${days}-dniowej ciszy, ${context}`;
    } else if (prevGap > 6) {
      context = `po przerwie ${Math.round(prevGap)}h, ${context}`;
    }

    // Find target indices (high-score messages within this window)
    const targets: number[] = [];
    for (let j = start; j <= end; j++) {
      const prev = j > 0 ? messages[j - 1] : undefined;
      const next = j < messages.length - 1 ? messages[j + 1] : undefined;
      if (subtextScore(messages[j], prev, next) >= 3) {
        targets.push(j - start); // relative index within window
      }
    }

    return {
      windowId: i,
      messages: windowMessages,
      targetIndices: targets.length > 0 ? targets : [center - start],
      context,
    };
  });
}
