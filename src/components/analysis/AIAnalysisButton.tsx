'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, AlertCircle, Loader2, Flame, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { sampleMessages } from '@/lib/analysis/qualitative';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';
import type { QualitativeAnalysis, RoastResult } from '@/lib/analysis/types';

interface AIAnalysisButtonProps {
  analysisId: string;
  conversation: ParsedConversation;
  quantitative: QuantitativeAnalysis;
  onComplete: (qualitative: QualitativeAnalysis) => void;
  onRoastComplete?: (roast: RoastResult) => void;
  relationshipContext?: string;
}

type AnalysisState = 'idle' | 'running' | 'complete' | 'error';
type RoastState = 'idle' | 'running' | 'complete' | 'error';

const PASS_LABELS = [
  'Analizowanie tonu i typu relacji...',
  'Mapowanie dynamiki relacji...',
  'Budowanie profili osobowości...',
  'Synteza raportu końcowego...',
];

const ROAST_LABELS = [
  'Generowanie roastu...',
];

interface ProgressStep {
  pass: number;
  label: string;
  status: 'pending' | 'running' | 'complete';
}

export default function AIAnalysisButton({
  analysisId,
  conversation,
  quantitative,
  onComplete,
  onRoastComplete,
  relationshipContext,
}: AIAnalysisButtonProps) {
  const [state, setState] = useState<AnalysisState>('idle');
  const [roastState, setRoastState] = useState<RoastState>('idle');
  const [currentPass, setCurrentPass] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [roastError, setRoastError] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [aiConsent, setAiConsent] = useState<boolean>(
    () => typeof window !== 'undefined' && localStorage.getItem('chatscope-ai-consent') === 'true',
  );

  const analysisControllerRef = useRef<AbortController | null>(null);
  const roastControllerRef = useRef<AbortController | null>(null);

  // Abort any in-flight requests when the component unmounts
  useEffect(() => {
    return () => {
      analysisControllerRef.current?.abort();
      roastControllerRef.current?.abort();
    };
  }, []);

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
    setRoastState('idle');
    setRoastError(null);

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
              setCurrentPass(event.pass);
            } else if (event.type === 'complete' && event.result) {
              finalResult = event.result;
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
        setState('complete');
        setCompletedAt(
          new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        );
        onComplete(finalResult);
      } else {
        throw new Error('Analysis completed without results');
      }
    } catch (err) {
      await reader?.cancel();
      // User cancelled — silently reset to idle
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setState('error');
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      analysisControllerRef.current = null;
    }
  }, [analysisId, conversation, quantitative, onComplete, relationshipContext]);

  const handleRunRoast = useCallback(async () => {
    setRoastState('running');
    setRoastError(null);

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
        setRoastState('complete');
        onRoastComplete?.(roastResult);
      } else {
        throw new Error('Roast completed without results');
      }
    } catch (err) {
      await reader?.cancel();
      // User cancelled — silently reset to idle
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setRoastState('error');
      setRoastError(err instanceof Error ? err.message : String(err));
    } finally {
      roastControllerRef.current = null;
    }
  }, [analysisId, conversation, quantitative, onRoastComplete]);

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
              Uzyskaj pogłębione psychologiczne spostrzeżenia, profile osobowości i analizę dynamiki relacji.
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
                      localStorage.setItem('chatscope-ai-consent', 'true');
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
            onClick={handleRunRoast}
            disabled={roastState === 'running' || !aiConsent}
            className={cn(
              'mt-2 gap-2 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-400',
              !aiConsent && 'opacity-50 cursor-not-allowed',
            )}
          >
            {roastState === 'running' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Flame className="size-4" />
            )}
            {roastState === 'running' ? 'Generowanie roastu...' : 'Tryb Roast'}
          </Button>
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
                {state === 'running' && 'Analizowanie rozmowy...'}
                {state === 'complete' && 'Analiza ukończona'}
                {state === 'error' && 'Analiza nie powiodła się'}
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
          <div className="space-y-3">
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
                        'border-red-500/30 bg-red-500/10 text-red-500',
                        step.status === 'running' &&
                        'border-orange-500/30 bg-orange-500/10 text-orange-500',
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
                className="gap-2 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-400"
              >
                <Flame className="size-3.5" />
                Tryb Roast
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
