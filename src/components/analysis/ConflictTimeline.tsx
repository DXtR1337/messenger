'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ConflictAnalysis, ConflictType } from '@/lib/parsers/types';

const INITIAL_VISIBLE = 5;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ConflictTimelineProps {
  conflictAnalysis: ConflictAnalysis;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format an ISO date string (YYYY-MM-DD) to Polish locale with year. */
function formatDatePL(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Styling constants
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<ConflictType, string> = {
  escalation: 'Eskalacja',
  cold_silence: 'Zimna cisza',
  resolution: 'Rozwiązanie',
};

const DOT_STYLES: Record<ConflictType, string> = {
  escalation: 'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.3)]',
  cold_silence: 'bg-warning shadow-[0_0_8px_rgba(245,158,11,0.3)]',
  resolution: 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.3)]',
};

const BADGE_STYLES: Record<ConflictType, string> = {
  escalation: 'bg-danger/10 text-danger border-danger/20',
  cold_silence: 'bg-warning/10 text-warning border-warning/20',
  resolution: 'bg-success/10 text-success border-success/20',
};

// ---------------------------------------------------------------------------
// Severity indicator — flame emojis (1-3)
// ---------------------------------------------------------------------------

function SeverityIndicator({ severity }: { severity: number }) {
  const clamped = Math.max(1, Math.min(3, Math.round(severity)));
  return (
    <span className="text-xs select-none" aria-label={`Dotkliwość: ${clamped}/3`}>
      {Array.from({ length: clamped }, (_, i) => (
        <span key={i}>&#x1F525;</span>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Individual event item
// ---------------------------------------------------------------------------

function ConflictEventItem({
  event,
  isLast,
  index,
}: {
  event: ConflictAnalysis['events'][number];
  isLast: boolean;
  index: number;
}) {
  const dotStyle = DOT_STYLES[event.type];
  const badgeStyle = BADGE_STYLES[event.type];

  return (
    <motion.div
      className={cn('flex gap-4 relative', !isLast && 'mb-5')}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: 'easeOut' }}
    >
      {/* Connecting line */}
      {!isLast && (
        <div className="absolute left-[6.25rem] top-6 bottom-[-20px] w-px bg-border" />
      )}

      {/* Date column */}
      <div className="w-24 shrink-0 pt-0.5 text-right pr-2">
        <span className="font-display text-xs text-text-muted">
          {formatDatePL(event.date)}
        </span>
      </div>

      {/* Dot */}
      <div
        className={cn(
          'w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 border-2 border-card z-10 transition-transform duration-300',
          dotStyle,
        )}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Type badge + severity */}
        <div className="flex items-center gap-2 mb-1">
          <span
            className={cn(
              'inline-block text-[11px] font-medium px-1.5 py-0.5 rounded border',
              badgeStyle,
            )}
          >
            {TYPE_LABELS[event.type]}
          </span>
          <SeverityIndicator severity={event.severity} />
        </div>

        {/* Description */}
        <p className="text-sm leading-relaxed mb-1">
          {event.description}
        </p>

        {/* Participants */}
        {event.participants.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {event.participants.map((name) => (
              <span
                key={name}
                className="text-[11px] text-text-muted bg-border/50 px-1.5 py-0.5 rounded"
              >
                {name}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <motion.div
      className="py-8 text-center text-sm text-white/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-2 justify-center">
        <svg
          className="w-5 h-5 text-success"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>Brak wykrytych konfliktów</span>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Pluralization helper for Polish "zdarzenie"
// ---------------------------------------------------------------------------

function pluralizeEvents(n: number): string {
  if (n === 1) return '1 wykryte zdarzenie';
  if (n >= 2 && n <= 4) return `${n} wykryte zdarzenia`;
  return `${n} wykrytych zdarzeń`;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ConflictTimeline({ conflictAnalysis }: ConflictTimelineProps) {
  const { events } = conflictAnalysis;
  const hasEvents = events.length > 0;
  const [expanded, setExpanded] = useState(false);

  const canExpand = events.length > INITIAL_VISIBLE;
  const visibleEvents = expanded ? events : events.slice(0, INITIAL_VISIBLE);
  const hiddenCount = events.length - INITIAL_VISIBLE;

  // Summary counts by type
  const escalationCount = events.filter(e => e.type === 'escalation').length;
  const silenceCount = events.filter(e => e.type === 'cold_silence').length;
  const resolutionCount = events.filter(e => e.type === 'resolution').length;

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-5 pt-4 pb-2">
        <div>
          <h3 className="font-[family-name:var(--font-syne)] text-base font-semibold text-white">
            Detekcja konfliktów
          </h3>
          {hasEvents && (
            <p className="text-xs text-white/50 mt-0.5">
              {pluralizeEvents(events.length)}
            </p>
          )}
        </div>
        {conflictAnalysis.mostConflictProne && (
          <span className="text-[11px] text-text-muted bg-danger/10 text-danger border border-danger/20 px-2 py-0.5 rounded">
            Najczęściej: {conflictAnalysis.mostConflictProne}
          </span>
        )}
      </div>

      {/* Summary bar */}
      {hasEvents && (
        <div className="flex gap-3 px-5 pb-2">
          {escalationCount > 0 && (
            <span className="text-[11px] text-danger">{escalationCount} eskalacji</span>
          )}
          {silenceCount > 0 && (
            <span className="text-[11px] text-warning">{silenceCount} cisz</span>
          )}
          {resolutionCount > 0 && (
            <span className="text-[11px] text-success">{resolutionCount} rozwiązań</span>
          )}
        </div>
      )}

      {/* Timeline or empty state */}
      {hasEvents ? (
        <div className="px-5 py-4 relative">
          <AnimatePresence initial={false}>
            {visibleEvents.map((event, index) => (
              <ConflictEventItem
                key={`${event.type}-${event.timestamp}-${index}`}
                event={event}
                isLast={index === visibleEvents.length - 1 && !canExpand}
                index={Math.min(index, INITIAL_VISIBLE - 1)}
              />
            ))}
          </AnimatePresence>

          {/* Expand/collapse button */}
          {canExpand && (
            <button
              onClick={() => setExpanded(prev => !prev)}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-background py-2 text-xs text-text-muted transition-colors hover:border-border-hover hover:text-foreground"
            >
              {expanded ? (
                <>Zwiń ↑</>
              ) : (
                <>Pokaż jeszcze {hiddenCount} {hiddenCount === 1 ? 'zdarzenie' : hiddenCount < 5 ? 'zdarzenia' : 'zdarzeń'} ↓</>
              )}
            </button>
          )}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
