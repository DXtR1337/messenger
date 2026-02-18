'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { StoredAnalysis } from '@/lib/analysis/types';
import { useChartHeight } from './chart-config';

interface ComparisonRadarProps {
  analysisA: StoredAnalysis;
  analysisB: StoredAnalysis;
}

interface RadarDataPoint {
  axis: string;
  A: number;
  B: number;
}

function sumPerPerson(perPerson: Record<string, unknown>, key: string): number {
  return Object.values(perPerson).reduce<number>((sum, p) => {
    const obj = p as Record<string, unknown> | undefined;
    const val = obj?.[key];
    return sum + (typeof val === 'number' ? val : 0);
  }, 0);
}

function avgPerPerson(
  timingPerPerson: Record<string, { medianResponseTimeMs?: number }>,
): number {
  const values = Object.values(timingPerPerson)
    .map((p) => p.medianResponseTimeMs)
    .filter((v): v is number => typeof v === 'number' && v > 0);
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function sumInitiations(initiations: Record<string, number>): number {
  return Object.values(initiations).reduce((sum, v) => sum + v, 0);
}

function normalize(valueA: number, valueB: number): [number, number] {
  const max = Math.max(valueA, valueB);
  if (max === 0) return [0, 0];
  return [(valueA / max) * 100, (valueB / max) * 100];
}

export default function ComparisonRadar({ analysisA, analysisB }: ComparisonRadarProps) {
  const chartHeight = useChartHeight(340);
  const data: RadarDataPoint[] = useMemo(() => {
    const a = analysisA;
    const b = analysisB;

    // 1. Messages
    const [msgA, msgB] = normalize(
      a.conversation.metadata.totalMessages,
      b.conversation.metadata.totalMessages,
    );

    // 2. Response speed (inverse of median response time)
    const rtA = avgPerPerson(
      a.quantitative.timing.perPerson as Record<string, { medianResponseTimeMs: number }>,
    );
    const rtB = avgPerPerson(
      b.quantitative.timing.perPerson as Record<string, { medianResponseTimeMs: number }>,
    );
    // Invert: faster = higher score. Use 1/rt, then normalize.
    const speedA = rtA > 0 ? 1 / rtA : 0;
    const speedB = rtB > 0 ? 1 / rtB : 0;
    const [spdA, spdB] = normalize(speedA, speedB);

    // 3. Initiations
    const initA = sumInitiations(a.quantitative.timing.conversationInitiations);
    const initB = sumInitiations(b.quantitative.timing.conversationInitiations);
    const [iniA, iniB] = normalize(initA, initB);

    // 4. Emoji
    const emojiA = sumPerPerson(
      a.quantitative.perPerson,
      'emojiCount',
    );
    const emojiB = sumPerPerson(
      b.quantitative.perPerson,
      'emojiCount',
    );
    const [emA, emB] = normalize(emojiA, emojiB);

    // 5. Questions
    const questA = sumPerPerson(
      a.quantitative.perPerson,
      'questionsAsked',
    );
    const questB = sumPerPerson(
      b.quantitative.perPerson,
      'questionsAsked',
    );
    const [qA, qB] = normalize(questA, questB);

    // 6. Media
    const mediaA = sumPerPerson(
      a.quantitative.perPerson,
      'mediaShared',
    );
    const mediaB = sumPerPerson(
      b.quantitative.perPerson,
      'mediaShared',
    );
    const [mdA, mdB] = normalize(mediaA, mediaB);

    return [
      { axis: 'Wiadomości', A: msgA, B: msgB },
      { axis: 'Szybkość odpowiedzi', A: spdA, B: spdB },
      { axis: 'Inicjowanie', A: iniA, B: iniB },
      { axis: 'Emoji', A: emA, B: emB },
      { axis: 'Pytania', A: qA, B: qB },
      { axis: 'Media', A: mdA, B: mdB },
    ];
  }, [analysisA, analysisB]);

  const titleA = analysisA.title.length > 20
    ? analysisA.title.slice(0, 18) + '...'
    : analysisA.title;
  const titleB = analysisB.title.length > 20
    ? analysisB.title.slice(0, 18) + '...'
    : analysisB.title;

  return (
    <motion.div
      role="img"
      aria-label="Porównanie stylów komunikacji"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="px-5 pt-4 pb-2">
        <h3 className="font-display text-[15px] font-bold">Profil porównawczy</h3>
        <p className="mt-0.5 text-xs text-text-muted">
          Nakładka radarowa kluczowych wymiarów
        </p>
      </div>

      <div className="px-2 py-4">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <RadarChart data={data} cx="50%" cy="50%" outerRadius={chartHeight < 280 ? '55%' : '70%'}>
            <PolarGrid stroke="rgba(255,255,255,0.06)" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: '#888888', fontSize: 11, fontFamily: 'var(--font-jetbrains-mono), monospace' }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={false}
              axisLine={false}
            />
            <Radar
              name={titleA}
              dataKey="A"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Radar
              name={titleB}
              dataKey="B"
              stroke="#a855f7"
              fill="#a855f7"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, color: '#888888' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
