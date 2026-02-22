'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ThreatMetersResult } from '@/lib/parsers/types';

interface ThreatMetersProps {
  meters: ThreatMetersResult;
}

const LEVEL_LABELS: Record<string, string> = {
  low: 'Niski',
  moderate: 'Umiarkowany',
  elevated: 'Podwyższony',
  critical: 'Krytyczny',
};

const LEVEL_COLORS: Record<string, { bar: string; badge: string; text: string }> = {
  low: {
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    text: 'text-emerald-400',
  },
  moderate: {
    bar: 'bg-yellow-500',
    badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    text: 'text-yellow-400',
  },
  elevated: {
    bar: 'bg-orange-500',
    badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    text: 'text-orange-400',
  },
  critical: {
    bar: 'bg-red-500',
    badge: 'bg-red-500/15 text-red-400 border-red-500/30',
    text: 'text-red-400',
  },
};

// Trust Index uses inverted coloring: high score = good = green
function getTrustColors(level: string): { bar: string; badge: string; text: string } {
  switch (level) {
    case 'critical': return LEVEL_COLORS.low;      // high trust = green
    case 'elevated': return LEVEL_COLORS.moderate;  // good trust = yellow
    case 'moderate': return LEVEL_COLORS.elevated;  // moderate trust = orange
    case 'low': return LEVEL_COLORS.critical;       // low trust = red
    default: return LEVEL_COLORS.moderate;
  }
}

function getTrustLabel(level: string): string {
  switch (level) {
    case 'critical': return 'Wysoki';
    case 'elevated': return 'Dobry';
    case 'moderate': return 'Niski';
    case 'low': return 'Krytycznie niski';
    default: return 'Nieznany';
  }
}

export default function ThreatMeters({ meters }: ThreatMetersProps) {
  if (!meters.meters || meters.meters.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl border border-border bg-card p-4 sm:p-6"
    >
      <div className="mb-5 flex items-center gap-2">
        <span className="text-lg">🎯</span>
        <h3 className="font-syne text-base font-bold text-foreground sm:text-lg">
          Wskaźniki Zagrożeń
        </h3>
      </div>

      <div className="space-y-4">
        {meters.meters.map((meter, index) => {
          const isTrust = meter.id === 'trust';
          const colors = isTrust ? getTrustColors(meter.level) : LEVEL_COLORS[meter.level];
          const label = isTrust ? getTrustLabel(meter.level) : LEVEL_LABELS[meter.level];

          return (
            <motion.div
              key={meter.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {meter.label}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                      colors.badge,
                    )}
                  >
                    {label}
                  </span>
                </div>
                <span className={cn('font-mono text-sm font-bold', colors.text)}>
                  {meter.score}
                </span>
              </div>

              {/* Bar background */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#1a1a1a]">
                <motion.div
                  className={cn('h-full rounded-full', colors.bar)}
                  initial={{ width: 0 }}
                  animate={{ width: `${meter.score}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 + 0.2, ease: 'easeOut' }}
                />
              </div>

              {/* Factors */}
              {meter.factors.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {meter.factors.map((factor, fi) => (
                    <span
                      key={fi}
                      className="inline-block rounded bg-[#1a1a1a] px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {factor}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
