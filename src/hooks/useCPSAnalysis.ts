'use client';

import { useState, useCallback, useRef, useEffect, useSyncExternalStore } from 'react';
import { sampleMessages } from '@/lib/analysis/qualitative';
import { readSSEStream } from '@/lib/sse';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';
import type { CPSResult } from '@/lib/analysis/communication-patterns';
import type { OperationCallbacks, ProgressPhase } from '@/hooks/sse-types';
import { getBackgroundOp, setBackgroundOp, clearBackgroundOp, subscribeBackgroundOps, getSnapshotFactory } from '@/lib/analysis/background-ops';

interface UseCPSAnalysisOptions {
  conversation: ParsedConversation;
  quantitative: QuantitativeAnalysis;
  participantName: string;
  reconBriefing?: string;
  ops?: OperationCallbacks;
  onComplete?: (result: CPSResult) => void;
}

interface UseCPSAnalysisReturn {
  runCPS: () => Promise<void>;
  isLoading: boolean;
  progress: number;
  result: CPSResult | undefined;
  error: string | null;
  reset: () => void;
}

type CPSState = 'idle' | 'running' | 'complete' | 'error';

const PHASE_MAP: Record<string, ProgressPhase> = {
  'Przygotowanie analizy wzorców...': { start: 3, ceiling: 12 },
  'Analiza wzorców 1/3...': { start: 15, ceiling: 37 },
  'Analiza wzorców 2/3...': { start: 40, ceiling: 62 },
  'Analiza wzorców 3/3...': { start: 65, ceiling: 83 },
  'Przetwarzanie wyników...': { start: 85, ceiling: 97 },
  'Analiza zakończona': { start: 100, ceiling: 100 },
};

/**
 * Hook for running CPS communication pattern screening analysis.
 *
 * Usage:
 * ```tsx
 * const { runCPS, isLoading, progress, result, error } = useCPSAnalysis({
 *   conversation,
 *   quantitative,
 *   participantName: 'John Doe',
 * });
 * ```
 */
export function useCPSAnalysis({
  conversation,
  quantitative,
  participantName,
  reconBriefing,
  ops,
  onComplete,
}: UseCPSAnalysisOptions): UseCPSAnalysisReturn {
  const [state, setState] = useState<CPSState>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CPSResult | undefined>();
  const [error, setError] = useState<string | null>(null);
  const ceilingRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Background state — survives unmount/remount cycles
  const OP_KEY = 'cps';
  const bgOp = useSyncExternalStore(subscribeBackgroundOps, getSnapshotFactory(OP_KEY), () => undefined);
  const isRunningInBackground = !!bgOp && !bgOp.isComplete && !bgOp.error;

  // NOTE: No abort-on-unmount — analysis continues in background when navigating away

  // Smooth progress interpolation — creeps toward ceiling between SSE events
  useEffect(() => {
    if (state !== 'running') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setProgress(prev => {
        const ceiling = ceilingRef.current;
        if (prev >= ceiling) return prev;
        const remaining = ceiling - prev;
        const step = Math.max(0.15, remaining * 0.035);
        return Math.min(prev + step, ceiling);
      });
    }, 150);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState('idle');
    setProgress(0);
    ceilingRef.current = 0;
    setResult(undefined);
    setError(null);
  }, []);

  const runCPS = useCallback(async () => {
    if (isRunningInBackground) return;
    if (state === 'running') return;

    // Abort previous run if any
    abortRef.current?.abort();

    setState('running');
    setProgress(0);
    setError(null);
    setBackgroundOp(OP_KEY, { progress: 0, phaseName: 'CPS Screening', isComplete: false, error: null });
    ops?.startOperation('cps', 'CPS', 'Przygotowuję screening...');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const samples = sampleMessages(conversation, quantitative);
      if (reconBriefing) {
        samples.quantitativeContext = (samples.quantitativeContext ?? '') + '\n\n' + reconBriefing;
      }

      const response = await fetch('/api/analyze/cps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          samples,
          participantName,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`CPS analysis failed: ${response.status} ${errorBody}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      const reader = response.body.getReader();
      let finalResult: CPSResult | null = null;

      await readSSEStream<{
        type: string;
        status?: string;
        result?: CPSResult;
        error?: string;
      }>(reader, (event) => {
        if (event.type === 'progress' && event.status) {
          const phase = PHASE_MAP[event.status];
          if (phase) {
            setProgress(phase.start);
            ceilingRef.current = phase.ceiling;
            ops?.updateOperation('cps', { progress: phase.start, status: event.status });
          }
        } else if (event.type === 'complete' && event.result) {
          finalResult = event.result;
        } else if (event.type === 'error') {
          throw new Error(event.error ?? 'Unknown CPS analysis error');
        }
      }, controller.signal);

      if (finalResult) {
        setState('complete');
        setProgress(100);
        setResult(finalResult);
        clearBackgroundOp(OP_KEY);
        onCompleteRef.current?.(finalResult);
      } else {
        throw new Error('CPS analysis completed without results');
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setState('error');
      setError(err instanceof Error ? err.message : String(err));
      clearBackgroundOp(OP_KEY);
    } finally {
      ops?.stopOperation('cps');
    }
  }, [state, isRunningInBackground, conversation, quantitative, participantName, reconBriefing, ops]);

  return {
    runCPS,
    isLoading: isRunningInBackground || state === 'running',
    progress: isRunningInBackground ? (bgOp?.progress ?? 0) : progress,
    result,
    error,
    reset,
  };
}
