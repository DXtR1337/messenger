'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
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
    // Filter out entries that aren't valid emoji (e.g. "unknown", empty, garbled text)
    return merged.filter((e) => e.emoji && e.emoji.length <= 8 && /\p{Emoji}/u.test(e.emoji)).slice(0, 5);
  }, [perPerson, participants]);

  if (topEmojis.length === 0) return null;

  const personA = participants[0];
  const personB = participants[1];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5 }}
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex items-center justify-between px-3 sm:px-5 pt-4">
        <div>
          <h3 className="font-display text-[15px] font-bold">Top reakcje</h3>
          <p className="mt-0.5 text-xs text-text-muted">
            Najczęściej używane emoji
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3 px-3 sm:px-5 py-4">
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
              <span className="w-11 text-right font-display text-[13px] text-muted-foreground">
                {entry.total}
              </span>
            </div>
          );
        })}

        {/* Legend */}
        <div className="mt-1.5 flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-text-muted">
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
    </motion.div>
  );
}
