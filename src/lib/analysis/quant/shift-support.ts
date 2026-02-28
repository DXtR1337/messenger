/**
 * Shift-Response vs Support-Response Ratio (Conversational Narcissism Index).
 *
 * Operationalizes Derber's (1979) distinction:
 * - Support-response: continues/deepens the previous speaker's topic
 * - Shift-response: redirects conversational attention to self
 *
 * Heuristic approach — lexical features approximate discourse-level analysis.
 * Validated signal: shift responses begin with self-referential tokens, lack
 * question marks, and have low word overlap with the preceding message.
 *
 * References:
 * - Derber, C. (1979). The Pursuit of Attention: Power and Ego in Everyday Life.
 * - Vangelisti, A. L., Knapp, M. L., & Daly, J. A. (1990). Conversational narcissism.
 *   Communication Monographs, 57(4), 251-274. Six studies confirming the construct.
 */

import type { UnifiedMessage } from '../../parsers/types';

export interface PersonShiftSupport {
  shiftCount: number;
  supportCount: number;
  /** shift / (shift + support) */
  shiftRatio: number;
  /** Conversational Narcissism Index 0-100 */
  cni: number;
}

export interface ShiftSupportResult {
  perPerson: Record<string, PersonShiftSupport>;
  higherCNI: string;
  cniGap: number;
}

// Tokens that signal self-redirecting start of a message
const SELF_START = new Set([
  'ja', 'mi', 'mnie', 'mój', 'moja', 'moje', 'mam', 'miałem', 'miałam',
  'u', 'też', 'tez', 'zresztą', 'właściwie', 'swoją drogą', 'btw', 'nawiasem',
  'me', 'my', 'mine', 'also', 'anyway', 'btw',
]);

// Tokens that signal engagement with partner's topic
const QUESTION_STARTS = new Set([
  'co', 'jak', 'kiedy', 'gdzie', 'dlaczego', 'czemu', 'czy', 'kto',
  'który', 'która', 'które', 'ile', 'skąd', 'po', 'na co',
  'what', 'how', 'when', 'where', 'why', 'who', 'which',
  'did', 'do', 'does', 'is', 'are', 'was', 'were', 'will', 'have',
  'can', 'could', 'would', 'should',
]);

function getFirstToken(text: string): string {
  return text.toLowerCase().trim().split(/[\s.,!?;:]+/)[0] ?? '';
}

/** Fraction of shared content words between two strings */
function wordOverlapCount(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const wordsB = b.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  return wordsB.filter(w => wordsA.has(w)).length;
}

function classifyResponse(prevContent: string, currContent: string): 'shift' | 'support' | 'ambiguous' {
  const firstToken = getFirstToken(currContent);
  const hasQuestion = currContent.includes('?');
  const overlap = wordOverlapCount(prevContent, currContent);

  // Support signals take precedence
  if (hasQuestion) return 'support';
  if (QUESTION_STARTS.has(firstToken)) return 'support';
  if (overlap >= 2) return 'support';

  // Shift signals
  if (SELF_START.has(firstToken) && overlap === 0) return 'shift';

  return 'ambiguous';
}

export function computeShiftSupportRatio(
  messages: UnifiedMessage[],
  participantNames: string[],
): ShiftSupportResult | undefined {
  if (participantNames.length < 2) return undefined;

  const counts: Record<string, { shift: number; support: number; total: number }> = {};
  for (const name of participantNames) counts[name] = { shift: 0, support: 0, total: 0 };

  for (let i = 1; i < messages.length; i++) {
    const prev = messages[i - 1];
    const curr = messages[i];
    if (prev.sender === curr.sender) continue;
    if (!prev.content || !curr.content) continue;
    if (curr.timestamp - prev.timestamp > 6 * 60 * 60 * 1000) continue;
    if (!counts[curr.sender]) continue;

    const c = counts[curr.sender];
    c.total++;
    const cls = classifyResponse(prev.content, curr.content);
    if (cls === 'shift') c.shift++;
    else if (cls === 'support') c.support++;
  }

  const perPerson: Record<string, PersonShiftSupport> = {};
  for (const name of participantNames) {
    const c = counts[name];
    if (c.total < 10) continue;
    const classified = c.shift + c.support;
    const shiftRatio = classified > 0 ? c.shift / classified : 0.5;
    perPerson[name] = {
      shiftCount: c.shift,
      supportCount: c.support,
      shiftRatio: Math.round(shiftRatio * 100) / 100,
      cni: Math.round(shiftRatio * 100),
    };
  }

  if (Object.keys(perPerson).length < 2) return undefined;

  const sorted = participantNames
    .filter(n => perPerson[n])
    .sort((a, b) => perPerson[b].cni - perPerson[a].cni);

  return {
    perPerson,
    higherCNI: sorted[0],
    cniGap: sorted.length >= 2 ? perPerson[sorted[0]].cni - perPerson[sorted[1]].cni : 0,
  };
}
