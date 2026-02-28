'use client';

import { useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { ArrowLeft, Heart, ChevronDown } from 'lucide-react';

import { useAnalysis } from '@/lib/analysis/analysis-context';
import { SectionErrorBoundary } from '@/components/shared/SectionErrorBoundary';
import VideoBackground from '@/components/shared/VideoBackground';

const CapitalizationButton = dynamic(() => import('@/components/analysis/CapitalizationButton'), {
  ssr: false, loading: () => <div className="brand-shimmer h-48" />,
});
const CapitalizationCard = dynamic(() => import('@/components/analysis/CapitalizationCard'), {
  ssr: false, loading: () => <div className="brand-shimmer h-48" />,
});

// ── SVG: Animated heart celebration ───────────────────

function HeartCelebrationSVG({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="heartGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ec4899" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="45" fill="url(#heartGlow)" />
      <circle cx="50" cy="50" r="40" stroke="#ec4899" strokeWidth="0.3" opacity="0.2" />
      <circle cx="50" cy="50" r="30" stroke="#f472b6" strokeWidth="0.3" opacity="0.15" />
      {/* Center heart */}
      <path
        d="M50 75 C35 62, 20 50, 25 38 C28 30, 38 28, 44 34 L50 40 L56 34 C62 28, 72 30, 75 38 C80 50, 65 62, 50 75Z"
        fill="#ec4899"
        opacity="0.25"
      />
      <path
        d="M50 70 C38 60, 28 52, 32 42 C34 36, 42 34, 46 38 L50 43 L54 38 C58 34, 66 36, 68 42 C72 52, 62 60, 50 70Z"
        fill="#ec4899"
        opacity="0.4"
      />
      {/* Sparkle dots */}
      {[
        { x: 20, y: 25, r: 2 },
        { x: 80, y: 25, r: 1.5 },
        { x: 15, y: 60, r: 1 },
        { x: 85, y: 55, r: 1.5 },
        { x: 35, y: 15, r: 1 },
        { x: 65, y: 15, r: 1 },
      ].map((dot, i) => (
        <circle key={i} cx={dot.x} cy={dot.y} r={dot.r} fill="#f9a8d4" opacity="0.3">
          <animate attributeName="opacity" values="0.1;0.4;0.1" dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
}

// ═══ MAIN CAPITALIZATION PAGE ═════════════════════════

export default function CapitalizationModePage() {
  const { analysis, conversation, qualitative, participants, onCapitalizationComplete } = useAnalysis();
  const id = (analysis as { id?: string })?.id || '';
  const entranceRef = useRef<HTMLDivElement>(null);
  const entranceInView = useInView(entranceRef, { once: true });
  const hasResult = !!qualitative?.capitalization;

  return (
    <SectionErrorBoundary section="Capitalization">
    <div data-mode="capitalization" className="capitalization-bg relative">
      <VideoBackground src="/videos/modes/capitalization.mp4" />
      <div
        className="pointer-events-none fixed inset-0 z-[-1]"
        style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(236,72,153,0.08) 0%, transparent 60%)' }}
        aria-hidden="true"
      />

      {/* Floating heart particles */}
      {[1, 2, 3, 4, 5, 6].map(n => (
        <div key={n} className={`capitalization-particle capitalization-particle-${n}`} aria-hidden="true">
          {n % 2 === 0 ? '\u2665' : '\u2661'}
        </div>
      ))}

      <div className="fixed top-6 left-6 z-30">
        <Link
          href={`/analysis/${id}`}
          className="flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 font-mono text-xs uppercase tracking-widest text-[#ec4899]/70 backdrop-blur-md transition-all hover:bg-black/60 hover:text-[#ec4899]"
        >
          <ArrowLeft className="size-3.5" /> Hub
        </Link>
      </div>

      {/* ═══ SCENE 1: ENTRANCE ═══ */}
      <section ref={entranceRef} className="capitalization-scene">
        <motion.div
          className="flex flex-col items-center text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={entranceInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          >
            <HeartCelebrationSVG className="mb-4 size-28 opacity-50" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={entranceInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <h1 className="font-[var(--font-syne)] text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              <span className="bg-gradient-to-r from-[#ec4899] to-[#f9a8d4] bg-clip-text text-transparent">
                KAPITALIZACJA
              </span>
            </h1>
            <p className="mt-2 font-mono text-sm tracking-wide text-[#ec4899]/50">
              Active-Constructive Responding (Gable 2004)
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-[#ec4899]/30">
              Jak reagujecie na dobre wiesci?
            </p>
          </motion.div>

          {hasResult ? (
            <motion.div
              className="mt-12 flex flex-col items-center gap-2 text-[#ec4899]/40"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Zobacz wyniki</span>
              <ChevronDown className="size-5" />
            </motion.div>
          ) : (
            <motion.div className="mt-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
              <div className="capitalization-card px-4 py-4 text-center sm:px-8 sm:py-6">
                <Heart className="mx-auto mb-3 size-8 text-[#ec4899]/40" />
                <CapitalizationButton conversation={conversation} onComplete={onCapitalizationComplete} />
              </div>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* ═══ SCENE 2: RESULTS ═══ */}
      {hasResult && qualitative?.capitalization && (
        <section className="relative px-4 pb-32 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-6 flex items-center gap-3">
                <Heart className="size-5 text-[#ec4899]" />
                <h2 className="font-[var(--font-syne)] text-xl font-bold text-[#ec4899]">
                  Wyniki Kapitalizacji
                </h2>
              </div>
              <div className="capitalization-card p-6">
                <CapitalizationCard result={qualitative.capitalization} />
              </div>
            </motion.div>

            <div className="mt-12 flex flex-wrap justify-center gap-6">
              <Link
                href={`/analysis/${id}/moral`}
                className="font-mono text-xs uppercase tracking-widest text-[#f97316]/50 transition-colors hover:text-[#f97316]"
              >
                Moral Foundations &rarr;
              </Link>
              <Link
                href={`/analysis/${id}`}
                className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#ec4899]/40 transition-colors hover:text-[#ec4899]"
              >
                <ArrowLeft className="size-3" /> Command Center
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
    </SectionErrorBoundary>
  );
}
