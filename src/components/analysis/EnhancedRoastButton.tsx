'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Flame, Loader2, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sampleMessages, buildQuantitativeContext } from '@/lib/analysis/qualitative';
import { runDeepScan } from '@/lib/analysis/deep-scanner';
import { trackEvent } from '@/lib/analytics/events';
import { useAnalysis } from '@/lib/analysis/analysis-context';
import type { StoredAnalysis, RoastResult } from '@/lib/analysis/types';
import { logger } from '@/lib/logger';

interface EnhancedRoastButtonProps {
  analysis: StoredAnalysis;
  onComplete: (roast: RoastResult) => void;
}

export default function EnhancedRoastButton({ analysis, onComplete }: EnhancedRoastButtonProps) {
  const { startOperation, updateOperation, stopOperation } = useAnalysis();
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Do NOT abort SSE on unmount — let it finish in the background
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setRunning(false);
    setStatus(null);
    stopOperation('enhanced-roast');
  }, [stopOperation]);

  const handleRun = useCallback(async () => {
    const { conversation, quantitative, qualitative } = analysis;
    if (!qualitative?.pass1 || !qualitative?.pass2 || !qualitative?.pass3 || !qualitative?.pass4) {
      setError('Wymagana pełna analiza AI (4 passy). Uruchom ponownie Analizę AI w zakładce AI Deep Dive.');
      return;
    }

    setRunning(true);
    setError(null);
    setStatus('Prześwietlam wasze profile psychologiczne...');
    startOperation('enhanced-roast', 'Enhanced Roast', 'Prześwietlam wasze profile psychologiczne...');

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    // Auto-abort after 300s — Enhanced Roast uses large input (~96KB)
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      logger.warn('[EnhancedRoast] Client-side timeout (300s) — aborting');
      controller.abort();
    }, 300_000);

    trackEvent({ name: 'analysis_start', params: { mode: 'roast' } });

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    try {
      const samples = sampleMessages(conversation, quantitative);
      const participants = conversation.participants.map((p) => p.name);
      let quantitativeContext = buildQuantitativeContext(quantitative, conversation.participants);
      if (qualitative?.reconBriefing) quantitativeContext += '\n\n' + qualitative.reconBriefing;

      // Deep scan — extract confessions, contradictions, obsessions, power moves
      if (mountedRef.current) setStatus('Skanuję całą konwersację w poszukiwaniu amunicji...');
      updateOperation('enhanced-roast', { status: 'Skanuję całą konwersację...', progress: 15 });
      const deepScan = runDeepScan(conversation, quantitative);
      logger.log('[EnhancedRoast] Deep scan material:', (deepScan.formattedForPrompt.length / 1024).toFixed(1), 'KB');

      if (mountedRef.current) setStatus('Prześwietlam wasze profile psychologiczne...');
      updateOperation('enhanced-roast', { status: 'Prześwietlam wasze profile psychologiczne...', progress: 25 });

      const body = JSON.stringify({
        samples,
        participants,
        quantitativeContext,
        qualitative: {
          pass1: qualitative.pass1,
          pass2: qualitative.pass2,
          pass3: qualitative.pass3,
          pass4: qualitative.pass4,
        },
        deepScanMaterial: deepScan.formattedForPrompt,
      });
      logger.log('[EnhancedRoast] Request payload size:', (body.length / 1024).toFixed(1), 'KB');

      const response = await fetch('/api/analyze/enhanced-roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      });
      logger.log('[EnhancedRoast] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '(brak treści)');
        console.error('[EnhancedRoast] Server error:', response.status, errorBody);
        if (response.status === 429) {
          throw new Error('Zbyt wiele żądań — poczekaj chwilę i spróbuj ponownie.');
        }
        throw new Error(`Błąd serwera (${response.status}): ${errorBody.slice(0, 200)}`);
      }

      if (!response.body) throw new Error('Brak odpowiedzi z serwera (no response body)');

      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let roastResult: RoastResult | null = null;
      let lastEventTime = Date.now();

      logger.log('[EnhancedRoast] SSE stream started, reading...');

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          logger.log('[EnhancedRoast] SSE stream ended (done)');
          break;
        }

        lastEventTime = Date.now();
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

            logger.log('[EnhancedRoast] SSE event:', event.type, event.status ?? '');

            if (event.type === 'progress' && event.status) {
              if (mountedRef.current) setStatus(event.status);
              updateOperation('enhanced-roast', { status: event.status, progress: 50 });
            } else if (event.type === 'roast_complete' && event.result) {
              logger.log('[EnhancedRoast] Got roast result');
              roastResult = event.result;
            } else if (event.type === 'error') {
              console.error('[EnhancedRoast] Server SSE error:', event.error);
              throw new Error(event.error ?? 'Nieznany błąd serwera');
            }
          } catch (parseError) {
            if (parseError instanceof SyntaxError) {
              logger.warn('[EnhancedRoast] JSON parse error in SSE, skipping chunk');
              continue;
            }
            throw parseError;
          }
        }
      }

      if (roastResult) {
        trackEvent({ name: 'analysis_complete', params: { mode: 'roast', passCount: 1 } });
        onComplete(roastResult);
        if (mountedRef.current) setStatus(null);
      } else {
        const elapsed = ((Date.now() - lastEventTime) / 1000).toFixed(0);
        console.error('[EnhancedRoast] Stream ended without result, last event', elapsed, 's ago');
        throw new Error('Serwer zamknął połączenie bez wyniku. Spróbuj ponownie.');
      }
    } catch (err) {
      await reader?.cancel().catch(() => {});
      if (err instanceof DOMException && err.name === 'AbortError') {
        logger.warn('[EnhancedRoast] Aborted (timeout or user cancel)');
        if (mountedRef.current) setError('Przekroczono czas oczekiwania (5 min). Gemini potrzebuje więcej czasu na pełny roast. Spróbuj ponownie.');
        return;
      }
      console.error('[EnhancedRoast] Error:', err);
      if (mountedRef.current) setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      stopOperation('enhanced-roast');
      if (mountedRef.current) setRunning(false);
      controllerRef.current = null;
    }
  }, [analysis, onComplete, startOperation, updateOperation, stopOperation]);

  return (
    <div className="space-y-3">
      {/* Error alert — prominent, persistent */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-300">Błąd Enhanced Roast</p>
            <p className="mt-1 text-xs text-red-400/80">{error}</p>
            <p className="mt-2 text-[10px] text-red-400/50">Sprawdź konsolę przeglądarki (F12) po szczegóły</p>
          </div>
          <button onClick={() => setError(null)} aria-label="Zamknij" className="text-red-400/50 hover:text-red-400">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Button */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={running ? handleCancel : handleRun}
          className={running
            ? 'gap-2 border-orange-500/30 text-orange-400 hover:bg-orange-500/10'
            : error
              ? 'gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10'
              : 'gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300'
          }
        >
          {running ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {status ?? 'Generowanie...'}
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
              Brutalna prawda
            </>
          )}
        </Button>
        {!running && !error && (
          <span className="text-xs text-muted-foreground">Roast oparty na pełnej analizie psychologicznej</span>
        )}
      </div>
    </div>
  );
}
