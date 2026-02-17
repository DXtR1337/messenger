'use client';

import { useMemo } from 'react';
import type { PersonMetrics } from '@/lib/parsers/types';

interface EmojiReactionsProps {
  perPerson: Record<string, PersonMetrics>;
  participants: string[];
}

interface MergedEmoji {
  emoji: string;
  perPerson: Record<string, number>;
  total: number;
}

export default function EmojiReactions({
  perPerson,
  participants,
}: EmojiReactionsProps) {
  const topEmojis: MergedEmoji[] = useMemo(() => {
    const emojiMap = new Map<string, Record<string, number>>();

    for (const name of participants) {
      const metrics = perPerson[name];
      if (!metrics) continue;
      for (const reaction of metrics.topReactionsGiven) {
        const existing = emojiMap.get(reaction.emoji) ?? {};
        existing[name] = (existing[name] ?? 0) + reaction.count;
        emojiMap.set(reaction.emoji, existing);
      }
    }

    const merged: MergedEmoji[] = [];
    for (const [emoji, breakdown] of emojiMap) {
      const total = Object.values(breakdown).reduce((sum, count) => sum + count, 0);
      merged.push({ emoji, perPerson: breakdown, total });
    }

    merged.sort((a, b) => b.total - a.total);
    return merged.slice(0, 5);
  }, [perPerson, participants]);

  if (topEmojis.length === 0) return null;

  const personA = participants[0];
  const personB = participants[1];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between px-5 pt-4">
        <div>
          <h3 className="font-display text-[0.93rem] font-bold">Top reakcje</h3>
          <p className="mt-0.5 text-[0.72rem] text-[#555]">
            Najczesciej uzywane emoji
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3 px-5 py-4">
        {topEmojis.map((entry) => {
          const countA = personA ? (entry.perPerson[personA] ?? 0) : 0;
          const countB = personB ? (entry.perPerson[personB] ?? 0) : 0;
          const pctA = entry.total > 0 ? (countA / entry.total) * 100 : 0;
          const pctB = entry.total > 0 ? (countB / entry.total) * 100 : 0;

          return (
            <div key={entry.emoji} className="flex items-center gap-2.5">
              <span className="w-[30px] text-center text-xl">{entry.emoji}</span>
              <div className="flex h-2 flex-1 overflow-hidden rounded">
                <div
                  className="bg-chart-a transition-all duration-300"
                  style={{ width: `${pctA}%` }}
                />
                <div
                  className="bg-chart-b transition-all duration-300"
                  style={{ width: `${pctB}%` }}
                />
              </div>
              <span className="w-11 text-right font-display text-[0.78rem] text-muted-foreground">
                {entry.total}
              </span>
            </div>
          );
        })}

        {/* Legend */}
        <div className="mt-1.5 flex items-center gap-4 text-[0.72rem] text-[#555]">
          {personA && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-sm bg-chart-a" />
              {personA}
            </span>
          )}
          {personB && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-sm bg-chart-b" />
              {personB}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
