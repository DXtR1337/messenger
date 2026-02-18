'use client';

import { useState, useCallback } from 'react';
import { sampleMessages } from '@/lib/analysis/qualitative';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';
import type { SCIDResult } from '@/lib/analysis/scid-ii';

interface UseSCIDAnalysisOptions {
  conversation: ParsedConversation;
  quantitative: QuantitativeAnalysis;
  participantName: string;
}

interface UseSCIDAnalysisReturn {
  runSCID: () => Promise<void>;
  isLoading: boolean;
  progress: number;
  result: SCIDResult | undefined;
  error: string | null;
  reset: () => void;
}

type SCIDState = 'idle' | 'running' | 'complete' | 'error';

/**
 * Hook for running SCID-II personality disorder screening analysis.
 * 
 * Usage:
 * ```tsx
 * const { runSCID, isLoading, progress, result, error } = useSCIDAnalysis({
 *   conversation,
 *   quantitative,
 *   participantName: 'John Doe',
 * });
 * ```
 */
export function useSCIDAnalysis({
  conversation,
  quantitative,
  participantName,
}: UseSCIDAnalysisOptions): UseSCIDAnalysisReturn {
  const [state, setState] = useState<SCIDState>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SCIDResult | undefined>();
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setState('idle');
    setProgress(0);
    setResult(undefined);
    setError(null);
  }, []);

  const runSCID = useCallback(async () => {
    setState('running');
    setProgress(0);
    setError(null);

    try {
      const samples = sampleMessages(conversation, quantitative);

      const response = await fetch('/api/analyze/scid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          samples,
          participantName,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`SCID analysis failed: ${response.status} ${errorBody}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult: SCIDResult | null = null;

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
              result?: SCIDResult;
              error?: string;
            };

            if (event.type === 'progress' && event.status) {
              // Map status messages to progress percentage
              const progressMap: Record<string, number> = {
                'Przygotowanie analizy SCID-II...': 5,
                'Analiza wzorców osobowości...': 25,
                'Przetwarzanie wyników...': 75,
                'Analiza zakończona': 100,
              };
              setProgress(progressMap[event.status] ?? 50);
            } else if (event.type === 'complete' && event.result) {
              finalResult = event.result;
            } else if (event.type === 'error') {
              throw new Error(event.error ?? 'Unknown SCID analysis error');
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
        throw new Error('SCID analysis completed without results');
      }
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [conversation, quantitative, participantName]);

  return {
    runSCID,
    isLoading: state === 'running',
    progress,
    result,
    error,
    reset,
  };
}

export default useSCIDAnalysis;
