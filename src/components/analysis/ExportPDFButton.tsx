'use client';

import { useState, useCallback, useEffect } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StoredAnalysis } from '@/lib/analysis/types';
import type { PdfExportProgress } from '@/lib/export/pdf-export';
import { trackEvent } from '@/lib/analytics/events';

interface ExportPDFButtonProps {
  analysis: StoredAnalysis;
}

export default function ExportPDFButton({ analysis }: ExportPDFButtonProps) {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<PdfExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-clear error after 5 seconds
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  const handleExport = useCallback(async () => {
    setGenerating(true);
    setProgress(null);
    setError(null);

    try {
      // Dynamic import to avoid loading jsPDF until needed
      const { generateAnalysisPdf } = await import('@/lib/export/pdf-export');
      await generateAnalysisPdf(analysis, setProgress);
      trackEvent({ name: 'pdf_download', params: { type: 'standard' } });
    } catch (err) {
      console.error('PDF export failed:', err);
      setError('Generowanie PDF nie powiodło się. Spróbuj ponownie.');
    } finally {
      setGenerating(false);
      setProgress(null);
    }
  }, [analysis]);

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={generating}
        className="gap-2"
      >
        {generating ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {progress ? progress.label : 'Generowanie...'}
          </>
        ) : (
          <>
            <FileDown className="size-4" />
            Eksportuj PDF
          </>
        )}
      </Button>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
