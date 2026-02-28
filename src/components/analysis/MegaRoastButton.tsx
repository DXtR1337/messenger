'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Flame, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sampleMessages, buildQuantitativeContext } from '@/lib/analysis/qualitative';
import { trackEvent } from '@/lib/analytics/events';
import { useAnalysis } from '@/lib/analysis/analysis-context';
import type { StoredAnalysis, MegaRoastResult } from '@/lib/analysis/types';

interface MegaRoastButtonProps {
  analysis: StoredAnalysis;
  targetPerson: string;
  onComplete: (result: MegaRoastResult) => void;
}

export default function MegaRoastButton({ analysis, targetPerson, onComplete }: MegaRoastButtonProps) {
  const { startOperation, updateOperation, stopOperation } = useAnalysis();
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // Do NOT abort SSE on unmount — let it finish in the background
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const handleCancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setRunning(false);
    setStatus(null);
  }, []);

  const handleRun = useCallback(async () => {
    const { conversation, quantitative } = analysis;

    setRunning(true);
    setError(null);
    setStatus(`Przygotowuję mega roast na ${targetPerson}...`);
    startOperation('mega-roast', 'Mega Roast', `Przygotowuję mega roast na ${targetPerson}...`);

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    trackEvent({ name: 'analysis_start', params: { mode: 'mega_roast' } });

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    try {
      const samples = sampleMessages(conversation, quantitative);
      const participants = conversation.participants.map((p) => p.name);
      const quantitativeContext = buildQuantitativeContext(quantitative, conversation.participants);

      const response = await fetch('/api/analyze/mega-roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          samples,
          targetPerson,
          participants,
          quantitativeContext,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Mega roast failed: ${response.status} ${errorBody}`);
      }

      if (!response.body) throw new Error('No response body');

      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let megaRoastResult: MegaRoastResult | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const event = JSON.parse(data) as {
              type: string;
              status?: string;
              result?: MegaRoastResult;
              error?: string;
            };

            if (event.type === 'progress' && event.status) {
              if (mountedRef.current) setStatus(event.status);
              updateOperation('mega-roast', { status: event.status, progress: 50 });
            } else if (event.type === 'mega_roast_complete' && event.result) {
              megaRoastResult = event.result;
            } else if (event.type === 'error') {
              throw new Error(event.error ?? 'Unknown error');
            }
          } catch (parseError) {
            if (parseError instanceof SyntaxError) continue;
            throw parseError;
          }
        }
      }

      if (megaRoastResult) {
        trackEvent({ name: 'analysis_complete', params: { mode: 'mega_roast', passCount: 1 } });
        onComplete(megaRoastResult);
        setStatus(null);
      } else {
        throw new Error('Mega roast completed without results');
      }
    } catch (err) {
      await reader?.cancel();
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (mountedRef.current) setError(err instanceof Error ? err.message : String(err));
    } finally {
      stopOperation('mega-roast');
      if (mountedRef.current) setRunning(false);
      controllerRef.current = null;
    }
  }, [analysis, targetPerson, onComplete, startOperation, updateOperation, stopOperation]);

  if (error) {
    return (
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRun}
          className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10"
        >
          <Flame className="size-4" />
          Spróbuj ponownie
        </Button>
        <span className="text-xs text-red-400/80">{error}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={running ? handleCancel : handleRun}
        className={running
          ? 'gap-2 border-orange-500/30 text-orange-400 hover:bg-orange-500/10'
          : 'gap-2 border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:text-orange-300'
        }
      >
        {running ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {status ?? 'Generowanie...'}
            <X className="ml-1 size-3" />
          </>
        ) : (
          <>
            <Flame className="size-4" />
            Mega Roast — {targetPerson}
          </>
        )}
      </Button>
      {!running && (
        <span className="text-xs text-muted-foreground">Ultra brutalny roast na podstawie całej konwersacji</span>
      )}
    </div>
  );
}
