'use client';

import { useState, useCallback, useRef, useEffect, useSyncExternalStore } from 'react';
import { sampleMessages, buildQuantitativeContext } from '@/lib/analysis/qualitative';
import { readSSEStream } from '@/lib/sse';
import { trackEvent } from '@/lib/analytics/events';
import type { StoredAnalysis, StandUpRoastResult } from '@/lib/analysis/types';
import type { OperationCallbacks } from '@/hooks/sse-types';
import { getBackgroundOp, setBackgroundOp, clearBackgroundOp, subscribeBackgroundOps, getSnapshotFactory } from '@/lib/analysis/background-ops';

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

  // Background state — survives unmount/remount cycles
  const OP_KEY = 'standup';
  const bgOp = useSyncExternalStore(subscribeBackgroundOps, getSnapshotFactory(OP_KEY), () => undefined);
  const isRunningInBackground = !!bgOp && !bgOp.isComplete && !bgOp.error;

  // NOTE: No abort-on-unmount — analysis continues in background when navigating away

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState('idle');
    setProgress(null);
    setResult(null);
    setError(null);
  }, []);

  const generate = useCallback(async () => {
    if (isRunningInBackground) return;
    if (state === 'generating') return;

    // Abort previous run if any
    abortRef.current?.abort();

    setState('generating');
    setProgress('Przygotowuję występ stand-up...');
    setError(null);
    setBackgroundOp(OP_KEY, { progress: 0, phaseName: 'Generowanie stand-up', isComplete: false, error: null });
    ops?.startOperation('standup', 'Stand-Up', 'Przygotowuję występ stand-up...');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { conversation, quantitative } = analysis;
      const participants = conversation.participants.map((p) => p.name);
      const samples = sampleMessages(conversation, quantitative);
      let quantitativeContext = buildQuantitativeContext(quantitative, conversation.participants);
      if (analysis.qualitative?.reconBriefing) {
        quantitativeContext += '\n\n' + analysis.qualitative.reconBriefing;
      }

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

      let finalResult: StandUpRoastResult | null = null;

      await readSSEStream<Record<string, unknown>>(reader, (event) => {
        if (event.type === 'progress') {
          const statusText = event.status as string;
          setProgress(statusText);
          ops?.updateOperation('standup', { status: statusText });
        } else if (event.type === 'complete') {
          finalResult = event.result as StandUpRoastResult;
        } else if (event.type === 'error') {
          throw new Error(event.error as string);
        }
      }, controller.signal);

      if (!finalResult || !(finalResult as StandUpRoastResult).acts?.length) {
        throw new Error('Brak wyniku z API — spróbuj ponownie');
      }

      trackEvent({ name: 'analysis_complete', params: { mode: 'standup', passCount: 1 } });

      setResult(finalResult);
      setState('complete');
      setProgress(null);
      clearBackgroundOp(OP_KEY);
      onComplete(finalResult);
    } catch (err) {
      if (controller.signal.aborted) return;
      setState('error');
      setError(err instanceof Error ? err.message : String(err));
      setProgress(null);
      clearBackgroundOp(OP_KEY);
    } finally {
      ops?.stopOperation('standup');
    }
  }, [analysis, onComplete, state, isRunningInBackground, ops]);

  return {
    state: isRunningInBackground ? 'generating' : state,
    progress: isRunningInBackground ? (bgOp?.phaseName ?? 'Generowanie stand-up...') : progress,
    result,
    error,
    generate,
    reset,
  };
}
