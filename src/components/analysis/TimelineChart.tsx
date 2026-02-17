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
import { cn } from '@/lib/utils';
import type { PatternMetrics } from '@/lib/parsers/types';

interface TimelineChartProps {
  monthlyVolume: PatternMetrics['monthlyVolume'];
  participants: string[];
}

const MONTHS_PL: Record<string, string> = {
  '01': 'Sty',
  '02': 'Lut',
  '03': 'Mar',
  '04': 'Kwi',
  '05': 'Maj',
  '06': 'Cze',
  '07': 'Lip',
  '08': 'Sie',
  '09': 'Wrz',
  '10': 'Paz',
  '11': 'Lis',
  '12': 'Gru',
};

function formatMonth(ym: string): string {
  const parts = ym.split('-');
  const m = parts[1] ?? '';
  return MONTHS_PL[m] ?? m;
}

const PERSON_COLORS = ['#3b82f6', '#a855f7'] as const;

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
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative flex items-center justify-between px-5 pt-4">
        <div>
          <h3 className="font-display text-[0.93rem] font-bold">
            Aktywnosc w czasie
          </h3>
          <p className="mt-0.5 text-[0.72rem] text-[#555]">
            Wiadomosci miesiecznie &mdash; porownanie uczestnikow
          </p>
        </div>
        <div className="flex gap-0.5 rounded-md bg-white/[0.03] p-0.5">
          {TIME_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'cursor-pointer rounded-[5px] border-none bg-transparent px-3 py-1.5 text-[0.72rem] font-medium transition-colors',
                range === r
                  ? 'bg-white/[0.07] text-white'
                  : 'text-[#555] hover:text-[#888]',
              )}
            >
              {r}
            </button>
          ))}
        </div>

      </div>

      {/* Legend strip */}
      <div className="flex gap-3.5 px-5 pt-2">
        {participants.map((name, i) => (
          <span
            key={name}
            className="flex items-center gap-1.5 text-[0.72rem] text-muted-foreground"
          >
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: PERSON_COLORS[i] ?? PERSON_COLORS[0] }}
            />
            {name}
          </span>
        ))}
      </div>

      <div className="px-5 py-4">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              {participants.map((name, i) => {
                const color = PERSON_COLORS[i] ?? PERSON_COLORS[0];
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
            <CartesianGrid
              strokeDasharray="0"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{
                fill: '#555',
                fontSize: 10,
                fontFamily: 'var(--font-jetbrains-mono), monospace',
              }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{
                fill: '#555',
                fontSize: 10,
                fontFamily: 'var(--font-jetbrains-mono), monospace',
              }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111111',
                border: '1px solid #1a1a1a',
                borderRadius: '8px',
                fontSize: 12,
                color: '#fafafa',
              }}
              labelStyle={{ color: '#888888', marginBottom: 4 }}
            />
            {participants.map((name, i) => {
              const color = PERSON_COLORS[i] ?? PERSON_COLORS[0];
              return (
                <Area
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#area-fill-${i})`}
                  fillOpacity={1}
                  dot={{ r: 3, fill: color, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0, fill: color }}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
