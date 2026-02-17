'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import {
  Timer,
  MessageSquarePlus,
  MessageSquareMore,
  Moon,
  HelpCircle,
  Heart,
  Layers,
  VolumeX,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn, formatDuration, formatNumber } from '@/lib/utils';
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
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="border-border/50 hover:border-border transition-colors">
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            {icon}
            <span className="text-xs uppercase tracking-wider">{label}</span>
          </div>
          <p className="font-mono text-2xl font-bold text-foreground">{value}</p>
          {breakdown.length > 0 && (
            <div className="space-y-1 border-t border-border pt-2">
              {breakdown.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block size-2 rounded-full"
                      style={{ backgroundColor: PERSON_COLORS[entry.index % PERSON_COLORS.length] }}
                    />
                    <span className="text-muted-foreground">{entry.name}</span>
                  </span>
                  <span className="font-mono font-medium text-foreground">{entry.value}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function StatsGrid({ quantitative, participants }: StatsGridProps) {
  const { timing, engagement, perPerson } = quantitative;

  const stats: Array<Omit<StatCardProps, 'delay'>> = [
    {
      icon: <Timer className="size-4" />,
      label: 'Avg Response Time',
      value: (() => {
        const medians = participants
          .map((p) => timing.perPerson[p]?.medianResponseTimeMs)
          .filter((v): v is number => v !== undefined);
        const avg = medians.length > 0 ? medians.reduce((a, b) => a + b, 0) / medians.length : 0;
        return formatDuration(avg);
      })(),
      breakdown: participants.map((name, index) => ({
        name,
        value: formatDuration(timing.perPerson[name]?.medianResponseTimeMs ?? 0),
        index,
      })),
    },
    {
      icon: <MessageSquarePlus className="size-4" />,
      label: 'Conversation Initiations',
      value: formatNumber(
        Object.values(timing.conversationInitiations).reduce((a, b) => a + b, 0),
      ),
      breakdown: participants.map((name, index) => ({
        name,
        value: formatNumber(timing.conversationInitiations[name] ?? 0),
        index,
      })),
    },
    {
      icon: <MessageSquareMore className="size-4" />,
      label: 'Double Texts',
      value: formatNumber(
        Object.values(engagement.doubleTexts).reduce((a, b) => a + b, 0),
      ),
      breakdown: participants.map((name, index) => ({
        name,
        value: formatNumber(engagement.doubleTexts[name] ?? 0),
        index,
      })),
    },
    {
      icon: <Moon className="size-4" />,
      label: 'Late Night Messages',
      value: formatNumber(
        Object.values(timing.lateNightMessages).reduce((a, b) => a + b, 0),
      ),
      breakdown: participants.map((name, index) => ({
        name,
        value: formatNumber(timing.lateNightMessages[name] ?? 0),
        index,
      })),
    },
    {
      icon: <HelpCircle className="size-4" />,
      label: 'Questions Asked',
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
      label: 'Reaction Rate',
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
      label: 'Total Sessions',
      value: formatNumber(engagement.totalSessions),
      breakdown: [],
    },
    {
      icon: <VolumeX className="size-4" />,
      label: 'Longest Silence',
      value: formatDuration(timing.longestSilence.durationMs),
      breakdown: [],
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <StatCard key={stat.label} {...stat} delay={index * 0.05} />
      ))}
    </div>
  );
}
