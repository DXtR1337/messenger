'use client';

import { motion, useInView } from 'framer-motion';
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

function sanitizeDate(raw: string): string {
  if (!raw) return '';
  const m = raw.match(/^(\d{4})-(\d{2})$/);
  if (!m) return raw;
  let year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  // Fix obvious Gemini hallucinations: year > 2026 or < 1990
  if (year > 2026) {
    // Try swapping common digit errors: 2824→2024, 2924→2024
    const fixed = parseInt(m[1][0] + '0' + m[1].slice(2), 10);
    if (fixed >= 1990 && fixed <= 2026) year = fixed;
    else year = 2024;
  }
  if (year < 1990) year = 2024;
  if (month < 1 || month > 12) return `${year}`;
  return `${MONTHS_PL[month - 1]} ${year}`;
}

// ---------------------------------------------------------------------------
// Data aggregation — build unified timeline entries from pass2 + pass4
// ---------------------------------------------------------------------------

function buildTimelineEntries(
  pass2?: Pass2Result,
  pass4?: Pass4Result,
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  // 1. Inflection points from pass4 (have dates)
  if (pass4?.relationship_trajectory?.inflection_points) {
    for (const ip of pass4.relationship_trajectory.inflection_points) {
      entries.push({
        date: sanitizeDate(ip.approximate_date || ''),
        title: ip.description,
        detail: ip.evidence,
        significance: classifySignificance(`${ip.description} ${ip.evidence}`),
        source: 'inflection',
      });
    }
  }

  // 2. Key findings from pass4 (no date)
  if (pass4?.key_findings) {
    for (const kf of pass4.key_findings) {
      entries.push({
        date: '',
        title: kf.finding,
        detail: kf.detail,
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
          title: rf.pattern,
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
        title: gf.pattern,
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
          title: ins.insight,
          detail: `Dla: ${ins.for}`,
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
// Styling constants
// ---------------------------------------------------------------------------

const DOT_STYLES: Record<Significance, string> = {
  positive: 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.3)]',
  negative: 'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.3)]',
  neutral: 'bg-accent shadow-[0_0_8px_rgba(59,130,246,0.3)]',
};

const SOURCE_LABELS: Record<EntrySource, string> = {
  inflection: 'Punkt zwrotny',
  finding: 'Kluczowe odkrycie',
  flag: 'Flaga',
  insight: 'Wgląd',
};

const SOURCE_BADGE_STYLES: Record<EntrySource, string> = {
  inflection: 'bg-accent/10 text-accent border-accent/20',
  finding: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  flag: 'bg-warning/10 text-warning border-warning/20',
  insight: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
};

// ---------------------------------------------------------------------------
// Timeline item component
// ---------------------------------------------------------------------------

function TimelineItem({
  entry,
  isLast,
  index,
}: {
  entry: TimelineEntry;
  isLast: boolean;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  const dotStyle = DOT_STYLES[entry.significance];
  const hasDate = entry.date.length > 0;

  return (
    <motion.div
      ref={ref}
      className={cn('flex gap-4 mb-5 relative', isLast && 'mb-0')}
      initial={{ opacity: 0, x: -12 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -12 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: 'easeOut' }}
    >
      {/* Connecting line */}
      {!isLast && (
        <div className="absolute -left-3.5 top-6 bottom-[-20px] w-px bg-border" />
      )}

      {/* Date or source badge — fixed-width column */}
      <div className="w-24 shrink-0 pt-0.5">
        {hasDate ? (
          <span className="font-display text-xs text-text-muted">
            {entry.date}
          </span>
        ) : (
          <span
            className={cn(
              'inline-block text-[10px] font-medium px-1.5 py-0.5 rounded border',
              SOURCE_BADGE_STYLES[entry.source],
            )}
          >
            {SOURCE_LABELS[entry.source]}
          </span>
        )}
      </div>

      {/* Dot */}
      <div
        className={cn(
          'w-2.5 h-2.5 rounded-full shrink-0 mt-1 border-2 border-card',
          dotStyle,
        )}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm mb-0.5 leading-snug">
          {entry.title}
        </div>
        {entry.detail && (
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            {entry.detail}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TurningPointsTimeline({
  pass2,
  pass4,
  participants,
}: TurningPointsTimelineProps) {
  const entries = buildTimelineEntries(pass2, pass4);

  // If no data available, don't render
  if (entries.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex justify-between items-center px-5 pt-4">
        <div>
          <h3 className="font-display text-[15px] font-bold">
            Punkty zwrotne
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Kluczowe momenty i odkrycia wykryte przez AI
          </p>
        </div>
        <span className="text-xs text-text-muted tabular-nums">
          {entries.length} {entries.length === 1 ? 'element' : entries.length < 5 ? 'elementy' : 'elementów'}
        </span>
      </div>
      <div className="px-5 py-4 pl-10 relative">
        {entries.map((entry, index) => (
          <TimelineItem
            key={`${entry.source}-${entry.title.slice(0, 30)}-${index}`}
            entry={entry}
            isLast={index === entries.length - 1}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
