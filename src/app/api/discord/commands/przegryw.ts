/**
 * /przegryw — AI-powered "Przegryw Tygodnia" ceremony.
 * AI reads messages and judges who deserves the title based on message CONTENT.
 * Uses deferred response pattern + multi-embed output.
 */

import type { DiscordInteraction } from '../lib/discord-types';
import type { DiscordEmbed } from '../lib/discord-types';
import { editDeferredResponse, sendFollowUp, warningEmbed } from '../lib/discord-respond';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';
import { DISCORD_PRZEGRYW_SYSTEM, buildPrzegrywPrompt } from '../prompts/discord-prompts';
import { callGeminiForDiscord, parseGeminiJSONSafe } from '../lib/discord-ai';
import { findDramaMessages } from '../lib/search-sampler';
import type { DramaSearchResult } from '../lib/search-sampler';

interface PrzegrywNomination {
  categoryId: string;
  categoryTitle: string;
  emoji: string;
  winner: string;
  reason: string;
  evidence: string[];
  runnerUp?: string;
}

interface PrzegrywResponse {
  winner: string;
  winnerScore: number;
  winnerCategories: number;
  nominations: PrzegrywNomination[];
  ranking: Array<{ name: string; score: number; oneLiner: string }>;
  intro: string;
  crowningSpeech: string;
  verdict: string;
  hallOfShame: Array<{
    person: string;
    quote: string;
    commentary: string;
  }>;
}

const COLOR_RED = 0xef4444;
const COLOR_DARK_RED = 0xdc2626;
const COLOR_ORANGE = 0xf97316;
const COLOR_PURPLE = 0xa855f7;
const COLOR_BLUE = 0x3b82f6;
const FOOTER = { text: 'PodTeksT Przegryw Tygodnia \u2022 podtekst.app' };

function trimToEmbed(text: string, max = 4000): string {
  return text.length > max ? text.slice(0, max - 3) + '...' : text;
}

export async function handlePrzegryw(
  interaction: DiscordInteraction,
  data: { conversation: ParsedConversation; quantitative: QuantitativeAnalysis },
): Promise<void> {
  const limitOption = interaction.data?.options?.find((o) => o.name === 'messages');
  const messageLimit = limitOption?.value ? parseInt(String(limitOption.value), 10) : 500;

  const participants = data.conversation.participants.map((p) => p.name);

  if (participants.length < 3) {
    await editDeferredResponse(
      interaction.token,
      undefined,
      [warningEmbed(
        'Za mało uczestników',
        'Przegryw Tygodnia wymaga minimum 3 uczestników na kanale.',
      )],
    );
    return;
  }

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
      // Przegryw Tygodnia = Loser of the WEEK — limit search to last 7 days
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const drama = await findDramaMessages(interaction.channel_id, botToken, { since: oneWeekAgo });
      dramaMessages = drama.dramaMessages;
    }
  } catch {
    // Graceful fallback — proceed without drama search
  }

  const prompt = buildPrzegrywPrompt(
    channelName,
    data.conversation.messages,
    data.quantitative,
    participants,
    messageLimit,
    dramaMessages,
  );

  try {
    const raw = await callGeminiForDiscord(DISCORD_PRZEGRYW_SYSTEM, prompt, {
      maxOutputTokens: 6144,
      temperature: 0.95,
    });
    const result = parseGeminiJSONSafe<PrzegrywResponse>(raw);

    if (!result || !result.winner || !result.nominations || result.nominations.length === 0) {
      await editDeferredResponse(
        interaction.token,
        undefined,
        [warningEmbed('Przegryw Tygodnia Failed', 'AI nie dała rady wybrać przegrywa. Spróbuj ponownie.')],
      );
      return;
    }

    const embeds: DiscordEmbed[] = [];

    // Embed 1: Winner reveal + intro + verdict
    const mainLines = [
      result.intro,
      '',
      '\u2500'.repeat(30),
      '',
      `\u{1F480} **${result.winner}** \u2014 Przegrywowatość: **${result.winnerScore}/100** | Wygrane kategorie: **${result.winnerCategories}/8**`,
      '',
      `**WERDYKT:** ${result.verdict}`,
    ].join('\n');

    embeds.push({
      title: `\u{1F480} PRZEGRYW TYGODNIA: ${result.winner} \u{1F480}`,
      description: trimToEmbed(mainLines),
      color: COLOR_RED,
      footer: FOOTER,
    });

    // Embed 2: Category nominations (all 8)
    if (result.nominations.length > 0) {
      const catLines = result.nominations.map((nom) => {
        const evidence = nom.evidence.length > 0
          ? `\n> ${nom.evidence.slice(0, 2).join('\n> ')}`
          : '';
        const runner = nom.runnerUp ? ` *(runner-up: ${nom.runnerUp})*` : '';
        return `${nom.emoji} **${nom.categoryTitle}**\n**${nom.winner}**${runner} — ${nom.reason}${evidence}`;
      }).join('\n\n');

      embeds.push({
        title: '\u{1F3C6} Nominacje',
        description: trimToEmbed(catLines),
        color: COLOR_PURPLE,
      });
    }

    // Embed 3: Hall of Shame — worst moments
    if (result.hallOfShame && result.hallOfShame.length > 0) {
      const shameLines = result.hallOfShame.map((h) =>
        `**${h.person}:** "${h.quote}"\n\u{1F525} ${h.commentary}`
      ).join('\n\n');

      embeds.push({
        title: '\u{1F6A8} Hall of Shame',
        description: trimToEmbed(shameLines),
        color: COLOR_ORANGE,
      });
    }

    // Embed 4: Crowning speech
    if (result.crowningSpeech) {
      embeds.push({
        title: '\u{1F451} Koronacja',
        description: trimToEmbed(result.crowningSpeech),
        color: COLOR_DARK_RED,
      });
    }

    // Embed 5: Full ranking
    if (result.ranking && result.ranking.length > 0) {
      const rankLines = result.ranking
        .sort((a, b) => b.score - a.score)
        .map((r, i) => {
          const medal = i === 0 ? '\u{1F480}' : i === 1 ? '\u{1F4A9}' : i === 2 ? '\u{1F921}' : `${i + 1}.`;
          return `${medal} **${r.name}** — ${r.score}/100 — ${r.oneLiner}`;
        })
        .join('\n');

      embeds.push({
        title: '\u{1F4CA} Ranking Przegrywowatości',
        description: trimToEmbed(rankLines),
        color: COLOR_BLUE,
        footer: FOOTER,
      });
    }

    // Discord max 10 embeds
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
      [warningEmbed('Przegryw Tygodnia Error', `AI się zepsuło: ${err instanceof Error ? err.message : 'nieznany błąd'}`)],
    );
  }
}
