'use client';

import { useMemo, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { TrendData } from '@/lib/parsers/types';
import {
  useChartHeight,
  useAxisWidth,
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_AXIS_TICK,
  CHART_GRID_PROPS,
  PERSON_COLORS_HEX,
  MONTHS_PL,
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

function formatMinutes(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  return `${minutes}min`;
}

interface ChartDataPoint {
  month: string;
  label: string;
  [key: string]: string | number;
}

export default function ResponseTimeChart({
  trendData,
  participants,
}: ResponseTimeChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true, margin: '-50px' });
  const chartHeight = useChartHeight();
  const axisWidth = useAxisWidth();
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

  const useHours = maxMs > 3_600_000;

  return (
    <motion.div
      ref={containerRef}
      role="img"
      aria-label="Wykres czasów odpowiedzi"
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-5 pt-4">
        <div>
          <h3 className="font-display text-[15px] font-bold">Czas odpowiedzi</h3>
          <p className="mt-0.5 text-xs text-text-muted">
            Mediana czasu odpowiedzi w minutach per osoba
          </p>
        </div>
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
      </div>
      <div className="px-3 sm:px-5 py-4">
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
              tickFormatter={(value: number) => {
                if (useHours) return `${(value / 3_600_000).toFixed(1)}h`;
                return `${Math.round(value / 60_000)}min`;
              }}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              labelStyle={CHART_TOOLTIP_LABEL_STYLE}
              formatter={(value: number | undefined) => {
                if (value == null) return ['', undefined];
                if (useHours) return [`${(value / 3_600_000).toFixed(1)}h`, undefined];
                return [formatMinutes(value), undefined];
              }}
            />
            {participants.map((name, i) => {
              const color = PERSON_COLORS_HEX[i] ?? PERSON_COLORS_HEX[0];
              return (
                <Line
                  key={name}
                  type="natural"
                  dataKey={name}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
