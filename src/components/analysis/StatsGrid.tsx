'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import {
  HelpCircle,
  Heart,
  Layers,
  VolumeX,
  BookOpen,
  Trash2,
  BookText,
  MessagesSquare,
} from 'lucide-react';
import { formatDuration, formatNumber } from '@/lib/utils';
import type { QuantitativeAnalysis } from '@/lib/parsers/types';

interface StatsGridProps {
  quantitative: QuantitativeAnalysis;
  participants: string[];
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  breakdown: Array<{ name: string; value: string; index: number }>;
  delay: number;
}

const PERSON_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

function StatCard({ icon, label, value, breakdown, delay }: StatCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      className="h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.4, delay }}
    >
      <div className="h-full rounded-xl border border-border bg-card p-3 sm:p-5 transition-colors">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            {icon}
            <span className="text-xs uppercase tracking-wider">{label}</span>
          </div>
          <p className="font-mono text-xl sm:text-2xl font-bold text-foreground">{value}</p>
          {breakdown.length > 0 && (
            <div className="space-y-1 border-t border-border pt-2">
              {breakdown.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between text-[11px] sm:text-xs">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block size-2 rounded-full"
                      style={{ backgroundColor: PERSON_COLORS[entry.index % PERSON_COLORS.length] }}
                    />
                    <span className="text-muted-foreground truncate max-w-[80px] sm:max-w-none">{entry.name}</span>
                  </span>
                  <span className="font-mono font-medium text-foreground">{entry.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function StatsGrid({ quantitative, participants }: StatsGridProps) {
  const { timing, engagement, perPerson } = quantitative;

  const stats: Array<Omit<StatCardProps, 'delay'>> = [
    {
      icon: <HelpCircle className="size-4" />,
      label: 'Zadane pytania',
      value: formatNumber(
        participants.reduce((sum, p) => sum + (perPerson[p]?.questionsAsked ?? 0), 0),
      ),
      breakdown: participants.map((name, index) => ({
        name,
        value: formatNumber(perPerson[name]?.questionsAsked ?? 0),
        index,
      })),
    },
    {
      icon: <Heart className="size-4" />,
      label: 'Wskaźnik reakcji',
      value: (() => {
        const rates = participants
          .map((p) => engagement.reactionRate[p])
          .filter((v): v is number => v !== undefined);
        const avg = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
        return `${(avg * 100).toFixed(1)}%`;
      })(),
      breakdown: participants.map((name, index) => ({
        name,
        value: `${((engagement.reactionRate[name] ?? 0) * 100).toFixed(1)}%`,
        index,
      })),
    },
    {
      icon: <Layers className="size-4" />,
      label: 'Łączna liczba sesji',
      value: formatNumber(engagement.totalSessions),
      breakdown: [],
    },
    {
      icon: <VolumeX className="size-4" />,
      label: 'Najdłuższa cisza',
      value: formatDuration(timing.longestSilence.durationMs),
      breakdown: [],
    },
    {
      icon: <BookOpen className="size-4" />,
      label: 'Łączna liczba słów',
      value: formatNumber(
        participants.reduce((sum, p) => sum + (perPerson[p]?.totalWords ?? 0), 0),
      ),
      breakdown: participants.map((name, index) => ({
        name,
        value: formatNumber(perPerson[name]?.totalWords ?? 0),
        index,
      })),
    },
    {
      icon: <Trash2 className="size-4" />,
      label: 'Niewysłane wiadomości',
      value: formatNumber(
        participants.reduce((sum, p) => sum + (perPerson[p]?.unsentMessages ?? 0), 0),
      ),
      breakdown: participants.map((name, index) => ({
        name,
        value: formatNumber(perPerson[name]?.unsentMessages ?? 0),
        index,
      })),
    },
    {
      icon: <BookText className="size-4" />,
      label: 'Bogactwo słownictwa',
      value: (() => {
        const richness = participants
          .map((p) => perPerson[p]?.vocabularyRichness)
          .filter((v): v is number => v !== undefined);
        const avg = richness.length > 0 ? richness.reduce((a, b) => a + b, 0) / richness.length : 0;
        return `${(avg * 100).toFixed(1)}%`;
      })(),
      breakdown: participants.map((name, index) => ({
        name,
        value: `${((perPerson[name]?.vocabularyRichness ?? 0) * 100).toFixed(1)}%`,
        index,
      })),
    },
    {
      icon: <MessagesSquare className="size-4" />,
      label: 'Śr. długość rozmowy',
      value: `${Math.round(engagement.avgConversationLength)} wiad.`,
      breakdown: [],
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <StatCard key={stat.label} {...stat} delay={index * 0.05} />
      ))}
    </div>
  );
}
