import type { DiscordInteraction } from '../lib/discord-types';
import { getTargetUser } from '../lib/discord-types';
import { immediateResponse, statsEmbed } from '../lib/discord-respond';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';

function formatMs(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}min`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

function winner(a: number, b: number, higherWins = true): string {
  if (a === b) return '=';
  return (higherWins ? a > b : a < b) ? '\u{1F451}' : '';
}

export function handleVersus(
  interaction: DiscordInteraction,
  data: { conversation: ParsedConversation; quantitative: QuantitativeAnalysis },
): Response {
  const user1 = getTargetUser(interaction, 'user1');
  const user2 = getTargetUser(interaction, 'user2');

  if (!user1 || !user2) {
    return immediateResponse('Musisz podać dwóch użytkowników: `/versus @user1 @user2`');
  }

  const m1 = data.quantitative.perPerson[user1.name];
  const m2 = data.quantitative.perPerson[user2.name];

  if (!m1) return immediateResponse(`Nie znaleziono wiadomości od **${user1.name}**.`);
  if (!m2) return immediateResponse(`Nie znaleziono wiadomości od **${user2.name}**.`);

  const t1 = data.quantitative.timing.perPerson[user1.name];
  const t2 = data.quantitative.timing.perPerson[user2.name];
  const e = data.quantitative.engagement;

  const rows = [
    `**Wiadomości:** ${m1.totalMessages} ${winner(m1.totalMessages, m2.totalMessages)} vs ${m2.totalMessages} ${winner(m2.totalMessages, m1.totalMessages)}`,
    `**Słowa:** ${m1.totalWords} ${winner(m1.totalWords, m2.totalWords)} vs ${m2.totalWords} ${winner(m2.totalWords, m1.totalWords)}`,
    `**Śr. długość:** ${m1.averageMessageLength.toFixed(1)} ${winner(m1.averageMessageLength, m2.averageMessageLength)} vs ${m2.averageMessageLength.toFixed(1)} ${winner(m2.averageMessageLength, m1.averageMessageLength)}`,
    `**Emoji:** ${m1.emojiCount} ${winner(m1.emojiCount, m2.emojiCount)} vs ${m2.emojiCount} ${winner(m2.emojiCount, m1.emojiCount)}`,
    `**Pytania:** ${m1.questionsAsked} ${winner(m1.questionsAsked, m2.questionsAsked)} vs ${m2.questionsAsked} ${winner(m2.questionsAsked, m1.questionsAsked)}`,
    `**Czas odp.:** ${t1 ? formatMs(t1.medianResponseTimeMs) : 'n/a'} ${t1 && t2 ? winner(t1.medianResponseTimeMs, t2.medianResponseTimeMs, false) : ''} vs ${t2 ? formatMs(t2.medianResponseTimeMs) : 'n/a'} ${t1 && t2 ? winner(t2.medianResponseTimeMs, t1.medianResponseTimeMs, false) : ''}`,
    `**Double texty:** ${e.doubleTexts[user1.name] ?? 0} vs ${e.doubleTexts[user2.name] ?? 0}`,
  ];

  return immediateResponse(undefined, [
    statsEmbed(`${user1.name} vs ${user2.name}`, [
      { name: '\u200B', value: rows.join('\n') },
    ]),
  ]);
}
