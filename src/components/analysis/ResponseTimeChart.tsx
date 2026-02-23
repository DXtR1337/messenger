'use client';

import { memo, useMemo, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts';
import type { TrendData } from '@/lib/parsers/types';
import {
  useChartHeight,
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

interface ResponseTimeChartProps {
  trendData: TrendData['responseTimeTrend'];
  participants: string[];
}

function formatMonth(ym: string): string {
  const parts = ym.split('-');
  const m = parseInt(parts[1] ?? '0', 10);
  return MONTHS_PL[m - 1] ?? parts[1] ?? '';
}

type TimeUnit = 'seconds' | 'minutes' | 'hours';

function pickUnit(maxMs: number): TimeUnit {
  if (maxMs < 120_000) return 'seconds';   // < 2 min → show seconds
  return 'minutes';                         // always minutes for response times
}

function formatResponseTime(ms: number, unit: TimeUnit): string {
  if (ms <= 0) return '0';
  switch (unit) {
    case 'seconds': return `${Math.round(ms / 1_000)}s`;
    case 'minutes': {
      const min = ms / 60_000;
      return min < 10 ? `${min.toFixed(1)}min` : `${Math.round(min)}min`;
    }
    case 'hours': return `${(ms / 3_600_000).toFixed(1)}h`;
  }
}

function unitLabel(unit: TimeUnit): string {
  switch (unit) {
    case 'seconds': return 'w sekundach';
    case 'minutes': return 'w minutach';
    case 'hours': return 'w godzinach';
  }
}

interface ChartDataPoint {
  month: string;
  label: string;
  [key: string]: string | number;
}

function ResponseTimeChart({
  trendData,
  participants,
}: ResponseTimeChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true, margin: '-50px' });
  const chartHeight = useChartHeight();
  const axisWidth = useAxisWidth();
  const barAxisWidth = useBarAxisWidth();
  const chartData: ChartDataPoint[] = useMemo(() => {
    return trendData.map((entry) => {
      const point: ChartDataPoint = {
        month: entry.month,
        label: formatMonth(entry.month),
      };
      for (const name of participants) {
        // Store in minutes for display
        point[name] = entry.perPerson[name] ?? 0;
      }
      return point;
    });
  }, [trendData, participants]);

  // Determine whether to show hours or minutes
  const maxMs = useMemo(() => {
    let max = 0;
    for (const entry of trendData) {
      for (const name of participants) {
        const val = entry.perPerson[name] ?? 0;
        if (val > max) max = val;
      }
    }
    return max;
  }, [trendData, participants]);

  const unit = pickUnit(maxMs);
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
      ref={containerRef}
      role="img"
      aria-label="Wykres czasów odpowiedzi"
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-5 pt-4">
        <div>
          <h3 className="font-display text-[15px] font-bold">Czas odpowiedzi</h3>
          <p className="mt-0.5 text-xs text-text-muted">
            {singlePoint
              ? `Mediana czasu odpowiedzi per osoba — ${chartData[0]?.label ?? ''}`
              : `Mediana czasu odpowiedzi ${unitLabel(unit)} per osoba`}
          </p>
        </div>
        {/* Legend only for multi-point line chart */}
        {!singlePoint && (
          <div className="flex flex-wrap gap-2 sm:gap-4">
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
      </div>
      <div className="px-3 sm:px-5 py-4">
        {singlePoint ? (
          /* Horizontal bar chart for single month */
          <ResponsiveContainer width="100%" height={barChartHeight}>
            <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
              <CartesianGrid {...CHART_GRID_PROPS} horizontal={false} />
              <XAxis
                type="number"
                tick={CHART_AXIS_TICK}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => formatResponseTime(value, unit)}
              />
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
                  return [formatResponseTime(value, unit), undefined];
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
          /* Standard line chart for multi-month */
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
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
                tickFormatter={(value: number) => formatResponseTime(value, unit)}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                labelFormatter={monthYearLabelFormatter}
                formatter={(value: number | undefined) => {
                  if (value == null) return ['', undefined];
                  return [formatResponseTime(value, unit), undefined];
                }}
              />
              {participants.map((name, i) => {
                const color = PERSON_COLORS_HEX[i] ?? PERSON_COLORS_HEX[0];
                return (
                  <Line
                    key={name}
                    type={fewPoints ? 'linear' : 'natural'}
                    dataKey={name}
                    stroke={color}
                    strokeWidth={fewPoints ? 3 : 2}
                    dot={fewPoints ? { r: 5, fill: color, stroke: '#0a0a0a', strokeWidth: 2 } : false}
                    activeDot={fewPoints ? { r: 7, fill: color, stroke: '#0a0a0a', strokeWidth: 2 } : false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
}

export default memo(ResponseTimeChart);
