'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { Prediction } from '@/lib/analysis/types';
import PsychDisclaimer from '@/components/shared/PsychDisclaimer';
import ExperimentalBadge from '@/components/shared/ExperimentalBadge';
import { AIBadge } from '@/components/shared/SourceBadge';

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

// --- Semicircle confidence arc (only motion.path kept for the hero animation) ---
function ConfidenceArc({ confidence, index, isInView }: { confidence: number; index: number; isInView: boolean }) {
  const config = getConfidenceConfig(confidence);
  const dashOffset = ARC_CIRCUMFERENCE * (1 - confidence / 100);
  const delay = 0.4 + index * 0.15;
  const count = useCountUp(confidence, 1000, isInView);
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

        {/* Animated arc — the one motion element we keep */}
        <motion.path
          d={`M ${ARC_CENTER - ARC_RADIUS} ${ARC_CENTER + 6} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${ARC_CENTER + ARC_RADIUS} ${ARC_CENTER + 6}`}
          stroke={`url(#${gradId})`}
          strokeWidth={ARC_STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={ARC_CIRCUMFERENCE}
          initial={{ strokeDashoffset: ARC_CIRCUMFERENCE }}
          animate={isInView ? { strokeDashoffset: dashOffset } : { strokeDashoffset: ARC_CIRCUMFERENCE }}
          transition={{ duration: 1.2, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>

      {/* Center value with count-up — CSS transition instead of motion.span */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-0.5">
        <span
          className={cn('font-mono text-xl font-bold leading-none transition-[opacity,transform] duration-500', isInView ? 'opacity-100 scale-100' : 'opacity-0 scale-50')}
          style={{ color: config.color, textShadow: `0 0 12px ${config.glow}`, transitionDelay: `${delay + 0.3}s`, transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        >
          {count}%
        </span>
        <span
          className={cn('text-[10px] font-mono font-medium tracking-wider uppercase mt-0.5 transition-opacity duration-300', isInView ? 'opacity-100' : 'opacity-0')}
          style={{ color: `${config.color}99`, transitionDelay: `${delay + 0.5}s` }}
        >
          {config.label}
        </span>
      </div>
    </div>
  );
}

// --- Prediction card — CSS transitions instead of motion.div ---
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
  const delay = `${0.2 + index * 0.12}s`;

  return (
    <div
      className={cn(
        'relative rounded-lg overflow-hidden',
        'border border-purple-500/[0.08] bg-purple-950/[0.12]',
        'transition-[opacity,transform,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
        'hover:bg-purple-900/[0.12]',
        isInView ? 'opacity-100 translate-x-0 translate-y-0' : cn('opacity-0 translate-y-3', index % 2 === 0 ? '-translate-x-5' : 'translate-x-5'),
      )}
      style={{ transitionDelay: delay }}
    >
      {/* Colored top accent line — CSS transition for scaleX */}
      <div
        className={cn('h-[2px] origin-left transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]', isInView ? 'scale-x-100' : 'scale-x-0')}
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${config.color}60 30%, ${config.color} 50%, ${config.color}60 70%, transparent 100%)`,
          transitionDelay: `${parseFloat(delay) + 0.2}s`,
        }}
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
          <div
            className={cn('text-sm font-medium leading-snug transition-opacity duration-400', isInView ? 'opacity-100' : 'opacity-0')}
            style={{ transitionDelay: `${parseFloat(delay) + 0.1}s` }}
          >
            {pred.prediction}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            {/* Timeframe badge */}
            <span
              className={cn('inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-full border transition-[opacity,transform] duration-300', isInView ? 'opacity-100 scale-100' : 'opacity-0 scale-75')}
              style={{
                borderColor: `${config.color}25`,
                color: config.color,
                background: `${config.color}08`,
                transitionDelay: `${parseFloat(delay) + 0.3}s`,
                transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-80">
                <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="0.8" />
                <path d="M5 2.5V5.5L7 7" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
              </svg>
              {pred.timeframe}
            </span>

            {/* Basis tag */}
            {pred.basis && (
              <span
                className={cn('text-[10px] text-muted-foreground/50 leading-tight italic transition-opacity duration-300', isInView ? 'opacity-100' : 'opacity-0')}
                style={{ transitionDelay: `${parseFloat(delay) + 0.4}s` }}
              >
                {pred.basis}
              </span>
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
    </div>
  );
}

// --- Header icon — CSS transition instead of motion.div ---
function PredictionIcon({ isInView }: { isInView: boolean }) {
  return (
    <div
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20',
        'transition-[opacity,transform] duration-400',
        isInView ? 'opacity-100 scale-100' : 'opacity-0 scale-75',
      )}
      style={{
        boxShadow: isInView ? '0 0 12px rgba(168,85,247,0.15)' : 'none',
        transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-purple-400">
        <circle cx="12" cy="14" r="8" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
        <path d="M12 6V2M8 7L5.5 4.5M16 7L18.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M9 14C9 14 10 12 12 12C14 12 15 14 15 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="16" r="1" fill="currentColor" opacity="0.8" />
      </svg>
    </div>
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
          <div className="flex items-center gap-2">
            <h3 className="font-display text-[15px] font-bold">
              Predykcje AI
            </h3>
            <AIBadge />
          </div>
          <ExperimentalBadge metricKey="aiPredictions" />
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
