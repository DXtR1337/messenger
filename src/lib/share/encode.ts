/**
 * Encodes a StoredAnalysis into a URL-safe compressed string for sharing.
 *
 * Privacy: strips all raw messages, replaces real names with
 * "Osoba A" / "Osoba B" / "Osoba C" etc., keeps only aggregated metrics.
 */

import { compressToEncodedURIComponent } from 'lz-string';
import type { StoredAnalysis } from '../analysis/types';
import type { SharePayload, ShareBadge, ShareViralScores } from './types';

/** Map of real participant names to anonymized labels. */
function buildNameMap(participants: Array<{ name: string }>): Map<string, string> {
  const map = new Map<string, string>();
  const labels = ['Osoba A', 'Osoba B', 'Osoba C', 'Osoba D', 'Osoba E', 'Osoba F'];
  participants.forEach((p, i) => {
    map.set(p.name, labels[i] ?? `Osoba ${String.fromCharCode(65 + i)}`);
  });
  return map;
}

/** Replace all occurrences of real names in a string with anonymized versions. */
function anonymizeString(text: string, nameMap: Map<string, string>): string {
  let result = text;
  for (const [realName, anonName] of nameMap) {
    // Use a global replace — names can appear multiple times
    result = result.split(realName).join(anonName);
  }
  return result;
}

/** Anonymize a Record keyed by participant names. */
function anonymizeRecord<T>(
  record: Record<string, T>,
  nameMap: Map<string, string>,
): Record<string, T> {
  const result: Record<string, T> = {};
  for (const [key, value] of Object.entries(record)) {
    const anonKey = nameMap.get(key) ?? key;
    result[anonKey] = value;
  }
  return result;
}

export function encodeShareData(analysis: StoredAnalysis): string {
  const { conversation, quantitative, qualitative } = analysis;
  const nameMap = buildNameMap(conversation.participants);

  // Anonymize badges
  const badges: ShareBadge[] = (quantitative.badges ?? []).map((badge) => ({
    id: badge.id,
    name: badge.name,
    emoji: badge.emoji,
    description: badge.description,
    holder: nameMap.get(badge.holder) ?? badge.holder,
    evidence: anonymizeString(badge.evidence, nameMap),
  }));

  // Anonymize viral scores
  let viralScores: ShareViralScores | null = null;
  if (quantitative.viralScores) {
    const vs = quantitative.viralScores;
    viralScores = {
      compatibilityScore: vs.compatibilityScore ?? 0,
      delusionScore: vs.delusionScore ?? 0,
      interestScores: vs.interestScores ? anonymizeRecord(vs.interestScores, nameMap) : {},
      ghostRisk: vs.ghostRisk
        ? anonymizeRecord(
            Object.fromEntries(
              Object.entries(vs.ghostRisk).map(([name, data]) => [
                name,
                {
                  score: data?.score ?? 0,
                  factors: Array.isArray(data?.factors)
                    ? data.factors.map((f) => anonymizeString(f, nameMap))
                    : [],
                },
              ]),
            ),
            nameMap,
          )
        : {},
    };
  }

  // Key findings — anonymized
  const keyFindings = (qualitative?.pass4?.key_findings ?? []).map((kf) => ({
    finding: anonymizeString(kf.finding, nameMap),
    significance: kf.significance,
  }));

  // Executive summary — anonymized
  const executiveSummary = qualitative?.pass4?.executive_summary
    ? anonymizeString(qualitative.pass4.executive_summary, nameMap)
    : null;

  const payload: SharePayload = {
    v: 1,
    healthScore: qualitative?.pass4?.health_score?.overall ?? null,
    healthComponents: qualitative?.pass4?.health_score?.components ?? null,
    executiveSummary,
    viralScores,
    badges,
    conversationPersonality: qualitative?.pass4?.conversation_personality?.if_this_conversation_were_a ?? null,
    participantCount: conversation.participants.length,
    messageCount: conversation.metadata.totalMessages,
    dateRange: {
      start: conversation.metadata.dateRange.start,
      end: conversation.metadata.dateRange.end,
    },
    roastVerdict: qualitative?.roast?.verdict
      ? anonymizeString(qualitative.roast.verdict, nameMap)
      : null,
    relationshipType: qualitative?.pass1?.relationship_type?.category ?? null,
    keyFindings,
  };

  const json = JSON.stringify(payload);
  return compressToEncodedURIComponent(json);
}

/** Build a full share URL from analysis data. */
export function buildShareUrl(analysis: StoredAnalysis): string {
  const encoded = encodeShareData(analysis);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://podtekst.app';
  return `${origin}/share/${encoded}`;
}
