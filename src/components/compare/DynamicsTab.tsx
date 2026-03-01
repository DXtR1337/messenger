'use client';

import { useMemo } from 'react';
import type { ComparisonRecord } from '@/lib/compare';
import { TRAIT_DIMENSIONS, COMPARISON_COLORS } from '@/lib/compare';

interface Props {
  records: ComparisonRecord[];
  selfName: string;
}

function TraitSlider({
  label,
  selfVal,
  partnerVal,
  color,
}: {
  label: string;
  selfVal: number | null;
  partnerVal: number | null;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="relative h-4 flex-1 rounded-full bg-secondary/30">
        {selfVal != null && (
          <div
            className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full border-2 border-background"
            style={{ left: `${((selfVal - 1) / 9) * 100}%`, backgroundColor: '#3b82f6' }}
            title={`${selfVal.toFixed(1)}`}
          />
        )}
        {partnerVal != null && (
          <div
            className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full border-2 border-background"
            style={{ left: `${((partnerVal - 1) / 9) * 100}%`, backgroundColor: color }}
            title={`${partnerVal.toFixed(1)}`}
          />
        )}
      </div>
      <div className="flex w-16 shrink-0 gap-1 text-right font-mono text-xs">
        <span className="text-blue-400">{selfVal?.toFixed(1) ?? '—'}</span>
        <span className="text-muted-foreground">/</span>
        <span style={{ color }}>{partnerVal?.toFixed(1) ?? '—'}</span>
      </div>
    </div>
  );
}

export default function DynamicsTab({ records, selfName }: Props) {
  const aiRecords = useMemo(
    () => records.filter((r) => r.hasAI && r.selfAI.bigFive),
    [records],
  );

  if (aiRecords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
        <p className="text-sm text-muted-foreground">
          Uruchom analizę AI w co najmniej jednej rozmowie, aby porównać cechy psychologiczne.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-block size-2.5 rounded-full bg-blue-500" /> {selfName}
        <span className="ml-2 inline-block size-2.5 rounded-full bg-purple-500" /> Partner
        <span className="ml-auto">{aiRecords.length}/{records.length} analiz z AI</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {aiRecords.map((r, i) => {
          const color = COMPARISON_COLORS[i % COMPARISON_COLORS.length];
          return (
            <div key={r.analysisId} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="inline-block size-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm font-semibold">{r.partnerName}</span>
                {r.selfAI.mbti && r.partnerAI.mbti && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {r.selfAI.mbti.type} ↔ {r.partnerAI.mbti.type}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {TRAIT_DIMENSIONS.map((trait) => {
                  const selfVal = trait.extractSelf(r.selfAI);
                  const partnerVal = trait.extractPartner(r.partnerAI);
                  return (
                    <TraitSlider
                      key={trait.key}
                      label={trait.label}
                      selfVal={selfVal}
                      partnerVal={partnerVal}
                      color={color}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
