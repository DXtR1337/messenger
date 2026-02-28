'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CognitiveFunctionsResult, CognitiveFunction } from '@/lib/analysis/cognitive-functions';
import PsychDisclaimer from '@/components/shared/PsychDisclaimer';
import { PSYCH_CITATIONS } from '@/lib/analysis/citations';

interface CognitiveFunctionsClashProps {
  result: CognitiveFunctionsResult | undefined;
  participants: string[];
}

const PERSON_DOT_CLASSES = ['bg-chart-a', 'bg-chart-b'] as const;

const ROLE_LABELS: Record<string, string> = {
  dominant: 'dominująca',
  auxiliary: 'pomocnicza',
  tertiary: 'trzeciorzędna',
  inferior: 'niższa',
};

function compatColor(score: number): string {
  if (score >= 70) return '#a78bfa';
  if (score >= 50) return '#c084fc';
  return '#e879f9';
}

function compatGlow(score: number): string {
  if (score >= 70) return 'rgba(167,139,250,0.3)';
  if (score >= 50) return 'rgba(192,132,252,0.3)';
  return 'rgba(232,121,249,0.3)';
}

function overallColorClass(score: number): string {
  if (score >= 70) return 'text-violet-400';
  if (score >= 50) return 'text-purple-400';
  return 'text-fuchsia-300';
}

