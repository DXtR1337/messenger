'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/utils';
import type { ChronotypeCompatibility } from '@/lib/analysis/quant/chronotype';
import PsychDisclaimer from '@/components/shared/PsychDisclaimer';

interface ChronotypePairProps {
  result?: ChronotypeCompatibility;
}

function formatHour(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 55) return 'text-amber-400';
  return 'text-red-400';
}

function scoreHex(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 55) return '#f59e0b';
  return '#ef4444';
}

function barGradient(score: number): string {
  if (score >= 80) return 'linear-gradient(90deg, #10b981, #34d399)';
  if (score >= 55) return 'linear-gradient(90deg, #f59e0b, #fbbf24)';
  return 'linear-gradient(90deg, #ef4444, #f87171)';
}

const PERSON_COLORS = ['#3b82f6', '#a855f7'];

export default function ChronotypePair({ result }: ChronotypePairProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  if (!result) return null;

  const { persons, matchScore, interpretation, deltaHours } = result;
  const overallMax = Math.max(...persons.flatMap(p => p.hourlyDistribution), 1);
  const glowColor = scoreHex(matchScore);

  return (
    <div ref={ref}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-[family-name:var(--font-syne)] text-lg font-semibold text-white">
            Chronotypy i kompatybilność
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">Behawioralne rytmy dobowe z timestampów</p>
        </div>
        <span
          className={cn('font-mono text-3xl font-black', scoreColor(matchScore))}
          style={{ textShadow: `0 0 20px ${glowColor}40` }}
        >
          {matchScore}%
        </span>
      </div>

      {/* Match bar — Plasma tube */}
      <div className="mb-1">
        <div
          className="relative h-1.5 rounded-full overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.04)',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
          }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: barGradient(matchScore),
              boxShadow: `0 0 12px ${glowColor}30`,
            }}
            initial={{ width: 0 }}
            animate={isInView ? { width: `${matchScore}%` } : { width: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{interpretation}</p>
      </div>

      {/* Person cards */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {persons.map((person, pi) => (
          <motion.div
            key={person.name}
            initial={{ opacity: 0, y: 8 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.35, delay: 0.2 + pi * 0.1 }}
            className="rounded-lg border border-white/[0.04] bg-white/[0.03] p-3"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xl">{person.emoji}</span>
              <div className="min-w-0">
                <p
                  className="text-sm font-semibold truncate"
                  style={{ color: PERSON_COLORS[pi] }}
                >
                  {person.name}
                </p>
                <p className="text-xs text-muted-foreground">{person.label}</p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-0.5 mb-2">
              <div>
                Peak:{' '}
                <span className="text-foreground font-mono">{String(person.peakHour).padStart(2, '0')}:00</span>
              </div>
              <div>
                Środek:{' '}
                <span className="text-foreground font-mono">{formatHour(person.midpoint)}</span>
              </div>
              {person.socialJetLagHours > 0 && (
                <div>
                  Social jet lag:{' '}
                  <span className={cn(
                    'font-mono',
                    person.socialJetLagLevel === 'severe' ? 'text-red-400' :
                    person.socialJetLagLevel === 'moderate' ? 'text-amber-400' :
                    'text-muted-foreground',
                  )}>
                    {person.socialJetLagHours.toFixed(1)}h
                  </span>
                </div>
              )}
            </div>

            {/* 24h activity mini-bar chart */}
            <div className="flex items-end gap-px h-12">
              {person.hourlyDistribution.map((count, h) => (
                <div
                  key={h}
                  className="flex-1 rounded-sm"
                  style={{
                    height: `${Math.max(4, (count / overallMax) * 100)}%`,
                    backgroundColor: PERSON_COLORS[pi],
                    opacity: count > 0 ? 0.7 : 0.15,
                  }}
                  title={`${String(h).padStart(2, '0')}:00 — ${count}`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-0.5">
              <span className="text-[10px] text-muted-foreground/40">0h</span>
              <span className="text-[10px] text-muted-foreground/40">12h</span>
              <span className="text-[10px] text-muted-foreground/40">23h</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Delta + Social Jet Lag footer */}
      <div className="mt-4 rounded-lg border border-white/[0.04] bg-white/[0.02] px-4 py-2.5 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Delta chronotypów</span>
        <span className={cn('text-sm font-mono font-bold', scoreColor(matchScore))}>
          {deltaHours.toFixed(1)}h
        </span>
      </div>
      {result.avgSocialJetLag !== undefined && result.avgSocialJetLag > 0 && (
        <div className="mt-1.5 rounded-lg border border-white/[0.04] bg-white/[0.02] px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Śr. social jet lag</span>
          <span className={cn(
            'text-xs font-mono font-medium',
            result.avgSocialJetLag >= 4 ? 'text-red-400' :
            result.avgSocialJetLag >= 2 ? 'text-amber-400' :
            'text-muted-foreground',
          )}>
            {result.avgSocialJetLag.toFixed(1)}h
          </span>
        </div>
      )}

      <PsychDisclaimer
        text="Chronotyp wyznaczony z timestampów wiadomości — analogia do MCTQ midpoint-of-sleep, bez kontroli snu i strefy czasowej. UK Biobank (N=47,420 par): r=0.24 dla synchronizacji rytmów dobowych. Social jet lag = |midpoint_dni_roboczych − midpoint_weekendu| (Roenneberg et al., 2012). Wyniki zależą od nawyków telefonu."
        citation="Aledavood et al., 2018 (EPJ Data Science, N=400); Jarmolowicz et al., 2022; Roenneberg et al., 2012 (Current Biology)"
        showGenericFooter
      />
    </div>
  );
}
