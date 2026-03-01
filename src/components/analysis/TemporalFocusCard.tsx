'use client';

import { motion } from 'framer-motion';
import type { TemporalFocusResult } from '@/lib/analysis/quant/temporal-focus';
import PsychDisclaimer from '@/components/shared/PsychDisclaimer';
import { PSYCH_CITATIONS } from '@/lib/analysis/citations';
import ExperimentalBadge from '@/components/shared/ExperimentalBadge';

interface TemporalFocusCardProps {
  result?: TemporalFocusResult | null;
  participants: string[];
}

const PERSON_COLORS = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b'];

const ORIENTATION_LABELS: Record<string, string> = {
  retrospective: 'Retrospektywny/a',
  present_focused: 'Teraźniejszy/a',
  prospective: 'Prospektywny/a',
};

const ORIENTATION_COLORS: Record<string, string> = {
  retrospective: 'text-amber-400',
  present_focused: 'text-blue-400',
  prospective: 'text-emerald-400',
};

export default function TemporalFocusCard({ result, participants }: TemporalFocusCardProps) {
  if (!result) return (
    <div className="rounded-xl border border-border bg-card/50 p-6 opacity-50">
      <p className="text-sm text-muted-foreground text-center">Za mało danych dla tej analizy</p>
    </div>
  );

  const entries = participants
    .filter((p) => result.perPerson[p])
    .map((name, idx) => ({
      name,
      stats: result.perPerson[name],
      color: PERSON_COLORS[idx % PERSON_COLORS.length],
    }));

  if (entries.length === 0) return null;

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
          <span className="text-lg">⏳</span>
        </div>
        <div>
          <h3 className="font-[family-name:var(--font-syne)] text-lg font-semibold text-white">Orientacja Temporalna</h3>
          <ExperimentalBadge metricKey="temporalFocus" />
          <p className="text-sm text-white/50">Przeszłość · Teraźniejszość · Przyszłość</p>
        </div>
      </div>

      {/* Per-person temporal segments */}
      <div className="mb-5 flex flex-col gap-5">
        {entries.map(({ name, stats, color }, index) => {
          const total = stats.pastRate + stats.presentRate + stats.futureRate;
          const pastPct = total > 0 ? Math.round((stats.pastRate / total) * 100) : 0;
          const presentPct = total > 0 ? Math.round((stats.presentRate / total) * 100) : 0;
          const futurePct = total > 0 ? Math.round((stats.futureRate / total) * 100) : 0;

          return (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Name + orientation */}
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-[3px]"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm font-medium text-white">{name}</span>
                </div>
                <span className={`text-xs font-medium ${ORIENTATION_COLORS[stats.orientation]}`}>
                  {ORIENTATION_LABELS[stats.orientation]}
                </span>
              </div>

              {/* Stacked bar: Past | Present | Future */}
              <div
                className="flex h-1.5 overflow-hidden rounded-full bg-white/[0.04]"
                style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }}
              >
                <div
                  className="transition-all duration-700"
                  style={{
                    width: `${pastPct}%`,
                    background: 'linear-gradient(90deg, #f59e0b90, #f59e0b)',
                    boxShadow: '0 0 8px #f59e0b25',
                  }}
                  title={`Przeszłość: ${pastPct}%`}
                />
                <div
                  className="transition-all duration-700"
                  style={{
                    width: `${presentPct}%`,
                    background: 'linear-gradient(90deg, #3b82f690, #3b82f6)',
                    boxShadow: '0 0 8px #3b82f625',
                  }}
                  title={`Teraźniejszość: ${presentPct}%`}
                />
                <div
                  className="transition-all duration-700"
                  style={{
                    width: `${futurePct}%`,
                    background: 'linear-gradient(90deg, #10b98190, #10b981)',
                    boxShadow: '0 0 8px #10b98125',
                  }}
                  title={`Przyszłość: ${futurePct}%`}
                />
              </div>

              {/* Percentage labels */}
              <div className="mt-1.5 flex justify-between text-xs text-white/50">
                <span className="text-amber-500/80">↩ {pastPct}% przeszłość</span>
                <span className="text-blue-500/80">{presentPct}% teraz</span>
                <span className="text-emerald-500/80">↪ {futurePct}% przyszłość</span>
              </div>

              {/* Future index */}
              <div className="mt-1 text-right">
                <span className="text-xs text-white/50">
                  FutureIndex: <span className="font-mono text-white">{(stats.futureIndex * 100).toFixed(0)}%</span>
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mb-4 flex items-center gap-3 text-xs text-white/50">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-[3px] bg-amber-500/70" /> Przeszłość
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-[3px] bg-blue-500/70" /> Teraźniejszość
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-[3px] bg-emerald-500/70" /> Przyszłość
        </span>
      </div>

      {/* Interpretation */}
      {result.interpretation && (
        <div className="mb-4 rounded-lg border border-white/[0.04] bg-white/[0.02] p-4">
          <p className="text-xs text-white/50">{result.interpretation}</p>
        </div>
      )}

      <PsychDisclaimer
        text="Orientacja temporalna mierzona przez markery czasu (LIWC: focuspast/present/future). Niska orientacja na przyszłość może korelować z unikającym stylem przywiązania (Vanderbilt et al., 2025). Wyniki heurystyczne."
        citation={`${PSYCH_CITATIONS.temporalFocusShort}`}
      />
    </div>
  );
}
