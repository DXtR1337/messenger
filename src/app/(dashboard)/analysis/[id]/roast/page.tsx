'use client';

import { useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { ArrowLeft, Flame, ChevronDown, Swords, Award, Zap, Shield, Clock, MessageSquare, Crown, Share2 } from 'lucide-react';

import { useAnalysis } from '@/lib/analysis/analysis-context';
import { SectionErrorBoundary } from '@/components/shared/SectionErrorBoundary';
import SceneParticles from '@/components/shared/SceneParticles';
import VideoBackground from '@/components/shared/VideoBackground';

// ── Roast Line Reaction Button ─────────────────────────────
const EMOJI_LABELS: Record<string, string> = {
  '\uD83D\uDD25': 'Ogien',
  '\uD83D\uDC80': 'Czaszka',
  '\uD83D\uDE2D': 'Placz',
};

function RoastLineReaction({ emoji, lineIndex, personName, analysisId }: {
  emoji: string;
  lineIndex: number;
  personName: string;
  analysisId: string;
}) {
  const key = `podtekst-roast-reaction-${analysisId}-${personName}-${lineIndex}-${emoji}`;
  const [count, setCount] = useState(0);
  const [popping, setPopping] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(key);
    if (saved) setCount(parseInt(saved, 10));
  }, [key]);

  const handleClick = () => {
    const next = count + 1;
    setCount(next);
    localStorage.setItem(key, String(next));
    setPopping(true);
    setTimeout(() => setPopping(false), 300);
  };

  return (
    <button
      onClick={handleClick}
      aria-label={`Reakcja ${EMOJI_LABELS[emoji] || emoji}`}
      className={`roast-line-reaction ${popping ? 'scale-125' : ''}`}
      style={{ transition: 'transform 0.2s ease' }}
    >
      <span>{emoji}</span>
      {count > 0 && <span className="font-mono text-[10px] text-[#ffa500]">{count}</span>}
    </button>
  );
}

const RoastSection = dynamic(() => import('@/components/analysis/RoastSection'), { ssr: false });
const EnhancedRoastButton = dynamic(() => import('@/components/analysis/EnhancedRoastButton'), { ssr: false });
const StandardRoastButton = dynamic(() => import('@/components/analysis/StandardRoastButton'), { ssr: false });
const MegaRoastButton = dynamic(() => import('@/components/analysis/MegaRoastButton'), { ssr: false });
const MegaRoastSection = dynamic(() => import('@/components/analysis/MegaRoastSection'), { ssr: false });
const PrzegrywTygodniaButton = dynamic(() => import('@/components/analysis/PrzegrywTygodniaButton'), { ssr: false });
const PrzegrywTygodniaSection = dynamic(() => import('@/components/analysis/PrzegrywTygodniaSection'), { ssr: false });

// ── SVG Components ──────────────────────────────────────────

