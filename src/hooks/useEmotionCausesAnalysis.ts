'use client';

import { useState, useCallback, useRef } from 'react';
import { useAnalysis } from '@/lib/analysis/analysis-context';
import type { ParsedConversation } from '@/lib/parsers/types';
import type { EmotionCausesResult } from '@/lib/analysis/emotion-causes-prompts';

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
): UseEmotionCausesReturn {
  const { startOperation, updateOperation, stopOperation } = useAnalysis();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<EmotionCausesResult | undefined>();
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
        body: JSON.stringify({ messages, participants }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Emotion causes analysis failed: ${response.status} ${errorBody}`);
      }

      if (!response.body) throw new Error('No response body received');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult: EmotionCausesResult | null = null;

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
              result?: EmotionCausesResult;
              error?: string;
            };

            if (event.type === 'progress') {
              updateOperation('emotions', { progress: 50, status: (event as Record<string, unknown>).status as string ?? 'Analizuję...' });
            } else if (event.type === 'complete' && event.result) {
              finalResult = event.result;
            } else if (event.type === 'error') {
              throw new Error(event.error ?? 'Unknown emotion causes error');
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
      stopOperation('emotions');
    }
  }, [isLoading, conversation, onComplete, startOperation, updateOperation, stopOperation]);

  return { run, isLoading, result, error, reset };
}
