'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { StoredAnalysis } from '@/lib/analysis/types';

interface ComparisonTableProps {
  analysisA: StoredAnalysis;
  analysisB: StoredAnalysis;
}

function formatTime(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}min`;
  const h = Math.floor(ms / 3600000);
  const m = Math.round((ms % 3600000) / 60000);
  return `${h}h ${m}min`;
}

function formatNum(n: number): string {
  return n.toLocaleString('pl-PL');
}

type CompareDirection = 'higher-better' | 'lower-better' | 'neutral';

interface MetricRow {
  label: string;
  valueA: number | null;
  valueB: number | null;
  format: (v: number) => string;
  direction: CompareDirection;
}

function extractAvgForPersons(
  perPerson: Record<string, { medianResponseTimeMs?: number; averageMessageLength?: number }>,
  key: 'medianResponseTimeMs' | 'averageMessageLength',
): number {
  const values = Object.values(perPerson)
    .map((p) => {
      const val = p[key];
      return typeof val === 'number' ? val : null;
    })
    .filter((v): v is number => v !== null);
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function sumPerPerson(perPerson: Record<string, unknown>, key: string): number {
  return Object.values(perPerson).reduce<number>((sum, p) => {
    const obj = p as Record<string, unknown> | undefined;
    const val = obj?.[key];
    return sum + (typeof val === 'number' ? val : 0);
  }, 0);
}

export default function ComparisonTable({ analysisA, analysisB }: ComparisonTableProps) {
  const rows: MetricRow[] = useMemo(() => {
    const a = analysisA;
    const b = analysisB;

    const avgMsgLenA = extractAvgForPersons(a.quantitative.perPerson, 'averageMessageLength');
    const avgMsgLenB = extractAvgForPersons(b.quantitative.perPerson, 'averageMessageLength');

    const medianRtA = extractAvgForPersons(
      a.quantitative.timing.perPerson as Record<string, { medianResponseTimeMs: number }>,
      'medianResponseTimeMs',
    );
    const medianRtB = extractAvgForPersons(
      b.quantitative.timing.perPerson as Record<string, { medianResponseTimeMs: number }>,
      'medianResponseTimeMs',
    );

    const emojiA = sumPerPerson(
      a.quantitative.perPerson,
      'emojiCount',
    );
    const emojiB = sumPerPerson(
      b.quantitative.perPerson,
      'emojiCount',
    );

    const questionsA = sumPerPerson(
      a.quantitative.perPerson,
      'questionsAsked',
    );
    const questionsB = sumPerPerson(
      b.quantitative.perPerson,
      'questionsAsked',
    );

    const result: MetricRow[] = [
      {
        label: 'Wiadomości łącznie',
        valueA: a.conversation.metadata.totalMessages,
        valueB: b.conversation.metadata.totalMessages,
        format: formatNum,
        direction: 'higher-better',
      },
      {
        label: 'Czas trwania (dni)',
        valueA: a.conversation.metadata.durationDays,
        valueB: b.conversation.metadata.durationDays,
        format: formatNum,
        direction: 'higher-better',
      },
      {
        label: 'Średnia długość wiadomości',
        valueA: avgMsgLenA,
        valueB: avgMsgLenB,
        format: (v) => `${v.toFixed(1)} słów`,
        direction: 'higher-better',
      },
      {
        label: 'Mediana czasu odpowiedzi',
        valueA: medianRtA,
        valueB: medianRtB,
        format: formatTime,
        direction: 'lower-better',
      },
      {
        label: 'Sesje rozmów',
        valueA: a.quantitative.engagement.totalSessions,
        valueB: b.quantitative.engagement.totalSessions,
        format: formatNum,
        direction: 'higher-better',
      },
      {
        label: 'Użycie emoji',
        valueA: emojiA,
        valueB: emojiB,
        format: formatNum,
        direction: 'neutral',
      },
      {
        label: 'Pytania zadane',
        valueA: questionsA,
        valueB: questionsB,
        format: formatNum,
        direction: 'neutral',
      },
    ];

    // Health Score (optional)
    const healthA = a.qualitative?.pass4?.health_score?.overall ?? null;
    const healthB = b.qualitative?.pass4?.health_score?.overall ?? null;
    if (healthA !== null || healthB !== null) {
      result.push({
        label: 'Health Score',
        valueA: healthA,
        valueB: healthB,
        format: (v) => `${v}/100`,
        direction: 'higher-better',
      });
    }

    // Compatibility Score (optional)
    const compatA = a.quantitative.viralScores?.compatibilityScore ?? null;
    const compatB = b.quantitative.viralScores?.compatibilityScore ?? null;
    if (compatA !== null || compatB !== null) {
      result.push({
        label: 'Compatibility Score',
        valueA: compatA,
        valueB: compatB,
        format: (v) => `${v}/100`,
        direction: 'higher-better',
      });
    }

    // Delusion Score (optional)
    const delusionA = a.quantitative.viralScores?.delusionScore ?? null;
    const delusionB = b.quantitative.viralScores?.delusionScore ?? null;
    if (delusionA !== null || delusionB !== null) {
      result.push({
        label: 'Delusion Score',
        valueA: delusionA,
        valueB: delusionB,
        format: (v) => `${v}/100`,
        direction: 'lower-better',
      });
    }

    return result;
  }, [analysisA, analysisB]);

  function getHighlightClass(
    row: MetricRow,
    side: 'A' | 'B',
  ): string {
    if (row.valueA === null || row.valueB === null) return '';
    if (row.direction === 'neutral') return '';
    const isHigher = side === 'A' ? row.valueA > row.valueB : row.valueB > row.valueA;
    const isLower = side === 'A' ? row.valueA < row.valueB : row.valueB < row.valueA;
    if (row.direction === 'higher-better' && isHigher) return 'text-accent';
    if (row.direction === 'lower-better' && isLower) return 'text-accent';
    return '';
  }

  const titleA = analysisA.title.length > 24
    ? analysisA.title.slice(0, 22) + '...'
    : analysisA.title;
  const titleB = analysisB.title.length > 24
    ? analysisB.title.slice(0, 22) + '...'
    : analysisB.title;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="px-5 pt-4 pb-2">
        <h3 className="font-display text-[15px] font-bold">Porównanie metryk</h3>
        <p className="mt-0.5 text-xs text-text-muted">
          Kluczowe wskaźniki obu analiz obok siebie
        </p>
      </div>

      <div className="overflow-x-auto px-5 pb-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="w-1/3 py-3 text-left font-mono font-medium text-blue-400">
                {titleA}
              </th>
              <th className="w-1/3 py-3 text-center font-medium">Metryka</th>
              <th className="w-1/3 py-3 text-right font-mono font-medium text-purple-400">
                {titleB}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.label}
                className={i % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.015]'}
              >
                <td className={`py-2.5 text-left font-mono text-sm ${getHighlightClass(row, 'A')}`}>
                  {row.valueA !== null ? row.format(row.valueA) : '\u2014'}
                </td>
                <td className="py-2.5 text-center text-xs text-muted-foreground">
                  {row.label}
                </td>
                <td className={`py-2.5 text-right font-mono text-sm ${getHighlightClass(row, 'B')}`}>
                  {row.valueB !== null ? row.format(row.valueB) : '\u2014'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
