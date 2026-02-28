'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { ArrowLeft, ScanLine, Lock, Shield, User } from 'lucide-react';

import { useAnalysis } from '@/lib/analysis/analysis-context';
import { SectionErrorBoundary } from '@/components/shared/SectionErrorBoundary';
import { useCPSAnalysis } from '@/hooks/useCPSAnalysis';
import SceneParticles, { DataNodeSVG } from '@/components/shared/SceneParticles';
import VideoBackground from '@/components/shared/VideoBackground';

const CPSScreener = dynamic(
  () => import('@/components/analysis/CPSScreener').then(m => ({ default: m.CPSScreener })),
  { ssr: false, loading: () => <div className="brand-shimmer h-48" /> },
);
const GottmanHorsemen = dynamic(() => import('@/components/analysis/GottmanHorsemen'), {
  ssr: false, loading: () => <div className="brand-shimmer h-48" />,
});

// ── SVG: Radar Chart ─────────────────────────────────────────

function RadarSVG({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} aria-hidden="true">
      {/* Outer rings */}
      <circle cx="50" cy="50" r="45" stroke="#10b981" strokeWidth="0.3" opacity="0.2" />
      <circle cx="50" cy="50" r="35" stroke="#10b981" strokeWidth="0.3" opacity="0.15" />
      <circle cx="50" cy="50" r="25" stroke="#10b981" strokeWidth="0.3" opacity="0.1" />
      <circle cx="50" cy="50" r="15" stroke="#14b8a6" strokeWidth="0.3" opacity="0.08" />
      {/* 6 axis lines */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i * 60 - 90) * (Math.PI / 180);
        const x = 50 + 45 * Math.cos(angle);
        const y = 50 + 45 * Math.sin(angle);
        return <line key={i} x1="50" y1="50" x2={x} y2={y} stroke="#10b981" strokeWidth="0.3" opacity="0.15" />;
      })}
      {/* Data polygon */}
      <polygon
        points="50,12 82,30 82,70 50,88 18,70 18,30"
        stroke="#10b981"
        strokeWidth="0.5"
        opacity="0.3"
        fill="#10b981"
        fillOpacity="0.05"
      />
      {/* Partial fill polygon */}
      <polygon
        points="50,20 72,35 68,65 50,78 32,62 28,38"
        stroke="#14b8a6"
        strokeWidth="0.8"
        opacity="0.4"
        fill="#10b981"
        fillOpacity="0.08"
      />
      {/* Axis dots */}
      {[
        [50, 20], [72, 35], [68, 65], [50, 78], [32, 62], [28, 38],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2" fill="#10b981" opacity="0.5" />
      ))}
      {/* Pulse at center */}
      <circle cx="50" cy="50" r="3" fill="#10b981" opacity="0.3">
        <animate attributeName="r" values="2;5;2" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0.1;0.4" dur="3s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

// ═══ MAIN CPS PAGE ══════════════════════════════════════════

