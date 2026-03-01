'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';
import type { QualitativeAnalysis } from '@/lib/analysis/types';
import type { EksResult, EksRecon, EksPsychogramResult } from '@/lib/analysis/eks-prompts';
import { buildQuantitativeContext } from '@/lib/analysis/qualitative';

interface OperationCallbacks {
  startOperation: (id: string, label: string, status?: string) => void;
  updateOperation: (id: string, patch: { progress?: number; status?: string }) => void;
  stopOperation: (id: string) => void;
}

interface UseEksAnalysisOptions {
  conversation: ParsedConversation;
  quantitative: QuantitativeAnalysis;
  qualitative?: QualitativeAnalysis;
  ops?: OperationCallbacks;
}

interface UseEksAnalysisReturn {
  runEks: () => Promise<void>;
  isLoading: boolean;
  progress: number;
  phaseName: string;
  result: EksResult | undefined;
  error: string | null;
  reset: () => void;
}

type EksState = 'idle' | 'recon' | 'targeting' | 'autopsy' | 'psychogram' | 'complete' | 'error';

interface ProgressPhase {
  start: number;
  ceiling: number;
}

// 14 progress entries across 0-98%
const PHASE_MAP: Record<string, ProgressPhase> = {
  // Pass 1 — Recon (0-22%)
  'Rekonesans patologiczny...': { start: 2, ceiling: 10 },
  'Skanowanie wzorców...': { start: 12, ceiling: 18 },
  'Identyfikacja punktów zwrotnych...': { start: 20, ceiling: 22 },
  // Targeting (22-25%)
  'Celowanie próbek...': { start: 22, ceiling: 25 },
  // Pass 2 — Deep Autopsy (25-52%)
  'Głęboka sekcja zwłok...': { start: 27, ceiling: 38 },
  'Analiza ukrytych wzorców...': { start: 40, ceiling: 48 },
  'Ekstrakcja dowodów...': { start: 50, ceiling: 52 },
  // Pass 3 — Verdict (54-72%)
  'Formułowanie werdyktu...': { start: 54, ceiling: 62 },
  'Pisanie epitafium...': { start: 64, ceiling: 70 },
  'Zamykanie akt...': { start: 72, ceiling: 74 },
  // Pass 4 — Psychogram (76-98%)
  'Analiza stylu przywiązania...': { start: 76, ceiling: 82 },
  'Identyfikacja wzorców powtarzalnych...': { start: 84, ceiling: 88 },
  'Pisanie listu od terapeuty...': { start: 90, ceiling: 94 },
  'Zamykanie psychogramu...': { start: 96, ceiling: 98 },
};

const PHASE_LABELS: Record<EksState, string> = {
  idle: '',
  recon: 'Rekonesans',
  targeting: 'Celowanie',
  autopsy: 'Sekcja',
  psychogram: 'Psychogram',
  complete: 'Gotowe',
  error: 'Błąd',
};

type SimplifiedMessage = {
  sender: string;
  content: string;
  timestamp: number;
  index: number;
};

/**
 * Extract messages falling within a date range.
 * start/end are YYYY-MM or YYYY-MM-DD strings.
 */
function extractMessagesInRange(
  messages: SimplifiedMessage[],
  start: string,
  end: string,
  limit: number,
): SimplifiedMessage[] {
  // Parse start/end to timestamps
  const startTs = new Date(start.length <= 7 ? `${start}-01` : start).getTime();
  const endDate = new Date(end.length <= 7 ? `${end}-28` : end);
  // Add a month buffer for YYYY-MM ranges
  if (end.length <= 7) endDate.setMonth(endDate.getMonth() + 1);
  const endTs = endDate.getTime();

  const matching = messages.filter(m => m.timestamp >= startTs && m.timestamp <= endTs);

  if (matching.length <= limit) return matching;

  // Sample evenly from the range
  const step = Math.floor(matching.length / limit);
  const sampled: SimplifiedMessage[] = [];
  for (let i = 0; i < matching.length && sampled.length < limit; i += step) {
    sampled.push(matching[i]);
  }
  return sampled;
}

