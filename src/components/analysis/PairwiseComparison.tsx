'use client';

import { useState, useMemo } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import type { QuantitativeAnalysis } from '@/lib/parsers/types';
import { getPersonColor } from './PersonNavigator';

interface PairwiseComparisonProps {
  participants: string[];
  quantitative: QuantitativeAnalysis;
}

function formatMs(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}min`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

interface ComparisonRow {
  label: string;
  valueA: string;
  valueB: string;
  rawA: number;
  rawB: number;
  lowerWins?: boolean; // for response time
}

export default function PairwiseComparison({ participants, quantitative }: PairwiseComparisonProps) {
  const sorted = useMemo(() => [...participants].sort((a, b) => {
    return (quantitative.perPerson[b]?.totalMessages ?? 0) - (quantitative.perPerson[a]?.totalMessages ?? 0);
  }), [participants, quantitative]);

  const [personA, setPersonA] = useState(sorted[0] ?? '');
  const [personB, setPersonB] = useState(sorted[1] ?? '');

  const indexA = sorted.indexOf(personA);
  const indexB = sorted.indexOf(personB);
  const colorA = getPersonColor(indexA >= 0 ? indexA : 0);
  const colorB = getPersonColor(indexB >= 0 ? indexB : 1);

  const rows = useMemo((): ComparisonRow[] => {
    const pmA = quantitative.perPerson[personA];
    const pmB = quantitative.perPerson[personB];
    if (!pmA || !pmB) return [];

    const tA = quantitative.timing.perPerson[personA];
    const tB = quantitative.timing.perPerson[personB];

    return [
      {
        label: 'Wiadomości',
        valueA: pmA.totalMessages.toLocaleString('pl-PL'),
        valueB: pmB.totalMessages.toLocaleString('pl-PL'),
        rawA: pmA.totalMessages,
        rawB: pmB.totalMessages,
      },
      {
        label: 'Słowa',
        valueA: pmA.totalWords.toLocaleString('pl-PL'),
        valueB: pmB.totalWords.toLocaleString('pl-PL'),
        rawA: pmA.totalWords,
        rawB: pmB.totalWords,
      },
      {
        label: 'Śr. długość',
        valueA: pmA.averageMessageLength.toFixed(1),
        valueB: pmB.averageMessageLength.toFixed(1),
        rawA: pmA.averageMessageLength,
        rawB: pmB.averageMessageLength,
      },
      {
        label: 'Emoji',
        valueA: String(pmA.emojiCount),
        valueB: String(pmB.emojiCount),
        rawA: pmA.emojiCount,
        rawB: pmB.emojiCount,
      },
      {
        label: 'Pytania',
        valueA: String(pmA.questionsAsked),
        valueB: String(pmB.questionsAsked),
        rawA: pmA.questionsAsked,
        rawB: pmB.questionsAsked,
      },
      {
        label: 'Double texty',
        valueA: String(quantitative.engagement.doubleTexts[personA] ?? 0),
        valueB: String(quantitative.engagement.doubleTexts[personB] ?? 0),
        rawA: quantitative.engagement.doubleTexts[personA] ?? 0,
        rawB: quantitative.engagement.doubleTexts[personB] ?? 0,
      },
      {
        label: 'Nocne msg',
        valueA: String(quantitative.timing.lateNightMessages[personA] ?? 0),
        valueB: String(quantitative.timing.lateNightMessages[personB] ?? 0),
        rawA: quantitative.timing.lateNightMessages[personA] ?? 0,
        rawB: quantitative.timing.lateNightMessages[personB] ?? 0,
      },
      {
        label: 'Czas odp.',
        valueA: tA ? formatMs(tA.medianResponseTimeMs) : 'n/a',
        valueB: tB ? formatMs(tB.medianResponseTimeMs) : 'n/a',
        rawA: tA?.medianResponseTimeMs ?? Infinity,
        rawB: tB?.medianResponseTimeMs ?? Infinity,
        lowerWins: true,
      },
      {
        label: 'Inicjacje',
        valueA: String(quantitative.timing.conversationInitiations[personA] ?? 0),
        valueB: String(quantitative.timing.conversationInitiations[personB] ?? 0),
        rawA: quantitative.timing.conversationInitiations[personA] ?? 0,
        rawB: quantitative.timing.conversationInitiations[personB] ?? 0,
      },
    ];
  }, [personA, personB, quantitative]);

  // Count wins
  const winsA = rows.filter((r) => r.lowerWins ? r.rawA < r.rawB : r.rawA > r.rawB).length;
  const winsB = rows.filter((r) => r.lowerWins ? r.rawB < r.rawA : r.rawB > r.rawA).length;

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="size-4 text-text-muted" />
          <span className="font-mono text-xs uppercase tracking-widest text-text-muted">Porównanie 1 vs 1</span>
        </div>
      </div>

      {/* Person selectors */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <select
          value={personA}
          onChange={(e) => setPersonA(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
        >
          {sorted.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        <span className="font-display text-sm font-bold text-text-muted">VS</span>

        <select
          value={personB}
          onChange={(e) => setPersonB(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
        >
          {sorted.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {/* Score */}
      <div className="flex items-center justify-center gap-4 border-b border-border py-2">
        <span className="font-display text-lg font-bold" style={{ color: colorA }}>{winsA}</span>
        <span className="text-xs text-text-muted">wygranych kategorii</span>
        <span className="font-display text-lg font-bold" style={{ color: colorB }}>{winsB}</span>
      </div>

      {/* Comparison rows */}
      <div className="divide-y divide-border/50">
        {rows.map((row) => {
          const aWins = row.lowerWins ? row.rawA < row.rawB : row.rawA > row.rawB;
          const bWins = row.lowerWins ? row.rawB < row.rawA : row.rawB > row.rawA;
          const tie = row.rawA === row.rawB;

          return (
            <div key={row.label} className="flex items-center px-4 py-2">
              <span className={`w-20 text-right font-mono text-xs ${aWins && !tie ? 'font-bold text-foreground' : 'text-text-muted'}`}>
                {row.valueA}
              </span>
              {aWins && !tie && <span className="ml-1 text-[10px]" style={{ color: colorA }}>{'\u{1F451}'}</span>}
              <div className="flex-1 text-center">
                <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">{row.label}</span>
              </div>
              {bWins && !tie && <span className="mr-1 text-[10px]" style={{ color: colorB }}>{'\u{1F451}'}</span>}
              <span className={`w-20 text-left font-mono text-xs ${bWins && !tie ? 'font-bold text-foreground' : 'text-text-muted'}`}>
                {row.valueB}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
