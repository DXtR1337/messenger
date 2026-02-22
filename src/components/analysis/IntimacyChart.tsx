'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { motion } from 'framer-motion';
import type { IntimacyProgression } from '@/lib/parsers/types';
import {
  CHART_HEIGHT,
  useAxisWidth,
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_AXIS_TICK,
  CHART_GRID_PROPS,
  MONTHS_PL,
  monthYearLabelFormatter,
} from './chart-config';

interface IntimacyChartProps {
  intimacy: IntimacyProgression;
}

function formatMonth(ym: string): string {
  const parts = ym.split('-');
  const m = parseInt(parts[1] ?? '0', 10);
  return MONTHS_PL[m - 1] ?? parts[1] ?? '';
}

/** Map intimacy label to appropriate color */
function getLabelColor(label: string): string {
  if (label.includes('Rosnąca')) return '#10b981';
  if (label.includes('Stopniowe zbliżanie') || label.includes('zbliżanie')) return '#3b82f6';
  if (label.includes('Stabilna')) return 'var(--text-muted)';
  if (label.includes('Powolne oddalanie') || label.includes('oddalanie')) return '#f59e0b';
  if (label.includes('Malejąca')) return '#ef4444';
  return 'var(--text-muted)';
}

const COMPONENT_LABELS: Record<string, string> = {
  messageLengthFactor: 'Długość wiadomości',
  emotionalWordsFactor: 'Emocjonalność',
  informalityFactor: 'Nieformalność',
  lateNightFactor: 'Nocne wiadomości',
};

const COMPONENT_COLORS: Record<string, string> = {
  messageLengthFactor: '#3b82f6',
  emotionalWordsFactor: '#a855f7',
  informalityFactor: '#10b981',
  lateNightFactor: '#f59e0b',
};

export default function IntimacyChart({ intimacy }: IntimacyChartProps) {
  const axisWidth = useAxisWidth();

  const chartData = useMemo(() => {
    return intimacy.trend.map((point) => ({
      month: point.month,
      label: formatMonth(point.month),
      score: Math.round(point.score),
    }));
  }, [intimacy.trend]);

  const latestComponents = useMemo(() => {
    if (intimacy.trend.length === 0) return null;
    return intimacy.trend[intimacy.trend.length - 1]!.components;
  }, [intimacy.trend]);

  // Need at least 2 data points for a meaningful chart
  if (chartData.length < 2) return null;

  const fewPoints = chartData.length <= 4;
  const labelColor = getLabelColor(intimacy.label);

  return (
    <motion.div
      role="img"
      aria-label="Wykres progresji bliskości w rozmowie"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5 }}
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      {/* Header */}
      <div className="px-3 sm:px-5 pt-4">
        <h3 className="font-display text-[15px] font-bold">
          Progresja bliskości
        </h3>
        <p className="mt-0.5 text-xs" style={{ color: labelColor }}>
          {intimacy.label}
        </p>
      </div>

      {/* Area chart */}
      <div className="px-3 sm:px-5 py-4">
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="intimacy-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity={0.2} />
                <stop offset="50%" stopColor="#7c3aed" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="intimacy-stroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            <CartesianGrid {...CHART_GRID_PROPS} />
            <XAxis
              dataKey="label"
              tick={CHART_AXIS_TICK}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={CHART_AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={axisWidth}
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              labelStyle={CHART_TOOLTIP_LABEL_STYLE}
              labelFormatter={monthYearLabelFormatter}
              formatter={(value: number | undefined) => {
                if (value == null) return ['', undefined];
                return [`${value}/100`, 'Bliskość'];
              }}
            />
            <Area
              type={fewPoints ? 'linear' : 'monotone'}
              dataKey="score"
              stroke="url(#intimacy-stroke)"
              strokeWidth={fewPoints ? 3 : 2}
              fill="url(#intimacy-gradient)"
              fillOpacity={1}
              dot={
                fewPoints
                  ? { r: 5, fill: '#a855f7', stroke: '#0a0a0a', strokeWidth: 2 }
                  : false
              }
              activeDot={{ r: 6, fill: '#a855f7', stroke: '#0a0a0a', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Component breakdown — most recent month */}
      {latestComponents && (
        <div className="border-t border-border px-3 sm:px-5 py-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-muted">
            Składniki bliskości — ostatni miesiąc
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(Object.keys(COMPONENT_LABELS) as Array<keyof typeof COMPONENT_LABELS>).map(
              (key) => {
                const value = Math.round(
                  latestComponents[key as keyof typeof latestComponents],
                );
                const color = COMPONENT_COLORS[key] ?? '#888';
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-[120px] shrink-0 truncate text-[11px] text-muted-foreground">
                      {COMPONENT_LABELS[key]}
                    </span>
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.04]">
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ backgroundColor: color }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${value}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    <span
                      className="w-7 text-right font-mono text-[10px]"
                      style={{ color }}
                    >
                      {value}
                    </span>
                  </div>
                );
              },
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
