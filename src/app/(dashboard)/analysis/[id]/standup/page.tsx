'use client';

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { ArrowLeft, ChevronDown, Download, Mic, RefreshCw } from 'lucide-react';

import { useAnalysis } from '@/lib/analysis/analysis-context';
import { SectionErrorBoundary } from '@/components/shared/SectionErrorBoundary';
import { useStandupGeneration } from '@/hooks/useStandupGeneration';
import SceneParticles from '@/components/shared/SceneParticles';
import BrandLogo from '@/components/shared/BrandLogo';

const StandUpPDFButton = dynamic(() => import('@/components/analysis/StandUpPDFButton'), { ssr: false });

// ── Types ──────────────────────────────────────────────────

type ShowPhase = 'curtain' | 'countdown' | 'entrance' | 'generating' | 'show';

// ── SVG Components ──────────────────────────────────────────

// ── SVG Comedy Stage ───────────────────────────────────────

function ComedyStage({ phase, progress = 0 }: { phase: ShowPhase; progress?: number }) {
  const cls = phase === 'generating' ? 'standup-stage breathing' : phase === 'curtain' || phase === 'countdown' ? 'standup-stage dimmed' : 'standup-stage';
  const haloOpacity = 0.15 + progress * 0.2;
  return (
    <div className={cls} aria-hidden="true">
      <svg viewBox="0 0 800 500" fill="none" className="max-w-5xl">
        {/* Stage lights at top */}
        <defs>
          <radialGradient id="lightGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff9f0a" stopOpacity={haloOpacity} />
            <stop offset="100%" stopColor="#ff9f0a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="stageWood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a1800" />
            <stop offset="100%" stopColor="#1a0f00" />
          </linearGradient>
          <linearGradient id="stageEdge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="#ff9f0a" stopOpacity="0.4" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        {/* Light halos */}
        <circle cx="200" cy="30" r="50" fill="url(#lightGlow)" />
        <circle cx="400" cy="20" r="60" fill="url(#lightGlow)" />
        <circle cx="600" cy="30" r="50" fill="url(#lightGlow)" />

        {/* Light fixtures */}
        <rect x="190" y="8" width="20" height="12" rx="3" fill="#333" />
        <rect x="390" y="4" width="20" height="14" rx="3" fill="#333" />
        <rect x="590" y="8" width="20" height="12" rx="3" fill="#333" />

        {/* Stage platform — trapezoid */}
        <path d="M100 300 L700 300 L750 420 L50 420 Z" fill="url(#stageWood)" opacity="0.6" />

        {/* Wood planks */}
        <line x1="120" y1="340" x2="680" y2="340" stroke="rgba(139,69,19,0.08)" strokeWidth="0.5" />
        <line x1="100" y1="370" x2="700" y2="370" stroke="rgba(139,69,19,0.06)" strokeWidth="0.5" />
        <line x1="80" y1="400" x2="720" y2="400" stroke="rgba(139,69,19,0.05)" strokeWidth="0.5" />

        {/* Stage front edge — orange highlight */}
        <path d="M100 300 L700 300" stroke="url(#stageEdge)" strokeWidth="2" />

      </svg>
    </div>
  );
}

// ── Audience Silhouettes ───────────────────────────────────

const AUDIENCE_HEADS = [
  { x: 5, h: 85, w: 38 },
  { x: 10, h: 95, w: 42 },
  { x: 17, h: 80, w: 36 },
  { x: 23, h: 92, w: 40 },
  { x: 30, h: 78, w: 35 },
  { x: 37, h: 90, w: 41 },
  { x: 44, h: 88, w: 39 },
  { x: 52, h: 82, w: 37 },
  { x: 59, h: 96, w: 43 },
  { x: 66, h: 84, w: 38 },
  { x: 73, h: 91, w: 40 },
  { x: 80, h: 79, w: 36 },
  { x: 87, h: 87, w: 39 },
  { x: 93, h: 83, w: 37 },
];

