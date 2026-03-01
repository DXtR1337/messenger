'use client';

import { useState, useCallback, useEffect } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import type { EksResult } from '@/lib/analysis/eks-prompts';
import { trackEvent } from '@/lib/analytics/events';

interface EksPdfButtonProps {
  result: EksResult;
  participants: string[];
}

export default function EksPdfButton({ result, participants }: EksPdfButtonProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  const handleExport = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const { generateEksPdf } = await import('@/lib/export/eks-pdf');
      const doc = generateEksPdf(result, participants);
      const filename = `podtekst-eks-akt-zgonu-${participants.join('-').replace(/\s+/g, '_').toLowerCase()}.pdf`;
      doc.save(filename);
      trackEvent({ name: 'pdf_download', params: { type: 'eks' } });
    } catch (err) {
      console.error('EKS PDF export failed:', err);
      setError('Generowanie PDF nie powiodlo sie.');
    } finally {
      setGenerating(false);
    }
  }, [result, participants]);

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={handleExport}
        disabled={generating}
        className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-mono text-xs uppercase tracking-widest transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: 'rgba(153,27,27,0.2)',
          border: '1px solid rgba(153,27,27,0.4)',
          color: '#dc2626',
        }}
      >
        {generating ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Generowanie...
          </>
        ) : (
          <>
            <FileDown className="size-3.5" />
            Pobierz Akt Zgonu (PDF)
          </>
        )}
      </button>
      {error && (
        <p className="mt-2 text-xs font-mono" style={{ color: '#991b1b' }}>
          {error}
        </p>
      )}
    </div>
  );
}
