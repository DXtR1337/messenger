'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatNumber } from '@/lib/utils';
import type { QuantitativeAnalysis } from '@/lib/parsers/types';
import {
  CHART_HEIGHT,
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_AXIS_TICK,
  CHART_GRID_PROPS,
  PERSON_COLORS_HEX,
  MONTHS_PL,
  useAxisWidth,
} from './chart-config';

interface MessageLengthSectionProps {
  quantitative: QuantitativeAnalysis;
  participants: string[];
}

function formatMonth(ym: string): string {
  const parts = ym.split('-');
  const m = parseInt(parts[1] ?? '0', 10);
  return MONTHS_PL[m - 1] ?? parts[1] ?? '';
}

function truncateContent(content: string, maxLength = 100): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength).trimEnd() + '...';
}

function formatDatePL(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('pl-PL');
}

interface ChartDataPoint {
  month: string;
  label: string;
  [key: string]: string | number;
}

export default function MessageLengthSection({
  quantitative,
  participants,
}: MessageLengthSectionProps) {
  const axisWidth = useAxisWidth();

  const chartData: ChartDataPoint[] = useMemo(() => {
    return quantitative.trends.messageLengthTrend.map((entry) => {
      const point: ChartDataPoint = {
        month: entry.month,
        label: formatMonth(entry.month),
      };
      for (const name of participants) {
        point[name] = entry.perPerson[name] ?? 0;
      }
      return point;
    });
  }, [quantitative.trends.messageLengthTrend, participants]);

  return (
    <div className="space-y-4">
      {/* Top section: longest and shortest messages per person */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {participants.map((person, index) => {
          const metrics = quantitative.perPerson[person];
          if (!metrics) return null;

          const color = PERSON_COLORS_HEX[index] ?? PERSON_COLORS_HEX[0];

          return (
            <div
              key={person}
              className="overflow-hidden rounded-xl border border-border bg-card"
              style={{ borderLeftColor: color, borderLeftWidth: 3 }}
            >
              <div className="px-3 sm:px-5 pt-4 pb-2">
                <h3
                  className="text-[15px] font-bold"
                  style={{ color }}
                >
                  {person}
                </h3>
              </div>
              <div className="space-y-4 px-3 sm:px-5 pb-4">
                {/* Longest message */}
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Najdłuższa wiadomość
                  </p>
                  <p className="text-[13px] leading-relaxed text-foreground/80">
                    &ldquo;{truncateContent(metrics.longestMessage.content)}&rdquo;
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-mono">
                      {formatNumber(metrics.longestMessage.length)} słów
                    </span>
                    <span className="text-border">|</span>
                    <span>{formatDatePL(metrics.longestMessage.timestamp)}</span>
                  </div>
                </div>

                {/* Shortest message */}
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Najkrótsza wiadomość
                  </p>
                  <p className="text-[13px] leading-relaxed text-foreground/80">
                    &ldquo;{truncateContent(metrics.shortestMessage.content)}&rdquo;
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-mono">
                      {formatNumber(metrics.shortestMessage.length)} słów
                    </span>
                    <span className="text-border">|</span>
                    <span>{formatDatePL(metrics.shortestMessage.timestamp)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom section: message length trend chart */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between px-3 sm:px-5 pt-4">
          <div>
            <h3 className="font-display text-[15px] font-bold">
              Długość wiadomości w czasie
            </h3>
            <p className="mt-0.5 text-xs text-text-muted">
              Średnia liczba słów na wiadomość miesięcznie
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
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
                tickFormatter={(value: number) => `${Math.round(value)}`}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                formatter={(value?: number | string) => [
                  `${Number(value ?? 0).toFixed(1)} słów`,
                ]}
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
                    activeDot={{ r: 4, strokeWidth: 0, fill: color }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
