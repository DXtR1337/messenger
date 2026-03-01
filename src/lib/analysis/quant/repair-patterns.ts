/**
 * Conversational Repair Patterns.
 *
 * In conversation analysis, "repair" refers to moments when participants correct or
 * clarify misunderstandings. Two types:
 * - Self-repair: speaker corrects/clarifies their own utterance ("tzn.", "to znaczy", "w sensie")
 * - Other-repair initiation: listener signals confusion ("co?", "hę?", "nie rozumiem")
 *
 * High self-repair rate = careful communicator, values precision.
 * High other-repair initiation = partner is unclear or listener expects high clarity.
 * Ratio reveals power dynamics: dominant communicators are seldom asked to clarify.
 *
 * References:
 * - Schegloff, E. A., Jefferson, G., & Sacks, H. (1977). The preference for self-correction
 *   in the organization of repair in conversation. Language, 53(2), 361-382.
 * - Norrick, N. R. (1991). On the organization of corrective exchanges in conversation.
 *   Journal of Pragmatics, 16(1), 59-83.
 */

import type { UnifiedMessage } from '../../parsers/types';

export interface PersonRepairStats {
  selfRepairCount: number;
  otherRepairInitiationCount: number;
  /** Self-repairs per 100 messages */
  selfRepairRate: number;
  /** Other-repair initiations per 100 messages */
  otherRepairRate: number;
  /** selfRepairs / (selfRepairs + otherInitiated + 0.001): higher = more self-correcting */
  repairInitiationRatio: number;
  label: string;  // Polish description
}

export interface RepairPatternsResult {
  perPerson: Record<string, PersonRepairStats>;
  /** Total repair activity 0-100: higher = more clarification happening in this conversation */
  mutualRepairIndex: number;
  /** Who performs most self-repairs */
  dominantSelfRepairer: string;
  interpretation: string;
}

// ============================================================
// Repair marker dictionaries
// ============================================================

const SELF_REPAIR_PL = new Set([
  'tzn', 'tzn.', 'to znaczy', 'w sensie', 'w sumie', 'właściwie', 'właściwie to',
  'miałem na myśli', 'miałam na myśli', 'chodzi mi o', 'chcę powiedzieć',
  'mam na myśli', 'raczej chodzi mi o', 'przepraszam mówiłem', 'przepraszam mówiłam',
  'nie nie', 'nie tak', 'czekaj', 'zaraz', 'poczekaj', 'znaczy',
  'znaczy się', 'no bo', 'bo właśnie', 'hmm nie', 'ej nie',
  'poprawka', 'cofnę się', 'cofam się',
]);

const SELF_REPAIR_EN = new Set([
  'i mean', 'sorry i meant', 'what i meant', 'what i meant was',
  'wait no', 'actually', 'correction', 'let me rephrase', 'by that i mean',
  'to clarify', 'no wait', 'scratch that',
]);

const OTHER_REPAIR_PL = new Set([
  'co?', 'hę?', 'hę', 'co masz na myśli', 'co chcesz powiedzieć',
  'nie rozumiem', 'o czym mówisz', 'nie ogarniam', 'nie za bardzo rozumiem',
  'możesz wytłumaczyć', 'co to znaczy', 'co to jest', 'słucham?',
  'nie kapuję', 'nie łapię', 'serio?', 'co ty piszesz', 'co to ma znaczyć',
  '???', 'hm?', 'hmm?', 'no i?', 'i co z tego', 'bo niby jak', 'jak to',
]);

const OTHER_REPAIR_EN = new Set([
  'what?', 'huh?', "i don't follow", "i don't understand", 'what do you mean',
  'what does that mean', 'can you explain', 'can you clarify', "i'm confused",
  'come again', 'say that again', 'pardon?', 'sorry what', 'run that by me again',
]);

// ============================================================
// Detection helpers
// ============================================================

/**
 * Asterisk repair: the most common text-specific repair mechanism not present in
 * Schegloff et al.'s (1977) original taxonomy (which focused on spoken conversation).
 * In text-based communication, users correct themselves by typing *correction —
 * e.g., "*poprawka", "*meant", "miałem *miałam". Matches both message-initial
 * asterisk corrections and mid-message corrections preceded by whitespace.
 */
const ASTERISK_REPAIR_RE = /(?:^|\s)\*[a-zA-ZąćęłńóśżźĄĆĘŁŃÓŚŻŹ]/;

function messageContainsRepair(content: string, markers: Set<string>): boolean {
  const lower = content.toLowerCase().trim();
  for (const marker of markers) {
    if (lower.startsWith(marker) || lower.includes(' ' + marker) || lower.includes('\n' + marker)) {
      return true;
    }
    // Exact match for short markers like "co?", "hę?"
    if (marker.length <= 4 && (lower === marker || lower.startsWith(marker + ' '))) return true;
  }
  return false;
}

