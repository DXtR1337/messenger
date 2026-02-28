'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import type { QuantitativeAnalysis } from '@/lib/parsers/types';
import { formatNumber } from '@/lib/utils';
import {
  CHART_HEIGHT,
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_AXIS_TICK,
  CHART_GRID_PROPS,
  PERSON_COLORS_HEX,
  CHART_CURSOR_BAR,
  useAxisWidth,
} from './chart-config';

interface WeekdayWeekendCardProps {
  quantitative: QuantitativeAnalysis;
  participants: string[];
}

export default function WeekdayWeekendCard({
  quantitative,
  participants,
}: WeekdayWeekendCardProps) {
  const axisWidth = useAxisWidth();
  const { weekday, weekend } = quantitative.patterns.weekdayWeekend;

  const weekdayTotal = useMemo(
    () => Object.values(weekday).reduce((sum, count) => sum + count, 0),
    [weekday],
  );

  const weekendTotal = useMemo(
    () => Object.values(weekend).reduce((sum, count) => sum + count, 0),
    [weekend],
  );

  const chartData = useMemo(
    () => [
      {
        name: 'Dni robocze',
        ...participants.reduce(
          (acc, p) => ({ ...acc, [p]: weekday[p] ?? 0 }),
          {} as Record<string, number>,
        ),
      },
      {
        name: 'Weekend',
        ...participants.reduce(
          (acc, p) => ({ ...acc, [p]: weekend[p] ?? 0 }),
          {} as Record<string, number>,
        ),
      },
    ],
    [participants, weekday, weekend],
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5 }}
      className="overflow-hidden"
    >
      <div className="px-4 sm:px-6 pt-4">
        <h3 className="font-[family-name:var(--font-syne)] text-base font-semibold text-white">
          Dni robocze vs Weekend
        </h3>
        <p className="mt-0.5 text-xs text-white/50">
          Porównanie aktywności w tygodniu i na weekendzie
        </p>
      </div>

      <div className="flex flex-col gap-5 px-4 sm:px-6 py-4">
        {/* Stat blocks */}
        <div className="grid grid-cols-2 gap-4">
          {/* Weekday block */}
          <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-4 py-3">
            <p className="text-[11px] tracking-[0.15em] text-white/50 uppercase font-medium">
              Dni robocze
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-foreground">
              {formatNumber(weekdayTotal)}
            </p>
            <div className="mt-2 flex flex-col gap-1">
              {participants.map((name, i) => (
                <div key={name} className="flex items-center gap-1.5 text-[11px]">
                  <span
                    className="inline-block size-2.5 rounded-[3px]"
                    style={{ backgroundColor: PERSON_COLORS_HEX[i] ?? PERSON_COLORS_HEX[0] }}
                  />
                  <span className="text-white/50">{name}</span>
                  <span className="ml-auto font-display text-foreground">
                    {formatNumber(weekday[name] ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Weekend block */}
          <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-4 py-3">
            <p className="text-[11px] tracking-[0.15em] text-white/50 uppercase font-medium">
              Weekend
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-foreground">
              {formatNumber(weekendTotal)}
            </p>
            <div className="mt-2 flex flex-col gap-1">
              {participants.map((name, i) => (
                <div key={name} className="flex items-center gap-1.5 text-[11px]">
                  <span
                    className="inline-block size-2.5 rounded-[3px]"
                    style={{ backgroundColor: PERSON_COLORS_HEX[i] ?? PERSON_COLORS_HEX[0] }}
                  />
                  <span className="text-white/50">{name}</span>
                  <span className="ml-auto font-display text-foreground">
                    {formatNumber(weekend[name] ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bar chart */}
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid {...CHART_GRID_PROPS} />
            <XAxis
              dataKey="name"
              tick={CHART_AXIS_TICK}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={CHART_AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={axisWidth}
              tickFormatter={(value: number) => formatNumber(value)}
            />
            <Tooltip
              cursor={CHART_CURSOR_BAR}
              animationDuration={0}
              contentStyle={CHART_TOOLTIP_STYLE}
              labelStyle={CHART_TOOLTIP_LABEL_STYLE}
              formatter={(value) => [formatNumber(Number(value ?? 0))]}
            />
            <Legend
              iconType="square"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, color: '#888888', paddingTop: 8 }}
            />
            {participants.map((name, i) => (
              <Bar
                key={name}
                dataKey={name}
                fill={PERSON_COLORS_HEX[i] ?? PERSON_COLORS_HEX[0]}
                radius={[2, 2, 0, 0]}
                maxBarSize={60}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
