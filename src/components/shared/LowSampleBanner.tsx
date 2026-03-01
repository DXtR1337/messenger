'use client';

/**
 * Subtle inline banner indicating a metric was computed from a small sample.
 * Shows "(mała próbka)" with a dashed outline — signals low confidence without blocking display.
 *
 * Usage:
 *   <LowSampleBanner show={messageCount < 100} />
 */
export default function LowSampleBanner({ show, className = '' }: { show: boolean; className?: string }) {
  if (!show) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border border-dashed border-amber-500/25 px-1.5 py-0.5 text-[10px] text-amber-400/60 ${className}`}
    >
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="shrink-0">
        <path
          d="M8 1L1 14h14L8 1z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path d="M8 6v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="8" cy="12" r="0.7" fill="currentColor" />
      </svg>
      mała próbka
    </span>
  );
}
