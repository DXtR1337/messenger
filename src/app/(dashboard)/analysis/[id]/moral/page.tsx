'use client';

import { useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { ArrowLeft, Compass, ChevronDown } from 'lucide-react';

import { useAnalysis } from '@/lib/analysis/analysis-context';
import { SectionErrorBoundary } from '@/components/shared/SectionErrorBoundary';
import SceneParticles from '@/components/shared/SceneParticles';
import VideoBackground from '@/components/shared/VideoBackground';

const MoralFoundationsButton = dynamic(() => import('@/components/analysis/MoralFoundationsButton'), {
  ssr: false, loading: () => <div className="brand-shimmer h-48" />,
});
const MoralFoundationsCard = dynamic(() => import('@/components/analysis/MoralFoundationsCard'), {
  ssr: false, loading: () => <div className="brand-shimmer h-48" />,
});

// ── SVG: Compass Rose ────────────────────────────────────────

function CompassRoseSVG({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} aria-hidden="true">
      {/* Outer ring */}
      <circle cx="50" cy="50" r="45" stroke="#f97316" strokeWidth="0.5" opacity="0.2" />
      <circle cx="50" cy="50" r="40" stroke="#eab308" strokeWidth="0.3" opacity="0.15" />
      {/* 6 foundation points */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i * 60 - 90) * (Math.PI / 180);
        const xOuter = 50 + 42 * Math.cos(angle);
        const yOuter = 50 + 42 * Math.sin(angle);
        const xInner = 50 + 15 * Math.cos(angle);
        const yInner = 50 + 15 * Math.sin(angle);
        const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#f97316'];
        return (
          <g key={i}>
            <line x1={xInner} y1={yInner} x2={xOuter} y2={yOuter} stroke={colors[i]} strokeWidth="0.5" opacity="0.3" />
            <circle cx={xOuter} cy={yOuter} r="3" fill={colors[i]} opacity="0.3" />
          </g>
        );
      })}
      {/* Inner hexagon fill */}
      <polygon
        points="50,8 86,29 86,71 50,92 14,71 14,29"
        stroke="#f97316"
        strokeWidth="0.3"
        opacity="0.1"
        fill="none"
      />
      {/* Center compass point */}
      <circle cx="50" cy="50" r="4" fill="#f97316" opacity="0.2" />
      <circle cx="50" cy="50" r="2" fill="#eab308" opacity="0.4" />
      {/* North arrow */}
      <path d="M50 50 L48 20 L50 15 L52 20 Z" fill="#f97316" opacity="0.3" />
    </svg>
  );
}

// ═══ MAIN MORAL PAGE ═════════════════════════════════════════

export default function MoralModePage() {
  const { analysis, conversation, qualitative, participants, onMoralFoundationsComplete } = useAnalysis();
  const id = (analysis as { id?: string })?.id || '';
  const entranceRef = useRef<HTMLDivElement>(null);
  const entranceInView = useInView(entranceRef, { once: true });
  const hasResult = !!qualitative?.moralFoundations;

  return (
    <SectionErrorBoundary section="MoralFoundations">
    <div data-mode="moral" className="moral-bg relative">
      <VideoBackground src="/videos/modes/moral.mp4" />
      <div className="pointer-events-none fixed inset-0 z-[-1]" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(249,115,22,0.08) 0%, transparent 60%)' }} aria-hidden="true" />

      {/* Orbiting foundation particles */}
      <SceneParticles className="moral-particle" count={6} />

      <div className="fixed top-6 left-6 z-30">
        <Link href={`/analysis/${id}`} className="flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 font-mono text-xs uppercase tracking-widest text-[#f97316]/70 backdrop-blur-md transition-all hover:bg-black/60 hover:text-[#f97316]">
          <ArrowLeft className="size-3.5" /> Hub
        </Link>
      </div>

      {/* ═══ SCENE 1: ENTRANCE ═══ */}
      <section ref={entranceRef} className="moral-scene">
        <motion.div className="flex flex-col items-center text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.6, rotate: -45 }}
            animate={entranceInView ? { opacity: 1, scale: 1, rotate: 0 } : {}}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          >
            <CompassRoseSVG className="mb-4 size-28 opacity-50" />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={entranceInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.5 }}>
            <h1 className="font-[var(--font-syne)] text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              <span className="bg-gradient-to-r from-[#f97316] to-[#eab308] bg-clip-text text-transparent">MORAL FOUNDATIONS</span>
            </h1>
            <p className="mt-2 font-mono text-sm tracking-wide text-[#f97316]/50">Teoria fundamentow moralnych Haidta</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-[#f97316]/30">6 wymiarow wartosci</p>
          </motion.div>

          {hasResult ? (
            <motion.div className="mt-12 flex flex-col items-center gap-2 text-[#f97316]/40" animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Zobacz wyniki</span>
              <ChevronDown className="size-5" />
            </motion.div>
          ) : (
            <motion.div className="mt-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
              <div className="moral-card px-4 py-4 text-center sm:px-8 sm:py-6">
                <Compass className="mx-auto mb-3 size-8 text-[#f97316]/40" />
                <MoralFoundationsButton conversation={conversation} onComplete={onMoralFoundationsComplete} />
              </div>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* ═══ SCENE 2: RESULTS ═══ */}
      {hasResult && qualitative?.moralFoundations && (
        <section className="relative px-4 pb-32 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <div className="mb-6 flex items-center gap-3">
                <Compass className="size-5 text-[#f97316]" />
                <h2 className="font-[var(--font-syne)] text-xl font-bold text-[#f97316]">Mapa Wartosci</h2>
              </div>
              <div className="moral-card p-6">
                <MoralFoundationsCard result={qualitative.moralFoundations} participants={participants} />
              </div>
            </motion.div>

            <div className="mt-12 flex flex-wrap justify-center gap-6">
              <Link href={`/analysis/${id}/emotions`} className="font-mono text-xs uppercase tracking-widest text-[#06b6d4]/50 transition-colors hover:text-[#06b6d4]">Emotion Causes &rarr;</Link>
              <Link href={`/analysis/${id}`} className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#f97316]/40 transition-colors hover:text-[#f97316]"><ArrowLeft className="size-3" /> Command Center</Link>
            </div>
          </div>
        </section>
      )}
    </div>
    </SectionErrorBoundary>
  );
}
