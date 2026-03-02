'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Heart, Loader2, X, User } from 'lucide-react';
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
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const participants = analysis.conversation.participants.map((p) => p.name);

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

  const isGroup = participants.length > 2;

  const handleRun = useCallback(async (targetPerson?: string) => {
    const { conversation, quantitative, qualitative } = analysis;
    const label = targetPerson ?? participants.join(' & ');

    setRunning(true);
    setError(null);
    setStatus(`Przeszukuję dane ${label}...`);
    startOperation('dating', 'Dating Profile', `Przeszukuję dane ${label}...`);

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    trackEvent({ name: 'analysis_start', params: { mode: 'standard' } });

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    try {
      const samples = sampleMessages(conversation, quantitative);
      const allParticipants = conversation.participants.map((p) => p.name);
      const quantitativeContext = buildQuantitativeContext(quantitative, conversation.participants);

      // Deep scan — extract confessions, contradictions, obsessions, pet names
      if (mountedRef.current) setStatus(`Kopiemy w brudach ${label}...`);
      updateOperation('dating', { status: `Kopiemy w brudach ${label}...`, progress: 15 });
      const deepScan = runDeepScan(conversation, quantitative);
      logger.log('[DatingProfile] Deep scan material:', (deepScan.formattedForPrompt.length / 1024).toFixed(1), 'KB');

      // For targeted mode — build expanded dossier focused on target person
      let deepScanMaterial = deepScan.formattedForPrompt;
      const targetDossier = targetPerson ? deepScan.perPerson[targetPerson] : null;
      if (targetPerson && targetDossier) {
        const sections: string[] = [`=== PEŁNE DOSSIER: ${targetPerson} ===`];

        if (targetDossier.confessions.length > 0) {
          sections.push('\nWYZNANIA (najdłuższe wiadomości — pełny materiał):');
          for (const c of targetDossier.confessions.slice(0, 10)) {
            sections.push(`  [${new Date(c.timestamp).toLocaleString('pl-PL')}] "${c.content}" (${c.wordCount} słów, ${c.reason})`);
          }
        }
        if (targetDossier.embarrassingQuotes.length > 0) {
          sections.push('\nŻENUJĄCE CYTATY (pełny materiał):');
          for (const q of targetDossier.embarrassingQuotes.slice(0, 15)) {
            sections.push(`  [${new Date(q.timestamp).toLocaleString('pl-PL')}] "${q.content}" — ${q.reason}`);
          }
        }
        if (targetDossier.contradictions.length > 0) {
          sections.push('\nSPRZECZNOŚCI (powiedziane vs zrobione):');
          for (const c of targetDossier.contradictions) {
            sections.push(`  ${c.label}: "${c.assertion}" ${c.counterEvidence}`);
          }
        }
        if (targetDossier.topicObsessions.length > 0) {
          sections.push('\nOBSESJE TEMATYCZNE:');
          for (const t of targetDossier.topicObsessions) {
            sections.push(`  "${t.topic}" — ${t.count}x, przykłady: ${t.examples.map(e => `"${e}"`).join(', ')}`);
          }
        }
        if (targetDossier.petNames.length > 0) {
          sections.push(`\nKSYWKI UŻYWANE PRZEZ ${targetPerson}: ${targetDossier.petNames.join(', ')}`);
        }
        const pm = targetDossier.powerMoves;
        if (pm.leftOnReadCount > 0 || pm.apologizesFirstCount > 0 || pm.doubleTextChains > 0) {
          sections.push('\nPOWER MOVES:');
          if (pm.leftOnReadCount > 0) sections.push(`  Left-on-read: ${pm.leftOnReadCount}x${pm.leftOnReadWorst ? ` (rekord: ${pm.leftOnReadWorst.gapHours}h, potem: "${pm.leftOnReadWorst.followUp}")` : ''}`);
          if (pm.apologizesFirstCount > 0) sections.push(`  Przeprasza pierwszy/a: ${pm.apologizesFirstCount}x`);
          if (pm.doubleTextChains > 0) sections.push(`  Double-text chains (3+): ${pm.doubleTextChains}x${pm.worstDoubleText ? ` (rekord: ${pm.worstDoubleText.count} z rzędu, ostatni: "${pm.worstDoubleText.snippet}")` : ''}`);
        }

        // Add threads featuring the target
        if (deepScan.interestingThreads.length > 0) {
          const targetThreads = deepScan.interestingThreads.filter(t => t.messages.some(m => m.sender === targetPerson));
          if (targetThreads.length > 0) {
            sections.push('\nCIEKAWE WĄTKI Z UDZIAŁEM CELU:');
            for (const thread of targetThreads.slice(0, 4)) {
              sections.push(`  [Wątek: "${thread.topic}"]`);
              for (const m of thread.messages.slice(0, 8)) {
                const time = new Date(m.timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
                sections.push(`    [${time}] ${m.sender}: "${m.content}"`);
              }
            }
          }
        }

        deepScanMaterial = sections.join('\n');
        logger.log('[DatingProfile] Targeted dossier:', (deepScanMaterial.length / 1024).toFixed(1), 'KB');
      }

      if (mountedRef.current) setStatus(`Budowanie profilu ${label}...`);
      updateOperation('dating', { status: `Budowanie profilu ${label}...`, progress: 25 });

      const body: Record<string, unknown> = {
        samples,
        participants: allParticipants,
        quantitativeContext,
        deepScanMaterial,
        ...(targetPerson ? { targetPerson } : {}),
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
  }, [analysis, participants, onComplete, startOperation, updateOperation, stopOperation]);

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => isGroup ? (selectedPerson && handleRun(selectedPerson)) : handleRun()}
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
        {isGroup
          ? 'Wybierz osobę i zobacz jej profil Tinder na podstawie danych. Nie tego, co myśli o sobie.'
          : 'Profile Tinder obu osób na podstawie danych. Nie tego, co myślą o sobie.'}
      </p>

      {/* Person selector — only for groups (3+ people) */}
      {isGroup && !running && (
        <div className="mb-3 flex flex-wrap gap-2">
          {participants.map((name) => (
            <button
              key={name}
              onClick={() => setSelectedPerson(name)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-xs font-medium tracking-wide transition-all ${
                selectedPerson === name
                  ? 'bg-[#A855F7]/15 text-[#A855F7] border border-[#A855F7]/40'
                  : 'bg-white/[0.03] text-zinc-400 border border-white/[0.06] hover:text-[#999] hover:bg-white/[0.06]'
              }`}
            >
              <User className="size-3" />
              {name}
            </button>
          ))}
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={running ? handleCancel : () => isGroup ? (selectedPerson && handleRun(selectedPerson)) : handleRun()}
        disabled={!running && isGroup && !selectedPerson}
        className={running
          ? 'gap-2 border-[#A855F7]/30 text-[#A855F7] hover:bg-[#A855F7]/10'
          : (!isGroup || selectedPerson)
            ? 'gap-2 border-[#A855F7]/30 text-[#A855F7] hover:bg-[#A855F7]/10 hover:text-[#A855F7]'
            : 'gap-2 border-white/10 text-zinc-600 cursor-not-allowed'
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
            {isGroup
              ? (selectedPerson ? `Generuj profil: ${selectedPerson}` : 'Wybierz osobę')
              : 'Generuj profile'}
          </>
        )}
      </Button>
    </div>
  );
}
