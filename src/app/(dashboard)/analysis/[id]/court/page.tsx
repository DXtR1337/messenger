'use client';

import { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronDown, Shield, Scale, Download, Share2 } from 'lucide-react';

import Image from 'next/image';
import { useAnalysis } from '@/lib/analysis/analysis-context';
import { SectionErrorBoundary } from '@/components/shared/SectionErrorBoundary';
import type { CourtResult, CourtCharge, PersonVerdict } from '@/lib/analysis/court-prompts';
import SceneParticles, { CourtPaperSVG } from '@/components/shared/SceneParticles';
import VideoBackground from '@/components/shared/VideoBackground';

const ChatCourtButton = dynamic(() => import('@/components/analysis/ChatCourtButton'), { ssr: false });

// ── SVG Inline Components ──────────────────────────────────

function ScalesSVG({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" fill="none" className={className} aria-hidden="true">
      {/* Pillar */}
      <rect x="94" y="40" width="12" height="100" rx="3" fill="#8b4513" opacity="0.6" />
      {/* Base */}
      <rect x="60" y="135" width="80" height="8" rx="4" fill="#8b4513" opacity="0.4" />
      {/* Top ornament */}
      <circle cx="100" cy="38" r="10" fill="#d4a853" opacity="0.8" />
      {/* Beam */}
      <rect x="25" y="45" width="150" height="5" rx="2.5" fill="#d4a853" opacity="0.7" />
      {/* Left pan chain */}
      <line x1="50" y1="50" x2="50" y2="80" stroke="#d4a853" strokeWidth="2" opacity="0.5" />
      {/* Right pan chain */}
      <line x1="150" y1="50" x2="150" y2="80" stroke="#d4a853" strokeWidth="2" opacity="0.5" />
      {/* Left pan */}
      <path d="M30 80 Q50 95 70 80" stroke="#d4a853" strokeWidth="2.5" fill="rgba(212,168,83,0.1)" />
      {/* Right pan */}
      <path d="M130 80 Q150 95 170 80" stroke="#d4a853" strokeWidth="2.5" fill="rgba(212,168,83,0.1)" />
    </svg>
  );
}

