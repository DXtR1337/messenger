'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAnalysis } from '@/lib/analysis/analysis-context';
import type { ParsedConversation } from '@/lib/parsers/types';
import type { CapitalizationResult } from '@/lib/analysis/capitalization-prompts';

interface UseCapitalizationOptions {
  conversation: ParsedConversation;
  onComplete?: (result: CapitalizationResult) => void;
}

interface UseCapitalizationReturn {
  runAnalysis: () => Promise<void>;
  isLoading: boolean;
  progress: number;
  result: CapitalizationResult | undefined;
  error: string | null;
  reset: () => void;
}

type State = 'idle' | 'running' | 'complete' | 'error';

/** Sample up to N messages and format for Gemini */
function sampleMessagesText(conversation: ParsedConversation, maxMessages = 300): string {
  const { messages } = conversation;
  // Weight toward recent messages (last 60%)
  const recentCutoff = Math.floor(messages.length * 0.4);
  const older = messages.slice(0, recentCutoff);
  const recent = messages.slice(recentCutoff);

  const sampleOlder = older
    .filter(m => m.content && m.content.length > 5)
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.floor(maxMessages * 0.3));

  const sampleRecent = recent
    .filter(m => m.content && m.content.length > 5)
    .slice(-Math.ceil(maxMessages * 0.7));

  const combined = [...sampleOlder, ...sampleRecent]
    .sort((a, b) => a.timestamp - b.timestamp);

  return combined
    .map(m => {
      const d = new Date(m.timestamp);
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return `[${date}] ${m.sender}: ${m.content}`;
    })
    .join('\n');
}

export function useCapitalizationAnalysis({
  conversation,
  onComplete,
}: UseCapitalizationOptions): UseCapitalizationReturn {
  const { startOperation, updateOperation, stopOperation } = useAnalysis();
  const [state, setState] = useState<State>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CapitalizationResult | undefined>();
  const [error, setError] = useState<string | null>(null);
  const ceilingRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (state !== 'running') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setProgress(prev => {
        const ceiling = ceilingRef.current;
        if (prev >= ceiling) return prev;
        const step = Math.max(0.2, (ceiling - prev) * 0.04);
        return Math.min(prev + step, ceiling);
      });
    }, 150);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [state]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState('idle');
    setProgress(0);
    ceilingRef.current = 0;
    setResult(undefined);
    setError(null);
  }, []);

  const runAnalysis = useCallback(async () => {
    if (state === 'running') return;
    setState('running');
    setProgress(0);
    setError(null);
    startOperation('capitalization', 'Kapitalizacja ACR', 'Przygotowuję analizę...');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const messagesText = sampleMessagesText(conversation);
      const participants = conversation.participants.map(p => p.name);

      ceilingRef.current = 30;

      const response = await fetch('/api/analyze/capitalization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messagesText, participants }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Analiza nie powiodła się: ${response.status} ${errorBody}`);
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult: CapitalizationResult | null = null;

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
              result?: CapitalizationResult;
              error?: string;
            };
            if (event.type === 'progress') {
              ceilingRef.current = 70;
              updateOperation('capitalization', { progress: 50, status: event.status ?? 'Analizuję...' });
            } else if (event.type === 'complete' && event.result) {
              finalResult = event.result;
              ceilingRef.current = 100;
            } else if (event.type === 'error') {
              throw new Error(event.error ?? 'Nieznany błąd analizy');
            }
          } catch (parseError) {
            if (parseError instanceof SyntaxError) continue;
            throw parseError;
          }
        }
      }

      if (finalResult) {
        setState('complete');
        setProgress(100);
        setResult(finalResult);
        onComplete?.(finalResult);
      } else {
        throw new Error('Analiza zakończona bez wyników');
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setState('error');
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      stopOperation('capitalization');
    }
  }, [state, conversation, onComplete, startOperation, updateOperation, stopOperation]);

  return {
    runAnalysis,
    isLoading: state === 'running',
    progress,
    result,
    error,
    reset,
  };
}

export default useCapitalizationAnalysis;
