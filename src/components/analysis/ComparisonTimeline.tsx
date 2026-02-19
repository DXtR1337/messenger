'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { StoredAnalysis } from '@/lib/analysis/types';
import {
  CHART_HEIGHT,
  useAxisWidth,
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_AXIS_TICK,
  CHART_GRID_PROPS,
  MONTHS_PL,
} from './chart-config';

interface ComparisonTimelineProps {
  analysisA: StoredAnalysis;
  analysisB: StoredAnalysis;
}

interface TimelineDataPoint {
  month: string;
  label: string;
  A: number | undefined;
  B: number | undefined;
}

function formatMonth(ym: string): string {
  const parts = ym.split('-');
  const m = parseInt(parts[1] ?? '0', 10);
  const y = parts[0]?.slice(2) ?? '';
  const monthName = MONTHS_PL[m - 1] ?? parts[1] ?? '';
  return `${monthName} '${y}`;
}

export default function ComparisonTimeline({ analysisA, analysisB }: ComparisonTimelineProps) {
  const axisWidth = useAxisWidth();
  const { data, titleA, titleB } = useMemo(() => {
    const volA = analysisA.quantitative.patterns.monthlyVolume;
    const volB = analysisB.quantitative.patterns.monthlyVolume;

    // Build a union of all months
    const monthSet = new Set<string>();
    for (const entry of volA) monthSet.add(entry.month);
    for (const entry of volB) monthSet.add(entry.month);

    const allMonths = Array.from(monthSet).sort();

    const mapA = new Map(volA.map((e) => [e.month, e.total]));
    const mapB = new Map(volB.map((e) => [e.month, e.total]));

    const chartData: TimelineDataPoint[] = allMonths.map((month) => ({
      month,
      label: formatMonth(month),
      A: mapA.get(month),
      B: mapB.get(month),
    }));

    const tA = analysisA.title.length > 20
      ? analysisA.title.slice(0, 18) + '...'
      : analysisA.title;
    const tB = analysisB.title.length > 20
      ? analysisB.title.slice(0, 18) + '...'
      : analysisB.title;

    return { data: chartData, titleA: tA, titleB: tB };
  }, [analysisA, analysisB]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="px-3 sm:px-5 pt-4 pb-2">
        <h3 className="font-display text-[15px] font-bold">Aktywność w czasie</h3>
        <p className="mt-0.5 text-xs text-text-muted">
          Miesięczna liczba wiadomości obu konwersacji
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 sm:gap-4 px-3 sm:px-5 pt-1">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: '#3b82f6' }} />
          {titleA}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: '#a855f7' }} />
          {titleB}
        </span>
      </div>

      <div className="px-3 sm:px-5 py-4">
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="compare-fill-a" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="compare-fill-b" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#a855f7" stopOpacity={0.01} />
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
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              labelStyle={CHART_TOOLTIP_LABEL_STYLE}
              formatter={(value: number | string | ReadonlyArray<number | string> | undefined, name: string | number | undefined) => {
                const label = name === 'A' ? titleA : titleB;
                const num = typeof value === 'number' ? value.toLocaleString('pl-PL') : '\u2014';
                return [num, label] as [string, string];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 0, height: 0, overflow: 'hidden' }}
            />
            <Area
              type="monotone"
              dataKey="A"
              name="A"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#compare-fill-a)"
              fillOpacity={1}
              connectNulls
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: '#3b82f6' }}
            />
            <Area
              type="monotone"
              dataKey="B"
              name="B"
              stroke="#a855f7"
              strokeWidth={2}
              fill="url(#compare-fill-b)"
              fillOpacity={1}
              connectNulls
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: '#a855f7' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
