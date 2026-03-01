'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { listAnalyses, loadAnalysis } from '@/lib/utils';
import type { AnalysisIndexEntry, StoredAnalysis } from '@/lib/analysis/types';
import CompareHeader from '@/components/compare/CompareHeader';
import CompareTabs, { COMPARE_TABS } from '@/components/compare/CompareTabs';
import {
  extractComparisonRecord,
  detectCommonUser,
  filterOneOnOne,
} from '@/lib/compare';
import type { ComparisonRecord, CommonUserResult } from '@/lib/compare';

// Lazy-load tab components
const QuantCompareTab = dynamic(() => import('@/components/compare/QuantCompareTab'), { ssr: false });
const RankingTab = dynamic(() => import('@/components/compare/RankingTab'), { ssr: false });
const RadarProfilesTab = dynamic(() => import('@/components/compare/RadarProfilesTab'), { ssr: false });
const TimelineCompareTab = dynamic(() => import('@/components/compare/TimelineCompareTab'), { ssr: false });
const InsightsTab = dynamic(() => import('@/components/compare/InsightsTab'), { ssr: false });
const HealthTab = dynamic(() => import('@/components/compare/HealthTab'), { ssr: false });
const DynamicsTab = dynamic(() => import('@/components/compare/DynamicsTab'), { ssr: false });
const VariationsTab = dynamic(() =>   import('@/components/compare/VariationsTab'), { ssr: false });
const UserProfileTab = dynamic(() => import('@/components/compare/UserProfileTab'), { ssr: false });

export default function CompareClient() {
  const router = useRouter();

  const [entries, setEntries] = useState<AnalysisIndexEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [analyses, setAnalyses] = useState<StoredAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('quant');

  // Load index
  useEffect(() => {
    listAnalyses().then((all) => {
      setEntries(all);
      // Auto-select all 1:1 analyses
      const oneOnOneIds = all
        .filter((e) => e.participants.length === 2)
        .map((e) => e.id);
      if (oneOnOneIds.length > 0) {
        setSelectedIds(new Set(oneOnOneIds));
      }
    });
  }, []);

  // Load full analyses when selection changes
  useEffect(() => {
    if (selectedIds.size === 0) {
      setAnalyses([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const ids = [...selectedIds];
    // Batch load in groups of 5 for performance
    const loadBatch = async () => {
      const results: StoredAnalysis[] = [];
      for (let i = 0; i < ids.length; i += 5) {
        if (cancelled) return;
        const batch = ids.slice(i, i + 5);
        const loaded = await Promise.all(batch.map((id) => loadAnalysis(id)));
        for (const a of loaded) {
          if (a) results.push(a);
        }
      }
      if (!cancelled) {
        setAnalyses(results);
        setLoading(false);
      }
    };

    loadBatch();
    return () => { cancelled = true; };
  }, [selectedIds]);

  // Detect common user
  const commonUser: CommonUserResult | null = useMemo(() => {
    const filtered = filterOneOnOne(analyses);
    return detectCommonUser(filtered);
  }, [analyses]);

  const selfName = commonUser?.name ?? null;

  // Build comparison records
  const records: ComparisonRecord[] = useMemo(() => {
    if (!selfName || analyses.length === 0) return [];
    return filterOneOnOne(analyses).map((a) =>
      extractComparisonRecord(a, selfName),
    );
  }, [analyses, selfName]);

  const aiCount = useMemo(
    () => records.filter((r) => r.hasAI).length,
    [records],
  );

  // Handlers
  const handleToggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const ids = entries
      .filter((e) => e.participants.length === 2)
      .map((e) => e.id);
    setSelectedIds(new Set(ids));
  }, [entries]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Ensure active tab is valid
  useEffect(() => {
    const tab = COMPARE_TABS.find((t) => t.key === activeTab);
    if (!tab) return;
    const enabled =
      (!tab.minRecords || records.length >= tab.minRecords) &&
      (!tab.requiresAI || aiCount > 0);
    if (!enabled) {
      // Fall back to first enabled tab
      const fallback = COMPARE_TABS.find(
        (t) =>
          (!t.minRecords || records.length >= t.minRecords) &&
          (!t.requiresAI || aiCount > 0),
      );
      if (fallback) setActiveTab(fallback.key);
    }
  }, [records.length, aiCount, activeTab]);

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => router.push('/dashboard')}
        className="mb-1"
      >
        <ArrowLeft className="size-4" />
      </Button>

      {/* Header with multi-select */}
      <CompareHeader
        entries={entries}
        selectedIds={selectedIds}
        onToggle={handleToggle}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        selfName={selfName}
      />

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-12">
          <Loader2 className="size-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Ładowanie {selectedIds.size} analiz...
          </span>
        </div>
      )}

      {/* Empty state */}
      {!loading && records.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">
            {entries.length === 0
              ? 'Brak zapisanych analiz. Zacznij od przeanalizowania rozmowy.'
              : selectedIds.size === 0
                ? 'Wybierz analizy powyżej, żeby rozpocząć porównanie.'
                : 'Nie wykryto wspólnego uczestnika między wybranymi analizami.'}
          </p>
        </div>
      )}

      {/* Tabs + content */}
      {!loading && records.length > 0 && selfName && (
        <>
          <CompareTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            recordCount={records.length}
            aiCount={aiCount}
          />

          <div className="min-h-[50vh]">
            {activeTab === 'dynamics' && (
              <DynamicsTab records={records} selfName={selfName} />
            )}
            {activeTab === 'quant' && (
              <QuantCompareTab records={records} selfName={selfName} />
            )}
            {activeTab === 'variations' && (
              <VariationsTab records={records} selfName={selfName} />
            )}
            {activeTab === 'insights' && (
              <InsightsTab records={records} selfName={selfName} />
            )}
            {activeTab === 'ranking' && (
              <RankingTab records={records} selfName={selfName} />
            )}
            {activeTab === 'radar' && (
              <RadarProfilesTab records={records} selfName={selfName} />
            )}
            {activeTab === 'profile' && (
              <UserProfileTab records={records} selfName={selfName} />
            )}
            {activeTab === 'health' && (
              <HealthTab records={records} selfName={selfName} />
            )}
            {activeTab === 'timeline' && (
              <TimelineCompareTab records={records} selfName={selfName} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
