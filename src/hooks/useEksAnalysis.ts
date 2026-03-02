'use client';

import { useState, useCallback, useRef, useEffect, useSyncExternalStore } from 'react';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';
import type { QualitativeAnalysis } from '@/lib/analysis/types';
import type { EksResult, EksRecon, EksPsychogramResult } from '@/lib/analysis/eks-prompts';
import { buildQuantitativeContext } from '@/lib/analysis/qualitative';
import type { OperationCallbacks, ProgressPhase } from '@/hooks/sse-types';
import { getBackgroundOp, setBackgroundOp, clearBackgroundOp, subscribeBackgroundOps, getSnapshotFactory } from '@/lib/analysis/background-ops';

interface UseEksAnalysisOptions {
  conversation: ParsedConversation;
  quantitative: QuantitativeAnalysis;
  qualitative?: QualitativeAnalysis;
  ops?: OperationCallbacks;
  onComplete?: (result: EksResult) => void;
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
  onComplete,
}: UseEksAnalysisOptions): UseEksAnalysisReturn {
  const OP_KEY = 'eks';
  const [state, setState] = useState<EksState>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<EksResult | undefined>();
  const [error, setError] = useState<string | null>(null);
  const ceilingRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  // Stable ref for onComplete so background fetch can call it after unmount
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Background state — survives unmount/remount cycles
  const bgOp = useSyncExternalStore(subscribeBackgroundOps, getSnapshotFactory(OP_KEY), () => undefined);
  const isRunningInBackground = !!bgOp && !bgOp.isComplete && !bgOp.error;

  // NOTE: No abort-on-unmount — analysis continues in background when navigating away

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
    if (isRunningInBackground) return; // already running in background
    if (state !== 'idle' && state !== 'error' && state !== 'complete') return;

    // Abort previous run if any
    abortRef.current?.abort();

    setState('recon');
    setProgress(0);
    setError(null);
    setBackgroundOp(OP_KEY, { progress: 0, phaseName: 'Rekonesans', isComplete: false, error: null });
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

      // ─── Phase A: Initial sampling (700 messages) for Recon ───
      const RECON_SAMPLES = 700;
      let reconOverview: SimplifiedMessage[];
      if (allMessages.length <= RECON_SAMPLES) {
        reconOverview = allMessages;
      } else {
        const head = allMessages.slice(0, 150);
        // Proportional tail — minimum 200, scale with conversation size
        const tailSize = Math.max(200, Math.min(500, Math.floor(allMessages.length * 0.15)));
        const tail = allMessages.slice(-tailSize);
        // 3 middle windows: 1% of conversation per window (min 50)
        const windowSize = Math.max(50, Math.floor(allMessages.length * 0.01));
        const midWindows: SimplifiedMessage[] = [];
        for (const pct of [0.25, 0.5, 0.75]) {
          const start = Math.floor(allMessages.length * pct);
          midWindows.push(...allMessages.slice(start, start + windowSize));
        }

        // Gap-adjacent sampling: for top 6 communication gaps, grab 15 msg before + 15 after
        const gapAdjacentMessages: SimplifiedMessage[] = [];
        const communicationGaps = quantitative.communicationGaps ?? [];
        const topGaps = communicationGaps.slice(0, 6);
        const reconSeenIndices = new Set([
          ...head.map(m => m.index),
          ...tail.map(m => m.index),
          ...midWindows.map(m => m.index),
        ]);
        for (const gap of topGaps) {
          // Find the boundary indices in allMessages
          const gapStartIdx = allMessages.findIndex(m => m.timestamp >= gap.startTimestamp);
          const gapEndIdx = allMessages.findIndex(m => m.timestamp >= gap.endTimestamp);
          if (gapStartIdx >= 0) {
            // 15 messages ending at the gap start (the last messages before silence)
            const beforeStart = Math.max(0, gapStartIdx - 14);
            for (let j = beforeStart; j <= gapStartIdx; j++) {
              if (!reconSeenIndices.has(allMessages[j].index)) {
                gapAdjacentMessages.push(allMessages[j]);
                reconSeenIndices.add(allMessages[j].index);
              }
            }
          }
          if (gapEndIdx >= 0) {
            // 15 messages starting from the gap end (the first messages after reunion)
            const afterEnd = Math.min(allMessages.length - 1, gapEndIdx + 14);
            for (let j = gapEndIdx; j <= afterEnd; j++) {
              if (!reconSeenIndices.has(allMessages[j].index)) {
                gapAdjacentMessages.push(allMessages[j]);
                reconSeenIndices.add(allMessages[j].index);
              }
            }
          }
        }

        reconOverview = [...head, ...midWindows, ...gapAdjacentMessages, ...tail];
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
                  setBackgroundOp(OP_KEY, { progress: phase.start, phaseName: 'Rekonesans', isComplete: false, error: null });
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
      setBackgroundOp(OP_KEY, { progress: 28, phaseName: 'Celowanie', isComplete: false, error: null });
      ops?.updateOperation('eks', { progress: 28, status: 'Celowanie próbek...' });

      // Extract targeted messages from flagged date ranges
      const targetedMessages: SimplifiedMessage[] = [];
      const seenIndices = new Set(reconOverview.map(m => m.index));
      const MAX_RANGES = 8;
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

      // Also extract: late-night messages (23:00-05:00)
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

      // Emotional keyword sampling: find messages about breakups, grief, suicidal thoughts, sadness
      // These high-signal messages are critical for Tryb Eks to properly assess emotional damage
      const EMOTIONAL_KEYWORDS_PL = [
        'zrywam', 'zerwij', 'zerwać', 'zerwaliśmy', 'zerwałam', 'zerwałem', 'rozstanie', 'rozstajemy',
        'koniec', 'odchodzę', 'odejdź', 'odeszłam', 'odszedł', 'zostawiam', 'zostawiasz', 'zostaw mnie',
        'nie chcę cię', 'nie kocham', 'kocham cię', 'tęsknię', 'tęsknisz',
        'samobójstwo', 'samobójcze', 'zabić się', 'chcę umrzeć', 'nie chcę żyć', 'skończę z sobą',
        'targnąć', 'podcięła', 'podciąłem', 'tabletki', 'przedawkować',
        'płaczę', 'wyję', 'nie mogę przestać płakać', 'załamanie', 'załamałam',
        'zdrada', 'zdradziłeś', 'zdradziłaś', 'zdradzasz', 'inna', 'inny', 'z kimś innym',
        'przepraszam', 'wybacz', 'nigdy mi nie wybaczysz', 'żałuję',
        'ból', 'boli mnie', 'umrę', 'cierpię', 'cierpienie',
        'depresja', 'leki', 'terapeuta', 'terapia', 'psycholog', 'psychiatra',
        'nie odpisuj', 'blokuję', 'zablokuj', 'usuwam numer', 'wypad z mojego życia',
      ];
      const EMOTIONAL_KEYWORDS_EN = [
        'breakup', 'break up', 'breaking up', 'broke up', "it's over", 'leaving you',
        'suicide', 'kill myself', 'want to die', 'end it all', 'self harm', 'cutting',
        'crying', "can't stop crying", 'breakdown', 'falling apart',
        'cheating', 'cheated', 'affair', 'someone else',
        'sorry', 'forgive', 'regret', 'apologize',
        'depression', 'depressed', 'therapy', 'therapist', 'psychiatrist',
        'blocking you', 'delete your number', 'get out of my life',
        'i love you', 'miss you', 'i miss us', 'come back',
        'hurting', 'pain', 'suffering', 'broken',
      ];
      const emotionalPatterns = [...EMOTIONAL_KEYWORDS_PL, ...EMOTIONAL_KEYWORDS_EN];

      const emotionalMessages = allMessages.filter(m => {
        if (seenIndices.has(m.index)) return false;
        const lower = m.content.toLowerCase();
        return emotionalPatterns.some(kw => lower.includes(kw));
      }).slice(0, 80);
      for (const msg of emotionalMessages) {
        if (!seenIndices.has(msg.index)) {
          targetedMessages.push(msg);
          seenIndices.add(msg.index);
          // Also grab 2 messages before and 2 after for context
          const msgIdx = allMessages.findIndex(m => m.index === msg.index);
          if (msgIdx >= 0) {
            for (let j = Math.max(0, msgIdx - 2); j <= Math.min(allMessages.length - 1, msgIdx + 2); j++) {
              if (!seenIndices.has(allMessages[j].index)) {
                targetedMessages.push(allMessages[j]);
                seenIndices.add(allMessages[j].index);
              }
            }
          }
        }
      }

      // Cap total targeted to 500
      const cappedTargeted = targetedMessages.slice(0, 500);

      if (controller.signal.aborted) return;

      // ─── Autopsy request (Pass 2 + Pass 3) ───
      setState('autopsy');
      setProgress(32);
      ceilingRef.current = 45;
      setBackgroundOp(OP_KEY, { progress: 32, phaseName: 'Sekcja', isComplete: false, error: null });
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
                  setBackgroundOp(OP_KEY, { progress: phase.start, phaseName: 'Sekcja', isComplete: false, error: null });
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
      setBackgroundOp(OP_KEY, { progress: 76, phaseName: 'Psychogram', isComplete: false, error: null });
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
                    setBackgroundOp(OP_KEY, { progress: phase.start, phaseName: 'Psychogram', isComplete: false, error: null });
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
      clearBackgroundOp(OP_KEY);
      // Call onComplete directly — works even after component unmount
      // because context callbacks are stable (defined at layout level)
      onCompleteRef.current?.(finalResult);
    } catch (err) {
      if (controller.signal.aborted) return;
      setState('error');
      setError(err instanceof Error ? err.message : String(err));
      clearBackgroundOp(OP_KEY);
    } finally {
      ops?.stopOperation('eks');
    }
  }, [state, isRunningInBackground, conversation, quantitative, qualitative, ops]);

  // Derive state: prefer background op state when running in background (survived navigation)
  const locallyLoading = state === 'recon' || state === 'targeting' || state === 'autopsy' || state === 'psychogram';

  return {
    runEks,
    isLoading: isRunningInBackground || locallyLoading,
    progress: isRunningInBackground ? (bgOp?.progress ?? 0) : progress,
    phaseName: isRunningInBackground ? (bgOp?.phaseName ?? '') : PHASE_LABELS[state],
    result,
    error,
    reset,
  };
}
