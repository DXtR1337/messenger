'use client';

import type { ComparisonRecord } from '@/lib/compare';
import { COMPARISON_COLORS } from '@/lib/compare';

interface Props {
  records: ComparisonRecord[];
}

export default function ColorLegend({ records }: Props) {
  if (records.length < 3) return null;

  return (
    <div className="no-scrollbar sticky top-10 z-20 -mx-4 flex gap-3 overflow-x-auto bg-background/80 px-4 py-1.5 backdrop-blur-xl sm:-mx-6 sm:px-6">
      {records.map((r, i) => (
        <span key={r.analysisId} className="flex shrink-0 items-center gap-1.5">
          <span
            className="inline-block size-2 rounded-full"
            style={{ backgroundColor: COMPARISON_COLORS[i % COMPARISON_COLORS.length] }}
          />
          <span className="text-[11px] text-muted-foreground">{r.partnerName}</span>
        </span>
      ))}
    </div>
  );
}
