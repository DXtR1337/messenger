'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { RankingPercentiles } from '@/lib/parsers/types';

interface RankingBadgesProps {
  rankings: RankingPercentiles;
}

function getBadgeTier(percentile: number): { label: string; bg: string; text: string; ring: string } {
  if (percentile >= 90) {
    return {
      label: `TOP ${100 - percentile}%`,
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-400',
      ring: 'ring-yellow-500/40',
    };
  }
  if (percentile >= 75) {
    return {
      label: `TOP ${100 - percentile}%`,
      bg: 'bg-slate-300/10',
      text: 'text-slate-300',
      ring: 'ring-slate-400/40',
    };
  }
  if (percentile >= 50) {
    return {
      label: `TOP ${100 - percentile}%`,
      bg: 'bg-amber-600/10',
      text: 'text-amber-500',
      ring: 'ring-amber-600/40',
    };
  }
  return {
    label: `TOP ${100 - percentile}%`,
    bg: 'bg-[#1a1a1a]',
    text: 'text-muted-foreground',
    ring: 'ring-border',
  };
}

export default function RankingBadges({ rankings }: RankingBadgesProps) {
  if (!rankings.rankings || rankings.rankings.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl border border-border bg-card p-4 sm:p-6"
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="text-lg">🏆</span>
        <h3 className="font-syne text-base font-bold text-foreground sm:text-lg">
          Ranking
        </h3>
      </div>
      <p className="mb-5 text-xs text-muted-foreground">
        Jak wypadacie na tle innych par
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {rankings.rankings.map((ranking, index) => {
          const tier = getBadgeTier(ranking.percentile);

          return (
            <motion.div
              key={ranking.metric}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl p-3 ring-1 sm:p-4',
                tier.bg,
                tier.ring,
              )}
            >
              <span className="text-2xl sm:text-3xl">{ranking.emoji}</span>
              <span
                className={cn(
                  'font-mono text-lg font-black sm:text-xl',
                  tier.text,
                )}
              >
                {tier.label}
              </span>
              <span className="text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-[11px]">
                {ranking.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
