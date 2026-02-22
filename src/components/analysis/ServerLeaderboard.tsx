'use client';

import { useState, useMemo } from 'react';
import type { QuantitativeAnalysis, ParsedConversation } from '@/lib/parsers/types';
import { getPersonColor } from './PersonNavigator';

type LeaderboardMetric = 'messages' | 'words' | 'avgLength' | 'emoji' | 'questions' | 'doubleTexts' | 'nightMessages' | 'responseTime' | 'initiations' | 'mentions' | 'replies' | 'edits';

const BASE_METRICS: Array<{ key: LeaderboardMetric; label: string; desc: string }> = [
  { key: 'messages', label: 'Wiadomości', desc: 'Łączna liczba wiadomości' },
  { key: 'words', label: 'Słowa', desc: 'Łączna liczba słów' },
  { key: 'avgLength', label: 'Śr. długość', desc: 'Średnia długość wiadomości' },
  { key: 'emoji', label: 'Emoji', desc: 'Łączna liczba emoji' },
  { key: 'questions', label: 'Pytania', desc: 'Zadane pytania (?)' },
  { key: 'doubleTexts', label: 'Double texty', desc: 'Wiadomości bez odpowiedzi' },
  { key: 'nightMessages', label: 'Nocne msg', desc: 'Wiadomości 22:00-04:00' },
  { key: 'responseTime', label: 'Czas odp.', desc: 'Mediana czasu odpowiedzi' },
  { key: 'initiations', label: 'Inicjacje', desc: 'Kto zaczyna rozmowy' },
];

const DISCORD_METRICS: Array<{ key: LeaderboardMetric; label: string; desc: string }> = [
  { key: 'mentions', label: 'Wzmianki', desc: 'Otrzymane @mentions' },
  { key: 'replies', label: 'Odpowiedzi', desc: 'Wysłane reply' },
  { key: 'edits', label: 'Edycje', desc: 'Edytowane wiadomości' },
];

const MEDALS = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];

function formatMs(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}min`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

interface ServerLeaderboardProps {
  participants: string[];
  quantitative: QuantitativeAnalysis;
  onSelectPerson?: (name: string) => void;
  platform?: ParsedConversation['platform'];
}

export default function ServerLeaderboard({
  participants,
  quantitative,
  onSelectPerson,
  platform,
}: ServerLeaderboardProps) {
  const [metric, setMetric] = useState<LeaderboardMetric>('messages');
  const METRICS = platform === 'discord' ? [...BASE_METRICS, ...DISCORD_METRICS] : BASE_METRICS;

  const sortedParticipants = useMemo(() => [...participants].sort((a, b) => {
    const aCount = quantitative.perPerson[a]?.totalMessages ?? 0;
    const bCount = quantitative.perPerson[b]?.totalMessages ?? 0;
    return bCount - aCount;
  }), [participants, quantitative]);

  const ranked = useMemo(() => {
    const entries = sortedParticipants.map((name) => {
      const pm = quantitative.perPerson[name];
      if (!pm) return { name, value: 0, display: '0', originalIndex: sortedParticipants.indexOf(name) };

      const originalIndex = sortedParticipants.indexOf(name);
      let value: number;
      let display: string;

      switch (metric) {
        case 'messages':
          value = pm.totalMessages;
          display = value.toLocaleString('pl-PL');
          break;
        case 'words':
          value = pm.totalWords;
          display = value.toLocaleString('pl-PL');
          break;
        case 'avgLength':
          value = pm.averageMessageLength;
          display = value.toFixed(1);
          break;
        case 'emoji':
          value = pm.emojiCount;
          display = `${value} ${pm.topEmojis.slice(0, 2).map((e) => e.emoji).join('')}`;
          break;
        case 'questions':
          value = pm.questionsAsked;
          display = String(value);
          break;
        case 'doubleTexts':
          value = quantitative.engagement.doubleTexts[name] ?? 0;
          display = String(value);
          break;
        case 'nightMessages':
          value = quantitative.timing.lateNightMessages[name] ?? 0;
          display = String(value);
          break;
        case 'responseTime': {
          const t = quantitative.timing.perPerson[name];
          value = t ? t.medianResponseTimeMs : Infinity;
          display = t ? formatMs(t.medianResponseTimeMs) : 'n/a';
          break;
        }
        case 'initiations':
          value = quantitative.timing.conversationInitiations[name] ?? 0;
          display = String(value);
          break;
        case 'mentions':
          value = pm.mentionsReceived ?? 0;
          display = String(value);
          break;
        case 'replies':
          value = pm.repliesSent ?? 0;
          display = String(value);
          break;
        case 'edits':
          value = pm.editedMessages ?? 0;
          display = String(value);
          break;
        default:
          value = pm.totalMessages;
          display = String(value);
      }

      return { name, value, display, originalIndex };
    });

    // Response time: ascending (lower = better), rest: descending
    const ascending = metric === 'responseTime';
    entries.sort((a, b) => ascending ? a.value - b.value : b.value - a.value);
    return entries;
  }, [sortedParticipants, quantitative, metric]);

  const maxValue = ranked.length > 0 ? Math.max(...ranked.filter((e) => e.value !== Infinity).map((e) => e.value), 1) : 1;

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <div className="font-mono text-xs uppercase tracking-widest text-text-muted">Ranking serwera</div>
      </div>

      {/* Metric Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border px-3 py-2">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={`rounded-md px-2 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors ${
              metric === m.key
                ? 'bg-primary/10 text-primary'
                : 'text-text-muted hover:bg-card-hover hover:text-foreground'
            }`}
            title={m.desc}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Ranking list */}
      <div className="divide-y divide-border/50">
        {ranked.slice(0, 15).map((entry, rank) => {
          const color = getPersonColor(entry.originalIndex);
          const barWidth = entry.value === Infinity ? 0 : (entry.value / maxValue) * 100;

          return (
            <button
              key={entry.name}
              onClick={() => onSelectPerson?.(entry.name)}
              className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-card-hover"
            >
              {/* Rank */}
              <span className="w-6 text-center text-sm">
                {rank < 3 ? MEDALS[rank] : <span className="font-mono text-xs text-text-muted">{rank + 1}</span>}
              </span>

              {/* Avatar */}
              <div
                className="flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {entry.name.charAt(0).toUpperCase()}
              </div>

              {/* Name + bar */}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">{entry.name}</div>
                <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${barWidth}%`, backgroundColor: color }}
                  />
                </div>
              </div>

              {/* Value */}
              <span className="shrink-0 font-mono text-xs text-text-muted">{entry.display}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
