/**
 * /personality @user — AI-powered personality snapshot.
 * MBTI + Big Five + attachment style, with sarcastic commentary.
 */

import type { DiscordInteraction } from '../lib/discord-types';
import { getInteractionUser, getTargetUser } from '../lib/discord-types';
import { editDeferredResponse, statsEmbed, warningEmbed } from '../lib/discord-respond';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';
import { DISCORD_PERSONALITY_SYSTEM, buildDiscordUserPrompt } from '../prompts/discord-prompts';
import { callGeminiForDiscord, parseGeminiJSONSafe } from '../lib/discord-ai';

interface PersonalityResponse {
  mbti: {
    type: string;
    confidence: number;
    evidence: string;
  };
  big_five: {
    openness: { score: number; note: string };
    conscientiousness: { score: number; note: string };
    extraversion: { score: number; note: string };
    agreeableness: { score: number; note: string };
    neuroticism: { score: number; note: string };
  };
  attachment_style: {
    type: string;
    evidence: string;
  };
  communication_style: string;
  roast_summary: string;
}

const BIG_FIVE_LABELS: Record<string, string> = {
  openness: 'Otwartość',
  conscientiousness: 'Sumienność',
  extraversion: 'Ekstrawersja',
  agreeableness: 'Ugodowość',
  neuroticism: 'Neurotyczność',
};

const ATTACHMENT_LABELS: Record<string, string> = {
  secure: 'Bezpieczny',
  anxious: 'Lękowy',
  avoidant: 'Unikający',
  disorganized: 'Zdezorganizowany',
};

function scoreBar(score: number): string {
  const filled = Math.round(score / 10);
  return '\u2588'.repeat(filled) + '\u2591'.repeat(10 - filled) + ` ${score}`;
}

export async function handlePersonality(
  interaction: DiscordInteraction,
  data: { conversation: ParsedConversation; quantitative: QuantitativeAnalysis },
): Promise<void> {
  const target = getTargetUser(interaction, 'user') ?? getInteractionUser(interaction);
  const pm = data.quantitative.perPerson[target.name];

  if (!pm) {
    await editDeferredResponse(
      interaction.token,
      `Nie znaleziono wiadomości od **${target.name}**.`,
    );
    return;
  }

  const prompt = buildDiscordUserPrompt(
    target.name,
    data.conversation.messages,
    {
      totalMessages: pm.totalMessages,
      totalWords: pm.totalWords,
      avgLength: pm.averageMessageLength,
      emojiCount: pm.emojiCount,
      questionsAsked: pm.questionsAsked,
      topEmojis: pm.topEmojis,
      topWords: pm.topWords,
      messagesWithEmoji: pm.messagesWithEmoji,
    },
    {
      doubleTexts: data.quantitative.engagement.doubleTexts[target.name],
      lateNightMessages: data.quantitative.timing.lateNightMessages[target.name],
      medianResponseTimeMs: data.quantitative.timing.perPerson[target.name]?.medianResponseTimeMs,
    },
  );

  try {
    const raw = await callGeminiForDiscord(DISCORD_PERSONALITY_SYSTEM, prompt);
    const result = parseGeminiJSONSafe<PersonalityResponse>(raw);

    if (!result || !result.mbti) {
      await editDeferredResponse(
        interaction.token,
        undefined,
        [warningEmbed('Personality Error', 'AI nie dała rady przeanalizować osobowości. Spróbuj ponownie.')],
      );
      return;
    }

    // Build Big Five bars
    const b5Lines = Object.entries(result.big_five).map(([key, val]) => {
      const label = BIG_FIVE_LABELS[key] ?? key;
      return `${label}: ${scoreBar(val.score)}\n*${val.note}*`;
    }).join('\n');

    const attachmentLabel = ATTACHMENT_LABELS[result.attachment_style.type] ?? result.attachment_style.type;

    await editDeferredResponse(
      interaction.token,
      undefined,
      [statsEmbed(`\u{1F9E0} Osobowość: ${target.name}`, [
        { name: 'MBTI', value: `**${result.mbti.type}** (${result.mbti.confidence}%)\n${result.mbti.evidence}` },
        { name: 'Big Five', value: b5Lines },
        { name: 'Styl przywiązania', value: `**${attachmentLabel}**\n${result.attachment_style.evidence}` },
        { name: 'Styl komunikacji', value: result.communication_style },
        { name: '\u200B', value: `*${result.roast_summary}*` },
      ])],
    );
  } catch (err) {
    await editDeferredResponse(
      interaction.token,
      undefined,
      [warningEmbed('Personality Error', `AI się zepsuło: ${err instanceof Error ? err.message : 'nieznany błąd'}`)],
    );
  }
}
