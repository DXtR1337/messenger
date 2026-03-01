'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/utils';
import type { GottmanResult, HorsemanResult } from '@/lib/analysis/gottman-horsemen';
import { GOTTMAN_DISCLAIMER } from '@/lib/analysis/gottman-horsemen';
import PsychDisclaimer from '@/components/shared/PsychDisclaimer';
import { PSYCH_CITATIONS } from '@/lib/analysis/citations';
import ExperimentalBadge from '@/components/shared/ExperimentalBadge';
import { AIBadge } from '@/components/shared/SourceBadge';

interface GottmanHorsemenProps {
  result?: GottmanResult;
}

const SEVERITY_STYLES: Record<HorsemanResult['severity'], { bg: string; text: string; label: string }> = {
  none: { bg: 'bg-violet-500/10', text: 'text-violet-400', label: 'Nieaktywny' },
  mild: { bg: 'bg-purple-500/10', text: 'text-purple-400', label: 'Łagodny' },
  moderate: { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', label: 'Umiarkowany' },
  severe: { bg: 'bg-fuchsia-400/10', text: 'text-fuchsia-300', label: 'Poważny' },
};

const BAR_COLORS: Record<HorsemanResult['severity'], string> = {
  none: 'bg-violet-500',
  mild: 'bg-purple-500',
  moderate: 'bg-fuchsia-500',
  severe: 'bg-fuchsia-400',
};

export default function GottmanHorsemen({ result }: GottmanHorsemenProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  if (!result) return null;

  return (
    <div ref={ref} className="bg-purple-950/[0.08] border border-purple-500/[0.06] rounded-xl overflow-hidden">
      <div className="flex justify-between items-start px-5 pt-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-[15px] font-bold">
              Czterej jeźdźcy Gottmana
            </h3>
            <AIBadge />
          </div>
          <ExperimentalBadge metricKey="gottmanHorsemen" />
          <p className="text-xs text-muted-foreground mt-0.5">
            4 predyktory rozpadu relacji wg Johna Gottmana
          </p>
        </div>
        <span
          className={cn(
            'text-[11px] font-bold px-2 py-0.5 rounded-full',
            result.activeCount >= 3 ? 'bg-fuchsia-400/15 text-fuchsia-300'
              : result.activeCount >= 2 ? 'bg-fuchsia-500/15 text-fuchsia-400'
              : result.activeCount >= 1 ? 'bg-purple-500/15 text-purple-400'
              : 'bg-violet-500/15 text-violet-400',
          )}
        >
          {result.activeCount}/4
        </span>
      </div>

      <div className="px-5 pt-2">
        <PsychDisclaimer text={GOTTMAN_DISCLAIMER} />
      </div>

      <div className="px-5 pb-4 space-y-3">
        {result.horsemen.map((h, i) => {
          const styles = SEVERITY_STYLES[h.severity];
          return (
            <motion.div
              key={h.id}
              initial={{ opacity: 0, y: 8 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.35, delay: i * 0.08 }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{h.emoji}</span>
                  <span className="text-sm font-medium">{h.label}</span>
                  <span
                    className={cn(
                      'text-[11px] font-medium px-1.5 py-0.5 rounded',
                      styles.bg,
                      styles.text,
                    )}
                  >
                    {styles.label}
                  </span>
                </div>
                <span className="text-xs font-mono text-muted-foreground tabular-nums">
                  {h.score}/100
                </span>
              </div>

              {/* Score bar */}
              <div className="h-1.5 rounded-full bg-border overflow-hidden">
                <motion.div
                  className={cn('h-full rounded-full', BAR_COLORS[h.severity])}
                  initial={{ width: 0 }}
                  animate={isInView ? { width: `${h.score}%` } : { width: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.08 }}
                />
              </div>

              {/* Evidence */}
              {h.evidence.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {h.evidence.map((e, ei) => (
                    <span
                      key={ei}
                      className="text-[11px] text-muted-foreground/80 bg-border/50 px-1.5 py-0.5 rounded"
                    >
                      {e}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Risk summary */}
      <div className="px-5 py-3 border-t border-border bg-card/50">
        <p className="text-xs text-muted-foreground">
          {result.riskLevel}
        </p>
        <PsychDisclaimer
          text="Model Czterech Jeźdźców Gottmana pochodzi z badań laboratoryjnych opartych na mowie, mimice i fizjologii — NIGDY nie był empirycznie walidowany dla analizy tekstu. Badania Al-Mosaiwi & Johnstone (2018, N>6400) potwierdzają związek języka absolutystycznego (zawsze/nigdy) z dystresem (d>3.14), ale nie dla pełnego modelu Czterech Jeźdźców. Wyniki mają charakter eksploracyjny, nie diagnostyczny."
          citation={`${PSYCH_CITATIONS.gottmanShort}; Al-Mosaiwi & Johnstone, 2018`}
          showGenericFooter
        />
      </div>
    </div>
  );
}
