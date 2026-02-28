'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { sampleMessages } from '@/lib/analysis/qualitative';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';
import type { CPSResult } from '@/lib/analysis/communication-patterns';

interface OperationCallbacks {
  startOperation: (id: string, label: string, status?: string) => void;
  updateOperation: (id: string, patch: { progress?: number; status?: string }) => void;
  stopOperation: (id: string) => void;
}

interface UseCPSAnalysisOptions {
  conversation: ParsedConversation;
  quantitative: QuantitativeAnalysis;
  participantName: string;
  ops?: OperationCallbacks;
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

interface ProgressPhase {
  start: number;
  ceiling: number;
}

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
  ops,
}: UseCPSAnalysisOptions): UseCPSAnalysisReturn {
  const [state, setState] = useState<CPSState>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CPSResult | undefined>();
  const [error, setError] = useState<string | null>(null);
  const ceilingRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const abortRef = useRef<AbortController | null>(null);

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
    if (state === 'running') return;
    setState('running');
    setProgress(0);
    setError(null);
    ops?.startOperation('cps', 'CPS', 'Przygotowuję screening...');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const samples = sampleMessages(conversation, quantitative);

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
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult: CPSResult | null = null;

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
              result?: CPSResult;
              error?: string;
            };

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
          } catch (parseError) {
            // Skip malformed JSON lines in the SSE stream
            if (parseError instanceof SyntaxError) continue;
            throw parseError;
          }
        }
      }

      if (finalResult) {
        setState('complete');
        setProgress(100);
        setResult(finalResult);
      } else {
        throw new Error('CPS analysis completed without results');
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setState('error');
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      ops?.stopOperation('cps');
    }
  }, [state, conversation, quantitative, participantName, ops]);

  return {
    runCPS,
    isLoading: state === 'running',
    progress,
    result,
    error,
    reset,
  };
}

export default useCPSAnalysis;
