'use client';

import { useMemo, useState } from 'react';
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
import { cn } from '@/lib/utils';
import type { PatternMetrics } from '@/lib/parsers/types';
import {
  CHART_HEIGHT,
  useAxisWidth,
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_AXIS_TICK,
  CHART_GRID_PROPS,
  PERSON_COLORS_HEX,
  MONTHS_PL,
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

export default function TimelineChart({
  monthlyVolume,
  participants,
}: TimelineChartProps) {
  const [range, setRange] = useState<TimeRange>('Wszystko');
  const axisWidth = useAxisWidth();

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

  return (
    <motion.div
      role="img"
      aria-label="Wykres aktywności wiadomości w czasie"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5 }}
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-5 pt-4">
        <div>
          <h3 className="font-display text-[15px] font-bold">
            Aktywność w czasie
          </h3>
          <p className="mt-0.5 text-xs text-text-muted">
            Wiadomości miesięcznie &mdash; porównanie uczestników
          </p>
        </div>
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
      </div>

      {/* Legend strip */}
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

      <div className="px-3 sm:px-5 py-4">
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
            />
            {participants.map((name, i) => {
              const color = PERSON_COLORS_HEX[i] ?? PERSON_COLORS_HEX[0];
              return (
                <Area
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#area-fill-${i})`}
                  fillOpacity={1}
                  dot={false}
                  activeDot={false}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
