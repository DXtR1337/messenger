'use client';

import { useState, useCallback } from 'react';
import { Skull, Loader2 } from 'lucide-react';
import { sampleMessages, buildQuantitativeContext } from '@/lib/analysis/qualitative';
import type { StoredAnalysis, PrzegrywTygodniaResult } from '@/lib/analysis/types';
import { trackEvent } from '@/lib/analytics/events';

interface PrzegrywTygodniaButtonProps {
  analysis: StoredAnalysis;
  onComplete: (result: PrzegrywTygodniaResult) => void;
  mode?: 'group' | 'duo';
}

export default function PrzegrywTygodniaButton({ analysis, onComplete, mode = 'group' }: PrzegrywTygodniaButtonProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProgress('Przygotowuję dane...');

    try {
      const participants = analysis.conversation.participants;
      const participantNames = participants.map((p) => p.name);
      const samples = sampleMessages(analysis.conversation, analysis.quantitative);
      let quantitativeContext = buildQuantitativeContext(analysis.quantitative, participants);
      if (analysis.qualitative?.reconBriefing) quantitativeContext += '\n\n' + analysis.qualitative.reconBriefing;

      const isDuo = mode === 'duo';
      trackEvent({ name: 'analysis_start', params: { mode: isDuo ? 'przegryw_duo' : 'przegryw_tygodnia' } });

      const res = await fetch('/api/analyze/przegryw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ samples, participants: participantNames, quantitativeContext, ...(isDuo ? { mode: 'duo' } : {}) }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      if (!res.body) throw new Error('Brak odpowiedzi z serwera.');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);
            if (event.type === 'progress') {
              setProgress(event.status ?? 'Analizuję...');
            } else if (event.type === 'przegryw_complete') {
              trackEvent({ name: 'analysis_complete', params: { mode: isDuo ? 'przegryw_duo' : 'przegryw_tygodnia' } });
              onComplete(event.result as PrzegrywTygodniaResult);
              return;
            } else if (event.type === 'error') {
              throw new Error(event.error);
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== jsonStr) {
              throw parseErr;
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nieznany błąd');
    } finally {
      setLoading(false);
      setProgress('');
    }
  }, [analysis, onComplete]);

  return (
    <div className="space-y-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className="group relative flex w-full items-center gap-4 overflow-hidden rounded-xl border-2 border-red-500/20 bg-card px-5 py-4 text-left transition-all hover:border-red-500/40 hover:bg-card-hover disabled:opacity-60"
      >
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-500/15 transition-colors group-hover:bg-red-500/25">
          {loading ? (
            <Loader2 className="size-5 animate-spin text-red-400" />
          ) : (
            <Skull className="size-5 text-red-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">{mode === 'duo' ? 'Przegryw 1v1' : 'Przegryw Tygodnia'}</span>
            <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
              AI
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {loading ? progress : mode === 'duo' ? '1v1 — kto jest większym przegrywem?' : 'AI przeczyta wasze wiadomości i wybierze kto zasłużył na tytuł'}
          </p>
        </div>
      </button>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
