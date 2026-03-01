'use client';

import { useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { ArrowLeft, Heart, ChevronDown, Lock } from 'lucide-react';

import { useAnalysis } from '@/lib/analysis/analysis-context';
import { SectionErrorBoundary } from '@/components/shared/SectionErrorBoundary';
import SceneParticles, { HeartSVG } from '@/components/shared/SceneParticles';
import VideoBackground from '@/components/shared/VideoBackground';
import { RefreshCw } from 'lucide-react';

const DatingProfileButton = dynamic(() => import('@/components/analysis/DatingProfileButton'), {
  ssr: false, loading: () => <div className="brand-shimmer h-48" />,
});
const DatingProfileResult = dynamic(() => import('@/components/analysis/DatingProfileResult'), {
  ssr: false, loading: () => <div className="brand-shimmer h-48" />,
});

// ── SVG: Floating Hearts ────────────────────────────────────

function FloatingHeartsSVG({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 100" fill="none" className={className} aria-hidden="true">
      <path d="M30 50 C30 40 20 35 20 45 C20 55 30 65 30 65 C30 65 40 55 40 45 C40 35 30 40 30 50Z" fill="#ff006e" opacity="0.2" />
      <path d="M80 30 C80 22 72 18 72 26 C72 34 80 42 80 42 C80 42 88 34 88 26 C88 18 80 22 80 30Z" fill="#8338ec" opacity="0.15" />
      <path d="M150 55 C150 47 142 43 142 51 C142 59 150 67 150 67 C150 67 158 59 158 51 C158 43 150 47 150 55Z" fill="#ff006e" opacity="0.12" />
      <path d="M120 20 C120 15 115 13 115 17 C115 21 120 25 120 25 C120 25 125 21 125 17 C125 13 120 15 120 20Z" fill="#3a86ff" opacity="0.1" />
    </svg>
  );
}

// ═══ MAIN DATING PAGE ═══════════════════════════════════════

export default function DatingModePage() {
  const { analysis, qualitative, conversation, participants, hasQualitative, onDatingProfileComplete, onImageSaved, mergeQualitative } = useAnalysis();
  const id = (analysis as { id?: string })?.id || '';
  const entranceRef = useRef<HTMLDivElement>(null);
  const entranceInView = useInView(entranceRef, { once: true });
  // Validate that datingProfile has actual profiles matching participants
  const hasResult = !!qualitative?.datingProfile?.profiles &&
    participants.some(name => qualitative.datingProfile!.profiles[name]);

  const handleRegenerate = () => {
    mergeQualitative({ datingProfile: undefined as never });
  };

  return (
    <SectionErrorBoundary section="DatingProfile">
    <div data-mode="dating" className="dating-bg relative">
      <VideoBackground src="/videos/modes/dating.mp4" />
      <div className="dating-glow" aria-hidden="true" />

      {/* Floating hearts */}
      <SceneParticles className="dating-particle" count={8} shapes={Array(8).fill(<HeartSVG />)} />
      {/* Bokeh circles */}
      <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden="true">
        <div className="dating-bokeh dating-bokeh-1" />
        <div className="dating-bokeh dating-bokeh-2" />
        <div className="dating-bokeh dating-bokeh-3" />
        <div className="dating-bokeh dating-bokeh-4" />
      </div>

      <div className="fixed top-6 left-6 z-30">
        <Link href={`/analysis/${id}`} className="flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 font-mono text-xs uppercase tracking-widest text-[#ff006e]/70 backdrop-blur-md transition-all hover:bg-black/60 hover:text-[#ff006e]">
          <ArrowLeft className="size-3.5" /> Hub
        </Link>
      </div>

      {/* ═══ SCENE 1: ENTRANCE ═══ */}
      <section ref={entranceRef} className="dating-scene">
        <motion.div className="flex flex-col items-center text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
          <motion.div initial={{ opacity: 0, y: -20 }} animate={entranceInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, delay: 0.2 }}>
            <FloatingHeartsSVG className="mb-4 h-16 w-32 opacity-60 sm:w-40 md:w-48" />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={entranceInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.5 }}>
            <h1 className="font-[var(--font-syne)] text-3xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
              <span className="bg-gradient-to-r from-[#ff006e] via-[#8338ec] to-[#3a86ff] bg-clip-text text-transparent">DATING PROFILE</span>
            </h1>
            <p className="mt-3 font-mono text-sm tracking-wide text-[#ff006e]/50">Szczery profil randkowy oparty na faktach</p>
          </motion.div>

          {!hasQualitative ? (
            <motion.div className="mt-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
              <div className="dating-card px-4 py-4 text-center sm:px-8 sm:py-6">
                <Lock className="mx-auto mb-3 size-8 text-[#ff006e]/30" />
                <p className="font-[var(--font-syne)] text-lg font-bold text-white">Ta sekcja wymaga Analizy AI</p>
                <Link href={`/analysis/${id}/ai`} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-purple-300 transition-colors hover:bg-purple-500/20">
                  Przejdz do AI Deep Dive &rarr;
                </Link>
              </div>
            </motion.div>
          ) : hasResult ? (
            <motion.div className="mt-12 flex flex-col items-center gap-2 text-[#ff006e]/40" animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Zobacz profil</span>
              <ChevronDown className="size-5" />
            </motion.div>
          ) : (
            <motion.div className="mt-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
              <div className="dating-card px-4 py-4 text-center sm:px-8 sm:py-6">
                <Heart className="mx-auto mb-3 size-8 text-[#ff006e]/40" />
                <DatingProfileButton analysis={analysis} onComplete={onDatingProfileComplete} />
              </div>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* ═══ SCENE 2: PROFILE RESULT ═══ */}
      {hasResult && qualitative?.datingProfile && (
        <section className="relative px-4 pb-32 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <div className="mb-8 flex items-center justify-center gap-3">
                <Heart className="size-5 text-[#ff006e]" />
                <h2 className="font-[var(--font-syne)] text-xl font-bold text-[#ff006e]">Twoj profil</h2>
              </div>
              <DatingProfileResult result={qualitative.datingProfile} participants={participants} personalityProfiles={qualitative?.pass3 as Record<string, import('@/lib/analysis/types').PersonProfile> | undefined} messages={conversation.messages} analysisId={id} savedImages={analysis.generatedImages} onImageSaved={onImageSaved} />
            </motion.div>
            <div className="mt-12 flex flex-wrap justify-center gap-6">
              <button onClick={handleRegenerate} className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#ff006e]/40 transition-colors hover:text-[#ff006e]">
                <RefreshCw className="size-3" /> Generuj ponownie
              </button>
              <Link href={`/analysis/${id}/simulator`} className="font-mono text-xs uppercase tracking-widest text-[#0084ff]/50 transition-colors hover:text-[#0084ff]">Reply Simulator &rarr;</Link>
              <Link href={`/analysis/${id}`} className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#ff006e]/40 transition-colors hover:text-[#ff006e]"><ArrowLeft className="size-3" /> Centrum Dowodzenia</Link>
            </div>
          </div>
        </section>
      )}
    </div>
    </SectionErrorBoundary>
  );
}
