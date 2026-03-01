'use client';

import { useMemo } from 'react';
import type { ComparisonRecord, TraitVariance } from '@/lib/compare';
import { TRAIT_DIMENSIONS, COMPARISON_COLORS, mean, stddev, cv, range, classifyStability } from '@/lib/compare';

interface Props {
  records: ComparisonRecord[];
  selfName: string;
}

export default function VariationsTab({ records, selfName }: Props) {
  const aiRecords = useMemo(
    () => records.filter((r) => r.hasAI && r.selfAI.bigFive),
    [records],
  );

  const variances: TraitVariance[] = useMemo(() => {
    if (aiRecords.length < 3) return [];

    return TRAIT_DIMENSIONS.map((trait) => {
      const values = aiRecords
        .map((r) => trait.extractSelf(r.selfAI))
        .filter((v): v is number => v != null);

      if (values.length < 3) {
        return {
          key: trait.key,
          label: trait.label,
          category: trait.category,
          values,
          mean: mean(values),
          stdDev: stddev(values),
          range: range(values),
          cv: cv(values),
          stability: 'moderate' as const,
        };
      }

      const s = stddev(values);
      const c = cv(values);

      return {
        key: trait.key,
        label: trait.label,
        category: trait.category,
        values,
        mean: mean(values),
        stdDev: s,
        range: range(values),
        cv: c,
        stability: classifyStability(c),
      };
    });
  }, [aiRecords]);

  if (aiRecords.length < 3) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
        <p className="text-sm text-muted-foreground">
          Wymaga min. 3 analiz z AI.
          Obecnie: {aiRecords.length}/{records.length} analiz z danymi AI.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Jak zmienia się profil {selfName} w {aiRecords.length} różnych relacjach
      </p>

      {/* Variance cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {variances.map((v) => {
          const stabilityColor =
            v.stability === 'stable' ? 'text-emerald-400 bg-emerald-500/10'
            : v.stability === 'moderate' ? 'text-amber-400 bg-amber-500/10'
            : 'text-red-400 bg-red-500/10';

          const stabilityLabel =
            v.stability === 'stable' ? 'Stabilna'
            : v.stability === 'moderate' ? 'Umiarkowana'
            : 'Zmienna';

          const barWidth = Math.min(100, v.cv * 2);

          return (
            <div key={v.key} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{v.label}</span>
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${stabilityColor}`}>
                  {stabilityLabel}
                </span>
              </div>

              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>σ = {v.stdDev.toFixed(2)}</span>
                  <span>CV = {v.cv.toFixed(0)}%</span>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-secondary/30">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: v.stability === 'stable' ? '#10b981' : v.stability === 'moderate' ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Średnia: <span className="font-mono font-medium text-foreground">{v.mean.toFixed(1)}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Zakres: <span className="font-mono">{v.range[0].toFixed(1)}–{v.range[1].toFixed(1)}</span>
                  </span>
                </div>
              </div>

              {/* Per-relationship dots */}
              <div className="mt-3 flex items-center gap-1">
                {v.values.map((val, i) => (
                  <div
                    key={i}
                    className="size-2 rounded-full"
                    style={{ backgroundColor: COMPARISON_COLORS[i % COMPARISON_COLORS.length] }}
                    title={`${aiRecords[i]?.partnerName}: ${val.toFixed(1)}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
