'use client';

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Scene, FlatlineSVG } from '@/components/analysis/eks/shared';
import type { EksResult } from '@/lib/analysis/eks-prompts';
import type { EksQuizAnswer, EksQuizQuestion } from '@/components/analysis/EksButton';

const EksButton = dynamic(
  () => import('@/components/analysis/EksButton'),
  { ssr: false, loading: () => <div className="h-16" /> },
);

export default function IntroScene({
  hasResult,
  onComplete,
  onQuizComplete,
}: {
  hasResult: boolean;
  onComplete: (result: EksResult) => void;
  onQuizComplete?: (answers: EksQuizAnswer[], questions: EksQuizQuestion[]) => void;
}) {
  return (
    <Scene id="eks-intro">
      <div className="max-w-3xl mx-auto px-4 md:px-6 text-center">
        {/* Flatline animation */}
        <div className="mb-10">
          <FlatlineSVG animate={true} />
        </div>

        {/* Title */}
        <p
          className="text-xs uppercase tracking-[0.2em] mb-4"
          style={{ color: '#6b3a3a' }}
        >
          sekcja zwłok
        </p>

        <h2
          className="font-[family-name:var(--font-syne)] text-4xl md:text-6xl font-extrabold tracking-tight mb-4 eks-typewriter"
          style={{ color: '#dc2626' }}
        >
          TRYB EKS
        </h2>

        <p
          className="text-base md:text-lg mb-10"
          style={{ color: '#d4a07a' }}
        >
          Sekcja zwłok twojego związku
        </p>

        {/* Disclaimer */}
        <div
          className="mx-auto max-w-md rounded-lg p-4 mb-10 text-left text-sm leading-relaxed"
          style={{
            background: 'rgba(42,16,16,0.5)',
            border: '1px solid #2a1010',
            color: '#6b3a3a',
          }}
        >
          <p className="mb-2">
            Ta analiza może być emocjonalnie intensywna. Jeśli czujesz, że to za dużo — przerwij w dowolnym momencie.
          </p>
          <p>
            Telefon Zaufania:{' '}
            <a href="tel:116123" className="underline" style={{ color: '#991b1b' }}>
              116 123
            </a>{' '}
            (bezpłatny, całodobowy)
          </p>
        </div>

        {/* CTA or status */}
        {!hasResult ? (
          <EksButton onComplete={onComplete} onQuizComplete={onQuizComplete} />
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 rounded-lg px-6 py-3 font-mono text-xs uppercase tracking-widest"
            style={{
              background: 'rgba(153,27,27,0.15)',
              border: '1px solid rgba(153,27,27,0.3)',
              color: '#991b1b',
            }}
          >
            <span className="inline-block w-2 h-2 rounded-full bg-[#991b1b] animate-pulse" />
            Analiza gotowa
          </motion.div>
        )}
      </div>
    </Scene>
  );
}
