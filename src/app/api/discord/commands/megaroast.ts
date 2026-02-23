/**
 * /megaroast — AI-powered MEGA ROAST targeting a SINGLE user.
 * Uses full group context to find the juiciest material about the target.
 * Uses deferred response pattern + multi-embed output.
 */

import type { DiscordInteraction } from '../lib/discord-types';
import type { DiscordEmbed } from '../lib/discord-types';
import { editDeferredResponse, sendFollowUp, warningEmbed } from '../lib/discord-respond';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';
import { DISCORD_MEGA_ROAST_SYSTEM, buildMegaRoastPrompt } from '../prompts/discord-prompts';
import { callGeminiForDiscord, parseGeminiJSONSafe } from '../lib/discord-ai';
import { findDramaMessages } from '../lib/search-sampler';
import type { DramaSearchResult } from '../lib/search-sampler';

interface MegaRoastResponse {
  targetName: string;
  opening: string;
  roast_lines: string[];
  what_others_say: string[];
  self_owns: string[];
  superlatives: Array<{ title: string; roast: string }>;
  verdict: string;
}

const COLOR_ORANGE = 0xf97316;
const COLOR_RED = 0xef4444;
const COLOR_PURPLE = 0xa855f7;
const FOOTER = { text: 'PodTeksT Mega Roast \u2022 podtekst.app' };

function trimToEmbed(text: string, max = 4000): string {
  return text.length > max ? text.slice(0, max - 3) + '...' : text;
}

export async function handleMegaroast(
  interaction: DiscordInteraction,
  data: { conversation: ParsedConversation; quantitative: QuantitativeAnalysis },
): Promise<void> {
  // Read message limit option (default 500)
  const limitOption = interaction.data?.options?.find((o) => o.name === 'messages');
  const messageLimit = limitOption?.value ? parseInt(String(limitOption.value), 10) : 500;

  // Read target user option (required)
  const userOption = interaction.data?.options?.find((o) => o.name === 'user');
  if (!userOption?.value) {
    await editDeferredResponse(interaction.token, 'Musisz wybrać użytkownika do zroastowania.');
    return;
  }

  const targetUserId = String(userOption.value);
  const participants = data.conversation.participants.map((p) => p.name);

  // Resolve target name from participants (Discord user ID → display name)
  // The user ID from Discord needs to match a participant. We look for the display name
  // in the interaction's resolved data, or fall back to participant matching.
  let targetName: string | null = null;

  // Check resolved members/users
  const resolvedUser = interaction.data?.resolved?.users?.[targetUserId];
  const resolvedMember = interaction.data?.resolved?.members?.[targetUserId];
  const displayName = resolvedMember?.nick ?? resolvedUser?.global_name ?? resolvedUser?.username;

  if (displayName) {
    // Try exact match first, then case-insensitive
    targetName = participants.find((p) => p === displayName)
      ?? participants.find((p) => p.toLowerCase() === displayName.toLowerCase())
      ?? null;
  }

  if (!targetName) {
    // Try matching by username if display name didn't match
    const username = resolvedUser?.username;
    if (username) {
      targetName = participants.find((p) => p === username)
        ?? participants.find((p) => p.toLowerCase() === username.toLowerCase())
        ?? null;
    }
  }

  if (!targetName) {
    await editDeferredResponse(
      interaction.token,
      undefined,
      [warningEmbed(
        'Użytkownik nie znaleziony',
        `Nie znaleziono **${displayName ?? targetUserId}** w wiadomościach kanału. Upewnij się, że ta osoba pisała na tym kanale.`,
      )],
    );
    return;
  }

  // Check if messages have content
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

  const prompt = buildMegaRoastPrompt(
    channelName,
    targetName,
    data.conversation.messages,
    data.quantitative,
    participants,
    messageLimit,
    dramaMessages,
  );

  try {
    const raw = await callGeminiForDiscord(DISCORD_MEGA_ROAST_SYSTEM, prompt, {
      maxOutputTokens: 4096,
      temperature: 0.95,
    });
    const result = parseGeminiJSONSafe<MegaRoastResponse>(raw);

    if (!result || !result.roast_lines || result.roast_lines.length === 0) {
      await editDeferredResponse(
        interaction.token,
        undefined,
        [warningEmbed('Mega Roast Failed', 'AI nie dała rady wygenerować mega roasta. Spróbuj ponownie.')],
      );
      return;
    }

    // Build embeds
    const embeds: DiscordEmbed[] = [];

    // Embed 1: Opening + verdict
    const mainLines = [
      result.opening,
      '',
      '\u2500'.repeat(30),
      '',
      `**WERDYKT:** ${result.verdict}`,
    ].join('\n');

    embeds.push({
      title: `\u{1F525} MEGA ROAST: ${result.targetName} \u{1F525}`,
      description: trimToEmbed(mainLines),
      color: COLOR_ORANGE,
      footer: FOOTER,
    });

    // Embed 2: Roast lines
    const roastText = result.roast_lines.map((line, i) => `${i + 1}. ${line}`).join('\n\n');
    embeds.push({
      title: '\u{1F525} Roast',
      description: trimToEmbed(roastText),
      color: COLOR_RED,
    });

    // Embed 3: What others say
    if (result.what_others_say && result.what_others_say.length > 0) {
      const othersText = result.what_others_say.map((line) => `\u2022 ${line}`).join('\n\n');
      embeds.push({
        title: '\u{1F4AC} Co mówią inni',
        description: trimToEmbed(othersText),
        color: COLOR_PURPLE,
      });
    }

    // Embed 4: Self owns
    if (result.self_owns && result.self_owns.length > 0) {
      const selfText = result.self_owns.map((line) => `\u{1F480} ${line}`).join('\n\n');
      embeds.push({
        title: '\u{26B0}\u{FE0F} Samobójcze gole',
        description: trimToEmbed(selfText),
        color: COLOR_RED,
      });
    }

    // Embed 5: Superlatives
    if (result.superlatives && result.superlatives.length > 0 && embeds.length < 10) {
      const supText = result.superlatives.map((s) => `**${s.title}**\n${s.roast}`).join('\n\n');
      embeds.push({
        title: '\u{1F3C6} Nagrody specjalne',
        description: trimToEmbed(supText),
        color: COLOR_ORANGE,
        footer: FOOTER,
      });
    }

    // Discord max 10 embeds per message
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
      [warningEmbed('Mega Roast Error', `AI się zepsuło: ${err instanceof Error ? err.message : 'nieznany błąd'}`)],
    );
  }
}
