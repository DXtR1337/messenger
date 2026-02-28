'use client';

import { memo, useMemo, useRef, useState, useCallback } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import type { HeatmapData } from '@/lib/parsers/types';
import { useIsMobile, CHART_TOOLTIP_STYLE } from './chart-config';

interface HeatmapChartProps {
  heatmap: HeatmapData;
  participants: string[];
}

const DAYS_PL = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'] as const;
const DAYS_SHORT = ['P', 'W', 'Ś', 'C', 'P', 'S', 'N'] as const;
const HOUR_LABELS = [0, 4, 8, 12, 16, 20] as const;
const HOUR_LABELS_NARROW = [0, 6, 12, 18] as const;

interface HeatCell {
  day: number;
  hour: number;
  value: number;
  intensity: number;
}

interface TooltipState {
  cell: HeatCell;
  x: number;
  y: number;
}

function getHeatColor(intensity: number): string {
  if (intensity === 0) return 'rgba(255,255,255,0.015)';
  const t = Math.min(intensity, 1);
  const r = Math.round(59 + (139 - 59) * t);
  const g = Math.round(130 + (92 - 130) * t);
  const b = 246;
  const opacity = 0.08 + t * 0.60;
  return `rgba(${r},${g},${b},${opacity})`;
}

function HeatmapChart({ heatmap }: HeatmapChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true, margin: '-50px' });
  const isMobile = useIsMobile();
  const hourLabels = isMobile ? HOUR_LABELS_NARROW : HOUR_LABELS;
  const dayLabels = isMobile ? DAYS_SHORT : DAYS_PL;

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const handleCellEnter = useCallback((cell: HeatCell, e: React.MouseEvent<HTMLDivElement>) => {
    if (!gridRef.current) return;
    const gridRect = gridRef.current.getBoundingClientRect();
    const cellRect = e.currentTarget.getBoundingClientRect();
    // Position tooltip relative to grid container
    const x = cellRect.left - gridRect.left + cellRect.width / 2;
    const y = cellRect.top - gridRect.top;
    setTooltip({ cell, x, y });
  }, []);

  const handleCellLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const { rows, maxValue } = useMemo(() => {
    if (!heatmap?.combined) return { rows: [] as HeatCell[][], maxValue: 0 };
    const combined = heatmap.combined;
    let max = 0;

    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const val = combined[day]?.[hour] ?? 0;
        if (val > max) max = val;
      }
    }

    const rowArray: HeatCell[][] = [];
    for (let hour = 0; hour < 24; hour++) {
      const row: HeatCell[] = [];
      for (let day = 0; day < 7; day++) {
        const value = combined[day]?.[hour] ?? 0;
        const intensity = max > 0 ? value / max : 0;
        row.push({ day, hour, value, intensity });
      }
      rowArray.push(row);
    }

    return { rows: rowArray, maxValue: max };
  }, [heatmap?.combined]);

  if (!heatmap || !heatmap.combined || rows.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-white/50">
        Brak danych do wyświetlenia
      </div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      role="img"
      aria-label="Mapa aktywności: godzina vs dzień tygodnia"
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="overflow-hidden"
    >
      <div className="px-5 pt-4">
        <h3 className="font-[family-name:var(--font-syne)] text-base font-semibold text-white">Godziny aktywności</h3>
        <p className="mt-0.5 text-xs text-white/50">
          Kiedy rozmawiacie &mdash; heatmapa
        </p>
      </div>

      <div className="overflow-x-auto px-3 sm:px-5 py-4">
        <div className="flex gap-2">
          {/* Y-axis labels */}
          <div className="relative shrink-0" style={{ width: 24 }}>
            {hourLabels.map((hour) => (
              <span
                key={hour}
                className="absolute right-0 font-mono text-[9px] sm:text-[11px] text-white/50 leading-none"
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
          <div className="relative flex-1 min-w-0" ref={gridRef}>
            <div className="flex flex-col gap-[1px] sm:gap-[2px]">
              {rows.map((row, rowIndex) => (
                <motion.div
                  key={rowIndex}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: rowIndex * 0.03, ease: [0.16, 1, 0.3, 1] }}
                  className="grid gap-[1px] sm:gap-[2px]"
                  style={{
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    minHeight: 12,
                    maxHeight: 16,
                  }}
                >
                  {row.map((cell) => {
                    const cellColor = getHeatColor(cell.intensity);
                    const isHovered = tooltip?.cell.day === cell.day && tooltip?.cell.hour === cell.hour;
                    return (
                      <div
                        key={`${cell.hour}-${cell.day}`}
                        className="rounded-[3px] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
                        style={{
                          backgroundColor: cellColor,
                          boxShadow: isHovered
                            ? `0 0 12px ${cellColor}, inset 0 0 0 1px rgba(255,255,255,0.3)`
                            : cell.intensity > 0.7
                              ? `0 0 8px ${cellColor}30`
                              : undefined,
                          cursor: 'default',
                          filter: isHovered ? 'brightness(1.4)' : undefined,
                        }}
                        onMouseEnter={(e) => handleCellEnter(cell, e)}
                        onMouseLeave={handleCellLeave}
                      />
                    );
                  })}
                </motion.div>
              ))}
            </div>

            {/* Floating tooltip */}
            <AnimatePresence>
              {tooltip && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.12 }}
                  className="pointer-events-none absolute z-50"
                  style={{
                    left: tooltip.x,
                    top: tooltip.y - 8,
                    transform: 'translate(-50%, -100%)',
                    ...CHART_TOOLTIP_STYLE,
                    padding: '8px 12px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <p style={{ color: '#aaa', fontSize: 11, marginBottom: 4, fontWeight: 500 }}>
                    {DAYS_PL[tooltip.cell.day]} {String(tooltip.cell.hour).padStart(2, '0')}:00
                  </p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
                      {tooltip.cell.value}
                    </span>
                    <span style={{ color: '#888', fontSize: 11 }}>wiadomości</span>
                  </div>
                  {maxValue > 0 && (
                    <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        height: 3,
                        width: 40,
                        borderRadius: 2,
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.round(tooltip.cell.intensity * 100)}%`,
                          borderRadius: 2,
                          backgroundColor: getHeatColor(tooltip.cell.intensity),
                        }} />
                      </div>
                      <span style={{ color: '#666', fontSize: 10, fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
                        {Math.round(tooltip.cell.intensity * 100)}%
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* X-axis labels (days) */}
            <div
              className="mt-1.5 grid"
              style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}
            >
              {dayLabels.map((day, di) => (
                <span
                  key={`${day}-${di}`}
                  className="text-center font-mono text-[11px] text-white/50"
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

export default memo(HeatmapChart);
