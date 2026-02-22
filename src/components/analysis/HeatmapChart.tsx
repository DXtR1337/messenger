'use client';

import { useMemo, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import type { HeatmapData } from '@/lib/parsers/types';
import { useIsMobile } from './chart-config';

interface HeatmapChartProps {
  heatmap: HeatmapData;
  participants: string[];
}

const DAYS_PL = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'] as const;
const DAYS_SHORT = ['P', 'W', 'Ś', 'C', 'P', 'S', 'N'] as const;
const HOUR_LABELS = [0, 4, 8, 12, 16, 20] as const;
const HOUR_LABELS_NARROW = [0, 6, 12, 18] as const;

function getHeatColor(intensity: number): string {
  if (intensity < 0.1) return 'rgba(59,130,246,0.03)';
  if (intensity < 0.25) return 'rgba(59,130,246,0.1)';
  if (intensity < 0.45) return 'rgba(59,130,246,0.22)';
  if (intensity < 0.65) return 'rgba(59,130,246,0.4)';
  if (intensity < 0.8) return 'rgba(59,130,246,0.6)';
  return 'rgba(59,130,246,0.8)';
}

export default function HeatmapChart({ heatmap }: HeatmapChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true, margin: '-50px' });
  const isMobile = useIsMobile();
  const hourLabels = isMobile ? HOUR_LABELS_NARROW : HOUR_LABELS;
  const dayLabels = isMobile ? DAYS_SHORT : DAYS_PL;

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
    <motion.div
      ref={containerRef}
      role="img"
      aria-label="Mapa aktywności: godzina vs dzień tygodnia"
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="px-5 pt-4">
        <h3 className="font-display text-[15px] font-bold">Godziny aktywności</h3>
        <p className="mt-0.5 text-xs text-text-muted">
          Kiedy rozmawiacie &mdash; heatmapa
        </p>
      </div>

      {/* Overflow-x-auto as a safety net for very narrow screens */}
      <div className="overflow-x-auto px-3 sm:px-5 py-4">
        <div className="flex gap-2">
          {/* Y-axis labels (hours) — uses relative positioning, height driven by grid */}
          <div className="relative shrink-0" style={{ width: 24 }}>
            {hourLabels.map((hour) => (
              <span
                key={hour}
                className="absolute right-0 font-display text-[10px] sm:text-[11px] text-text-muted leading-none"
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
          <div className="flex-1 min-w-0">
            <div
              className="grid gap-[2px] sm:gap-[3px]"
              style={{
                gridTemplateColumns: 'repeat(7, 1fr)',
                gridAutoRows: 'minmax(12px, 16px)',
              }}
            >
              {cells.map((cell) => (
                <div
                  key={`${cell.hour}-${cell.day}`}
                  className="rounded-[3px]"
                  style={{
                    backgroundColor: getHeatColor(cell.intensity),
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
              {dayLabels.map((day, di) => (
                <span
                  key={`${day}-${di}`}
                  className="text-center font-display text-[10px] text-text-muted"
                >
                  {day}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
