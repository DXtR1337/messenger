/**
 * Types for public share link payloads.
 *
 * IMPORTANT: This payload is embedded in the URL, so keep it minimal.
 * No raw messages, no personal names — only anonymized aggregated data.
 */

/** Anonymized badge for the share payload (holder replaced with "Osoba A"/"Osoba B"). */
export interface ShareBadge {
  id: string;
  name: string;
  emoji: string;
  /** Optional custom icon filename (in /icons/badges/) */
  icon?: string;
  description: string;
  holder: string;
  evidence: string;
}

/** Viral scores subset for sharing. */
export interface ShareViralScores {
  compatibilityScore: number;
  delusionScore: number;
  interestScores: Record<string, number>;
  ghostRisk: Record<string, { score: number; factors: string[] }>;
}

/** EKS phase summary for share payload (anonymized, minimal). */
export interface ShareEksPhase {
  name: string;
  period: string;
}

/** EKS (relationship autopsy) data subset for sharing. */
export interface ShareEksData {
  /** Epitaph — one-line poetic summary of the relationship. */
  epitaph: string;
  /** Primary cause of death — single sentence. */
  causeOfDeath: string;
  /** Date of death (last message date). */
  deathDate: string;
  /** Relationship duration (e.g. "1 rok i 3 miesiące"). */
  duration: string;
  /** Probability of reunion (0-100). */
  willTheyComeBack: number;
  /** Who left first — anonymized ("Osoba A" or "Osoba B"). */
  whoLeftFirst: string;
  /** Relationship phases — max 5, anonymized. */
  phases: ShareEksPhase[];
}

/** The data payload embedded in the share URL. */
export interface SharePayload {
  /** Schema version for future compatibility. */
  v: 1;
  /** Health score 0-100 (from pass4). */
  healthScore: number | null;
  /** Health score components (from pass4). */
  healthComponents: {
    balance: number;
    reciprocity: number;
    response_pattern: number;
    emotional_safety: number;
    growth_trajectory: number;
  } | null;
  /** Executive summary (from pass4). */
  executiveSummary: string | null;
  /** Viral scores (from quantitative). */
  viralScores: ShareViralScores | null;
  /** Badges array. */
  badges: ShareBadge[];
  /** Compatibility label from pass4 (conversation_personality). */
  conversationPersonality: {
    movie_genre: string;
    weather: string;
    one_word: string;
  } | null;
  /** Number of participants. */
  participantCount: number;
  /** Total message count. */
  messageCount: number;
  /** Date range. */
  dateRange: {
    start: number;
    end: number;
  };
  /** Roast verdict (one-liner, if available). */
  roastVerdict: string | null;
  /** Relationship type (from pass1, if available). */
  relationshipType: string | null;
  /** Key findings (from pass4, if available). */
  keyFindings: Array<{
    finding: string;
    significance: 'positive' | 'neutral' | 'concerning';
  }>;
  /** EKS (relationship autopsy) data — present only for EKS share links. */
  eks?: ShareEksData;
}
