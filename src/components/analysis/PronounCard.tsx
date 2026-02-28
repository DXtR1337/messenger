'use client';

import { motion } from 'framer-motion';
import type { PronounAnalysis } from '@/lib/parsers/types';
import PsychDisclaimer from '@/components/shared/PsychDisclaimer';
import { PSYCH_CITATIONS } from '@/lib/analysis/citations';

interface PronounCardProps {
  analysis: PronounAnalysis;
  participants: string[];
}

const PERSON_COLORS = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b'];

function orientationLabel(score: number): string {
  if (score >= 70) return 'Silna orientacja "my"';
  if (score >= 50) return 'Zrównoważona';
  if (score >= 30) return 'Tendencja do "ja"';
  return 'Silna orientacja "ja"';
}

function orientationColor(score: number): string {
  if (score >= 70) return 'text-emerald-400';
  if (score >= 50) return 'text-blue-400';
  if (score >= 30) return 'text-amber-400';
  return 'text-red-400';
}

function orientationHex(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 50) return '#3b82f6';
  if (score >= 30) return '#f59e0b';
  return '#ef4444';
}

const BAR_COLORS: Record<string, string> = {
  Ja: '#ef4444',
  My: '#10b981',
  Ty: '#3b82f6',
};

export default function PronounCard({ analysis, participants }: PronounCardProps) {
  const entries = participants
    .filter((p) => analysis.perPerson[p])
    .map((name, idx) => ({
      name,
      stats: analysis.perPerson[name],
      color: PERSON_COLORS[idx % PERSON_COLORS.length],
    }));

  if (entries.length === 0) return null;

  // Find max rate for bar scaling
  const maxRate = Math.max(
    ...entries.flatMap((e) => [e.stats.iRate, e.stats.weRate, e.stats.youRate]),
    1,
  );

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
          <span className="text-lg">💬</span>
        </div>
        <div>
          <h3 className="font-[family-name:var(--font-syne)] text-lg font-semibold text-white">Analiza zaimków</h3>
          <p className="text-sm text-white/50">Ja / My / Ty — kto mówi o kim</p>
        </div>
      </div>

      {/* Relationship Orientation */}
      <div className="mb-5 rounded-lg border border-white/[0.04] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/50">Orientacja relacyjna</span>
          <span
            className={`font-mono text-3xl font-black ${orientationColor(analysis.relationshipOrientation)}`}
            style={{ textShadow: `0 0 20px ${orientationHex(analysis.relationshipOrientation)}40` }}
          >
            {analysis.relationshipOrientation}%
          </span>
        </div>
        <div
          className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-white/[0.04]"
          style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }}
        >
          <div
            className="rounded-full transition-all duration-700"
            style={{
              width: `${analysis.relationshipOrientation}%`,
              background: 'linear-gradient(90deg, #ef444490, #f59e0b, #10b981)',
              boxShadow: '0 0 8px rgba(16,185,129,0.25)',
            }}
          />
        </div>
        <p className={`mt-1.5 text-xs ${orientationColor(analysis.relationshipOrientation)}`}>
          {orientationLabel(analysis.relationshipOrientation)}
        </p>
      </div>

      {/* Per-Person Pronoun Rates */}
      <div className="flex flex-col gap-4">
        {entries.map(({ name, stats, color }, index) => (
          <motion.div
            key={name}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-[3px]"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm font-medium text-white">{name}</span>
              <span className="ml-auto text-xs text-white/50">
                ja/(ja+my) = {stats.iWeRatio.toFixed(2)}
              </span>
            </div>
            {/* Grouped bars: I / We / You */}
            <div className="flex flex-col gap-1.5">
              {([
                { label: 'Ja', rate: stats.iRate },
                { label: 'My', rate: stats.weRate },
                { label: 'Ty', rate: stats.youRate },
              ] as const).map(({ label, rate }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-6 text-right text-xs text-white/50">{label}</span>
                  <div
                    className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.04]"
                    style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }}
                  >
                    <div
                      className="rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(100, (rate / maxRate) * 100)}%`,
                        background: `linear-gradient(90deg, ${BAR_COLORS[label]}90, ${BAR_COLORS[label]})`,
                        boxShadow: `0 0 8px ${BAR_COLORS[label]}25`,
                      }}
                    />
                  </div>
                  <span className="w-10 text-right font-mono text-xs text-white/50">
                    {rate.toFixed(1)}/k
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <PsychDisclaimer
        text="Wysoki stosunek ja/my sugeruje samoskupienie, niski — orientację relacyjną. Stawki na 1000 słów. W polskim tekście zaimki jawne (ja, my) niosą akcent pragmatyczny — normy angielskie LIWC nie stosują się bezpośrednio (język pro-drop)."
        citation={`${PSYCH_CITATIONS.pronounShort}; Szymczyk et al., 2012`}
      />
    </div>
  );
}
