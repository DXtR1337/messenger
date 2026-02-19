'use client';

import { motion } from 'framer-motion';
import { Check, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ProcessingStateProps {
  stage: 'parsing' | 'analyzing' | 'saving' | 'complete';
  progress?: { current: number; total: number };
  error?: string;
}

interface StepDefinition {
  key: 'parsing' | 'analyzing' | 'saving';
  label: string;
  description: string;
}

const STEPS: StepDefinition[] = [
  {
    key: 'parsing',
    label: 'Czytam między wierszami...',
    description: 'Odczytywanie i dekodowanie danych z konwersacji',
  },
  {
    key: 'analyzing',
    label: 'Analizuję konwersację...',
    description: 'Wyliczanie metryk ilościowych',
  },
  {
    key: 'saving',
    label: 'Zapisuję wyniki.',
    description: 'Dane gotowe do przeglądu',
  },
];

const STAGE_ORDER: Record<string, number> = {
  parsing: 0,
  analyzing: 1,
  saving: 2,
  complete: 3,
};

function Spinner() {
  return (
    <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  );
}

function StepIcon({ status }: { status: 'pending' | 'active' | 'complete' }) {
  if (status === 'complete') {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="flex size-5 items-center justify-center rounded-full bg-success"
      >
        <Check className="size-3 text-white" />
      </motion.div>
    );
  }

  if (status === 'active') {
    return <Spinner />;
  }

  return (
    <div className="size-5 rounded-full border-2 border-muted-foreground/30" />
  );
}

export function ProcessingState({ stage, progress, error }: ProcessingStateProps) {
  const currentStageIndex = STAGE_ORDER[stage] ?? 0;

  return (
    <Card className="border-border bg-card">
      <CardContent className="space-y-6">
        {/* Step list */}
        <div className="space-y-0">
          {STEPS.map((step, index) => {
            const isCompleteStage = stage === 'complete';
            let status: 'pending' | 'active' | 'complete';
            if (index < currentStageIndex || isCompleteStage) {
              status = 'complete';
            } else if (index === currentStageIndex) {
              status = 'active';
            } else {
              status = 'pending';
            }

            const isActive = status === 'active';
            const isComplete = status === 'complete';
            const isPending = status === 'pending';
            const isLast = index === STEPS.length - 1;

            return (
              <div key={step.key} className="flex gap-4">
                {/* Timeline column */}
                <div className="flex flex-col items-center">
                  <div className="flex size-8 items-center justify-center">
                    <StepIcon status={status} />
                  </div>
                  {!isLast && (
                    <div
                      className={cn(
                        'w-px flex-1 min-h-[24px]',
                        isComplete ? 'bg-success' : 'bg-muted-foreground/20'
                      )}
                    />
                  )}
                </div>

                {/* Content column */}
                <div className="pb-6 pt-1">
                  <p
                    className={cn(
                      'text-sm font-medium leading-none',
                      isActive && 'text-foreground',
                      isComplete && 'text-muted-foreground',
                      isPending && 'text-muted-foreground/50'
                    )}
                  >
                    {step.label}
                  </p>
                  <p
                    className={cn(
                      'mt-1 text-xs',
                      isActive && 'text-muted-foreground',
                      isComplete && 'text-muted-foreground/60',
                      isPending && 'text-muted-foreground/30'
                    )}
                  >
                    {step.description}
                  </p>

                  {/* Progress indicator for active step */}
                  {isActive && progress && (
                    <div className="mt-2 space-y-1">
                      <div className="h-1 w-48 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          className="h-full rounded-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.round((progress.current / progress.total) * 100)}%`,
                          }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <p className="text-xs font-mono text-muted-foreground/60">
                        {progress.current.toLocaleString()} / {progress.total.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Complete state */}
        {stage === 'complete' && !error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 rounded-md bg-success/10 border border-success/20 px-3 py-2.5 text-xs text-success"
          >
            <Check className="size-4 shrink-0" />
            <span>Gotowe. Wyniki czekają.</span>
          </motion.div>
        )}

        {/* Error state */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-xs text-destructive"
          >
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
