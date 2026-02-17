'use client';

import { useMemo, type ReactNode } from 'react';
import { computeKPICards, type KPICardData } from '@/lib/analysis/kpi-utils';
import Sparkline from '@/components/analysis/Sparkline';
import type { QuantitativeAnalysis, ParsedConversation } from '@/lib/parsers/types';

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

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-[18px] transition-all duration-200 hover:-translate-y-px hover:border-[#2a2a2a]">
      {/* Header: icon + trend */}
      <div className="mb-3 flex items-center justify-between">
        <div
          className={`flex h-[38px] w-[38px] items-center justify-center rounded-[10px] ${iconWrapClass}`}
        >
          <IconComponent />
        </div>
        {card.trendDirection !== 'neutral' && (
          <div
            className={`flex items-center gap-0.5 font-display text-[0.72rem] font-semibold ${
              card.trendDirection === 'up' ? 'text-success' : 'text-danger'
            }`}
          >
            {card.trendDirection === 'up' ? <TrendArrowUp /> : <TrendArrowDown />}
            {card.trendPercent > 0 ? '+' : ''}
            {card.trendPercent}%
          </div>
        )}
      </div>

      {/* Value */}
      <div className="font-display text-[1.6rem] font-extrabold tracking-[-0.03em] text-foreground">
        {card.value}
      </div>

      {/* Label */}
      <div className="mt-0.5 text-[0.78rem] text-[#555]">{card.label}</div>

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
    <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <KPICard key={card.id} card={card} />
      ))}
    </div>
  );
}
