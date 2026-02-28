'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Flame, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sampleMessages } from '@/lib/analysis/qualitative';
import { trackEvent } from '@/lib/analytics/events';
import { useAnalysis } from '@/lib/analysis/analysis-context';
import type { RoastResult } from '@/lib/analysis/types';
import { logger } from '@/lib/logger';

/**
 * Standalone Standard Roast (Level 1) trigger for the roast page.
 * Mirrors the roast flow from AIAnalysisButton but in its own component.
 */
export default function StandardRoastButton() {
  const {
    analysis,
    conversation,
    quantitative,
    onRoastComplete,
    startOperation,
    stopOperation,
  } = useAnalysis();

  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const handleCancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setRunning(false);
    setStatus(null);
    stopOperation('standard-roast');
  }, [stopOperation]);

  const handleRun = useCallback(async () => {
    setRunning(true);
    setError(null);
    setStatus('Generowanie roastu...');
    startOperation('standard-roast', 'Standard Roast', 'Generowanie roastu...');
    trackEvent({ name: 'analysis_start', params: { mode: 'roast' } });

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    try {
      const samples = sampleMessages(conversation, quantitative);
      const participants = conversation.participants.map((p) => p.name);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: (analysis as { id?: string })?.id,
          samples,
          participants,
          mode: 'roast',
          quantitativeContext: samples.quantitativeContext,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Roast failed: ${response.status} ${errorBody}`);
      }

      if (!response.body) throw new Error('Brak odpowiedzi z serwera');

      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let roastResult: RoastResult | null = null;

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
              result?: RoastResult;
              error?: string;
            };

            if (event.type === 'progress' && event.status) {
              if (mountedRef.current) setStatus(event.status);
            } else if (event.type === 'roast_complete' && event.result) {
              roastResult = event.result;
            } else if (event.type === 'error') {
              throw new Error(event.error ?? 'Unknown roast error');
            }
          } catch (parseError) {
            if (parseError instanceof SyntaxError) continue;
            throw parseError;
          }
        }
      }

      if (roastResult) {
        trackEvent({ name: 'analysis_complete', params: { mode: 'roast', passCount: 1 } });
        onRoastComplete(roastResult);
        if (mountedRef.current) setStatus(null);
        logger.log('[StandardRoast] Complete');
      } else {
        throw new Error('Serwer zamknął połączenie bez wyniku');
      }
    } catch (err) {
      await reader?.cancel().catch(() => {});
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (mountedRef.current) setError(err instanceof Error ? err.message : String(err));
    } finally {
      stopOperation('standard-roast');
      if (mountedRef.current) setRunning(false);
      controllerRef.current = null;
    }
  }, [analysis, conversation, quantitative, onRoastComplete, startOperation, stopOperation]);

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={running ? handleCancel : handleRun}
        className={running
          ? 'gap-2 border-orange-500/30 text-orange-400 hover:bg-orange-500/10'
          : 'gap-2 border-[#ff4500]/30 text-[#ff4500] hover:bg-[#ff4500]/10 hover:text-[#ff4500]'
        }
      >
        {running ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            <span className="font-mono text-xs">{status ?? 'Generowanie...'}</span>
            <X className="ml-1 size-3" />
          </>
        ) : error ? (
          <>
            <Flame className="size-4" />
            Spróbuj ponownie
          </>
        ) : (
          <>
            <Flame className="size-4" />
            Generuj Standard Roast
          </>
        )}
      </Button>
    </div>
  );
}
