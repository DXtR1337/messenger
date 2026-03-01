'use client';

import { useState, useMemo } from 'react';
import { ArrowUpDown } from 'lucide-react';
import type { ComparisonRecord } from '@/lib/compare';
import { COMPARISON_COLORS } from '@/lib/compare';

interface Props {
  records: ComparisonRecord[];
  selfName: string;
}

type SortKey = 'partner' | 'compatibility' | 'health' | 'lsm' | 'reciprocity' | 'messages' | 'duration';

interface Column {
  key: SortKey;
  label: string;
  extract: (r: ComparisonRecord) => number | string | null;
  format?: (v: number) => string;
}

const COLUMNS: Column[] = [
  { key: 'partner', label: 'Partner', extract: (r) => r.partnerName },
  { key: 'compatibility', label: 'Kompat.', extract: (r) => r.relationship.viralScores?.compatibilityScore ?? null, format: (v) => `${Math.round(v)}%` },
  { key: 'health', label: 'Health', extract: (r) => r.relationshipAI.healthScore?.overall ?? null, format: (v) => `${Math.round(v)}` },
  { key: 'lsm', label: 'LSM', extract: (r) => r.relationship.lsm?.overall ?? null, format: (v) => v.toFixed(2) },
  { key: 'reciprocity', label: 'Wz.', extract: (r) => r.relationship.reciprocityIndex?.overall ?? null, format: (v) => `${Math.round(v)}` },
  { key: 'messages', label: 'Wiad.', extract: (r) => r.totalMessages, format: (v) => v.toLocaleString('pl-PL') },
  { key: 'duration', label: 'Dni', extract: (r) => r.durationDays, format: (v) => `${Math.round(v)}` },
];

export default function RankingTab({ records, selfName }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('compatibility');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sortKey);
    if (!col) return records;
    return [...records].sort((a, b) => {
      const va = col.extract(a);
      const vb = col.extract(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const na = typeof va === 'number' ? va : 0;
      const nb = typeof vb === 'number' ? vb : 0;
      return sortAsc ? na - nb : nb - na;
    });
  }, [records, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
  };

  if (records.length < 2) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Dodaj więcej analiz, aby zobaczyć ranking.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/20">
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">#</th>
              {COLUMNS.map((col) => (
                <th key={col.key} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  <button
                    onClick={() => handleSort(col.key)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    {col.label}
                    {sortKey === col.key && (
                      <ArrowUpDown className="size-3" />
                    )}
                  </button>
                </th>
              ))}
              {records.some((r) => r.selfAI.mbti) && (
                <>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">MBTI</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Attach.</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const color = COMPARISON_COLORS[records.indexOf(r) % COMPARISON_COLORS.length];
              return (
                <tr key={r.analysisId} className="border-b border-border/50 transition-colors hover:bg-secondary/20">
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{i + 1}</td>
                  {COLUMNS.map((col) => {
                    const val = col.extract(r);
                    return (
                      <td key={col.key} className="px-3 py-2">
                        {col.key === 'partner' ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: color }} />
                            <span className="font-medium">{val}</span>
                          </div>
                        ) : (
                          <span className="font-mono text-xs">
                            {val != null && typeof val === 'number' && col.format
                              ? col.format(val)
                              : val ?? '—'}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  {records.some((rec) => rec.selfAI.mbti) && (
                    <>
                      <td className="px-3 py-2 font-mono text-xs">
                        {r.partnerAI.mbti?.type ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {r.partnerAI.attachment?.primary_style?.replace('_', ' ') ?? '—'}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
