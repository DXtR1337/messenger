'use client';

import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/utils';
import type { Pass2Result, Pass4Result } from '@/lib/analysis/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TurningPointsTimelineProps {
  pass2?: Pass2Result;
  pass4?: Pass4Result;
  participants: string[];
  dateRange?: { start: number; end: number };
}

type Significance = 'positive' | 'negative' | 'neutral';

type EntrySource = 'inflection' | 'finding' | 'flag' | 'insight';

interface TimelineEntry {
  date: string;
  title: string;
  detail: string;
  significance: Significance;
  source: EntrySource;
}

// ---------------------------------------------------------------------------
// Classification helpers
// ---------------------------------------------------------------------------

const POSITIVE_KEYWORDS = [
  'wzrost', 'poprawa', 'powrót', 'stabiliz', 'rozwój',
  'growth', 'increase', 'return', 'positive', 'strengthen',
  'deepen', 'improve', 'warm', 'closer', 'progress',
];

const NEGATIVE_KEYWORDS = [
  'spadek', 'cisza', 'konflikt', 'silence', 'decline',
  'conflict', 'negative', 'distance', 'withdraw', 'tension',
  'cool', 'weaken', 'argument', 'crisis', 'break',
];

function classifySignificance(description: string): Significance {
  const lower = description.toLowerCase();

  if (POSITIVE_KEYWORDS.some((kw) => lower.includes(kw))) {
    return 'positive';
  }
  if (NEGATIVE_KEYWORDS.some((kw) => lower.includes(kw))) {
    return 'negative';
  }
  return 'neutral';
}

// ---------------------------------------------------------------------------
// Date sanitization — fix Gemini hallucinated dates like "2824-05"
// ---------------------------------------------------------------------------

const MONTHS_PL = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

function sanitizeDate(raw: string, dateRange?: { start: number; end: number }): string {
  if (!raw) return '';
  const m = raw.match(/^(\d{4})-(\d{2})$/);
  if (!m) return raw;
  let year = parseInt(m[1], 10);
  let month = parseInt(m[2], 10);

  // Fix obvious Gemini hallucinations: year in the future or < 1990
  const currentYear = new Date().getFullYear();
  if (year > currentYear) {
    const fixed = parseInt(m[1][0] + '0' + m[1].slice(2), 10);
    if (fixed >= 1990 && fixed <= currentYear) year = fixed;
    else year = currentYear;
  }
  if (year < 1990) year = currentYear;
  if (month < 1 || month > 12) return `${year}`;

  // Clamp to actual conversation date range
  if (dateRange) {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth() + 1;
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth() + 1;

    const dateVal = year * 12 + month;
    const startVal = startYear * 12 + startMonth;
    const endVal = endYear * 12 + endMonth;

    if (dateVal < startVal) {
      year = startYear;
      month = startMonth;
    } else if (dateVal > endVal) {
      year = endYear;
      month = endMonth;
    }
  }

  return `${MONTHS_PL[month - 1]} ${year}`;
}

// ---------------------------------------------------------------------------
// Data aggregation — build unified timeline entries from pass2 + pass4
// ---------------------------------------------------------------------------

function buildTimelineEntries(
  pass2?: Pass2Result,
  pass4?: Pass4Result,
  dateRange?: { start: number; end: number },
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  // 1. Inflection points from pass4 (have dates)
  if (pass4?.relationship_trajectory?.inflection_points) {
    for (const ip of pass4.relationship_trajectory.inflection_points) {
      entries.push({
        date: sanitizeDate(ip.approximate_date || '', dateRange),
        title: ip.description ?? '',
        detail: ip.evidence ?? '',
        significance: classifySignificance(`${ip.description ?? ''} ${ip.evidence ?? ''}`),
        source: 'inflection',
      });
    }
  }

  // 2. Key findings from pass4 (no date)
  if (pass4?.key_findings) {
    for (const kf of pass4.key_findings) {
      entries.push({
        date: '',
        title: kf.finding ?? '',
        detail: kf.detail ?? '',
        significance: kf.significance === 'concerning' ? 'negative' : kf.significance,
        source: 'finding',
      });
    }
  }

  // 3. Red flags from pass2 — only moderate+ severity
  if (pass2?.red_flags) {
    for (const rf of pass2.red_flags) {
      if (rf.severity === 'moderate' || rf.severity === 'severe') {
        entries.push({
          date: '',
          title: rf.pattern ?? '',
          detail: rf.context_note || '',
          significance: 'negative',
          source: 'flag',
        });
      }
    }
  }

  // 4. Green flags from pass2
  if (pass2?.green_flags) {
    for (const gf of pass2.green_flags) {
      entries.push({
        date: '',
        title: gf.pattern ?? '',
        detail: '',
        significance: 'positive',
        source: 'flag',
      });
    }
  }

  // 5. High-priority insights from pass4
  if (pass4?.insights) {
    for (const ins of pass4.insights) {
      if (ins.priority === 'high') {
        entries.push({
          date: '',
          title: ins.insight ?? '',
          detail: ins.for ? `Dla: ${ins.for}` : '',
          significance: 'neutral',
          source: 'insight',
        });
      }
    }
  }

  // Sort: entries with dates first (chronological), then dateless entries
  entries.sort((a, b) => {
    const aHasDate = a.date.length > 0;
    const bHasDate = b.date.length > 0;

    if (aHasDate && !bHasDate) return -1;
    if (!aHasDate && bHasDate) return 1;

    // Both have dates — compare chronologically (best-effort string sort)
    if (aHasDate && bHasDate) {
      return a.date.localeCompare(b.date);
    }

    // Both dateless — group by source: inflection > finding > flag > insight
    const sourceOrder: Record<EntrySource, number> = {
      inflection: 0,
      finding: 1,
      flag: 2,
      insight: 3,
    };
    return sourceOrder[a.source] - sourceOrder[b.source];
  });

  return entries;
}

