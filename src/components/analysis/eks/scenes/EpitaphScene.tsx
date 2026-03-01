'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Scene } from '@/components/analysis/eks/shared';

const EksCardGallery = dynamic(() => import('@/components/analysis/eks/EksCardGallery'), {
  ssr: false,
  loading: () => <div className="w-full h-48 rounded-xl animate-pulse" style={{ background: 'rgba(42,16,16,0.3)' }} />,
});
import type { EksResult } from '@/lib/analysis/eks-prompts';
import type { QuantitativeAnalysis } from '@/lib/parsers/types';

const EksPdfButton = dynamic(() => import('@/components/analysis/EksPdfButton'), { ssr: false });
const EksShareButton = dynamic(() => import('@/components/analysis/eks/EksShareButton'), { ssr: false });

interface EpitaphSceneProps {
  result: EksResult;
  totalMessages: number;
  participants: string[];
  quantitative: QuantitativeAnalysis;
  qualitative?: { pass4?: { health_score?: { overall?: number } } };
  analysisId: string;
}

export default function EpitaphScene({
  result,
  totalMessages,
  participants,
  quantitative,
  qualitative,
  analysisId,
}: EpitaphSceneProps) {
  return (
    <Scene id="eks-epitaph" className="pb-40 md:pb-32">
      <div className="max-w-3xl mx-auto px-4 md:px-6 text-center">
        <p
          className="text-xs uppercase tracking-[0.2em] mb-6"
          style={{ color: '#6b3a3a' }}
        >
          epitafium
        </p>

        {/* Epitaph — slow cinematic reveal */}
        <motion.blockquote
          className="font-[family-name:var(--font-syne)] text-xl md:text-3xl font-bold leading-relaxed mb-8 max-w-xl mx-auto"
          style={{ color: '#d4a07a' }}
          initial={{ opacity: 0, y: 30, filter: 'blur(6px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        >
          &ldquo;{result.epitaph}&rdquo;
        </motion.blockquote>

        {/* Duration and death date */}
        <div className="flex flex-wrap justify-center gap-6 mb-10">
          {result.relationshipDuration && (
            <div>
              <p
                className="font-mono text-[10px] uppercase tracking-widest mb-1"
                style={{ color: '#4a4a4a' }}
              >
                Czas trwania
              </p>
              <p className="font-mono text-sm" style={{ color: '#6b3a3a' }}>
                {result.relationshipDuration}
              </p>
            </div>
          )}
          {result.deathDate && (
            <div>
              <p
                className="font-mono text-[10px] uppercase tracking-widest mb-1"
                style={{ color: '#4a4a4a' }}
              >
                Data śmierci
              </p>
              <p className="font-mono text-sm" style={{ color: '#6b3a3a' }}>
                {result.deathDate}
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div
          className="mx-auto h-px w-32 mb-10"
          style={{
            background: 'linear-gradient(to right, transparent, #991b1b40, transparent)',
          }}
        />

        {/* Closing message */}
        <div className="mb-10">
          <p className="text-sm mb-2" style={{ color: '#4a4a4a' }}>
            Dbaj o siebie.
          </p>
          <p className="text-sm" style={{ color: '#4a4a4a' }}>
            Telefon Zaufania:{' '}
            <a href="tel:116123" className="underline" style={{ color: '#6b3a3a' }}>
              116 123
            </a>{' '}
            (bezpłatny, całodobowy)
          </p>
        </div>

        {/* Disclaimer */}
        <div
          className="rounded-lg p-4 mb-8 text-center"
          style={{
            background: 'rgba(153,27,27,0.06)',
            border: '1px solid rgba(153,27,27,0.12)',
          }}
        >
          <p className="font-mono text-[10px] leading-relaxed" style={{ color: '#5a3030' }}>
            Ta analiza opiera się na próbce ~900 z{' '}
            {totalMessages.toLocaleString('pl-PL')}{' '}
            wiadomości. Wnioski są interpretacją wzorców komunikacyjnych, nie diagnozą psychologiczną.
            Prognoza ma charakter rozrywkowy — nie podejmuj decyzji życiowych na jej podstawie.
          </p>
        </div>

        {/* PDF export + share link */}
        <div className="mb-10 flex flex-wrap justify-center gap-3">
          <EksPdfButton result={result} participants={participants} />
          <EksShareButton result={result} participants={participants} />
        </div>

        {/* Inline card download gallery */}
        <EksCardGallery
          result={result}
          participants={participants}
          quantitative={quantitative}
          qualitative={qualitative}
        />

        {/* Back to hub */}
        <Link
          href={`/analysis/${analysisId}`}
          className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-mono text-xs uppercase tracking-widest transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: 'rgba(153,27,27,0.15)',
            border: '1px solid #991b1b30',
            color: '#991b1b',
          }}
        >
          <ArrowLeft className="size-3.5" />
          Wróć do Centrum Dowodzenia
        </Link>
      </div>
    </Scene>
  );
}
