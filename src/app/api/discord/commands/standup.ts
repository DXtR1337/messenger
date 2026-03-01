/**
 * /standup — AI-powered stand-up comedy roast.
 * Writes a 7-act comedy show about the Discord channel.
 */

import type { DiscordInteraction } from '../lib/discord-types';
import type { DiscordEmbed } from '../lib/discord-types';
import { editDeferredResponse, sendFollowUp, warningEmbed } from '../lib/discord-respond';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';
import { DISCORD_STANDUP_SYSTEM, buildStandupPrompt } from '../prompts/entertainment-prompts';
import { callGeminiForDiscord, parseGeminiJSONSafe } from '../lib/discord-ai';
import { findDramaMessages } from '../lib/search-sampler';
import type { DramaSearchResult } from '../lib/search-sampler';

interface StandupAct {
  title: string;
  emoji: string;
  lines: string[];
}

interface StandupResponse {
  showTitle: string;
  audienceRating: number;
  opening: string;
  acts: StandupAct[];
  closing: string;
}

const COLOR_ORANGE = 0xf97316;
const COLOR_RED = 0xef4444;
const COLOR_PURPLE = 0xa855f7;
const FOOTER = { text: 'PodTeksT Stand-Up \u2022 podtekst.app' };

function trimToEmbed(text: string, max = 4000): string {
  return text.length > max ? text.slice(0, max - 3) + '...' : text;
}

export async function handleStandup(
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

  const prompt = buildStandupPrompt(channelName, data.conversation.messages, data.quantitative, participants, messageLimit, dramaMessages);

  try {
    const raw = await callGeminiForDiscord(DISCORD_STANDUP_SYSTEM, prompt, {
      maxOutputTokens: 6144,
      temperature: 0.9,
    });
    const result = parseGeminiJSONSafe<StandupResponse>(raw);

    if (!result || !result.acts || result.acts.length === 0) {
      await editDeferredResponse(interaction.token, undefined, [warningEmbed('Stand-Up Failed', 'AI nie napisało występu. Spróbuj ponownie.')]);
      return;
    }

    const embeds: DiscordEmbed[] = [];

    // Embed 1: Show title + opening
    const openLines = [
      `\u{1F3A4} *Ocena publiczności: ${result.audienceRating}/100*`,
      '',
      result.opening,
    ];

    embeds.push({
      title: `\u{1F3AD} ${result.showTitle}`,
      description: trimToEmbed(openLines.join('\n')),
      color: COLOR_ORANGE,
      footer: FOOTER,
    });

    // Embed 2-8: One per act
    const actColors = [COLOR_RED, COLOR_PURPLE, COLOR_RED, COLOR_PURPLE, COLOR_RED, COLOR_PURPLE, COLOR_RED];
    for (let i = 0; i < Math.min(result.acts.length, 7); i++) {
      const act = result.acts[i];
      embeds.push({
        title: `${act.emoji} Akt ${i + 1}: ${act.title}`,
        description: trimToEmbed(act.lines.join('\n')),
        color: actColors[i % actColors.length],
      });
    }

    // Embed last: Closing
    if (result.closing) {
      embeds.push({
        title: '\u{1F3AC} Zakończenie',
        description: trimToEmbed(result.closing),
        color: COLOR_ORANGE,
        footer: FOOTER,
      });
    }

    const firstBatch = embeds.slice(0, 10);
    const overflow = embeds.slice(10);

    await editDeferredResponse(interaction.token, undefined, firstBatch);

    if (overflow.length > 0) {
      await sendFollowUp(interaction.token, undefined, overflow);
    }
  } catch (err) {
    await editDeferredResponse(interaction.token, undefined, [warningEmbed('Stand-Up Error', `AI się zepsuło: ${err instanceof Error ? err.message : 'nieznany błąd'}`)]);
  }
}