// ---------------------------------------------------------------------------
// Styling constants — purple-dominant palette
// ---------------------------------------------------------------------------

const DOT_CONFIG: Record<Significance, { bg: string; ring: string; glow: string; color: string }> = {
  positive: {
    bg: 'bg-violet-300',
    ring: 'ring-violet-400/30',
    glow: 'rgba(192,132,252,0.6)',
    color: 'rgba(192,132,252,0.5)',
  },
  negative: {
    bg: 'bg-fuchsia-400',
    ring: 'ring-fuchsia-400/30',
    glow: 'rgba(232,121,249,0.5)',
    color: 'rgba(232,121,249,0.4)',
  },
  neutral: {
    bg: 'bg-purple-400',
    ring: 'ring-purple-400/30',
    glow: 'rgba(168,85,247,0.5)',
    color: 'rgba(168,85,247,0.4)',
  },
};

const SOURCE_LABELS: Record<EntrySource, string> = {
  inflection: 'Punkt zwrotny',
  finding: 'Odkrycie',
  flag: 'Flaga',
  insight: 'Wgląd',
};

const SOURCE_ICONS: Record<EntrySource, React.ReactNode> = {
  inflection: (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-60">
      <path d="M5 1L9 5L5 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1 5H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  finding: (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-60">
      <circle cx="5" cy="4" r="3" stroke="currentColor" strokeWidth="1" />
      <path d="M7 7L9 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  flag: (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-60">
      <path d="M2 1V9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M2 1.5L8 3L2 5" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" />
    </svg>
  ),
  insight: (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-60">
      <path d="M5 1L6.5 3.5L9.5 4L7.2 6.2L7.8 9.2L5 7.7L2.2 9.2L2.8 6.2L0.5 4L3.5 3.5L5 1Z" stroke="currentColor" strokeWidth="0.8" fill="currentColor" fillOpacity="0.15" />
    </svg>
  ),
};

const SOURCE_BADGE_STYLES: Record<EntrySource, string> = {
  inflection: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
  finding: 'bg-violet-500/15 text-violet-300 border-violet-500/25',
  flag: 'bg-fuchsia-500/12 text-fuchsia-300 border-fuchsia-500/20',
  insight: 'bg-indigo-500/12 text-indigo-300 border-indigo-500/20',
};

// ---------------------------------------------------------------------------
// Timeline node — static dot on the vertical line (no motion.div)
// ---------------------------------------------------------------------------

