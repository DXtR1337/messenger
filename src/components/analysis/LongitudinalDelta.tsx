'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { DeltaMetrics, DeltaMetric } from '@/lib/analysis/delta';

interface LongitudinalDeltaProps {
  delta: DeltaMetrics;
}

// ── Helpers ──────────────────────────────────────────────

function formatPreviousDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format a metric value with its unit for display.
 * Response times (ms) get human-readable formatting.
 */
function formatValue(value: number, unit: string): string {
  if (unit === 'ms') {
    if (value < 60_000) return `${Math.round(value / 1000)}s`;
    if (value < 3_600_000) return `${Math.round(value / 60_000)}min`;
    const h = Math.floor(value / 3_600_000);
    const m = Math.round((value % 3_600_000) / 60_000);
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  if (unit === '%') {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  }

  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Math.round(value).toLocaleString('pl-PL');
}

function formatDeltaPercent(deltaPercent: number): string {
  const sign = deltaPercent >= 0 ? '+' : '';
  return `${sign}${deltaPercent.toFixed(1)}%`;
}

// ── Threshold: below 2% absolute is considered neutral visually ──

const NEUTRAL_THRESHOLD = 2;

function getVisualDirection(metric: DeltaMetric): 'up' | 'down' | 'neutral' {
  if (Math.abs(metric.deltaPercent) < NEUTRAL_THRESHOLD) return 'neutral';
  return metric.direction;
}

// ── Animations ──────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

// ── Metric Card ─────────────────────────────────────────

function MetricCard({ metric }: { metric: DeltaMetric }) {
  const visual = getVisualDirection(metric);

  const DeltaIcon =
    visual === 'up' ? TrendingUp : visual === 'down' ? TrendingDown : Minus;

  // Color depends on whether the change is an improvement
  const colorClass =
    visual === 'neutral'
      ? 'text-muted-foreground'
      : metric.isImprovement
        ? 'text-emerald-400'
        : 'text-red-400';

  const bgClass =
    visual === 'neutral'
      ? 'bg-muted-foreground/10'
      : metric.isImprovement
        ? 'bg-emerald-400/10'
        : 'bg-red-400/10';

  return (
    <motion.div
      variants={cardVariants}
      className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-border/80"
    >
      <div className="space-y-3">
        {/* Label */}
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {metric.label}
        </p>

        {/* Current value + delta badge */}
        <div className="flex items-end justify-between gap-2">
          <p className="font-mono text-2xl font-bold text-foreground">
            {formatValue(metric.current, metric.unit)}
          </p>

          <div
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              bgClass,
              colorClass,
            )}
          >
            <DeltaIcon className="size-3" />
            <span className="font-mono">
              {formatDeltaPercent(metric.deltaPercent)}
            </span>
          </div>
        </div>

        {/* Previous value */}
        <p className="text-[11px] text-muted-foreground">
          Poprzednio:{' '}
          <span className="font-mono">
            {formatValue(metric.previous, metric.unit)}
          </span>
        </p>
      </div>
    </motion.div>
  );
}

// ── Main Component ──────────────────────────────────────

export default function LongitudinalDelta({ delta }: LongitudinalDeltaProps) {
  const previousDateFormatted = formatPreviousDate(delta.previousCreatedAt);

  const daysLabel =
    delta.daysSinceLastAnalysis === 1
      ? '1 dzień temu'
      : delta.daysSinceLastAnalysis < 5
        ? `${delta.daysSinceLastAnalysis} dni temu`
        : `${delta.daysSinceLastAnalysis} dni temu`;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
          Zmiany od ostatniej analizy
        </h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="size-3.5" />
          <span>
            {daysLabel} &middot; {previousDateFormatted}
          </span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <motion.div
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        {delta.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </motion.div>

      {/* Link to previous analysis */}
      <Link
        href={`/analysis/${delta.previousAnalysisId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Zobacz poprzednią analizę
        <span aria-hidden="true">&rarr;</span>
      </Link>
    </section>
  );
}
