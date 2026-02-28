'use client';

import { useState, useCallback, useRef } from 'react';
import { useAnalysis } from '@/lib/analysis/analysis-context';
import type { ParsedConversation } from '@/lib/parsers/types';
import type { MoralFoundationsResult } from '@/lib/analysis/moral-foundations-prompts';

interface UseMoralFoundationsReturn {
  run: () => Promise<void>;
  isLoading: boolean;
  result: MoralFoundationsResult | undefined;
  error: string | null;
  reset: () => void;
}

export function useMoralFoundationsAnalysis(
  conversation: ParsedConversation,
  onComplete?: (result: MoralFoundationsResult) => void,
): UseMoralFoundationsReturn {
  const { startOperation, updateOperation, stopOperation } = useAnalysis();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MoralFoundationsResult | undefined>();
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
    setResult(undefined);
    setError(null);
  }, []);

  const run = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    startOperation('moral', 'Fundacje Moralne', 'Przygotowuję analizę...');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const messages = conversation.messages
        .filter(m => m.type !== 'call' && m.type !== 'system' && !m.isUnsent && m.content?.trim())
        .map(m => ({ sender: m.sender, content: m.content }));

      const participants = conversation.participants.map(p => p.name);

      const response = await fetch('/api/analyze/moral-foundations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, participants }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Moral foundations analysis failed: ${response.status} ${errorBody}`);
      }

      if (!response.body) throw new Error('No response body received');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult: MoralFoundationsResult | null = null;

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
              result?: MoralFoundationsResult;
              error?: string;
            };

            if (event.type === 'progress') {
              updateOperation('moral', { progress: 50, status: (event as Record<string, unknown>).status as string ?? 'Analizuję...' });
            } else if (event.type === 'complete' && event.result) {
              finalResult = event.result;
            } else if (event.type === 'error') {
              throw new Error(event.error ?? 'Unknown moral foundations error');
            }
          } catch (parseError) {
            if (parseError instanceof SyntaxError) continue;
            throw parseError;
          }
        }
      }

      if (finalResult) {
        setResult(finalResult);
        onComplete?.(finalResult);
      } else {
        throw new Error('Analysis completed without results');
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
      stopOperation('moral');
    }
  }, [isLoading, conversation, onComplete, startOperation, updateOperation, stopOperation]);

  return { run, isLoading, result, error, reset };
}
