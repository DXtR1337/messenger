'use client';

import { COMPARISON_COLORS } from '@/lib/compare';

interface MetricCompareRowProps {
  label: string;
  values: Array<{ name: string; value: number | null; formatted: string }>;
  /** Higher is better (green highlight). Default true. */
  higherIsBetter?: boolean;
  /** Unit suffix (e.g., '%', 'ms', '/1k') */
  unit?: string;
  /** Info tooltip explaining what this metric is */
  tooltip?: string;
}

export default function MetricCompareRow({
  label,
  values,
  higherIsBetter = true,
  unit = '',
  tooltip,
}: MetricCompareRowProps) {
  const numericValues = values.filter((v) => v.value != null).map((v) => v.value!);
  const maxVal = numericValues.length > 0 ? Math.max(...numericValues) : 0;
  const minVal = numericValues.length > 0 ? Math.min(...numericValues) : 0;
  const absMax = Math.max(Math.abs(maxVal), Math.abs(minVal), 0.001);

  const bestVal = higherIsBetter ? maxVal : minVal;
  const worstVal = higherIsBetter ? minVal : maxVal;

  // Delta percentage between best and worst
  const hasDelta = numericValues.length >= 2 && bestVal !== worstVal && Math.abs(worstVal) > 0.001;
  const deltaPct = hasDelta ? Math.round(((bestVal - worstVal) / Math.abs(worstVal)) * 100) : 0;

  return (
    <div className="flex flex-col gap-1.5 py-2">
      <span className="flex items-center gap-1 text-xs font-medium text-foreground/70">
        {label}
        {tooltip && (
          <span
            className="cursor-help text-[10px] text-muted-foreground/40 transition-colors hover:text-muted-foreground"
            title={tooltip}
          >
            &#9432;
          </span>
        )}
        {hasDelta && Math.abs(deltaPct) >= 10 && (
          <span className="ml-auto font-mono text-[9px] text-[#10b981]/60">
            Δ{Math.abs(deltaPct)}%
          </span>
        )}
      </span>
      <div className="flex flex-col gap-1">
        {values.map((v, i) => {
          const isBest = v.value != null && numericValues.length > 1 && v.value === bestVal;
          const isWorst = v.value != null && numericValues.length > 1 && v.value === worstVal;
          const barWidth =
            v.value != null && absMax > 0
              ? Math.max(2, (Math.abs(v.value) / absMax) * 100)
              : 0;
          const color = COMPARISON_COLORS[i % COMPARISON_COLORS.length];

          return (
            <div
              key={v.name}
              className={`flex items-center gap-2 rounded-md px-1 -mx-1 ${
                isBest ? 'bg-[#10b981]/[0.06]' : ''
              }`}
            >
              <span className="inline-block size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              <span
                className="w-16 shrink-0 truncate text-[11px] text-muted-foreground"
                title={v.name}
              >
                {v.name}
              </span>
              <div className="relative h-[18px] flex-1 overflow-hidden rounded bg-white/[0.03]">
                {v.value != null && (
                  <div
                    className="absolute inset-y-0 left-0 rounded transition-all duration-300"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: color,
                      opacity: isBest ? 0.7 : 0.4,
                    }}
                  />
                )}
              </div>
              <span
                className={`shrink-0 text-right font-mono text-[11px] ${
                  isBest
                    ? 'w-20 font-bold text-[#10b981]'
                    : isWorst
                      ? 'w-16 text-muted-foreground/50'
                      : 'w-16 text-muted-foreground'
                }`}
              >
                {v.value != null ? `${v.formatted}${unit}` : '—'}
                {isBest && hasDelta && Math.abs(deltaPct) >= 5 && (
                  <span className="ml-1 text-[9px] text-[#10b981]/60">
                    {higherIsBetter ? '↑' : '↓'}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
