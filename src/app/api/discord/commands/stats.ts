import type { DiscordInteraction } from '../lib/discord-types';
import { getInteractionUser, getTargetUser } from '../lib/discord-types';
import { immediateResponse, statsEmbed } from '../lib/discord-respond';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';

function formatMs(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}min`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

export function handleStats(
  interaction: DiscordInteraction,
  data: { conversation: ParsedConversation; quantitative: QuantitativeAnalysis },
): Response {
  const target = getTargetUser(interaction, 'user') ?? getInteractionUser(interaction);
  const metrics = data.quantitative.perPerson[target.name];

  if (!metrics) {
    return immediateResponse(`Nie znaleziono wiadomości od **${target.name}** na tym kanale.`);
  }

  const total = data.conversation.metadata.totalMessages;
  const pct = ((metrics.totalMessages / total) * 100).toFixed(1);
  const timing = data.quantitative.timing.perPerson[target.name];
  const engagement = data.quantitative.engagement;

  return immediateResponse(undefined, [
    statsEmbed(`Statystyki: ${target.name}`, [
      { name: 'Wiadomości', value: `${metrics.totalMessages.toLocaleString()} (${pct}% kanału)`, inline: true },
      { name: 'Słowa', value: metrics.totalWords.toLocaleString(), inline: true },
      { name: 'Śr. długość', value: `${metrics.averageMessageLength.toFixed(1)} słów`, inline: true },
      { name: 'Emoji', value: `${metrics.emojiCount.toLocaleString()} (${metrics.topEmojis.slice(0, 5).map((e) => e.emoji).join(' ')})`, inline: true },
      { name: 'Pytania', value: String(metrics.questionsAsked), inline: true },
      { name: 'Media', value: String(metrics.mediaShared), inline: true },
      { name: 'Czas odpowiedzi', value: timing ? formatMs(timing.medianResponseTimeMs) : 'n/a', inline: true },
      { name: 'Double texty', value: String(engagement.doubleTexts[target.name] ?? 0), inline: true },
      { name: 'Max z rzędu', value: String(engagement.maxConsecutive[target.name] ?? 0), inline: true },
    ]),
  ]);
}
