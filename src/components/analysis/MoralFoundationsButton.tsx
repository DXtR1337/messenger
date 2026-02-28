'use client';

import { useState } from 'react';
import { Scale, Loader2, RotateCcw } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { ParsedConversation } from '@/lib/parsers/types';
import { useMoralFoundationsAnalysis } from '@/hooks/useMoralFoundationsAnalysis';

const MoralFoundationsCard = dynamic(() => import('@/components/analysis/MoralFoundationsCard'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-xl bg-card" />,
});

interface MoralFoundationsButtonProps {
  conversation: ParsedConversation;
  onComplete?: (result: import('@/lib/analysis/moral-foundations-prompts').MoralFoundationsResult) => void;
}

export default function MoralFoundationsButton({ conversation, onComplete }: MoralFoundationsButtonProps) {
  const participants = conversation.participants.map(p => p.name);
  const { run, isLoading, result, error, reset } = useMoralFoundationsAnalysis(conversation, onComplete);
  const [hasRun, setHasRun] = useState(false);

  const handleClick = async () => {
    setHasRun(true);
    await run();
  };

  if (result) {
    return (
      <div className="space-y-3">
        <MoralFoundationsCard result={result} participants={participants} />
        <button
          onClick={() => { reset(); setHasRun(false); }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          <RotateCcw className="size-3" />
          Analizuj ponownie
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/10">
          <Scale className="size-5 text-rose-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-sm font-bold">Fundamenty Moralne</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Które z 6 fundamentów Haidta dominują w Waszej komunikacji? Troska, Sprawiedliwość,
            Lojalność, Autorytet, Świętość, Wolność.
          </p>

          {error && (
            <p className="mt-2 text-xs text-red-400">{error}</p>
          )}

          <button
            onClick={handleClick}
            disabled={isLoading}
            className="mt-3 flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2 text-xs font-semibold text-rose-400 transition-all hover:bg-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Analizuję fundamenty moralne...
              </>
            ) : (
              <>
                <Scale className="size-3.5" />
                {hasRun && error ? 'Spróbuj ponownie' : 'Analizuj fundamenty moralne'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
