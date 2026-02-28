'use client';

import { useState, useCallback, useRef } from 'react';
import { sampleMessages, buildQuantitativeContext } from '@/lib/analysis/qualitative';
import { trackEvent } from '@/lib/analytics/events';
import type { StoredAnalysis, StandUpRoastResult } from '@/lib/analysis/types';

interface OperationCallbacks {
  startOperation: (id: string, label: string, status?: string) => void;
  updateOperation: (id: string, patch: { progress?: number; status?: string }) => void;
  stopOperation: (id: string) => void;
}

type StandupState = 'idle' | 'generating' | 'complete' | 'error';

interface UseStandupGenerationReturn {
  state: StandupState;
  progress: string | null;
  result: StandUpRoastResult | null;
  error: string | null;
  generate: () => void;
  reset: () => void;
}

export function useStandupGeneration(
  analysis: StoredAnalysis,
  onComplete: (result: StandUpRoastResult) => void,
  ops?: OperationCallbacks,
): UseStandupGenerationReturn {
  const [state, setState] = useState<StandupState>('idle');
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<StandUpRoastResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState('idle');
    setProgress(null);
    setResult(null);
    setError(null);
  }, []);

  const generate = useCallback(async () => {
    if (state === 'generating') return;

    setState('generating');
    setProgress('Przygotowuję występ stand-up...');
    setError(null);
    ops?.startOperation('standup', 'Stand-Up', 'Przygotowuję występ stand-up...');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { conversation, quantitative } = analysis;
      const participants = conversation.participants.map((p) => p.name);
      const samples = sampleMessages(conversation, quantitative);
      const quantitativeContext = buildQuantitativeContext(quantitative, conversation.participants);

      trackEvent({ name: 'analysis_start', params: { mode: 'standup' } });

      const response = await fetch('/api/analyze/standup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ samples, participants, quantitativeContext }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult: StandUpRoastResult | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6).trim()) as Record<string, unknown>;
            if (event.type === 'progress') {
              const statusText = event.status as string;
              setProgress(statusText);
              ops?.updateOperation('standup', { status: statusText });
            } else if (event.type === 'complete') {
              finalResult = event.result as StandUpRoastResult;
            } else if (event.type === 'error') {
              throw new Error(event.error as string);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }

      if (!finalResult || !finalResult.acts?.length) {
        throw new Error('Brak wyniku z API — spróbuj ponownie');
      }

      trackEvent({ name: 'analysis_complete', params: { mode: 'standup', passCount: 1 } });

      setResult(finalResult);
      setState('complete');
      setProgress(null);
      onComplete(finalResult);
    } catch (err) {
      if (controller.signal.aborted) return;
      setState('error');
      setError(err instanceof Error ? err.message : String(err));
      setProgress(null);
    } finally {
      ops?.stopOperation('standup');
    }
  }, [analysis, onComplete, state, ops]);

  return { state, progress, result, error, generate, reset };
}
