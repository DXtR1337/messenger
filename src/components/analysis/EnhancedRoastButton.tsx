'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Flame, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sampleMessages, buildQuantitativeContext } from '@/lib/analysis/qualitative';
import { trackEvent } from '@/lib/analytics/events';
import type { StoredAnalysis, RoastResult } from '@/lib/analysis/types';

interface EnhancedRoastButtonProps {
  analysis: StoredAnalysis;
  onComplete: (roast: RoastResult) => void;
}

export default function EnhancedRoastButton({ analysis, onComplete }: EnhancedRoastButtonProps) {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => { controllerRef.current?.abort(); };
  }, []);

  const handleCancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setRunning(false);
    setStatus(null);
  }, []);

  const handleRun = useCallback(async () => {
    const { conversation, quantitative, qualitative } = analysis;
    if (!qualitative?.pass1 || !qualitative?.pass2 || !qualitative?.pass3 || !qualitative?.pass4) return;

    setRunning(true);
    setError(null);
    setStatus('Prześwietlam wasze profile psychologiczne...');

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    trackEvent({ name: 'analysis_start', params: { mode: 'roast' } });

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    try {
      const samples = sampleMessages(conversation, quantitative);
      const participants = conversation.participants.map((p) => p.name);
      const quantitativeContext = buildQuantitativeContext(quantitative, conversation.participants);

      const response = await fetch('/api/analyze/enhanced-roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          samples,
          participants,
          quantitativeContext,
          qualitative: {
            pass1: qualitative.pass1,
            pass2: qualitative.pass2,
            pass3: qualitative.pass3,
            pass4: qualitative.pass4,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Enhanced roast failed: ${response.status} ${errorBody}`);
      }

      if (!response.body) throw new Error('No response body');

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
              setStatus(event.status);
            } else if (event.type === 'roast_complete' && event.result) {
              roastResult = event.result;
            } else if (event.type === 'error') {
              throw new Error(event.error ?? 'Unknown error');
            }
          } catch (parseError) {
            if (parseError instanceof SyntaxError) continue;
            throw parseError;
          }
        }
      }

      if (roastResult) {
        trackEvent({ name: 'analysis_complete', params: { mode: 'roast', passCount: 1 } });
        onComplete(roastResult);
        setStatus(null);
      } else {
        throw new Error('Enhanced roast completed without results');
      }
    } catch (err) {
      await reader?.cancel();
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
      controllerRef.current = null;
    }
  }, [analysis, onComplete]);

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
          Spr\u00f3buj ponownie
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
          : 'gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300'
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
            Brutalna prawda
          </>
        )}
      </Button>
      {!running && (
        <span className="text-xs text-muted-foreground">Roast oparty na pe\u0142nej analizie psychologicznej</span>
      )}
    </div>
  );
}
