'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, AlertCircle, Loader2, Flame, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { sampleMessages } from '@/lib/analysis/qualitative';
import { trackEvent } from '@/lib/analytics/events';
import { useAnalysis } from '@/lib/analysis/analysis-context';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';
import type { QualitativeAnalysis, RoastResult } from '@/lib/analysis/types';

export interface AIProgressInfo {
  state: 'idle' | 'running' | 'complete' | 'error';
  currentPass: number;
  roastState: 'idle' | 'running' | 'complete' | 'error';
}

interface AIAnalysisButtonProps {
  analysisId: string;
  conversation: ParsedConversation;
  quantitative: QuantitativeAnalysis;
  onComplete: (qualitative: QualitativeAnalysis) => void;
  onRoastComplete?: (roast: RoastResult) => void;
  onProgressChange?: (progress: AIProgressInfo) => void;
  relationshipContext?: string;
}

type AnalysisState = 'idle' | 'running' | 'complete' | 'error';
type RoastState = 'idle' | 'running' | 'complete' | 'error';

const PASS_LABELS = [
  'Czytam między wierszami...',
  'Mapuję dynamikę konwersacji...',
  'Profiluję osobowości...',
  'Wyciągam wnioski. Przygotuj się.',
];

const ROAST_LABELS = [
  'Prześwietlam wasze profile...',
];

interface ProgressStep {
  pass: number;
  label: string;
  status: 'pending' | 'running' | 'complete';
}

function mapErrorToPolish(raw: string): string {
  if (raw.includes('429')) return 'Zbyt wiele zapytań. Spróbuj za kilka minut.';
  if (raw.includes('500') || raw.includes('503')) return 'Serwer AI jest tymczasowo niedostępny. Spróbuj ponownie.';
  if (raw.includes('413')) return 'Rozmowa jest zbyt długa do analizy.';
  if (raw.includes('timeout') || raw.includes('Timeout')) return 'Przekroczono czas oczekiwania. Spróbuj ponownie.';
  return 'Analiza nie powiodła się. Spróbuj ponownie za chwilę.';
}