function TimelineNode({ significance, visible, delay }: { significance: Significance; visible: boolean; delay: string }) {
  const config = DOT_CONFIG[significance];

  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: 24, height: 24 }}>
      <div
        className={cn('h-3 w-3 rounded-full transition-transform duration-400', config.bg, visible ? 'scale-100' : 'scale-0')}
        style={{ boxShadow: `0 0 10px ${config.glow}`, transitionDelay: delay }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline item — CSS transition driven (no per-item useInView)
// ---------------------------------------------------------------------------

function TimelineItem({
  entry,
  isLast,
  index,
  visible,
}: {
  entry: TimelineEntry;
  isLast: boolean;
  index: number;
  visible: boolean;
}) {
  const hasDate = entry.date.length > 0;
  const config = DOT_CONFIG[entry.significance];
  const delay = `${0.1 + index * 0.06}s`;

  return (
    <div className={cn('tp-entry relative flex gap-4 sm:gap-5', isLast && 'pb-0')}>
      {/* ── Left column: node + connector ── */}
      <div className="flex shrink-0 flex-col items-center" style={{ width: 24 }}>
        <TimelineNode significance={entry.significance} visible={visible} delay={delay} />

        {/* Vertical connector line */}
        {!isLast && (
          <div
            className={cn('tp-connector w-px flex-1 transition-[transform,opacity] duration-500 origin-top', visible ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0')}
            style={{
              background: `linear-gradient(180deg, ${config.color} 0%, rgba(168,85,247,0.15) 50%, rgba(168,85,247,0.04) 100%)`,
              minHeight: 24,
              transitionDelay: `${0.15 + index * 0.06}s`,
            }}
          />
        )}
      </div>

      {/* ── Right column: content card ── */}
      <div
        className={cn(
          'tp-card group relative mb-6 flex-1 overflow-hidden rounded-xl',
          'border border-purple-500/[0.08] bg-purple-950/[0.15]',
          'transition-[opacity,transform,border-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
          'hover:bg-purple-900/[0.12] hover:border-purple-400/20 hover:shadow-[0_4px_24px_-4px_rgba(168,85,247,0.15)]',
          isLast && 'mb-0',
          visible ? 'opacity-100 translate-x-0' : cn('opacity-0', index % 2 === 0 ? '-translate-x-4' : 'translate-x-4'),
        )}
        style={{ transitionDelay: delay }}
      >
        {/* Left accent stripe */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[2px]"
          style={{
            background: `linear-gradient(180deg, ${config.glow} 0%, ${config.color} 60%, transparent 100%)`,
            boxShadow: `2px 0 12px ${config.color}`,
          }}
        />

        {/* Top accent line */}
        <div
          className="absolute inset-x-0 top-0 h-px opacity-40"
          style={{
            background: `linear-gradient(90deg, transparent 10%, ${config.color} 30%, ${config.glow} 50%, ${config.color} 70%, transparent 90%)`,
          }}
        />

        {/* Background glow gradient */}
        <div
          className="pointer-events-none absolute inset-0 rounded-xl opacity-40"
          style={{
            background: `linear-gradient(135deg, ${config.color.replace('0.4', '0.06').replace('0.5', '0.06')} 0%, transparent 50%)`,
          }}
        />

        <div className="relative px-4 py-3.5 sm:px-5 sm:py-4">
          {/* Top row: date/badge + source */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {hasDate && (
              <span
                className="font-mono text-[11px] font-semibold tracking-wider text-purple-200/80"
                style={{ textShadow: '0 0 8px rgba(168,85,247,0.3)' }}
              >
                {entry.date}
              </span>
            )}
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider',
                SOURCE_BADGE_STYLES[entry.source],
              )}
            >
              {SOURCE_ICONS[entry.source]}
              {SOURCE_LABELS[entry.source]}
            </span>
          </div>

          {/* Title */}
          <h4 className="text-sm font-semibold leading-snug text-purple-50/90">
            {entry.title}
          </h4>

          {/* Detail */}
          {entry.detail && (
            <p className="mt-1.5 text-[12px] leading-relaxed text-purple-200/50">
              {entry.detail}
            </p>
          )}
        </div>

        {/* Hover glow */}
        <div
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: `radial-gradient(ellipse 70% 100% at 5% 50%, ${config.color.replace(')', ',0.12)')}, transparent 60%)`,
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TurningPointsTimeline({
  pass2,
  pass4,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  participants,
  dateRange,
}: TurningPointsTimelineProps) {
  const entries = buildTimelineEntries(pass2, pass4, dateRange);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-60px' });

  // If no data available, don't render
  if (entries.length === 0) return null;

  const countLabel = `${entries.length} ${entries.length === 1 ? 'element' : entries.length < 5 ? 'elementy' : 'elementów'}`;

  return (
    <div ref={containerRef} className="relative">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="font-[var(--font-syne)] text-lg font-bold text-purple-50/90">
            Punkty zwrotne
          </h3>
          <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.15em] text-purple-300/40">
            Kluczowe momenty wykryte przez AI
          </p>
        </div>
        <span
          className={cn(
            'flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/[0.08] px-3 py-1.5 font-mono text-[10px] tracking-wider text-purple-300/70',
            'transition-[opacity,transform] duration-400',
            isInView ? 'opacity-100 scale-100' : 'opacity-0 scale-75',
          )}
          style={{ transitionDelay: '0.3s' }}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-400/80" style={{ boxShadow: '0 0 6px rgba(168,85,247,0.5)' }} />
          </span>
          {countLabel}
        </span>
      </div>

      {/* Timeline */}
      <div className="relative pl-2">
        {/* Background timeline track */}
        <div
          className="absolute left-[13px] top-0 bottom-0 w-px"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(168,85,247,0.15) 5%, rgba(168,85,247,0.08) 90%, transparent 100%)',
          }}
          aria-hidden="true"
        />
        {/* Timeline progress glow */}
        {isInView && (
          <div
            className="absolute left-[12px] top-0 bottom-0 w-[3px] rounded-full opacity-50"
            style={{
              background: 'linear-gradient(180deg, rgba(192,132,252,0.4) 0%, rgba(168,85,247,0.2) 60%, rgba(168,85,247,0.05) 100%)',
            }}
            aria-hidden="true"
          />
        )}

        {entries.map((entry, index) => (
          <TimelineItem
            key={`${entry.source}-${(entry.title ?? '').slice(0, 30)}-${index}`}
            entry={entry}
            isLast={index === entries.length - 1}
            index={index}
            visible={isInView}
          />
        ))}
      </div>
    </div>
  );
}
