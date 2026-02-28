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
  ReferenceLine,
} from 'recharts';
import { motion } from 'framer-motion';
import type { QuantitativeAnalysis } from '@/lib/parsers/types';
import {
  CHART_HEIGHT,
  useAxisWidth,
  CHART_AXIS_TICK,
  CHART_GRID_PROPS,
  PERSON_COLORS_HEX,
  useActiveChartLabel,
  ACTIVE_REF_LINE_PROPS,
  chartActiveDot,
  ChartTooltipContent,
  formatMonthSmart,
} from './chart-config';

interface SentimentChartProps {
  quantitative: QuantitativeAnalysis;
  participants: string[];
}

interface ChartDataPoint {
  month: string;
  label: string;
  [key: string]: string | number;
}

export default function SentimentChart({
  quantitative,
  participants,
}: SentimentChartProps) {
  const axisWidth = useAxisWidth();
  const [activeLabel, chartHandlers] = useActiveChartLabel();

  const sentimentTrend = quantitative.trends.sentimentTrend;
  const sentimentPerPerson = quantitative.sentimentAnalysis?.perPerson;

  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!sentimentTrend || sentimentTrend.length === 0) return [];
    const allMonths = sentimentTrend.map((e) => e.month);
    return sentimentTrend.map((entry) => {
      const point: ChartDataPoint = {
        month: entry.month,
        label: formatMonthSmart(entry.month, allMonths),
      };
      for (const name of participants) {
        point[name] = entry.perPerson[name] ?? 0;
      }
      return point;
    });
  }, [sentimentTrend, participants]);

  const monthLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of chartData) map.set(d.month, d.label);
    return map;
  }, [chartData]);

  const fewPoints = chartData.length <= 4;

  if (chartData.length === 0) return null;

  return (
    <motion.div
      role="img"
      aria-label="Wykres trajektorii emocjonalnej w czasie"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5 }}
      className="overflow-hidden"
    >
      <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-5 pt-4">
        <div>
          <h3 className="font-[family-name:var(--font-syne)] text-base font-semibold text-white">
            Trajektoria emocjonalna
          </h3>
          <p className="mt-0.5 text-xs text-white/50">
            Średni sentyment wiadomości per miesiąc
          </p>
        </div>
      </div>

      {/* Legend strip */}
      <div className="flex flex-wrap gap-2 sm:gap-4 px-3 sm:px-5 pt-2">
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

      <div className="px-3 sm:px-5 py-4">
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }} {...chartHandlers}>
            <defs>
              {participants.map((_name, i) => {
                const color = PERSON_COLORS_HEX[i] ?? PERSON_COLORS_HEX[0];
                return (
                  <linearGradient
                    key={`sentiment-grad-pos-${i}`}
                    id={`sentiment-fill-${i}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={color} stopOpacity={0.15} />
                    <stop offset="50%" stopColor={color} stopOpacity={0.02} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.15} />
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
              domain={[-0.3, 0.3]}
              tickFormatter={(v: number) => v.toFixed(1)}
            />
            <Tooltip content={<ChartTooltipContent />} cursor={false} animationDuration={0} />
            {activeLabel != null && <ReferenceLine x={activeLabel} {...ACTIVE_REF_LINE_PROPS} />}
            <ReferenceLine
              y={0}
              stroke="rgba(255,255,255,0.15)"
              strokeDasharray="4 4"
              label={{
                value: 'neutralny',
                position: 'right',
                fill: 'rgba(255,255,255,0.2)',
                fontSize: 9,
              }}
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
                  fill={`url(#sentiment-fill-${i})`}
                  fillOpacity={1}
                  dot={fewPoints ? { r: 5, fill: color, stroke: '#0a0a0a', strokeWidth: 2 } : false}
                  activeDot={chartActiveDot(color)}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Per-person sentiment summary stats */}
      {sentimentPerPerson && (
        <div className="flex flex-wrap gap-3 px-3 sm:px-5 pb-4">
          {participants.map((name, i) => {
            const stats = sentimentPerPerson[name];
            if (!stats) return null;
            const color = PERSON_COLORS_HEX[i] ?? PERSON_COLORS_HEX[0];
            const sentimentColor = stats.avgSentiment >= 0 ? '#10b981' : '#ef4444';
            return (
              <div
                key={name}
                className="flex-1 min-w-[140px] rounded-lg border border-border bg-white/[0.02] p-3"
                style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <span
                    className="inline-block size-2 rounded-[3px]"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-medium text-muted-foreground truncate">
                    {name}
                  </span>
                </div>

                {/* Average sentiment */}
                <div className="mb-2">
                  <span className="text-[11px] uppercase tracking-wider text-text-muted">
                    Śr. sentyment
                  </span>
                  <div
                    className="text-lg font-bold font-mono"
                    style={{ color: sentimentColor }}
                  >
                    {stats.avgSentiment >= 0 ? '+' : ''}{stats.avgSentiment.toFixed(3)}
                  </div>
                </div>

                {/* Positive / Negative ratio bars */}
                <div className="flex gap-2 mb-2">
                  <div className="flex-1">
                    <span className="text-[11px] text-text-muted">Pozytywne</span>
                    <div className="mt-0.5 h-1.5 w-full rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round(stats.positiveRatio * 100)}%`,
                          backgroundColor: '#10b981',
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-text-muted">
                      {Math.round(stats.positiveRatio * 100)}%
                    </span>
                  </div>
                  <div className="flex-1">
                    <span className="text-[11px] text-text-muted">Negatywne</span>
                    <div className="mt-0.5 h-1.5 w-full rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round(stats.negativeRatio * 100)}%`,
                          backgroundColor: '#ef4444',
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-text-muted">
                      {Math.round(stats.negativeRatio * 100)}%
                    </span>
                  </div>
                </div>

                {/* Emotional volatility */}
                <div>
                  <span className="text-[11px] text-text-muted">Zmienność emocji</span>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <div className="h-1.5 flex-1 rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(Math.round(stats.emotionalVolatility * 100), 100)}%`,
                          backgroundColor: '#f59e0b',
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-text-muted">
                      {stats.emotionalVolatility.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
