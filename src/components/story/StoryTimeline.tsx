'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import type { RelationshipTrajectory } from '@/lib/analysis/types';

interface StoryTimelineProps {
  trajectory: RelationshipTrajectory;
  conversationMeta: {
    dateRange: { start: number; end: number };
    durationDays: number;
  };
}

const SIGNIFICANCE_COLORS = {
  positive: 'var(--story-green)',
  neutral: 'var(--story-blue)',
  concerning: 'var(--story-red)',
} as const;

type Significance = keyof typeof SIGNIFICANCE_COLORS;

const SIGNIFICANCE_CYCLE: Significance[] = ['positive', 'neutral', 'concerning'];

function formatPolishDate(timestamp: number): string {
  const date = new Date(timestamp);
  const months = [
    'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
    'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatPolishDateFromYearMonth(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;
  const months = [
    'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
    'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
  ];
  return `${months[monthIndex] ?? monthStr} ${year}`;
}

interface TimelinePoint {
  date: string;
  title: string;
  description: string;
  color: string;
}

function buildTimelinePoints(
  trajectory: RelationshipTrajectory,
  meta: StoryTimelineProps['conversationMeta'],
): TimelinePoint[] {
  const points: TimelinePoint[] = [];

  // Synthetic first point
  points.push({
    date: formatPolishDate(meta.dateRange.start),
    title: 'Pierwsza wiadomość',
    description: `Początek ${meta.durationDays}-dniowej historii konwersacji.`,
    color: SIGNIFICANCE_COLORS.positive,
  });

  // Real inflection points
  trajectory.inflection_points.forEach((point, index) => {
    const significance = SIGNIFICANCE_CYCLE[index % SIGNIFICANCE_CYCLE.length];
    points.push({
      date: formatPolishDateFromYearMonth(point.approximate_date),
      title: point.description,
      description: point.evidence,
      color: SIGNIFICANCE_COLORS[significance],
    });
  });

  // Synthetic last point
  points.push({
    date: formatPolishDate(meta.dateRange.end),
    title: 'Teraz',
    description: `Aktualny stan relacji: ${trajectory.current_phase}. Kierunek: ${
      trajectory.direction === 'strengthening'
        ? 'wzmacnianie'
        : trajectory.direction === 'stable'
          ? 'stabilizacja'
          : trajectory.direction === 'weakening'
            ? 'osłabianie'
            : 'zmienność'
    }.`,
    color: SIGNIFICANCE_COLORS.neutral,
  });

  return points;
}

function TimelinePointCard({
  point,
  index,
  isInView,
  isLast,
}: {
  point: TimelinePoint;
  index: number;
  isInView: boolean;
  isLast: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.5,
        delay: 0.15 + index * 0.12,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="relative flex gap-4 pb-8"
    >
      {/* Left column: dot + connecting line */}
      <div className="relative flex flex-col items-center" style={{ width: 12 }}>
        {/* Dot */}
        <motion.div
          initial={{ scale: 0 }}
          animate={isInView ? { scale: 1 } : {}}
          transition={{
            duration: 0.35,
            delay: 0.1 + index * 0.12,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: point.color,
            flexShrink: 0,
            marginTop: 4,
            boxShadow: `0 0 8px ${point.color}40`,
          }}
        />

        {/* Vertical connector line */}
        {!isLast && (
          <div
            style={{
              width: 2,
              flex: 1,
              background: 'rgba(255, 255, 255, 0.07)',
              marginTop: 4,
            }}
          />
        )}
      </div>

      {/* Right column: date + card */}
      <div className="flex flex-1 flex-col gap-2" style={{ minWidth: 0 }}>
        {/* Date label */}
        <span
          className="font-mono"
          style={{
            fontSize: '0.62rem',
            fontWeight: 500,
            color: 'var(--story-text-3)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {point.date}
        </span>

        {/* Card */}
        <div
          style={{
            background: 'var(--story-bg-card)',
            border: '1px solid var(--story-border)',
            borderRadius: 8,
            padding: 16,
          }}
        >
          <h4
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 700,
              fontSize: '0.92rem',
              color: 'var(--story-text)',
              lineHeight: 1.4,
              marginBottom: 6,
            }}
          >
            {point.title}
          </h4>
          <p
            style={{
              fontFamily: 'var(--font-space-grotesk)',
              fontSize: '0.78rem',
              color: 'var(--story-text-2)',
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            {point.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function StoryTimeline({
  trajectory,
  conversationMeta,
}: StoryTimelineProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 });

  const points = buildTimelinePoints(trajectory, conversationMeta);

  return (
    <div ref={sectionRef} className="flex flex-col">
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <h3
          style={{
            fontFamily: 'var(--font-syne)',
            fontWeight: 800,
            fontSize: '1.3rem',
            color: 'var(--story-text)',
            marginBottom: 4,
          }}
        >
          Oś czasu relacji
        </h3>
        <p
          style={{
            fontFamily: 'var(--font-space-grotesk)',
            fontSize: '0.78rem',
            color: 'var(--story-text-3)',
          }}
        >
          Kluczowe momenty zwrotne w Waszej konwersacji
        </p>
      </motion.div>

      {/* Timeline points */}
      <div className="flex flex-col">
        {points.map((point, index) => (
          <TimelinePointCard
            key={`${point.date}-${index}`}
            point={point}
            index={index}
            isInView={isInView}
            isLast={index === points.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
