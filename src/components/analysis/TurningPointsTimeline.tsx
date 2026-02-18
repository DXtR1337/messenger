'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/utils';
import type { Pass2Result, Pass4Result, InflectionPoint } from '@/lib/analysis/types';

interface TurningPointsTimelineProps {
  pass2?: Pass2Result;
  pass4?: Pass4Result;
  participants: string[];
}

type Significance = 'positive' | 'negative' | 'neutral';

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

const DOT_STYLES: Record<Significance, string> = {
  positive: 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.3)]',
  negative: 'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.3)]',
  neutral: 'bg-accent shadow-[0_0_8px_rgba(59,130,246,0.3)]',
};

function TimelineItem({
  point,
  isLast,
  index,
}: {
  point: InflectionPoint;
  isLast: boolean;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  const significance = classifySignificance(
    `${point.description} ${point.evidence}`,
  );
  const dotStyle = DOT_STYLES[significance];

  return (
    <motion.div
      ref={ref}
      className={cn('flex gap-4 mb-5 relative', isLast && 'mb-0')}
      initial={{ opacity: 0, x: -12 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -12 }}
      transition={{ duration: 0.4, delay: index * 0.1, ease: 'easeOut' }}
    >
      {/* Connecting line */}
      {!isLast && (
        <div className="absolute -left-3.5 top-6 bottom-[-20px] w-px bg-border" />
      )}

      {/* Date */}
      {point.approximate_date && (
        <span className="font-display text-xs text-text-muted w-20 shrink-0 pt-0.5">
          {point.approximate_date}
        </span>
      )}

      {/* Dot */}
      <div
        className={cn(
          'w-2.5 h-2.5 rounded-full shrink-0 mt-1 border-2 border-card',
          dotStyle,
        )}
      />

      {/* Content */}
      <div className="flex-1">
        <div className="font-bold text-sm mb-0.5">
          {point.description}
        </div>
        {point.evidence && (
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            {point.evidence}
          </p>
        )}
      </div>
    </motion.div>
  );
}

export default function TurningPointsTimeline({
  pass2,
  pass4,
  participants,
}: TurningPointsTimelineProps) {
  // Gather turning points from pass4 inflection points
  const inflectionPoints: InflectionPoint[] = [];

  if (pass4?.relationship_trajectory?.inflection_points) {
    inflectionPoints.push(...pass4.relationship_trajectory.inflection_points);
  }

  // If no data available, don't render
  if (inflectionPoints.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex justify-between items-center px-5 pt-4">
        <div>
          <h3 className="font-display text-[15px] font-bold">
            Punkty zwrotne
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Kluczowe momenty wykryte przez AI
          </p>
        </div>
      </div>
      <div className="px-5 py-4 pl-10 relative">
        {inflectionPoints.map((point, index) => (
          <TimelineItem
            key={`${point.approximate_date}-${index}`}
            point={point}
            isLast={index === inflectionPoints.length - 1}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
