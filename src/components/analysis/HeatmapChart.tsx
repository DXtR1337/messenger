'use client';

import { useMemo } from 'react';
import type { HeatmapData } from '@/lib/parsers/types';

interface HeatmapChartProps {
  heatmap: HeatmapData;
  participants: string[];
}

const DAYS_PL = ['Pon', 'Wt', 'Sr', 'Czw', 'Pt', 'Sob', 'Nd'] as const;
const HOUR_LABELS = [0, 4, 8, 12, 16, 20] as const;

function getHeatColor(intensity: number): string {
  if (intensity < 0.1) return 'rgba(59,130,246,0.03)';
  if (intensity < 0.25) return 'rgba(59,130,246,0.1)';
  if (intensity < 0.45) return 'rgba(59,130,246,0.22)';
  if (intensity < 0.65) return 'rgba(59,130,246,0.4)';
  if (intensity < 0.8) return 'rgba(59,130,246,0.6)';
  return 'rgba(59,130,246,0.8)';
}

export default function HeatmapChart({ heatmap }: HeatmapChartProps) {
  const { cells } = useMemo(() => {
    const combined = heatmap.combined;
    let max = 0;

    // combined[dayOfWeek][hourOfDay]
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const val = combined[day]?.[hour] ?? 0;
        if (val > max) max = val;
      }
    }

    // Build cell array: rows = hours (0..23), columns = days (0..6)
    const cellArray: Array<{
      day: number;
      hour: number;
      value: number;
      intensity: number;
    }> = [];

    for (let hour = 0; hour < 24; hour++) {
      for (let day = 0; day < 7; day++) {
        const value = combined[day]?.[hour] ?? 0;
        const intensity = max > 0 ? value / max : 0;
        cellArray.push({ day, hour, value, intensity });
      }
    }

    return { maxVal: max, cells: cellArray };
  }, [heatmap.combined]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="px-5 pt-4">
        <h3 className="font-display text-[0.93rem] font-bold">Godziny aktywnosci</h3>
        <p className="mt-0.5 text-[0.72rem] text-[#555]">
          Kiedy rozmawiacie &mdash; heatmapa
        </p>
      </div>
      <div className="flex gap-2 px-5 py-4">
        {/* Y-axis labels (hours) */}
        <div
          className="relative shrink-0"
          style={{ width: 24, height: 24 * 14 + 23 * 3 }}
        >
          {HOUR_LABELS.map((hour) => (
            <span
              key={hour}
              className="absolute right-0 font-display text-[0.62rem] text-[#555] leading-none"
              style={{
                top: `${(hour / 23) * 100}%`,
                transform: 'translateY(-50%)',
              }}
            >
              {String(hour).padStart(2, '0')}
            </span>
          ))}
        </div>

        {/* Grid + X-axis */}
        <div className="flex-1">
          <div
            className="grid"
            style={{
              gridTemplateColumns: 'repeat(7, 1fr)',
              gridTemplateRows: 'repeat(24, 1fr)',
              gap: '3px',
            }}
          >
            {cells.map((cell) => (
              <div
                key={`${cell.hour}-${cell.day}`}
                className="rounded-[3px] transition-transform duration-150 hover:z-10 hover:scale-[1.4]"
                style={{
                  backgroundColor: getHeatColor(cell.intensity),
                  minHeight: '14px',
                }}
                title={`${DAYS_PL[cell.day]} ${String(cell.hour).padStart(2, '0')}:00 \u2014 ${cell.value} wiad./h`}
              />
            ))}
          </div>

          {/* X-axis labels (days) */}
          <div
            className="mt-1.5 grid"
            style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}
          >
            {DAYS_PL.map((day) => (
              <span
                key={day}
                className="text-center font-display text-[0.62rem] text-[#555]"
              >
                {day}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
