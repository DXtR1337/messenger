'use client';

import { useRef, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { ArrowLeft, Search, ChevronDown } from 'lucide-react';

import { useAnalysis } from '@/lib/analysis/analysis-context';
import { SectionErrorBoundary } from '@/components/shared/SectionErrorBoundary';
import { useSubtextAnalysis } from '@/hooks/useSubtextAnalysis';
import SceneParticles from '@/components/shared/SceneParticles';
import VideoBackground from '@/components/shared/VideoBackground';

const SubtextDecoder = dynamic(() => import('@/components/analysis/SubtextDecoder'), { ssr: false });

// ── SVG: Decoder Wheel ──────────────────────────────────────

function DecoderWheelSVG({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="45" stroke="#00ff41" strokeWidth="0.5" opacity="0.3" />
      <circle cx="50" cy="50" r="38" stroke="#00ff41" strokeWidth="0.3" opacity="0.2" />
      <circle cx="50" cy="50" r="30" stroke="#39ff14" strokeWidth="0.3" opacity="0.15" />
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i * 15 * Math.PI) / 180;
        const x1 = 50 + 42 * Math.cos(angle);
        const y1 = 50 + 42 * Math.sin(angle);
        const x2 = 50 + 45 * Math.cos(angle);
        const y2 = 50 + 45 * Math.sin(angle);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#00ff41" strokeWidth="0.5" opacity={i % 6 === 0 ? 0.5 : 0.2} />;
      })}
      <circle cx="50" cy="50" r="3" fill="#00ff41" opacity="0.4" />
      <line x1="50" y1="50" x2="50" y2="8" stroke="#00ff41" strokeWidth="0.5" opacity="0.6">
        <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="8s" repeatCount="indefinite" />
      </line>
    </svg>
  );
}

// ═══ MAIN SUBTEXT PAGE ═══════════════════════════════════════

export default function SubtextModePage() {
  const {
    analysis,
    qualitative,
    conversation,
    quantitative,
    hasQualitative,
    onSubtextComplete,
    startOperation,
    updateOperation,
    stopOperation,
  } = useAnalysis();

  const id = (analysis as { id?: string })?.id || '';
  const ops = useMemo(() => ({ startOperation, updateOperation, stopOperation }), [startOperation, updateOperation, stopOperation]);

  const { runSubtext, isLoading, progress, result: hookResult, error } = useSubtextAnalysis({
    conversation,
    quantitative,
    qualitative,
    ops,
  });

  const persisted = qualitative?.subtext;
  useEffect(() => {
    if (hookResult && !persisted) {
      onSubtextComplete(hookResult);
    }
  }, [hookResult, persisted, onSubtextComplete]);

  const subtextResult = persisted ?? hookResult;
  const canRun = hasQualitative && !subtextResult && !isLoading;

  const entranceRef = useRef<HTMLDivElement>(null);
  const entranceInView = useInView(entranceRef, { once: true });

  return (
    <SectionErrorBoundary section="Subtext">
    <div data-mode="subtext" className="subtext-bg relative">
      <VideoBackground src="/videos/modes/subtext.mp4" />
      <div className="subtext-glow" aria-hidden="true" />
      <div className="subtext-scanlines" aria-hidden="true" />

      {/* Matrix rain particles */}
      <SceneParticles className="subtext-particle" count={12} />

      {/* Back */}
      <div className="fixed top-6 left-6 z-30">
        <Link
          href={`/analysis/${id}`}
          className="flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 font-mono text-xs uppercase tracking-widest text-[#00ff41]/70 backdrop-blur-md transition-all hover:bg-black/60 hover:text-[#00ff41]"
        >
          <ArrowLeft className="size-3.5" />
          Hub
        </Link>
      </div>

      {/* ═══ SCENE 1: ENTRANCE ═══ */}
      <section ref={entranceRef} className="subtext-scene">
        <motion.div className="flex flex-col items-center text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.6, rotate: -90 }}
            animate={entranceInView ? { opacity: 1, scale: 1, rotate: 0 } : {}}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          >
            <DecoderWheelSVG className="mb-4 size-28 opacity-50" />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={entranceInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.5 }}>
            <h1 className="subtext-glitch font-[var(--font-syne)] text-3xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
              <span className="bg-gradient-to-r from-[#00ff41] to-[#39ff14] bg-clip-text text-transparent">DECODER</span>
            </h1>
            <p className="mt-2 font-mono text-sm tracking-wide text-[#00ff41]/50">Translator Podtekstow</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-[#00ff41]/30">Dekodowanie ukrytych znaczen</p>
          </motion.div>

          {hasQualitative ? (
            <motion.div className="mt-12 flex flex-col items-center gap-2 text-[#00ff41]/40" animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Rozpocznij dekodowanie</span>
              <ChevronDown className="size-5" />
            </motion.div>
          ) : (
            <motion.div className="mt-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
              <div className="subtext-card px-4 py-4 text-center sm:px-8 sm:py-6">
                <Search className="mx-auto mb-3 size-8 text-[#00ff41]/40" />
                <p className="font-[var(--font-syne)] text-lg font-bold text-white">Decoder zablokowany</p>
                <p className="mt-2 font-mono text-xs text-[#888]">
                  Uruchom Analize AI w{' '}
                  <Link href={`/analysis/${id}/ai`} className="text-purple-400 hover:underline">AI Deep Dive</Link>
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* ═══ SCENE 2: DECODER CONTENT ═══ */}
      {hasQualitative && (
        <section className="relative px-4 pb-32 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-4xl">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <div className="mb-6 flex items-center gap-3">
                <Search className="size-5 text-[#00ff41]" />
                <h2 className="font-[var(--font-syne)] text-xl font-bold text-[#00ff41]">Tablica Dekodowania</h2>
              </div>
              <div className="subtext-card p-6">
                <SubtextDecoder
                  subtextResult={subtextResult}
                  onRunSubtext={runSubtext}
                  isLoading={isLoading}
                  progress={progress}
                  canRun={canRun}
                  error={error}
                />
              </div>
            </motion.div>

            <div className="mt-12 flex flex-wrap justify-center gap-6">
              <Link href={`/analysis/${id}/dating`} className="font-mono text-xs uppercase tracking-widest text-[#ff006e]/50 transition-colors hover:text-[#ff006e]">
                Dating Profile &rarr;
              </Link>
              <Link href={`/analysis/${id}`} className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#00ff41]/40 transition-colors hover:text-[#00ff41]">
                <ArrowLeft className="size-3" /> Centrum Dowodzenia
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
    </SectionErrorBoundary>
  );
}
