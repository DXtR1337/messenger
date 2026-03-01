/**
 * /subtext — AI-powered subtext decoder.
 * Decodes hidden meanings in Discord messages.
 */

import type { DiscordInteraction } from '../lib/discord-types';
import type { DiscordEmbed } from '../lib/discord-types';
import { editDeferredResponse, sendFollowUp, warningEmbed } from '../lib/discord-respond';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';
import { DISCORD_SUBTEXT_SYSTEM, buildSubtextPrompt } from '../prompts/entertainment-prompts';
import { callGeminiForDiscord, parseGeminiJSONSafe } from '../lib/discord-ai';
import { findDramaMessages } from '../lib/search-sampler';
import type { DramaSearchResult } from '../lib/search-sampler';

interface SubtextItem {
  sender: string;
  original: string;
  decoded: string;
  category: string;
  confidence: number;
}

interface SubtextResponse {
  summary: {
    mostDeceptive: string;
    deceptionScore: number;
    topCategories: string[];
  };
  items: SubtextItem[];
  biggestReveal: {
    sender: string;
    original: string;
    decoded: string;
    explanation: string;
  };
}

const COLOR_RED = 0xef4444;
const COLOR_PURPLE = 0xa855f7;
const COLOR_ORANGE = 0xf97316;
const FOOTER = { text: 'PodTeksT Subtext \u2022 podtekst.app' };

function trimToEmbed(text: string, max = 4000): string {
  return text.length > max ? text.slice(0, max - 3) + '...' : text;
}

export async function handleSubtext(
  interaction: DiscordInteraction,
  data: { conversation: ParsedConversation; quantitative: QuantitativeAnalysis },
): Promise<void> {
  const limitOption = interaction.data?.options?.find((o) => o.name === 'messages');
  const messageLimit = limitOption?.value ? parseInt(String(limitOption.value), 10) : 500;

  const participants = data.conversation.participants.map((p) => p.name);

  if (participants.length === 0) {
    await editDeferredResponse(interaction.token, 'Brak uczestników na kanale.');
    return;
  }

  const hasContent = data.conversation.messages.some((m) => m.content.trim().length > 0);
  if (!hasContent) {
    await editDeferredResponse(interaction.token, undefined, [warningEmbed(
      'Brak treści wiadomości',
      'Bot nie ma dostępu do treści wiadomości. Włącz **Message Content Intent** w Discord Developer Portal.',
    )]);
    return;
  }

  const channelName = data.conversation.title ?? 'Discord';

  let dramaMessages: DramaSearchResult['dramaMessages'] = [];
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (botToken && interaction.channel_id) {
      const drama = await findDramaMessages(interaction.channel_id, botToken);
      dramaMessages = drama.dramaMessages;
    }
  } catch { /* graceful fallback */ }

  const prompt = buildSubtextPrompt(channelName, data.conversation.messages, data.quantitative, participants, messageLimit, dramaMessages);

  try {
    const raw = await callGeminiForDiscord(DISCORD_SUBTEXT_SYSTEM, prompt, {
      maxOutputTokens: 4096,
      temperature: 0.5,
    });
    const result = parseGeminiJSONSafe<SubtextResponse>(raw);

    if (!result || !result.items || result.items.length === 0) {
      await editDeferredResponse(interaction.token, undefined, [warningEmbed('Subtext Failed', 'AI nie zdekodowało podtekstów. Spróbuj ponownie.')]);
      return;
    }

    const embeds: DiscordEmbed[] = [];

    // Embed 1: Summary
    const summaryLines = [
      `\u{1F50D} **Najbardziej podstępna osoba:** ${result.summary.mostDeceptive}`,
      `\u{1F3AF} **Skala oszukańczości:** ${result.summary.deceptionScore}/100`,
      '',
      `**Top kategorie:** ${result.summary.topCategories.join(', ')}`,
    ];

    embeds.push({
      title: '\u{1F50D} Dekoder Podtekstów',
      description: trimToEmbed(summaryLines.join('\n')),
      color: COLOR_RED,
      footer: FOOTER,
    });

    // Embed 2: Biggest Reveal
    if (result.biggestReveal) {
      const revealLines = [
        `**${result.biggestReveal.sender}** napisał/a:`,
        `> ${result.biggestReveal.original}`,
        '',
        `\u{1F4A1} **Co naprawdę miał/a na myśli:**`,
        `> ${result.biggestReveal.decoded}`,
        '',
        `*${result.biggestReveal.explanation}*`,
      ];

      embeds.push({
        title: '\u{1F4A3} Największe Odkrycie',
        description: trimToEmbed(revealLines.join('\n')),
        color: COLOR_PURPLE,
      });
    }

    // Embed 3-5: Decoded items grouped
    const itemChunks: SubtextItem[][] = [];
    for (let i = 0; i < result.items.length; i += 3) {
      itemChunks.push(result.items.slice(i, i + 3));
    }

    for (let c = 0; c < Math.min(itemChunks.length, 3); c++) {
      const chunk = itemChunks[c];
      const chunkLines = chunk.map((item) => [
        `**${item.sender}** [${item.category}] (${item.confidence}%)`,
        `> ${item.original}`,
        `\u{1F4AC} *${item.decoded}*`,
      ].join('\n')).join('\n\n');

      embeds.push({
        title: c === 0 ? '\u{1F4AC} Zdekodowane Wiadomości' : `\u{1F4AC} Zdekodowane (${c + 1})`,
        description: trimToEmbed(chunkLines),
        color: COLOR_ORANGE,
        footer: c === itemChunks.length - 1 || c === 2 ? FOOTER : undefined,
      });
    }

    const firstBatch = embeds.slice(0, 10);
    const overflow = embeds.slice(10);

    await editDeferredResponse(interaction.token, undefined, firstBatch);

    if (overflow.length > 0) {
      await sendFollowUp(interaction.token, undefined, overflow);
    }
  } catch (err) {
    await editDeferredResponse(interaction.token, undefined, [warningEmbed('Subtext Error', `AI się zepsuło: ${err instanceof Error ? err.message : 'nieznany błąd'}`)]);
  }
}
