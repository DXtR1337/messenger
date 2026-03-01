'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { DamageReportResult } from '@/lib/parsers/types';
import PsychDisclaimer from '@/components/shared/PsychDisclaimer';
import ExperimentalBadge from '@/components/shared/ExperimentalBadge';
import { QuantBadge } from '@/components/shared/SourceBadge';

interface DamageReportProps {
  report: DamageReportResult;
}

// --- Count-up hook ---
function useCountUp(end: number, duration: number, active: boolean) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (!active) { setValue(0); return; }
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setValue(Math.round(end * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [end, duration, active]);
  return value;
}

// --- Color configs ---
interface GaugeColors {
  stroke: string;
  strokeEnd: string;
  glow: string;
  text: string;
}

function getDamageColors(value: number): GaugeColors {
  if (value >= 70) return { stroke: '#e879f9', strokeEnd: '#d946ef', glow: 'rgba(232,121,249,0.4)', text: 'text-fuchsia-300' };
  if (value >= 40) return { stroke: '#c084fc', strokeEnd: '#d946ef', glow: 'rgba(192,132,252,0.35)', text: 'text-purple-400' };
  return { stroke: '#a78bfa', strokeEnd: '#c084fc', glow: 'rgba(167,139,250,0.35)', text: 'text-violet-400' };
}

function getRepairColors(value: number): GaugeColors {
  if (value >= 60) return { stroke: '#a78bfa', strokeEnd: '#c084fc', glow: 'rgba(167,139,250,0.4)', text: 'text-violet-400' };
  if (value >= 30) return { stroke: '#c084fc', strokeEnd: '#d946ef', glow: 'rgba(192,132,252,0.35)', text: 'text-purple-400' };
  return { stroke: '#e879f9', strokeEnd: '#d946ef', glow: 'rgba(232,121,249,0.35)', text: 'text-fuchsia-300' };
}

function getGradeConfig(grade: string): { color: string; glow: string; text: string; bg: string; border: string } {
  switch (grade) {
    case 'A': return { color: '#a78bfa', glow: 'rgba(167,139,250,0.3)', text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/25' };
    case 'B': return { color: '#c084fc', glow: 'rgba(192,132,252,0.3)', text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/25' };
    case 'C': return { color: '#d946ef', glow: 'rgba(217,70,239,0.3)', text: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/25' };
    case 'D': return { color: '#e879f9', glow: 'rgba(232,121,249,0.3)', text: 'text-fuchsia-300', bg: 'bg-fuchsia-400/10', border: 'border-fuchsia-400/25' };
    case 'F': return { color: '#f0abfc', glow: 'rgba(240,171,252,0.3)', text: 'text-fuchsia-200', bg: 'bg-fuchsia-300/10', border: 'border-fuchsia-300/25' };
    default: return { color: '#71717a', glow: 'rgba(113,113,122,0.2)', text: 'text-zinc-400', bg: 'bg-purple-950/[0.08]', border: 'border-purple-500/[0.06]' };
  }
}

function getBenefitConfig(val: DamageReportResult['therapyBenefit']): { color: string; glow: string; text: string; bg: string; border: string; label: string } {
  switch (val) {
    case 'HIGH': return { color: '#e879f9', glow: 'rgba(232,121,249,0.3)', text: 'text-fuchsia-300', bg: 'bg-fuchsia-400/10', border: 'border-fuchsia-400/25', label: 'WYSOKA' };
    case 'MODERATE': return { color: '#c084fc', glow: 'rgba(192,132,252,0.3)', text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/25', label: 'UMIARKOWANA' };
    case 'LOW': return { color: '#a78bfa', glow: 'rgba(167,139,250,0.3)', text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/25', label: 'NISKA' };
    default: return { color: '#71717a', glow: 'rgba(113,113,122,0.2)', text: 'text-zinc-400', bg: 'bg-purple-950/[0.08]', border: 'border-purple-500/[0.06]', label: String(val ?? 'N/A') };
  }
}

// --- Circular gauge with glow ---
function GlowGauge({
  value,
  label,
  colors,
  index,
  isInView,
}: {
  value: number;
  label: string;
  colors: GaugeColors;
  index: number;
  isInView: boolean;
}) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (value / 100) * circumference;
  const delay = 0.15 + index * 0.15;
  const count = useCountUp(value, 1200, isInView);
  const filterId = `dmg-glow-${index}`;
  const gradId = `dmg-grad-${index}`;

  return (
    <div className="relative h-28 w-28 sm:h-32 sm:w-32">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100" role="img" aria-label={`${label}: ${value}%`}>
        <defs>
          <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.stroke} stopOpacity="0.4" />
            <stop offset="50%" stopColor={colors.stroke} stopOpacity="1" />
            <stop offset="100%" stopColor={colors.strokeEnd} stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Track */}
        <circle
          cx="50" cy="50" r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="7"
        />

        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const angle = (tick / 100) * 2 * Math.PI - Math.PI / 2;
          const inner = radius - 6;
          const outer = radius - 3;
          return (
            <line
              key={tick}
              x1={50 + inner * Math.cos(angle)}
              y1={50 + inner * Math.sin(angle)}
              x2={50 + outer * Math.cos(angle)}
              y2={50 + outer * Math.sin(angle)}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="0.6"
            />
          );
        })}

        {/* Animated arc */}
        <motion.circle
          cx="50" cy="50" r={radius}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="7"
          strokeLinecap="round"
          filter={`url(#${filterId})`}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={isInView ? { strokeDashoffset: dashOffset } : { strokeDashoffset: circumference }}
          transition={{ duration: 1.2, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>

      {/* Center value */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          className={cn('font-mono text-2xl font-bold sm:text-3xl', colors.text)}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.5, delay: delay + 0.4, type: 'spring', stiffness: 200, damping: 15 }}
        >
          {count}%
        </motion.span>
      </div>

      {/* Outer glow ring for high values */}
      {value >= 60 && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ boxShadow: `0 0 20px ${colors.glow}, inset 0 0 20px ${colors.glow}` }}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: [0, 0.4, 0.2] } : { opacity: 0 }}
          transition={{ duration: 2, delay: delay + 0.8, ease: 'easeOut' }}
        />
      )}
    </div>
  );
}

