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
import type { ResponseTimeDistribution } from '@/lib/parsers/types';
import {
  useChartHeight,
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_AXIS_TICK,
  CHART_GRID_PROPS,
  PERSON_COLORS_HEX,
  useIsMobile,
} from './chart-config';

interface ResponseTimeHistogramProps {
  distribution: ResponseTimeDistribution;
  participants: string[];
}

interface ChartDataPoint {
  label: string;
  [key: string]: string | number;
}

export default function ResponseTimeHistogram({
  distribution,
  participants,
}: ResponseTimeHistogramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true, margin: '-50px' });
  const chartHeight = useChartHeight(280);
  const isMobile = useIsMobile();

  // Limit to first 2 persons for the grouped bar chart
  const shownParticipants = useMemo(
    () => participants.filter((p) => distribution.perPerson[p]).slice(0, 2),
    [participants, distribution],
  );

  const chartData: ChartDataPoint[] = useMemo(() => {
    if (shownParticipants.length === 0) return [];

    // Use the first person's bins as reference for labels
    const bins = distribution.perPerson[shownParticipants[0]];
    if (!bins) return [];

    return bins.map((bin, i) => {
      const point: ChartDataPoint = { label: bin.label };
      for (const name of shownParticipants) {
        const personBins = distribution.perPerson[name];
        point[name] = personBins?.[i]?.percentage ?? 0;
      }
      return point;
    });
  }, [distribution, shownParticipants]);

  if (!distribution || shownParticipants.length === 0) return null;

  return (
    <motion.div
      ref={containerRef}
      role="img"
      aria-label="Histogram czasu odpowiedzi"
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-5 pt-4">
        <div>
          <h3 className="font-display text-[15px] font-bold">
            Rozkład czasu odpowiedzi
          </h3>
          <p className="mt-0.5 text-xs text-text-muted">
            Jak szybko odpowiadają
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-4">
          {shownParticipants.map((name, i) => (
            <span
              key={name}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span
                className="inline-block h-2 w-2 rounded-sm"
                style={{
                  backgroundColor:
                    PERSON_COLORS_HEX[i] ?? PERSON_COLORS_HEX[0],
                }}
              />
              {name}
            </span>
          ))}
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
              interval={0}
              angle={isMobile ? -30 : 0}
              textAnchor={isMobile ? 'end' : 'middle'}
              height={isMobile ? 45 : 30}
            />
            <YAxis
              tick={CHART_AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={isMobile ? 30 : 40}
              tickFormatter={(value: number) => `${Math.round(value)}%`}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              labelStyle={CHART_TOOLTIP_LABEL_STYLE}
              formatter={(value: any) => [`${(value as number).toFixed(1)}%`, undefined]}
            />
            {shownParticipants.map((name, i) => (
              <Bar
                key={name}
                dataKey={name}
                fill={PERSON_COLORS_HEX[i] ?? PERSON_COLORS_HEX[0]}
                fillOpacity={0.85}
                radius={[4, 4, 0, 0]}
                barSize={isMobile ? 12 : 20}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
