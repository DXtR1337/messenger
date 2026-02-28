'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { Prediction } from '@/lib/analysis/types';
import PsychDisclaimer from '@/components/shared/PsychDisclaimer';

interface AIPredictionsProps {
  predictions?: Prediction[];
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

// --- Confidence config ---
const ARC_RADIUS = 42;
const ARC_STROKE = 6;
const ARC_CENTER = 50;
const ARC_CIRCUMFERENCE = Math.PI * ARC_RADIUS;

function getConfidenceConfig(c: number) {
  if (c >= 70) return { level: 'high' as const, color: '#e879f9', glow: 'rgba(232,121,249,0.4)', label: 'Wysoki', borderGlow: 'rgba(232,121,249,0.15)' };
  if (c >= 40) return { level: 'medium' as const, color: '#c084fc', glow: 'rgba(192,132,252,0.35)', label: 'Średni', borderGlow: 'rgba(192,132,252,0.12)' };
  return { level: 'low' as const, color: '#a78bfa', glow: 'rgba(167,139,250,0.35)', label: 'Niski', borderGlow: 'rgba(167,139,250,0.12)' };
}

// --- Semicircle confidence arc ---
function ConfidenceArc({ confidence, index, isInView }: { confidence: number; index: number; isInView: boolean }) {
  const config = getConfidenceConfig(confidence);
  const dashOffset = ARC_CIRCUMFERENCE * (1 - confidence / 100);
  const delay = 0.4 + index * 0.2;
  const count = useCountUp(confidence, 1000, isInView);
  const filterId = `pred-glow-${index}`;
  const gradId = `pred-grad-${index}`;

  return (
    <div className="relative shrink-0" style={{ width: 110, height: 64 }}>
      <svg
        viewBox="0 0 100 58"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={config.color} stopOpacity="0.15" />
            <stop offset="40%" stopColor={config.color} stopOpacity="1" />
            <stop offset="100%" stopColor={config.color} stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* Background track */}
        <path
          d={`M ${ARC_CENTER - ARC_RADIUS} ${ARC_CENTER + 6} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${ARC_CENTER + ARC_RADIUS} ${ARC_CENTER + 6}`}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={ARC_STROKE}
          strokeLinecap="round"
          fill="none"
        />

        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const angle = Math.PI * (1 - tick / 100);
          const innerR = ARC_RADIUS - 9;
          const outerR = ARC_RADIUS - 5;
          const x1 = ARC_CENTER + innerR * Math.cos(angle);
          const y1 = (ARC_CENTER + 6) - innerR * Math.sin(angle);
          const x2 = ARC_CENTER + outerR * Math.cos(angle);
          const y2 = (ARC_CENTER + 6) - outerR * Math.sin(angle);
          return (
            <line
              key={tick}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="0.7"
            />
          );
        })}

        {/* Animated arc */}
        <motion.path
          d={`M ${ARC_CENTER - ARC_RADIUS} ${ARC_CENTER + 6} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${ARC_CENTER + ARC_RADIUS} ${ARC_CENTER + 6}`}
          stroke={`url(#${gradId})`}
          strokeWidth={ARC_STROKE}
          strokeLinecap="round"
          fill="none"
          filter={`url(#${filterId})`}
          strokeDasharray={ARC_CIRCUMFERENCE}
          initial={{ strokeDashoffset: ARC_CIRCUMFERENCE }}
          animate={isInView ? { strokeDashoffset: dashOffset } : { strokeDashoffset: ARC_CIRCUMFERENCE }}
          transition={{ duration: 1.2, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>

      {/* Center value with count-up */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-0.5">
        <motion.span
          className="font-mono text-xl font-bold leading-none"
          style={{ color: config.color, textShadow: `0 0 12px ${config.glow}` }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.5, delay: delay + 0.3, type: 'spring', stiffness: 200, damping: 15 }}
        >
          {count}%
        </motion.span>
        <motion.span
          className="text-[9px] font-mono font-medium tracking-wider uppercase mt-0.5"
          style={{ color: `${config.color}99` }}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.3, delay: delay + 0.5 }}
        >
          {config.label}
        </motion.span>
      </div>
    </div>
  );
}

