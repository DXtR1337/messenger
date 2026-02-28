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
  ReferenceLine,
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
  chartActiveDot,
  useActiveChartLabel,
  ACTIVE_REF_LINE_PROPS,
  ChartTooltipContent,
  formatMonthSmart,
} from './chart-config';

interface TimelineChartProps {
  monthlyVolume: PatternMetrics['monthlyVolume'];
  participants: string[];
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
  const [activeLabel, chartHandlers] = useActiveChartLabel();

  const filteredData = useMemo(() => {
    if (!monthlyVolume || monthlyVolume.length === 0) return [];
    const months = getMonthsForRange(range);
    if (months === Infinity) return monthlyVolume;
    return monthlyVolume.slice(-months);
  }, [monthlyVolume, range]);

  const chartData: ChartDataPoint[] = useMemo(() => {
    const allMonths = filteredData.map((e) => e.month);
    return filteredData.map((entry) => {
      const point: ChartDataPoint = {
        month: entry.month,
        label: formatMonthSmart(entry.month, allMonths),
      };
      for (const name of participants) {
        point[name] = entry.perPerson[name] ?? 0;
      }
      return point;
    });
  }, [filteredData, participants]);

  // Build unique month→label map for XAxis tickFormatter
  const monthLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of chartData) map.set(d.month, d.label);
    return map;
  }, [chartData]);

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

  if (!monthlyVolume || monthlyVolume.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-white/50">
        Brak danych do wyświetlenia
      </div>
    );
  }

  return (
    <motion.div
      role="img"
      aria-label="Wykres aktywności wiadomości w czasie"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5 }}
      className="overflow-hidden"
    >
      <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-5 pt-4">
        <div>
          <h3 className="font-[family-name:var(--font-syne)] text-base font-semibold text-white">
            Aktywność w czasie
          </h3>
          <p className="mt-0.5 text-xs text-white/50">
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
                  'relative cursor-pointer rounded-[5px] border-none bg-transparent px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium transition-colors',
                  range === r
                    ? 'text-white/70'
                    : 'text-text-muted hover:text-muted-foreground',
                )}
              >
                {range === r && (
                  <motion.div
                    layoutId="timeline-range-pill"
                    className="absolute inset-0 rounded-[5px] bg-white/[0.08]"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10">{r}</span>
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
              className="flex items-center gap-1.5 text-xs text-white/50"
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
                formatter={(value) => {
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
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }} {...chartHandlers}>
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
                      <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.0} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid {...CHART_GRID_PROPS} />
              <XAxis
                dataKey="month"
                tick={CHART_AXIS_TICK}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                tickFormatter={(value: string) => monthLabelMap.get(value) ?? value}
              />
              <YAxis
                tick={CHART_AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={axisWidth}
              />
              <Tooltip content={<ChartTooltipContent />} cursor={false} animationDuration={0} />
              {activeLabel != null && <ReferenceLine x={activeLabel} {...ACTIVE_REF_LINE_PROPS} />}
              {participants.map((name, i) => {
                const color = PERSON_COLORS_HEX[i] ?? PERSON_COLORS_HEX[0];
                return (
                  <Area
                    key={name}
                    type={fewPoints ? 'linear' : 'monotone'}
                    dataKey={name}
                    stroke={color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    fill={`url(#area-fill-${i})`}
                    fillOpacity={1}
                    dot={fewPoints ? { r: 4, fill: color, stroke: '#0a0a0a', strokeWidth: 1.5 } : false}
                    activeDot={chartActiveDot(color)}
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
