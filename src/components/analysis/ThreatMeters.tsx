'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ThreatMetersResult } from '@/lib/parsers/types';
import PsychDisclaimer from '@/components/shared/PsychDisclaimer';

interface ThreatMetersProps {
  meters: ThreatMetersResult;
}

const LEVEL_LABELS: Record<string, string> = {
  low: 'Niski',
  moderate: 'Umiarkowany',
  elevated: 'Podwyższony',
  critical: 'Krytyczny',
};

interface MeterColorConfig {
  stroke: string;
  glow: string;
  text: string;
  badge: string;
  bg: string;
}

const LEVEL_COLORS: Record<string, MeterColorConfig> = {
  low: {
    stroke: '#a78bfa',
    glow: 'rgba(167,139,250,0.35)',
    text: 'text-violet-400',
    badge: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
    bg: 'from-violet-500/[0.06] to-transparent',
  },
  moderate: {
    stroke: '#c084fc',
    glow: 'rgba(192,132,252,0.35)',
    text: 'text-purple-400',
    badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    bg: 'from-purple-500/[0.06] to-transparent',
  },
  elevated: {
    stroke: '#d946ef',
    glow: 'rgba(217,70,239,0.4)',
    text: 'text-fuchsia-400',
    badge: 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30',
    bg: 'from-fuchsia-500/[0.06] to-transparent',
  },
  critical: {
    stroke: '#e879f9',
    glow: 'rgba(232,121,249,0.5)',
    text: 'text-fuchsia-300',
    badge: 'bg-fuchsia-400/15 text-fuchsia-300 border-fuchsia-400/30',
    bg: 'from-fuchsia-400/[0.06] to-transparent',
  },
};

// Trust Index uses inverted coloring: high score = good = green
function getTrustColors(level: string): MeterColorConfig {
  switch (level) {
    case 'critical': return LEVEL_COLORS.low;
    case 'elevated': return LEVEL_COLORS.moderate;
    case 'moderate': return LEVEL_COLORS.elevated;
    case 'low': return LEVEL_COLORS.critical;
    default: return LEVEL_COLORS.moderate;
  }
}

function getTrustLabel(level: string): string {
  switch (level) {
    case 'critical': return 'Wysoki';
    case 'elevated': return 'Dobry';
    case 'moderate': return 'Niski';
    case 'low': return 'Krytycznie niski';
    default: return 'Nieznany';
  }
}

// --- Animated count-up hook ---
function useCountUp(end: number, duration: number, active: boolean) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) { setValue(0); return; }
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(Math.round(end * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [end, duration, active]);

  return value;
}

// --- SVG Arc Gauge ---
function ArcGauge({
  score,
  colors,
  animate,
  delay,
  isHighSeverity,
}: {
  score: number;
  colors: MeterColorConfig;
  animate: boolean;
  delay: number;
  isHighSeverity: boolean;
}) {
  // SVG arc parameters: 180° arc (semicircle), from left to right
  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2 + 8; // shift down slightly for visual balance

  // Arc from 180° (left) to 0° (right) = semicircle top
  const startAngle = Math.PI; // 180° = left
  const endAngle = 0; // 0° = right
  const sweepAngle = startAngle - endAngle; // π radians

  // Full arc length
  const arcLength = radius * sweepAngle;

  // Points for the background arc
  const startX = cx + radius * Math.cos(startAngle);
  const startY = cy - radius * Math.sin(startAngle);
  const endX = cx + radius * Math.cos(endAngle);
  const endY = cy - radius * Math.sin(endAngle);

  const arcPath = `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`;

  const dashOffset = arcLength * (1 - score / 100);

  const countVal = useCountUp(score, 1000, animate);

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`} className="overflow-visible">
        {/* Glow filter */}
        <defs>
          <filter id={`glow-${score}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background arc (track) */}
        <path
          d={arcPath}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Animated fill arc */}
        <motion.path
          d={arcPath}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={arcLength}
          initial={{ strokeDashoffset: arcLength }}
          animate={animate ? { strokeDashoffset: dashOffset } : { strokeDashoffset: arcLength }}
          transition={{ duration: 1.2, delay, ease: [0.22, 1, 0.36, 1] }}
          filter={`url(#glow-${score})`}
          style={{ filter: isHighSeverity ? `drop-shadow(0 0 8px ${colors.glow})` : undefined }}
        />
      </svg>

      {/* Score number centered under arc */}
      <div className="absolute inset-0 flex items-end justify-center pb-1">
        <span className={cn('font-mono text-2xl font-black tabular-nums', colors.text)}>
          {countVal}
        </span>
      </div>
    </div>
  );
}