export default function AIAnalysisButton({
  analysisId,
  conversation,
  quantitative,
  onComplete,
  onRoastComplete,
  onProgressChange,
  relationshipContext,
}: AIAnalysisButtonProps) {
  const { startOperation, updateOperation, stopOperation } = useAnalysis();
  const [state, setState] = useState<AnalysisState>('idle');
  const [roastState, setRoastState] = useState<RoastState>('idle');
  const [currentPass, setCurrentPass] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [roastError, setRoastError] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [showRoastWarning, setShowRoastWarning] = useState(false);
  const [aiConsent, setAiConsent] = useState<boolean>(
    () => typeof window !== 'undefined' && localStorage.getItem('podtekst-ai-consent') === 'true',
  );
  const [varianceDismissed, setVarianceDismissed] = useState<boolean>(
    () => typeof window !== 'undefined' && localStorage.getItem('podtekst-ai-variance-dismissed') === 'true',
  );

  const analysisControllerRef = useRef<AbortController | null>(null);
  const roastControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // Report progress to parent so it can show floating indicator across tabs
  useEffect(() => {
    onProgressChange?.({ state, currentPass, roastState });
  }, [state, currentPass, roastState, onProgressChange]);

  // Track mount state — do NOT abort requests on unmount so analysis continues
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Warn user before leaving page while analysis is running
  useEffect(() => {
    if (state !== 'running') return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state]);

  const handleCancel = useCallback(() => {
    analysisControllerRef.current?.abort();
    analysisControllerRef.current = null;
    setState('idle');
    setCurrentPass(0);
  }, []);

  const handleCancelRoast = useCallback(() => {
    roastControllerRef.current?.abort();
    roastControllerRef.current = null;
    setRoastState('idle');
  }, []);

  const steps: ProgressStep[] = PASS_LABELS.map((label, index) => ({
    pass: index + 1,
    label,
    status:
      state !== 'running'
        ? 'pending'
        : index + 1 < currentPass
          ? 'complete'
          : index + 1 === currentPass
            ? 'running'
            : 'pending',
  }));

  const roastSteps: ProgressStep[] = ROAST_LABELS.map((label, index) => ({
    pass: index + 1,
    label,
    status:
      roastState === 'complete'
        ? 'complete'
        : roastState === 'running'
          ? 'running'
          : 'pending',
  }));

  const handleRun = useCallback(async () => {
    setState('running');
    setCurrentPass(1);
    setError(null);
    startOperation('ai-analysis', 'AI Deep Dive', PASS_LABELS[0]);
    trackEvent({ name: 'analysis_start', params: { mode: 'standard' } });

    // Create AbortController for this analysis request
    analysisControllerRef.current?.abort();
    const controller = new AbortController();
    analysisControllerRef.current = controller;

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    try {
      const samples = sampleMessages(conversation, quantitative);
      const participants = conversation.participants.map((p) => p.name);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId,
          samples,
          participants,
          relationshipContext,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Analysis failed: ${response.status} ${errorBody}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult: QualitativeAnalysis | null = null;

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
              pass?: number;
              status?: string;
              result?: QualitativeAnalysis;
              error?: string;
            };

            if (event.type === 'progress' && event.pass) {
              if (mountedRef.current) setCurrentPass(event.pass);
              updateOperation('ai-analysis', {
                progress: event.pass * 20,
                status: PASS_LABELS[event.pass - 1] ?? `Pass ${event.pass}...`,
              });
            } else if (event.type === 'complete' && event.result) {
              finalResult = event.result;
              // Debug: log pass3 completeness
              const p3 = event.result.pass3;
              if (p3) {
                const p3Names = Object.keys(p3);
                console.log('[AI Debug] pass3 participants:', p3Names);
                for (const n of p3Names) {
                  const pf = p3[n];
                  console.log(`[AI Debug] ${n}:`, {
                    hasAttachment: !!pf?.attachment_indicators?.primary_style,
                    attachmentStyle: pf?.attachment_indicators?.primary_style,
                    hasBigFive: !!pf?.big_five_approximation,
                    hasMBTI: !!pf?.mbti?.type,
                    hasLoveLang: !!pf?.love_language,
                    keys: pf ? Object.keys(pf) : [],
                  });
                }
              } else {
                console.warn('[AI Debug] pass3 is empty/undefined in result!');
              }
            } else if (event.type === 'error') {
              throw new Error(event.error ?? 'Unknown analysis error');
            }
          } catch (parseError) {
            // Skip malformed JSON lines in the SSE stream
            if (parseError instanceof SyntaxError) continue;
            throw parseError;
          }
        }
      }

      if (finalResult) {
        if (mountedRef.current) {
          setState('complete');
          setCompletedAt(
            new Date().toLocaleTimeString('pl-PL', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          );
        }
        trackEvent({ name: 'analysis_complete', params: { mode: 'standard', passCount: 4 } });
        onComplete(finalResult);
      } else {
        throw new Error('Analysis completed without results');
      }
    } catch (err) {
      await reader?.cancel();
      // User cancelled — silently reset to idle
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (mountedRef.current) {
        setState('error');
        const rawMsg = err instanceof Error ? err.message : String(err);
        setError(mapErrorToPolish(rawMsg));
      }
    } finally {
      stopOperation('ai-analysis');
      analysisControllerRef.current = null;
    }
  }, [analysisId, conversation, quantitative, onComplete, relationshipContext, startOperation, updateOperation, stopOperation]);

  const handleRunRoast = useCallback(async () => {
    setRoastState('running');
    setRoastError(null);
    startOperation('ai-roast', 'Roast', 'Prześwietlam wasze profile...');
    trackEvent({ name: 'analysis_start', params: { mode: 'roast' } });

    // Create AbortController for this roast request
    roastControllerRef.current?.abort();
    const roastController = new AbortController();
    roastControllerRef.current = roastController;

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    try {
      const samples = sampleMessages(conversation, quantitative);
      const participants = conversation.participants.map((p) => p.name);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId,
          samples,
          participants,
          mode: 'roast',
          quantitativeContext: samples.quantitativeContext,
        }),
        signal: roastController.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Roast failed: ${response.status} ${errorBody}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let roastResult: RoastResult | null = null;

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
              pass?: number;
              status?: string;
              result?: RoastResult;
              error?: string;
            };

            if (event.type === 'roast_complete' && event.result) {
              roastResult = event.result;
            } else if (event.type === 'error') {
              throw new Error(event.error ?? 'Unknown roast error');
            }
          } catch (parseError) {
            if (parseError instanceof SyntaxError) continue;
            throw parseError;
          }
        }
      }

      if (roastResult) {
        if (mountedRef.current) setRoastState('complete');
        trackEvent({ name: 'analysis_complete', params: { mode: 'roast', passCount: 1 } });
        onRoastComplete?.(roastResult);
      } else {
        throw new Error('Roast completed without results');
      }
    } catch (err) {
      await reader?.cancel();
      // User cancelled — silently reset to idle
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (mountedRef.current) {
        setRoastState('error');
        const rawMsg = err instanceof Error ? err.message : String(err);
        setRoastError(mapErrorToPolish(rawMsg));
      }
    } finally {
      stopOperation('ai-roast');
      roastControllerRef.current = null;
    }
  }, [analysisId, conversation, quantitative, onRoastComplete, startOperation, stopOperation]);

  if (state === 'idle') {
    return (
      <Card className="border-border/50 border-dashed">
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="size-8 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">Analiza AI</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Profile osobowości, dynamika konwersacji, styl przywiązania. Dane czekają na interpretację.
            </p>
          </div>
          {!aiConsent && (
            <div className="rounded-lg border border-border bg-card/50 p-4 text-xs">
              <p className="text-muted-foreground leading-relaxed">
                Próbka wiadomości (~2%) zostanie wysłana do Google Gemini AI w celu analizy psychologicznej.
                Dane nie są przechowywane po przetworzeniu i nie są udostępniane podmiotom trzecim.
              </p>
              <label className="mt-3 flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={aiConsent}
                  onChange={(e) => {
                    setAiConsent(e.target.checked);
                    if (e.target.checked) {
                      localStorage.setItem('podtekst-ai-consent', 'true');
                    }
                  }}
                  className="size-4 rounded border-border accent-primary"
                />
                <span className="text-foreground">Rozumiem i wyrażam zgodę na przetwarzanie danych przez AI</span>
              </label>
            </div>
          )}
          <Button
            size="lg"
            onClick={handleRun}
            disabled={!aiConsent}
            className={cn('mt-2 gap-2', !aiConsent && 'opacity-50 cursor-not-allowed')}
          >
            <Sparkles className="size-4" />
            Uruchom analizę AI
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => setShowRoastWarning(true)}
            disabled={roastState === 'running' || !aiConsent}
            className={cn(
              'mt-2 gap-2 border-fuchsia-500/30 text-fuchsia-400 hover:bg-fuchsia-500/10 hover:text-fuchsia-300',
              !aiConsent && 'opacity-50 cursor-not-allowed',
            )}
          >
            {roastState === 'running' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Flame className="size-4" />
            )}
            {roastState === 'running' ? 'Prześwietlam wasze profile...' : 'Tryb Roast'}
          </Button>
          {showRoastWarning && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-md rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/[0.06] p-4 text-sm"
            >
              <p className="font-medium text-fuchsia-300">Najpierw analiza, potem roast</p>
              <p className="mt-1 text-xs text-fuchsia-300/70">
                Roast jest trafniejszy po pełnej analizie AI. Zalecamy najpierw uruchomić analizę jakościową.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setShowRoastWarning(false);
                    handleRun();
                  }}
                  disabled={!aiConsent}
                  className="gap-1.5"
                >
                  <Sparkles className="size-3.5" />
                  Uruchom analizę AI
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowRoastWarning(false);
                    handleRunRoast();
                  }}
                  className="gap-1.5 border-fuchsia-500/30 text-fuchsia-400 hover:bg-fuchsia-500/10"
                >
                  <Flame className="size-3.5" />
                  Roast i tak
                </Button>
              </div>
            </motion.div>
          )}
          {roastState === 'error' && roastError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {roastError}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardContent className="py-8">
        <div className="mx-auto max-w-md space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            {state === 'running' && (
              <Loader2 className="size-5 animate-spin text-primary" />
            )}
            {state === 'complete' && (
              <div className="flex size-6 items-center justify-center rounded-full bg-success/20">
                <Check className="size-3.5 text-success" />
              </div>
            )}
            {state === 'error' && (
              <div className="flex size-6 items-center justify-center rounded-full bg-destructive/20">
                <AlertCircle className="size-3.5 text-destructive" />
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-sm font-semibold">
                {state === 'running' && 'Czytam między wierszami...'}
                {state === 'complete' && 'Analiza ukończona'}
                {state === 'error' && 'Nawet AI potrzebuje przerwy'}
              </h3>
              {state === 'complete' && completedAt && (
                <p className="text-xs text-muted-foreground">Ukończono o {completedAt}</p>
              )}
            </div>
            {state === 'running' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
              >
                <X className="size-3.5" />
                Anuluj
              </Button>
            )}
          </div>

          {/* Progress steps */}
          <div className="space-y-3" aria-live="polite">
            <AnimatePresence>
              {steps.map((step) => (
                <motion.div
                  key={step.pass}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-3"
                >
                  {/* Step indicator */}
                  <div
                    className={cn(
                      'flex size-7 items-center justify-center rounded-full border text-xs font-mono font-medium transition-all',
                      step.status === 'complete' &&
                      'border-success/30 bg-success/10 text-success',
                      step.status === 'running' &&
                      'border-primary/30 bg-primary/10 text-primary',
                      step.status === 'pending' &&
                      'border-border bg-secondary text-muted-foreground',
                    )}
                  >
                    {step.status === 'complete' ? (
                      <Check className="size-3.5" />
                    ) : step.status === 'running' ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      step.pass
                    )}
                  </div>

                  {/* Step label */}
                  <span
                    className={cn(
                      'text-sm transition-colors',
                      step.status === 'complete' && 'text-muted-foreground',
                      step.status === 'running' && 'font-medium text-foreground',
                      step.status === 'pending' && 'text-muted-foreground/50',
                    )}
                  >
                    {step.label}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Roast progress — shown during or after roast */}
          {roastState !== 'idle' && (
            <div className="space-y-3 border-t border-border pt-4">
              {roastState === 'running' && (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelRoast}
                    className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-3.5" />
                    Anuluj roast
                  </Button>
                </div>
              )}
              <AnimatePresence>
                {roastSteps.map((step) => (
                  <motion.div
                    key={`roast-${step.pass}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-3"
                  >
                    <div
                      className={cn(
                        'flex size-7 items-center justify-center rounded-full border text-xs font-mono font-medium transition-all',
                        step.status === 'complete' &&
                        'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-400',
                        step.status === 'running' &&
                        'border-purple-500/30 bg-purple-500/10 text-purple-300',
                        step.status === 'pending' &&
                        'border-border bg-secondary text-muted-foreground',
                      )}
                    >
                      {step.status === 'complete' ? (
                        <Flame className="size-3.5" />
                      ) : step.status === 'running' ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Flame className="size-3.5" />
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-sm transition-colors',
                        step.status === 'complete' && 'text-muted-foreground',
                        step.status === 'running' && 'font-medium text-foreground',
                        step.status === 'pending' && 'text-muted-foreground/50',
                      )}
                    >
                      {step.label}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Error state */}
          {state === 'error' && error && (
            <div className="space-y-3">
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
              <Button variant="outline" size="sm" onClick={handleRun} className="gap-2">
                <Sparkles className="size-3.5" />
                Ponów analizę
              </Button>
            </div>
          )}

          {roastState === 'error' && roastError && (
            <div className="space-y-3">
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {roastError}
              </p>
              <Button variant="outline" size="sm" onClick={handleRunRoast} className="gap-2">
                <Flame className="size-3.5" />
                Ponów roast
              </Button>
            </div>
          )}

          {/* Roast button when analysis is running/complete but roast hasn't run yet */}
          {(state === 'complete' || state === 'running') && roastState === 'idle' && (
            <div className="border-t border-border pt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRunRoast}
                className="gap-2 border-fuchsia-500/30 text-fuchsia-400 hover:bg-fuchsia-500/10 hover:text-fuchsia-300"
              >
                <Flame className="size-3.5" />
                Tryb Roast
              </Button>
            </div>
          )}

          {/* AI variance info banner — shown once after completion, dismissible */}
          {state === 'complete' && !varianceDismissed && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-start gap-2.5 rounded-lg border border-blue-500/20 bg-blue-500/[0.06] px-4 py-3"
            >
              <Info className="size-4 shrink-0 text-blue-400 mt-0.5" />
              <p className="flex-1 text-xs text-blue-300/80 leading-relaxed">
                Wyniki AI mogą się nieznacznie różnić przy każdym uruchomieniu. Metryki ilościowe są zawsze identyczne.
              </p>
              <button
                onClick={() => {
                  setVarianceDismissed(true);
                  localStorage.setItem('podtekst-ai-variance-dismissed', 'true');
                }}
                className="shrink-0 rounded p-0.5 text-blue-400/60 hover:text-blue-300 transition-colors"
                aria-label="Zamknij"
              >
                <X className="size-3.5" />
              </button>
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
