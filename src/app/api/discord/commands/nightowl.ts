import type { DiscordInteraction } from '../lib/discord-types';
import { immediateResponse, rankingEmbed } from '../lib/discord-respond';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';

export function handleNightOwl(
  _interaction: DiscordInteraction,
  data: { conversation: ParsedConversation; quantitative: QuantitativeAnalysis },
): Response {
  const lateNight = data.quantitative.timing.lateNightMessages;

  const ranked = Object.entries(lateNight)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  if (ranked.length === 0) {
    return immediateResponse('Nikt tu nie pisze w nocy. Wszyscy śpią jak normalni ludzie. Nudne.');
  }

  const total = data.conversation.metadata.totalMessages;

  const lines = ranked.map(([name, count], i) => {
    const medal = i === 0 ? '\u{1F989}' : i === 1 ? '\u{1F31A}' : i === 2 ? '\u2B50' : `${i + 1}.`;
    const personTotal = data.quantitative.perPerson[name]?.totalMessages ?? 1;
    const pct = ((count / personTotal) * 100).toFixed(1);
    return `${medal} **${name}** — ${count} wiadomości nocnych (${pct}% ich aktywności)`;
  });

  const topOwl = ranked[0][0];
  lines.push('');
  lines.push(`*${topOwl} najwyraźniej nie wierzy w koncepcję snu.*`);

  return immediateResponse(undefined, [
    rankingEmbed('Nocne Marki (22:00-04:00)', lines.join('\n')),
  ]);
}