// --- Metric card wrapper ---
function MetricCard({
  children,
  label,
  index,
  isInView,
}: {
  children: React.ReactNode;
  label: string;
  index: number;
  isInView: boolean;
}) {
  const delay = 0.1 + index * 0.12;

  return (
    <motion.div
      className="flex flex-col items-center gap-3 rounded-lg border border-purple-500/[0.06] bg-purple-950/[0.1] p-4"
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
      <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground/60">
        {label}
      </span>
    </motion.div>
  );
}

export default function DamageReport({ report }: DamageReportProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  const damageColors = getDamageColors(report.emotionalDamage);
  const repairColors = getRepairColors(report.repairPotential);
  const gradeConfig = getGradeConfig(report.communicationGrade);
  const benefitConfig = getBenefitConfig(report.therapyBenefit);

  return (
    <div
      ref={ref}
      className="rounded-xl border border-purple-500/[0.06] bg-purple-950/[0.08] overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 pt-4 flex items-center gap-2.5">
        <motion.span
          className="text-xl"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.4, type: 'spring', stiffness: 300, damping: 15 }}
        >
          🩹
        </motion.span>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-[15px] font-bold">Raport Szkód</h3>
            <QuantBadge />
          </div>
          <ExperimentalBadge metricKey="damageReport" />
          <p className="text-xs text-text-muted mt-0.5">Bilans emocjonalnych zniszczeń w konwersacji</p>
        </div>
      </div>

      {/* Gauges grid */}
      <div className="px-5 py-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* 1. Emotional Damage — circular gauge */}
        <MetricCard label="Emotional Damage" index={0} isInView={isInView}>
          <GlowGauge
            value={report.emotionalDamage}
            label="Emotional Damage"
            colors={damageColors}
            index={0}
            isInView={isInView}
          />
        </MetricCard>

        {/* 2. Communication Grade — letter badge */}
        <MetricCard label="Komunikacja" index={1} isInView={isInView}>
          <div className="relative h-28 w-28 sm:h-32 sm:w-32 flex items-center justify-center">
            <motion.div
              className={cn(
                'flex h-24 w-24 items-center justify-center rounded-2xl border sm:h-28 sm:w-28',
                gradeConfig.bg, gradeConfig.border,
              )}
              initial={{ scale: 0.6, opacity: 0, rotateY: 90 }}
              animate={isInView ? { scale: 1, opacity: 1, rotateY: 0 } : { scale: 0.6, opacity: 0, rotateY: 90 }}
              transition={{ duration: 0.7, delay: 0.3, type: 'spring', stiffness: 200, damping: 18 }}
              style={{ boxShadow: isInView ? `0 0 24px ${gradeConfig.glow}` : 'none' }}
            >
              <span
                className={cn('font-display text-5xl font-black sm:text-6xl', gradeConfig.text)}
              >
                {report.communicationGrade}
              </span>
            </motion.div>
          </div>
        </MetricCard>

        {/* 3. Repair Potential — circular gauge */}
        <MetricCard label="Potencjał naprawy" index={2} isInView={isInView}>
          <GlowGauge
            value={report.repairPotential}
            label="Potencjał naprawy"
            colors={repairColors}
            index={2}
            isInView={isInView}
          />
        </MetricCard>

        {/* 4. Consultation Benefit — badge */}
        <MetricCard label="Korzyść z konsultacji" index={3} isInView={isInView}>
          <div className="relative h-28 w-28 sm:h-32 sm:w-32 flex items-center justify-center">
            <motion.div
              className={cn(
                'flex h-24 w-24 items-center justify-center rounded-2xl border sm:h-28 sm:w-28',
                benefitConfig.bg, benefitConfig.border,
              )}
              initial={{ scale: 0.6, opacity: 0, rotateY: -90 }}
              animate={isInView ? { scale: 1, opacity: 1, rotateY: 0 } : { scale: 0.6, opacity: 0, rotateY: -90 }}
              transition={{ duration: 0.7, delay: 0.55, type: 'spring', stiffness: 200, damping: 18 }}
              style={{ boxShadow: isInView ? `0 0 24px ${benefitConfig.glow}` : 'none' }}
            >
              <span
                className={cn('font-display text-lg font-black sm:text-xl text-center leading-tight px-1', benefitConfig.text)}
              >
                {benefitConfig.label}
              </span>
            </motion.div>

            {/* Pulse ring for HIGH benefit */}
            {report.therapyBenefit === 'HIGH' && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ delay: 1.2 }}
              >
                <div
                  className="h-24 w-24 rounded-2xl sm:h-28 sm:w-28 animate-ping opacity-[0.06]"
                  style={{ backgroundColor: benefitConfig.color }}
                />
              </motion.div>
            )}
          </div>
        </MetricCard>
      </div>

      {/* Disclaimer */}
      <div className="px-5 pb-4">
        <PsychDisclaimer
          text="Raport Szkód to metryka rozrywkowa oparta na ilościowych danych komunikacji i Health Score AI. Nie odzwierciedla rzeczywistego stanu emocjonalnego uczestników."
          showGenericFooter
        />
      </div>
    </div>
  );
}