export function useEksAnalysis({
  conversation,
  quantitative,
  qualitative,
  ops,
}: UseEksAnalysisOptions): UseEksAnalysisReturn {
  const [state, setState] = useState<EksState>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<EksResult | undefined>();
  const [error, setError] = useState<string | null>(null);
  const ceilingRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  // Smooth progress interpolation
  useEffect(() => {
    if (state === 'idle' || state === 'complete' || state === 'error') {
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

  const runEks = useCallback(async () => {
    if (state !== 'idle' && state !== 'error' && state !== 'complete') return;
    setState('recon');
    setProgress(0);
    setError(null);
    ops?.startOperation('eks', 'Tryb Eks', 'Rekonesans patologiczny...');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const participants = conversation.participants.map(p => p.name);

      // Build all filtered messages
      const allMessages: SimplifiedMessage[] = conversation.messages
        .filter(m => m.type !== 'call' && m.type !== 'system' && !m.isUnsent && m.content?.trim())
        .map(m => ({ sender: m.sender, content: m.content, timestamp: m.timestamp, index: m.index }));

      // ─── Extract final messages (always sent for accurate "Last Words") ───
      const FINAL_MESSAGES_COUNT = 30;
      const finalMessages = allMessages.slice(-FINAL_MESSAGES_COUNT);

      // ─── Phase A: Initial sampling (500 messages) for Recon ───
      const RECON_SAMPLES = 500;
      let reconOverview: SimplifiedMessage[];
      if (allMessages.length <= RECON_SAMPLES) {
        reconOverview = allMessages;
      } else {
        const head = allMessages.slice(0, 150);
        // Proportional tail — minimum 200, scale with conversation size
        const tailSize = Math.max(200, Math.min(500, Math.floor(allMessages.length * 0.15)));
        const tail = allMessages.slice(-tailSize);
        // 3 middle windows of 50 each at 25%, 50%, 75%
        const midWindows: SimplifiedMessage[] = [];
        for (const pct of [0.25, 0.5, 0.75]) {
          const start = Math.floor(allMessages.length * pct);
          midWindows.push(...allMessages.slice(start, start + 50));
        }
        reconOverview = [...head, ...midWindows, ...tail];
      }

      const quantitativeContext = buildQuantitativeContext(quantitative, conversation.participants);

      const existingAnalysis = qualitative?.pass1 ? {
        pass1: qualitative.pass1 as unknown as Record<string, unknown>,
        pass2: qualitative.pass2 as unknown as Record<string, unknown>,
        pass4: qualitative.pass4 as unknown as Record<string, unknown>,
      } : undefined;

      // ─── Recon request ───
      const reconResponse = await fetch('/api/analyze/eks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          samples: { overview: reconOverview },
          participants,
          quantitativeContext,
          phase: 'recon',
        }),
        signal: controller.signal,
      });

      if (!reconResponse.ok) {
        const errorBody = await reconResponse.text();
        throw new Error(`Rekonesans failed: ${reconResponse.status} ${errorBody}`);
      }

      // Parse recon SSE stream
      let reconResult: EksRecon | null = null;
      if (reconResponse.body) {
        const reader = reconResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

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
              const event = JSON.parse(data) as Record<string, unknown>;
              if (event.type === 'progress' && typeof event.status === 'string') {
                const phase = PHASE_MAP[event.status];
                if (phase) {
                  setProgress(phase.start);
                  ceilingRef.current = phase.ceiling;
                  ops?.updateOperation('eks', { progress: phase.start, status: event.status });
                }
              } else if (event.type === 'recon_complete' && event.recon) {
                reconResult = event.recon as EksRecon;
              } else if (event.type === 'error') {
                throw new Error((event.error as string) ?? 'Błąd rekonesansu');
              }
            } catch (parseError) {
              if (parseError instanceof SyntaxError) continue;
              throw parseError;
            }
          }
        }
      }

      if (!reconResult) {
        throw new Error('Rekonesans zakończył się bez wyników');
      }

      if (controller.signal.aborted) return;

      // ─── Phase B: Targeted sampling ───
      setState('targeting');
      setProgress(28);
      ceilingRef.current = 30;
      ops?.updateOperation('eks', { progress: 28, status: 'Celowanie próbek...' });

      // Extract targeted messages from flagged date ranges
      const targetedMessages: SimplifiedMessage[] = [];
      const seenIndices = new Set(reconOverview.map(m => m.index));
      const MAX_RANGES = 5;
      const MAX_PER_RANGE = 80;

      const flaggedRanges = (reconResult.flaggedDateRanges ?? []).slice(0, MAX_RANGES);

      for (const range of flaggedRanges) {
        const rangeMessages = extractMessagesInRange(allMessages, range.start, range.end, MAX_PER_RANGE);
        for (const msg of rangeMessages) {
          if (!seenIndices.has(msg.index)) {
            targetedMessages.push(msg);
            seenIndices.add(msg.index);
          }
        }
      }

      // Also extract: late-night messages (23:00-05:00), one-word responses, double-texting streaks
      const lateNight = allMessages.filter(m => {
        const h = new Date(m.timestamp).getHours();
        return (h >= 23 || h < 5) && !seenIndices.has(m.index);
      }).slice(0, 50);
      for (const msg of lateNight) {
        if (!seenIndices.has(msg.index)) {
          targetedMessages.push(msg);
          seenIndices.add(msg.index);
        }
      }

      // Cap total targeted to 400
      const cappedTargeted = targetedMessages.slice(0, 400);

      if (controller.signal.aborted) return;

      // ─── Autopsy request (Pass 2 + Pass 3) ───
      setState('autopsy');
      setProgress(32);
      ceilingRef.current = 45;
      ops?.updateOperation('eks', { progress: 32, status: 'Głęboka sekcja zwłok...' });

      const autopsyResponse = await fetch('/api/analyze/eks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          samples: { overview: reconOverview },
          participants,
          quantitativeContext,
          phase: 'autopsy',
          recon: reconResult,
          targetedSamples: cappedTargeted.length > 0 ? { overview: cappedTargeted } : undefined,
          existingAnalysis,
          finalMessages,
        }),
        signal: controller.signal,
      });

      if (!autopsyResponse.ok) {
        const errorBody = await autopsyResponse.text();
        throw new Error(`Sekcja failed: ${autopsyResponse.status} ${errorBody}`);
      }

      // Parse autopsy SSE stream
      let finalResult: EksResult | null = null;
      if (autopsyResponse.body) {
        const reader = autopsyResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

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
              const event = JSON.parse(data) as Record<string, unknown>;
              if (event.type === 'progress' && typeof event.status === 'string') {
                const phase = PHASE_MAP[event.status];
                if (phase) {
                  setProgress(phase.start);
                  ceilingRef.current = phase.ceiling;
                  ops?.updateOperation('eks', { progress: phase.start, status: event.status });
                }
              } else if (event.type === 'complete' && event.result) {
                finalResult = event.result as EksResult;
              } else if (event.type === 'error') {
                throw new Error((event.error as string) ?? 'Błąd sekcji');
              }
            } catch (parseError) {
              if (parseError instanceof SyntaxError) continue;
              throw parseError;
            }
          }
        }
      }

      if (!finalResult) {
        throw new Error('Sekcja zakończyła się bez wyników');
      }

      if (controller.signal.aborted) return;

      // ─── Phase C: Psychogram (Pass 4 — optional, non-fatal) ───
      setState('psychogram');
      setProgress(76);
      ceilingRef.current = 82;
      ops?.updateOperation('eks', { progress: 76, status: 'Analiza stylu przywiązania...' });

      try {
        const psychogramResponse = await fetch('/api/analyze/eks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            samples: { overview: reconOverview },
            participants,
            quantitativeContext,
            phase: 'psychogram',
            eksResult: finalResult,
            cpsContext: qualitative?.pass3 ? (qualitative.pass3 as unknown as Record<string, unknown>) : undefined,
          }),
          signal: controller.signal,
        });

        if (psychogramResponse.ok && psychogramResponse.body) {
          const reader = psychogramResponse.body.getReader();
          const decoder = new TextDecoder();
          let pBuffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            pBuffer += decoder.decode(value, { stream: true });
            const lines = pBuffer.split('\n');
            pBuffer = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              try {
                const event = JSON.parse(data) as Record<string, unknown>;
                if (event.type === 'progress' && typeof event.status === 'string') {
                  const phase = PHASE_MAP[event.status];
                  if (phase) {
                    setProgress(phase.start);
                    ceilingRef.current = phase.ceiling;
                    ops?.updateOperation('eks', { progress: phase.start, status: event.status });
                  }
                } else if (event.type === 'psychogram_complete' && event.psychogram) {
                  const psychogram = event.psychogram as EksPsychogramResult;
                  finalResult = {
                    ...finalResult,
                    attachmentMap: psychogram.attachmentMap,
                    expandedPatterns: psychogram.expandedPatterns,
                    therapistLetter: psychogram.therapistLetter,
                    letterToTherapist: psychogram.letterToTherapist,
                    painSymmetry: psychogram.painSymmetry,
                    passesCompleted: 4,
                  };
                }
              } catch (parseError) {
                if (parseError instanceof SyntaxError) continue;
                throw parseError;
              }
            }
          }
        } else {
          console.warn('[Eks] Psychogram pass failed (non-fatal), continuing with Pass 2+3 results');
        }
      } catch (psychErr) {
        // Pass 4 is non-fatal
        if (controller.signal.aborted) return;
        console.warn('[Eks] Psychogram pass error (non-fatal):', psychErr);
      }

      setState('complete');
      setProgress(100);
      setResult(finalResult);
    } catch (err) {
      if (controller.signal.aborted) return;
      setState('error');
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      ops?.stopOperation('eks');
    }
  }, [state, conversation, quantitative, qualitative, ops]);

  return {
    runEks,
    isLoading: state === 'recon' || state === 'targeting' || state === 'autopsy' || state === 'psychogram',
    progress,
    phaseName: PHASE_LABELS[state],
    result,
    error,
    reset,
  };
}

export default useEksAnalysis;
