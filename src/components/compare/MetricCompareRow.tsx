'use client';

import { COMPARISON_COLORS } from '@/lib/compare';

interface MetricCompareRowProps {
  label: string;
  values: Array<{ name: string; value: number | null; formatted: string }>;
  /** Higher is better (green highlight). Default true. */
  higherIsBetter?: boolean;
  /** Unit suffix (e.g., '%', 'ms', '/1k') */
  unit?: string;
}

export default function MetricCompareRow({
  label,
  values,
  higherIsBetter = true,
  unit = '',
}: MetricCompareRowProps) {
  const numericValues = values.filter((v) => v.value != null).map((v) => v.value!);
  const maxVal = numericValues.length > 0 ? Math.max(...numericValues) : 0;
  const minVal = numericValues.length > 0 ? Math.min(...numericValues) : 0;
  const absMax = Math.max(Math.abs(maxVal), Math.abs(minVal), 0.001);

  const bestVal = higherIsBetter ? maxVal : minVal;
  const worstVal = higherIsBetter ? minVal : maxVal;

  return (
    <div className="flex flex-col gap-1.5 py-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
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
            <div key={v.name} className="flex items-center gap-2">
              <span
                className="w-20 shrink-0 truncate text-xs"
                title={v.name}
              >
                {v.name}
              </span>
              <div className="relative h-5 flex-1 overflow-hidden rounded bg-secondary/30">
                {v.value != null && (
                  <div
                    className="absolute inset-y-0 left-0 rounded transition-all duration-300"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: color,
                      opacity: 0.7,
                    }}
                  />
                )}
              </div>
              <span
                className={`w-20 shrink-0 text-right font-mono text-xs ${
                  isBest
                    ? 'font-semibold text-emerald-400'
                    : isWorst
                      ? 'text-amber-400'
                      : 'text-muted-foreground'
                }`}
              >
                {v.value != null ? `${v.formatted}${unit}` : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
