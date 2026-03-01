/**
 * /simulate — AI-powered reply simulator.
 * Predicts how a target user would reply to a given message.
 */

import type { DiscordInteraction } from '../lib/discord-types';
import type { DiscordEmbed } from '../lib/discord-types';
import { editDeferredResponse, warningEmbed } from '../lib/discord-respond';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';
import { DISCORD_SIMULATE_SYSTEM, buildSimulatePrompt } from '../prompts/entertainment-prompts';
import { callGeminiForDiscord, parseGeminiJSONSafe } from '../lib/discord-ai';

interface SimulateReply {
  message: string;
  confidence: number;
  mood: string;
}

interface SimulateResponse {
  targetPerson: string;
  originalMessage: string;
  replies: SimulateReply[];
  styleNotes: string;
  averageConfidence: number;
}

const COLOR_BLUE = 0x3b82f6;
const COLOR_PURPLE = 0xa855f7;
const FOOTER = { text: 'PodTeksT Simulator \u2022 podtekst.app' };

function trimToEmbed(text: string, max = 4000): string {
  return text.length > max ? text.slice(0, max - 3) + '...' : text;
}

export async function handleSimulate(
  interaction: DiscordInteraction,
  data: { conversation: ParsedConversation; quantitative: QuantitativeAnalysis },
): Promise<void> {
  const participants = data.conversation.participants.map((p) => p.name);

  // Required: @user and message
  const userOption = interaction.data?.options?.find((o) => o.name === 'user');
  const messageOption = interaction.data?.options?.find((o) => o.name === 'message');

  if (!userOption?.value || !messageOption?.value) {
    await editDeferredResponse(interaction.token, undefined, [warningEmbed(
      'Brakujące parametry',
      'Użycie: `/simulate @user message:"Twoja wiadomość"`',
    )]);
    return;
  }

  const userMessage = String(messageOption.value);

  // Resolve target user
  const targetUserId = String(userOption.value);
  const resolvedUser = interaction.data?.resolved?.users?.[targetUserId];
  const resolvedMember = interaction.data?.resolved?.members?.[targetUserId];
  const displayName = resolvedMember?.nick ?? resolvedUser?.global_name ?? resolvedUser?.username;

  let targetName: string | null = null;
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

  const hasContent = data.conversation.messages.some((m) => m.content.trim().length > 0);
  if (!hasContent) {
    await editDeferredResponse(interaction.token, undefined, [warningEmbed(
      'Brak treści wiadomości',
      'Bot nie ma dostępu do treści wiadomości. Włącz **Message Content Intent** w Discord Developer Portal.',
    )]);
    return;
  }

  const channelName = data.conversation.title ?? 'Discord';

  const prompt = buildSimulatePrompt(channelName, targetName, userMessage, data.conversation.messages, data.quantitative, participants);

  try {
    const raw = await callGeminiForDiscord(DISCORD_SIMULATE_SYSTEM, prompt, {
      maxOutputTokens: 2048,
      temperature: 0.7,
    });
    const result = parseGeminiJSONSafe<SimulateResponse>(raw);

    if (!result || !result.replies || result.replies.length === 0) {
      await editDeferredResponse(interaction.token, undefined, [warningEmbed('Simulate Failed', 'AI nie wygenerowało symulacji. Spróbuj ponownie.')]);
      return;
    }

    const embeds: DiscordEmbed[] = [];

    // Embed 1: Conversation thread
    const threadLines = [
      `**Ty:** ${userMessage}`,
      '',
      '\u2500'.repeat(20),
      '',
    ];

    for (let i = 0; i < result.replies.length; i++) {
      const r = result.replies[i];
      const moodEmoji = r.mood.includes('zirytow') ? '\u{1F624}' :
        r.mood.includes('entuzjast') ? '\u{1F929}' :
        r.mood.includes('obojętn') ? '\u{1F611}' :
        r.mood.includes('sarkast') ? '\u{1F60F}' : '\u{1F4AC}';
      threadLines.push(`${moodEmoji} **Wariant ${i + 1}** (${r.confidence}% pewności, *${r.mood}*):`);
      threadLines.push(`> ${r.message}`);
      threadLines.push('');
    }

    embeds.push({
      title: `\u{1F4AC} ${targetName} odpowiada...`,
      description: trimToEmbed(threadLines.join('\n')),
      color: COLOR_BLUE,
      footer: FOOTER,
    });

    // Embed 2: Style notes + confidence
    if (result.styleNotes) {
      const styleLines = [
        `**\u{1F3AF} Średnia pewność:** ${result.averageConfidence}%`,
        '',
        `**\u{1F4DD} Notatki o stylu:**`,
        result.styleNotes,
      ];

      embeds.push({
        title: `\u{1F9E0} Analiza stylu: ${targetName}`,
        description: trimToEmbed(styleLines.join('\n')),
        color: COLOR_PURPLE,
        footer: FOOTER,
      });
    }

    await editDeferredResponse(interaction.token, undefined, embeds);
  } catch (err) {
    await editDeferredResponse(interaction.token, undefined, [warningEmbed('Simulate Error', `AI się zepsuło: ${err instanceof Error ? err.message : 'nieznany błąd'}`)]);
  }
}