function CourtDoorsSVG({ open = false }: { open?: boolean }) {
  return (
    <svg viewBox="0 0 300 200" fill="none" overflow="visible" className="w-full max-w-[80vw] sm:max-w-md" aria-hidden="true">
      {/* Frame */}
      <rect x="50" y="10" width="200" height="180" rx="4" stroke="#d4a853" strokeWidth="2" fill="none" opacity="0.4" />
      {/* Arch */}
      <path d="M50 60 Q150 0 250 60" stroke="#d4a853" strokeWidth="2" fill="none" opacity="0.4" />
      {/* Center seam */}
      <line x1="150" y1="15" x2="150" y2="185" stroke="#d4a853" strokeWidth="0.5" opacity="0.3" />

      {/* Left door group */}
      <motion.g
        animate={{ x: open ? -95 : 0 }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
      >
        <rect x="55" y="15" width="95" height="170" rx="2"
          fill="rgba(139,69,19,0.55)" stroke="#d4a853" strokeWidth="2" />
        {/* Upper panel */}
        <rect x="63" y="23" width="79" height="72" rx="1"
          fill="none" stroke="#d4a853" strokeWidth="0.8" opacity="0.4" />
        {/* Lower panel */}
        <rect x="63" y="105" width="79" height="72" rx="1"
          fill="none" stroke="#d4a853" strokeWidth="0.8" opacity="0.4" />
        {/* Handle */}
        <circle cx="143" cy="100" r="4" fill="#d4a853" opacity="0.8" />
      </motion.g>

      {/* Right door group */}
      <motion.g
        animate={{ x: open ? 95 : 0 }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
      >
        <rect x="150" y="15" width="95" height="170" rx="2"
          fill="rgba(139,69,19,0.55)" stroke="#d4a853" strokeWidth="2" />
        {/* Upper panel */}
        <rect x="158" y="23" width="79" height="72" rx="1"
          fill="none" stroke="#d4a853" strokeWidth="0.8" opacity="0.4" />
        {/* Lower panel */}
        <rect x="158" y="105" width="79" height="72" rx="1"
          fill="none" stroke="#d4a853" strokeWidth="0.8" opacity="0.4" />
        {/* Handle */}
        <circle cx="157" cy="100" r="4" fill="#d4a853" opacity="0.8" />
      </motion.g>
    </svg>
  );
}

// ── Severity helpers ────────────────────────────────────────

const SEVERITY_LABELS: Record<string, string> = {
  wykroczenie: 'WYKROCZENIE',
  wystepek: 'WYSTĘPEK',
  zbrodnia: 'ZBRODNIA',
};

const SEVERITY_COLORS: Record<string, string> = {
  wykroczenie: '#f59e0b',
  wystepek: '#f97316',
  zbrodnia: '#ef4444',
};

const SEVERITY_WIDTHS: Record<string, string> = {
  wykroczenie: '33%',
  wystepek: '66%',
  zbrodnia: '100%',
};

// ── Animated Section wrapper ────────────────────────────────

function CourtSection({ children, className = '', delay = 0 }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

// ── Charge Card ─────────────────────────────────────────────

function ChargeCard({ charge, index }: { charge: CourtCharge; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <CourtSection delay={index * 0.12}>
      <div className="court-charge-card group">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="mb-2 flex items-center gap-3 flex-wrap">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#d4a853]/60">
                {charge.id}
              </span>
              <span
                className="inline-block rounded-sm px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em]"
                style={{
                  color: SEVERITY_COLORS[charge.severity] || '#f59e0b',
                  backgroundColor: `${SEVERITY_COLORS[charge.severity] || '#f59e0b'}15`,
                  border: `1px solid ${SEVERITY_COLORS[charge.severity] || '#f59e0b'}30`,
                }}
              >
                {SEVERITY_LABELS[charge.severity] || charge.severity}
              </span>
              {charge.defendant && (
                <span className="font-mono text-[10px] text-[#888] uppercase tracking-widest">
                  vs {charge.defendant}
                </span>
              )}
            </div>

            <h4 className="font-[var(--font-syne)] text-lg font-bold tracking-tight text-white">
              {charge.charge}
            </h4>

            {charge.article && (
              <p className="mt-1 font-mono text-[11px] italic text-[#d4a853]/50">
                {charge.article}
              </p>
            )}
          </div>
        </div>

        {/* Severity bar */}
        <div className="mt-4 court-severity-bar">
          <div
            className={`court-severity-fill court-severity-${charge.severity}`}
            style={{ width: SEVERITY_WIDTHS[charge.severity] || '33%' }}
          />
        </div>

        {/* Evidence */}
        {charge.evidence && charge.evidence.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-[#d4a853]/60 transition-colors hover:text-[#d4a853]"
            >
              <ChevronDown className={`size-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              {charge.evidence.length} dowod{charge.evidence.length === 1 ? '' : charge.evidence.length < 5 ? 'y' : 'ow'}
            </button>
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-2">
                    {charge.evidence.map((ev, i) => (
                      <div key={i} className="court-quote text-sm leading-relaxed">
                        &ldquo;{ev}&rdquo;
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </CourtSection>
  );
}

// ── Person Verdict Card ─────────────────────────────────────

function PersonVerdictCard({ name, pv, delay = 0 }: { name: string; pv: PersonVerdict; delay?: number }) {
  const verdictColor = pv.verdict === 'winny' ? '#ef4444' : pv.verdict === 'niewinny' ? '#10b981' : '#f59e0b';
  const verdictLabel = pv.verdict === 'winny' ? 'WINNY' : pv.verdict === 'niewinny' ? 'NIEWINNY' : 'WARUNKOWO';

  return (
    <CourtSection delay={delay}>
      <div className="relative overflow-hidden rounded-xl border border-[#d4a853]/10 bg-[#1a1510]/70 p-6 backdrop-blur-lg">
        {/* Mugshot-style top bar */}
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: verdictColor }} />

        <div className="flex items-center gap-4 mb-4">
          {/* Avatar */}
          <div
            className="flex h-14 w-14 items-center justify-center rounded-lg font-[var(--font-syne)] text-xl font-bold text-black"
            style={{ background: `linear-gradient(135deg, ${verdictColor}, ${verdictColor}88)` }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="font-[var(--font-syne)] text-lg font-bold text-white">{name}</h4>
            {pv.mugshotLabel && (
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: verdictColor }}>
                {pv.mugshotLabel}
              </span>
            )}
          </div>
          {/* Verdict badge */}
          <div className="ml-auto">
            <span
              className="inline-block rounded-md px-3 py-1.5 font-mono text-xs font-extrabold uppercase tracking-widest"
              style={{
                color: verdictColor,
                border: `2px solid ${verdictColor}`,
                backgroundColor: `${verdictColor}10`,
              }}
            >
              {verdictLabel}
            </span>
          </div>
        </div>

        {pv.mainCharge && (
          <div className="mb-3">
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-[#d4a853]/50">
              Glowny zarzut
            </span>
            <p className="mt-1 text-sm text-[#ccc]">{pv.mainCharge}</p>
          </div>
        )}

        {pv.sentence && (
          <div className="mb-3">
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-[#d4a853]/50">
              Wyrok
            </span>
            <p className="mt-1 text-sm text-white font-medium">{pv.sentence}</p>
          </div>
        )}

        {pv.funFact && (
          <div className="mt-4 rounded-lg bg-[#d4a853]/5 p-3 border border-[#d4a853]/10">
            <p className="text-xs text-[#d4a853]/70 italic">
              {pv.funFact}
            </p>
          </div>
        )}
      </div>
    </CourtSection>
  );
}

// ═══ MAIN COURT PAGE ════════════════════════════════════════

export default function CourtModePage() {
  const {
    analysis,
    qualitative,
    conversation,
    participants,
    onCourtComplete,
  } = useAnalysis();

  const [doorsOpen, setDoorsOpen] = useState(false);
  const [gavelStruck, setGavelStruck] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [verdictRevealed, setVerdictRevealed] = useState(false);
  const entranceRef = useRef<HTMLDivElement>(null);
  const verdictRef = useRef<HTMLDivElement>(null);
  const verdictInView = useInView(verdictRef, { once: true });
  const entranceInView = useInView(entranceRef, { once: true });

  const courtResult = qualitative?.courtTrial as CourtResult | undefined;
  const hasResult = !!courtResult;

  // Auto-open doors after mount
  useEffect(() => {
    if (entranceInView) {
      const t1 = setTimeout(() => setDoorsOpen(true), 600);
      const t2 = setTimeout(() => {
        setGavelStruck(true);
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
      }, 1800);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [entranceInView]);

  // Verdict countdown: 3…2…1…WYROK!
  useEffect(() => {
    if (!verdictInView || verdictRevealed || !hasResult) return;
    let step = 3;
    setCountdown(step);
    const interval = setInterval(() => {
      step--;
      if (step > 0) {
        setCountdown(step);
      } else {
        setCountdown(0); // 0 = "WYROK!"
        clearInterval(interval);
        setTimeout(() => {
          setVerdictRevealed(true);
          setShaking(true);
          setTimeout(() => setShaking(false), 500);
        }, 800);
      }
    }, 800);
    return () => clearInterval(interval);
  }, [verdictInView, verdictRevealed, hasResult]);

  const analysisId = (analysis as { id?: string })?.id || '';

  return (
    <SectionErrorBoundary section="Court">
    <div data-mode="court" className={`court-bg court-wood-texture relative ${shaking ? 'court-shake' : ''}`}>
      <VideoBackground src="/videos/modes/court.mp4" />
      {/* Floating paper particles */}
      <SceneParticles className="court-particle" count={8} shapes={Array(8).fill(<CourtPaperSVG />)} />
      {/* Dust motes */}
      <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`court-dust court-dust-${i + 1}`} />
        ))}
      </div>

      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 z-[-1]"
        style={{
          background: 'radial-gradient(ellipse at 50% 20%, rgba(212,168,83,0.06) 0%, transparent 60%)',
        }}
        aria-hidden="true"
      />

      {/* Back navigation */}
      <div className="fixed top-6 left-6 z-30">
        <Link
          href={`/analysis/${analysisId}`}
          className="flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 font-mono text-xs uppercase tracking-widest text-[#d4a853]/70 backdrop-blur-md transition-all hover:bg-black/60 hover:text-[#d4a853]"
        >
          <ArrowLeft className="size-3.5" />
          Hub
        </Link>
      </div>

      {/* ═══ SCENE 1: ENTRANCE ═══ */}
      <section ref={entranceRef} className="court-scene">
        <motion.div
          className="flex flex-col items-center text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          {/* Court doors SVG */}
          <CourtDoorsSVG open={doorsOpen} />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={doorsOpen ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8"
          >
            {/* Case number */}
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-[#d4a853]/50">
              {courtResult?.courtName || 'Sad Okregowy ds. Emocjonalnych i Obyczajowych'}
            </p>

            <h1 className="mt-4 font-[var(--font-syne)] text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              Sad Chatowy
            </h1>

            <p className="mt-3 font-mono text-sm tracking-wide text-[#d4a853]/70">
              Sprawa {courtResult?.caseNumber || `PT-${new Date().getFullYear()}/${analysisId.slice(0, 5).toUpperCase()}`}
            </p>

            <p className="mt-2 text-base text-[#888]">
              {participants.join(' vs ')}
            </p>

            {/* Gavel */}
            {gavelStruck && (
              <motion.div
                className="mx-auto mt-8"
                initial={{ opacity: 0, rotate: -30, y: -10 }}
                animate={{ opacity: 1, rotate: 0, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
              >
                <Image src="/icons/court/gavel.png" alt="" width={120} height={67}
                  className="h-auto w-28 drop-shadow-[0_0_20px_rgba(212,168,83,0.4)]" aria-hidden="true" />
              </motion.div>
            )}
          </motion.div>

          {/* Scroll indicator */}
          {hasResult && (
            <motion.div
              className="mt-12 flex flex-col items-center gap-2 text-[#d4a853]/40"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Rozprawa trwa</span>
              <ChevronDown className="size-5" />
            </motion.div>
          )}

          {/* CTA if no result */}
          {!hasResult && (
            <motion.div
              className="mt-10"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2 }}
            >
              <ChatCourtButton
                analysis={analysis}
                onComplete={onCourtComplete}
              />
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* ═══ SCENES 2-6: ONLY IF RESULT EXISTS ═══ */}
      {hasResult && courtResult && (
        <>
          {/* ═══ SCENE 2: PROSECUTION — AKT OSKARZENIA ═══ */}
          <section className="court-scene">
            <div className="mx-auto w-full max-w-3xl">
              <CourtSection>
                <div className="mb-10 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#d4a853]/10 border border-[#d4a853]/20">
                    <Shield className="size-6 text-[#d4a853]" />
                  </div>
                  <div>
                    <h2 className="font-[var(--font-syne)] text-2xl font-bold tracking-tight text-white sm:text-3xl">
                      Akt Oskarzenia
                    </h2>
                    <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#d4a853]/50">
                      Prokuratura przedstawia zarzuty
                    </p>
                  </div>
                </div>
              </CourtSection>

              {/* Prosecution speech */}
              {courtResult.prosecution && (
                <CourtSection delay={0.15}>
                  <div className="mb-8 rounded-xl border border-[#d4a853]/10 bg-[#1a1510]/50 p-6 backdrop-blur-sm">
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[#d4a853]/40 mb-3">
                      Mowa prokuratora
                    </p>
                    <p className="text-sm leading-relaxed text-[#ccc] whitespace-pre-line">
                      {courtResult.prosecution}
                    </p>
                  </div>
                </CourtSection>
              )}

              {/* Charges */}
              <div className="space-y-4">
                {courtResult.charges.map((charge, i) => (
                  <ChargeCard key={charge.id || i} charge={charge} index={i} />
                ))}
              </div>
            </div>
          </section>

          {/* ═══ SCENE 3: DEFENSE — OBRONA ═══ */}
          <section className="court-scene">
            <div className="mx-auto w-full max-w-3xl">
              <CourtSection>
                <div className="mb-10 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <Scale className="size-6 text-emerald-500" />
                  </div>
                  <div>
                    <h2 className="font-[var(--font-syne)] text-2xl font-bold tracking-tight text-white sm:text-3xl">
                      Obrona
                    </h2>
                    <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-emerald-500/50">
                      Adwokat sklada kontrargumenty
                    </p>
                  </div>
                </div>
              </CourtSection>

              {courtResult.defense && (
                <CourtSection delay={0.15}>
                  <div className="court-defense-card">
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-500/40 mb-3">
                      Mowa obroncza
                    </p>
                    <p className="text-sm leading-relaxed text-[#ccc] whitespace-pre-line">
                      {courtResult.defense}
                    </p>
                  </div>
                </CourtSection>
              )}
            </div>
          </section>

          {/* ═══ SCENE 4: WITNESSES (evidence quotes as testimony) ═══ */}
          {courtResult.charges.some(c => c.evidence && c.evidence.length > 0) && (
            <section className="court-scene">
              <div className="mx-auto w-full max-w-3xl">
                <CourtSection>
                  <div className="mb-10 text-center">
                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#d4a853]/40 mb-3">
                      Zeznania z akt
                    </p>
                    <h2 className="font-[var(--font-syne)] text-2xl font-bold tracking-tight text-white sm:text-3xl">
                      Glosy z Konwersacji
                    </h2>
                  </div>
                </CourtSection>

                <div className="grid gap-4 sm:grid-cols-2">
                  {courtResult.charges.flatMap((charge) =>
                    (charge.evidence || []).slice(0, 2).map((quote, qi) => (
                      <CourtSection key={`${charge.id}-${qi}`} delay={qi * 0.1}>
                        <div className="rounded-xl border border-white/[0.04] bg-[#0d0b08]/80 p-5 backdrop-blur-sm">
                          <p className="text-sm italic leading-relaxed text-[#aaa]">
                            &ldquo;{quote}&rdquo;
                          </p>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#d4a853]/40">
                              {charge.defendant || 'Swiadek'}
                            </span>
                            <span
                              className="font-mono text-[9px] uppercase tracking-[0.1em]"
                              style={{ color: SEVERITY_COLORS[charge.severity] || '#d4a853' }}
                            >
                              {SEVERITY_LABELS[charge.severity] || ''}
                            </span>
                          </div>
                        </div>
                      </CourtSection>
                    ))
                  ).slice(0, 8)}
                </div>
              </div>
            </section>
          )}

          {/* ═══ SCENE 5: VERDICT (with countdown) ═══ */}
          <section ref={verdictRef} className="court-scene">
            <div className="mx-auto w-full max-w-3xl text-center">
              {/* Countdown overlay */}
              <AnimatePresence mode="wait">
                {countdown !== null && !verdictRevealed && (
                  <motion.div
                    key={countdown}
                    className="flex min-h-[40vh] flex-col items-center justify-center"
                    initial={{ opacity: 0, scale: 0.3 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.5 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  >
                    {countdown > 0 ? (
                      <span className="court-countdown-digit">{countdown}</span>
                    ) : (
                      <span className="court-countdown-digit !text-7xl sm:!text-9xl">WYROK!</span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actual verdict — revealed after countdown */}
              {verdictRevealed && (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                >
                  <div className="mb-6">
                    <ScalesSVG className="mx-auto h-20 w-28 opacity-40" />
                  </div>

                  <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#d4a853]/40 mb-4">
                    Wyrok Sadu
                  </p>

                  <h2 className="font-[var(--font-syne)] text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                    {courtResult.verdict.summary}
                  </h2>

                  {courtResult.verdict.reasoning && (
                    <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[#999]">
                      {courtResult.verdict.reasoning}
                    </p>
                  )}

                  {/* Dramatic divider */}
                  <div className="my-12 mx-auto h-px w-48 bg-gradient-to-r from-transparent via-[#d4a853]/30 to-transparent" />

                  {/* Per-person verdicts */}
                  {courtResult.perPerson && (
                    <div className="grid gap-6 sm:grid-cols-2 text-left">
                      {Object.entries(courtResult.perPerson).map(([name, pv], i) => (
                        <PersonVerdictCard key={name} name={name} pv={pv} delay={i * 0.15} />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </section>

          {/* ═══ SCENE 6: MUGSHOT & SHARE ═══ */}
          <section className="court-scene pb-32">
            <div className="mx-auto w-full max-w-3xl text-center">
              <CourtSection>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#d4a853]/40 mb-6">
                  Akta zamkniete
                </p>

                <h2 className="font-[var(--font-syne)] text-2xl font-bold tracking-tight text-white mb-8">
                  Rozprawazakonczona
                </h2>

                <div className="flex flex-wrap justify-center gap-4">
                  <Link
                    href={`/analysis/${analysisId}/share`}
                    className="flex items-center gap-2 rounded-xl border border-[#d4a853]/20 bg-[#d4a853]/10 px-6 py-3 font-mono text-xs font-medium uppercase tracking-wider text-[#d4a853] transition-all hover:bg-[#d4a853]/20"
                  >
                    <Share2 className="size-4" />
                    Udostepnij Wyrok
                  </Link>
                  <Link
                    href={`/analysis/${analysisId}/share`}
                    className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-6 py-3 font-mono text-xs font-medium uppercase tracking-wider text-[#888] transition-all hover:bg-white/[0.06] hover:text-white"
                  >
                    <Download className="size-4" />
                    Pobierz Mugshot
                  </Link>
                </div>

                {/* Back to hub */}
                <Link
                  href={`/analysis/${analysisId}`}
                  className="mt-8 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#d4a853]/40 transition-colors hover:text-[#d4a853]"
                >
                  <ArrowLeft className="size-3" />
                  Wróć do Centrum Dowodzenia
                </Link>
              </CourtSection>
            </div>
          </section>
        </>
      )}
    </div>
    </SectionErrorBoundary>
  );
}
