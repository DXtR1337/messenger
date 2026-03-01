/**
 * /court — AI-powered chat court trial.
 * Judges channel participants for communication crimes.
 */

import type { DiscordInteraction } from '../lib/discord-types';
import type { DiscordEmbed } from '../lib/discord-types';
import { editDeferredResponse, sendFollowUp, warningEmbed } from '../lib/discord-respond';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';
import { DISCORD_COURT_SYSTEM, buildCourtPrompt } from '../prompts/entertainment-prompts';
import { callGeminiForDiscord, parseGeminiJSONSafe } from '../lib/discord-ai';
import { findDramaMessages } from '../lib/search-sampler';
import type { DramaSearchResult } from '../lib/search-sampler';

interface CourtPersonVerdict {
  name: string;
  verdict: 'winny' | 'niewinny' | 'warunkowo';
  sentence: string;
  mugshotLabel: string;
}

interface CourtResponse {
  caseNumber: string;
  courtName: string;
  charges: string[];
  prosecution: string;
  defense: string;
  verdict: string;
  perPerson: CourtPersonVerdict[];
}

const COLOR_RED = 0xef4444;
const COLOR_ORANGE = 0xf97316;
const COLOR_BLUE = 0x3b82f6;
const COLOR_PURPLE = 0xa855f7;
const FOOTER = { text: 'PodTeksT Sąd \u2022 podtekst.app' };

function trimToEmbed(text: string, max = 4000): string {
  return text.length > max ? text.slice(0, max - 3) + '...' : text;
}

export async function handleCourt(
  interaction: DiscordInteraction,
  data: { conversation: ParsedConversation; quantitative: QuantitativeAnalysis },
): Promise<void> {
  const limitOption = interaction.data?.options?.find((o) => o.name === 'messages');
  const messageLimit = limitOption?.value ? parseInt(String(limitOption.value), 10) : 500;

  const participants = data.conversation.participants.map((p) => p.name);

  if (participants.length < 2) {
    await editDeferredResponse(interaction.token, undefined, [warningEmbed(
      'Za mało uczestników',
      'Sąd Chatowy wymaga minimum 2 uczestników na kanale.',
    )]);
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

  const prompt = buildCourtPrompt(channelName, data.conversation.messages, data.quantitative, participants, messageLimit, dramaMessages);

  try {
    const raw = await callGeminiForDiscord(DISCORD_COURT_SYSTEM, prompt, {
      maxOutputTokens: 6144,
      temperature: 0.5,
    });
    const result = parseGeminiJSONSafe<CourtResponse>(raw);

    if (!result || !result.charges || result.charges.length === 0) {
      await editDeferredResponse(interaction.token, undefined, [warningEmbed('Court Failed', 'AI nie wygenerowało rozprawy. Spróbuj ponownie.')]);
      return;
    }

    const embeds: DiscordEmbed[] = [];

    // Embed 1: Case header + charges
    const headerLines = [
      `**${result.courtName ?? 'Sąd Chatowy Najwyższy'}**`,
      `*${result.caseNumber ?? 'Sprawa nr DC-2024-XXXX'}*`,
      '',
      '\u2696\ufe0f **ZARZUTY:**',
      ...result.charges.map((c, i) => `${i + 1}. ${c}`),
    ];

    embeds.push({
      title: `\u2696\ufe0f ${result.caseNumber ?? 'Sprawa Sądowa'}`,
      description: trimToEmbed(headerLines.join('\n')),
      color: COLOR_RED,
      footer: FOOTER,
    });

    // Embed 2: Prosecution
    if (result.prosecution) {
      embeds.push({
        title: '\u{1F525} Mowa Prokuratora',
        description: trimToEmbed(result.prosecution),
        color: COLOR_ORANGE,
      });
    }

    // Embed 3: Defense
    if (result.defense) {
      embeds.push({
        title: '\u{1F6E1}\ufe0f Mowa Obrony',
        description: trimToEmbed(result.defense),
        color: COLOR_BLUE,
      });
    }

    // Embed 4+: Per-person verdicts
    if (result.perPerson && result.perPerson.length > 0) {
      for (const person of result.perPerson.slice(0, 5)) {
        const verdictEmoji = person.verdict === 'winny' ? '\u274c' : person.verdict === 'niewinny' ? '\u2705' : '\u26a0\ufe0f';
        const lines = [
          `**Werdykt:** ${verdictEmoji} ${person.verdict.toUpperCase()}`,
          '',
          `**Wyrok:** ${person.sentence}`,
          '',
          `*\u{1F4F8} ${person.mugshotLabel}*`,
        ];

        embeds.push({
          title: `\u{1F464} ${person.name}`,
          description: trimToEmbed(lines.join('\n')),
          color: COLOR_PURPLE,
        });
      }
    }

    // Embed last: Overall verdict
    if (result.verdict) {
      embeds.push({
        title: '\u{1F3DB}\ufe0f Werdykt Końcowy',
        description: trimToEmbed(result.verdict),
        color: COLOR_RED,
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
    await editDeferredResponse(interaction.token, undefined, [warningEmbed('Court Error', `AI się zepsuło: ${err instanceof Error ? err.message : 'nieznany błąd'}`)]);
  }
}