function funcPillColors(func: CognitiveFunction): { bg: string; text: string; border: string; glow: string } {
  const base = func?.[0] ?? 'N';
  switch (base) {
    case 'T': return { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/25', glow: 'rgba(129,140,248,0.2)' };
    case 'F': return { bg: 'bg-fuchsia-500/15', text: 'text-fuchsia-400', border: 'border-fuchsia-500/25', glow: 'rgba(217,70,239,0.2)' };
    case 'S': return { bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/25', glow: 'rgba(167,139,250,0.2)' };
    case 'N': return { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/25', glow: 'rgba(168,85,247,0.2)' };
    default: return { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/15', glow: 'rgba(168,85,247,0.15)' };
  }
}

// Count-up hook
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

function ClashRow({
  clash,
  nameA,
  nameB,
  index,
  isInView,
}: {
  clash: CognitiveFunctionsResult['clashes'][number];
  nameA: string;
  nameB: string;
  index: number;
  isInView: boolean;
}) {
  const delay = 0.15 + index * 0.12;
  const colorsA = funcPillColors(clash.personA.func);
  const colorsB = funcPillColors(clash.personB.func);
  const barColor = compatColor(clash.compatibility);
  const barGlow = compatGlow(clash.compatibility);

  return (
    <motion.div
      className="rounded-lg border border-purple-500/[0.06] bg-purple-950/[0.1] p-3 space-y-2.5"
      initial={{ opacity: 0, y: 12 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Function badges row */}
      <div className="flex items-center justify-between gap-2">
        {/* Person A */}
        <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70 truncate max-w-full">
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', PERSON_DOT_CLASSES[0])} />
            {nameA}
          </span>
          <motion.span
            className={cn(
              'inline-flex items-center rounded-full border px-3 py-1 text-sm font-mono font-bold',
              colorsA.bg, colorsA.text, colorsA.border,
            )}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.4, delay: delay + 0.1, type: 'spring', stiffness: 300, damping: 20 }}
            style={{ boxShadow: isInView ? `0 0 10px ${colorsA.glow}` : 'none' }}
          >
            {clash.personA.func}
          </motion.span>
          <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/50">
            {ROLE_LABELS[clash.personA.role] ?? clash.personA.role}
          </span>
        </div>

        {/* VS divider */}
        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <motion.div
            className="w-px h-4 bg-gradient-to-b from-transparent via-purple-500/40 to-transparent"
            initial={{ scaleY: 0 }}
            animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
            transition={{ duration: 0.4, delay: delay + 0.15 }}
          />
          <span className="text-[9px] font-mono font-bold text-purple-400/60 tracking-widest">VS</span>
          <motion.div
            className="w-px h-4 bg-gradient-to-b from-transparent via-purple-500/40 to-transparent"
            initial={{ scaleY: 0 }}
            animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
            transition={{ duration: 0.4, delay: delay + 0.15 }}
          />
        </div>

        {/* Person B */}
        <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70 truncate max-w-full">
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', PERSON_DOT_CLASSES[1])} />
            {nameB}
          </span>
          <motion.span
            className={cn(
              'inline-flex items-center rounded-full border px-3 py-1 text-sm font-mono font-bold',
              colorsB.bg, colorsB.text, colorsB.border,
            )}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.4, delay: delay + 0.1, type: 'spring', stiffness: 300, damping: 20 }}
            style={{ boxShadow: isInView ? `0 0 10px ${colorsB.glow}` : 'none' }}
          >
            {clash.personB.func}
          </motion.span>
          <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/50">
            {ROLE_LABELS[clash.personB.role] ?? clash.personB.role}
          </span>
        </div>
      </div>

      {/* Description */}
      <motion.p
        className="text-[11px] text-muted-foreground/60 text-center leading-relaxed px-2"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.4, delay: delay + 0.2 }}
      >
        {clash.description}
      </motion.p>

      {/* Compatibility bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-purple-950/[0.2] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: barColor, boxShadow: `0 0 6px ${barGlow}` }}
            initial={{ width: 0 }}
            animate={isInView ? { width: `${clash.compatibility}%` } : { width: 0 }}
            transition={{ duration: 0.8, delay: delay + 0.25, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <motion.span
          className="text-[11px] font-mono text-muted-foreground/60 w-8 text-right tabular-nums"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.3, delay: delay + 0.5 }}
        >
          {clash.compatibility}%
        </motion.span>
      </div>
    </motion.div>
  );
}

export default function CognitiveFunctionsClash({ result, participants }: CognitiveFunctionsClashProps) {
  if (!result) return null;

  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  const stackNames = Object.keys(result.stacks);
  const nameA = stackNames[0] ?? participants[0] ?? 'Osoba A';
  const nameB = stackNames[1] ?? participants[1] ?? 'Osoba B';

  const overallCount = useCountUp(result.overallCompatibility, 1200, isInView);

  return (
    <div
      ref={ref}
      className="rounded-xl border border-purple-500/[0.06] bg-purple-950/[0.08] overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 pt-4 flex items-center gap-3">
        <motion.div
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.4, type: 'spring', stiffness: 300, damping: 20 }}
          style={{ boxShadow: isInView ? '0 0 12px rgba(168,85,247,0.15)' : 'none' }}
        >
          <Brain className="h-4.5 w-4.5 text-purple-400" />
        </motion.div>
        <div>
          <h3 className="font-display text-[15px] font-bold">Funkcje kognitywne</h3>
          <p className="text-xs text-text-muted mt-0.5">Jak wasze mózgi się zderzają</p>
        </div>
      </div>

      {/* Clash rows */}
      <div className="px-5 py-4 space-y-2.5">
        {result.clashes.map((clash, idx) => (
          <ClashRow
            key={idx}
            clash={clash}
            nameA={nameA}
            nameB={nameB}
            index={idx}
            isInView={isInView}
          />
        ))}
      </div>

      {/* Overall compatibility */}
      <div className="mx-5 mb-4">
        <motion.div
          className="flex items-center justify-between rounded-lg border border-purple-500/[0.08] bg-purple-950/[0.15] px-4 py-3"
          initial={{ opacity: 0, y: 8 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <span className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground">
            Kompatybilność kognitywna
          </span>
          <span className={cn('text-2xl font-display font-bold tabular-nums', overallColorClass(result.overallCompatibility))}>
            {overallCount}%
          </span>
        </motion.div>
      </div>

      <div className="px-5 pb-4">
        <PsychDisclaimer
          text="Funkcje kognitywne wyznaczone na podstawie MBTI z analizy tekstu AI. MBTI nie jest mierzone walidowanym kwestionariuszem (MBTI Step II), a typ kognitywny to uproszczony model."
          citation={PSYCH_CITATIONS.mbtiShort}
          showGenericFooter
        />
      </div>
    </div>
  );
}
