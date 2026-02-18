'use client';

import { useMemo, useRef, useState, useEffect, type ReactNode, type RefObject } from 'react';
import { useInView } from 'framer-motion';
import { computeKPICards, type KPICardData } from '@/lib/analysis/kpi-utils';
import Sparkline from '@/components/analysis/Sparkline';
import type { QuantitativeAnalysis, ParsedConversation } from '@/lib/parsers/types';

/* ------------------------------------------------------------------ */
/*  Animated count-up hook using requestAnimationFrame + easeOutCubic */
/* ------------------------------------------------------------------ */

function useAnimatedCounter(
  target: number,
  duration = 1200,
): { value: number; ref: RefObject<HTMLDivElement | null> } {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    if (target === 0) {
      setValue(0);
      return;
    }

    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic: decelerating curve for a polished feel
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [inView, target, duration]);

  return { value, ref };
}

/* ------------------------------------------------------------------ */
/*  Value formatters — mirror the logic in kpi-utils per card type    */
/* ------------------------------------------------------------------ */

function formatResponseTime(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) {
    const minutes = Math.floor(ms / 60_000);
    const seconds = Math.round((ms % 60_000) / 1000);
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.round((ms % 3_600_000) / 60_000);
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function formatAnimatedValue(cardId: string, animatedValue: number): string {
  switch (cardId) {
    case 'avg-response-time':
      return formatResponseTime(animatedValue);
    case 'messages-per-day':
      return animatedValue.toFixed(1);
    case 'total-reactions':
      return Math.round(animatedValue).toLocaleString();
    case 'initiation-ratio':
      return `${Math.round(animatedValue)}%`;
    default:
      return Math.round(animatedValue).toString();
  }
}

interface KPICardsProps {
  quantitative: QuantitativeAnalysis;
  conversation: ParsedConversation;
}

const ICON_COLOR_HEX: Record<KPICardData['iconColor'], string> = {
  blue: '#3b82f6',
  purple: '#a855f7',
  emerald: '#10b981',
  amber: '#f59e0b',
};

const ICON_WRAP_CLASSES: Record<KPICardData['iconColor'], string> = {
  blue: 'bg-accent-subtle text-accent',
  purple: 'bg-chart-b-subtle text-chart-b',
  emerald: 'bg-success-subtle text-success',
  amber: 'bg-warning-subtle text-warning',
};

function ClockIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx={12} cy={12} r={10} />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function MessagesIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

const ICON_MAP: Record<KPICardData['iconType'], () => ReactNode> = {
  clock: ClockIcon,
  messages: MessagesIcon,
  heart: HeartIcon,
  activity: ActivityIcon,
};

function TrendArrowUp() {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" fill="none">
      <path
        d="M6 2.5v7M6 2.5l-3 3M6 2.5l3 3"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrendArrowDown() {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" fill="none">
      <path
        d="M6 9.5v-7M6 9.5l-3-3M6 9.5l3-3"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function KPICard({ card }: { card: KPICardData }) {
  const IconComponent = ICON_MAP[card.iconType];
  const colorHex = ICON_COLOR_HEX[card.iconColor];
  const iconWrapClass = ICON_WRAP_CLASSES[card.iconColor];

  const { value: animatedValue, ref } = useAnimatedCounter(card.numericValue);
  const displayValue = formatAnimatedValue(card.id, animatedValue);

  return (
    <div ref={ref} className="relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-px hover:border-border-hover" style={{ borderTop: `2px solid ${colorHex}` }}>
      {/* Header: icon + trend */}
      <div className="mb-3 flex items-center justify-between">
        <div
          className={`flex h-[38px] w-[38px] items-center justify-center rounded-lg ${iconWrapClass}`}
        >
          <IconComponent />
        </div>
        {card.trendDirection !== 'neutral' && (
          <div
            className={`flex items-center gap-0.5 font-display text-xs font-semibold ${
              card.trendDirection === 'up' ? 'text-success' : 'text-danger'
            }`}
          >
            {card.trendDirection === 'up' ? <TrendArrowUp /> : <TrendArrowDown />}
            <span aria-hidden="true">{card.trendDirection === 'up' ? '\u2191' : '\u2193'}</span>
            {card.trendPercent > 0 ? '+' : ''}
            {card.trendPercent}%
          </div>
        )}
      </div>

      {/* Value — animated count-up from 0 */}
      <div className="font-display text-2xl font-extrabold tracking-[-0.03em] text-foreground">
        {displayValue}
      </div>

      {/* Label */}
      <div className="mt-0.5 text-[13px] text-text-muted">{card.label}</div>

      {/* Sparkline */}
      {card.sparklineData.length > 1 && (
        <div className="mt-2.5">
          <Sparkline data={card.sparklineData} color={colorHex} />
        </div>
      )}
    </div>
  );
}

export default function KPICards({ quantitative, conversation }: KPICardsProps) {
  const cards = useMemo(
    () => computeKPICards(quantitative, conversation),
    [quantitative, conversation],
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <KPICard key={card.id} card={card} />
      ))}
    </div>
  );
}
