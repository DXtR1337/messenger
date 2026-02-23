'use client';

import { memo, useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { PatternMetrics } from '@/lib/parsers/types';
import {
  CHART_HEIGHT,
  useAxisWidth,
  useBarAxisWidth,
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_AXIS_TICK,
  CHART_GRID_PROPS,
  PERSON_COLORS_HEX,
  MONTHS_PL,
  monthYearLabelFormatter,
} from './chart-config';

interface TimelineChartProps {
  monthlyVolume: PatternMetrics['monthlyVolume'];
  participants: string[];
}

function formatMonth(ym: string): string {
  const parts = ym.split('-');
  const m = parseInt(parts[1] ?? '0', 10);
  return MONTHS_PL[m - 1] ?? parts[1] ?? '';
}

type TimeRange = '3M' | '6M' | 'Rok' | 'Wszystko';
const TIME_RANGES: TimeRange[] = ['3M', '6M', 'Rok', 'Wszystko'];

function getMonthsForRange(range: TimeRange): number {
  switch (range) {
    case '3M':
      return 3;
    case '6M':
      return 6;
    case 'Rok':
      return 12;
    case 'Wszystko':
      return Infinity;
  }
}

interface ChartDataPoint {
  month: string;
  label: string;
  [key: string]: string | number;
}

function TimelineChart({
  monthlyVolume,
  participants,
}: TimelineChartProps) {
  const [range, setRange] = useState<TimeRange>('Wszystko');
  const axisWidth = useAxisWidth();
  const barAxisWidth = useBarAxisWidth();

  const filteredData = useMemo(() => {
    const months = getMonthsForRange(range);
    if (months === Infinity) return monthlyVolume;
    return monthlyVolume.slice(-months);
  }, [monthlyVolume, range]);

  const chartData: ChartDataPoint[] = useMemo(() => {
    return filteredData.map((entry) => {
      const point: ChartDataPoint = {
        month: entry.month,
        label: formatMonth(entry.month),
      };
      for (const name of participants) {
        point[name] = entry.perPerson[name] ?? 0;
      }
      return point;
    });
  }, [filteredData, participants]);

  // Show dots and different interpolation for small datasets
  const fewPoints = chartData.length <= 4;
  const singlePoint = chartData.length <= 1;

  // For single data point: build sorted horizontal bar data
  const barData = useMemo(() => {
    if (!singlePoint || chartData.length === 0) return [];
    const point = chartData[0];
    return participants
      .map((name, i) => ({
        name,
        value: (point[name] as number) ?? 0,
        color: PERSON_COLORS_HEX[i] ?? PERSON_COLORS_HEX[0],
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [singlePoint, chartData, participants]);

  const barChartHeight = Math.max(200, barData.length * 32 + 40);

  return (
    <motion.div
      role="img"
      aria-label="Wykres aktywności wiadomości w czasie"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5 }}
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-5 pt-4">
        <div>
          <h3 className="font-display text-[15px] font-bold">
            Aktywność w czasie
          </h3>
          <p className="mt-0.5 text-xs text-text-muted">
            {singlePoint
              ? `Wiadomości na osobę — ${chartData[0]?.label ?? ''}`
              : 'Wiadomości miesięcznie \u2014 porównanie uczestników'}
          </p>
        </div>
        {!singlePoint && (
          <div className="flex gap-0.5 rounded-md bg-white/[0.03] p-0.5">
            {TIME_RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  'cursor-pointer rounded-[5px] border-none bg-transparent px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium transition-colors',
                  range === r
                    ? 'bg-white/[0.07] text-white'
                    : 'text-text-muted hover:text-muted-foreground',
                )}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Legend strip — only for multi-point area chart */}
      {!singlePoint && (
        <div className="flex flex-wrap gap-2 sm:gap-4 px-3 sm:px-5 pt-2">
          {participants.map((name, i) => (
            <span
              key={name}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span
                className="inline-block h-2 w-2 rounded-sm"
                style={{ backgroundColor: PERSON_COLORS_HEX[i] ?? PERSON_COLORS_HEX[0] }}
              />
              {name}
            </span>
          ))}
        </div>
      )}

      <div className="px-3 sm:px-5 py-4">
        {singlePoint ? (
          /* Horizontal bar chart for single month */
          <ResponsiveContainer width="100%" height={barChartHeight}>
            <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
              <CartesianGrid {...CHART_GRID_PROPS} horizontal={false} />
              <XAxis type="number" tick={CHART_AXIS_TICK} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ ...CHART_AXIS_TICK, width: barAxisWidth - 10 }}
                tickLine={false}
                axisLine={false}
                width={barAxisWidth}
                tickFormatter={(name: string) => name.length > 10 ? name.slice(0, 9) + '\u2026' : name}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                formatter={(value: number | undefined) => {
                  if (value == null) return ['', undefined];
                  return [`${value} wiadomości`, undefined];
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                {barData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          /* Standard area chart for multi-month */
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                {participants.map((name, i) => {
                  const color = PERSON_COLORS_HEX[i] ?? PERSON_COLORS_HEX[0];
                  return (
                    <linearGradient
                      key={name}
                      id={`area-fill-${i}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor={color} stopOpacity={0.12} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.01} />
                    </linearGradient>
                  );
                })}
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
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                labelFormatter={monthYearLabelFormatter}
              />
              {participants.map((name, i) => {
                const color = PERSON_COLORS_HEX[i] ?? PERSON_COLORS_HEX[0];
                return (
                  <Area
                    key={name}
                    type={fewPoints ? 'linear' : 'monotone'}
                    dataKey={name}
                    stroke={color}
                    strokeWidth={fewPoints ? 3 : 2}
                    fill={`url(#area-fill-${i})`}
                    fillOpacity={1}
                    dot={fewPoints ? { r: 5, fill: color, stroke: '#0a0a0a', strokeWidth: 2 } : false}
                    activeDot={fewPoints ? { r: 7, fill: color, stroke: '#0a0a0a', strokeWidth: 2 } : false}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
}

export default memo(TimelineChart);
