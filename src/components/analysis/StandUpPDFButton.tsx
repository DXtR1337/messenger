'use client';

import { useState, useCallback } from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StoredAnalysis, StandUpRoastResult } from '@/lib/analysis/types';
import { sampleMessages } from '@/lib/analysis/qualitative';
import { buildQuantitativeContext } from '@/lib/analysis/qualitative';
import { trackEvent } from '@/lib/analytics/events';
import { useAnalysis } from '@/lib/analysis/analysis-context';

interface StandUpPDFButtonProps {
  analysis: StoredAnalysis;
}

export default function StandUpPDFButton({ analysis }: StandUpPDFButtonProps) {
  const { startOperation, updateOperation, stopOperation } = useAnalysis();
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setStatus('Generowanie stand-upu...');
    startOperation('standup', 'Stand-Up', 'Generowanie stand-upu...');

    try {
      const { conversation, quantitative } = analysis;
      const participants = conversation.participants.map((p) => p.name);
      const samples = sampleMessages(conversation, quantitative);
      const quantitativeContext = buildQuantitativeContext(quantitative, conversation.participants);

      trackEvent({ name: 'analysis_start', params: { mode: 'standup' } });

      // Call the Stand-Up API
      const response = await fetch('/api/analyze/standup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ samples, participants, quantitativeContext }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let result: StandUpRoastResult | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6).trim()) as Record<string, unknown>;
            if (event.type === 'progress') {
              setStatus(event.status as string);
              updateOperation('standup', { status: event.status as string, progress: 40 });
            } else if (event.type === 'complete') {
              result = event.result as StandUpRoastResult;
            } else if (event.type === 'error') {
              throw new Error(event.error as string);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }

      if (!result) throw new Error('Brak wyniku z API');
      if (!result.acts || !Array.isArray(result.acts) || result.acts.length === 0) {
        throw new Error('Niepoprawna odpowiedź AI \u2014 brak aktów');
      }

      trackEvent({ name: 'analysis_complete', params: { mode: 'standup', passCount: 1 } });

      // Load photos for the PDF (parallel with nothing — fast from same origin)
      setStatus('Ładowanie grafik...');
      const { loadPdfImages } = await import('@/lib/export/pdf-images');
      const images = await loadPdfImages();

      // Generate PDF
      setStatus('Generowanie PDF...');
      const { generateStandUpPdf } = await import('@/lib/export/standup-pdf');
      const blob = generateStandUpPdf(result, analysis, undefined, images);

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `podtekst-standup-${conversation.title.replace(/\s+/g, '-').slice(0, 30)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      trackEvent({ name: 'pdf_download', params: { type: 'standup' } });
      setStatus(null);
    } catch (err) {
      console.error('Stand-Up PDF failed:', err);
      setStatus('Błąd \u2014 spróbuj ponownie');
      setTimeout(() => setStatus(null), 3000);
    } finally {
      stopOperation('standup');
      setGenerating(false);
    }
  }, [analysis, startOperation, updateOperation, stopOperation]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      disabled={generating}
      className="gap-2"
    >
      {generating ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {status ?? 'Generowanie...'}
        </>
      ) : (
        <>
          <Mic className="size-4" />
          Stand-Up PDF
        </>
      )}
    </Button>
  );
}
