'use client';

import { useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { ArrowLeft, Sparkles, ChevronDown } from 'lucide-react';

import { useAnalysis } from '@/lib/analysis/analysis-context';
import { SectionErrorBoundary } from '@/components/shared/SectionErrorBoundary';
import SceneParticles from '@/components/shared/SceneParticles';
import VideoBackground from '@/components/shared/VideoBackground';

const EmotionCausesButton = dynamic(() => import('@/components/analysis/EmotionCausesButton'), {
  ssr: false, loading: () => <div className="brand-shimmer h-48" />,
});
const EmotionCausesCard = dynamic(() => import('@/components/analysis/EmotionCausesCard'), {
  ssr: false, loading: () => <div className="brand-shimmer h-48" />,
});

// ── SVG: Prism Spectrum ──────────────────────────────────────

function PrismSVG({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 80" fill="none" className={className} aria-hidden="true">
      {/* Prism triangle */}
      <polygon points="55,10 75,65 35,65" stroke="#a855f7" strokeWidth="0.8" opacity="0.3" fill="#a855f7" fillOpacity="0.03" />
      {/* Input beam */}
      <line x1="5" y1="38" x2="48" y2="38" stroke="#ffffff" strokeWidth="1" opacity="0.2" />
      {/* Output spectrum rays */}
      <line x1="72" y1="30" x2="130" y2="10" stroke="#ef4444" strokeWidth="0.8" opacity="0.3" />
      <line x1="73" y1="35" x2="132" y2="22" stroke="#f97316" strokeWidth="0.8" opacity="0.3" />
      <line x1="74" y1="40" x2="134" y2="35" stroke="#eab308" strokeWidth="0.8" opacity="0.3" />
      <line x1="74" y1="45" x2="134" y2="48" stroke="#10b981" strokeWidth="0.8" opacity="0.3" />
      <line x1="73" y1="50" x2="132" y2="58" stroke="#06b6d4" strokeWidth="0.8" opacity="0.3" />
      <line x1="72" y1="55" x2="130" y2="70" stroke="#8b5cf6" strokeWidth="0.8" opacity="0.3" />
      {/* Spectrum endpoint dots */}
      <circle cx="130" cy="10" r="2" fill="#ef4444" opacity="0.4" />
      <circle cx="132" cy="22" r="2" fill="#f97316" opacity="0.4" />
      <circle cx="134" cy="35" r="2" fill="#eab308" opacity="0.4" />
      <circle cx="134" cy="48" r="2" fill="#10b981" opacity="0.4" />
      <circle cx="132" cy="58" r="2" fill="#06b6d4" opacity="0.4" />
      <circle cx="130" cy="70" r="2" fill="#8b5cf6" opacity="0.4" />
      {/* Prism inner glow */}
      <circle cx="55" cy="40" r="10" fill="#a855f7" opacity="0.05">
        <animate attributeName="opacity" values="0.03;0.08;0.03" dur="4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

// ═══ MAIN EMOTIONS PAGE ══════════════════════════════════════

export default function EmotionsModePage() {
  const { analysis, conversation, qualitative, participants, onEmotionCausesComplete } = useAnalysis();
  const id = (analysis as { id?: string })?.id || '';
  const entranceRef = useRef<HTMLDivElement>(null);
  const entranceInView = useInView(entranceRef, { once: true });
  const hasResult = !!qualitative?.emotionCauses;

  return (
    <SectionErrorBoundary section="EmotionCauses">
    <div data-mode="emotions" className="emotions-bg relative">
      <VideoBackground src="/videos/modes/emotions.mp4" />
      <div className="emotions-glow" aria-hidden="true" />

      {/* Spectrum orbs */}
      <SceneParticles className="emotions-particle" count={6} />

      <div className="fixed top-6 left-6 z-30">
        <Link href={`/analysis/${id}`} className="flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 font-mono text-xs uppercase tracking-widest text-[#06b6d4]/70 backdrop-blur-md transition-all hover:bg-black/60 hover:text-[#06b6d4]">
          <ArrowLeft className="size-3.5" /> Hub
        </Link>
      </div>

      {/* ═══ SCENE 1: ENTRANCE ═══ */}
      <section ref={entranceRef} className="emotions-scene">
        <motion.div className="flex flex-col items-center text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={entranceInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            <PrismSVG className="mb-4 h-20 w-36 opacity-60" />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={entranceInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.5 }}>
            <h1 className="font-[var(--font-syne)] text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              <span className="bg-gradient-to-r from-[#06b6d4] via-[#a855f7] to-[#ec4899] bg-clip-text text-transparent">EMOTION CAUSES</span>
            </h1>
            <p className="mt-2 font-mono text-sm tracking-wide text-[#06b6d4]/50">Mapa przyczyn emocji</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-[#06b6d4]/30">Kto wywoluje jakie uczucia</p>
          </motion.div>

          {hasResult ? (
            <motion.div className="mt-12 flex flex-col items-center gap-2 text-[#06b6d4]/40" animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Zobacz mape emocji</span>
              <ChevronDown className="size-5" />
            </motion.div>
          ) : (
            <motion.div className="mt-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
              <div className="emotions-card px-4 py-4 text-center sm:px-8 sm:py-6">
                <Sparkles className="mx-auto mb-3 size-8 text-[#06b6d4]/40" />
                <EmotionCausesButton conversation={conversation} onComplete={onEmotionCausesComplete} />
              </div>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* ═══ SCENE 2: RESULTS ═══ */}
      {hasResult && qualitative?.emotionCauses && (
        <section className="relative px-4 pb-32 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <div className="mb-6 flex items-center gap-3">
                <Sparkles className="size-5 text-[#06b6d4]" />
                <h2 className="font-[var(--font-syne)] text-xl font-bold text-[#06b6d4]">Spektrum Emocji</h2>
              </div>
              <div className="emotions-card p-6">
                <EmotionCausesCard result={qualitative.emotionCauses} participants={participants} />
              </div>
            </motion.div>

            <div className="mt-12 flex flex-wrap justify-center gap-6">
              <Link href={`/analysis/${id}/cps`} className="font-mono text-xs uppercase tracking-widest text-[#10b981]/50 transition-colors hover:text-[#10b981]">CPS Screening &rarr;</Link>
              <Link href={`/analysis/${id}`} className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#06b6d4]/40 transition-colors hover:text-[#06b6d4]"><ArrowLeft className="size-3" /> Command Center</Link>
            </div>
          </div>
        </section>
      )}
    </div>
    </SectionErrorBoundary>
  );
}
