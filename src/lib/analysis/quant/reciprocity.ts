/**
 * Reciprocity and balance metrics for quantitative analysis.
 *
 * Computes the ReciprocityIndex — a composite metric measuring
 * how balanced a conversation is between participants across
 * multiple dimensions: message volume, initiations, response times,
 * and reactions.
 */

import type {
  EngagementMetrics,
  TimingMetrics,
  PersonMetrics,
  ReciprocityIndex,
} from '../../parsers/types';

/**
 * Compute reciprocity index — a composite metric measuring balance
 * between participants. 0 = one-sided, 50 = perfectly balanced.
 * Only meaningful for 2-person conversations.
 *
 * Sub-scores:
 * - messageBalance: how close to 50/50 is the message split
 * - initiationBalance: who starts conversations
 * - responseTimeSymmetry: are response times similar
 * - reactionBalance: do they react to each other equally
 */
export function computeReciprocityIndex(
  engagement: EngagementMetrics,
  timing: TimingMetrics,
  perPerson: Record<string, PersonMetrics>,
  participantNames: string[],
): ReciprocityIndex {
  // Default: balanced
  const defaultResult: ReciprocityIndex = {
    overall: 50,
    messageBalance: 50,
    initiationBalance: 50,
    responseTimeSymmetry: 50,
    reactionBalance: 50,
  };

  if (participantNames.length < 2) return defaultResult;

  // Use first two participants for 1:1 analysis
  const [a, b] = participantNames;

  // 1. Message Balance: how close to 50/50 is the message split?
  const ratioA = engagement.messageRatio[a] ?? 0.5;
  // Score: 50 when ratioA = 0.5, 0 when ratioA = 0 or 1
  const messageBalance = Math.round(100 * (1 - 2 * Math.abs(ratioA - 0.5)));

  // 2. Initiation Balance: who starts conversations?
  const initA = timing.conversationInitiations[a] ?? 0;
  const initB = timing.conversationInitiations[b] ?? 0;
  const totalInits = initA + initB;
  const initiationBalance = totalInits > 0
    ? Math.round(100 * (1 - 2 * Math.abs(initA / totalInits - 0.5)))
    : 50;

  // 3. Response Time Symmetry: are response times similar?
  const rtA = timing.perPerson[a]?.medianResponseTimeMs ?? 0;
  const rtB = timing.perPerson[b]?.medianResponseTimeMs ?? 0;
  let responseTimeSymmetry = 50;
  if (rtA > 0 && rtB > 0) {
    const ratio = Math.min(rtA, rtB) / Math.max(rtA, rtB); // 0-1, 1 = same
    responseTimeSymmetry = Math.round(ratio * 100);
  } else if (rtA === 0 && rtB === 0) {
    responseTimeSymmetry = 50; // no data
  }

  // 4. Reaction Balance: do they react to each other equally?
  const reactA = perPerson[a]?.reactionsGiven ?? 0;
  const reactB = perPerson[b]?.reactionsGiven ?? 0;
  const totalReacts = reactA + reactB;
  const reactionBalance = totalReacts > 0
    ? Math.round(100 * (1 - 2 * Math.abs(reactA / totalReacts - 0.5)))
    : 50;

  // Overall: equal weight average of all 4 sub-scores
  const overall = Math.round(
    (messageBalance + initiationBalance + responseTimeSymmetry + reactionBalance) / 4,
  );

  return {
    overall,
    messageBalance,
    initiationBalance,
    responseTimeSymmetry,
    reactionBalance,
  };
}