// --- Individual meter card ---
function MeterCard({
  meter,
  index,
  isInView,
}: {
  meter: { id: string; label: string; score: number; level: string; factors: string[] };
  index: number;
  isInView: boolean;
}) {
  const isTrust = meter.id === 'trust';
  const colors = isTrust ? getTrustColors(meter.level) : LEVEL_COLORS[meter.level];
  const label = isTrust ? getTrustLabel(meter.level) : LEVEL_LABELS[meter.level];
  const isHighSeverity = meter.level === 'elevated' || meter.level === 'critical';
  const delay = index * 0.15;

  return (
    <motion.div
      className={cn(
        'relative rounded-xl border border-purple-500/[0.06] overflow-hidden',
        'bg-gradient-to-b',
        colors.bg,
      )}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Subtle top accent line */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${colors.stroke}40, transparent)` }}
        initial={{ scaleX: 0 }}
        animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: 0.8, delay: delay + 0.3 }}
      />

      <div className="p-4 flex flex-col items-center text-center">
        {/* Meter label */}
        <motion.span
          className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-2"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4, delay: delay + 0.1 }}
        >
          {meter.label}
        </motion.span>

        {/* Arc gauge */}
        <ArcGauge
          score={meter.score}
          colors={colors}
          animate={isInView}
          delay={delay + 0.2}
          isHighSeverity={isHighSeverity}
        />

        {/* Level badge */}
        <motion.span
          className={cn(
            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold mt-1',
            colors.badge,
          )}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.4, delay: delay + 0.6, type: 'spring', stiffness: 300, damping: 20 }}
        >
          {label}
        </motion.span>

        {/* Factor tags */}
        {meter.factors.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center mt-3">
            {meter.factors.slice(0, 3).map((factor, fi) => (
              <motion.span
                key={fi}
                className="text-[10px] text-muted-foreground/70 px-2 py-0.5 bg-purple-950/[0.15] border border-purple-500/[0.08] rounded-md"
                initial={{ opacity: 0, y: 6 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
                transition={{ duration: 0.3, delay: delay + 0.7 + fi * 0.06 }}
              >
                {factor}
              </motion.span>
            ))}
          </div>
        )}
      </div>

      {/* Pulse ring for high severity */}
      {isHighSeverity && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full animate-ping opacity-[0.06]"
            style={{ backgroundColor: colors.stroke }}
          />
        </div>
      )}
    </motion.div>
  );
}

export default function ThreatMeters({ meters }: ThreatMetersProps) {
  if (!meters.meters || meters.meters.length === 0) return null;

  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <div
      ref={ref}
      className="rounded-xl border border-purple-500/[0.06] bg-purple-950/[0.08] overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 pt-4 flex items-center gap-2.5">
        <span className="text-lg">🎯</span>
        <div>
          <h3 className="font-display text-[15px] font-bold">Wskaźniki Dynamiki</h3>
          <p className="text-xs text-text-muted mt-0.5">Ilościowe wskaźniki wzorców komunikacyjnych</p>
        </div>
      </div>

      {/* 2x2 Grid of arc gauges */}
      <div className="px-5 py-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {meters.meters.map((meter, index) => (
          <MeterCard
            key={meter.id}
            meter={meter}
            index={index}
            isInView={isInView}
          />
        ))}
      </div>

      <div className="px-5 pb-4">
        <PsychDisclaimer
          text="Wskaźniki oparte na ilościowej analizie wzorców komunikacji (częstotliwość, czas odpowiedzi, asymetria). Nie mierzą intencji ani stanów emocjonalnych."
          showGenericFooter
        />
      </div>
    </div>
  );
}
