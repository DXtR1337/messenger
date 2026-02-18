'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, GitCompareArrows, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { listAnalyses, loadAnalysis } from '@/lib/utils';
import type { AnalysisIndexEntry, StoredAnalysis } from '@/lib/analysis/types';
import ComparisonTable from '@/components/analysis/ComparisonTable';
import ComparisonRadar from '@/components/analysis/ComparisonRadar';
import ComparisonScores from '@/components/analysis/ComparisonScores';
import ComparisonTimeline from '@/components/analysis/ComparisonTimeline';

function getInitialParam(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(key);
}

function AnalysisPicker({
  label,
  color,
  selected,
  entries,
  disabledId,
  onSelect,
}: {
  label: string;
  color: string;
  selected: string | null;
  entries: AnalysisIndexEntry[];
  disabledId: string | null;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = entries.find(e => e.id === selected);

  return (
    <div className="relative flex-1">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-border-hover"
      >
        <span
          className="inline-block size-3 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <div className="flex-1 min-w-0">
          {current ? (
            <>
              <p className="truncate text-sm font-medium">{current.title}</p>
              <p className="text-xs text-muted-foreground">
                {current.participants.join(', ')} &bull; {current.messageCount.toLocaleString('pl-PL')} wiad.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{label}</p>
          )}
        </div>
        <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
          {entries.map(entry => {
            const disabled = entry.id === disabledId;
            return (
              <button
                key={entry.id}
                disabled={disabled}
                onClick={() => {
                  onSelect(entry.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  disabled
                    ? 'cursor-not-allowed opacity-40'
                    : entry.id === selected
                      ? 'bg-accent/10'
                      : 'hover:bg-secondary/50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm">{entry.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.participants.join(', ')}
                  </p>
                </div>
                {entry.healthScore != null && (
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {entry.healthScore}/100
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  const router = useRouter();

  const [entries, setEntries] = useState<AnalysisIndexEntry[]>([]);
  const [idA, setIdA] = useState<string | null>(() => getInitialParam('a'));
  const [idB, setIdB] = useState<string | null>(() => getInitialParam('b'));
  const [analysisA, setAnalysisA] = useState<StoredAnalysis | null>(null);
  const [analysisB, setAnalysisB] = useState<StoredAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  // Load index
  useEffect(() => {
    listAnalyses().then(setEntries);
  }, []);

  // Update URL when selections change
  const updateUrl = useCallback((a: string | null, b: string | null) => {
    const params = new URLSearchParams();
    if (a) params.set('a', a);
    if (b) params.set('b', b);
    const qs = params.toString();
    window.history.replaceState(null, '', `/analysis/compare${qs ? `?${qs}` : ''}`);
  }, []);

  const handleSelectA = useCallback((id: string) => {
    setIdA(id);
    updateUrl(id, idB);
  }, [idB, updateUrl]);

  const handleSelectB = useCallback((id: string) => {
    setIdB(id);
    updateUrl(idA, id);
  }, [idA, updateUrl]);

  // Load full analyses when both are selected
  useEffect(() => {
    if (!idA || !idB) {
      setAnalysisA(null);
      setAnalysisB(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all([loadAnalysis(idA), loadAnalysis(idB)])
      .then(([a, b]) => {
        if (cancelled) return;
        setAnalysisA(a);
        setAnalysisB(b);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [idA, idB]);

  const bothReady = analysisA && analysisB && !loading;

  const headerSummary = useMemo(() => {
    if (!analysisA || !analysisB) return null;
    const fmtDate = (ts: number) => new Date(ts).toLocaleDateString('pl-PL', { month: 'short', year: 'numeric' });
    return {
      a: {
        title: analysisA.title,
        messages: analysisA.conversation.metadata.totalMessages,
        participants: analysisA.conversation.participants.map(p => p.name),
        dateRange: `${fmtDate(analysisA.conversation.metadata.dateRange.start)} — ${fmtDate(analysisA.conversation.metadata.dateRange.end)}`,
      },
      b: {
        title: analysisB.title,
        messages: analysisB.conversation.metadata.totalMessages,
        participants: analysisB.conversation.participants.map(p => p.name),
        dateRange: `${fmtDate(analysisB.conversation.metadata.dateRange.start)} — ${fmtDate(analysisB.conversation.metadata.dateRange.end)}`,
      },
    };
  }, [analysisA, analysisB]);

  return (
    <div className="space-y-6">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => router.push('/dashboard')}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="font-display text-xl font-bold">Porównanie analiz</h1>
          <p className="text-xs text-muted-foreground">Wybierz dwie analizy, żeby zobaczyć różnice</p>
        </div>
      </div>

      {/* Pickers */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <AnalysisPicker
          label="Wybierz pierwszą analizę..."
          color="#3b82f6"
          selected={idA}
          entries={entries}
          disabledId={idB}
          onSelect={handleSelectA}
        />
        <div className="flex items-center justify-center py-1 sm:pt-3">
          <GitCompareArrows className="size-5 text-muted-foreground" />
        </div>
        <AnalysisPicker
          label="Wybierz drugą analizę..."
          color="#a855f7"
          selected={idB}
          entries={entries}
          disabledId={idA}
          onSelect={handleSelectB}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-12">
          <Loader2 className="size-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Ładowanie analiz...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && (!idA || !idB) && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <GitCompareArrows className="mb-3 size-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Wybierz obie analizy powyżej, żeby rozpocząć porównanie
          </p>
        </div>
      )}

      {/* Comparison results */}
      {bothReady && headerSummary && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          {/* Header cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {([
              { data: headerSummary.a, color: '#3b82f6' },
              { data: headerSummary.b, color: '#a855f7' },
            ] as const).map(({ data, color }) => (
              <div
                key={data.title}
                className="rounded-xl border bg-card px-5 py-4"
                style={{ borderColor: `${color}33` }}
              >
                <p className="truncate text-sm font-semibold" style={{ color }}>
                  {data.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.participants.join(', ')} &bull; {data.messages.toLocaleString('pl-PL')} wiad.
                </p>
                <p className="text-xs text-text-muted">{data.dateRange}</p>
              </div>
            ))}
          </div>

          {/* Metrics Table */}
          <ComparisonTable analysisA={analysisA} analysisB={analysisB} />

          {/* Radar */}
          <ComparisonRadar analysisA={analysisA} analysisB={analysisB} />

          {/* Scores */}
          <ComparisonScores analysisA={analysisA} analysisB={analysisB} />

          {/* Timeline */}
          <ComparisonTimeline analysisA={analysisA} analysisB={analysisB} />
        </motion.div>
      )}
    </div>
  );
}
