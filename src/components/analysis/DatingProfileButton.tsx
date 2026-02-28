'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Heart, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sampleMessages, buildQuantitativeContext } from '@/lib/analysis/qualitative';
import { runDeepScan } from '@/lib/analysis/deep-scanner';
import { trackEvent } from '@/lib/analytics/events';
import { useAnalysis } from '@/lib/analysis/analysis-context';
import type { StoredAnalysis } from '@/lib/analysis/types';
import type { DatingProfileResult } from '@/lib/analysis/dating-profile-prompts';
import { logger } from '@/lib/logger';

interface DatingProfileButtonProps {
  analysis: StoredAnalysis;
  onComplete: (result: DatingProfileResult) => void;
}

export default function DatingProfileButton({ analysis, onComplete }: DatingProfileButtonProps) {
  const { startOperation, updateOperation, stopOperation } = useAnalysis();
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // Do NOT abort SSE on unmount — let it finish in the background
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const handleCancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setRunning(false);
    setStatus(null);
  }, []);

  const handleRun = useCallback(async () => {
    const { conversation, quantitative, qualitative } = analysis;

    setRunning(true);
    setError(null);
    setStatus('Skanowanie wzorców komunikacji...');
    startOperation('dating', 'Dating Profile', 'Skanowanie wzorców komunikacji...');

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    trackEvent({ name: 'analysis_start', params: { mode: 'standard' } });

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    try {
      const samples = sampleMessages(conversation, quantitative);
      const participants = conversation.participants.map((p) => p.name);
      const quantitativeContext = buildQuantitativeContext(quantitative, conversation.participants);

      // Deep scan — extract confessions, contradictions, obsessions, pet names
      if (mountedRef.current) setStatus('Szukam najciekawszych wątków...');
      updateOperation('dating', { status: 'Szukam najciekawszych wątków...', progress: 15 });
      const deepScan = runDeepScan(conversation, quantitative);
      logger.log('[DatingProfile] Deep scan material:', (deepScan.formattedForPrompt.length / 1024).toFixed(1), 'KB');

      if (mountedRef.current) setStatus('Tworzę szczere profile randkowe...');
      updateOperation('dating', { status: 'Tworzę szczere profile randkowe...', progress: 25 });

      const body: Record<string, unknown> = {
        samples,
        participants,
        quantitativeContext,
        deepScanMaterial: deepScan.formattedForPrompt,
      };

      if (qualitative?.pass1 || qualitative?.pass3) {
        body.existingAnalysis = {
          ...(qualitative.pass1 ? { pass1: qualitative.pass1 } : {}),
          ...(qualitative.pass3 ? { pass3: qualitative.pass3 } : {}),
        };
      }

      const response = await fetch('/api/analyze/dating-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Dating profile failed: ${response.status} ${errorBody}`);
      }

      if (!response.body) throw new Error('No response body');

      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let profileResult: DatingProfileResult | null = null;

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
              result?: DatingProfileResult;
              error?: string;
            };

            if (event.type === 'progress' && event.status) {
              if (mountedRef.current) setStatus(event.status);
              updateOperation('dating', { status: event.status, progress: 50 });
            } else if (event.type === 'complete' && event.result) {
              profileResult = event.result;
            } else if (event.type === 'error') {
              throw new Error(event.error ?? 'Unknown error');
            }
          } catch (parseError) {
            if (parseError instanceof SyntaxError) continue;
            throw parseError;
          }
        }
      }

      if (profileResult) {
        trackEvent({ name: 'analysis_complete', params: { mode: 'standard', passCount: 1 } });
        onComplete(profileResult);
        setStatus(null);
      } else {
        throw new Error('Dating profile completed without results');
      }
    } catch (err) {
      await reader?.cancel();
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (mountedRef.current) setError(err instanceof Error ? err.message : String(err));
    } finally {
      stopOperation('dating');
      if (mountedRef.current) setRunning(false);
      controllerRef.current = null;
    }
  }, [analysis, onComplete, startOperation, updateOperation, stopOperation]);

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRun}
            className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            <Heart className="size-4" />
            Ponów
          </Button>
          <span className="font-mono text-xs text-red-400/80">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 hover:border-border-hover hover:bg-card-hover transition-colors">
      <div className="mb-1">
        <span className="font-mono text-[0.65rem] uppercase tracking-wider text-[#555555]">
          Profil randkowy
        </span>
      </div>
      <h3 className="mb-1 font-mono text-sm font-semibold text-[#fafafa]">
        Szczery Profil Randkowy
      </h3>
      <p className="mb-4 text-xs text-[#555555]">
        Twój profil Tinder na podstawie danych. Nie tego, co myślisz o sobie.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={running ? handleCancel : handleRun}
        className={running
          ? 'gap-2 border-[#A855F7]/30 text-[#A855F7] hover:bg-[#A855F7]/10'
          : 'gap-2 border-[#A855F7]/30 text-[#A855F7] hover:bg-[#A855F7]/10 hover:text-[#A855F7]'
        }
      >
        {running ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            <span className="font-mono text-xs">{status ?? 'Generowanie...'}</span>
            <X className="ml-1 size-3" />
          </>
        ) : (
          <>
            <Heart className="size-4" />
            Generuj profil
          </>
        )}
      </Button>
    </div>
  );
}
