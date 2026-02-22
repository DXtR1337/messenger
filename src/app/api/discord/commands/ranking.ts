import type { DiscordInteraction } from '../lib/discord-types';
import { immediateResponse, rankingEmbed, warningEmbed } from '../lib/discord-respond';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';

type MetricKey = 'messages' | 'words' | 'emoji' | 'questions' | 'double_texts' | 'night_messages' | 'response_time';

const METRIC_LABELS: Record<MetricKey, string> = {
  messages: 'Wiadomości',
  words: 'Słowa',
  emoji: 'Emoji',
  questions: 'Pytania zadane',
  double_texts: 'Double texty',
  night_messages: 'Nocne wiadomości',
  response_time: 'Czas odpowiedzi (mediana)',
};

function formatMs(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}min`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

export function handleRanking(
  interaction: DiscordInteraction,
  data: { conversation: ParsedConversation; quantitative: QuantitativeAnalysis },
): Response {
  const metricOption = interaction.data?.options?.find((o) => o.name === 'metric');
  const metric = (metricOption?.value as MetricKey) ?? 'messages';

  const participants = data.conversation.participants.map((p) => p.name);

  if (participants.length === 0) {
    return immediateResponse(undefined, [
      warningEmbed('Brak danych', 'Nie znaleziono uczestników na tym kanale. Upewnij się, że bot ma uprawnienia do czytania wiadomości.'),
    ]);
  }

  // Check if messages have content (needed for word/emoji/question metrics)
  const needsContent = metric !== 'messages' && metric !== 'response_time';
  if (needsContent) {
    const hasContent = data.conversation.messages.some((m) => m.content.trim().length > 0);
    if (!hasContent) {
      return immediateResponse(undefined, [
        warningEmbed(
          'Brak treści wiadomości',
          'Bot nie ma dostępu do treści wiadomości. Włącz **Message Content Intent** w [Discord Developer Portal](https://discord.com/developers/applications) → Bot → Privileged Gateway Intents.\n\nMetryki *Wiadomości* i *Czas odpowiedzi* działają bez tego uprawnienia.',
        ),
      ]);
    }
  }

  const entries: Array<{ name: string; value: number; display: string }> = [];

  for (const name of participants) {
    const pm = data.quantitative.perPerson[name];
    if (!pm) {
      console.warn(`[ranking] perPerson miss: "${name}" not in keys: [${Object.keys(data.quantitative.perPerson).join(', ')}]`);
      continue;
    }

    let value: number;
    let display: string;

    switch (metric) {
      case 'messages':
        value = pm.totalMessages;
        display = value.toLocaleString();
        break;
      case 'words':
        value = pm.totalWords;
        display = value.toLocaleString();
        break;
      case 'emoji':
        value = pm.emojiCount;
        display = `${value} (${pm.topEmojis.slice(0, 3).map((e) => e.emoji).join('')})`;
        break;
      case 'questions':
        value = pm.questionsAsked;
        display = String(value);
        break;
      case 'double_texts':
        value = data.quantitative.engagement.doubleTexts[name] ?? 0;
        display = String(value);
        break;
      case 'night_messages':
        value = data.quantitative.timing.lateNightMessages[name] ?? 0;
        display = String(value);
        break;
      case 'response_time': {
        const t = data.quantitative.timing.perPerson[name];
        value = t ? t.medianResponseTimeMs : Infinity;
        display = t ? formatMs(t.medianResponseTimeMs) : 'n/a';
        break;
      }
      default:
        value = pm.totalMessages;
        display = value.toLocaleString();
    }

    entries.push({ name, value, display });
  }

  if (entries.length === 0) {
    return immediateResponse(undefined, [
      warningEmbed(
        'Brak danych do rankingu',
        `Znaleziono ${participants.length} uczestników, ale brak danych metryki **${METRIC_LABELS[metric] ?? metric}**.\n\nSpróbuj innej metryki lub sprawdź uprawnienia bota.`,
      ),
    ]);
  }

  // Sort: response_time ascending (lower=better), everything else descending
  entries.sort((a, b) => metric === 'response_time' ? a.value - b.value : b.value - a.value);

  const top = entries.slice(0, 15);
  const medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];

  const lines = top.map((e, i) => {
    const prefix = i < 3 ? medals[i] : `${i + 1}.`;
    return `${prefix} **${e.name}** — ${e.display}`;
  });

  const footer = `${data.conversation.metadata.totalMessages.toLocaleString()} wiadomości · ${participants.length} uczestników`;

  return immediateResponse(undefined, [
    {
      ...rankingEmbed(`Ranking: ${METRIC_LABELS[metric] ?? metric}`, lines.join('\n')),
      footer: { text: `${footer} · PodTeksT` },
    },
  ]);
}
