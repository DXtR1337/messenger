'use client';

import { useState } from 'react';
import { METRIC_REGISTRY, type MetricMeta } from '@/lib/analysis/metric-registry';

interface ExperimentalBadgeProps {
  /** Key from METRIC_REGISTRY */
  metricKey: string;
  /** Override — use direct MetricMeta instead of registry lookup */
  meta?: MetricMeta;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays a small "Eksperymentalne" badge with an info tooltip for
 * metrics flagged as experimental in the METRIC_REGISTRY.
 *
 * Usage:
 *   <ExperimentalBadge metricKey="integrativeComplexity" />
 *
 * If the metric is not experimental, renders nothing.
 */
export default function ExperimentalBadge({ metricKey, meta, className = '' }: ExperimentalBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const info = meta ?? METRIC_REGISTRY[metricKey];
  if (!info?.isExperimental) return null;

  return (
    <span
      className={`relative inline-flex items-center gap-1 ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-500/20 bg-amber-500/[0.08] px-1.5 py-0.5 text-[10px] font-medium text-amber-400/80">
        <svg
          width="10"
          height="10"
          viewBox="0 0 16 16"
          fill="none"
          className="shrink-0"
        >
          <path
            d="M6 1h4v6l2.5 4.5a1 1 0 01-.87 1.5H4.37a1 1 0 01-.87-1.5L6 7V1z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M5 1h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="7" cy="10" r="0.8" fill="currentColor" />
          <circle cx="9.5" cy="11" r="0.6" fill="currentColor" />
        </svg>
        Eksperymentalne
      </span>

      {showTooltip && (
        <div className="absolute top-full left-0 z-50 mt-2 w-64 rounded-lg border border-white/[0.06] bg-[#111] p-3 shadow-xl">
          <p className="mb-1 text-[11px] font-semibold text-amber-400/90">
            Metryka eksperymentalna
          </p>
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            {info.description}
          </p>
          {info.citation && (
            <p className="mt-1.5 text-[10px] text-muted-foreground/60">
              Źródło: {info.citation}
            </p>
          )}
          {info.limitations && (
            <p className="mt-1 text-[10px] text-amber-500/50">
              Ograniczenia: {info.limitations}
            </p>
          )}
          {info.minSampleSize && (
            <p className="mt-1 text-[10px] text-muted-foreground/50">
              Min. próba: {info.minSampleSize}
            </p>
          )}
        </div>
      )}
    </span>
  );
}
