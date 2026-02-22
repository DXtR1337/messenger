import type { DiscordInteraction } from '../lib/discord-types';
import { getInteractionUser, getTargetUser } from '../lib/discord-types';
import { immediateResponse, statsEmbed } from '../lib/discord-respond';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';

const DAYS_PL = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

export function handleBestTime(
  interaction: DiscordInteraction,
  data: { conversation: ParsedConversation; quantitative: QuantitativeAnalysis },
): Response {
  const target = getTargetUser(interaction, 'user') ?? getInteractionUser(interaction);
  const bt = data.quantitative.bestTimeToText?.perPerson[target.name];

  if (!bt) {
    return immediateResponse(`Brak danych o najlepszym czasie dla **${target.name}**.`);
  }

  const formatMs = (ms: number) => {
    if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3_600_000) return `${Math.round(ms / 60_000)}min`;
    return `${(ms / 3_600_000).toFixed(1)}h`;
  };

  // Find worst time from heatmap
  const heatmap = data.quantitative.heatmap.perPerson[target.name];
  let worstHour = 0;
  let worstCount = Infinity;
  if (heatmap) {
    for (let h = 0; h < 24; h++) {
      let total = 0;
      for (let d = 0; d < 7; d++) total += heatmap[d]?.[h] ?? 0;
      if (total < worstCount) { worstCount = total; worstHour = h; }
    }
  }

  return immediateResponse(undefined, [
    statsEmbed(`Kiedy pisać do ${target.name}`, [
      { name: 'Najlepszy dzień', value: bt.bestDay, inline: true },
      { name: 'Najlepsza godzina', value: `${bt.bestHour}:00`, inline: true },
      { name: 'Okno', value: bt.bestWindow, inline: true },
      { name: 'Śr. czas odpowiedzi', value: formatMs(bt.avgResponseMs), inline: true },
      { name: 'Unikaj', value: `${worstHour}:00 - ${(worstHour + 2) % 24}:00`, inline: true },
    ]),
  ]);
}
