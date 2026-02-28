'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  ArgumentSimulationMessage,
  ArgumentSummary,
  ArgumentTopic,
  EnrichedFingerprintData,
  ArgumentSimulationResult,
  StoredAnalysis,
} from '@/lib/analysis/types';
import { sampleMessages, buildQuantitativeContext } from '@/lib/analysis/qualitative';
import { useAnalysis } from '@/lib/analysis/analysis-context';

// ============================================================
// Public interface
// ============================================================

export interface UseArgumentSimulationReturn {
  // Enrichment
  enrichmentState: 'idle' | 'loading' | 'ready' | 'error';
  topics: ArgumentTopic[];
  enrichedFingerprint: EnrichedFingerprintData | null;

  // Generation
  generationState: 'idle' | 'loading' | 'ready' | 'error';
  script: ArgumentSimulationMessage[] | null;
  summary: ArgumentSummary | null;

  // Playback
  playbackState: 'idle' | 'playing' | 'paused' | 'finished';
  visibleMessages: ArgumentSimulationMessage[];
  currentMessageIndex: number;
  isTyping: boolean;
  typingSender: string;
  speed: 1 | 2 | 3;

  // Actions
  startEnrichment: () => void;
  generateArgument: (topic: string) => void;
  startPlayback: () => void;
  pausePlayback: () => void;
  resumePlayback: () => void;
  setSpeed: (speed: 1 | 2 | 3) => void;
  skipToEnd: () => void;
  reset: () => void;

  // Progress & errors
  progressMessage: string;
  error: string | null;
}

// ============================================================
// Playback timing helpers
// ============================================================

/** Duration of the typing indicator before each message, divided by speed */
function computeTypingDuration(delayMs: number, speed: number): number {
  return Math.min(delayMs * 0.6, 2000) / speed;
}

/** Inter-message delay: shorter for messages in the same burst group */
function computeMessageDelay(
  msg: ArgumentSimulationMessage,
  prevMsg: ArgumentSimulationMessage | null,
  speed: number,
): number {
  if (prevMsg && msg.burstGroup === prevMsg.burstGroup) {
    // Within the same burst — rapid fire: random 800-1500ms base, divided by speed
    return (800 + Math.random() * 700) / speed;
  }
  return msg.delayMs / speed;
}

// ============================================================
// Hook implementation
// ============================================================

