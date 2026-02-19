'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, RotateCcw, ChevronDown } from 'lucide-react';
import { DropZone } from '@/components/upload/DropZone';
import { ProcessingState } from '@/components/upload/ProcessingState';
import { Button } from '@/components/ui/button';
import { parseMessengerJSON, mergeMessengerFiles } from '@/lib/parsers/messenger';
import { parseWhatsAppText } from '@/lib/parsers/whatsapp';
// Instagram parser available — same Meta format as Messenger, auto-detected
// import { parseInstagramJSON, mergeInstagramFiles } from '@/lib/parsers/instagram';
import { parseTelegramJSON } from '@/lib/parsers/telegram';
import { detectFormat } from '@/lib/parsers/detect';
import { computeQuantitativeAnalysis } from '@/lib/analysis/quantitative';
import { saveAnalysis, generateId } from '@/lib/utils';
import type { StoredAnalysis, RelationshipContext } from '@/lib/analysis/types';
import { trackEvent } from '@/lib/analytics/events';

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

      // Detect file type from first file
      const hasTxt = files.some(f => f.name.endsWith('.txt'));
      const hasJson = files.some(f => f.name.endsWith('.json'));

      if (hasTxt && hasJson) {
        throw new Error('Nie można mieszać plików JSON i TXT. Wybierz jeden format.');
      }

      let conversation: import('@/lib/parsers/types').ParsedConversation;

      if (hasTxt) {
        // WhatsApp: read all .txt files and concatenate
        let fullText = '';
        for (let i = 0; i < files.length; i++) {
          const text = await readFileAsText(files[i]);
          fullText += (fullText ? '\n' : '') + text;
          setProgress({ current: i + 1, total: files.length });
        }
        conversation = parseWhatsAppText(fullText);
      } else {
        // JSON formats: Messenger, Instagram, or Telegram — auto-detect
        const jsonDataArray: unknown[] = [];

        for (let i = 0; i < files.length; i++) {
          const text = await readFileAsText(files[i]);
          let parsed: unknown;
          try {
            parsed = JSON.parse(text);
          } catch {
            throw new Error(
              `"${files[i].name}" nie jest poprawnym plikiem JSON. Upewnij się, że przesyłasz eksport rozmowy.`
            );
          }
          jsonDataArray.push(parsed);
          setProgress({ current: i + 1, total: files.length });
        }

        // Auto-detect format from first file
        const format = detectFormat(files[0].name, jsonDataArray[0]);

        if (format === 'telegram') {
          if (jsonDataArray.length > 1) {
            throw new Error('Telegram: przesyłaj jeden plik result.json na raz.');
          }
          conversation = parseTelegramJSON(jsonDataArray[0]);
        } else if (format === 'messenger') {
          // Could be Messenger or Instagram (nearly identical)
          conversation =
            jsonDataArray.length === 1
              ? parseMessengerJSON(jsonDataArray[0])
              : mergeMessengerFiles(jsonDataArray);
        } else {
          throw new Error(
            'Nierozpoznany format pliku. Obsługiwane: Messenger (.json), WhatsApp (.txt), Instagram (.json), Telegram (.json).'
          );
        }
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

      trackEvent({
        name: 'upload_complete',
        params: {
          platform: conversation.platform,
          messageCount: conversation.metadata.totalMessages,
          durationDays: Math.round(
            ((conversation.metadata.dateRange.end ?? Date.now()) - conversation.metadata.dateRange.start) /
              (1000 * 60 * 60 * 24),
          ),
        },
      });

      // Stage 4: Complete and redirect
      setStage('complete');

      // Brief pause to show the completion state before navigating
      await new Promise((resolve) => setTimeout(resolve, 600));

      sessionStorage.setItem('podtekst-celebrate-' + id, '1');
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
          Wgraj eksport rozmowy z Messengera, Instagrama, Telegrama lub WhatsAppa
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
            <p className="mt-3 mb-2 text-xs font-medium text-foreground/80">Messenger (przez aplikację):</p>
            <ol className="list-decimal pl-5 text-xs leading-relaxed text-muted-foreground">
              <li>
                Otwórz Messengera i przejdź do{' '}
                <strong className="text-foreground/80">Ustawienia</strong> (ikona zębatki)
              </li>
              <li>
                Kliknij{' '}
                <strong className="text-foreground/80">Prywatność i bezpieczeństwo</strong>
              </li>
              <li>
                Wybierz{' '}
                <strong className="text-foreground/80">W pełni szyfrowane czaty</strong>
              </li>
              <li>
                Otwórz{' '}
                <strong className="text-foreground/80">Pamięć wiadomości</strong>
              </li>
              <li>
                Na dole kliknij{' '}
                <strong className="text-foreground/80">Pobierz dane z pamięci wiadomości</strong>
              </li>
              <li>
                Pobierz archiwum i rozpakuj — pliki JSON znajdziesz w folderze{' '}
                <code className="rounded bg-card px-1 py-0.5 font-mono text-foreground/80">
                  messages/inbox/[nazwa_rozmowy]/
                </code>
              </li>
            </ol>
            <div className="mt-3 border-t border-border pt-3">
              <p className="mb-2 text-xs font-medium text-foreground/80">Messenger (przez Facebook):</p>
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
            </div>
            <div className="mt-3 border-t border-border pt-3">
              <p className="mb-2 text-xs font-medium text-foreground/80">Instagram:</p>
              <ol className="list-decimal pl-5 text-xs leading-relaxed text-muted-foreground">
                <li>
                  Otwórz Instagram i przejdź do{' '}
                  <strong className="text-foreground/80">Ustawienia → Twoje działania → Pobierz swoje informacje</strong>
                </li>
                <li>
                  Wybierz{' '}
                  <strong className="text-foreground/80">Wiadomości</strong> i format{' '}
                  <strong className="text-foreground/80">JSON</strong>
                </li>
                <li>
                  Pobierz archiwum i rozpakuj — pliki JSON znajdziesz w folderze{' '}
                  <code className="rounded bg-card px-1 py-0.5 font-mono text-foreground/80">
                    messages/inbox/[nazwa_rozmowy]/
                  </code>
                </li>
              </ol>
            </div>
            <div className="mt-3 border-t border-border pt-3">
              <p className="mb-2 text-xs font-medium text-foreground/80">Telegram:</p>
              <ol className="list-decimal pl-5 text-xs leading-relaxed text-muted-foreground">
                <li>
                  Otwórz <strong className="text-foreground/80">Telegram Desktop</strong>
                </li>
                <li>
                  Przejdź do{' '}
                  <strong className="text-foreground/80">Ustawienia → Zaawansowane → Eksportuj dane z Telegrama</strong>
                </li>
                <li>
                  Zaznacz rozmowy do eksportu, wybierz format{' '}
                  <strong className="text-foreground/80">Machine-readable JSON</strong>
                </li>
                <li>
                  Wgraj plik{' '}
                  <code className="rounded bg-card px-1 py-0.5 font-mono text-foreground/80">result.json</code>
                </li>
              </ol>
            </div>
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
