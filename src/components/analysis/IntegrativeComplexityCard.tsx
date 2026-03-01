'use client';

import { motion } from 'framer-motion';
import type { IntegrativeComplexityResult } from '@/lib/analysis/quant/integrative-complexity';
import PsychDisclaimer from '@/components/shared/PsychDisclaimer';
import { PSYCH_CITATIONS } from '@/lib/analysis/citations';
import ExperimentalBadge from '@/components/shared/ExperimentalBadge';
import LowSampleBanner from '@/components/shared/LowSampleBanner';

interface IntegrativeComplexityCardProps {
  result: IntegrativeComplexityResult;
  participants: string[];
}

const PERSON_COLORS = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b'];

function icScoreLabel(score: number): string {
  if (score >= 75) return 'Wysoka złożoność';
  if (score >= 50) return 'Umiarkowana złożoność';
  if (score >= 25) return 'Niska złożoność';
  return 'Czarno-białe myślenie';
}

function icScoreColor(score: number): string {
  if (score >= 75) return 'text-emerald-400';
  if (score >= 50) return 'text-blue-400';
  if (score >= 25) return 'text-amber-400';
  return 'text-red-400';
}

function icScoreHex(score: number): string {
  if (score >= 75) return '#10b981';
  if (score >= 50) return '#3b82f6';
  if (score >= 25) return '#f59e0b';
  return '#ef4444';
}

function trendLabel(trend: number): { text: string; color: string } {
  if (trend > 1) return { text: '↑ rośnie', color: 'text-emerald-400' };
  if (trend < -1) return { text: '↓ spada', color: 'text-red-400' };
  return { text: '→ stabilna', color: 'text-white/50' };
}

export default function IntegrativeComplexityCard({ result, participants }: IntegrativeComplexityCardProps) {
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
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
          <span className="text-lg">🧩</span>
        </div>
        <div>
          <h3 className="font-[family-name:var(--font-syne)] text-lg font-semibold text-white">Złożoność Integracyjna</h3>
          <ExperimentalBadge metricKey="integrativeComplexity" />
          <LowSampleBanner show={entries.some(e => e.stats.differentiationCount + e.stats.integrationCount < 5)} className="ml-1" />
          <p className="text-sm text-white/50">Jak nuansowo myślicie o rzeczach</p>
        </div>
      </div>

      {/* Per-person scores */}
      <div className="mb-5 flex flex-col gap-5">
        {entries.map(({ name, stats, color }, index) => {
          const trendInfo = trendLabel(stats.trend);
          return (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-[3px]"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm font-medium text-white">{name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${trendInfo.color}`}>{trendInfo.text}</span>
                  <span
                    className={`font-mono text-2xl font-black ${icScoreColor(stats.icScore)}`}
                    style={{ textShadow: `0 0 20px ${icScoreHex(stats.icScore)}30` }}
                  >
                    {stats.icScore}
                  </span>
                </div>
              </div>

              {/* Score bar */}
              <div
                className="flex h-1.5 overflow-hidden rounded-full bg-white/[0.04]"
                style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }}
              >
                <div
                  className="rounded-full transition-all duration-700"
                  style={{
                    width: `${stats.icScore}%`,
                    background: `linear-gradient(90deg, ${color}90, ${color})`,
                    boxShadow: `0 0 8px ${color}25`,
                  }}
                />
              </div>

              <div className="mt-1.5 flex items-center justify-between">
                <span className={`text-xs ${icScoreColor(stats.icScore)}`}>
                  {icScoreLabel(stats.icScore)}
                </span>
                <span className="text-xs text-white/50">
                  {stats.differentiationCount} dyf. · {stats.integrationCount} int.
                </span>
              </div>

              {/* Example phrases */}
              {stats.examplePhrases.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {stats.examplePhrases.slice(0, 3).map((phrase) => (
                    <span
                      key={phrase}
                      className="rounded bg-white/[0.04] border border-white/[0.03] px-2 py-0.5 text-xs text-white/50"
                    >
                      &ldquo;{phrase}&rdquo;
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Who is higher */}
      {result.higherIC && (
        <div className="mb-4 rounded-lg border border-white/[0.04] bg-white/[0.02] p-4">
          <p className="text-sm text-white/50">
            <span
              className="font-medium"
              style={{ color: PERSON_COLORS[participants.indexOf(result.higherIC) % PERSON_COLORS.length] }}
            >
              {result.higherIC}
            </span>
            {' '}wykazuje wyższą złożoność integracyjną — częściej używa kontrastu i syntezy perspektyw.
          </p>
        </div>
      )}

      <PsychDisclaimer
        text="IC mierzy złożoność myślenia przez frazy dyferencjacji (wiele perspektyw) i integracji (łączenie perspektyw). AutoIC: r=0.30–0.50 test-retest. Malejąca IC koreluje z eskalacją konfliktu (Tetlock, 1981). Wyniki heurystyczne — nie kliniczne."
        citation={`${PSYCH_CITATIONS.icShort}`}
      />
    </div>
  );
}
