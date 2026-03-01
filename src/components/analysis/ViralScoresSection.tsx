'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { QuantitativeAnalysis } from '@/lib/parsers/types';
import PsychDisclaimer from '@/components/shared/PsychDisclaimer';

interface ViralScoresSectionProps {
  quantitative: QuantitativeAnalysis;
  participants: string[];
}

const PERSON_COLORS = ['#c084fc', '#e879f9'] as const;
const PERSON_DOT_CLASSES = ['bg-chart-a', 'bg-chart-b'] as const;

// --- Animated count-up ---
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

// --- Stagger wrapper ---
function StaggerItem({
  children,
  index,
  isInView,
  className = '',
}: {
  children: React.ReactNode;
  index: number;
  isInView: boolean;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.5, delay: 0.1 + index * 0.12, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

// --- Compatibility Ring Gauge ---
function CompatibilityGauge({ score, isInView }: { score: number; isInView: boolean }) {
  const radius = 52;
  const stroke = 7;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const countVal = useCountUp(score, 1200, isInView);

  const color =
    score >= 80 ? '#a78bfa' : score >= 60 ? '#c084fc' : score >= 40 ? '#d946ef' : '#e879f9';
  const glow =
    score >= 80 ? 'rgba(167,139,250,0.3)' : score >= 60 ? 'rgba(192,132,252,0.3)' : score >= 40 ? 'rgba(217,70,239,0.3)' : 'rgba(232,121,249,0.3)';
  const verdict =
    score >= 80 ? 'Idealne dopasowanie!' : score >= 60 ? 'Dobra kompatybilność' : score >= 40 ? 'Przeciętna' : 'Niska';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="120" height="120" viewBox="0 0 120 120" className="overflow-visible">
          <defs>
            <filter id="compat-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Track */}
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
          {/* Fill */}
          <motion.circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={isInView ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
            transform="rotate(-90 60 60)"
            filter="url(#compat-glow)"
            style={{ filter: `drop-shadow(0 0 8px ${glow})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-3xl font-black tabular-nums" style={{ color }}>
            {countVal}
          </span>
        </div>
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{verdict}</span>
    </div>
  );
}

// --- Interest Score Bars ---
function InterestBars({
  interestScores,
  participants,
  isInView,
}: {
  interestScores: Record<string, number>;
  participants: string[];
  isInView: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {participants.map((person, index) => {
        const score = interestScores[person] ?? 0;
        const color = PERSON_COLORS[index % PERSON_COLORS.length];
        const dotClass = PERSON_DOT_CLASSES[index % PERSON_DOT_CLASSES.length];

        return (
          <motion.div
            key={person}
            className="space-y-1.5"
            initial={{ opacity: 0, x: -12 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -12 }}
            transition={{ duration: 0.4, delay: 0.4 + index * 0.15 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className={cn('w-2 h-2 rounded-full shrink-0', dotClass)} />
                <span className="text-sm font-semibold text-foreground/90">{person}</span>
              </div>
              <span className="font-mono text-sm font-bold" style={{ color }}>
                {score}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-purple-950/[0.2]">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                  boxShadow: `0 0 8px ${color}40`,
                }}
                initial={{ width: 0 }}
                animate={isInView ? { width: `${score}%` } : { width: 0 }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.5 + index * 0.15 }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// --- Ghost Risk ---
function GhostRiskMeter({
  person,
  score,
  factors,
  colorIndex,
  isInView,
  delay,
}: {
  person: string;
  score: number;
  factors: string[];
  colorIndex: number;
  isInView: boolean;
  delay: number;
}) {
  const riskColor = score < 30 ? '#a78bfa' : score <= 60 ? '#c084fc' : '#e879f9';
  const riskGlow = score < 30 ? 'rgba(167,139,250,0.3)' : score <= 60 ? 'rgba(192,132,252,0.3)' : 'rgba(232,121,249,0.4)';
  const riskLabel = score < 30 ? 'niskie' : score <= 60 ? 'średnie' : 'wysokie';
  const dotClass = PERSON_DOT_CLASSES[colorIndex % PERSON_DOT_CLASSES.length];

  return (
    <motion.div
      className="space-y-2"
      initial={{ opacity: 0, x: -12 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -12 }}
      transition={{ duration: 0.4, delay }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={cn('w-2 h-2 rounded-full shrink-0', dotClass)} />
          <span className="text-sm font-semibold text-foreground/90">{person}</span>
        </div>
        <span className="flex items-center gap-1.5">
          <span className="font-mono text-lg font-bold" style={{ color: riskColor }}>
            {score}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground/60">({riskLabel})</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-purple-950/[0.2]">
        <motion.div
          className="h-full rounded-full"
          style={{
            backgroundColor: riskColor,
            boxShadow: `0 0 6px ${riskGlow}`,
          }}
          initial={{ width: 0 }}
          animate={isInView ? { width: `${score}%` } : { width: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: delay + 0.15 }}
        />
      </div>
      {factors.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {factors.slice(0, 3).map((factor, fi) => (
            <motion.span
              key={fi}
              className="text-[10px] text-muted-foreground/60 px-2 py-0.5 bg-purple-950/[0.2] border border-purple-500/[0.08] rounded-md"
              initial={{ opacity: 0, y: 4 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
              transition={{ duration: 0.3, delay: delay + 0.3 + fi * 0.06 }}
            >
              {factor}
            </motion.span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// --- Investment Asymmetry Display (formerly Delusion Display) ---
function AsymmetryDisplay({
  score,
  moreInvestedPerson,
  isInView,
}: {
  score: number;
  moreInvestedPerson?: string;
  isInView: boolean;
}) {
  const emoji = score < 20 ? '\u{1F9D8}' : score <= 50 ? '\u{1F914}' : '\u{1F921}';
  const label = score < 20 ? 'Równomierne zaangażowanie' : score <= 50 ? 'Lekka asymetria' : 'Wyraźna asymetria';
  const color = score < 20 ? '#a78bfa' : score <= 50 ? '#c084fc' : '#e879f9';
  const glow = score < 20 ? 'rgba(167,139,250,0.25)' : score <= 50 ? 'rgba(192,132,252,0.25)' : 'rgba(232,121,249,0.3)';
  const countVal = useCountUp(score, 1000, isInView);

  return (
    <div className="flex flex-col items-center gap-2 text-center py-2">
      <motion.span
        className="text-5xl"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
        transition={{ duration: 0.5, delay: 0.5, type: 'spring', stiffness: 200, damping: 15 }}
      >
        {emoji}
      </motion.span>
      <span
        className="font-mono text-3xl font-black tabular-nums"
        style={{ color, textShadow: `0 0 16px ${glow}` }}
      >
        {countVal}
      </span>
      <span className="text-xs font-semibold" style={{ color }}>{label}</span>
      {moreInvestedPerson && score >= 20 && (
        <motion.p
          className="text-[11px] text-muted-foreground/60"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
        >
          <span className="font-semibold text-foreground/70">{moreInvestedPerson}</span>
          {' '}jest bardziej zaangażowany/a
        </motion.p>
      )}
    </div>
  );
}

// --- Section Label ---
function SubLabel({ children, isInView, delay }: { children: React.ReactNode; isInView: boolean; delay: number }) {
  return (
    <motion.h4
      className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-3"
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      {children}
    </motion.h4>
  );
}

export default function ViralScoresSection({
  quantitative,
  participants,
}: ViralScoresSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  if (!quantitative.viralScores) return null;

  const {
    compatibilityScore,
    interestScores,
    ghostRisk,
    delusionScore,
    delusionHolder,
  } = quantitative.viralScores;

  const sortedParticipants = useMemo(() => participants.slice(0, 2), [participants]);

  return (
    <div
      ref={ref}
      className="rounded-xl border border-purple-500/[0.06] bg-purple-950/[0.08] overflow-hidden"
    >
      {/* Gradient top accent */}
      <motion.div
        className="h-px"
        style={{ background: 'linear-gradient(90deg, transparent, #c084fc80, #e879f980, transparent)' }}
        initial={{ scaleX: 0 }}
        animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: 0.8, delay: 0.1 }}
      />

      <div className="px-5 pt-4 pb-1">
        <h3 className="font-display text-[15px] font-bold">Viral Scores</h3>
        <p className="mt-0.5 text-xs text-text-muted">Liczby nie kłamią. Ludzie — owszem.</p>
      </div>

      <div className="px-5 py-4">
        {/* Row 1: Compatibility + Interest */}
        <div className="grid gap-3 lg:grid-cols-2">
          <StaggerItem index={0} isInView={isInView} className="rounded-xl border border-purple-500/[0.06] bg-purple-950/[0.1] p-4">
            <SubLabel isInView={isInView} delay={0.15}>Kompatybilność</SubLabel>
            <CompatibilityGauge score={compatibilityScore} isInView={isInView} />
          </StaggerItem>

          <StaggerItem index={1} isInView={isInView} className="rounded-xl border border-purple-500/[0.06] bg-purple-950/[0.1] p-4">
            <SubLabel isInView={isInView} delay={0.25}>Poziom zainteresowania</SubLabel>
            <InterestBars interestScores={interestScores} participants={sortedParticipants} isInView={isInView} />
          </StaggerItem>
        </div>

        {/* Row 2: Ghost Risk + Investment Asymmetry */}
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <StaggerItem index={2} isInView={isInView} className="rounded-xl border border-purple-500/[0.06] bg-purple-950/[0.1] p-4">
            <SubLabel isInView={isInView} delay={0.35}>Ryzyko ghostingu</SubLabel>
            <div className="space-y-4">
              {sortedParticipants.map((person, index) => {
                const data = ghostRisk[person];
                if (!data) return null;
                return (
                  <GhostRiskMeter
                    key={person}
                    person={person}
                    score={data.score}
                    factors={data.factors}
                    colorIndex={index}
                    isInView={isInView}
                    delay={0.45 + index * 0.12}
                  />
                );
              })}
            </div>
          </StaggerItem>

          <StaggerItem index={3} isInView={isInView} className="rounded-xl border border-purple-500/[0.06] bg-purple-950/[0.1] p-4">
            <SubLabel isInView={isInView} delay={0.45}>Asymetria zaangażowania</SubLabel>
            <AsymmetryDisplay score={delusionScore} moreInvestedPerson={delusionHolder} isInView={isInView} />
          </StaggerItem>
        </div>
      </div>

      <div className="px-5 pb-4">
        <PsychDisclaimer
          text="Wyniki kompatybilności, zainteresowania i asymetrii zaangażowania to metryki rozrywkowe oparte na heurystycznych obliczeniach ilościowych. Nie odzwierciedlają głębszych aspektów relacji."
          showGenericFooter
        />
      </div>
    </div>
  );
}
