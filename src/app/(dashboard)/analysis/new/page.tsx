'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { DropZone } from '@/components/upload/DropZone';
import { ProcessingState } from '@/components/upload/ProcessingState';
import { Button } from '@/components/ui/button';
import { parseMessengerJSON, mergeMessengerFiles } from '@/lib/parsers/messenger';
import { computeQuantitativeAnalysis } from '@/lib/analysis/quantitative';
import { saveAnalysis, generateId } from '@/lib/utils';
import type { StoredAnalysis } from '@/lib/analysis/types';

type Stage = 'idle' | 'parsing' | 'analyzing' | 'saving' | 'complete';

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error(`Failed to read file "${file.name}" as text.`));
      }
    };
    reader.onerror = () => {
      reject(new Error(`Error reading file "${file.name}": ${reader.error?.message ?? 'unknown error'}`));
    };
    reader.readAsText(file);
  });
}

export default function NewAnalysisPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | undefined>(undefined);
  const [progress, setProgress] = useState<{ current: number; total: number } | undefined>(undefined);

  const handleFilesSelected = useCallback((selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setError(undefined);
    setStage('idle');
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (files.length === 0) return;

    setError(undefined);
    setStage('parsing');
    setProgress(undefined);

    try {
      // Stage 1: Read and parse files
      setProgress({ current: 0, total: files.length });
      const jsonDataArray: unknown[] = [];

      for (let i = 0; i < files.length; i++) {
        const text = await readFileAsText(files[i]);
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new Error(
            `"${files[i].name}" is not valid JSON. Make sure you're uploading a Facebook Messenger export file.`
          );
        }
        jsonDataArray.push(parsed);
        setProgress({ current: i + 1, total: files.length });
      }

      // Parse into unified conversation format
      const conversation =
        jsonDataArray.length === 1
          ? parseMessengerJSON(jsonDataArray[0])
          : mergeMessengerFiles(jsonDataArray);

      // Validate minimum message count
      if (conversation.metadata.totalMessages < 100) {
        throw new Error(
          `This conversation has only ${conversation.metadata.totalMessages} messages. A minimum of 100 messages is required for meaningful analysis.`
        );
      }

      // Stage 2: Compute quantitative analysis
      setStage('analyzing');
      setProgress(undefined);

      // Yield to the event loop so the UI can update before heavy computation
      await new Promise((resolve) => setTimeout(resolve, 50));

      const quantitative = computeQuantitativeAnalysis(conversation);

      // Stage 3: Save results
      setStage('saving');

      const id = generateId();
      const analysis: StoredAnalysis = {
        id,
        title: conversation.title,
        createdAt: Date.now(),
        conversation,
        quantitative,
      };

      await saveAnalysis(analysis);

      // Stage 4: Complete and redirect
      setStage('complete');

      // Brief pause to show the completion state before navigating
      await new Promise((resolve) => setTimeout(resolve, 600));

      router.push(`/analysis/${id}`);
    } catch (thrown: unknown) {
      const message =
        thrown instanceof Error
          ? thrown.message
          : 'An unexpected error occurred during analysis.';
      setError(message);
    }
  }, [files, router]);

  const handleRetry = useCallback(() => {
    setError(undefined);
    setStage('idle');
    setProgress(undefined);
  }, []);

  const isProcessing = stage !== 'idle';
  const showProcessingState = stage !== 'idle';
  const processingStage = stage === 'idle' ? 'parsing' : stage;

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 py-12">
      {/* Header */}
      <div className="mb-8 space-y-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          New Analysis
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload your Messenger conversation export
        </p>
      </div>

      {/* Upload section */}
      <div className="space-y-6">
        <DropZone
          onFilesSelected={handleFilesSelected}
          disabled={isProcessing}
        />

        {/* Analyze button */}
        {files.length > 0 && !isProcessing && (
          <div className="flex justify-end">
            <Button
              onClick={handleAnalyze}
              size="lg"
              className="gap-2"
            >
              Analyze
              <ArrowRight className="size-4" />
            </Button>
          </div>
        )}

        {/* Processing state */}
        {showProcessingState && (
          <ProcessingState
            stage={processingStage}
            progress={progress}
            error={error}
          />
        )}

        {/* Retry button on error */}
        {error && (
          <div className="flex justify-end">
            <Button
              onClick={handleRetry}
              variant="outline"
              size="default"
              className="gap-2"
            >
              <RotateCcw className="size-4" />
              Try Again
            </Button>
          </div>
        )}
      </div>

      {/* Privacy notice */}
      <div className="mt-10 rounded-md border border-border bg-card/50 px-4 py-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Your messages are processed locally in your browser for quantitative analysis and are not
          stored on any server. Only aggregated insights are saved to your local storage.
        </p>
      </div>
    </div>
  );
}
