/**
 * Common user detection — finds the name that appears across the most conversations.
 *
 * Algorithm:
 * 1. Collect all participant names from selected analyses
 * 2. Count how many conversations each name appears in
 * 3. Name in most conversations = "self"
 * 4. Tie → prefer name appearing in ALL conversations
 * 5. If no name in >1 conversation → return null (fallback to 2-conv mode)
 */

import type { StoredAnalysis } from '../analysis/types';
import type { CommonUserResult } from './types';

/**
 * Detect the common user across multiple analyses.
 * Excludes group conversations (3+ participants).
 */
export function detectCommonUser(
  analyses: StoredAnalysis[],
): CommonUserResult | null {
  if (analyses.length < 2) return null;

  // Count how many conversations each name appears in
  const nameCount = new Map<string, number>();

  for (const analysis of analyses) {
    const names = analysis.conversation.participants.map((p) => p.name);
    // Use a Set to avoid counting duplicates within the same conversation
    const unique = new Set(names);
    for (const name of unique) {
      nameCount.set(name, (nameCount.get(name) ?? 0) + 1);
    }
  }

  // Find the name(s) with the highest count
  let maxCount = 0;
  const candidates: string[] = [];

  for (const [name, count] of nameCount) {
    if (count > maxCount) {
      maxCount = count;
      candidates.length = 0;
      candidates.push(name);
    } else if (count === maxCount) {
      candidates.push(name);
    }
  }

  // Must appear in at least 2 conversations
  if (maxCount < 2) return null;

  // Tie-break: prefer the name appearing in ALL conversations
  const total = analyses.length;
  const inAll = candidates.filter((n) => nameCount.get(n) === total);
  const winner = inAll.length > 0 ? inAll[0] : candidates[0];

  return {
    name: winner,
    count: maxCount,
    total,
    confidence: maxCount / total,
  };
}

/**
 * Get the "partner" name in a 1:1 conversation given the self name.
 * Returns the first participant that isn't self.
 */
export function getPartnerName(
  analysis: StoredAnalysis,
  selfName: string,
): string {
  const others = analysis.conversation.participants
    .map((p) => p.name)
    .filter((n) => n !== selfName);
  return others[0] ?? selfName;
}

/**
 * Filter analyses to only 1:1 conversations (not group chats).
 */
export function filterOneOnOne(analyses: StoredAnalysis[]): StoredAnalysis[] {
  return analyses.filter(
    (a) => !a.conversation.metadata.isGroup && a.conversation.participants.length === 2,
  );
}
