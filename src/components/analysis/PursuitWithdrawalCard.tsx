'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';
import type { PursuitWithdrawalAnalysis } from '@/lib/parsers/types';

interface PursuitWithdrawalCardProps {
  analysis: PursuitWithdrawalAnalysis | undefined;
}

function TrendIcon({ trend }: { trend: number }) {
  if (trend > 0.05) return <TrendingUp className="h-4 w-4 text-red-400" />;
  if (trend < -0.05) return <TrendingDown className="h-4 w-4 text-emerald-400" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function trendLabel(trend: number): string {
  const pct = Math.abs(Math.round(trend * 100));
  if (trend > 0.05) return '+' + pct + '% dłuższe';
  if (trend < -0.05) return '-' + pct + '% krótsze';
  return 'stabilny';
}

function trendColor(trend: number): string {
  if (trend > 0.05) return 'text-red-400';
  if (trend < -0.05) return 'text-emerald-400';
  return 'text-muted-foreground';
}

export default function PursuitWithdrawalCard({ analysis }: PursuitWithdrawalCardProps) {
  if (!analysis) return null;

  const { pursuer, withdrawer, cycleCount, avgCycleDurationMs, escalationTrend } = analysis;
  const isEscalating = escalationTrend > 0.2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl border border-border bg-card p-6"
    >
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
          <AlertTriangle className="h-5 w-5 text-orange-400" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">
            Pętla pursuit-withdrawal
          </h3>
          <p className="text-xs text-muted-foreground">
            Cykl gonienia i ucieczki
          </p>
        </div>
      </div>

      {/* Cycle visualization */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-6 flex items-center justify-center gap-3"
      >
        {/* Pursuer */}
        <div className="flex flex-col items-center gap-1">
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-4 py-2">
            <span className="text-sm font-semibold text-blue-400 truncate max-w-[120px] block">
              {pursuer}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">gonicz</span>
        </div>

        {/* Arrow: pursuer -> withdrawer */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1 text-muted-foreground">
            <span className="text-[10px]">goni</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
          <div className="flex items-center gap-1 text-muted-foreground rotate-180">
            <span className="text-[10px] rotate-180">ucieka</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Withdrawer */}
        <div className="flex flex-col items-center gap-1">
          <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 px-4 py-2">
            <span className="text-sm font-semibold text-purple-400 truncate max-w-[120px] block">
              {withdrawer}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">uciekinier</span>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <p className="text-2xl font-display font-bold text-foreground">
            {cycleCount}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Wykryte cykle</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <p className="text-2xl font-display font-bold text-foreground">
            {formatDuration(avgCycleDurationMs)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Śr. czas wycofania</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-1">
            <TrendIcon trend={escalationTrend} />
            <span className={cn('text-sm font-mono font-bold', trendColor(escalationTrend))}>
              {trendLabel(escalationTrend)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Trend eskalacji</p>
        </motion.div>
      </div>

      {/* Escalation warning */}
      {isEscalating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3"
        >
          <p className="text-xs text-red-400 text-center leading-relaxed">
            Cykle się wydłużają — sytuacja się pogarsza.
            Wycofania stają się coraz dłuższe, co może wskazywać na narastającą frustrację.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
