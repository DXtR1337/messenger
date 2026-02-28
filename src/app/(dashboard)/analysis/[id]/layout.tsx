'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { loadAnalysis, saveAnalysis } from '@/lib/utils';
import { computeQuantitativeAnalysis } from '@/lib/analysis/quantitative';
import { AnalysisProvider } from '@/lib/analysis/analysis-context';
import { useSidebar } from '@/components/shared/SidebarContext';
import ModeSwitcherPill from '@/components/shared/ModeSwitcherPill';
import OperationProgressBar from '@/components/shared/OperationProgressBar';
import BrandShimmer from '@/components/shared/BrandShimmer';
import type { StoredAnalysis } from '@/lib/analysis/types';

interface LayoutProps {
  children: ReactNode;
}

/**
 * Shared layout for /analysis/[id]/* routes.
 * Loads StoredAnalysis from IndexedDB, provides AnalysisContext,
 * and renders the ModeSwitcherPill floating navigation.
 */
export default function AnalysisLayout({ children }: LayoutProps) {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { setBreadcrumb } = useSidebar();

  const [analysis, setAnalysis] = useState<StoredAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const loaded = await loadAnalysis(id);

        // Migrate old SCID data to CPS
        if (loaded?.qualitative && 'scid' in loaded.qualitative) {
          const qual = loaded.qualitative as Record<string, unknown>;
          if (qual.scid && !qual.cps) {
            qual.cps = qual.scid;
          }
          delete qual.scid;
        }

        if (!loaded) {
          setError('Nie znaleziono analizy. Mogła zostać usunięta lub link jest nieprawidłowy.');
          return;
        }

        let stored = loaded;

        // Migration: recompute quantitative to fix UTC date keys (getMonthKey bug)
        if (!stored.quantitative._version && stored.conversation?.messages?.length) {
          try {
            const recomputed = computeQuantitativeAnalysis(stored.conversation);
            stored = { ...stored, quantitative: { ...recomputed, _version: 2 } };
            saveAnalysis(stored).catch(console.error);
          } catch {
            // keep old data on error
          }
        }

        setAnalysis(stored);
        setBreadcrumb(['Analiza', stored.title]);
      } catch {
        setError('Nie udało się załadować danych analizy.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, setBreadcrumb]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <BrandShimmer rows={4} />
      </div>
    );
  }

  if (error || !analysis || !analysis.conversation || !analysis.quantitative) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="font-mono text-sm uppercase tracking-widest text-muted-foreground">Brak danych</div>
        <h2 className="text-xl font-semibold text-foreground">Nie znaleziono analizy</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {error ?? 'Nie udało się załadować danych analizy.'}
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-2 rounded-lg border border-border px-5 py-2 font-mono text-xs uppercase tracking-wider text-foreground transition-colors hover:bg-card"
        >
          Powrót do panelu
        </button>
      </div>
    );
  }

  return (
    <AnalysisProvider initialAnalysis={analysis}>
      <div className="min-w-0 overflow-x-hidden">
        {children}
      </div>
      <OperationProgressBar />
      <ModeSwitcherPill />
    </AnalysisProvider>
  );
}
