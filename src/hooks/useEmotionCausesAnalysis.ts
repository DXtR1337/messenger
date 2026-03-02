'use client';

import { useState, useCallback, useRef, useEffect, useSyncExternalStore } from 'react';
import { useAnalysis } from '@/lib/analysis/analysis-context';
import { readSSEStream } from '@/lib/sse';
import type { ParsedConversation } from '@/lib/parsers/types';
import type { EmotionCausesResult } from '@/lib/analysis/emotion-causes-prompts';
import { getBackgroundOp, setBackgroundOp, clearBackgroundOp, subscribeBackgroundOps, getSnapshotFactory } from '@/lib/analysis/background-ops';

interface UseEmotionCausesReturn {
  run: () => Promise<void>;
  isLoading: boolean;
  result: EmotionCausesResult | undefined;
  error: string | null;
  reset: () => void;
}

export function useEmotionCausesAnalysis(
  conversation: ParsedConversation,
  onComplete?: (result: EmotionCausesResult) => void,
  reconBriefing?: string,
): UseEmotionCausesReturn {
  const { startOperation, updateOperation, stopOperation } = useAnalysis();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<EmotionCausesResult | undefined>();
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Background state — survives unmount/remount cycles
  const OP_KEY = 'emotion';
  const bgOp = useSyncExternalStore(subscribeBackgroundOps, getSnapshotFactory(OP_KEY), () => undefined);
  const isRunningInBackground = !!bgOp && !bgOp.isComplete && !bgOp.error;

  // NOTE: No abort-on-unmount — analysis continues in background when navigating away

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
    setResult(undefined);
    setError(null);
  }, []);

  const run = useCallback(async () => {
    if (isRunningInBackground) return;
    if (isLoading) return;

    // Abort previous run if any
    abortRef.current?.abort();

    setIsLoading(true);
    setError(null);
    setBackgroundOp(OP_KEY, { progress: 0, phaseName: 'Przyczyny Emocji', isComplete: false, error: null });
    startOperation('emotions', 'Przyczyny Emocji', 'Przygotowuję analizę...');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const messages = conversation.messages
        .filter(m => m.type !== 'call' && m.type !== 'system' && !m.isUnsent && m.content?.trim())
        .map(m => ({ sender: m.sender, content: m.content, index: m.index }));

      const participants = conversation.participants.map(p => p.name);

      const response = await fetch('/api/analyze/emotion-causes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, participants, reconBriefing }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Emotion causes analysis failed: ${response.status} ${errorBody}`);
      }

      if (!response.body) throw new Error('No response body received');

      const reader = response.body.getReader();
      let finalResult: EmotionCausesResult | null = null;

      await readSSEStream<{
        type: string;
        status?: string;
        result?: EmotionCausesResult;
        error?: string;
      }>(reader, (event) => {
        if (event.type === 'progress') {
          updateOperation('emotions', { progress: 50, status: (event as Record<string, unknown>).status as string ?? 'Analizuję...' });
        } else if (event.type === 'complete' && event.result) {
          finalResult = event.result;
        } else if (event.type === 'error') {
          throw new Error(event.error ?? 'Unknown emotion causes error');
        }
      }, controller.signal);

      if (finalResult) {
        setResult(finalResult);
        clearBackgroundOp(OP_KEY);
        onComplete?.(finalResult);
      } else {
        throw new Error('Analysis completed without results');
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : String(err));
      clearBackgroundOp(OP_KEY);
    } finally {
      setIsLoading(false);
      stopOperation('emotions');
    }
  }, [isLoading, isRunningInBackground, conversation, onComplete, reconBriefing, startOperation, updateOperation, stopOperation]);

  return { run, isLoading: isRunningInBackground || isLoading, result, error, reset };
}
