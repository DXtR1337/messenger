'use client';

import { useMemo } from 'react';
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

interface ResponseTimeChartProps {
  trendData: TrendData['responseTimeTrend'];
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

function formatMinutes(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  return `${minutes}min`;
}

const PERSON_COLORS = ['#3b82f6', '#a855f7'] as const;

interface ChartDataPoint {
  month: string;
  label: string;
  [key: string]: string | number;
}

export default function ResponseTimeChart({
  trendData,
  participants,
}: ResponseTimeChartProps) {
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
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between px-5 pt-4">
        <div>
          <h3 className="font-display text-[0.93rem] font-bold">Czas odpowiedzi</h3>
          <p className="mt-0.5 text-[0.72rem] text-[#555]">
            Mediana czasu odpowiedzi w minutach per osoba
          </p>
        </div>
        <div className="flex gap-3.5">
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
      </div>
      <div className="px-5 py-4">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
              width={50}
              tickFormatter={(value: number) => {
                if (useHours) return `${(value / 3_600_000).toFixed(1)}h`;
                return `${Math.round(value / 60_000)}min`;
              }}
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
              formatter={(value: number | undefined) => {
                if (value == null) return ['', undefined];
                if (useHours) return [`${(value / 3_600_000).toFixed(1)}h`, undefined];
                return [formatMinutes(value), undefined];
              }}
            />
            {participants.map((name, i) => {
              const color = PERSON_COLORS[i] ?? PERSON_COLORS[0];
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
  );
}
