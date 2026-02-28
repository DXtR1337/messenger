'use client';

import { useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

import { useAnalysis } from '@/lib/analysis/analysis-context';
import SceneParticles, { MirrorShardSVG } from '@/components/shared/SceneParticles';
import VideoBackground from '@/components/shared/VideoBackground';

const DelusionQuiz = dynamic(() => import('@/components/analysis/DelusionQuiz'), { ssr: false });

// ── SVG: Mirror Frame ───────────────────────────────────────

function MirrorFrameSVG({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 100" fill="none" className={className} aria-hidden="true">
      {/* Outer ornate frame */}
      <rect x="10" y="10" width="60" height="80" rx="6" stroke="#8b5cf6" strokeWidth="1.5" opacity="0.3" />
      <rect x="14" y="14" width="52" height="72" rx="4" stroke="#ec4899" strokeWidth="0.5" opacity="0.2" />
      {/* Mirror surface with distortion lines */}
      <rect x="16" y="16" width="48" height="68" rx="3" fill="url(#mirrorGrad)" opacity="0.1" />
      {/* Distortion waves */}
      <path d="M20 35 Q40 30 60 35" stroke="#8b5cf6" strokeWidth="0.5" opacity="0.2" fill="none" />
      <path d="M20 50 Q40 55 60 50" stroke="#ec4899" strokeWidth="0.5" opacity="0.2" fill="none" />
      <path d="M20 65 Q40 60 60 65" stroke="#8b5cf6" strokeWidth="0.5" opacity="0.15" fill="none" />
      {/* Corner ornaments */}
      <circle cx="10" cy="10" r="3" fill="#8b5cf6" opacity="0.2" />
      <circle cx="70" cy="10" r="3" fill="#8b5cf6" opacity="0.2" />
      <circle cx="10" cy="90" r="3" fill="#ec4899" opacity="0.2" />
      <circle cx="70" cy="90" r="3" fill="#ec4899" opacity="0.2" />
      <defs>
        <linearGradient id="mirrorGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Confetti burst helper ────────────────────────────────────
const CONFETTI_COLORS = ['#8b5cf6', '#ec4899', '#a855f7', '#f472b6', '#c084fc', '#10b981', '#ffd700'];

function ConfettiBurst({ x, y }: { x: number; y: number }) {
  const particles = useMemo(() =>
    Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      angle: (i * 30) * (Math.PI / 180),
      distance: 40 + Math.random() * 60,
      rotation: Math.random() * 360,
    })),
  []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="delusion-confetti"
          style={{
            left: x,
            top: y,
            backgroundColor: p.color,
            rotate: p.rotation,
          }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{
            x: Math.cos(p.angle) * p.distance,
            y: Math.sin(p.angle) * p.distance - 20,
            scale: 1,
            opacity: 0,
          }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

// ── Delusion Result Display ─────────────────────────────────

function DelusionResult({ result }: { result: NonNullable<ReturnType<typeof useAnalysis>['qualitative']>['delusionQuiz'] }) {
  if (!result) return null;
  const wrongCount = result.answers?.filter(a => !a.isCorrect).length || 0;
  const crackClass = wrongCount >= 6 ? 'delusion-crack-3' : wrongCount >= 3 ? 'delusion-crack-2' : wrongCount >= 1 ? 'delusion-crack-1' : '';

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
      {/* Delusion Index Score */}
      <div className={`delusion-card relative overflow-hidden px-4 py-8 text-center sm:px-8 sm:py-12 ${crackClass}`}>
        {/* Glow ring */}
        <div
          className="pointer-events-none absolute left-1/2 top-8 size-24 -translate-x-1/2 rounded-full sm:size-32 md:size-40"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)', filter: 'blur(24px)' }}
          aria-hidden="true"
        />

        <p className="relative font-mono text-4xl font-extrabold tracking-tight sm:text-5xl md:text-7xl">
          <span className="bg-gradient-to-b from-[#8b5cf6] to-[#ec4899] bg-clip-text text-transparent">
            {result.delusionIndex}
          </span>
        </p>
        <p className="relative mt-2 font-mono text-xs uppercase tracking-[0.2em] text-[#8b5cf6]/60">Delusion Index</p>
        {result.label && (
          <p className="relative mt-4 font-[var(--font-syne)] text-base font-bold text-white">{result.label}</p>
        )}
      </div>

      {/* Per-answer reveal with shake/confetti */}
      {result.answers && result.answers.length > 0 && (
        <div className="mt-6 space-y-3">
          {result.answers.map((a, i) => {
            const userNum = parseFloat(a.userAnswer) || 0;
            const correctNum = parseFloat(a.correctAnswer) || 0;
            const delta = userNum - correctNum;
            const isWayOff = Math.abs(delta) > 20;

            return (
              <motion.div
                key={i}
                className={`delusion-card relative overflow-hidden p-4 ${isWayOff && !a.isCorrect ? 'delusion-shake' : ''}`}
                initial={{ opacity: 0, x: -15 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                {/* Confetti on exact match */}
                {a.isCorrect && <ConfettiBurst x={120} y={20} />}

                <p className="text-xs text-[#999]">{a.revealText || a.questionId}</p>
                <div className="mt-2 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-[#666]">Twoja odpowiedz</p>
                    <p className="font-mono text-lg font-bold text-white">{a.userAnswer}</p>
                  </div>
                  <div className="flex-1">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-[#666]">Rzeczywistosc</p>
                    <p className="font-mono text-lg font-bold text-[#8b5cf6]">{a.correctAnswer}</p>
                  </div>
                  <div className="flex-1">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-[#666]">Trafnosc</p>
                    <p className={`font-mono text-lg font-bold ${a.isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                      {a.isCorrect ? 'Trafione!' : `${delta > 0 ? '+' : ''}${delta.toFixed(0)}%`}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ═══ MAIN DELUSION PAGE ══════════════════════════════════════

export default function DelusionModePage() {
  const { analysis, quantitative, qualitative, conversation, onDelusionComplete } = useAnalysis();
  const id = (analysis as { id?: string })?.id || '';
  const delusionResult = qualitative?.delusionQuiz;
  const entranceRef = useRef<HTMLDivElement>(null);
  const entranceInView = useInView(entranceRef, { once: true });

  return (
    <div data-mode="delusion" className="delusion-bg relative">
      <VideoBackground src="/videos/modes/delusion.mp4" />
      <div className="delusion-glow" aria-hidden="true" />

      {/* Floating mirror shards */}
      <SceneParticles className="delusion-particle" count={8} shapes={Array(8).fill(<MirrorShardSVG />)} />
      {/* Ripple rings */}
      <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden="true">
        <div className="delusion-ripple delusion-ripple-1" />
        <div className="delusion-ripple delusion-ripple-2" />
        <div className="delusion-ripple delusion-ripple-3" />
      </div>

      <div className="fixed top-6 left-6 z-30">
        <Link href={`/analysis/${id}`} className="flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 font-mono text-xs uppercase tracking-widest text-[#8b5cf6]/70 backdrop-blur-md transition-all hover:bg-black/60 hover:text-[#8b5cf6]">
          <ArrowLeft className="size-3.5" /> Hub
        </Link>
      </div>

      {/* ═══ SCENE 1: INTRO ═══ */}
      <section ref={entranceRef} className="delusion-scene">
        <motion.div className="flex flex-col items-center text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={entranceInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            <MirrorFrameSVG className="mb-4 h-28 opacity-50" />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={entranceInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.5 }}>
            <h1 className="font-[var(--font-syne)] text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              Czy znasz siebie tak dobrze,
              <br />
              <span className="bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] bg-clip-text text-transparent">jak myslisz?</span>
            </h1>
            <p className="mt-3 font-mono text-sm tracking-wide text-[#8b5cf6]/50">Quiz Deluzji</p>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══ SCENE 2: QUIZ / RESULT ═══ */}
      <section className="relative px-4 pb-32 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl">
          {delusionResult ? (
            <DelusionResult result={delusionResult} />
          ) : (
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <div className="delusion-card p-6">
                <DelusionQuiz
                  quantitative={quantitative}
                  conversation={conversation}
                  onComplete={onDelusionComplete}
                />
              </div>
            </motion.div>
          )}

          <div className="mt-12 flex flex-wrap justify-center gap-6">
            <Link href={`/analysis/${id}/cps`} className="font-mono text-xs uppercase tracking-widest text-[#10b981]/50 transition-colors hover:text-[#10b981]">CPS Screening &rarr;</Link>
            <Link href={`/analysis/${id}`} className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#8b5cf6]/40 transition-colors hover:text-[#8b5cf6]"><ArrowLeft className="size-3" /> Command Center</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
