'use client';

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
    <div className="rounded-xl border border-border bg-card p-6">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
          <span className="text-lg">💬</span>
        </div>
        <div>
          <h3 className="font-display text-sm font-bold">Analiza zaimków</h3>
          <p className="text-xs text-muted-foreground">Ja / My / Ty — kto mówi o kim</p>
        </div>
      </div>

      {/* Relationship Orientation */}
      <div className="mb-5 rounded-lg bg-muted p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Orientacja relacyjna</span>
          <span className={`font-display text-sm font-bold ${orientationColor(analysis.relationshipOrientation)}`}>
            {analysis.relationshipOrientation}%
          </span>
        </div>
        <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-card">
          <div
            className="rounded-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 transition-all duration-700"
            style={{ width: `${analysis.relationshipOrientation}%` }}
          />
        </div>
        <p className={`mt-1 text-[11px] ${orientationColor(analysis.relationshipOrientation)}`}>
          {orientationLabel(analysis.relationshipOrientation)}
        </p>
      </div>

      {/* Per-Person Pronoun Rates */}
      <div className="flex flex-col gap-4">
        {entries.map(({ name, stats, color }) => (
          <div key={name}>
            <div className="mb-2 flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs font-medium text-white">{name}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                ja/(ja+my) = {stats.iWeRatio.toFixed(2)}
              </span>
            </div>
            {/* Grouped bars: I / We / You */}
            <div className="flex flex-col gap-1">
              {([
                { label: 'Ja', rate: stats.iRate, cls: 'bg-red-500/70' },
                { label: 'My', rate: stats.weRate, cls: 'bg-emerald-500/70' },
                { label: 'Ty', rate: stats.youRate, cls: 'bg-blue-500/70' },
              ] as const).map(({ label, rate, cls }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-6 text-right text-[10px] text-muted-foreground">{label}</span>
                  <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`${cls} rounded-full transition-all duration-700`}
                      style={{ width: `${Math.min(100, (rate / maxRate) * 100)}%` }}
                    />
                  </div>
                  <span className="w-10 text-right font-mono text-[10px] text-muted-foreground">
                    {rate.toFixed(1)}/k
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <PsychDisclaimer
        text="Wysoki stosunek ja/my sugeruje samoskupienie, niski — orientację relacyjną. Stawki na 1000 słów."
        citation={PSYCH_CITATIONS.pronounShort}
      />
    </div>
  );
}
