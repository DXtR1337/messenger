'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/utils';
import type { GottmanResult, HorsemanResult } from '@/lib/analysis/gottman-horsemen';

interface GottmanHorsemenProps {
  result?: GottmanResult;
}

const SEVERITY_STYLES: Record<HorsemanResult['severity'], { bg: string; text: string; label: string }> = {
  none: { bg: 'bg-success/10', text: 'text-success', label: 'Nieaktywny' },
  mild: { bg: 'bg-warning/10', text: 'text-warning', label: 'Łagodny' },
  moderate: { bg: 'bg-orange-500/10', text: 'text-orange-400', label: 'Umiarkowany' },
  severe: { bg: 'bg-danger/10', text: 'text-danger', label: 'Poważny' },
};

const BAR_COLORS: Record<HorsemanResult['severity'], string> = {
  none: 'bg-success',
  mild: 'bg-warning',
  moderate: 'bg-orange-500',
  severe: 'bg-danger',
};

export default function GottmanHorsemen({ result }: GottmanHorsemenProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  if (!result) return null;

  return (
    <div ref={ref} className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex justify-between items-start px-5 pt-4 pb-2">
        <div>
          <h3 className="font-display text-[15px] font-bold">
            Czterej jeźdźcy Gottmana
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            4 predyktory rozpadu relacji wg Johna Gottmana
          </p>
        </div>
        <span
          className={cn(
            'text-[11px] font-bold px-2 py-0.5 rounded-full',
            result.activeCount >= 3 ? 'bg-danger/15 text-danger'
              : result.activeCount >= 2 ? 'bg-warning/15 text-warning'
              : result.activeCount >= 1 ? 'bg-orange-500/15 text-orange-400'
              : 'bg-success/15 text-success',
          )}
        >
          {result.activeCount}/4
        </span>
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
                      'text-[10px] font-medium px-1.5 py-0.5 rounded',
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
                      className="text-[10px] text-muted-foreground/80 bg-border/50 px-1.5 py-0.5 rounded"
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
      </div>
    </div>
  );
}
