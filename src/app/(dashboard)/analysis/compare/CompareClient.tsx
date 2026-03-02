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

/**
 * Deduplicate analyses from the same conversation.
 * Groups by sorted lowercase participant names — ignores platform, timestamps,
 * and fingerprint because re-uploading the same conversation from a different
 * export date range produces a different fingerprint.
 * Keeps only the newest analysis per unique participant set.
 */
function deduplicateEntries(entries: AnalysisIndexEntry[]): AnalysisIndexEntry[] {
  const groups = new Map<string, AnalysisIndexEntry[]>();
  for (const entry of entries) {
    const key = [...entry.participants]
      .map((p) => p.trim().toLowerCase())
      .sort()
      .join('|');
    const group = groups.get(key);
    if (group) group.push(entry);
    else groups.set(key, [entry]);
  }
  return Array.from(groups.values()).map((group) =>
    group.reduce((newest, e) => (e.createdAt > newest.createdAt ? e : newest)),
  );
}

// Lazy-load tab components
const OverviewTab = dynamic(() => import('@/components/compare/OverviewTab'), { ssr: false });
const RankingTab = dynamic(() => import('@/components/compare/RankingTab'), { ssr: false });
const AICompareTab = dynamic(() => import('@/components/compare/AICompareTab'), { ssr: false });
const QuantCompareTab = dynamic(() => import('@/components/compare/QuantCompareTab'), { ssr: false });
const TimelineCompareTab = dynamic(() => import('@/components/compare/TimelineCompareTab'), { ssr: false });
const RadarProfilesTab = dynamic(() => import('@/components/compare/RadarProfilesTab'), { ssr: false });
const UserProfileTab = dynamic(() => import('@/components/compare/UserProfileTab'), { ssr: false });
const ColorLegend = dynamic(() => import('@/components/compare/ColorLegend'), { ssr: false });

export default function CompareClient() {
  const router = useRouter();

  const [entries, setEntries] = useState<AnalysisIndexEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [analyses, setAnalyses] = useState<StoredAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Load index — deduplicate so each conversation appears only once (newest)
  useEffect(() => {
    listAnalyses().then((all) => {
      const deduped = deduplicateEntries(all);
      setEntries(deduped);
      // Auto-select all 1:1 analyses
      const oneOnOneIds = deduped
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

          <ColorLegend records={records} />

          <div className="min-h-[50vh]">
            {activeTab === 'overview' && (
              <OverviewTab records={records} selfName={selfName} />
            )}
            {activeTab === 'ranking' && (
              <RankingTab records={records} selfName={selfName} />
            )}
            {activeTab === 'ai' && (
              <AICompareTab records={records} selfName={selfName} />
            )}
            {activeTab === 'quant' && (
              <QuantCompareTab records={records} selfName={selfName} />
            )}
            {activeTab === 'timeline' && (
              <TimelineCompareTab records={records} selfName={selfName} />
            )}
            {activeTab === 'radar' && (
              <RadarProfilesTab records={records} selfName={selfName} />
            )}
            {activeTab === 'profile' && (
              <UserProfileTab records={records} selfName={selfName} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
