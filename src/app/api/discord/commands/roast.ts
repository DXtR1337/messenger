/**
 * /roast — AI-powered roast of the ENTIRE channel.
 * Roasts every active participant, their relationships, and the channel dynamics.
 * Uses deferred response pattern + multi-embed output.
 */

import type { DiscordInteraction } from '../lib/discord-types';
import type { DiscordEmbed } from '../lib/discord-types';
import { editDeferredResponse, sendFollowUp, warningEmbed } from '../lib/discord-respond';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';
import { DISCORD_CHANNEL_ROAST_SYSTEM, buildChannelRoastPrompt } from '../prompts/discord-prompts';
import { callGeminiForDiscord, parseGeminiJSONSafe } from '../lib/discord-ai';
import { findDramaMessages } from '../lib/search-sampler';
import type { DramaSearchResult } from '../lib/search-sampler';

interface PersonRoast {
  name: string;
  lines: string[];
  tag: string;
}

interface ChannelRoastResponse {
  channel_title: string;
  intro: string;
  roasts: PersonRoast[];
  dynamics: string[];
  verdict: string;
}

const COLOR_PURPLE = 0xa855f7;
const COLOR_BLUE = 0x3b82f6;
const COLOR_GREEN = 0x10b981;
const FOOTER = { text: 'PodTeksT Roast Machine \u2022 podtekst.app' };

function trimToEmbed(text: string, max = 4000): string {
  return text.length > max ? text.slice(0, max - 3) + '...' : text;
}

export async function handleRoast(
  interaction: DiscordInteraction,
  data: { conversation: ParsedConversation; quantitative: QuantitativeAnalysis },
): Promise<void> {
  // Read message limit option (default 500)
  const limitOption = interaction.data?.options?.find((o) => o.name === 'messages');
  const messageLimit = limitOption?.value ? parseInt(String(limitOption.value), 10) : 500;

  const participants = data.conversation.participants.map((p) => p.name);

  if (participants.length === 0) {
    await editDeferredResponse(
      interaction.token,
      'Brak uczestników do zroastowania. Pusty kanał.',
    );
    return;
  }

  // Check if messages have content (Message Content Intent)
  const hasContent = data.conversation.messages.some((m) => m.content.trim().length > 0);
  if (!hasContent) {
    await editDeferredResponse(
      interaction.token,
      undefined,
      [warningEmbed(
        'Brak treści wiadomości',
        'Bot nie ma dostępu do treści wiadomości. Włącz **Message Content Intent** w Discord Developer Portal → Bot → Privileged Gateway Intents.',
      )],
    );
    return;
  }

  const channelName = data.conversation.title ?? 'Discord';

  // Search for drama messages from full channel history
  let dramaMessages: DramaSearchResult['dramaMessages'] = [];
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (botToken && interaction.channel_id) {
      const drama = await findDramaMessages(interaction.channel_id, botToken);
      dramaMessages = drama.dramaMessages;
    }
  } catch {
    // Graceful fallback — proceed without drama search
  }

  const prompt = buildChannelRoastPrompt(
    channelName,
    data.conversation.messages,
    data.quantitative,
    participants,
    messageLimit,
    dramaMessages,
  );

  try {
    const raw = await callGeminiForDiscord(DISCORD_CHANNEL_ROAST_SYSTEM, prompt, {
      maxOutputTokens: 4096,
      temperature: 0.9,
    });
    const result = parseGeminiJSONSafe<ChannelRoastResponse>(raw);

    if (!result || !result.roasts || result.roasts.length === 0) {
      await editDeferredResponse(
        interaction.token,
        undefined,
        [warningEmbed('Roast Failed', 'AI nie dała rady wygenerować roasta. Spróbuj ponownie.')],
      );
      return;
    }

    // Build embeds
    const embeds: DiscordEmbed[] = [];

    // Embed 1: Main — title + intro + verdict
    const mainDescription = [
      result.intro,
      '',
      '\u2500'.repeat(20),
      '',
      `**WERDYKT:** ${result.verdict}`,
    ].join('\n');

    embeds.push({
      title: `\u{1F525} ${result.channel_title} \u{1F525}`,
      description: trimToEmbed(mainDescription),
      color: COLOR_PURPLE,
      footer: FOOTER,
    });

    // Embeds 2+: Per-person roasts (max 8 to stay under Discord 10 embed limit)
    const maxPersonEmbeds = Math.min(result.roasts.length, 8);
    for (let i = 0; i < maxPersonEmbeds; i++) {
      const person = result.roasts[i];
      const lines = person.lines.map((line, idx) => `${idx + 1}. ${line}`).join('\n\n');

      embeds.push({
        title: `\u{1F464} ${person.name} \u2014 "${person.tag}"`,
        description: trimToEmbed(lines),
        color: COLOR_BLUE,
      });
    }

    // Dynamics embed (if space)
    if (result.dynamics && result.dynamics.length > 0 && embeds.length < 10) {
      const dynamicsText = result.dynamics.map((d) => `\u2022 ${d}`).join('\n\n');
      embeds.push({
        title: '\u{1F517} Dynamika kanału',
        description: trimToEmbed(dynamicsText),
        color: COLOR_GREEN,
        footer: FOOTER,
      });
    }

    // Discord allows max 10 embeds per message
    // Send first batch via editDeferredResponse, overflow via sendFollowUp
    const firstBatch = embeds.slice(0, 10);
    const overflow = embeds.slice(10);

    await editDeferredResponse(interaction.token, undefined, firstBatch);

    if (overflow.length > 0) {
      await sendFollowUp(interaction.token, undefined, overflow);
    }
  } catch (err) {
    await editDeferredResponse(
      interaction.token,
      undefined,
      [warningEmbed('Roast Error', `AI się zepsuło: ${err instanceof Error ? err.message : 'nieznany błąd'}`)],
    );
  }
}