export function useArgumentSimulation(
  analysis: StoredAnalysis,
  onComplete?: (result: ArgumentSimulationResult) => void,
): UseArgumentSimulationReturn {
  // --- Enrichment state ---
  const [enrichmentState, setEnrichmentState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [topics, setTopics] = useState<ArgumentTopic[]>([]);
  const [enrichedFingerprint, setEnrichedFingerprint] = useState<EnrichedFingerprintData | null>(null);

  // --- Generation state ---
  const [generationState, setGenerationState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [script, setScript] = useState<ArgumentSimulationMessage[] | null>(null);
  const [summary, setSummary] = useState<ArgumentSummary | null>(null);

  // --- Playback state ---
  const [playbackState, setPlaybackState] = useState<'idle' | 'playing' | 'paused' | 'finished'>('idle');
  const [visibleMessages, setVisibleMessages] = useState<ArgumentSimulationMessage[]>([]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typingSender, setTypingSender] = useState('');
  const [speed, setSpeedState] = useState<1 | 2 | 3>(1);

  // --- Shared state ---
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // --- Refs ---
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const rafRef = useRef<number | null>(null);
  const speedRef = useRef<1 | 2 | 3>(1);

  // Playback engine refs — these survive across RAF frames without causing re-renders
  const playbackIndexRef = useRef(0);
  const playbackPhaseRef = useRef<'delay' | 'typing'>('delay');
  const playbackElapsedRef = useRef(0);
  const playbackTargetRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const scriptRef = useRef<ArgumentSimulationMessage[] | null>(null);

  // Operation tracking from context (persists across page navigation)
  const { startOperation, updateOperation, stopOperation } = useAnalysis();

  // Keep scriptRef in sync
  useEffect(() => {
    scriptRef.current = script;
  }, [script]);

  // Keep speedRef in sync so RAF reads latest speed without re-render
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // Cleanup on unmount — DON'T abort SSE so background operations persist
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // SSE intentionally NOT aborted — generation continues + saves results via onComplete
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  // ============================================================
  // SSE helper — shared between enrichment and generation
  // ============================================================

  const runSSE = useCallback(async <T>(
    body: Record<string, unknown>,
    handlers: {
      onProgress: (status: string) => void;
      onComplete: (result: T) => void;
      onError: (message: string) => void;
    },
  ): Promise<void> => {
    const controller = new AbortController();
    abortRef.current = controller;

    const response = await fetch('/api/analyze/argument', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API error: ${response.status} ${errorBody}`);
    }

    if (!response.body) {
      throw new Error('No response body received');
    }

    const reader = response.body.getReader();
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
          const event = JSON.parse(data) as {
            type: string;
            status?: string;
            result?: T;
            topics?: ArgumentTopic[];
            enrichedFingerprint?: EnrichedFingerprintData;
            error?: string;
          };

          if (event.type === 'progress' && event.status) {
            handlers.onProgress(event.status);
          } else if (event.type === 'enrichment_complete') {
            // Enrichment phase returns topics + fingerprint
            handlers.onComplete(event as unknown as T);
          } else if (event.type === 'complete' && event.result) {
            handlers.onComplete(event.result);
          } else if (event.type === 'error') {
            handlers.onError(event.error ?? 'Nieznany błąd analizy');
          }
        } catch (parseError) {
          // Skip malformed JSON lines in the SSE stream
          if (parseError instanceof SyntaxError) continue;
          throw parseError;
        }
      }
    }
  }, []);

  // ============================================================
  // Phase 1: Enrichment
  // ============================================================

  const startEnrichment = useCallback(async () => {
    if (enrichmentState === 'loading') return;

    setEnrichmentState('loading');
    setProgressMessage('Przygotowuję fingerprint konwersacji...');
    setError(null);
    startOperation('argument', 'Symulacja Kłótni', 'Analiza fingerprint...');

    try {
      const { conversation, quantitative } = analysis;
      const participants = conversation.participants.map((p) => p.name);
      const samples = sampleMessages(conversation, quantitative);
      const quantitativeContext = buildQuantitativeContext(quantitative, conversation.participants);

      type EnrichmentResult = { topics?: ArgumentTopic[]; enrichedFingerprint?: EnrichedFingerprintData };
      let enrichmentResult: EnrichmentResult | null = null;

      await runSSE<EnrichmentResult>(
        {
          mode: 'enrich',
          samples,
          participants,
          quantitativeContext,
        },
        {
          onProgress: (status) => {
            updateOperation('argument', { status });
            if (mountedRef.current) setProgressMessage(status);
          },
          onComplete: (result) => {
            enrichmentResult = result;
          },
          onError: (message) => {
            throw new Error(message);
          },
        },
      );

      // Enrichment requires user interaction (topic picker) — stop tracking
      stopOperation('argument');

      if (!mountedRef.current) return;

      // TS can't track closure mutation — cast to restore the type
      const eResult = enrichmentResult as EnrichmentResult | null;
      if (!eResult?.topics?.length || !eResult?.enrichedFingerprint) {
        throw new Error('Enrichment zakończony bez wyników — spróbuj ponownie');
      }

      setTopics(eResult.topics);
      setEnrichedFingerprint(eResult.enrichedFingerprint);
      setEnrichmentState('ready');
      setProgressMessage('');
    } catch (err) {
      stopOperation('argument');
      if (abortRef.current?.signal.aborted) return;
      if (!mountedRef.current) return;
      setEnrichmentState('error');
      setError(err instanceof Error ? err.message : String(err));
      setProgressMessage('');
    }
  }, [analysis, enrichmentState, runSSE, startOperation, updateOperation, stopOperation]);

  // ============================================================
  // Phase 2: Generation
  // ============================================================

  const generateArgument = useCallback(async (topic: string) => {
    if (generationState === 'loading' || !enrichedFingerprint) return;

    setGenerationState('loading');
    setProgressMessage('Generuję symulację kłótni...');
    setError(null);
    startOperation('argument', 'Symulacja Kłótni', 'Generuję kłótnię...');
    // Reset playback when generating a new script
    setPlaybackState('idle');
    setVisibleMessages([]);
    setCurrentMessageIndex(0);
    setIsTyping(false);
    setTypingSender('');

    try {
      const { conversation, quantitative } = analysis;
      const participants = conversation.participants.map((p) => p.name);
      const samples = sampleMessages(conversation, quantitative);
      const quantitativeContext = buildQuantitativeContext(quantitative, conversation.participants);

      interface GenerationResult {
        messages: ArgumentSimulationMessage[];
        summary: ArgumentSummary;
      }

      let generationResult: GenerationResult | null = null;

      await runSSE<GenerationResult>(
        {
          mode: 'generate',
          topic,
          enrichedFingerprint,
          samples,
          participants,
          quantitativeContext,
        },
        {
          onProgress: (status) => {
            updateOperation('argument', { progress: 50, status });
            if (mountedRef.current) setProgressMessage(status);
          },
          onComplete: (result) => {
            generationResult = result;
          },
          onError: (message) => {
            throw new Error(message);
          },
        },
      );

      // TS can't track closure mutation — cast to restore the type
      const gResult = generationResult as GenerationResult | null;
      if (!gResult?.messages?.length || !gResult?.summary) {
        throw new Error('Generowanie skryptu nie zwróciło wyników — spróbuj ponownie');
      }

      // Fire completion callback ALWAYS — persists to IndexedDB via mergeQualitative
      // even when component is unmounted (context provider is still alive)
      if (onComplete) {
        onComplete({
          topic,
          messages: gResult.messages,
          summary: gResult.summary,
          enrichedFingerprint,
        });
      }

      // Only update local state if still mounted
      if (mountedRef.current) {
        setScript(gResult.messages);
        setSummary(gResult.summary);
        setGenerationState('ready');
        setProgressMessage('');
      }
    } catch (err) {
      if (abortRef.current?.signal.aborted) return;
      if (mountedRef.current) {
        setGenerationState('error');
        setError(err instanceof Error ? err.message : String(err));
        setProgressMessage('');
      }
    } finally {
      stopOperation('argument');
    }
  }, [analysis, enrichedFingerprint, generationState, onComplete, runSSE, startOperation, updateOperation, stopOperation]);

  // ============================================================
  // Phase 3: Playback engine (RAF-based)
  // ============================================================

  const scheduleNextFrame = useCallback(() => {
    rafRef.current = requestAnimationFrame((timestamp) => {
      if (!mountedRef.current) return;

      const messages = scriptRef.current;
      if (!messages) return;

      const idx = playbackIndexRef.current;
      if (idx >= messages.length) {
        // All messages shown
        setPlaybackState('finished');
        setIsTyping(false);
        setTypingSender('');
        rafRef.current = null;
        return;
      }

      const delta = lastFrameTimeRef.current === 0 ? 0 : timestamp - lastFrameTimeRef.current;
      lastFrameTimeRef.current = timestamp;
      playbackElapsedRef.current += delta;

      const currentMsg = messages[idx];
      const prevMsg = idx > 0 ? messages[idx - 1] : null;
      const currentSpeed = speedRef.current;

      if (playbackPhaseRef.current === 'delay') {
        // Waiting for inter-message delay to elapse
        const delayTarget = playbackTargetRef.current;

        if (playbackElapsedRef.current >= delayTarget) {
          // Delay phase complete — enter typing phase if message wants typing indicator
          if (currentMsg.isTypingVisible) {
            playbackPhaseRef.current = 'typing';
            playbackElapsedRef.current = 0;
            playbackTargetRef.current = computeTypingDuration(currentMsg.delayMs, currentSpeed);
            setIsTyping(true);
            setTypingSender(currentMsg.sender);
          } else {
            // No typing indicator — show message immediately
            playbackPhaseRef.current = 'delay';
            playbackElapsedRef.current = 0;
            playbackIndexRef.current = idx + 1;
            const nextIdx = idx + 1;
            const nextMsg = nextIdx < messages.length ? messages[nextIdx] : null;
            playbackTargetRef.current = nextMsg
              ? computeMessageDelay(nextMsg, currentMsg, currentSpeed)
              : 0;

            setVisibleMessages((prev) => [...prev, currentMsg]);
            setCurrentMessageIndex(nextIdx);
            setIsTyping(false);
            setTypingSender('');
          }
        }

        scheduleNextFrame();
        return;
      }

      if (playbackPhaseRef.current === 'typing') {
        // Waiting for typing indicator duration to elapse
        if (playbackElapsedRef.current >= playbackTargetRef.current) {
          // Typing phase done — reveal message, advance index
          playbackPhaseRef.current = 'delay';
          playbackElapsedRef.current = 0;
          playbackIndexRef.current = idx + 1;
          const nextIdx = idx + 1;
          const nextMsg = nextIdx < messages.length ? messages[nextIdx] : null;
          playbackTargetRef.current = nextMsg
            ? computeMessageDelay(nextMsg, currentMsg, currentSpeed)
            : 0;

          setVisibleMessages((prev) => [...prev, currentMsg]);
          setCurrentMessageIndex(nextIdx);
          setIsTyping(false);
          setTypingSender('');
        }

        scheduleNextFrame();
        return;
      }
    });
  }, []);

  const startPlayback = useCallback(() => {
    if (!script?.length || playbackState === 'playing') return;

    // Reset playback state for a fresh start
    setVisibleMessages([]);
    setCurrentMessageIndex(0);
    setPlaybackState('playing');
    setIsTyping(false);
    setTypingSender('');

    playbackIndexRef.current = 0;
    playbackPhaseRef.current = 'delay';
    playbackElapsedRef.current = 0;
    lastFrameTimeRef.current = 0;

    // Initial delay for first message
    const firstMsg = script[0];
    playbackTargetRef.current = computeMessageDelay(firstMsg, null, speedRef.current);

    scheduleNextFrame();
  }, [script, playbackState, scheduleNextFrame]);

  const pausePlayback = useCallback(() => {
    if (playbackState !== 'playing') return;

    // Cancel the RAF loop — elapsed time is preserved in playbackElapsedRef
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // Reset frame time so the next resume doesn't count the pause gap as delta
    lastFrameTimeRef.current = 0;
    setPlaybackState('paused');
  }, [playbackState]);

  const resumePlayback = useCallback(() => {
    if (playbackState !== 'paused') return;

    setPlaybackState('playing');
    // Don't reset elapsed — we continue from the exact position
    lastFrameTimeRef.current = 0;
    scheduleNextFrame();
  }, [playbackState, scheduleNextFrame]);

  const setSpeed = useCallback((newSpeed: 1 | 2 | 3) => {
    setSpeedState(newSpeed);
    // speedRef is synced via useEffect, takes effect on the next RAF frame

    // If currently in delay or typing phase, recalculate the remaining target
    // proportionally to the speed change so the transition feels responsive
    const oldSpeed = speedRef.current;
    if (oldSpeed !== newSpeed && playbackState === 'playing') {
      const ratio = oldSpeed / newSpeed;
      const remaining = playbackTargetRef.current - playbackElapsedRef.current;
      if (remaining > 0) {
        playbackTargetRef.current = playbackElapsedRef.current + remaining * ratio;
      }
    }
  }, [playbackState]);

  const skipToEnd = useCallback(() => {
    if (!script?.length) return;

    // Cancel any running playback
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    setVisibleMessages([...script]);
    setCurrentMessageIndex(script.length);
    setPlaybackState('finished');
    setIsTyping(false);
    setTypingSender('');

    playbackIndexRef.current = script.length;
    playbackPhaseRef.current = 'delay';
    playbackElapsedRef.current = 0;
    playbackTargetRef.current = 0;
  }, [script]);

  // ============================================================
  // Full reset
  // ============================================================

  const reset = useCallback(() => {
    // Abort any ongoing SSE
    abortRef.current?.abort();
    stopOperation('argument');

    // Cancel playback RAF
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // Reset all state
    setEnrichmentState('idle');
    setTopics([]);
    setEnrichedFingerprint(null);

    setGenerationState('idle');
    setScript(null);
    setSummary(null);

    setPlaybackState('idle');
    setVisibleMessages([]);
    setCurrentMessageIndex(0);
    setIsTyping(false);
    setTypingSender('');
    setSpeedState(1);

    setProgressMessage('');
    setError(null);

    // Reset refs
    playbackIndexRef.current = 0;
    playbackPhaseRef.current = 'delay';
    playbackElapsedRef.current = 0;
    playbackTargetRef.current = 0;
    lastFrameTimeRef.current = 0;
    speedRef.current = 1;
  }, [stopOperation]);

  return {
    // Enrichment
    enrichmentState,
    topics,
    enrichedFingerprint,

    // Generation
    generationState,
    script,
    summary,

    // Playback
    playbackState,
    visibleMessages,
    currentMessageIndex,
    isTyping,
    typingSender,
    speed,

    // Actions
    startEnrichment,
    generateArgument,
    startPlayback,
    pausePlayback,
    resumePlayback,
    setSpeed,
    skipToEnd,
    reset,

    // Progress & errors
    progressMessage,
    error,
  };
}

export default useArgumentSimulation;
