'use client';

import { useMemo, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { HeatmapData } from '@/lib/parsers/types';
import {
  useChartHeight,
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_AXIS_TICK,
  CHART_GRID_PROPS,
  PERSON_COLORS_HEX,
  CHART_CURSOR_BAR,
  useIsMobile,
  useAxisWidth,
} from './chart-config';

interface HourlyActivityChartProps {
  heatmap: HeatmapData;
  participants: string[];
}

interface ChartDataPoint {
  hour: number;
  label: string;
  [key: string]: string | number;
}

// Extended palette for groups (>2 people)
const EXTENDED_COLORS = [
  '#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316',
  '#6366f1', '#84cc16', '#e11d48', '#0ea5e9', '#d946ef',
  '#22c55e', '#eab308', '#64748b', '#f43f5e', '#a3e635',
];

export default function HourlyActivityChart({
  heatmap,
  participants,
}: HourlyActivityChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true, margin: '-50px' });
  const chartHeight = useChartHeight(280);
  const isMobile = useIsMobile();
  const axisWidth = useAxisWidth();

  // Sum across all 7 days for each hour, per person
  const chartData: ChartDataPoint[] = useMemo(() => {
    const data: ChartDataPoint[] = [];

    for (let hour = 0; hour < 24; hour++) {
      const point: ChartDataPoint = {
        hour,
        label: String(hour).padStart(2, '0'),
      };

      for (const name of participants) {
        const personHeatmap = heatmap.perPerson[name];
        if (!personHeatmap) {
          point[name] = 0;
          continue;
        }

        let sum = 0;
        for (let day = 0; day < 7; day++) {
          sum += personHeatmap[day]?.[hour] ?? 0;
        }
        point[name] = sum;
      }

      data.push(point);
    }

    return data;
  }, [heatmap, participants]);

  // Check if there's any data at all
  const hasData = useMemo(() => {
    return chartData.some((point) =>
      participants.some((name) => (point[name] as number) > 0),
    );
  }, [chartData, participants]);

  if (!hasData) {
    return (
      <div className="py-8 text-center text-sm text-white/50">
        Brak danych do wyświetlenia
      </div>
    );
  }

  const colors = participants.length > 2 ? EXTENDED_COLORS : PERSON_COLORS_HEX;

  return (
    <motion.div
      ref={containerRef}
      role="img"
      aria-label="Wykres aktywności w ciągu dnia"
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="overflow-hidden"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-5 pt-4">
        <div>
          <h3 className="font-[family-name:var(--font-syne)] text-base font-semibold text-white">
            Aktywność w ciągu dnia
          </h3>
          <p className="mt-0.5 text-xs text-white/50">
            Rozkład wiadomości według godziny
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-4">
          {participants.slice(0, isMobile ? 4 : 10).map((name, i) => (
            <span
              key={name}
              className="flex items-center gap-1.5 text-xs text-white/50"
            >
              <span
                className="inline-block size-2 rounded-[3px]"
                style={{
                  backgroundColor: colors[i % colors.length],
                }}
              />
              <span className="truncate max-w-[60px] sm:max-w-[100px]">
                {name}
              </span>
            </span>
          ))}
          {participants.length > (isMobile ? 4 : 10) && (
            <span className="text-xs text-white/50">
              +{participants.length - (isMobile ? 4 : 10)}
            </span>
          )}
        </div>
      </div>

      <div className="px-3 sm:px-5 py-4">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={chartData}
            margin={{
              top: 5,
              right: 5,
              left: isMobile ? -10 : 0,
              bottom: 5,
            }}
          >
            <CartesianGrid {...CHART_GRID_PROPS} />
            <XAxis
              dataKey="label"
              tick={{ ...CHART_AXIS_TICK, fontSize: isMobile ? 8 : 10 }}
              tickLine={false}
              axisLine={false}
              interval={isMobile ? 5 : 2}
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
              labelFormatter={(label) => `${label}:00`}
              formatter={(value, name) => [
                Number(value).toLocaleString('pl-PL'),
                String(name),
              ]}
              cursor={CHART_CURSOR_BAR}
              animationDuration={0}
            />
            {participants.map((name, i) => (
              <Bar
                key={name}
                dataKey={name}
                stackId="hourly"
                fill={colors[i % colors.length]}
                fillOpacity={0.75}
                radius={
                  i === participants.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]
                }
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
