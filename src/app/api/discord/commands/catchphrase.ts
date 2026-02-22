import type { DiscordInteraction } from '../lib/discord-types';
import { getInteractionUser, getTargetUser } from '../lib/discord-types';
import { immediateResponse, statsEmbed } from '../lib/discord-respond';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';

export function handleCatchphrase(
  interaction: DiscordInteraction,
  data: { conversation: ParsedConversation; quantitative: QuantitativeAnalysis },
): Response {
  const target = getTargetUser(interaction, 'user') ?? getInteractionUser(interaction);
  const phrases = data.quantitative.catchphrases?.perPerson[target.name];
  const topWords = data.quantitative.perPerson[target.name]?.topWords;

  if ((!phrases || phrases.length === 0) && (!topWords || topWords.length === 0)) {
    return immediateResponse(`**${target.name}** nie ma jeszcze catchphrases. Za mało danych.`);
  }

  const lines: string[] = [];

  if (phrases && phrases.length > 0) {
    lines.push('**Frazy:**');
    phrases.slice(0, 5).forEach((p, i) => {
      const bar = '\u2588'.repeat(Math.min(Math.round(p.uniqueness * 10), 10));
      lines.push(`${i + 1}. "${p.phrase}" \u00D7${p.count} ${bar}`);
    });
  }

  if (topWords && topWords.length > 0) {
    lines.push('');
    lines.push('**Top słowa:**');
    lines.push(topWords.slice(0, 10).map((w) => `\`${w.word}\` (${w.count})`).join(', '));
  }

  return immediateResponse(undefined, [
    statsEmbed(`Catchphrases: ${target.name}`, [
      { name: '\u200B', value: lines.join('\n') },
    ]),
  ]);
}
