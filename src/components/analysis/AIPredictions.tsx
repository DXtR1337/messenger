'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/utils';
import type { Prediction } from '@/lib/analysis/types';

interface AIPredictionsProps {
  predictions?: Prediction[];
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'bg-danger/20 text-danger',
  medium: 'bg-warning/20 text-warning',
  low: 'bg-accent/20 text-accent',
};

function getConfidenceLevel(c: number): string {
  if (c >= 70) return 'high';
  if (c >= 40) return 'medium';
  return 'low';
}

export default function AIPredictions({ predictions }: AIPredictionsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  if (!predictions || predictions.length === 0) return null;

  return (
    <div ref={ref} className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 pt-4 pb-2">
        <h3 className="font-display text-[15px] font-bold">
          Predykcje AI
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Prognoza na podstawie wykrytych trendów
        </p>
      </div>

      <div className="px-5 pb-4 space-y-3">
        {predictions.map((pred, i) => {
          const level = getConfidenceLevel(pred.confidence);
          return (
            <motion.div
              key={i}
              className="flex gap-3 items-start"
              initial={{ opacity: 0, x: -10 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
              transition={{ duration: 0.35, delay: i * 0.1 }}
            >
              {/* Confidence badge */}
              <div className="shrink-0 mt-0.5">
                <span
                  className={cn(
                    'inline-flex items-center justify-center text-[10px] font-bold px-1.5 py-0.5 rounded',
                    CONFIDENCE_COLORS[level],
                  )}
                >
                  {pred.confidence}%
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium leading-snug">
                  {pred.prediction}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {pred.timeframe}
                  </span>
                  {pred.basis && (
                    <>
                      <span className="text-border">|</span>
                      <span className="text-[11px] text-muted-foreground">
                        {pred.basis}
                      </span>
                    </>
                  )}
                </div>

                {/* Confidence bar */}
                <div className="mt-1.5 h-1 rounded-full bg-border overflow-hidden">
                  <motion.div
                    className={cn(
                      'h-full rounded-full',
                      level === 'high' ? 'bg-danger' : level === 'medium' ? 'bg-warning' : 'bg-accent',
                    )}
                    initial={{ width: 0 }}
                    animate={isInView ? { width: `${pred.confidence}%` } : { width: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 + i * 0.1 }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="px-5 pb-3">
        <p className="text-[10px] text-muted-foreground/60 italic">
          Predykcje AI oparte na trendach — nie stanowią pewności
        </p>
      </div>
    </div>
  );
}
