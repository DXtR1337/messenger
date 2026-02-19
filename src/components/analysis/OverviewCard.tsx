'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Calendar, MessageSquare, Clock, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatDate, formatNumber } from '@/lib/utils';

interface OverviewCardProps {
  title: string;
  participants: string[];
  metadata: {
    totalMessages: number;
    dateRange: { start: number; end: number };
    durationDays: number;
  };
  perPerson: Record<string, { totalMessages: number }>;
  healthScore?: number;
}

function AnimatedCounter({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isInView, value, duration]);

  return <span ref={ref}>{formatNumber(count)}</span>;
}

function HealthScoreCircle({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = (value: number): string => {
    if (value < 40) return 'var(--destructive)';
    if (value < 70) return 'var(--warning)';
    return 'var(--success)';
  };

  const color = getScoreColor(score);

  return (
    <div className="relative flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-border"
        />
        <motion.circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-mono text-3xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-xs text-muted-foreground">Health</span>
      </div>
    </div>
  );
}

function ParticipantBar({
  participants,
  perPerson,
  totalMessages,
}: {
  participants: string[];
  perPerson: Record<string, { totalMessages: number }>;
  totalMessages: number;
}) {
  const colors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {participants.map((name, index) => {
          const count = perPerson[name]?.totalMessages ?? 0;
          const pct = totalMessages > 0 ? ((count / totalMessages) * 100).toFixed(1) : '0';
          return (
            <span key={name} className="flex items-center gap-1.5">
              <span
                className="inline-block size-2.5 rounded-full"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="font-medium text-foreground">{name}</span>
              <span className="font-mono">{formatNumber(count)} ({pct}%)</span>
            </span>
          );
        })}
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary">
        {participants.map((name, index) => {
          const count = perPerson[name]?.totalMessages ?? 0;
          const pct = totalMessages > 0 ? (count / totalMessages) * 100 : 0;
          return (
            <motion.div
              key={name}
              className="h-full"
              style={{ backgroundColor: colors[index % colors.length] }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: index * 0.15 }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function OverviewCard({
  title,
  participants,
  metadata,
  perPerson,
  healthScore,
}: OverviewCardProps) {
  const startDate = formatDate(metadata.dateRange.start);
  const endDate = formatDate(metadata.dateRange.end);

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="font-display text-2xl tracking-tight lg:text-3xl">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-start gap-8">
          {/* Key stats */}
          <div className="flex flex-1 flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-secondary">
                <Calendar className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Okres</p>
                <p className="font-mono text-sm font-medium">
                  {startDate} &mdash; {endDate}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-secondary">
                <Clock className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Czas trwania</p>
                <p className="font-mono text-sm font-medium">
                  {formatNumber(metadata.durationDays)} dni
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-secondary">
                <MessageSquare className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Wiadomości</p>
                <p className="font-mono text-2xl font-bold text-foreground">
                  <AnimatedCounter value={metadata.totalMessages} />
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-secondary">
                <Users className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Uczestnicy</p>
                <p className="font-mono text-sm font-medium">{participants.length}</p>
              </div>
            </div>
          </div>

          {/* Health score */}
          {healthScore !== undefined && (
            <div className="flex-shrink-0">
              <HealthScoreCircle score={healthScore} />
            </div>
          )}
        </div>

        {/* Participant balance bar */}
        <ParticipantBar
          participants={participants}
          perPerson={perPerson}
          totalMessages={metadata.totalMessages}
        />
      </CardContent>
    </Card>
  );
}
