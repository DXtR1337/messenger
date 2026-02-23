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
}
