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

  // Need minimum message volume for balance metrics to be meaningful.
  // With <30 messages, ratios are highly sensitive to individual messages.
  const totalMessages = Object.values(perPerson).reduce((sum, p) => sum + (p?.totalMessages ?? 0), 0);
  if (totalMessages < 30) return defaultResult;

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
    responseTimeSymmetry = 50; // no data — neutral
  } else {
    responseTimeSymmetry = 10; // extreme asymmetry: one person responds, the other doesn't
  }

  // 4. Reaction/Engagement Balance: do they react to each other equally?
  const reactA = perPerson[a]?.reactionsGiven ?? 0;
  const reactB = perPerson[b]?.reactionsGiven ?? 0;
  const totalReacts = reactA + reactB;
  let reactionBalance: number;
  if (totalReacts > 0) {
    reactionBalance = Math.round(100 * (1 - 2 * Math.abs(reactA / totalReacts - 0.5)));
  } else {
    // Discord fallback: use mentionsReceived + repliesReceived as engagement proxy
    const engA = (perPerson[a]?.mentionsReceived ?? 0) + (perPerson[a]?.repliesReceived ?? 0);
    const engB = (perPerson[b]?.mentionsReceived ?? 0) + (perPerson[b]?.repliesReceived ?? 0);
    const totalEng = engA + engB;
    reactionBalance = totalEng > 0
      ? Math.round(100 * (1 - 2 * Math.abs(engA / totalEng - 0.5)))
      : 50;
  }

  // Overall: weighted average — RT symmetry weighted lower (min/max ratio is disproportionately harsh)
  const overall = Math.round(
    messageBalance * 0.30 +
    initiationBalance * 0.25 +
    responseTimeSymmetry * 0.15 +
    reactionBalance * 0.30,
  );

  return {
    overall,
    messageBalance,
    initiationBalance,
    responseTimeSymmetry,
    reactionBalance,
  };
}
