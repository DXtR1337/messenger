'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/utils';
import type { EmotionalGranularityResult } from '@/lib/analysis/quant/emotional-granularity';
import PsychDisclaimer from '@/components/shared/PsychDisclaimer';
import ExperimentalBadge from '@/components/shared/ExperimentalBadge';
import LowSampleBanner from '@/components/shared/LowSampleBanner';

interface EmotionalGranularityCardProps {
  result?: EmotionalGranularityResult;
  participants: string[];
}

const PERSON_COLORS = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b'];

function scoreLabel(score: number): string {
  if (score >= 70) return 'Wysoka różnorodność';
  if (score >= 45) return 'Średnia różnorodność';
  return 'Niska różnorodność';
}

function scoreColorClass(score: number): string {
  if (score >= 70) return 'text-emerald-400';
  if (score >= 45) return 'text-amber-400';
  return 'text-red-400';
}

function scoreHex(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 45) return '#f59e0b';
  return '#ef4444';
}

export default function EmotionalGranularityCard({
  result,
  participants,
}: EmotionalGranularityCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  if (!result) return null;

  const entries = participants
    .filter(name => result.perPerson[name])
    .map((name, idx) => ({
      name,
      data: result.perPerson[name],
      color: PERSON_COLORS[idx % PERSON_COLORS.length],
    }));

  if (entries.length === 0) return null;

  return (
    <div ref={ref} className="overflow-hidden">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10">
          <span className="text-lg">🎭</span>
        </div>
        <div>
          <h3 className="font-[family-name:var(--font-syne)] text-lg font-semibold text-white">Różnorodność Słownictwa Emocjonalnego</h3>
          <ExperimentalBadge metricKey="emotionalGranularity" />
          <LowSampleBanner show={entries.some(e => e.data.emotionalWordCount < 15)} className="ml-1" />
          <p className="text-sm text-white/50">
            Ile różnych kategorii emocji pojawia się w słownictwie
          </p>
        </div>
      </div>

      {/* Per-person */}
      <div className="space-y-5">
        {entries.map(({ name, data, color }, i) => (
          <motion.div
            key={name}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Name + score */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: color }} />
                <span className="text-sm font-medium truncate max-w-[140px] text-white">{name}</span>
                <span className={cn('bg-white/[0.04] border border-white/[0.03] rounded px-2 py-0.5 text-xs font-medium', scoreColorClass(data.granularityScore))}>
                  {scoreLabel(data.granularityScore)}
                </span>
              </div>
              <span
                className={cn('font-mono text-3xl font-black tabular-nums', scoreColorClass(data.granularityScore))}
                style={{ textShadow: `0 0 20px ${scoreHex(data.granularityScore)}40` }}
              >
                {data.granularityScore}
              </span>
            </div>

            {/* Score bar */}
            <div
              className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden"
              style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${scoreHex(data.granularityScore)}90, ${scoreHex(data.granularityScore)})`,
                  boxShadow: `0 0 8px ${scoreHex(data.granularityScore)}25`,
                }}
                initial={{ width: 0 }}
                animate={isInView ? { width: `${data.granularityScore}%` } : { width: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
              />
            </div>

            {/* Stats */}
            <div className="mt-2 flex items-center gap-3 text-xs text-white/50 flex-wrap">
              <span>
                Kategorie:{' '}
                <span className="text-white font-mono font-bold">{data.distinctCategories}</span>
                /12
              </span>
              <span>
                Słowa emocji:{' '}
                <span className="text-white font-mono">{data.emotionalWordCount}</span>
              </span>
              <span>
                Dominuje:{' '}
                <span className="text-white">{data.dominantCategory}</span>
              </span>
            </div>

            {/* Top categories mini-tags */}
            {Object.entries(data.categoryCounts).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.entries(data.categoryCounts)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 6)
                  .map(([cat, cnt]) => (
                    <span
                      key={cat}
                      className="text-xs px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.03] text-white/50"
                    >
                      {cat} {cnt}
                    </span>
                  ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <PsychDisclaimer
        text="Mierzy różnorodność kategorii emocjonalnych w słownictwie (12 kategorii Plutchika rozszerzonych), nie granularność emocjonalną w rozumieniu Barrett & Kashdan (2015), która wymaga pomiaru kowariancji między kategoriami emocji w czasie (metoda ICC). Leksykon słów emocji jest przybliżeniem — wiele emocji wyrażanych jest kontekstowo, bez jawnych słów emocji."
        citation="Vishnubhotla et al., 2024 (EMNLP); Suvak et al., 2011 (J. Traumatic Stress); Kashdan et al., 2015"
        showGenericFooter
      />
    </div>
  );
}
