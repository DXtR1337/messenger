'use client';

import { Heart, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ParsedConversation } from '@/lib/parsers/types';
import { useCapitalizationAnalysis } from '@/hooks/useCapitalizationAnalysis';
import CapitalizationCard from './CapitalizationCard';

interface CapitalizationButtonProps {
  conversation: ParsedConversation;
  onComplete?: (result: import('@/lib/analysis/capitalization-prompts').CapitalizationResult) => void;
}

export default function CapitalizationButton({ conversation, onComplete }: CapitalizationButtonProps) {
  const { runAnalysis, isLoading, progress, result, error, reset } = useCapitalizationAnalysis({ conversation, onComplete });

  if (result) {
    return (
      <div className="space-y-3">
        <CapitalizationCard result={result} />
        <button
          onClick={reset}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Analizuj ponownie
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
        <button
          onClick={reset}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-500/10">
            <Heart className="h-4 w-4 text-pink-400 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-semibold">Analizuję reakcje na dobre wieści…</p>
            <p className="text-xs text-muted-foreground">Model ACR (Gable et al., 2004)</p>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1.5 text-right text-[10px] text-muted-foreground">{Math.round(progress)}%</p>
      </div>
    );
  }

  return (
    <button
      onClick={runAnalysis}
      className={cn(
        'group w-full rounded-xl border border-border bg-card p-5',
        'flex items-center gap-4 transition-all hover:border-border-hover hover:bg-card/80',
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-pink-500/10 transition-colors group-hover:bg-pink-500/20">
        <Heart className="h-5 w-5 text-pink-400" />
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-semibold">Kapitalizacja sukcesu</p>
        <p className="text-xs text-muted-foreground">
          Jak reagujecie na dobre wieści? AI klasyfikuje odpowiedzi (AC/PC/AD/PD)
        </p>
      </div>
      <div className="shrink-0 rounded-lg bg-pink-500/10 px-3 py-1.5 text-xs font-semibold text-pink-400 transition-colors group-hover:bg-pink-500/20">
        Uruchom
      </div>
    </button>
  );
}