export default function CPSModePage() {
  const {
    qualitative,
    conversation,
    quantitative,
    participants,
    hasQualitative,
    gottmanResult,
    isServerView,
    onCPSComplete,
    startOperation,
    updateOperation,
    stopOperation,
  } = useAnalysis();
  const analysis = useAnalysis().analysis;
  const id = (analysis as { id?: string })?.id || '';

  const ops = useMemo(() => ({ startOperation, updateOperation, stopOperation }), [startOperation, updateOperation, stopOperation]);
  const [selectedParticipant, setSelectedParticipant] = useState(participants[0] ?? '');
  const entranceRef = useRef<HTMLDivElement>(null);
  const entranceInView = useInView(entranceRef, { once: true });

  const { runCPS, isLoading, progress, result: hookResult } = useCPSAnalysis({
    conversation,
    quantitative,
    participantName: selectedParticipant,
    ops,
  });

  const persisted = qualitative?.cps;
  useEffect(() => {
    if (hookResult && !persisted) {
      onCPSComplete(hookResult);
    }
  }, [hookResult, persisted, onCPSComplete]);

  const cpsResult = persisted ?? hookResult;

  const messageCount = conversation.messages.length;
  const timestamps = conversation.messages.map(m => m.timestamp);
  const timespanMs = timestamps.length >= 2
    ? Math.max(...timestamps) - Math.min(...timestamps)
    : 0;

  const completedPasses: number[] = [];
  if (qualitative?.pass1) completedPasses.push(1);
  if (qualitative?.pass2) completedPasses.push(2);
  if (qualitative?.pass3) completedPasses.push(3);
  if (qualitative?.pass4) completedPasses.push(4);

  const reasonsCannotRun: string[] = [];
  if (!hasQualitative) reasonsCannotRun.push('Wymaga ukonczonej analizy AI');
  if (messageCount < 100) reasonsCannotRun.push('Minimum 100 wiadomosci');
  const canRun = hasQualitative && !cpsResult && !isLoading && reasonsCannotRun.length === 0;

  const handleRunCPS = useCallback(() => {
    runCPS();
  }, [runCPS]);

  return (
    <SectionErrorBoundary section="CPS">
    <div data-mode="cps" className="cps-bg relative">
      <VideoBackground src="/videos/modes/cps.mp4" />
      <div className="cps-glow" aria-hidden="true" />

      {/* Pulsing data nodes */}
      <SceneParticles className="cps-particle" count={8} shapes={Array(8).fill(<DataNodeSVG />)} />

      <div className="fixed top-6 left-6 z-30">
        <Link href={`/analysis/${id}`} className="flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 font-mono text-xs uppercase tracking-widest text-[#10b981]/70 backdrop-blur-md transition-all hover:bg-black/60 hover:text-[#10b981]">
          <ArrowLeft className="size-3.5" /> Hub
        </Link>
      </div>

      {/* ═══ SCENE 1: ENTRANCE ═══ */}
      <section ref={entranceRef} className="cps-scene">
        <motion.div className="flex flex-col items-center text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={entranceInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            <RadarSVG className="mb-4 size-28 opacity-50" />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={entranceInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.5 }}>
            <h1 className="font-[var(--font-syne)] text-3xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
              <span className="bg-gradient-to-r from-[#10b981] to-[#14b8a6] bg-clip-text text-transparent">CPS</span>
            </h1>
            <p className="mt-2 font-mono text-sm tracking-wide text-[#10b981]/50">Communication Pattern Screening</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-[#10b981]/30">63 wzorcow komunikacji</p>
          </motion.div>

          {!hasQualitative && (
            <motion.div className="mt-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
              <div className="cps-card px-4 py-4 text-center sm:px-8 sm:py-6">
                <Lock className="mx-auto mb-3 size-8 text-[#10b981]/30" />
                <p className="font-[var(--font-syne)] text-lg font-bold text-white">Ta sekcja wymaga Analizy AI</p>
                <Link href={`/analysis/${id}/ai`} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-emerald-300 transition-colors hover:bg-emerald-500/20">
                  Przejdz do AI Deep Dive &rarr;
                </Link>
              </div>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* ═══ SCENE 2: CPS SCREENER ═══ */}
      <section className="relative px-4 pb-32 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl">
          {hasQualitative && (
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <div className="mb-6 flex items-center gap-3">
                <ScanLine className="size-5 text-[#10b981]" />
                <h2 className="font-[var(--font-syne)] text-xl font-bold text-[#10b981]">Screening Wzorcow</h2>
              </div>

              {/* Participant selector */}
              {participants.length > 1 && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <User className="size-4 text-[#10b981]/50" />
                  <span className="font-mono text-xs uppercase tracking-widest text-[#10b981]/40">Analizuj:</span>
                  {participants.map((name) => (
                    <button
                      key={name}
                      onClick={() => setSelectedParticipant(name)}
                      disabled={isLoading}
                      className={`rounded-full px-4 py-1.5 font-mono text-xs transition-all ${
                        selectedParticipant === name
                          ? 'bg-[#10b981]/20 text-[#10b981] ring-1 ring-[#10b981]/40'
                          : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}

              <div className="cps-card p-6">
                <CPSScreener
                  cpsResult={cpsResult}
                  onRunCPS={handleRunCPS}
                  isLoading={isLoading}
                  progress={progress}
                  messageCount={messageCount}
                  timespanMs={timespanMs}
                  completedPasses={completedPasses}
                  canRun={canRun}
                  reasonsCannotRun={reasonsCannotRun}
                  participantName={selectedParticipant}
                />
              </div>
            </motion.div>
          )}

          {/* Gottman Four Horsemen */}
          {gottmanResult && !isServerView && (
            <motion.div className="mt-8" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}>
              <div className="mb-6 flex items-center gap-3">
                <Shield className="size-5 text-[#14b8a6]" />
                <h2 className="font-[var(--font-syne)] text-xl font-bold text-[#14b8a6]">Gottman — Czterech Jezdzców</h2>
              </div>
              <div className="cps-card p-6">
                <GottmanHorsemen result={gottmanResult} />
              </div>
            </motion.div>
          )}

          <div className="mt-12 flex flex-wrap justify-center gap-6">
            <Link href={`/analysis/${id}/moral`} className="font-mono text-xs uppercase tracking-widest text-[#f97316]/50 transition-colors hover:text-[#f97316]">Moral Foundations &rarr;</Link>
            <Link href={`/analysis/${id}`} className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#10b981]/40 transition-colors hover:text-[#10b981]"><ArrowLeft className="size-3" /> Command Center</Link>
          </div>
        </div>
      </section>
    </div>
    </SectionErrorBoundary>
  );
}
