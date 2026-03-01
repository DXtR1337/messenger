'use client';

import { useMemo } from 'react';
import type { ComparisonRecord } from '@/lib/compare';
import { COMPARISON_COLORS } from '@/lib/compare';

interface Props {
  records: ComparisonRecord[];
  selfName: string;
}

function ScoreRing({ score, color, size = 72 }: { score: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const progress = (score / 100) * c;

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${progress} ${c - progress}`}
        strokeDashoffset={c / 4}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        fill="#fafafa" fontSize={size * 0.22} fontWeight="bold" fontFamily="var(--font-jetbrains-mono)">
        {Math.round(score)}
      </text>
    </svg>
  );
}

function HealthBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? '#10b981' : value >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-secondary/30">
        <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="w-8 shrink-0 text-right font-mono text-xs text-muted-foreground">{Math.round(value)}</span>
    </div>
  );
}

export default function HealthTab({ records, selfName }: Props) {
  const healthRecords = useMemo(
    () => records.filter((r) => r.relationshipAI.healthScore || r.relationship.viralScores),
    [records],
  );

  if (healthRecords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
        <p className="text-sm text-muted-foreground">
          Brak danych zdrowia relacji. Uruchom analizę AI lub poczekaj na wyniki.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {healthRecords.map((r, i) => {
        const color = COMPARISON_COLORS[records.indexOf(r) % COMPARISON_COLORS.length];
        const hs = r.relationshipAI.healthScore;
        const vs = r.relationship.viralScores;
        const score = hs?.overall ?? vs?.compatibilityScore ?? 0;
        const components = hs?.components;

        return (
          <div key={r.analysisId} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <ScoreRing score={score} color={color} />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold" style={{ color }}>
                  {r.partnerName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {hs ? 'Health Score (AI)' : 'Kompatybilność (Quant)'}
                </p>
              </div>
            </div>

            {components && (
              <div className="mt-4 space-y-2">
                <HealthBar label="Balance" value={components.balance} />
                <HealthBar label="Wzajemność" value={components.reciprocity} />
                <HealthBar label="Odpowiedzi" value={components.response_pattern} />
                <HealthBar label="Bezpieczeństwo" value={components.emotional_safety} />
                <HealthBar label="Rozwój" value={components.growth_trajectory} />
              </div>
            )}

            {!components && vs && (
              <div className="mt-4 space-y-2">
                <HealthBar label="Kompatybilność" value={vs.compatibilityScore} />
                {r.relationship.reciprocityIndex && (
                  <HealthBar label="Wzajemność" value={r.relationship.reciprocityIndex.overall} />
                )}
                <HealthBar label="Równowaga zaangażowania" value={100 - vs.delusionScore} />
              </div>
            )}

            {/* Flags */}
            {(r.relationshipAI.redFlags.length > 0 || r.relationshipAI.greenFlags.length > 0) && (
              <div className="mt-3 flex gap-3 text-xs">
                {r.relationshipAI.greenFlags.length > 0 && (
                  <span className="text-emerald-400">
                    🟢 {r.relationshipAI.greenFlags.length}
                  </span>
                )}
                {r.relationshipAI.redFlags.length > 0 && (
                  <span className="text-red-400">
                    🔴 {r.relationshipAI.redFlags.length}
                  </span>
                )}
              </div>
            )}

            {/* Top prediction */}
            {r.relationshipAI.predictions.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">Prognoza: </span>
                {r.relationshipAI.predictions[0].prediction}
                <span className="ml-1 font-mono text-primary">
                  ({r.relationshipAI.predictions[0].confidence}%)
                </span>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
