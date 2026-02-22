'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Scale, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sampleMessages, buildQuantitativeContext } from '@/lib/analysis/qualitative';
import { trackEvent } from '@/lib/analytics/events';
import type { StoredAnalysis } from '@/lib/analysis/types';
import type { CourtResult } from '@/lib/analysis/court-prompts';

interface ChatCourtButtonProps {
  analysis: StoredAnalysis;
  onComplete: (result: CourtResult) => void;
}

export default function ChatCourtButton({ analysis, onComplete }: ChatCourtButtonProps) {
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

    setRunning(true);
    setError(null);
    setStatus('Kompletuję akta sprawy...');

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    trackEvent({ name: 'court_trial_start' });

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    try {
      const samples = sampleMessages(conversation, quantitative);
      const participants = conversation.participants.map((p) => p.name);
      const quantitativeContext = buildQuantitativeContext(quantitative, conversation.participants);

      const body: Record<string, unknown> = {
        samples,
        participants,
        quantitativeContext,
      };

      if (qualitative?.pass1 || qualitative?.pass2 || qualitative?.pass4) {
        body.existingAnalysis = {
          ...(qualitative.pass1 && { pass1: qualitative.pass1 }),
          ...(qualitative.pass2 && { pass2: qualitative.pass2 }),
          ...(qualitative.pass4 && { pass4: qualitative.pass4 }),
        };
      }

      const response = await fetch('/api/analyze/court', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Court trial failed: ${response.status} ${errorBody}`);
      }

      if (!response.body) throw new Error('No response body');

      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let courtResult: CourtResult | null = null;

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
              result?: CourtResult;
              error?: string;
            };

            if (event.type === 'progress' && event.status) {
              setStatus(event.status);
            } else if (event.type === 'complete' && event.result) {
              courtResult = event.result;
            } else if (event.type === 'error') {
              throw new Error(event.error ?? 'Unknown error');
            }
          } catch (parseError) {
            if (parseError instanceof SyntaxError) continue;
            throw parseError;
          }
        }
      }

      if (courtResult) {
        trackEvent({ name: 'court_trial_complete' });
        onComplete(courtResult);
        setStatus(null);
      } else {
        throw new Error('Court trial completed without results');
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
      <div className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-5">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRun}
            className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            <Scale className="size-4" />
            Ponowna rozprawa
          </Button>
          <span className="text-xs text-red-400/80">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-5 transition-colors hover:border-[#2a2a2a] hover:bg-[#161616]">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5">
            <Scale className="size-5 text-amber-400" />
            <span className="font-mono text-sm font-bold tracking-wide text-[#fafafa]">Twój Chat w Sądzie</span>
          </div>
          <span className="text-xs text-[#555555]">Akt oskarżenia, dowody, wyrok. Bez apelacji.</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={running ? handleCancel : handleRun}
          className={running
            ? 'gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
            : 'gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300'
          }
        >
          {running ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span className="font-mono text-xs">{status ?? 'Generowanie...'}</span>
              <X className="ml-1 size-3" />
            </>
          ) : (
            <>
              <Scale className="size-4" />
              Rozpocznij proces
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
