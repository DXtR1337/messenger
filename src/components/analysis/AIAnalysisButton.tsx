'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { sampleMessages } from '@/lib/analysis/qualitative';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';
import type { QualitativeAnalysis } from '@/lib/analysis/types';

interface AIAnalysisButtonProps {
  analysisId: string;
  conversation: ParsedConversation;
  quantitative: QuantitativeAnalysis;
  onComplete: (qualitative: QualitativeAnalysis) => void;
}

type AnalysisState = 'idle' | 'running' | 'complete' | 'error';

const PASS_LABELS = [
  'Analyzing tone & relationship type...',
  'Mapping relationship dynamics...',
  'Building personality profiles...',
  'Synthesizing final report...',
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
}: AIAnalysisButtonProps) {
  const [state, setState] = useState<AnalysisState>('idle');
  const [currentPass, setCurrentPass] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);

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

  const handleRun = useCallback(async () => {
    setState('running');
    setCurrentPass(1);
    setError(null);

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
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Analysis failed: ${response.status} ${errorBody}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      const reader = response.body.getReader();
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
      setState('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [analysisId, conversation, quantitative, onComplete]);

  if (state === 'idle') {
    return (
      <Card className="border-border/50 border-dashed">
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="size-8 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">AI-Powered Analysis</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Get deep psychological insights, personality profiles, and relationship dynamics
              analysis powered by Gemini.
            </p>
          </div>
          <Button size="lg" onClick={handleRun} className="mt-2 gap-2">
            <Sparkles className="size-4" />
            Run AI Analysis
          </Button>
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
            <div>
              <h3 className="text-sm font-semibold">
                {state === 'running' && 'Analyzing conversation...'}
                {state === 'complete' && 'Analysis Complete'}
                {state === 'error' && 'Analysis Failed'}
              </h3>
              {state === 'complete' && completedAt && (
                <p className="text-xs text-muted-foreground">Completed at {completedAt}</p>
              )}
            </div>
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

          {/* Error state */}
          {state === 'error' && error && (
            <div className="space-y-3">
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
              <Button variant="outline" size="sm" onClick={handleRun} className="gap-2">
                <Sparkles className="size-3.5" />
                Retry Analysis
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
