'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { PersonMetrics } from '@/lib/parsers/types';

const PERSON_COLORS = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ef4444'] as const;

/** Maximum participants shown in legend before "+X more" truncation */
const MAX_LEGEND = 6;

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
    // Length <= 20 to allow complex emoji: ZWJ sequences, flags, skin tones
    return merged.filter((e) => e.emoji && e.emoji.length <= 20 && /\p{Emoji}/u.test(e.emoji)).slice(0, 5);
  }, [perPerson, participants]);

  if (topEmojis.length === 0) return null;

  const getColor = (index: number) => PERSON_COLORS[index % PERSON_COLORS.length];

  const legendParticipants = participants.slice(0, MAX_LEGEND);
  const hiddenCount = participants.length - MAX_LEGEND;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5 }}
      className="overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 sm:px-6 pt-4">
        <div>
          <h3 className="font-[family-name:var(--font-syne)] text-base font-semibold text-white">Top reakcje</h3>
          <p className="mt-0.5 text-xs text-white/50">
            Najczęściej używane emoji
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3 px-4 sm:px-6 py-4">
        {topEmojis.map((entry) => (
          <div key={entry.emoji} className="flex items-center gap-2.5">
            <span className="w-[30px] text-center text-2xl opacity-90">{entry.emoji}</span>
            <div
              className="flex h-[5px] flex-1 overflow-hidden rounded-full bg-white/[0.04]"
              style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }}
            >
              {participants.map((name, i) => {
                const count = entry.perPerson[name] ?? 0;
                const pct = entry.total > 0 ? (count / entry.total) * 100 : 0;
                if (pct === 0) return null;
                const color = getColor(i);
                return (
                  <div
                    key={name}
                    className="first:rounded-l-full last:rounded-r-full transition-all duration-300"
                    title={`${name}: ${count}`}
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${color}90, ${color})`,
                      boxShadow: `0 0 8px ${color}25`,
                    }}
                  />
                );
              })}
            </div>
            <span className="w-11 text-right font-display text-xs text-white/50">
              {entry.total}
            </span>
          </div>
        ))}

        {/* Legend */}
        <div className="mt-1.5 flex flex-wrap items-center gap-2 sm:gap-4 text-[11px] text-white/50">
          {legendParticipants.map((name, i) => (
            <span key={name} className="flex items-center gap-1.5">
              <span
                className="inline-block size-2.5 rounded-[3px]"
                style={{ backgroundColor: getColor(i) }}
              />
              {name}
            </span>
          ))}
          {hiddenCount > 0 && (
            <span className="text-muted-foreground">+{hiddenCount}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