function detectRepairType(content: string): { isSelf: boolean; isOther: boolean } {
  // Asterisk repair counts as self-repair: sender is correcting their own previous utterance
  const hasAsteriskRepair = ASTERISK_REPAIR_RE.test(content);

  const isSelf = hasAsteriskRepair ||
    messageContainsRepair(content, SELF_REPAIR_PL) ||
    messageContainsRepair(content, SELF_REPAIR_EN);
  const isOther = messageContainsRepair(content, OTHER_REPAIR_PL) ||
    messageContainsRepair(content, OTHER_REPAIR_EN);
  return { isSelf, isOther };
}

function buildLabel(selfRate: number, otherRate: number): string {
  if (selfRate >= 8 && otherRate < 3) return 'Komunikuje się precyzyjnie';
  if (selfRate < 2 && otherRate >= 5) return 'Często niejasny/a';
  if (selfRate >= 5) return 'Dba o precyzję wypowiedzi';
  if (otherRate >= 4) return 'Partnerzy często proszą o wyjaśnienia';
  return 'Typowy wzorzec napraw';
}

// ============================================================
// Main export
// ============================================================

export function computeRepairPatterns(
  messages: UnifiedMessage[],
  participantNames: string[],
): RepairPatternsResult | undefined {
  if (participantNames.length < 2) return undefined;
  if (messages.length < 100) return undefined;

  const stats: Record<string, { selfRepairs: number; otherRepairs: number; total: number }> = {};
  for (const name of participantNames) stats[name] = { selfRepairs: 0, otherRepairs: 0, total: 0 };

  for (const msg of messages) {
    if (!msg.content || !stats[msg.sender]) continue;
    const s = stats[msg.sender];
    s.total++;
    const { isSelf, isOther } = detectRepairType(msg.content);
    if (isSelf) s.selfRepairs++;
    if (isOther) s.otherRepairs++;
  }

  // Require at least 5 total repair events to return a result
  const totalRepairs = participantNames.reduce(
    (sum, n) => sum + stats[n].selfRepairs + stats[n].otherRepairs, 0
  );
  if (totalRepairs < 5) return undefined;

  const perPerson: Record<string, PersonRepairStats> = {};
  for (const name of participantNames) {
    const s = stats[name];
    if (s.total < 10) continue;

    const selfRate = Math.round((s.selfRepairs / s.total) * 1000) / 10;
    const otherRate = Math.round((s.otherRepairs / s.total) * 1000) / 10;
    const repairInitiationRatio = s.selfRepairs / (s.selfRepairs + s.otherRepairs + 0.001);

    perPerson[name] = {
      selfRepairCount: s.selfRepairs,
      otherRepairInitiationCount: s.otherRepairs,
      selfRepairRate: selfRate,
      otherRepairRate: otherRate,
      repairInitiationRatio: Math.round(repairInitiationRatio * 100) / 100,
      label: buildLabel(selfRate, otherRate),
    };
  }

  const validNames = participantNames.filter(n => perPerson[n]);
  if (validNames.length < 2) return undefined;

  // Mutual repair index: how much repair activity vs total messages.
  // ×500: maps 0.2% repair rate (totalRepairs/totalMessages = 0.002) to index 100.
  // Typical chat: 0.01–0.05% repair rate (1–5 repairs per 10,000 messages).
  // Higher values indicate more active clarification behavior in the conversation.
  const totalMessages = validNames.reduce((sum, n) => sum + stats[n].total, 0);
  const mutualRepairIndex = Math.round(Math.min(100, (totalRepairs / totalMessages) * 500));

  const sorted = [...validNames].sort((a, b) =>
    perPerson[b].selfRepairCount - perPerson[a].selfRepairCount
  );
  const dominantSelfRepairer = sorted[0];

  // Interpretation
  const a = validNames[0];
  const b = validNames[1];
  const aRate = perPerson[a].selfRepairRate;
  const bRate = perPerson[b].selfRepairRate;
  let interpretation: string;
  if (Math.abs(aRate - bRate) < 1) {
    interpretation = `Oboje podobnie często wyjaśniają swoje wypowiedzi (${aRate.toFixed(1)} vs ${bRate.toFixed(1)} napraw/100 wiad.).`;
  } else {
    const more = aRate > bRate ? a : b;
    const less = aRate > bRate ? b : a;
    const moreRate = aRate > bRate ? aRate : bRate;
    const lessRate = aRate > bRate ? bRate : aRate;
    interpretation = `${more} naprawia swoje wypowiedzi ${(moreRate / (lessRate + 0.1)).toFixed(1)}× częściej niż ${less} — świadczy o dbałości o klarowność komunikacji.`;
  }

  return { perPerson, mutualRepairIndex, dominantSelfRepairer, interpretation };
}