function FlamesSVG({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 100" fill="none" className={className} aria-hidden="true">
      {/* Left flame cluster */}
      <path d="M30 100 Q30 60 20 40 Q25 55 35 30 Q30 50 40 45 Q35 65 30 100Z" fill="url(#flame1)" opacity="0.6" />
      <path d="M45 100 Q45 70 40 50 Q42 60 50 35 Q48 55 55 50 Q50 70 45 100Z" fill="url(#flame2)" opacity="0.4" />
      {/* Center flame */}
      <path d="M95 100 Q90 50 85 25 Q92 45 100 10 Q108 45 115 25 Q110 50 105 100Z" fill="url(#flame1)" opacity="0.7" />
      <path d="M100 100 Q97 65 93 45 Q98 55 100 30 Q102 55 107 45 Q103 65 100 100Z" fill="url(#flame3)" opacity="0.5" />
      {/* Right flame cluster */}
      <path d="M155 100 Q155 70 150 50 Q152 60 160 35 Q158 55 165 50 Q160 70 155 100Z" fill="url(#flame2)" opacity="0.4" />
      <path d="M170 100 Q170 60 180 40 Q175 55 165 30 Q170 50 160 45 Q165 65 170 100Z" fill="url(#flame1)" opacity="0.6" />
      <defs>
        <linearGradient id="flame1" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#ff4500" />
          <stop offset="50%" stopColor="#ff6347" />
          <stop offset="100%" stopColor="#ffa500" />
        </linearGradient>
        <linearGradient id="flame2" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#ff4500" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ffa500" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="flame3" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#ffd700" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ff4500" stopOpacity="0.2" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function SwordsSVG({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
      {/* Left sword */}
      <line x1="15" y1="65" x2="55" y2="15" stroke="#ff4500" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="10" y1="60" x2="20" y2="70" stroke="#ffa500" strokeWidth="2" strokeLinecap="round" />
      <circle cx="17" cy="62" r="2" fill="#ff4500" />
      {/* Right sword */}
      <line x1="65" y1="65" x2="25" y2="15" stroke="#ff4500" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="60" y1="70" x2="70" y2="60" stroke="#ffa500" strokeWidth="2" strokeLinecap="round" />
      <circle cx="63" cy="62" r="2" fill="#ff4500" />
      {/* Clash spark */}
      <circle cx="40" cy="30" r="4" fill="#ffd700" opacity="0.7" />
      <line x1="35" y1="25" x2="33" y2="20" stroke="#ffd700" strokeWidth="1" opacity="0.6" />
      <line x1="45" y1="25" x2="47" y2="20" stroke="#ffd700" strokeWidth="1" opacity="0.6" />
      <line x1="40" y1="22" x2="40" y2="17" stroke="#ffd700" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}

// ── Animated Section ────────────────────────────────────────

function RoastAnimatedSection({ children, className = '', delay = 0 }: {
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

// ── Fighter Stat Bar ────────────────────────────────────────

function FighterStat({ label, value, maxValue, icon: Icon }: {
  label: string;
  value: number;
  maxValue: number;
  icon: typeof Flame;
}) {
  const pct = Math.min(100, (value / maxValue) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="size-3 text-[#ff4500]/70" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#888]">{label}</span>
        </div>
        <span className="font-mono text-xs font-bold text-[#ffa500]">{value}</span>
      </div>
      <div className="roast-stat-bar">
        <motion.div
          className="roast-stat-fill"
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ── VS Character Card ───────────────────────────────────────

function FighterCard({ name, stats, side }: {
  name: string;
  stats: { messages: number; avgResponseMs: number; longestMsg: number; wordsPerMsg: number };
  side: 'left' | 'right';
}) {
  const initials = name.split(/\s+/).map(w => w[0]?.toUpperCase() || '').join('').slice(0, 2);
  const maxMessages = stats.messages * 1.5;

  return (
    <motion.div
      className="roast-metal-card flex-1 p-5"
      initial={{ x: side === 'left' ? -60 : 60, opacity: 0 }}
      whileInView={{ x: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* Avatar + name */}
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex size-12 items-center justify-center rounded-full font-[var(--font-syne)] text-lg font-extrabold text-black"
          style={{ background: side === 'left' ? 'linear-gradient(135deg, #ff4500, #ffa500)' : 'linear-gradient(135deg, #ff6347, #ff4500)' }}
        >
          {initials}
        </div>
        <div>
          <h3 className="font-[var(--font-syne)] text-lg font-bold text-white">{name}</h3>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ff4500]/50">
            {side === 'left' ? 'Zawodnik A' : 'Zawodnik B'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-2.5">
        <FighterStat icon={Swords} label="Atak" value={stats.messages} maxValue={maxMessages} />
        <FighterStat icon={Shield} label="Obrona" value={Math.round(stats.avgResponseMs / 60000)} maxValue={120} />
        <FighterStat icon={Zap} label="Special" value={stats.longestMsg} maxValue={Math.max(stats.longestMsg, 500)} />
        <FighterStat icon={MessageSquare} label="Slow/msg" value={Math.round(stats.wordsPerMsg)} maxValue={50} />
      </div>
    </motion.div>
  );
}

// ═══ MAIN ROAST PAGE ═══════════════════════════════════════

export default function RoastModePage() {
  const {
    analysis,
    qualitative,
    quantitative,
    conversation,
    participants,
    isServerView,
    sortedParticipants,
    hasQualitative,
    onRoastComplete,
    onEnhancedRoastComplete,
    onMegaRoastComplete,
    onPrzegrywComplete,
  } = useAnalysis();

  const [megaRoastTarget, setMegaRoastTarget] = useState('');
  const [vsImpact, setVsImpact] = useState(false);
  const entranceRef = useRef<HTMLDivElement>(null);
  const entranceInView = useInView(entranceRef, { once: true });

  // Fire effects fade out when scrolling past entrance scene
  const { scrollY } = useScroll();
  const fireOpacity = useTransform(scrollY, [0, 600], [1, 0]);

  const hasRoast = !!qualitative?.roast;
  const hasEnhancedRoast = !!qualitative?.enhancedRoast;
  const analysisId = (analysis as { id?: string })?.id || '';

  // Build fighter stats from quantitative data
  const fighterStats = participants.slice(0, 2).map(name => {
    const pm = quantitative?.perPerson?.[name];
    const tm = quantitative?.timing?.perPerson?.[name];
    return {
      name,
      messages: pm?.totalMessages || 0,
      avgResponseMs: tm?.averageResponseTimeMs || 0,
      longestMsg: pm?.longestMessage?.length || 0,
      wordsPerMsg: pm?.averageMessageLength || 0,
    };
  });

  return (
    <SectionErrorBoundary section="Roast">
    <div data-mode="roast" className="roast-bg relative">
      <VideoBackground src="/videos/modes/roast.mp4" />

      {/* Fire effects — fade out on scroll, hidden on mobile */}
      <motion.div style={{ opacity: fireOpacity }} className="roast-fire-effects hidden md:block" aria-hidden="true">
        {/* Embers video overlay — GPU-optimized */}
        <video
          autoPlay loop muted playsInline preload="none"
          className="roast-embers-video"
          aria-hidden="true"
        >
          <source src="/videos/modes/roast-embers.mp4" type="video/mp4" />
        </video>

        {/* Fire glow */}
        <div className="roast-fire-glow" />

        {/* Supplementary CSS embers */}
        <div>
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="roast-ember" />
          ))}
        </div>
      </motion.div>

      {/* Lateral spark particles — visible on all devices */}
      <SceneParticles className="roast-spark" count={12} />

      {/* Back navigation */}
      <div className="fixed top-6 left-6 z-30">
        <Link
          href={`/analysis/${analysisId}`}
          className="flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 font-mono text-xs uppercase tracking-widest text-[#ff4500]/70 backdrop-blur-md transition-all hover:bg-black/60 hover:text-[#ff4500]"
        >
          <ArrowLeft className="size-3.5" />
          Hub
        </Link>
      </div>

      {/* ═══ SCENE 1: ARENA ENTRANCE ═══ */}
      <section ref={entranceRef} className="roast-scene">
        <motion.div
          className="flex flex-col items-center text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          {/* Flames SVG */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={entranceInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <FlamesSVG className="mb-4 h-20 w-32 opacity-60 sm:w-40 md:w-48" />
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={entranceInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <h1 className="font-[var(--font-syne)] text-3xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
              <span className="roast-vs-badge">ROAST</span>{' '}
              <span className="text-[#ffa500]">ARENA</span>
            </h1>

            <p className="mt-3 font-mono text-sm tracking-wide text-[#ff4500]/50">
              Bez litosci. Bez cenzury. Bez odwrotu.
            </p>
          </motion.div>

          {/* Scroll indicator or empty state CTA */}
          {hasRoast ? (
            <motion.div
              className="mt-12 flex flex-col items-center gap-2 text-[#ff4500]/40"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Wejdz na arene</span>
              <ChevronDown className="size-5" />
            </motion.div>
          ) : !hasQualitative ? (
            <motion.div
              className="mt-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <div className="roast-metal-card px-4 py-4 text-center sm:px-8 sm:py-6">
                <Flame className="mx-auto mb-3 size-8 text-[#ff4500]/40" />
                <p className="font-[var(--font-syne)] text-lg font-bold text-white">
                  Kto dostanie roasta?
                </p>
                <p className="mt-2 font-mono text-xs text-[#888]">
                  Uruchom Analize AI w{' '}
                  <Link href={`/analysis/${analysisId}/ai`} className="text-purple-400 hover:underline">
                    AI Deep Dive
                  </Link>
                  , zeby odblokowac Roast Arena.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              className="mt-12 flex flex-col items-center gap-2 text-[#ff4500]/40"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Wejdz na arene</span>
              <ChevronDown className="size-5" />
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* ═══ SCENE 2: VS CHARACTER SELECT ═══ */}
      {!isServerView && fighterStats.length >= 2 && (
        <section className="roast-scene">
          <div className="mx-auto w-full max-w-4xl">
            <RoastAnimatedSection>
              <h2 className="mb-8 text-center font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#ff4500]/50">
                Wybor zawodnikow
              </h2>

              <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-4">
                {/* Fighter A */}
                <FighterCard name={fighterStats[0].name} stats={fighterStats[0]} side="left" />

                {/* VS Badge with impact flash */}
                <motion.div
                  className={`flex flex-col items-center ${vsImpact ? 'roast-vs-impact' : ''}`}
                  initial={{ scale: 0, rotate: -180 }}
                  whileInView={{ scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, type: 'spring', bounce: 0.4 }}
                  onAnimationComplete={() => {
                    setVsImpact(true);
                    setTimeout(() => setVsImpact(false), 600);
                  }}
                >
                  <SwordsSVG className="mb-2 size-16" />
                  <span className="roast-vs-badge text-5xl">VS</span>
                  {/* Impact flash overlay */}
                  {vsImpact && (
                    <motion.div
                      className="pointer-events-none absolute inset-0 rounded-full bg-white"
                      initial={{ opacity: 0.6 }}
                      animate={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                    />
                  )}
                </motion.div>

                {/* Fighter B */}
                <FighterCard name={fighterStats[1].name} stats={fighterStats[1]} side="right" />
              </div>
            </RoastAnimatedSection>
          </div>
        </section>
      )}

      {/* ═══ SCENE 2.5: STANDARD ROAST CTA (when not generated yet) ═══ */}
      {!hasRoast && (
        <section className="roast-scene pb-16">
          <div className="mx-auto w-full max-w-3xl">
            <RoastAnimatedSection>
              <div className="mb-6 flex items-center gap-3">
                <Flame className="size-5 text-[#ff4500]" />
                <h2 className="roast-section-header text-xl sm:text-2xl">
                  Standard Roast
                </h2>
                <span className="rounded-full bg-[#ff4500]/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[#ff4500]">
                  Level 1
                </span>
              </div>

              <div className="roast-metal-card p-6">
                <p className="mb-4 text-sm text-[#888]">
                  Klasyczny roast na podstawie statystyk i próbek wiadomości. Szybki, celny, bez psychologii.
                </p>
                <StandardRoastButton />
              </div>
            </RoastAnimatedSection>
          </div>
        </section>
      )}

      {/* ═══ SCENE 3: STANDARD ROAST ═══ */}
      {hasRoast && qualitative?.roast && (
        <section className="roast-scene pb-16">
          <div className="mx-auto w-full max-w-3xl">
            <RoastAnimatedSection>
              <div className="mb-6 flex items-center gap-3">
                <Flame className="size-5 text-[#ff4500]" />
                <h2 className="roast-section-header text-xl sm:text-2xl">
                  Standard Roast
                </h2>
                <span className="rounded-full bg-[#ff4500]/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[#ff4500]">
                  Level 1
                </span>
              </div>

              {/* Verdict banner */}
              <motion.div
                className="roast-metal-card mb-8 overflow-hidden px-6 py-5 text-center"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
              >
                <p className="font-[var(--font-syne)] text-lg font-bold italic text-white">
                  &ldquo;{qualitative.roast.verdict}&rdquo;
                </p>
              </motion.div>

              {/* Per-person roasts */}
              <div className="space-y-6">
                {participants.map((name, personIndex) => {
                  const personRoasts = qualitative.roast!.roasts_per_person[name];
                  if (!personRoasts || personRoasts.length === 0) return null;

                  return (
                    <RoastAnimatedSection key={name} delay={personIndex * 0.15}>
                      <div className="mb-3 flex items-center gap-2">
                        <span
                          className="inline-flex size-6 items-center justify-center rounded-full font-mono text-[10px] font-bold text-black"
                          style={{ background: personIndex === 0 ? '#ff4500' : '#ffa500' }}
                        >
                          {name[0]?.toUpperCase()}
                        </span>
                        <h3 className="font-[var(--font-syne)] text-base font-bold text-white">{name}</h3>
                      </div>
                      <div className="space-y-3">
                        {personRoasts.map((line, j) => (
                          <motion.div
                            key={j}
                            className="roast-burn-card"
                            initial={{ opacity: 0, x: -15 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: j * 0.08, duration: 0.4 }}
                          >
                            <div className="flex items-start gap-2">
                              <Flame className="mt-0.5 size-3.5 shrink-0 text-[#ff4500]/50" />
                              <p className="flex-1 text-sm leading-relaxed text-[#ccc]">{line}</p>
                            </div>
                            {/* Per-line reactions */}
                            <div className="mt-2 flex items-center gap-1.5 pl-5">
                              <RoastLineReaction emoji="🔥" lineIndex={j} personName={name} analysisId={analysisId} />
                              <RoastLineReaction emoji="💀" lineIndex={j} personName={name} analysisId={analysisId} />
                              <RoastLineReaction emoji="😭" lineIndex={j} personName={name} analysisId={analysisId} />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </RoastAnimatedSection>
                  );
                })}
              </div>

              {/* Superlatives — Hall of Burns */}
              {qualitative.roast.superlatives.length > 0 && (
                <RoastAnimatedSection delay={0.3}>
                  <div className="mt-10">
                    <div className="mb-4 flex items-center gap-2">
                      <Crown className="size-5 text-[#ffd700]" />
                      <h3 className="roast-section-header text-lg">Hall of Burns</h3>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {qualitative.roast.superlatives.map((sup, i) => {
                        const podiumClass = i === 0 ? 'roast-podium-gold' : i === 1 ? 'roast-podium-silver' : 'roast-podium-bronze';
                        const podiumColor = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : '#cd7f32';
                        return (
                          <motion.div
                            key={i}
                            className={`rounded-xl border p-4 ${podiumClass}`}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, duration: 0.4 }}
                          >
                            <div className="mb-2 flex items-center gap-2">
                              <Award className="size-4" style={{ color: podiumColor }} />
                              <span className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: podiumColor }}>
                                {sup.title}
                              </span>
                            </div>
                            <p className="mb-1 font-[var(--font-syne)] text-sm font-bold text-white">
                              {sup.holder}
                            </p>
                            <p className="text-xs leading-relaxed text-[#999]">{sup.roast}</p>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </RoastAnimatedSection>
              )}

              {/* Relationship roast */}
              <RoastAnimatedSection delay={0.2}>
                <div className="mt-8 roast-metal-card px-6 py-5">
                  <h3 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#ff4500]/60">
                    Roast relacji
                  </h3>
                  <p className="text-sm leading-relaxed text-[#ccc]">
                    {qualitative.roast.relationship_roast}
                  </p>
                </div>
              </RoastAnimatedSection>

              {/* Share */}
              <div className="mt-6 flex justify-center">
                <Link
                  href={`/analysis/${analysisId}/share`}
                  className="flex items-center gap-2 rounded-xl border border-[#ff4500]/20 bg-[#ff4500]/10 px-6 py-3 font-mono text-xs font-medium uppercase tracking-wider text-[#ff4500] transition-all hover:bg-[#ff4500]/20"
                >
                  <Share2 className="size-4" />
                  Share Card
                </Link>
              </div>
            </RoastAnimatedSection>
          </div>
        </section>
      )}

      {/* ═══ SCENE 4: ENHANCED ROAST ═══ */}
      {hasQualitative && (
        <section className="roast-scene pb-16">
          <div className="mx-auto w-full max-w-3xl">
            <RoastAnimatedSection>
              <div className="mb-6 flex items-center gap-3">
                <Flame className="size-5 text-[#ffa500]" />
                <h2 className="roast-section-header text-xl sm:text-2xl">
                  Enhanced Roast
                </h2>
                <span className="rounded-full bg-[#ffa500]/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[#ffa500]">
                  Level 2
                </span>
              </div>

              {/* Button — show only when no result yet */}
              {!hasEnhancedRoast && (
                <div className="roast-metal-card p-6">
                  <p className="mb-4 text-sm text-[#888]">
                    Glebszy roast z pelnym profilem psychologicznym — MBTI, attachment style, wzorce komunikacji.
                  </p>
                  <EnhancedRoastButton
                    analysis={analysis}
                    onComplete={onEnhancedRoastComplete}
                  />
                </div>
              )}

              {/* Enhanced Roast result display */}
              {hasEnhancedRoast && qualitative?.enhancedRoast && (
                <>
                  {/* Verdict banner */}
                  <motion.div
                    className="roast-metal-card mb-8 overflow-hidden px-6 py-5 text-center"
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                  >
                    <p className="font-[var(--font-syne)] text-lg font-bold italic text-white">
                      &ldquo;{qualitative.enhancedRoast.verdict}&rdquo;
                    </p>
                  </motion.div>

                  {/* Per-person roasts */}
                  <div className="space-y-6">
                    {participants.map((name, personIndex) => {
                      const personRoasts = qualitative.enhancedRoast!.roasts_per_person[name];
                      if (!personRoasts || personRoasts.length === 0) return null;

                      return (
                        <RoastAnimatedSection key={name} delay={personIndex * 0.15}>
                          <div className="mb-3 flex items-center gap-2">
                            <span
                              className="inline-flex size-6 items-center justify-center rounded-full font-mono text-[10px] font-bold text-black"
                              style={{ background: personIndex === 0 ? '#ffa500' : '#ff6347' }}
                            >
                              {name[0]?.toUpperCase()}
                            </span>
                            <h3 className="font-[var(--font-syne)] text-base font-bold text-white">{name}</h3>
                          </div>
                          <div className="space-y-3">
                            {personRoasts.map((line, j) => (
                              <motion.div
                                key={j}
                                className="roast-burn-card"
                                initial={{ opacity: 0, x: -15 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: j * 0.08, duration: 0.4 }}
                              >
                                <div className="flex items-start gap-2">
                                  <Flame className="mt-0.5 size-3.5 shrink-0 text-[#ffa500]/50" />
                                  <p className="flex-1 text-sm leading-relaxed text-[#ccc]">{line}</p>
                                </div>
                                <div className="mt-2 flex items-center gap-1.5 pl-5">
                                  <RoastLineReaction emoji="🔥" lineIndex={j} personName={`enhanced-${name}`} analysisId={analysisId} />
                                  <RoastLineReaction emoji="💀" lineIndex={j} personName={`enhanced-${name}`} analysisId={analysisId} />
                                  <RoastLineReaction emoji="😭" lineIndex={j} personName={`enhanced-${name}`} analysisId={analysisId} />
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </RoastAnimatedSection>
                      );
                    })}
                  </div>

                  {/* Superlatives */}
                  {qualitative.enhancedRoast.superlatives.length > 0 && (
                    <RoastAnimatedSection delay={0.3}>
                      <div className="mt-10">
                        <div className="mb-4 flex items-center gap-2">
                          <Crown className="size-5 text-[#ffd700]" />
                          <h3 className="roast-section-header text-lg">Hall of Enhanced Burns</h3>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {qualitative.enhancedRoast.superlatives.map((sup, i) => {
                            const podiumClass = i === 0 ? 'roast-podium-gold' : i === 1 ? 'roast-podium-silver' : 'roast-podium-bronze';
                            const podiumColor = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : '#cd7f32';
                            return (
                              <motion.div
                                key={i}
                                className={`rounded-xl border p-4 ${podiumClass}`}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1, duration: 0.4 }}
                              >
                                <div className="mb-2 flex items-center gap-2">
                                  <Award className="size-4" style={{ color: podiumColor }} />
                                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: podiumColor }}>
                                    {sup.title}
                                  </span>
                                </div>
                                <p className="mb-1 font-[var(--font-syne)] text-sm font-bold text-white">
                                  {sup.holder}
                                </p>
                                <p className="text-xs leading-relaxed text-[#999]">{sup.roast}</p>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    </RoastAnimatedSection>
                  )}

                  {/* Relationship roast */}
                  <RoastAnimatedSection delay={0.2}>
                    <div className="mt-8 roast-metal-card px-6 py-5">
                      <h3 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#ffa500]/60">
                        Enhanced roast relacji
                      </h3>
                      <p className="text-sm leading-relaxed text-[#ccc]">
                        {qualitative.enhancedRoast.relationship_roast}
                      </p>
                    </div>
                  </RoastAnimatedSection>

                  {/* Re-run button */}
                  <div className="mt-6">
                    <EnhancedRoastButton
                      analysis={analysis}
                      onComplete={onEnhancedRoastComplete}
                    />
                  </div>
                </>
              )}
            </RoastAnimatedSection>
          </div>
        </section>
      )}

      {/* ═══ SCENE 5: MEGA ROAST ═══ */}
      {(isServerView || hasQualitative) && (
        <section className="roast-scene pb-16">
          <div className="mx-auto w-full max-w-3xl">
            <RoastAnimatedSection>
              <div className="mb-6 flex items-center gap-3">
                <Swords className="size-5 text-[#ff6347]" />
                <h2 className="roast-section-header text-xl sm:text-2xl">
                  Mega Roast
                </h2>
                <span className="rounded-full bg-[#ff6347]/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[#ff6347]">
                  {isServerView ? 'Cel ataku' : 'Kombajn'}
                </span>
              </div>

              <div className="roast-metal-card p-6">
                {!isServerView && (
                  <p className="mb-4 text-sm text-[#888]">
                    Kombajn roastowy — łączy statystyki, psychologię, zarzuty i komedię w jeden niszczycielski pakiet.
                  </p>
                )}

                <p className="mb-4 font-mono text-xs uppercase tracking-widest text-[#ff4500]/40">
                  Wybierz ofiare
                </p>

                {/* Target selector — arena style */}
                <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {sortedParticipants.map((p) => {
                    const done = !!qualitative?.megaRoast?.[p];
                    return (
                      <button
                        key={p}
                        onClick={() => setMegaRoastTarget(p)}
                        className={`rounded-xl border px-4 py-3 font-mono text-xs font-medium transition-all ${
                          megaRoastTarget === p
                            ? 'border-[#ff4500]/40 bg-[#ff4500]/15 text-[#ff4500]'
                            : done
                              ? 'border-green-500/30 bg-green-500/10 text-green-400 hover:border-green-500/40'
                              : 'border-white/[0.06] bg-white/[0.03] text-[#888] hover:border-[#ff4500]/20 hover:text-white'
                        }`}
                      >
                        {done && <span className="mr-1">✓</span>}{p}
                      </button>
                    );
                  })}
                </div>

                {megaRoastTarget && !qualitative?.megaRoast?.[megaRoastTarget] && (
                  <MegaRoastButton
                    analysis={analysis}
                    targetPerson={megaRoastTarget}
                    onComplete={onMegaRoastComplete}
                    mode={isServerView ? 'group' : 'duo'}
                  />
                )}

                {megaRoastTarget && qualitative?.megaRoast?.[megaRoastTarget] && (
                  <MegaRoastSection
                    result={qualitative.megaRoast[megaRoastTarget]}
                    discordChannelId={conversation.metadata.discordChannelId}
                    isDuo={!isServerView}
                  />
                )}
              </div>
            </RoastAnimatedSection>
          </div>
        </section>
      )}

      {/* ═══ SCENE 6: PRZEGRYW TYGODNIA ═══ */}
      <section className="roast-scene pb-16">
        <div className="mx-auto w-full max-w-3xl">
          <RoastAnimatedSection>
            <div className="mb-6 flex items-center gap-3">
              <Crown className="size-5 text-[#ffd700]" />
              <h2 className="roast-section-header text-xl sm:text-2xl">
                {isServerView ? 'Przegryw Tygodnia' : 'Kto Jest Większym Przegrywem?'}
              </h2>
            </div>

            <div className="roast-metal-card p-6">
              {qualitative?.przegrywTygodnia ? (
                <PrzegrywTygodniaSection
                  result={qualitative.przegrywTygodnia}
                  discordChannelId={conversation.metadata.discordChannelId}
                  isDuo={!isServerView}
                />
              ) : (
                <PrzegrywTygodniaButton
                  analysis={analysis}
                  onComplete={onPrzegrywComplete}
                  mode={isServerView ? 'group' : 'duo'}
                />
              )}
            </div>
          </RoastAnimatedSection>
        </div>
      </section>

      {/* ═══ SCENE 7: OUTRO ═══ */}
      {(hasRoast || hasQualitative) && (
        <section className="roast-scene pb-32">
          <div className="mx-auto w-full max-w-3xl text-center">
            <RoastAnimatedSection>
              {/* Flames animation */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <FlamesSVG className="mx-auto mb-6 h-16 w-28 opacity-30 sm:w-36 md:w-40" />
              </motion.div>

              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#ff4500]/30">
                Koniec transmisji
              </p>

              {/* Disclaimer */}
              <p className="mt-8 font-mono text-[10px] italic text-zinc-400">
                Tryb rozrywkowy — nie stanowi analizy psychologicznej ani profesjonalnej oceny
              </p>

              {/* Nav links */}
              <div className="mt-8 flex flex-wrap justify-center gap-6">
                <Link
                  href={`/analysis/${analysisId}/standup`}
                  className="font-mono text-xs uppercase tracking-widest text-[#ff9f0a]/50 transition-colors hover:text-[#ff9f0a]"
                >
                  Stand-Up Comedy &rarr;
                </Link>
                <Link
                  href={`/analysis/${analysisId}/court`}
                  className="font-mono text-xs uppercase tracking-widest text-[#d4a853]/50 transition-colors hover:text-[#d4a853]"
                >
                  Sad Chatowy &rarr;
                </Link>
                <Link
                  href={`/analysis/${analysisId}`}
                  className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#ff4500]/40 transition-colors hover:text-[#ff4500]"
                >
                  <ArrowLeft className="size-3" />
                  Centrum Dowodzenia
                </Link>
              </div>
            </RoastAnimatedSection>
          </div>
        </section>
      )}
    </div>
    </SectionErrorBoundary>
  );
}
