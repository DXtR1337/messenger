'use client';

import { useState, useMemo } from 'react';
import { ArrowUpDown } from 'lucide-react';
import type { ComparisonRecord } from '@/lib/compare';
import { COMPARISON_COLORS } from '@/lib/compare';
import Sparkline from './Sparkline';

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

// Mobile card: key metrics to show
const MOBILE_METRICS: { key: SortKey; label: string }[] = [
  { key: 'compatibility', label: 'Kompat.' },
  { key: 'health', label: 'Health' },
  { key: 'lsm', label: 'LSM' },
  { key: 'messages', label: 'Wiad.' },
];

function getSparkData(r: ComparisonRecord): number[] {
  const monthly = r.relationship.monthlyVolume;
  if (!monthly) return [];
  return Object.values(monthly).map((m) => (m as { total: number }).total).slice(-12);
}

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

  const hasMBTI = records.some((r) => r.selfAI.mbti);

  if (records.length < 2) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Dodaj więcej analiz, aby zobaczyć ranking.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Desktop table ── */}
      <div className="hidden overflow-x-auto rounded-xl border border-border sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-white/[0.03]">
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">#</th>
              {COLUMNS.map((col) => (
                <th key={col.key} className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Trend</th>
              {hasMBTI && (
                <>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">MBTI</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Attach.</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const color = COMPARISON_COLORS[records.indexOf(r) % COMPARISON_COLORS.length];
              const sparkData = getSparkData(r);
              return (
                <tr key={r.analysisId} className="border-b border-border/50 transition-colors hover:bg-white/[0.04]">
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{i + 1}</td>
                  {COLUMNS.map((col) => {
                    const val = col.extract(r);
                    return (
                      <td key={col.key} className="px-4 py-2.5">
                        {col.key === 'partner' ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: color }} />
                            <span className="font-display font-medium">{val}</span>
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
                  <td className="px-4 py-2.5">
                    {sparkData.length >= 2 ? (
                      <Sparkline data={sparkData} color={color} width={56} height={16} />
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </td>
                  {hasMBTI && (
                    <>
                      <td className="px-4 py-2.5 font-mono text-xs">
                        {r.partnerAI.mbti?.type ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
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

      {/* ── Mobile card layout ── */}
      <div className="space-y-2 sm:hidden">
        {/* Mobile sort control */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sortuj:</span>
          <select
            value={sortKey}
            onChange={(e) => { setSortKey(e.target.value as SortKey); setSortAsc(false); }}
            className="rounded-lg border border-border bg-card px-2 py-1 text-xs text-foreground"
          >
            {COLUMNS.filter((c) => c.key !== 'partner').map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Cards */}
        {sorted.map((r, i) => {
          const color = COMPARISON_COLORS[records.indexOf(r) % COMPARISON_COLORS.length];
          const sparkData = getSparkData(r);
          return (
            <div
              key={r.analysisId}
              className="rounded-xl border border-border bg-card p-3"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground/60">{i + 1}</span>
                <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="flex-1 font-display text-sm font-medium">{r.partnerName}</span>
                {sparkData.length >= 2 && (
                  <Sparkline data={sparkData} color={color} width={48} height={14} />
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {MOBILE_METRICS.map((mm) => {
                  const col = COLUMNS.find((c) => c.key === mm.key)!;
                  const val = col.extract(r);
                  return (
                    <div key={mm.key} className="flex items-baseline justify-between">
                      <span className="text-[10px] text-muted-foreground">{mm.label}</span>
                      <span className="font-mono text-xs font-medium text-foreground">
                        {val != null && typeof val === 'number' && col.format
                          ? col.format(val)
                          : val ?? '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
