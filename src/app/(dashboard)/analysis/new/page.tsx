'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, RotateCcw, ChevronDown } from 'lucide-react';
import { DropZone } from '@/components/upload/DropZone';
import { ProcessingState } from '@/components/upload/ProcessingState';
import { Button } from '@/components/ui/button';
import { parseMessengerJSON, mergeMessengerFiles } from '@/lib/parsers/messenger';
import { parseWhatsAppText } from '@/lib/parsers/whatsapp';
import { computeQuantitativeAnalysis } from '@/lib/analysis/quantitative';
import { saveAnalysis, generateId } from '@/lib/utils';
import type { StoredAnalysis, RelationshipContext } from '@/lib/analysis/types';

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

const RELATIONSHIP_OPTIONS: { value: RelationshipContext; emoji: string; label: string }[] = [
  { value: 'romantic', emoji: '\u{1F495}', label: 'Związek' },
  { value: 'friendship', emoji: '\u{1F46B}', label: 'Przyjaźń' },
  { value: 'colleague', emoji: '\u{1F4BC}', label: 'Kolega' },
  { value: 'professional', emoji: '\u{1F3E2}', label: 'Praca' },
  { value: 'family', emoji: '\u{1F468}\u200D\u{1F469}\u200D\u{1F466}', label: 'Rodzina' },
  { value: 'other', emoji: '\u2753', label: 'Inne' },
];

export default function NewAnalysisPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [relationshipType, setRelationshipType] = useState<RelationshipContext | null>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | undefined>(undefined);
  const [progress, setProgress] = useState<{ current: number; total: number } | undefined>(undefined);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);

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

      // Detect file type
      const isWhatsApp = files.some(f => f.name.endsWith('.txt'));
      const isMessenger = files.some(f => f.name.endsWith('.json'));

      if (isWhatsApp && isMessenger) {
        throw new Error('Nie można mieszać plików Messengera (.json) i WhatsAppa (.txt). Wybierz jeden format.');
      }

      let conversation: import('@/lib/parsers/types').ParsedConversation;

      if (isWhatsApp) {
        // WhatsApp: read all .txt files and concatenate
        let fullText = '';
        for (let i = 0; i < files.length; i++) {
          const text = await readFileAsText(files[i]);
          fullText += (fullText ? '\n' : '') + text;
          setProgress({ current: i + 1, total: files.length });
        }
        conversation = parseWhatsAppText(fullText);
      } else {
        // Messenger: existing JSON parsing logic
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
        conversation =
          jsonDataArray.length === 1
            ? parseMessengerJSON(jsonDataArray[0])
            : mergeMessengerFiles(jsonDataArray);
      }

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
        relationshipContext: relationshipType ?? undefined,
        conversation,
        quantitative,
      };

      await saveAnalysis(analysis);

      // Stage 4: Complete and redirect
      setStage('complete');

      // Brief pause to show the completion state before navigating
      await new Promise((resolve) => setTimeout(resolve, 600));

      sessionStorage.setItem('chatscope-celebrate-' + id, '1');
      router.push(`/analysis/${id}`);
    } catch (thrown: unknown) {
      const message =
        thrown instanceof Error
          ? thrown.message
          : 'An unexpected error occurred during analysis.';
      setError(message);
    }
  }, [files, relationshipType, router]);

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
          Nowa analiza
        </h1>
        <p className="text-sm text-muted-foreground">
          Wgraj eksport rozmowy z Messengera lub WhatsAppa
        </p>
      </div>

      {/* Upload section */}
      <div className="space-y-6">
        <DropZone
          onFilesSelected={handleFilesSelected}
          disabled={isProcessing}
        />

        {/* Relationship type selector */}
        {files.length > 0 && !isProcessing && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">
              Typ relacji <span className="text-text-muted">(opcjonalne)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {RELATIONSHIP_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRelationshipType(relationshipType === opt.value ? null : opt.value)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    relationshipType === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-border-hover hover:text-foreground'
                  }`}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Analyze button */}
        {files.length > 0 && !isProcessing && (
          <div className="flex justify-end">
            <Button
              onClick={handleAnalyze}
              size="lg"
              className="gap-2"
            >
              Analizuj
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
              Spróbuj ponownie
            </Button>
          </div>
        )}
      </div>

      {/* Privacy notice */}
      <div className="mt-10 rounded-md border border-border bg-card/50 px-4 py-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Twoje wiadomości są przetwarzane lokalnie w przeglądarce. Żadne dane nie trafiają na serwer. Tylko zagregowane wyniki zapisywane są w pamięci lokalnej.
        </p>
      </div>

      {/* Export instructions */}
      <div className="mt-3 rounded-md border border-border bg-card/50 px-4 py-3">
        <div
          className="flex cursor-pointer items-center justify-between"
          onClick={() => setShowInstructions((prev) => !prev)}
        >
          <span className="text-xs font-medium text-muted-foreground">
            Jak wyeksportować rozmowę?
          </span>
          <ChevronDown
            className="size-4 text-muted-foreground transition-transform duration-200"
            style={{ transform: showInstructions ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </div>
        {showInstructions && (
          <div>
            <p className="mt-3 mb-2 text-xs font-medium text-foreground/80">Messenger:</p>
            <ol className="list-decimal pl-5 text-xs leading-relaxed text-muted-foreground">
              <li>
                Otwórz Facebooka i przejdź do{' '}
                <strong className="text-foreground/80">Ustawienia i prywatność → Ustawienia</strong>
              </li>
              <li>
                Kliknij{' '}
                <strong className="text-foreground/80">Twoje informacje</strong> →{' '}
                <strong className="text-foreground/80">Pobierz swoje informacje</strong>
              </li>
              <li>
                Zaznacz tylko{' '}
                <strong className="text-foreground/80">Wiadomości</strong> i wybierz format{' '}
                <strong className="text-foreground/80">JSON</strong>
              </li>
              <li>
                Kliknij{' '}
                <strong className="text-foreground/80">Utwórz plik</strong> i poczekaj na powiadomienie
              </li>
              <li>
                Pobierz archiwum i rozpakuj — pliki JSON znajdziesz w folderze{' '}
                <code className="rounded bg-card px-1 py-0.5 font-mono text-foreground/80">
                  messages/inbox/[nazwa_rozmowy]/
                </code>
              </li>
            </ol>
            <div className="mt-3 border-t border-border pt-3">
              <p className="mb-2 text-xs font-medium text-foreground/80">WhatsApp:</p>
              <ol className="list-decimal pl-5 text-xs leading-relaxed text-muted-foreground">
                <li>Otwórz rozmowę w WhatsAppie</li>
                <li>Kliknij <strong className="text-foreground/80">&#x22EE;</strong> → <strong className="text-foreground/80">Więcej</strong> → <strong className="text-foreground/80">Eksportuj czat</strong></li>
                <li>Wybierz <strong className="text-foreground/80">Bez multimediów</strong></li>
                <li>Zapisz plik .txt i wgraj go tutaj</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
