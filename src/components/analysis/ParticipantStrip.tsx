'use client';

import type { PersonMetrics } from '@/lib/parsers/types';

interface ParticipantStripProps {
  participants: string[];
  perPerson: Record<string, PersonMetrics>;
  totalMessages: number;
}

const PERSON_COLORS = ['var(--chart-a)', 'var(--chart-b)'] as const;
const PERSON_BG_CLASSES = ['bg-chart-a', 'bg-chart-b'] as const;

function formatCount(n: number): string {
  return n.toLocaleString('pl-PL');
}

export default function ParticipantStrip({
  participants,
  perPerson,
  totalMessages,
}: ParticipantStripProps) {
  const safeTotal = Math.max(totalMessages, 1);
  const personA = participants[0];
  const personB = participants[1];

  const metricsA = personA ? perPerson[personA] : undefined;
  const metricsB = personB ? perPerson[personB] : undefined;

  const pctA = metricsA ? Math.round((metricsA.totalMessages / safeTotal) * 100) : 50;
  const pctB = metricsB ? Math.round((metricsB.totalMessages / safeTotal) * 100) : 50;

  const avgWordsA =
    metricsA && metricsA.totalMessages > 0
      ? Math.round(metricsA.totalWords / metricsA.totalMessages)
      : 0;
  const avgWordsB =
    metricsB && metricsB.totalMessages > 0
      ? Math.round(metricsB.totalWords / metricsB.totalMessages)
      : 0;

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <div className="flex flex-col items-center gap-4 md:flex-row">
        {/* Person A */}
        {personA && (
          <div className="flex items-center gap-3">
            <div
              className={`flex h-[38px] w-[38px] items-center justify-center rounded-lg text-sm font-bold text-white ${PERSON_BG_CLASSES[0]}`}
            >
              {personA.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] font-bold text-foreground">
                {personA}
              </span>
              <span className="text-xs text-text-muted">
                {formatCount(metricsA?.totalMessages ?? 0)} wiadomości &middot; śr.{' '}
                {avgWordsA} słów
              </span>
            </div>
            <span
              className="font-display text-lg font-bold"
              style={{ color: PERSON_COLORS[0] }}
            >
              {pctA}%
            </span>
          </div>
        )}

        {/* Balance bar */}
        <div className="flex flex-1 gap-0.5 overflow-hidden rounded-sm h-1.5 w-full md:w-auto">
          <div
            className="bg-chart-a rounded-sm transition-all duration-500"
            style={{ width: `${pctA}%` }}
          />
          <div
            className="bg-chart-b rounded-sm transition-all duration-500"
            style={{ width: `${pctB}%` }}
          />
        </div>

        {/* Person B (mirrored) */}
        {personB && (
          <div className="flex items-center gap-3 md:flex-row-reverse">
            <div
              className={`flex h-[38px] w-[38px] items-center justify-center rounded-lg text-sm font-bold text-white ${PERSON_BG_CLASSES[1]}`}
            >
              {personB.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col md:text-right">
              <span className="text-[15px] font-bold text-foreground">
                {personB}
              </span>
              <span className="text-xs text-text-muted">
                {formatCount(metricsB?.totalMessages ?? 0)} wiadomości &middot; śr.{' '}
                {avgWordsB} słów
              </span>
            </div>
            <span
              className="font-display text-lg font-bold"
              style={{ color: PERSON_COLORS[1] }}
            >
              {pctB}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
