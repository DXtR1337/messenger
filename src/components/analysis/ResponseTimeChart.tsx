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
  ReferenceLine,
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
  CHART_CURSOR_BAR,
  chartActiveDot,
  useActiveChartLabel,
  ACTIVE_REF_LINE_PROPS,
  ChartTooltipContent,
  formatMonthSmart,
  formatMonthWithYear,
} from './chart-config';

interface ResponseTimeChartProps {
  trendData: TrendData['responseTimeTrend'];
  participants: string[];
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

/** Response-time-specific tooltip that formats ms values with unit. */
function ResponseTimeTooltip({
  active,
  payload,
  label,
  unit: timeUnit,
}: { active?: boolean; payload?: Array<{ payload?: Record<string, unknown>; color?: string; name?: string; value?: number }>; label?: string | number; unit: TimeUnit }) {
  if (!active || !payload?.length) return null;
  const raw = payload[0]?.payload?.month;
  const title = typeof raw === 'string' ? formatMonthWithYear(raw) : String(label ?? '');
  return (
    <div style={CHART_TOOLTIP_STYLE}>
      <p style={{ ...CHART_TOOLTIP_LABEL_STYLE, marginBottom: 6 }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 3 }}>
        {payload.filter(e => e.value != null).map((entry, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, fontSize: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: entry.color, flexShrink: 0 }} />
              <span style={{ color: '#999' }}>{entry.name}</span>
            </span>
            <span style={{ fontWeight: 600, fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
              {formatResponseTime(Number(entry.value ?? 0), timeUnit)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
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
  const [activeLabel, chartHandlers] = useActiveChartLabel();
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!trendData || trendData.length === 0) return [];
    const allMonths = trendData.map((e) => e.month);
    return trendData.map((entry) => {
      const point: ChartDataPoint = {
        month: entry.month,
        label: formatMonthSmart(entry.month, allMonths),
      };
      for (const name of participants) {
        // Store in minutes for display
        point[name] = entry.perPerson[name] ?? 0;
      }
      return point;
    });
  }, [trendData, participants]);

  const monthLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of chartData) map.set(d.month, d.label);
    return map;
  }, [chartData]);

  // Determine whether to show hours or minutes
  const maxMs = useMemo(() => {
    if (!trendData) return 0;
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

  if (!trendData || trendData.length === 0) {
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
      aria-label="Wykres czasów odpowiedzi"
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="overflow-hidden"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-5 pt-4">
        <div>
          <h3 className="font-[family-name:var(--font-syne)] text-base font-semibold text-white">Czas odpowiedzi</h3>
          <p className="mt-0.5 text-xs text-white/50">
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
                className="flex items-center gap-1.5 text-xs text-white/50"
              >
                <span
                  className="inline-block size-2 rounded-[3px]"
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
              <Tooltip content={<ResponseTimeTooltip unit={unit} />} cursor={CHART_CURSOR_BAR} animationDuration={0} />
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
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }} {...chartHandlers}>
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
                tickFormatter={(value: number) => formatResponseTime(value, unit)}
              />
              <Tooltip content={<ResponseTimeTooltip unit={unit} />} cursor={false} animationDuration={0} />
              {activeLabel != null && <ReferenceLine x={activeLabel} {...ACTIVE_REF_LINE_PROPS} />}
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
                    activeDot={chartActiveDot(color)}
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
