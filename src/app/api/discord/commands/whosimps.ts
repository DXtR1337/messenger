import type { DiscordInteraction } from '../lib/discord-types';
import { immediateResponse, rankingEmbed } from '../lib/discord-respond';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';

export function handleWhoSimps(
  _interaction: DiscordInteraction,
  data: { conversation: ParsedConversation; quantitative: QuantitativeAnalysis },
): Response {
  const { doubleTexts, maxConsecutive } = data.quantitative.engagement;

  const ranked = Object.entries(doubleTexts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  if (ranked.length === 0) {
    return immediateResponse('Nikt tu nie double-textuje. Podejrzane...');
  }

  const labels = ['DESPERACJA KRYTYCZNA', 'bez nadziei', 'poważny przypadek', 'jeszcze jest nadzieja', 'lekkie objawy', 'zdrowy', 'normalny', 'spoko', 'ok', 'bezpieczny'];

  const lines = ranked.map(([name, count], i) => {
    const medal = i === 0 ? '\u{1F947}' : i === 1 ? '\u{1F948}' : i === 2 ? '\u{1F949}' : `${i + 1}.`;
    const max = maxConsecutive[name] ?? 0;
    const label = labels[Math.min(i, labels.length - 1)];
    return `${medal} **${name}** — ${count} double-textów, max ${max} z rzędu *(${label})*`;
  });

  return immediateResponse(undefined, [
    rankingEmbed('Ranking Entuzjastów', lines.join('\n')),
  ]);
}
