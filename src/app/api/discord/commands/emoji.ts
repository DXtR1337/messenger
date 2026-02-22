import type { DiscordInteraction } from '../lib/discord-types';
import { getInteractionUser, getTargetUser } from '../lib/discord-types';
import { immediateResponse, statsEmbed } from '../lib/discord-respond';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';

export function handleEmoji(
  interaction: DiscordInteraction,
  data: { conversation: ParsedConversation; quantitative: QuantitativeAnalysis },
): Response {
  const target = getTargetUser(interaction, 'user') ?? getInteractionUser(interaction);
  const metrics = data.quantitative.perPerson[target.name];

  if (!metrics) {
    return immediateResponse(`Nie znaleziono wiadomości od **${target.name}**.`);
  }

  const total = metrics.totalMessages;
  const emojiRate = total > 0 ? ((metrics.messagesWithEmoji / total) * 100).toFixed(1) : '0';

  const top = metrics.topEmojis.slice(0, 10);
  if (top.length === 0) {
    return immediateResponse(`**${target.name}** nie używa emoji. Psychopata? Stoik? Kto wie.`);
  }

  const emojiLines = top.map((e, i) => `${i + 1}. ${e.emoji} \u00D7${e.count}`).join('\n');

  let roastLine = '';
  if (metrics.emojiCount > 500) {
    roastLine = '*Komunikacja? Nie, to hieroglify.*';
  } else if (metrics.emojiCount > 100) {
    roastLine = '*Emoji są używane jako przyprawy, nie danie główne.*';
  } else if (metrics.emojiCount < 10) {
    roastLine = '*Emoji wegetarian. Suche jak pustynia.*';
  }

  return immediateResponse(undefined, [
    statsEmbed(`Emoji: ${target.name}`, [
      { name: 'Łącznie emoji', value: String(metrics.emojiCount), inline: true },
      { name: 'Wiadomości z emoji', value: `${emojiRate}%`, inline: true },
      { name: 'Unikalne emoji', value: String(top.length), inline: true },
      { name: 'Top emoji', value: emojiLines },
      ...(roastLine ? [{ name: '\u200B', value: roastLine }] : []),
    ]),
  ]);
}
