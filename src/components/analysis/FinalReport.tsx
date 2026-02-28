'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/utils';
import type { Pass4Result } from '@/lib/analysis/types';

// Skip ALL Framer Motion work on mobile — JS animations cause flickering
const MOBILE = typeof window !== 'undefined' && window.innerWidth < 768;

interface FinalReportProps {
  pass4: Pass4Result;
  participants: string[];
}

// ---------------------------------------------------------------------------
// Health score arc gauge — semicircle SVG
// ---------------------------------------------------------------------------

const ARC_R = 58;
const ARC_STROKE = 6;
const ARC_CX = 70;
const ARC_CY = 68;
const ARC_CIRC = Math.PI * ARC_R;

function getScoreColor(score: number) {
  if (score < 40) return { color: '#e879f9', glow: 'rgba(232,121,249,0.5)', label: 'Krytyczny' };
  if (score < 70) return { color: '#c084fc', glow: 'rgba(192,132,252,0.5)', label: 'Umiarkowany' };
  return { color: '#a855f7', glow: 'rgba(168,85,247,0.5)', label: 'Zdrowy' };
}

function HealthArc({ score, isInView }: { score: number; isInView: boolean }) {
  const config = getScoreColor(score);
  const offset = ARC_CIRC * (1 - score / 100);

  // Mobile: static SVG, no filter, no motion
  if (MOBILE) {
    return (
      <div className="relative mx-auto" style={{ width: 140, height: 80 }}>
        <svg viewBox="0 0 140 80" fill="none" className="w-full h-full">
          <defs>
            <linearGradient id="health-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={config.color} stopOpacity="0.3" />
              <stop offset="50%" stopColor={config.color} stopOpacity="1" />
              <stop offset="100%" stopColor={config.color} stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <path d={`M ${ARC_CX - ARC_R} ${ARC_CY} A ${ARC_R} ${ARC_R} 0 0 1 ${ARC_CX + ARC_R} ${ARC_CY}`} stroke="rgba(255,255,255,0.06)" strokeWidth={ARC_STROKE} strokeLinecap="round" fill="none" />
          {[0, 25, 50, 75, 100].map(t => {
            const a = Math.PI * (1 - t / 100);
            return <line key={t} x1={ARC_CX + (ARC_R - 10) * Math.cos(a)} y1={ARC_CY - (ARC_R - 10) * Math.sin(a)} x2={ARC_CX + (ARC_R - 6) * Math.cos(a)} y2={ARC_CY - (ARC_R - 6) * Math.sin(a)} stroke="rgba(255,255,255,0.12)" strokeWidth="0.6" />;
          })}
          <path d={`M ${ARC_CX - ARC_R} ${ARC_CY} A ${ARC_R} ${ARC_R} 0 0 1 ${ARC_CX + ARC_R} ${ARC_CY}`} stroke="url(#health-grad)" strokeWidth={ARC_STROKE} strokeLinecap="round" fill="none" strokeDasharray={ARC_CIRC} strokeDashoffset={offset} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className="font-mono text-3xl font-black leading-none" style={{ color: config.color }}>{score}</span>
          <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60 mt-0.5">{config.label}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto" style={{ width: 140, height: 80 }}>
      <svg viewBox="0 0 140 80" fill="none" className="w-full h-full">
        <defs>
          <filter id="health-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="health-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={config.color} stopOpacity="0.3" />
            <stop offset="50%" stopColor={config.color} stopOpacity="1" />
            <stop offset="100%" stopColor={config.color} stopOpacity="0.5" />
          </linearGradient>
        </defs>
        {/* Track */}
        <path
          d={`M ${ARC_CX - ARC_R} ${ARC_CY} A ${ARC_R} ${ARC_R} 0 0 1 ${ARC_CX + ARC_R} ${ARC_CY}`}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={ARC_STROKE}
          strokeLinecap="round"
          fill="none"
        />
        {/* Ticks */}
        {[0, 25, 50, 75, 100].map(t => {
          const a = Math.PI * (1 - t / 100);
          const r1 = ARC_R - 10;
          const r2 = ARC_R - 6;
          return (
            <line
              key={t}
              x1={ARC_CX + r1 * Math.cos(a)} y1={ARC_CY - r1 * Math.sin(a)}
              x2={ARC_CX + r2 * Math.cos(a)} y2={ARC_CY - r2 * Math.sin(a)}
              stroke="rgba(255,255,255,0.12)" strokeWidth="0.6"
            />
          );
        })}
        {/* Active arc */}
        <motion.path
          d={`M ${ARC_CX - ARC_R} ${ARC_CY} A ${ARC_R} ${ARC_R} 0 0 1 ${ARC_CX + ARC_R} ${ARC_CY}`}
          stroke="url(#health-grad)"
          strokeWidth={ARC_STROKE}
          strokeLinecap="round"
          fill="none"
          filter="url(#health-glow)"
          strokeDasharray={ARC_CIRC}
          initial={{ strokeDashoffset: ARC_CIRC }}
          animate={isInView ? { strokeDashoffset: offset } : { strokeDashoffset: ARC_CIRC }}
          transition={{ duration: 1.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      {/* Score value */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
        <motion.span
          className="font-mono text-3xl font-black leading-none"
          style={{ color: config.color, textShadow: `0 0 20px ${config.glow}` }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          {score}
        </motion.span>
        <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60 mt-0.5">
          {config.label}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-score bar with reveal animation
// ---------------------------------------------------------------------------

const HEALTH_LABELS: Array<{
  key: keyof Pass4Result['health_score']['components'];
  label: string;
}> = [
  { key: 'balance', label: 'Równowaga' },
  { key: 'reciprocity', label: 'Wzajemność' },
  { key: 'response_pattern', label: 'Wzorce odpowiedzi' },
  { key: 'emotional_safety', label: 'Bezpieczeństwo emocjonalne' },
  { key: 'growth_trajectory', label: 'Rozwój' },
];

function SubScoreBar({ label, value, index, isInView }: { label: string; value: number; index: number; isInView: boolean }) {
  const config = getScoreColor(value);

  if (MOBILE) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground/80">{label}</span>
          <span className="font-mono font-semibold" style={{ color: config.color }}>{value}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-purple-950/[0.2]">
          <div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${config.color}60, ${config.color})`, width: `${value}%` }} />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-1"
      initial={{ opacity: 0, x: -10 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
      transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
    >
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground/80">{label}</span>
        <span className="font-mono font-semibold" style={{ color: config.color }}>{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-purple-950/[0.2]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${config.color}60, ${config.color})` }}
          initial={{ width: 0 }}
          animate={isInView ? { width: `${value}%` } : { width: 0 }}
          transition={{ duration: 0.8, delay: 0.6 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Significance & direction config
// ---------------------------------------------------------------------------

const SIGNIFICANCE_CONFIG: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  positive: { bg: 'bg-violet-500/[0.06]', border: 'border-violet-400/20', text: 'text-violet-300', dot: 'bg-violet-300' },
  neutral: { bg: 'bg-purple-500/[0.06]', border: 'border-purple-500/20', text: 'text-purple-300', dot: 'bg-purple-400' },
  concerning: { bg: 'bg-fuchsia-500/[0.06]', border: 'border-fuchsia-400/20', text: 'text-fuchsia-300', dot: 'bg-fuchsia-400' },
};

const DIRECTION_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  strengthening: {
    label: 'Wzmacniająca się',
    color: '#c084fc',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 11V3M7 3L3.5 6.5M7 3L10.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    ),
  },
  stable: {
    label: 'Stabilna',
    color: '#a855f7',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
    ),
  },
  weakening: {
    label: 'Słabnąca',
    color: '#d946ef',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 3V11M7 11L3.5 7.5M7 11L10.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    ),
  },
  volatile: {
    label: 'Niestabilna',
    color: '#e879f9',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1.5 7L4 4L6.5 8.5L9.5 5L12.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    ),
  },
};

const PRIORITY_CONFIG: Record<string, { bg: string; border: string; text: string }> = {
  high: { bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/25', text: 'text-fuchsia-300' },
  medium: { bg: 'bg-violet-500/10', border: 'border-violet-500/25', text: 'text-violet-300' },
  low: { bg: 'bg-purple-500/[0.05]', border: 'border-purple-500/10', text: 'text-purple-300/60' },
};

// ---------------------------------------------------------------------------
// Conversation personality metaphor icons
// ---------------------------------------------------------------------------

function MetaphorIcon({ type }: { type: 'movie' | 'weather' | 'word' }) {
  const icons = {
    movie: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="2" y="4" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.2" />
        <path d="M2 8H20M6 4V8M10 4V8M14 4V8M18 4V8M6 14V18M10 14V18M14 14V18M18 14V18" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
        <circle cx="11" cy="12" r="2" stroke="currentColor" strokeWidth="1" />
        <path d="M12.5 12L10 10.5V13.5L12.5 12Z" fill="currentColor" fillOpacity="0.5" />
      </svg>
    ),
    weather: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="9" r="4" stroke="currentColor" strokeWidth="1.2" />
        <path d="M11 2V3.5M11 14.5V16M4 9H5.5M16.5 9H18M5.5 4.5L6.5 5.5M15.5 5.5L16.5 4.5M5.5 13.5L6.5 12.5M15.5 12.5L16.5 13.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
        <path d="M6 17C6 17 8 19 11 19C14 19 16 17 16 17" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      </svg>
    ),
    word: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M4 18L8 4H10L14 18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.5 14H12.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <circle cx="17" cy="7" r="2.5" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
        <path d="M16 17L18 17" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      </svg>
    ),
  };
  return icons[type];
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function FinalReport({ pass4, participants }: FinalReportProps) {
  const {
    executive_summary,
    health_score,
    key_findings,
    relationship_trajectory,
    insights,
    conversation_personality,
  } = pass4;

  const containerRef = useRef<HTMLDivElement>(null);
  const isInViewRaw = useInView(containerRef, { once: true, margin: MOBILE ? '9999px' : '-60px' });
  const isInView = MOBILE ? true : isInViewRaw;

  const dirConfig = DIRECTION_CONFIG[relationship_trajectory.direction] ?? DIRECTION_CONFIG.stable;

  // ── Mobile: fully static render — zero motion.div, zero IntersectionObserver animation ──
  if (MOBILE) {
    return (
      <div ref={containerRef} className="space-y-5">
        {/* Executive Summary */}
        <div className="relative overflow-hidden rounded-lg border border-purple-500/10 bg-purple-950/10 px-5 py-4">
          <div className="flex items-start gap-3">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0 text-purple-400/50">
              <path d="M3 10.5C3 8.5 5 5.5 7 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M9 10.5C9 8.5 11 5.5 13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-sm leading-relaxed text-purple-100/60 italic">{executive_summary}</p>
          </div>
          <div className="mt-3 h-px" style={{ background: 'linear-gradient(90deg, rgba(168,85,247,0.3), transparent 60%)' }} />
        </div>

        {/* Health Score + Trajectory */}
        <div className="grid gap-4">
          <div className="overflow-hidden rounded-xl border border-purple-500/[0.08] bg-purple-950/[0.12] p-4">
            <div className="mb-3 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-purple-400/60">
                <path d="M7 1L8.5 4H12L9.25 6.5L10.25 10L7 7.75L3.75 10L4.75 6.5L2 4H5.5L7 1Z" stroke="currentColor" strokeWidth="1" fill="currentColor" fillOpacity="0.15" />
              </svg>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-purple-300/50">Wynik zdrowia rozmowy</span>
            </div>
            <HealthArc score={health_score.overall} isInView />
            <div className="mt-4 space-y-2.5">
              {HEALTH_LABELS.map((item, idx) => (
                <SubScoreBar key={item.key} label={item.label} value={health_score.components[item.key]} index={idx} isInView />
              ))}
            </div>
            {health_score.explanation && (
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/60 border-t border-purple-500/[0.06] pt-3">{health_score.explanation}</p>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-purple-500/[0.08] bg-purple-950/[0.12] p-4">
            <div className="mb-4 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-purple-400/60">
                <path d="M1 10L4 6L7 8L10 4L13 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="13" cy="2" r="1.5" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="0.6" />
              </svg>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-purple-300/50">Trajektoria relacji</span>
            </div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mb-0.5">Obecna faza</p>
                <p className="text-lg font-semibold capitalize text-foreground/90">{relationship_trajectory.current_phase}</p>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider" style={{ borderColor: `${dirConfig.color}30`, color: dirConfig.color, background: `${dirConfig.color}10` }}>
                <span style={{ color: dirConfig.color }}>{dirConfig.icon}</span>
                {dirConfig.label}
              </div>
            </div>
            {relationship_trajectory.inflection_points.length > 0 && (
              <div className="space-y-2 border-t border-purple-500/[0.06] pt-3">
                <p className="text-[10px] font-mono uppercase tracking-widest text-purple-400/40 mb-2">Punkty zwrotne</p>
                {relationship_trajectory.inflection_points.map((point, idx) => (
                  <div key={idx} className="rounded-lg border border-purple-500/[0.06] bg-purple-950/[0.08] px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground/80">{point.description}</span>
                      {point.approximate_date && <span className="font-mono text-[10px] text-purple-400/50">{point.approximate_date}</span>}
                    </div>
                    {point.evidence && <p className="mt-0.5 text-[11px] text-muted-foreground/60">{point.evidence}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Key Findings */}
        {key_findings.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-purple-400/60">
                <circle cx="7" cy="5" r="4" stroke="currentColor" strokeWidth="1" />
                <path d="M5 10V12H9V10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                <circle cx="7" cy="5" r="1.5" fill="currentColor" fillOpacity="0.3" />
              </svg>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Kluczowe odkrycia</span>
            </div>
            {key_findings.map((finding, idx) => {
              const cfg = SIGNIFICANCE_CONFIG[finding.significance] ?? SIGNIFICANCE_CONFIG.neutral;
              return (
                <div key={idx} className={cn('rounded-lg border px-4 py-3', cfg.bg, cfg.border)}>
                  <div className="flex items-start gap-2">
                    <div className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', cfg.dot)} />
                    <div>
                      <p className={cn('text-sm font-medium', cfg.text)}>{finding.finding}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground/70">{finding.detail}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Wskazówki</span>
            {insights.map((insight, idx) => {
              const pCfg = PRIORITY_CONFIG[insight.priority] ?? PRIORITY_CONFIG.low;
              return (
                <div key={idx} className="flex items-start gap-3 rounded-lg border border-purple-500/[0.06] bg-purple-950/[0.08] px-4 py-3">
                  <span className={cn('mt-0.5 shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider', pCfg.bg, pCfg.border, pCfg.text)}>{insight.priority}</span>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground/60">Dla: <span className="font-medium text-foreground/80">{insight.for}</span></p>
                    <p className="mt-0.5 text-sm text-foreground/85">{insight.insight}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Conversation Personality */}
        <div className="relative overflow-hidden rounded-lg border border-purple-500/15 bg-gradient-to-br from-purple-950/20 to-transparent p-5">
          <span className="relative text-xs font-semibold uppercase tracking-wider text-purple-300/50">Osobowość rozmowy</span>
          <div className="relative mt-4 grid grid-cols-3 gap-4">
            {[
              { type: 'movie' as const, label: 'Gatunek filmowy', value: conversation_personality.if_this_conversation_were_a.movie_genre },
              { type: 'weather' as const, label: 'Pogoda', value: conversation_personality.if_this_conversation_were_a.weather },
              { type: 'word' as const, label: 'Jednym słowem', value: conversation_personality.if_this_conversation_were_a.one_word },
            ].map((item) => (
              <div key={item.type} className="flex flex-col items-center text-center">
                <div className="relative mb-3">
                  <div className="relative flex size-14 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/[0.08] text-purple-400">
                    <MetaphorIcon type={item.type} />
                  </div>
                </div>
                <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-purple-400/35 mb-1.5">{item.label}</p>
                <p className={cn('text-sm font-medium text-purple-100/80', item.type === 'word' && 'font-[var(--font-syne)] text-base font-bold text-purple-100')}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Desktop: full animated experience ──
  return (
    <div ref={containerRef} className="space-y-5">
      {/* ── Executive Summary — dramatic blockquote ── */}
      <motion.div
        className="relative overflow-hidden rounded-lg border border-purple-500/10 bg-purple-950/10 px-5 py-4"
        initial={{ opacity: 0, y: 12 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {/* Giant decorative quote mark */}
        <div className="pointer-events-none absolute -left-2 -top-4 font-[var(--font-syne)] text-[80px] font-black leading-none text-purple-400/[0.06]" aria-hidden="true">
          &ldquo;
        </div>
        <div className="flex items-start gap-3">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0 text-purple-400/50">
            <path d="M3 10.5C3 8.5 5 5.5 7 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M9 10.5C9 8.5 11 5.5 13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p className="text-sm leading-relaxed text-purple-100/60 italic">
            {executive_summary}
          </p>
        </div>
        {/* Accent bottom line */}
        <div className="mt-3 h-px" style={{ background: 'linear-gradient(90deg, rgba(168,85,247,0.3), transparent 60%)' }} />
      </motion.div>

      {/* ── Health Score + Trajectory — 2-column grid ── */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Health Score */}
        <motion.div
          className="overflow-hidden rounded-xl border border-purple-500/[0.08] bg-purple-950/[0.12] p-4"
          initial={{ opacity: 0, x: -16 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="mb-3 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-purple-400/60">
              <path d="M7 1L8.5 4H12L9.25 6.5L10.25 10L7 7.75L3.75 10L4.75 6.5L2 4H5.5L7 1Z" stroke="currentColor" strokeWidth="1" fill="currentColor" fillOpacity="0.15" />
            </svg>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-purple-300/50">
              Wynik zdrowia rozmowy
            </span>
          </div>

          <HealthArc score={health_score.overall} isInView={isInView} />

          <div className="mt-4 space-y-2.5">
            {HEALTH_LABELS.map((item, idx) => (
              <SubScoreBar
                key={item.key}
                label={item.label}
                value={health_score.components[item.key]}
                index={idx}
                isInView={isInView}
              />
            ))}
          </div>

          {health_score.explanation && (
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/60 border-t border-purple-500/[0.06] pt-3">
              {health_score.explanation}
            </p>
          )}
        </motion.div>

        {/* Relationship Trajectory */}
        <motion.div
          className="overflow-hidden rounded-xl border border-purple-500/[0.08] bg-purple-950/[0.12] p-4"
          initial={{ opacity: 0, x: 16 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 16 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="mb-4 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-purple-400/60">
              <path d="M1 10L4 6L7 8L10 4L13 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="13" cy="2" r="1.5" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="0.6" />
            </svg>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-purple-300/50">
              Trajektoria relacji
            </span>
          </div>

          {/* Current phase */}
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mb-0.5">Obecna faza</p>
              <p className="text-lg font-semibold capitalize text-foreground/90">
                {relationship_trajectory.current_phase}
              </p>
            </div>
            <div
              className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
              style={{
                borderColor: `${dirConfig.color}30`,
                color: dirConfig.color,
                background: `${dirConfig.color}10`,
              }}
            >
              <span style={{ color: dirConfig.color }}>{dirConfig.icon}</span>
              {dirConfig.label}
            </div>
          </div>

          {/* Inflection points in trajectory */}
          {relationship_trajectory.inflection_points.length > 0 && (
            <div className="space-y-2 border-t border-purple-500/[0.06] pt-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-purple-400/40 mb-2">
                Punkty zwrotne
              </p>
              {relationship_trajectory.inflection_points.map((point, idx) => (
                <motion.div
                  key={idx}
                  className="rounded-lg border border-purple-500/[0.06] bg-purple-950/[0.08] px-3 py-2"
                  initial={{ opacity: 0, y: 8 }}
                  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                  transition={{ duration: 0.4, delay: 0.5 + idx * 0.1 }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground/80">{point.description}</span>
                    {point.approximate_date && (
                      <span className="font-mono text-[10px] text-purple-400/50">{point.approximate_date}</span>
                    )}
                  </div>
                  {point.evidence && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground/60">{point.evidence}</p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Key Findings ── */}
      {key_findings.length > 0 && (
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-purple-400/60">
              <circle cx="7" cy="5" r="4" stroke="currentColor" strokeWidth="1" />
              <path d="M5 10V12H9V10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              <circle cx="7" cy="5" r="1.5" fill="currentColor" fillOpacity="0.3" />
            </svg>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Kluczowe odkrycia
            </span>
          </div>
          {key_findings.map((finding, idx) => {
            const cfg = SIGNIFICANCE_CONFIG[finding.significance] ?? SIGNIFICANCE_CONFIG.neutral;
            return (
              <motion.div
                key={idx}
                className={cn('rounded-lg border px-4 py-3', cfg.bg, cfg.border)}
                initial={{ opacity: 0, x: idx % 2 === 0 ? -12 : 12 }}
                animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: idx % 2 === 0 ? -12 : 12 }}
                transition={{ duration: 0.4, delay: 0.5 + idx * 0.08 }}
              >
                <div className="flex items-start gap-2">
                  <div className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', cfg.dot)} />
                  <div>
                    <p className={cn('text-sm font-medium', cfg.text)}>{finding.finding}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground/70">{finding.detail}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* ── Insights ── */}
      {insights.length > 0 && (
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            Wskazówki
          </span>
          {insights.map((insight, idx) => {
            const pCfg = PRIORITY_CONFIG[insight.priority] ?? PRIORITY_CONFIG.low;
            return (
              <motion.div
                key={idx}
                className="flex items-start gap-3 rounded-lg border border-purple-500/[0.06] bg-purple-950/[0.08] px-4 py-3"
                initial={{ opacity: 0, y: 8 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                transition={{ duration: 0.4, delay: 0.6 + idx * 0.08 }}
              >
                <span
                  className={cn(
                    'mt-0.5 shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
                    pCfg.bg, pCfg.border, pCfg.text,
                  )}
                >
                  {insight.priority}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground/60">
                    Dla: <span className="font-medium text-foreground/80">{insight.for}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-foreground/85">{insight.insight}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* ── Conversation Personality — dramatic metaphor cards ── */}
      <motion.div
        className="relative overflow-hidden rounded-lg border border-purple-500/15 bg-gradient-to-br from-purple-950/20 to-transparent p-5"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      >
        {/* Ambient glow behind */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 80%, rgba(168,85,247,0.12), transparent 70%)' }}
          aria-hidden="true"
        />

        <span className="relative text-xs font-semibold uppercase tracking-wider text-purple-300/50">
          Osobowość rozmowy
        </span>

        <div className="relative mt-4 grid grid-cols-3 gap-4">
          {[
            { type: 'movie' as const, label: 'Gatunek filmowy', value: conversation_personality.if_this_conversation_were_a.movie_genre },
            { type: 'weather' as const, label: 'Pogoda', value: conversation_personality.if_this_conversation_were_a.weather },
            { type: 'word' as const, label: 'Jednym słowem', value: conversation_personality.if_this_conversation_were_a.one_word },
          ].map((item, idx) => (
            <motion.div
              key={item.type}
              className="group flex flex-col items-center text-center"
              initial={{ opacity: 0, y: 12 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              transition={{ duration: 0.5, delay: 0.8 + idx * 0.12 }}
            >
              {/* Icon with glowing halo */}
              <div className="relative mb-3">
                <div
                  className="pointer-events-none absolute -inset-3 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.2) 0%, transparent 70%)' }}
                  aria-hidden="true"
                />
                <div className="relative flex size-14 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/[0.08] text-purple-400 transition-all duration-500 group-hover:border-purple-400/35 group-hover:bg-purple-500/15 group-hover:shadow-[0_0_24px_rgba(168,85,247,0.25),0_0_8px_rgba(192,132,252,0.15)] group-hover:scale-110">
                  <MetaphorIcon type={item.type} />
                </div>
              </div>
              <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-purple-400/35 mb-1.5">
                {item.label}
              </p>
              <p className={cn(
                'text-sm font-medium text-purple-100/80',
                item.type === 'word' && 'font-[var(--font-syne)] text-base font-bold text-purple-100',
              )}
              style={item.type === 'word' ? { textShadow: '0 0 12px rgba(168,85,247,0.3)' } : undefined}
              >
                {item.value}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