function AudienceSilhouettes({ visible, laughTrigger }: { visible: boolean; laughTrigger: number }) {
  const [laughingIdx, setLaughingIdx] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (laughTrigger <= 0) return;
    const count = 4 + Math.floor(Math.random() * 3);
    const indices = new Set<number>();
    while (indices.size < count) {
      indices.add(Math.floor(Math.random() * AUDIENCE_HEADS.length));
    }
    setLaughingIdx(indices);
    const t = setTimeout(() => setLaughingIdx(new Set()), 700);
    return () => clearTimeout(t);
  }, [laughTrigger]);

  return (
    <div className={`standup-audience ${visible ? 'visible' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 100 30" preserveAspectRatio="xMidYMax meet" className="w-full h-full">
        {AUDIENCE_HEADS.map((head, i) => (
          <g
            key={i}
            className={`standup-audience-head ${laughingIdx.has(i) ? 'laughing' : ''}`}
            style={{
              '--bob-dur': `${3.5 + (i % 4) * 0.5}s`,
              '--bob-delay': `${(i * 0.3) % 2}s`,
            } as React.CSSProperties}
          >
            <ellipse
              cx={head.x}
              cy={30 - head.h * 0.12}
              rx={head.w * 0.065}
              ry={head.w * 0.08}
              fill="#0a0a0a"
              stroke="rgba(255,159,10,0.06)"
              strokeWidth="0.15"
            />
            <path
              d={`M${head.x - head.w * 0.1} ${30 - head.h * 0.12 + head.w * 0.08}
                  Q${head.x} ${30 - head.h * 0.12 + head.w * 0.15}
                  ${head.x + head.w * 0.1} ${30 - head.h * 0.12 + head.w * 0.08}
                  L${head.x + head.w * 0.13} 30
                  L${head.x - head.w * 0.13} 30 Z`}
              fill="#0a0a0a"
              stroke="rgba(255,159,10,0.04)"
              strokeWidth="0.1"
            />
            <ellipse
              cx={head.x}
              cy={30 - head.h * 0.12 - head.w * 0.05}
              rx={head.w * 0.04}
              ry={head.w * 0.015}
              fill="rgba(255,159,10,0.08)"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Konfetti Burst ─────────────────────────────────────────

const KONFETTI_COLORS = ['#ff9f0a', '#ffd700', '#ff3b7a', '#fff', '#a855f7', '#fbbf24'];

function KonfettiBurst({ trigger }: { trigger: number }) {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    yUp: number;
    yDown: number;
    r: number;
    dur: number;
    color: string;
    w: number;
    h: number;
    br: number;
  }>>([]);

  useEffect(() => {
    if (trigger <= 0) return;
    const newParticles = Array.from({ length: 25 }, (_, i) => ({
      id: Date.now() + i,
      x: -120 + Math.random() * 240,
      yUp: -(100 + Math.random() * 150),
      yDown: 50 + Math.random() * 100,
      r: 180 + Math.random() * 540,
      dur: 2 + Math.random() * 1.5,
      color: KONFETTI_COLORS[Math.floor(Math.random() * KONFETTI_COLORS.length)],
      w: 4 + Math.random() * 8,
      h: 3 + Math.random() * 6,
      br: Math.random() > 0.5 ? 50 : 1,
    }));
    setParticles(newParticles);
    const t = setTimeout(() => setParticles([]), 4000);
    return () => clearTimeout(t);
  }, [trigger]);

  if (particles.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[120px] z-20 flex justify-center">
      {particles.map((p) => (
        <span
          key={p.id}
          className="standup-konfetti"
          style={{
            '--kx': `${p.x}px`,
            '--ky-up': `${p.yUp}px`,
            '--ky-down': `${p.yDown}px`,
            '--kr': `${p.r}deg`,
            '--kdur': `${p.dur}s`,
            '--kc': p.color,
            '--kw': `${p.w}px`,
            '--kh': `${p.h}px`,
            '--kbr': `${p.br}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ── Volumetric Spotlight Cone ──────────────────────────────

function SpotlightCone({ x, boosted }: { x: string; boosted?: boolean }) {
  return (
    <div className={`standup-spotlight-cone ${boosted ? 'boosted' : ''}`} aria-hidden="true" style={{ '--cone-x': x } as React.CSSProperties}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="dust-mote"
          style={{
            top: `${15 + Math.random() * 60}%`,
            left: `${45 + (Math.random() - 0.5) * 15}%`,
            '--dust-delay': `${i * 0.8}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ── Smoke Machine Burst ────────────────────────────────────

function SmokeBurst({ trigger }: { trigger: number }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (trigger <= 0) return;
    setActive(true);
    const t = setTimeout(() => setActive(false), 4500);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[2]" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={`smoke-${trigger}-${i}`}
          className="standup-smoke-burst"
          style={{
            left: `${15 + i * 20 + Math.random() * 10}%`,
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── Typewriter Text — char-by-char reveal ───────────────────

function TypewriterText({ text, className = '', onComplete }: { text: string; className?: string; onComplete?: () => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true, margin: '-5% 0px' });
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const [hit, setHit] = useState(false);

  useEffect(() => {
    if (!inView) return;
    let i = 0;
    setDisplayed('');
    setDone(false);
    setHit(false);
    const timer = setInterval(() => {
      i++;
      if (i > text.length) {
        clearInterval(timer);
        setDone(true);
        setHit(true);
        setTimeout(() => setHit(false), 400);
        onComplete?.();
        return;
      }
      setDisplayed(text.slice(0, i));
    }, 30);
    return () => clearInterval(timer);
  }, [inView, text, onComplete]);

  return (
    <span ref={ref} className={`${className} ${hit ? 'standup-punchline-hit' : ''}`}>
      {inView ? displayed : ''}
      {inView && !done && <span className="standup-typewriter-cursor">|</span>}
    </span>
  );
}

// ── Animated Section ────────────────────────────────────────

function StandUpSection({ children, className = '', delay = 0 }: {
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

// ── Audience Reaction Button ────────────────────────────────

function ReactionButton({ emoji, label, actNumber, storageKey, onReact }: {
  emoji: string;
  label: string;
  actNumber: number;
  storageKey: string;
  onReact?: () => void;
}) {
  const key = `podtekst-standup-reaction-${storageKey}-act${actNumber}-${label}`;
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
    onReact?.();
  };

  return (
    <button
      onClick={handleClick}
      className={`standup-reaction-btn ${popping ? 'standup-reaction-pop' : ''}`}
      title={label}
    >
      <span className="text-lg">{emoji}</span>
      {count > 0 && (
        <span className="font-mono text-xs text-[#ff9f0a]">{count}</span>
      )}
    </button>
  );
}

// ── Countdown Overlay ───────────────────────────────────────

function CountdownOverlay({ onDone }: { onDone: () => void }) {
  const [digit, setDigit] = useState(3);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (digit <= 0) { onDone(); return; }
    const t = setTimeout(() => {
      setDigit(d => d - 1);
      setKey(k => k + 1);
    }, 900);
    return () => clearTimeout(t);
  }, [digit, onDone]);

  if (digit <= 0) return null;

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/80 pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.span
          key={key}
          className="standup-countdown-digit"
          initial={{ scale: 1.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

// ── Act Interlude (between acts during reveal) ─────────────

const INTERLUDE_TEXTS = [
  '... publiczność łapie oddech ...',
  '... ktoś zamawia drinka ...',
  '... szept na widowni ...',
  '... reflektory się przestawiają ...',
  '... komik poprawia mikrofon ...',
  '... śmiech powoli milknie ...',
  '... światła przygasają ...',
];

function ActInterlude({ visible, actIndex = 0 }: { visible: boolean; actIndex?: number }) {
  return (
    <div className={`standup-interlude ${visible ? 'visible' : ''}`}>
      <div className="standup-interlude-line" />
      <span className="standup-interlude-text">{INTERLUDE_TEXTS[actIndex % INTERLUDE_TEXTS.length]}</span>
    </div>
  );
}

// ── Punchline Flash Overlay ─────────────────────────────────

function PunchlineFlash() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 800);
    return () => clearTimeout(t);
  }, []);
  return visible ? <div className="standup-punchline-flash" /> : null;
}

// ── Floating Reaction Bar ───────────────────────────────────

function FloatingReactionBar({ currentAct, analysisId, onReact, totalReactions, actCount }: {
  currentAct: number;
  analysisId: string;
  onReact: () => void;
  totalReactions: number;
  actCount: number;
}) {
  return (
    <div className="standup-floating-reactions">
      <span className="standup-floating-act-label">
        Akt {currentAct + 1}
      </span>
      <div className="flex items-center gap-2">
        <ReactionButton emoji="😂" label="smiejsie" actNumber={currentAct + 1} storageKey={analysisId} onReact={onReact} />
        <ReactionButton emoji="🔥" label="ogien" actNumber={currentAct + 1} storageKey={analysisId} onReact={onReact} />
        <ReactionButton emoji="💀" label="zabij" actNumber={currentAct + 1} storageKey={analysisId} onReact={onReact} />
      </div>
      <div className="standup-mini-applause">
        <div
          className="standup-mini-applause-fill"
          style={{ width: `${Math.min(100, (totalReactions / (actCount * 5)) * 100)}%` }}
        />
      </div>
    </div>
  );
}

// ── Act Card ────────────────────────────────────────────────

function ActCard({ act, index, actRef, revealed, active, onPunchlineComplete }: {
  act: { number: number; title: string; emoji: string; lines: string[]; callback?: string; gradientColors: [string, string] };
  index: number;
  actRef?: React.Ref<HTMLElement>;
  revealed: boolean;
  active?: boolean;
  onPunchlineComplete?: () => void;
}) {
  return (
    <motion.section
      className="standup-scene"
      ref={actRef}
      data-act-index={index}
      initial={{ opacity: 0, y: 40 }}
      animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
    >
      <div className="mx-auto w-full max-w-3xl">
        <div className={`standup-act-card ${active ? 'standup-act-card-active' : ''}`}>
          {/* Act number badge — slides in from left */}
          <motion.div
            className="mb-6 flex items-center gap-4"
            initial={{ opacity: 0, x: -30 }}
            animate={revealed ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em]"
              style={{
                background: 'rgba(255,159,10,0.08)',
                border: '1px solid rgba(255,159,10,0.2)',
                color: '#ff9f0a',
              }}
            >
              <span className="text-lg" aria-hidden="true">{act.emoji || '🎤'}</span>
              Akt {act.number}
            </span>
            <h3 className="font-[var(--font-syne)] text-xl font-bold tracking-tight text-[#ff9f0a] sm:text-2xl">
              {act.title}
            </h3>
          </motion.div>

          {/* Lines — stagger 0.15s for breathing room */}
          <div className="space-y-4">
            {act.lines.map((line, j) => {
              const isPunchline = j === act.lines.length - 1;
              return (
                <motion.p
                  key={j}
                  initial={{ opacity: 0, x: -10 }}
                  animate={revealed ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.3 + j * 0.15, duration: 0.4 }}
                  className={isPunchline ? 'standup-punchline text-base' : 'text-sm leading-relaxed text-[#ccc]'}
                >
                  {isPunchline ? (
                    <>
                      <TypewriterText text={line} onComplete={onPunchlineComplete} />
                      <span className="ml-2 inline-block text-base align-middle" aria-hidden="true">🎤</span>
                    </>
                  ) : line}
                </motion.p>
              );
            })}
          </div>

          {/* Callback */}
          {act.callback && (
            <div className="mt-5 standup-callback">
              <p className="text-sm">{act.callback}</p>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}

// ── Generating Phase UI ─────────────────────────────────────

function GeneratingScene({ progress }: { progress: string | null }) {
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    if (progress && !messages.includes(progress)) {
      setMessages(prev => [progress, ...prev].slice(0, 5));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  return (
    <section className="standup-scene">
      <div className="standup-generating">
        <motion.div
          className="standup-pace mb-6"
          animate={{ scale: [0.98, 1.02, 0.98] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="text-6xl" aria-hidden="true">🎤</span>
        </motion.div>

        {/* Backstage progress feed */}
        <div className="standup-backstage-feed">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.p
                key={`${i}-${msg}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: i === 0 ? 1 : 0.4, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={`standup-backstage-msg ${i === 0 ? 'current' : ''}`}
              >
                {msg}
              </motion.p>
            ))}
          </AnimatePresence>
          {messages.length === 0 && (
            <p className="standup-backstage-msg current">Przygotowuję występ...</p>
          )}
        </div>

        <div className="standup-loading-dots mt-4 flex gap-2 text-2xl">
          <span>●</span>
          <span>●</span>
          <span>●</span>
        </div>

        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.3em] text-[#ff9f0a]/30">
          Za kulisami...
        </p>
      </div>
    </section>
  );
}

// ═══ MAIN STANDUP PAGE ══════════════════════════════════════

export default function StandUpModePage() {
  const {
    analysis,
    qualitative,
    onStandupComplete,
    startOperation,
    updateOperation,
    stopOperation,
  } = useAnalysis();

  const ops = useMemo(() => ({ startOperation, updateOperation, stopOperation }), [startOperation, updateOperation, stopOperation]);
  const { state: genState, progress, generate, reset: resetGen } = useStandupGeneration(analysis, onStandupComplete, ops);

  const standupResult = qualitative?.standupRoast;
  const hasResult = !!standupResult;
  const analysisId = (analysis as { id?: string })?.id || '';
  const actCount = standupResult?.acts?.length || 7;

  const [phase, setPhase] = useState<ShowPhase>('curtain');
  const [revealIndex, setRevealIndex] = useState(-1);
  const [totalReactions, setTotalReactions] = useState(0);
  const [showOvation, setShowOvation] = useState(false);
  const [spotX, setSpotX] = useState('50%');
  const [micDropped, setMicDropped] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [konfettiTrigger, setKonfettiTrigger] = useState(0);
  const [laughTrigger, setLaughTrigger] = useState(0);
  const [smokeTrigger, setSmokeTrigger] = useState(0);
  const [currentActIndex, setCurrentActIndex] = useState(0);
  const [flashTrigger, setFlashTrigger] = useState(0);
  const [spotlightBoost, setSpotlightBoost] = useState(false);
  const [hasActInView, setHasActInView] = useState(false);
  const actRefs = useRef<(HTMLElement | null)[]>([]);

  const allRevealed = useMemo(() => {
    if (!standupResult) return false;
    return revealIndex >= standupResult.acts.length - 1;
  }, [revealIndex, standupResult]);

  // Count total reactions from localStorage on mount
  useEffect(() => {
    if (!hasResult) return;
    let total = 0;
    const labels = ['smiejsie', 'ogien', 'zabij'];
    for (let act = 1; act <= actCount; act++) {
      for (const label of labels) {
        const saved = localStorage.getItem(`podtekst-standup-reaction-${analysisId}-act${act}-${label}`);
        if (saved) total += parseInt(saved, 10);
      }
    }
    setTotalReactions(total);
  }, [hasResult, analysisId, actCount]);

  const handleReaction = () => {
    setTotalReactions(prev => {
      const next = prev + 1;
      if (next >= actCount * 3 && !showOvation) {
        setShowOvation(true);
        setTimeout(() => setShowOvation(false), 3000);
      }
      return next;
    });
    setLaughTrigger(t => t + 1);
    setSpotlightBoost(true);
    setTimeout(() => setSpotlightBoost(false), 600);
  };

  const handlePunchlineComplete = useCallback(() => {
    setKonfettiTrigger(t => t + 1);
    setLaughTrigger(t => t + 1);
    setFlashTrigger(t => t + 1);
  }, []);

  const handleCountdownDone = useCallback(() => {
    if (hasResult) {
      setPhase('show');
      setRevealIndex(999);
    } else {
      setPhase('entrance');
    }
  }, [hasResult]);

  // Open curtain → show countdown
  useEffect(() => {
    if (phase !== 'curtain') return;
    const t = setTimeout(() => setPhase('countdown'), 2500);
    return () => clearTimeout(t);
  }, [phase]);

  // Handle generation state changes
  useEffect(() => {
    if (genState === 'generating' && phase === 'entrance') {
      setPhase('generating');
    }
    if (genState === 'complete' && (phase === 'generating' || phase === 'entrance')) {
      setPhase('show');
      setRevealIndex(0);
      setSmokeTrigger(t => t + 1);
    }
  }, [genState, phase]);

  // Scroll-driven act reveal + spotlight tracking (replaces auto-timer)
  useEffect(() => {
    if (phase !== 'show' || !hasResult) return;
    const observers: IntersectionObserver[] = [];
    const refs = actRefs.current;

    refs.forEach((el, i) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setHasActInView(true);
              // Reveal this act and all before it
              setRevealIndex(prev => {
                if (prev < i) setSmokeTrigger(t => t + 1);
                return Math.max(prev, i);
              });
              // Track current act for floating reaction bar
              setCurrentActIndex(i);
              // Move spotlight
              const total = refs.length || 1;
              const pct = 15 + (i / Math.max(total - 1, 1)) * 70;
              setSpotX(`${pct}%`);
            }
          });
        },
        { threshold: 0.15 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach(obs => obs.disconnect());
  }, [phase, hasResult, standupResult?.acts?.length]);

  const handleStartShow = useCallback(() => {
    generate();
  }, [generate]);

  const handleRegenerate = useCallback(() => {
    resetGen();
    setRevealIndex(-1);
    setHasActInView(false);
    setPhase('entrance');
  }, [resetGen]);

  const showAudience = phase === 'show' || phase === 'generating';

  return (
    <SectionErrorBoundary section="StandUp">
    <div data-mode="standup" className={`standup-bg standup-brick relative ${shaking ? 'standup-shake' : ''}`}>
      {/* Ambient looping video */}
      <video
        autoPlay loop muted playsInline
        className="pointer-events-none fixed inset-0 z-[-1] h-full w-full object-cover opacity-[0.12]"
        style={{ mixBlendMode: 'soft-light', transform: 'scale(1.4)', transformOrigin: 'center 40%' }}
        aria-hidden="true"
      >
        <source src="/videos/modes/standup.mp4" type="video/mp4" />
      </video>

      {/* SVG Comedy Stage background */}
      <ComedyStage phase={phase} progress={actCount > 1 ? revealIndex / (actCount - 1) : 0} />

      {/* Floating star particles */}
      <SceneParticles className="standup-particle" count={8} />

      {/* Smoke haze layers */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="standup-smoke standup-smoke-1" />
        <div className="standup-smoke standup-smoke-2" />
        <div className="standup-smoke standup-smoke-3" />
        <div className="standup-smoke standup-smoke-4" />
        <div className="standup-smoke standup-smoke-5" />
      </div>

      <div className={`standup-smoke-haze ${revealIndex >= actCount - 2 ? 'standup-smoke-intense' : ''}`} aria-hidden="true" />

      {/* Volumetric Spotlight Cone */}
      <SpotlightCone x={spotX} boosted={spotlightBoost} />

      {/* Spotlight sweep */}
      <div className="standup-spotlight-sweep" style={{ '--spot-x': spotX } as React.CSSProperties} aria-hidden="true" />

      {/* Audience silhouettes */}
      <AudienceSilhouettes visible={showAudience} laughTrigger={laughTrigger} />

      {/* Konfetti bursts */}
      <KonfettiBurst trigger={konfettiTrigger} />

      {/* Smoke machine bursts */}
      <SmokeBurst trigger={smokeTrigger} />

      {/* Punchline flash overlay */}
      <AnimatePresence>
        {flashTrigger > 0 && <PunchlineFlash key={flashTrigger} />}
      </AnimatePresence>

      {/* Floating reaction bar (visible after user scrolls to acts) */}
      {phase === 'show' && standupResult && hasActInView && (
        <FloatingReactionBar
          currentAct={currentActIndex}
          analysisId={analysisId}
          onReact={handleReaction}
          totalReactions={totalReactions}
          actCount={actCount}
        />
      )}

      {/* Countdown overlay */}
      <AnimatePresence>
        {phase === 'countdown' && <CountdownOverlay onDone={handleCountdownDone} />}
      </AnimatePresence>

      {/* Back navigation */}
      <div className="fixed top-6 left-6 z-30">
        <Link
          href={`/analysis/${analysisId}`}
          className="flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 font-mono text-xs uppercase tracking-widest text-[#ff9f0a]/70 backdrop-blur-md transition-all hover:bg-black/60 hover:text-[#ff9f0a]"
        >
          <ArrowLeft className="size-3.5" />
          Hub
        </Link>
      </div>

      {/* ═══ FULLSCREEN CURTAIN OVERLAY ═══ */}
      <AnimatePresence>
        {phase === 'curtain' && (
          <motion.div
            className="fixed inset-0 z-[60] flex overflow-hidden cursor-pointer"
            key="curtain"
            onClick={() => setPhase('countdown')}
          >
            <motion.div
              className="standup-curtain-panel h-full w-1/2"
              exit={{ x: '-100%' }}
              transition={{ duration: 1.8, ease: [0.76, 0, 0.24, 1] }}
            />
            <motion.div
              className="standup-curtain-panel standup-curtain-panel-right h-full w-1/2"
              exit={{ x: '100%' }}
              transition={{ duration: 1.8, ease: [0.76, 0, 0.24, 1] }}
            />
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
              <div className="relative mb-6">
                <div className="standup-portrait-glow" />
                <div className="h-28 w-28 overflow-hidden rounded-full border-2 border-[#ff9f0a]/30 shadow-[0_0_40px_rgba(255,159,10,0.2)]">
                  <Image
                    src="/icons/standup/comedian-portrait.webp"
                    alt="" width={224} height={224}
                    className="h-full w-full object-cover object-top"
                    priority aria-hidden="true"
                  />
                </div>
              </div>
              <motion.h1
                layoutId="comedy-night-title"
                className="standup-neon font-[var(--font-syne)] text-5xl font-extrabold uppercase tracking-wider sm:text-7xl md:text-8xl"
              >
                Comedy Night
              </motion.h1>
              <p className="mt-4 font-mono text-xs uppercase tracking-[0.3em] text-[#ff9f0a]/40 animate-pulse">
                Dotknij zeby otworzyc kurtyne
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ SCENE 1: VENUE ENTRY ═══ */}
      {(phase === 'entrance' || phase === 'show') && (
        <section className="standup-scene">
          <motion.div
            className="flex flex-col items-center text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
              <BrandLogo size="sm" />
              <span className="font-mono text-sm tracking-wide text-white/40">presents</span>
            </div>

            <motion.h1
              layoutId="comedy-night-title"
              className="standup-neon mt-3 font-[var(--font-syne)] text-2xl font-extrabold uppercase tracking-wider sm:text-4xl"
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            >
              Comedy Night
            </motion.h1>

            {standupResult?.showTitle && (
              <p className="mt-2 font-mono text-xs tracking-wide text-[#ff9f0a]/40">
                {standupResult.showTitle}
              </p>
            )}

            <motion.div
              className="mt-6 flex flex-col items-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <p className="text-base text-[#888]">
                Dzisiejszy performer: TWOJ CHAT
              </p>
            </motion.div>

            {phase === 'entrance' && !hasResult && (
              <motion.div
                className="mt-10"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <button
                  onClick={handleStartShow}
                  disabled={genState === 'generating'}
                  className="standup-generate-btn"
                >
                  <Mic className="size-5" />
                  Rozpocznij Show
                </button>

                {genState === 'error' && (
                  <p className="mt-4 font-mono text-xs text-red-400">
                    Blad — sprobuj ponownie
                  </p>
                )}
              </motion.div>
            )}

            {phase === 'show' && hasResult && revealIndex < 1 && (
              <motion.div
                className="mt-12 flex flex-col items-center gap-2 text-[#ff9f0a]/40"
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Show zaczyna sie</span>
                <ChevronDown className="size-5" />
              </motion.div>
            )}
          </motion.div>
        </section>
      )}

      {/* ═══ GENERATING PHASE ═══ */}
      {phase === 'generating' && (
        <GeneratingScene progress={progress} />
      )}

      {/* ═══ ACTS ═══ */}
      {phase === 'show' && standupResult && (
        <>
          {standupResult.acts.map((act, i) => (
            <div key={act.number}>
              {i > 0 && (
                <ActInterlude visible={revealIndex >= i} actIndex={i} />
              )}
              <ActCard
                act={act}
                index={i}
                actRef={(el) => { actRefs.current[i] = el; }}
                revealed={revealIndex >= i}
                active={i === currentActIndex}
                onPunchlineComplete={handlePunchlineComplete}
              />
            </div>
          ))}

          {/* ═══ OUTRO SECTION 1: MIC DROP + CLOSING ═══ */}
          {allRevealed && (
            <section className="standup-scene">
              <div className="relative mx-auto w-full max-w-3xl text-center">
                {/* Standing ovation particles */}
                {showOvation && (
                  <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
                    {Array.from({ length: 40 }).map((_, i) => (
                      <span
                        key={i}
                        className="standup-ovation-particle"
                        style={{
                          left: `${2 + Math.random() * 96}%`,
                          animationDelay: `${Math.random() * 2}s`,
                          animationDuration: `${2 + Math.random() * 2}s`,
                          fontSize: `${1.2 + Math.random() * 1.2}rem`,
                        }}
                      >
                        {['👏', '🎉', '⭐', '🔥', '✨', '🎤', '💫', '🏆'][i % 8]}
                      </span>
                    ))}
                    <div className="absolute inset-x-0 top-1/3 flex flex-col items-center">
                      <span className="standup-ovation-text font-[var(--font-syne)] text-3xl font-extrabold uppercase tracking-[0.2em] sm:text-5xl">
                        Standing Ovation
                      </span>
                    </div>
                  </div>
                )}

                <StandUpSection>
                  {/* Mic drop animation */}
                  <motion.div
                    className="relative mx-auto mb-8"
                    initial={{ y: 0, opacity: 1 }}
                    whileInView={{ y: 80, opacity: 0.4, rotate: 720 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, delay: 0.3, ease: 'easeIn' }}
                    onAnimationComplete={() => {
                      setMicDropped(true);
                      setShaking(true);
                      setTimeout(() => setShaking(false), 500);
                    }}
                  >
                    <span className="text-5xl" aria-hidden="true">🎤</span>
                    <div className={`standup-mic-shadow ${micDropped ? 'dropped' : ''}`} />
                  </motion.div>

                  <h2 className="font-[var(--font-syne)] text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
                    {standupResult.closingLine}
                  </h2>

                  <p className="mt-4 font-mono text-sm text-[#ff9f0a]/70">
                    {standupResult.audienceRating}
                  </p>

                  {/* Reaction count — big number */}
                  <div className="mt-8 flex flex-col items-center">
                    <span className="font-mono text-4xl font-extrabold text-[#ff9f0a]">{totalReactions}</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ff9f0a]/40">
                      {totalReactions === 1 ? 'reakcja publiczności' : totalReactions < 5 ? 'reakcje publiczności' : 'reakcji publiczności'}
                    </span>
                  </div>
                </StandUpSection>
              </div>
            </section>
          )}

          {/* ═══ OUTRO SECTION 2: STATS + ACTIONS ═══ */}
          {allRevealed && (
            <section className="standup-scene" style={{ minHeight: 'auto' }}>
              <div className="mx-auto w-full max-w-3xl text-center pb-32">
                <StandUpSection>
                  {/* Summary stats */}
                  <div className="flex flex-wrap justify-center gap-6">
                    <div className="text-center">
                      <span className="font-mono text-2xl font-extrabold text-white">{standupResult.acts.length}</span>
                      <span className="block font-mono text-[10px] uppercase tracking-[0.15em] text-[#888]">Aktow</span>
                    </div>
                    <div className="text-center">
                      <span className="font-mono text-2xl font-extrabold text-white">
                        {standupResult.acts.reduce((sum, a) => sum + a.lines.length, 0)}
                      </span>
                      <span className="block font-mono text-[10px] uppercase tracking-[0.15em] text-[#888]">Punchlines</span>
                    </div>
                    <div className="text-center">
                      <span className="font-mono text-2xl font-extrabold text-[#ff9f0a]">
                        {standupResult.acts.filter(a => a.callback).length}
                      </span>
                      <span className="block font-mono text-[10px] uppercase tracking-[0.15em] text-[#888]">Callbacks</span>
                    </div>
                  </div>

                  <div className="my-8 mx-auto h-px w-48 bg-gradient-to-r from-transparent via-[#ff9f0a]/30 to-transparent" />

                  {/* Actions — PDF + Nowy występ */}
                  <div className="flex flex-wrap justify-center gap-4">
                    <div className="flex items-center gap-2 rounded-xl border border-[#ff9f0a]/20 bg-[#ff9f0a]/10 px-6 py-3 font-mono text-xs font-medium uppercase tracking-wider text-[#ff9f0a]">
                      <Download className="size-4" />
                      <StandUpPDFButton analysis={analysis} />
                    </div>
                    <button
                      onClick={handleRegenerate}
                      className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-6 py-3 font-mono text-xs font-medium uppercase tracking-wider text-[#888] transition-all hover:bg-white/[0.06] hover:text-white"
                    >
                      <RefreshCw className="size-4" />
                      Nowy występ
                    </button>
                  </div>

                  <div className="mt-6">
                    <Link
                      href={`/analysis/${analysisId}`}
                      className="flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-widest text-[#ff9f0a]/40 transition-colors hover:text-[#ff9f0a]"
                    >
                      <ArrowLeft className="size-3" />
                      Centrum Dowodzenia
                    </Link>
                  </div>
                </StandUpSection>
              </div>
            </section>
          )}
        </>
      )}
    </div>
    </SectionErrorBoundary>
  );
}