// --- Prediction card ---
function PredictionCard({
  pred,
  index,
  isInView,
}: {
  pred: Prediction;
  index: number;
  isInView: boolean;
}) {
  const config = getConfidenceConfig(pred.confidence);
  const delay = 0.2 + index * 0.15;

  return (
    <motion.div
      className={cn(
        'relative rounded-lg overflow-hidden',
        'border border-purple-500/[0.08] bg-purple-950/[0.12]',
        'transition-colors hover:bg-purple-900/[0.12]',
      )}
      initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20, y: 12 }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x: index % 2 === 0 ? -20 : 20, y: 12 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Colored top accent line */}
      <motion.div
        className="h-[2px]"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${config.color}60 30%, ${config.color} 50%, ${config.color}60 70%, transparent 100%)`,
          transformOrigin: 'left',
        }}
        initial={{ scaleX: 0 }}
        animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: 0.8, delay: delay + 0.2, ease: [0.22, 1, 0.36, 1] }}
      />

      <div className="flex items-start gap-4 p-4">
        {/* Arc gauge */}
        <ConfidenceArc
          confidence={pred.confidence}
          index={index}
          isInView={isInView}
        />

        {/* Content */}
        <div className="flex-1 min-w-0 pt-1">
          <motion.div
            className="text-sm font-medium leading-snug"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.4, delay: delay + 0.1 }}
          >
            {pred.prediction}
          </motion.div>

          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            {/* Timeframe badge */}
            <motion.span
              className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-full border"
              style={{
                borderColor: `${config.color}25`,
                color: config.color,
                background: `${config.color}08`,
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3, delay: delay + 0.3, type: 'spring', stiffness: 300, damping: 20 }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-80">
                <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="0.8" />
                <path d="M5 2.5V5.5L7 7" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
              </svg>
              {pred.timeframe}
            </motion.span>

            {/* Basis tag */}
            {pred.basis && (
              <motion.span
                className="text-[10px] text-muted-foreground/50 leading-tight italic"
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.3, delay: delay + 0.4 }}
              >
                {pred.basis}
              </motion.span>
            )}
          </div>
        </div>
      </div>

      {/* Left gradient edge */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[2px]"
        style={{
          background: `linear-gradient(180deg, ${config.color}50 0%, ${config.color}15 100%)`,
        }}
      />

      {/* Subtle background gradient for high confidence */}
      {config.level === 'high' && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 0% 50%, ${config.borderGlow} 0%, transparent 60%)`,
          }}
        />
      )}
    </motion.div>
  );
}

// --- Header icon ---
function PredictionIcon({ isInView }: { isInView: boolean }) {
  return (
    <motion.div
      className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.4, type: 'spring', stiffness: 300, damping: 20 }}
      style={{ boxShadow: isInView ? '0 0 12px rgba(168,85,247,0.15)' : 'none' }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-purple-400">
        <circle cx="12" cy="14" r="8" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
        <path d="M12 6V2M8 7L5.5 4.5M16 7L18.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M9 14C9 14 10 12 12 12C14 12 15 14 15 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="16" r="1" fill="currentColor" opacity="0.8" />
      </svg>
    </motion.div>
  );
}

export default function AIPredictions({ predictions }: AIPredictionsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  if (!predictions || predictions.length === 0) {
    return (
      <div className="rounded-xl border border-purple-500/[0.06] bg-purple-950/[0.08] p-6 text-center text-sm text-muted-foreground/50">
        Brak danych do wyświetlenia
      </div>
    );
  }

  return (
    <div ref={ref} className="rounded-xl border border-purple-500/[0.06] bg-purple-950/[0.08] overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-3">
        <PredictionIcon isInView={isInView} />
        <div>
          <h3 className="font-display text-[15px] font-bold">
            Predykcje AI
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Prognoza na podstawie wykrytych trendów
          </p>
        </div>
      </div>

      {/* Prediction cards */}
      <div className="px-5 pb-4 space-y-3">
        {predictions.map((pred, i) => (
          <PredictionCard
            key={i}
            pred={pred}
            index={i}
            isInView={isInView}
          />
        ))}
      </div>

      {/* Disclaimer */}
      <div className="px-5 pb-3">
        <PsychDisclaimer
          text="Predykcje AI oparte na trendach wykrytych w danych historycznych. Przyszłość relacji zależy od wielu czynników niedostępnych w analizie tekstu."
          showGenericFooter
        />
      </div>
    </div>
  );
}
