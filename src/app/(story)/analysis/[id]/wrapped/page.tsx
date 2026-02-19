'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { loadAnalysis } from '@/lib/utils';
import type { StoredAnalysis } from '@/lib/analysis/types';
import { generateWrappedSlides } from '@/lib/analysis/wrapped-data';
import WrappedPlayer from '@/components/wrapped/WrappedPlayer';

export default function WrappedPage() {
  const params = useParams();
  const id = params.id as string;

  const [analysis, setAnalysis] = useState<StoredAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const stored = await loadAnalysis(id);
        if (!stored) {
          setError('Nie znaleziono analizy.');
        } else {
          setAnalysis(stored);
        }
      } catch {
        setError('Nie uda\u0142o si\u0119 za\u0142adowa\u0107 danych.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a1a]">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Ladowanie Wrapped...</p>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a1a]">
        <div className="mx-auto max-w-md space-y-6 text-center px-6">
          <span className="text-4xl">&#x1F615;</span>
          <h2 className="text-xl font-semibold text-white">Nie mozna wyswietlic Wrapped</h2>
          <p className="text-sm text-gray-400">{error ?? 'Wystapil nieoczekiwany blad.'}</p>
          <Link
            href={`/analysis/${id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            <ArrowLeft className="size-4" />
            Powrot do analizy
          </Link>
        </div>
      </div>
    );
  }

  const slides = generateWrappedSlides(analysis.conversation, analysis.quantitative);

  return (
    <WrappedPlayer
      slides={slides}
      conversationTitle={analysis.conversation.title}
      analysisId={analysis.id}
    />
  );
}
