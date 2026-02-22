import type { DiscordInteraction } from '../lib/discord-types';
import { getInteractionUser, getTargetUser } from '../lib/discord-types';
import { immediateResponse, alertEmbed, statsEmbed } from '../lib/discord-respond';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';

export function handleGhostCheck(
  interaction: DiscordInteraction,
  data: { conversation: ParsedConversation; quantitative: QuantitativeAnalysis },
): Response {
  const target = getTargetUser(interaction, 'user') ?? getInteractionUser(interaction);
  const ghostData = data.quantitative.viralScores?.ghostRisk?.[target.name];

  if (!ghostData) {
    return immediateResponse(`Brak danych o ghostingu dla **${target.name}**.`);
  }

  const score = ghostData.score;
  let level: string;
  let emoji: string;

  if (score >= 80) { level = 'KRYTYCZNY'; emoji = '\u{1F480}'; }
  else if (score >= 60) { level = 'ALARM'; emoji = '\u{1F6A8}'; }
  else if (score >= 40) { level = 'PODEJRZANY'; emoji = '\u{1F440}'; }
  else if (score >= 20) { level = 'LEKKI'; emoji = '\u{1F914}'; }
  else { level = 'BEZPIECZNY'; emoji = '\u2705'; }

  const factors = ghostData.factors.length > 0
    ? ghostData.factors.map((f) => `\u2022 ${f}`).join('\n')
    : 'Brak wyraźnych sygnałów.';

  const description = [
    `${emoji} **Ghost Risk: ${score}/100** — ${level}`,
    '',
    factors,
    '',
    score >= 60
      ? `*Diagnoza: ${target.name} jest jedną nogą za drzwiami.*`
      : score >= 30
        ? `*Diagnoza: ${target.name} jeszcze jest, ale nie jest dobrze.*`
        : `*Diagnoza: ${target.name} nie planuje znikać. Na razie.*`,
  ].join('\n');

  const embed = score >= 60
    ? alertEmbed(`Ghost Check: ${target.name}`, description)
    : statsEmbed(`Ghost Check: ${target.name}`, [{ name: '\u200B', value: description }]);

  return immediateResponse(undefined, [embed]);
}
