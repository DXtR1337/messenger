'use client';

import { useState, useCallback, useRef, useEffect, useSyncExternalStore } from 'react';
import { readSSEStream } from '@/lib/sse';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';
import type { QualitativeAnalysis } from '@/lib/analysis/types';
import type { SubtextResult } from '@/lib/analysis/subtext';
import type { OperationCallbacks, ProgressPhase } from '@/hooks/sse-types';
import { getBackgroundOp, setBackgroundOp, clearBackgroundOp, subscribeBackgroundOps, getSnapshotFactory } from '@/lib/analysis/background-ops';

interface UseSubtextAnalysisOptions {
  conversation: ParsedConversation;
  quantitative: QuantitativeAnalysis;
  qualitative?: QualitativeAnalysis;
  ops?: OperationCallbacks;
  onComplete?: (result: SubtextResult) => void;
}

interface UseSubtextAnalysisReturn {
  runSubtext: () => Promise<void>;
  isLoading: boolean;
  progress: number;
  result: SubtextResult | undefined;
  error: string | null;
  reset: () => void;
}

type SubtextState = 'idle' | 'running' | 'complete' | 'error';

const PHASE_MAP: Record<string, ProgressPhase> = {
  'Rozpoczynam analizę podtekstów...': { start: 2, ceiling: 8 },
  'Wyodrębnianie wymian zdań...': { start: 8, ceiling: 15 },
  'Dekodowanie podtekstów 1/3...': { start: 18, ceiling: 38 },
  'Dekodowanie podtekstów 2/3...': { start: 40, ceiling: 60 },
  'Dekodowanie podtekstów 3/3...': { start: 62, ceiling: 80 },
  'Dekodowanie podtekstów 1/2...': { start: 18, ceiling: 48 },
  'Dekodowanie podtekstów 2/2...': { start: 50, ceiling: 78 },
  'Dekodowanie podtekstów 1/4...': { start: 15, ceiling: 32 },
  'Dekodowanie podtekstów 2/4...': { start: 34, ceiling: 50 },
  'Dekodowanie podtekstów 3/4...': { start: 52, ceiling: 68 },
  'Dekodowanie podtekstów 4/4...': { start: 70, ceiling: 82 },
  'Analiza wzorców ukrywania...': { start: 85, ceiling: 97 },
  'Analiza zakończona': { start: 100, ceiling: 100 },
};

export function useSubtextAnalysis({
  conversation,
  quantitative,
  qualitative,
  ops,
  onComplete,
}: UseSubtextAnalysisOptions): UseSubtextAnalysisReturn {
  const [state, setState] = useState<SubtextState>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SubtextResult | undefined>();
  const [error, setError] = useState<string | null>(null);
  const ceilingRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Background state — survives unmount/remount cycles
  const OP_KEY = 'subtext';
  const bgOp = useSyncExternalStore(subscribeBackgroundOps, getSnapshotFactory(OP_KEY), () => undefined);
  const isRunningInBackground = !!bgOp && !bgOp.isComplete && !bgOp.error;

  // NOTE: No abort-on-unmount — analysis continues in background when navigating away

  // Smooth progress interpolation
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

  const runSubtext = useCallback(async () => {
    if (isRunningInBackground) return;
    if (state === 'running') return;

    // Abort previous run if any
    abortRef.current?.abort();

    setState('running');
    setProgress(0);
    setError(null);
    setBackgroundOp(OP_KEY, { progress: 0, phaseName: 'Subtext Decoder', isComplete: false, error: null });
    ops?.startOperation('subtext', 'Subtext Decoder', 'Rozpoczynam analizę podtekstów...');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Filter to eligible text messages
      const messages = conversation.messages
        .filter(m => m.type !== 'call' && m.type !== 'system' && !m.isUnsent && m.content?.trim())
        .map(m => ({ sender: m.sender, content: m.content, timestamp: m.timestamp, index: m.index }));

      const participants = conversation.participants.map(p => p.name);

      // Build relationship context from existing qualitative analysis
      const relationshipContext = qualitative?.pass1 ? {
        overallDynamic: qualitative.pass1.overall_dynamic,
        tonePerPerson: qualitative.pass1.tone_per_person,
        powerDynamics: qualitative.pass2?.power_dynamics,
        conflictPatterns: qualitative.pass2?.conflict_patterns,
      } : undefined;

      // Build quantitative context string (include recon briefing if available)
      let quantitativeContext: string | undefined;
      if (qualitative?.reconBriefing) {
        quantitativeContext = qualitative.reconBriefing;
      }
      if (quantitative.timing?.perPerson) {
        const lines: string[] = [];
        for (const name of participants) {
          const timing = quantitative.timing.perPerson[name];
          if (timing) {
            const medianMs = timing.medianResponseTimeMs;
            const timeStr = medianMs < 60_000
              ? `${Math.round(medianMs / 1_000)}s`
              : `${Math.round(medianMs / 60_000)} min`;
            lines.push(`${name}: median response ${timeStr}`);
          }
        }
        if (lines.length > 0) {
          quantitativeContext = (quantitativeContext ? quantitativeContext + '\n\n' : '') + `RESPONSE TIMES:\n${lines.join('\n')}`;
        }
      }

      const response = await fetch('/api/analyze/subtext', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          participants,
          relationshipContext,
          quantitativeContext,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Subtext analysis failed: ${response.status} ${errorBody}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      const reader = response.body.getReader();
      let finalResult: SubtextResult | null = null;

      await readSSEStream<{
        type: string;
        status?: string;
        result?: SubtextResult;
        error?: string;
      }>(reader, (event) => {
        if (event.type === 'progress' && event.status) {
          const phase = PHASE_MAP[event.status];
          if (phase) {
            setProgress(phase.start);
            ceilingRef.current = phase.ceiling;
            ops?.updateOperation('subtext', { progress: phase.start, status: event.status });
          }
        } else if (event.type === 'complete' && event.result) {
          finalResult = event.result;
        } else if (event.type === 'error') {
          throw new Error(event.error ?? 'Unknown subtext analysis error');
        }
      }, controller.signal);

      if (finalResult) {
        setState('complete');
        setProgress(100);
        setResult(finalResult);
        clearBackgroundOp(OP_KEY);
        onCompleteRef.current?.(finalResult);
      } else {
        throw new Error('Subtext analysis completed without results');
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setState('error');
      setError(err instanceof Error ? err.message : String(err));
      clearBackgroundOp(OP_KEY);
    } finally {
      ops?.stopOperation('subtext');
    }
  }, [state, isRunningInBackground, conversation, quantitative, qualitative, ops]);

  return {
    runSubtext,
    isLoading: isRunningInBackground || state === 'running',
    progress: isRunningInBackground ? (bgOp?.progress ?? 0) : progress,
    result,
    error,
    reset,
  };
}
