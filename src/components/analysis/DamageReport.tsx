'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { DamageReportResult } from '@/lib/parsers/types';

interface DamageReportProps {
  report: DamageReportResult;
}

// Circular gauge SVG component
function CircularGauge({
  value,
  color,
  label,
  delay = 0,
}: {
  value: number;
  color: 'red' | 'green';
  label: string;
  delay?: number;
}) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  const gradientId = `gauge-${color}-${label.replace(/\s/g, '')}`;
  const gradientColors = color === 'red'
    ? { start: '#ef4444', end: '#f97316' }
    : { start: '#10b981', end: '#34d399' };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-24 w-24 sm:h-28 sm:w-28">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={gradientColors.start} />
              <stop offset="100%" stopColor={gradientColors.end} />
            </linearGradient>
          </defs>
          {/* Background circle */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke="#1a1a1a"
            strokeWidth="8"
          />
          {/* Animated value circle */}
          <motion.circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, delay, ease: 'easeOut' }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            className={cn(
              'font-mono text-xl font-bold sm:text-2xl',
              color === 'red' ? 'text-red-400' : 'text-emerald-400',
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: delay + 0.5 }}
          >
            {value}%
          </motion.span>
        </div>
      </div>
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">
        {label}
      </span>
    </div>
  );
}

// Communication grade colors
function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A': return 'text-emerald-400';
    case 'B': return 'text-blue-400';
    case 'C': return 'text-yellow-400';
    case 'D': return 'text-orange-400';
    case 'F': return 'text-red-400';
    default: return 'text-muted-foreground';
  }
}

function getGradeBg(grade: string): string {
  switch (grade) {
    case 'A': return 'bg-emerald-500/10 border-emerald-500/30';
    case 'B': return 'bg-blue-500/10 border-blue-500/30';
    case 'C': return 'bg-yellow-500/10 border-yellow-500/30';
    case 'D': return 'bg-orange-500/10 border-orange-500/30';
    case 'F': return 'bg-red-500/10 border-red-500/30';
    default: return 'bg-[#1a1a1a] border-border';
  }
}

// Therapy needed badge
function getTherapyColor(val: DamageReportResult['therapyNeeded']): { badge: string; text: string; label: string } {
  switch (val) {
    case 'YES':
      return { badge: 'bg-red-500/15 border-red-500/30', text: 'text-red-400', label: 'TAK' };
    case 'RECOMMENDED':
      return { badge: 'bg-yellow-500/15 border-yellow-500/30', text: 'text-yellow-400', label: 'ZALECANA' };
    case 'NO':
      return { badge: 'bg-emerald-500/15 border-emerald-500/30', text: 'text-emerald-400', label: 'NIE' };
  }
}

export default function DamageReport({ report }: DamageReportProps) {
  const therapyStyle = getTherapyColor(report.therapyNeeded);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl border border-border bg-card p-4 sm:p-6"
    >
      <div className="mb-5 flex items-center gap-2">
        <span className="text-lg">🩹</span>
        <h3 className="font-syne text-base font-bold text-foreground sm:text-lg">
          Raport Szkód
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
        {/* 1. Emotional Damage */}
        <CircularGauge
          value={report.emotionalDamage}
          color="red"
          label="Emotional Damage"
          delay={0}
        />

        {/* 2. Communication Grade */}
        <motion.div
          className="flex flex-col items-center gap-2"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <div
            className={cn(
              'flex h-24 w-24 items-center justify-center rounded-xl border sm:h-28 sm:w-28',
              getGradeBg(report.communicationGrade),
            )}
          >
            <span
              className={cn(
                'font-syne text-4xl font-black sm:text-5xl',
                getGradeColor(report.communicationGrade),
              )}
            >
              {report.communicationGrade}
            </span>
          </div>
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">
            Komunikacja
          </span>
        </motion.div>

        {/* 3. Repair Potential */}
        <CircularGauge
          value={report.repairPotential}
          color="green"
          label="Potencjał naprawy"
          delay={0.3}
        />

        {/* 4. Therapy Needed */}
        <motion.div
          className="flex flex-col items-center gap-2"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.45 }}
        >
          <div
            className={cn(
              'flex h-24 w-24 items-center justify-center rounded-xl border sm:h-28 sm:w-28',
              therapyStyle.badge,
            )}
          >
            <span
              className={cn(
                'font-syne text-lg font-black sm:text-xl',
                therapyStyle.text,
              )}
            >
              {therapyStyle.label}
            </span>
          </div>
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">
            Terapia potrzebna
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
