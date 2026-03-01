/**
 * /deeproast — AI-powered deep psychological roast.
 * Combines brutal humor with psychological analysis.
 */

import type { DiscordInteraction } from '../lib/discord-types';
import type { DiscordEmbed } from '../lib/discord-types';
import { editDeferredResponse, warningEmbed } from '../lib/discord-respond';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';
import { DISCORD_DEEPROAST_SYSTEM, buildDeepRoastPrompt } from '../prompts/entertainment-prompts';
import { callGeminiForDiscord, parseGeminiJSONSafe } from '../lib/discord-ai';
import { findDramaMessages } from '../lib/search-sampler';
import type { DramaSearchResult } from '../lib/search-sampler';

interface DeepRoastEntry {
  observation: string;
  psychology: string;
  roast: string;
}

interface DeepRoastResponse {
  targetName: string;
  diagnosis: string;
  deepRoasts: DeepRoastEntry[];
  defenseProfile: {
    primary: string;
    secondary: string;
    evidence: string;
  };
  attachmentAnalysis: string;
  verdict: string;
}

const COLOR_RED = 0xef4444;
const COLOR_PURPLE = 0xa855f7;
const COLOR_BLUE = 0x3b82f6;
const COLOR_DARK_RED = 0xdc2626;
const FOOTER = { text: 'PodTeksT Deep Roast \u2022 podtekst.app' };

function trimToEmbed(text: string, max = 4000): string {
  return text.length > max ? text.slice(0, max - 3) + '...' : text;
}

export async function handleDeepRoast(
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

  // Resolve optional target user
  let targetName: string | null = null;
  const userOption = interaction.data?.options?.find((o) => o.name === 'user');
  if (userOption?.value) {
    const targetUserId = String(userOption.value);
    const resolvedUser = interaction.data?.resolved?.users?.[targetUserId];
    const resolvedMember = interaction.data?.resolved?.members?.[targetUserId];
    const displayName = resolvedMember?.nick ?? resolvedUser?.global_name ?? resolvedUser?.username;
    if (displayName) {
      targetName = participants.find((p) => p === displayName)
        ?? participants.find((p) => p.toLowerCase() === displayName.toLowerCase())
        ?? null;
    }
    if (!targetName && resolvedUser?.username) {
      targetName = participants.find((p) => p === resolvedUser.username)
        ?? participants.find((p) => p.toLowerCase() === resolvedUser.username.toLowerCase())
        ?? null;
    }
    if (!targetName) {
      await editDeferredResponse(interaction.token, undefined, [warningEmbed(
        'Użytkownik nie znaleziony',
        `Nie znaleziono **${displayName ?? targetUserId}** w wiadomościach kanału.`,
      )]);
      return;
    }
  }

  // If no user specified, pick the most active participant
  if (!targetName) {
    const sorted = [...participants].sort((a, b) =>
      (data.quantitative.perPerson[b]?.totalMessages ?? 0) - (data.quantitative.perPerson[a]?.totalMessages ?? 0),
    );
    targetName = sorted[0] ?? participants[0];
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

  const prompt = buildDeepRoastPrompt(channelName, targetName, data.conversation.messages, data.quantitative, participants, messageLimit, dramaMessages);

  try {
    const raw = await callGeminiForDiscord(DISCORD_DEEPROAST_SYSTEM, prompt, {
      maxOutputTokens: 4096,
      temperature: 0.95,
    });
    const result = parseGeminiJSONSafe<DeepRoastResponse>(raw);

    if (!result || !result.deepRoasts || result.deepRoasts.length === 0) {
      await editDeferredResponse(interaction.token, undefined, [warningEmbed('Deep Roast Failed', 'AI nie wygenerowało roastu. Spróbuj ponownie.')]);
      return;
    }

    const embeds: DiscordEmbed[] = [];

    // Embed 1: Diagnosis header
    embeds.push({
      title: `\u{1F9E0} Deep Roast: ${result.targetName ?? targetName}`,
      description: trimToEmbed(`**Diagnoza:** ${result.diagnosis}`),
      color: COLOR_RED,
      footer: FOOTER,
    });

    // Embed 2: Roast entries
    const roastLines = result.deepRoasts.slice(0, 5).map((r) => [
      `\u{1F50D} **${r.observation}**`,
      `\u{1F9E0} *${r.psychology}*`,
      `\u{1F525} ${r.roast}`,
    ].join('\n')).join('\n\n');

    embeds.push({
      title: '\u{1F525} Analiza Psychologiczna',
      description: trimToEmbed(roastLines),
      color: COLOR_PURPLE,
    });

    // Embed 3: Defense profile
    if (result.defenseProfile) {
      const defenseLines = [
        `**Główny mechanizm obronny:** ${result.defenseProfile.primary}`,
        `**Wtórny:** ${result.defenseProfile.secondary}`,
        '',
        `**Dowody:** ${result.defenseProfile.evidence}`,
      ];

      embeds.push({
        title: '\u{1F6E1}\ufe0f Profil Mechanizmów Obronnych',
        description: trimToEmbed(defenseLines.join('\n')),
        color: COLOR_BLUE,
      });
    }

    // Embed 4: Attachment + verdict
    const finalLines: string[] = [];
    if (result.attachmentAnalysis) {
      finalLines.push(`**\u{1F517} Wzorzec Przywiązania:**`);
      finalLines.push(result.attachmentAnalysis);
      finalLines.push('');
    }
    if (result.verdict) {
      finalLines.push(`**\u2696\ufe0f Werdykt Końcowy:**`);
      finalLines.push(result.verdict);
    }

    if (finalLines.length > 0) {
      embeds.push({
        title: '\u{1F4CB} Podsumowanie',
        description: trimToEmbed(finalLines.join('\n')),
        color: COLOR_DARK_RED,
        footer: FOOTER,
      });
    }

    await editDeferredResponse(interaction.token, undefined, embeds);
  } catch (err) {
    await editDeferredResponse(interaction.token, undefined, [warningEmbed('Deep Roast Error', `AI się zepsuło: ${err instanceof Error ? err.message : 'nieznany błąd'}`)]);
  }
}
