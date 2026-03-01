'use client';

import { useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { ArrowLeft, MessagesSquare, Lock } from 'lucide-react';

import { useAnalysis } from '@/lib/analysis/analysis-context';
import { SectionErrorBoundary } from '@/components/shared/SectionErrorBoundary';
import SceneParticles, { ChatBubbleMiniSVG } from '@/components/shared/SceneParticles';
import VideoBackground from '@/components/shared/VideoBackground';

const ReplySimulator = dynamic(() => import('@/components/analysis/ReplySimulator'), {
  ssr: false, loading: () => <div className="brand-shimmer h-48" />,
});

// ── SVG: Chat Bubbles ───────────────────────────────────────

function ChatBubblesSVG({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" fill="none" className={className} aria-hidden="true">
      {/* Left bubble (solid) */}
      <rect x="5" y="10" width="50" height="30" rx="12" fill="#0084ff" opacity="0.2" />
      <rect x="5" y="10" width="50" height="30" rx="12" stroke="#0084ff" strokeWidth="0.5" opacity="0.4" />
      <path d="M15 40 L10 50 L25 40" fill="#0084ff" opacity="0.2" />
      {/* Right bubble (dashed — AI prediction) */}
      <rect x="65" y="30" width="50" height="30" rx="12" stroke="#00c6ff" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.3" />
      <path d="M105 60 L110 70 L95 60" stroke="#00c6ff" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.3" fill="none" />
      {/* Typing dots */}
      <circle cx="80" cy="45" r="2" fill="#00c6ff" opacity="0.5">
        <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="88" cy="45" r="2" fill="#00c6ff" opacity="0.5">
        <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.2s" begin="0.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="96" cy="45" r="2" fill="#00c6ff" opacity="0.5">
        <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.2s" begin="0.4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

// ═══ MAIN SIMULATOR PAGE ═════════════════════════════════════

export default function SimulatorModePage() {
  const { analysis, conversation, quantitative, qualitative, participants, hasQualitative } = useAnalysis();
  const id = (analysis as { id?: string })?.id || '';
  const entranceRef = useRef<HTMLDivElement>(null);
  const entranceInView = useInView(entranceRef, { once: true });

  return (
    <SectionErrorBoundary section="Simulator">
    <div data-mode="simulator" className="simulator-bg relative">
      <VideoBackground src="/videos/modes/simulator.mp4" />
      <div className="simulator-glow" aria-hidden="true" />

      {/* Floating chat bubbles */}
      <SceneParticles className="simulator-particle" count={8} shapes={Array(8).fill(<ChatBubbleMiniSVG />)} />

      <div className="fixed top-6 left-6 z-30">
        <Link href={`/analysis/${id}`} className="flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 font-mono text-xs uppercase tracking-widest text-[#0084ff]/70 backdrop-blur-md transition-all hover:bg-black/60 hover:text-[#0084ff]">
          <ArrowLeft className="size-3.5" /> Hub
        </Link>
      </div>

      {/* ═══ SCENE 1: ENTRANCE ═══ */}
      <section ref={entranceRef} className="simulator-scene">
        <motion.div className="flex flex-col items-center text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={entranceInView ? { opacity: 1, scale: 1 } : {}} transition={{ duration: 0.8, delay: 0.2 }}>
            <ChatBubblesSVG className="mb-4 h-20 w-32 opacity-60" />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={entranceInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.5 }}>
            <h1 className="font-[var(--font-syne)] text-3xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
              <span className="bg-gradient-to-r from-[#0084ff] to-[#00c6ff] bg-clip-text text-transparent">SIMULATOR</span>
            </h1>
            <p className="mt-3 font-mono text-sm tracking-wide text-[#0084ff]/50">
              AI przewiduje jak druga osoba odpowie
            </p>
          </motion.div>

          {!hasQualitative && (
            <motion.div className="mt-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
              <div className="simulator-card px-4 py-4 text-center sm:px-8 sm:py-6">
                <Lock className="mx-auto mb-3 size-8 text-[#0084ff]/30" />
                <p className="font-[var(--font-syne)] text-lg font-bold text-white">Ta sekcja wymaga Analizy AI</p>
                <Link href={`/analysis/${id}/ai`} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-purple-300 transition-colors hover:bg-purple-500/20">
                  Przejdz do AI Deep Dive &rarr;
                </Link>
              </div>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* ═══ SCENE 2: SIMULATOR CONTENT ═══ */}
      {hasQualitative && (
        <section className="relative px-4 pb-32 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <div className="mb-6 flex items-center gap-3">
                <MessagesSquare className="size-5 text-[#0084ff]" />
                <h2 className="font-[var(--font-syne)] text-xl font-bold text-[#0084ff]">Symulacja Odpowiedzi</h2>
              </div>
              {/* Phone mockup frame */}
              <div className="simulator-phone-frame">
                <div className="simulator-phone-notch" />
                {/* Status bar */}
                <div className="flex items-center justify-between px-6 pb-3">
                  <span className="font-mono text-[10px] text-white/30">9:41</span>
                  <span className="font-mono text-[10px] font-medium text-[#0084ff]/60">{participants[1] || participants[0] || 'Kontakt'}</span>
                  <span className="font-mono text-[10px] text-white/30">●●●</span>
                </div>
                {/* Chat area */}
                <div className="min-h-[400px] px-4">
                  <ReplySimulator
                    conversation={conversation}
                    quantitative={quantitative}
                    qualitative={qualitative}
                    participants={participants}
                  />
                </div>
                {/* Home indicator */}
                <div className="mx-auto mt-4 h-1 w-32 rounded-full bg-white/10" />
              </div>
            </motion.div>
            <div className="mt-12 flex flex-wrap justify-center gap-6">
              <Link href={`/analysis/${id}/delusion`} className="font-mono text-xs uppercase tracking-widest text-[#8b5cf6]/50 transition-colors hover:text-[#8b5cf6]">Quiz Deluzji &rarr;</Link>
              <Link href={`/analysis/${id}`} className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#0084ff]/40 transition-colors hover:text-[#0084ff]"><ArrowLeft className="size-3" /> Centrum Dowodzenia</Link>
            </div>
          </div>
        </section>
      )}
    </div>
    </SectionErrorBoundary>
  );
}
