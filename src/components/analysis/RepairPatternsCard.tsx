'use client';

import { motion } from 'framer-motion';
import type { RepairPatternsResult } from '@/lib/analysis/quant/repair-patterns';
import PsychDisclaimer from '@/components/shared/PsychDisclaimer';
import { PSYCH_CITATIONS } from '@/lib/analysis/citations';

interface RepairPatternsCardProps {
  result: RepairPatternsResult;
  participants: string[];
}

const PERSON_COLORS = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b'];

function mutualRepairLabel(index: number): { text: string; color: string } {
  if (index >= 60) return { text: 'Bardzo aktywne naprawy', color: 'text-red-400' };
  if (index >= 35) return { text: 'Częste naprawy', color: 'text-amber-400' };
  if (index >= 15) return { text: 'Typowe naprawy', color: 'text-blue-400' };
  return { text: 'Rzadkie naprawy', color: 'text-emerald-400' };
}

function mutualRepairHex(index: number): string {
  if (index >= 60) return '#ef4444';
  if (index >= 35) return '#f59e0b';
  if (index >= 15) return '#3b82f6';
  return '#10b981';
}

export default function RepairPatternsCard({ result, participants }: RepairPatternsCardProps) {
  const entries = participants
    .filter((p) => result.perPerson[p])
    .map((name, idx) => ({
      name,
      stats: result.perPerson[name],
      color: PERSON_COLORS[idx % PERSON_COLORS.length],
    }));

  if (entries.length === 0) return null;

  // Max rate for bar scaling
  const maxRate = Math.max(
    ...entries.flatMap((e) => [e.stats.selfRepairRate, e.stats.otherRepairRate]),
    1,
  );

  const mutualInfo = mutualRepairLabel(result.mutualRepairIndex);
  const mutualHex = mutualRepairHex(result.mutualRepairIndex);

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10">
          <span className="text-lg">🔧</span>
        </div>
        <div>
          <h3 className="font-[family-name:var(--font-syne)] text-lg font-semibold text-white">Wzorce Napraw Konwersacyjnych</h3>
          <p className="text-sm text-white/50">Jak wyjaśniacie i prosicie o wyjaśnienia</p>
        </div>
      </div>

      {/* Mutual Repair Index */}
      <div className="mb-5 rounded-lg border border-white/[0.04] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/50">Wzajemny wskaźnik napraw</span>
          <span
            className={`font-mono text-3xl font-black ${mutualInfo.color}`}
            style={{ textShadow: `0 0 20px ${mutualHex}40` }}
          >
            {result.mutualRepairIndex}
          </span>
        </div>
        <div
          className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-white/[0.04]"
          style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }}
        >
          <div
            className="rounded-full transition-all duration-700"
            style={{
              width: `${result.mutualRepairIndex}%`,
              background: `linear-gradient(90deg, #14b8a690, #14b8a6)`,
              boxShadow: '0 0 8px #14b8a625',
            }}
          />
        </div>
        <p className={`mt-1.5 text-xs ${mutualInfo.color}`}>{mutualInfo.text}</p>
      </div>

      {/* Per-person dual bars */}
      <div className="mb-5 flex flex-col gap-5">
        {entries.map(({ name, stats, color }, index) => (
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
              <span className="bg-white/[0.04] border border-white/[0.03] rounded px-2 py-0.5 text-xs font-medium text-white/50">{stats.label}</span>
            </div>

            {/* Self-repair bar */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="w-20 text-right text-xs text-white/50">Samo-naprawa</span>
                <div
                  className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.04]"
                  style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }}
                >
                  <div
                    className="rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, (stats.selfRepairRate / maxRate) * 100)}%`,
                      background: `linear-gradient(90deg, ${color}90, ${color})`,
                      boxShadow: `0 0 8px ${color}25`,
                    }}
                  />
                </div>
                <span className="w-12 text-right font-mono text-xs text-white/50">
                  {stats.selfRepairRate.toFixed(1)}/100
                </span>
              </div>

              {/* Other-repair bar */}
              <div className="flex items-center gap-2">
                <span className="w-20 text-right text-xs text-white/50">Prosi o wyj.</span>
                <div
                  className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.04]"
                  style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }}
                >
                  <div
                    className="rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, (stats.otherRepairRate / maxRate) * 100)}%`,
                      background: 'linear-gradient(90deg, #f9731690, #f97316)',
                      boxShadow: '0 0 8px #f9731625',
                    }}
                  />
                </div>
                <span className="w-12 text-right font-mono text-xs text-white/50">
                  {stats.otherRepairRate.toFixed(1)}/100
                </span>
              </div>

              {/* Repair initiation ratio */}
              <div className="flex items-center justify-end gap-1 text-xs text-white/50">
                <span>Ratio samo/inne:</span>
                <span className="font-mono text-white">{(stats.repairInitiationRatio * 100).toFixed(0)}%</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <div className="mb-4 flex items-center gap-4 text-xs text-white/50">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-[3px] bg-blue-500" /> Samo-naprawa
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-[3px] bg-orange-500/60" /> Inicjacja naprawy u drugiego
        </span>
      </div>

      {/* Interpretation */}
      {result.interpretation && (
        <div className="mb-4 rounded-lg border border-white/[0.04] bg-white/[0.02] p-4">
          <p className="text-xs text-white/50">{result.interpretation}</p>
        </div>
      )}

      <PsychDisclaimer
        text="Naprawy konwersacyjne wg Schegloff, Jefferson & Sacks (1977). Wysoki wskaźnik samo-napraw sygnalizuje dbałość o precyzję. Dominujący inicjator napraw zewnętrznych może sygnalizować asymetrię władzy w komunikacji."
        citation={`${PSYCH_CITATIONS.repairShort}`}
      />
    </div>
  );
}
