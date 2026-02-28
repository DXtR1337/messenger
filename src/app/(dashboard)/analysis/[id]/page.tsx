'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import Link from 'next/link';

import { useAnalysis } from '@/lib/analysis/analysis-context';
import BrandLogo from '@/components/shared/BrandLogo';
import PortalCard from '@/components/shared/PortalCard';
import { SectionErrorBoundary } from '@/components/shared/SectionErrorBoundary';
import type { PortalStatus } from '@/components/shared/PortalCard';
import type { ModeId } from '@/components/shared/ModePageShell';

const DelusionQuiz = dynamic(() => import('@/components/analysis/DelusionQuiz'), {
  ssr: false,
  loading: () => <div className="brand-shimmer h-48" />,
});

// ── Confetti (celebration on first visit after upload) ────

function Confetti({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ec4899'];
    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * 100,
      w: 4 + Math.random() * 6,
      h: 8 + Math.random() * 12,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 4,
      rot: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
      opacity: 1,
    }));

    const start = Date.now();
    let raf: number;

    function draw() {
      if (!ctx || !canvas) return;
      const elapsed = Date.now() - start;
      if (elapsed > 3000) { onDone(); return; }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const fade = elapsed > 2000 ? 1 - (elapsed - 2000) / 1000 : 1;

      for (const p of particles) {
        p.x += p.vx;
        p.vy += 0.1;
        p.y += p.vy;
        p.rot += p.rotSpeed;
        p.opacity = fade;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 9999 }}
    />
  );
}

// ── Scramble Counter — Gemini 1:1 ────────────────────────

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';

function ScrambleCounter({
  value,
  displayValue,
  suffix,
}: {
  value: number;
  displayValue: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState(displayValue);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || value === 0) {
      setDisplay(displayValue);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        observer.disconnect();

        const scrambleDuration = 600;
        const totalDuration = 1500;
        const startTime = performance.now();
        const targetFormatted = displayValue;
        const formatLen = targetFormatted.length;
        let lastFrame = 0;
        const THROTTLE_MS = 50;

        function tick(now: number) {
          // Throttle to ~20fps instead of 60fps
          if (now - lastFrame < THROTTLE_MS) {
            requestAnimationFrame(tick);
            return;
          }
          lastFrame = now;

          const elapsed = now - startTime;

          if (elapsed < scrambleDuration) {
            let scrambled = '';
            for (let i = 0; i < formatLen; i++) {
              scrambled += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            }
            setDisplay(scrambled);
            requestAnimationFrame(tick);
          } else {
            const resolveElapsed = elapsed - scrambleDuration;
            const progress = Math.min(resolveElapsed / (totalDuration - scrambleDuration), 1);
            const ease = 1 - Math.pow(1 - progress, 4);
            const currentVal = Math.floor(value * ease);
            setDisplay(currentVal.toLocaleString('pl-PL'));

            if (progress < 1) {
              requestAnimationFrame(tick);
            } else {
              setDisplay(displayValue);
            }
          }
        }

        requestAnimationFrame(tick);
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value, displayValue]);

  return (
    <div ref={ref} className="font-mono text-[36px] font-extrabold tracking-[-0.04em] text-white leading-none" style={{ textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
      {display}
      {suffix && <span className="text-base text-muted-foreground">{suffix}</span>}
    </div>
  );
}

// ── Portal card definitions ──────────────────────────────

type ModeCategory = 'analysis' | 'entertainment' | 'tools';

const CATEGORY_LABELS: Record<ModeCategory, string> = {
  analysis: 'Analiza',
  entertainment: 'Rozrywka',
  tools: 'Narzedzia',
};

interface ModeDefinition {
  id: ModeId;
  title: string;
  description: string;
  accent: string;
  illustration?: string;
  requiresAI?: boolean;
  uploadOnly?: boolean;
  hideServerView?: boolean;
  videoSrc?: string;
  category: ModeCategory;
  recommended?: boolean;
}

const MODE_DEFINITIONS: ModeDefinition[] = [
  // ── Analiza ──
  {
    id: 'ai',
    title: 'AI Deep Dive',
    description: 'Przegląd surowych tokenów semantycznych modeli LLM.',
    accent: '#a855f7',
    videoSrc: '/videos/modes/ai.mp4',
    category: 'analysis',
    recommended: true,
  },
  {
    id: 'metrics',
    title: 'Data Observatory',
    description: 'Matematyczne spojrzenie na metadane rozmowy.',
    accent: '#3b82f6',
    uploadOnly: true,
    videoSrc: '/videos/modes/metrics.mp4',
    category: 'analysis',
    recommended: true,
  },
  {
    id: 'cps',
    title: 'CPS Screening',
    description: 'Ocena stabilności psychicznej i toksyczności.',
    accent: '#10b981',
    requiresAI: true,
    videoSrc: '/videos/modes/cps.mp4',
    category: 'analysis',
  },
  {
    id: 'moral',
    title: 'Moral Foundations',
    description: 'Fundamentalne wartości i zapalniki w kłótniach.',
    accent: '#f97316',
    requiresAI: true,
    videoSrc: '/videos/modes/moral.mp4',
    category: 'analysis',
  },
  {
    id: 'emotions',
    title: 'Emotion Causes',
    description: 'Analiza głównych emocji i tego, co je wywołuje.',
    accent: '#06b6d4',
    requiresAI: true,
    videoSrc: '/videos/modes/emotions.mp4',
    category: 'analysis',
  },
  {
    id: 'capitalization',
    title: 'Kapitalizacja (ACR)',
    description: 'Jak reagujecie na dobre wieści partnera?',
    accent: '#ec4899',
    requiresAI: true,
    videoSrc: '/videos/modes/capitalization.mp4',
    category: 'analysis',
  },
  // ── Rozrywka ──
  {
    id: 'roast',
    title: 'Roast Arena',
    description: 'Brutalna, ale szczera analiza dynamiki rozmowy.',
    accent: '#ff4500',
    requiresAI: true,
    videoSrc: '/videos/modes/roast.mp4',
    category: 'entertainment',
    recommended: true,
  },
  {
    id: 'court',
    title: 'Sąd Chatowy',
    description: 'Kto ma rację w tych niekończących się kłótniach?',
    accent: '#d4a853',
    requiresAI: true,
    videoSrc: '/videos/modes/court.mp4',
    category: 'entertainment',
  },
  {
    id: 'standup',
    title: 'Stand-Up Comedy',
    description: 'Najśmieszniejsze momenty z waszej relacji.',
    accent: '#ff9f0a',
    requiresAI: true,
    videoSrc: '/videos/modes/standup.mp4',
    category: 'entertainment',
  },
  {
    id: 'subtext',
    title: 'Subtext Decoder',
    description: 'Co naprawdę oznaczają te "ok" i "aha".',
    accent: '#00ff41',
    requiresAI: true,
    videoSrc: '/videos/modes/subtext.mp4',
    category: 'entertainment',
  },
  {
    id: 'dating',
    title: 'Dating Profile',
    description: 'Jak wyglądalibyście na Tinderze?',
    accent: '#ff006e',
    requiresAI: true,
    videoSrc: '/videos/modes/dating.mp4',
    category: 'entertainment',
  },
  {
    id: 'simulator',
    title: 'Reply Simulator',
    description: 'AI wymyśla za Ciebie idealną odpowiedź.',
    accent: '#0084ff',
    requiresAI: true,
    videoSrc: '/videos/modes/simulator.mp4',
    category: 'entertainment',
  },
  {
    id: 'delusion',
    title: 'Delusion Quiz',
    description: 'Sprawdź, jak bardzo się oszukujecie.',
    accent: '#8b5cf6',
    uploadOnly: true,
    hideServerView: true,
    videoSrc: '/videos/modes/delusion.mp4',
    category: 'entertainment',
  },
  // ── Narzedzia ──
  {
    id: 'argument',
    title: 'Symulacja Kłótni',
    description: 'Jak wyglądałaby wasza kłótnia na dany temat?',
    accent: '#ef4444',
    uploadOnly: true,
    category: 'tools',
  },
  {
    id: 'share',
    title: 'Export Studio',
    description: 'Generator pięknych raportów do plików PDF.',
    accent: '#8b5cf6',
    uploadOnly: true,
    videoSrc: '/videos/modes/share.mp4',
    category: 'tools',
  },
];

// ── Formatting helpers ───────────────────────────────

function formatNumber(n: number): string {
  return n.toLocaleString('pl-PL');
}

function formatResponseTime(ms: number | undefined): string {
  if (!ms || ms <= 0) return '--';
  const minutes = ms / 60000;
  if (minutes < 1) return `${Math.round(ms / 1000)}s`;
  if (minutes < 60) return `${Math.round(minutes)}m ${Math.round((minutes % 1) * 60)}s`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${Math.round(hours / 24)}d`;
}

function formatDuration(startMs: number, endMs: number): string {
  const diffMs = endMs - startMs;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const months = Math.floor(days / 30);
  const years = Math.floor(months / 12);
  const remMonths = months % 12;

  if (years > 0 && remMonths > 0) return `${years}L ${remMonths}M`;
  if (years > 0) return `${years}L`;
  if (months > 0) return `${months}M`;
  return `${days}D`;
}

function getPlatformName(platform: string): string {
  switch (platform) {
    case 'messenger': return 'Messenger';
    case 'whatsapp': return 'WhatsApp';
    case 'instagram': return 'Instagram';
    case 'telegram': return 'Telegram';
    case 'discord': return 'Discord';
    default: return platform;
  }
}

// ── Main Component ───────────────────────────────────────

export default function CommandCenterPage() {
  const params = useParams();
  const id = params.id as string;
  const {
    quantitative,
    qualitative,
    conversation,
    participants,
    isServerView,
    hasQualitative,
    runningOperations,
    onDelusionComplete,
  } = useAnalysis();

  const HUB_VIDEOS = useMemo(() => ['/videos/modes/hub.mp4', '/videos/modes/hub-ambient.mp4', '/videos/modes/hub-ambient-2.mp4'], []);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showQuizGate, setShowQuizGate] = useState(true);
  const [hubVideoIdx, setHubVideoIdx] = useState(0);
  const hubVideoRef = useRef<HTMLVideoElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Hub video cycling — load next video on index change
  useEffect(() => {
    const video = hubVideoRef.current;
    if (!video) return;
    video.load();
    video.play().catch(() => {});
  }, [hubVideoIdx]);

  // Celebration on first visit
  useEffect(() => {
    const celebrateKey = `podtekst-celebrate-${id}`;
    if (sessionStorage.getItem(celebrateKey)) {
      sessionStorage.removeItem(celebrateKey);
      setShowConfetti(true);
    }
  }, [id]);

  // Global mouse tracking — RAF-throttled for 60fps smoothness + grid pulse
  const lastCellRef = useRef({ col: -1, row: -1 });

  useEffect(() => {
    let rafId = 0;
    let mx = 0;
    let my = 0;

    const tick = () => {
      rafId = 0;
      const grid = gridRef.current;
      if (!grid) return;

      grid.style.setProperty('--mouse-x', `${mx}px`);
      grid.style.setProperty('--mouse-y', `${my}px`);

      // Detect grid cell change (40px cells) — fire glow pulse
      const col = Math.floor(mx / 40);
      const row = Math.floor(my / 40);
      if (col !== lastCellRef.current.col || row !== lastCellRef.current.row) {
        lastCellRef.current = { col, row };
        grid.classList.remove('grid-pulse');
        // Force reflow to restart animation
        void grid.offsetWidth;
        grid.classList.add('grid-pulse');
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!rafId) rafId = requestAnimationFrame(tick);
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Map mode IDs → running operation keys
  const modeRunningOps: Partial<Record<ModeId, string[]>> = useMemo(() => ({
    roast: ['enhanced-roast', 'mega-roast'],
    court: ['court'],
    dating: ['dating'],
  }), []);

  // Compute portal card statuses
  const getPortalStatus = useCallback(
    (mode: ModeDefinition): PortalStatus => {
      // Check if any operation for this mode is currently running
      const ops = modeRunningOps[mode.id];
      if (ops?.some(op => runningOperations.has(op))) return 'running';

      if (mode.uploadOnly) return 'ready';
      if (mode.id === 'ai') {
        if (qualitative?.status === 'running') return 'running';
        if (hasQualitative) return 'completed';
        return 'ready';
      }
      if (mode.requiresAI && !hasQualitative) return 'locked';
      switch (mode.id) {
        case 'roast': return qualitative?.roast ? 'completed' : 'ready';
        case 'court': return qualitative?.courtTrial ? 'completed' : 'ready';
        case 'standup': return qualitative?.standupRoast ? 'completed' : 'ready';
        case 'subtext': return qualitative?.subtext ? 'completed' : 'ready';
        case 'dating': return qualitative?.datingProfile ? 'completed' : 'ready';
        case 'cps': return qualitative?.cps ? 'completed' : 'ready';
        case 'moral': return 'ready';
        case 'emotions': return 'ready';
        case 'capitalization': return qualitative?.capitalization ? 'completed' : 'ready';
        case 'argument': return qualitative?.argumentSimulation ? 'completed' : 'ready';
        case 'delusion': return qualitative?.delusionQuiz ? 'completed' : 'ready';
        default: return 'ready';
      }
    },
    [qualitative, hasQualitative, runningOperations, modeRunningOps],
  );

  const completedCount = useMemo(
    () => MODE_DEFINITIONS.filter((m) => getPortalStatus(m) === 'completed').length,
    [getPortalStatus],
  );

  const visibleModes = useMemo(
    () => MODE_DEFINITIONS.filter((m) => !(m.hideServerView && isServerView)),
    [isServerView],
  );

  const lastCompletedIdx = useMemo(() => {
    let lastIdx = -1;
    visibleModes.forEach((mode, i) => {
      if (getPortalStatus(mode) === 'completed') lastIdx = i;
    });
    return lastIdx;
  }, [visibleModes, getPortalStatus]);

  // Mini previews for completed modes
  const getModePreview = useCallback(
    (mode: ModeDefinition): React.ReactNode => {
      if (getPortalStatus(mode) !== 'completed') return undefined;
      switch (mode.id) {
        case 'roast': {
          const roast = qualitative?.roast;
          if (!roast) return undefined;
          const count = Object.values(roast.roasts_per_person).flat().length;
          return <span className="font-mono text-[10px] text-emerald-400/70 uppercase tracking-widest">{count} linii roastu</span>;
        }
        case 'court': {
          const courtVerdict = qualitative?.courtTrial?.verdict;
          return courtVerdict ? (
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: '#6366f1' }}>
              {courtVerdict.summary.slice(0, 40)}{courtVerdict.summary.length > 40 ? '...' : ''}
            </span>
          ) : undefined;
        }
        case 'standup':
          return qualitative?.standupRoast ? (
            <span className="font-mono text-[10px] text-amber-400/70 uppercase tracking-widest">
              {qualitative.standupRoast.acts?.length || 7} aktów
            </span>
          ) : undefined;
        case 'ai': {
          const hs = qualitative?.pass4?.health_score?.overall;
          return hs !== undefined ? (
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: hs >= 70 ? '#10b981' : hs >= 40 ? '#f59e0b' : '#ef4444' }}>
              Health Score: {hs}/100
            </span>
          ) : undefined;
        }
        case 'cps':
          return qualitative?.cps ? (
            <span className="font-mono text-[10px] text-emerald-400/70 uppercase tracking-widest">63 wzorców</span>
          ) : undefined;
        case 'delusion':
          return qualitative?.delusionQuiz ? (
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: '#8b5cf6' }}>
              Delusion Index: {qualitative.delusionQuiz.delusionIndex}
            </span>
          ) : undefined;
        case 'subtext':
          return qualitative?.subtext ? (
            <span className="font-mono text-[10px] text-purple-400/70 uppercase tracking-widest">
              {qualitative.subtext.items?.length || 0} wymian
            </span>
          ) : undefined;
        case 'dating':
          return qualitative?.datingProfile ? (
            <span className="font-mono text-[10px] text-pink-400/70 uppercase tracking-widest">Profile gotowe</span>
          ) : undefined;
        case 'argument': {
          const argSim = qualitative?.argumentSimulation;
          return argSim ? (
            <span className="font-mono text-[10px] text-red-400/70 uppercase tracking-widest">
              {argSim.messages?.length || 0} wiadomości
            </span>
          ) : undefined;
        }
        default:
          return undefined;
      }
    },
    [getPortalStatus, qualitative],
  );

  // Quiz gate for 2-person non-group chats
  const canShowQuizGate =
    !conversation.metadata.isGroup &&
    participants.length === 2 &&
    !qualitative?.delusionQuiz &&
    showQuizGate;

  if (canShowQuizGate) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <DelusionQuiz
            quantitative={quantitative}
            conversation={conversation}
            onComplete={(result) => {
              onDelusionComplete(result);
              setShowQuizGate(false);
            }}
          />
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            onClick={() => setShowQuizGate(false)}
            className="mx-auto mt-6 flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-text-muted transition-colors hover:border-border-hover hover:text-foreground"
          >
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" /></svg>
            Pomiń i pokaż wyniki
          </motion.button>
        </div>
      </div>
    );
  }

  // ── Computed KPI values ─────────────────────────────────
  const totalMessages = conversation.metadata.totalMessages;
  const avgResponseTime = participants.length > 0
    ? Math.round(
        Object.values(quantitative.timing.perPerson).reduce(
          (sum, p) => sum + (p.medianResponseTimeMs ?? 0),
          0,
        ) / Object.keys(quantitative.timing.perPerson).length,
      )
    : undefined;
  const healthScore = qualitative?.pass4?.health_score?.overall;
  const compatibilityScore = quantitative.viralScores?.compatibilityScore;
  const badgeCount = quantitative.badges?.length || 0;

  const durationLabel = formatDuration(
    conversation.metadata.dateRange.start,
    conversation.metadata.dateRange.end,
  );

  return (
    <div data-mode="hub" className="relative min-h-dvh">
      {showConfetti && (
        <SectionErrorBoundary section="Confetti" fallback={null}>
          <Confetti onDone={() => setShowConfetti(false)} />
        </SectionErrorBoundary>
      )}

      {/* Hub ambient video background — cycles 3 variants, scaled to crop Veo watermark */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <video
          ref={hubVideoRef}
          className="h-full w-full object-cover opacity-20 mix-blend-screen"
          style={{ transform: 'scale(1.4)', transformOrigin: 'center 40%' }}
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={() => setHubVideoIdx(prev => (prev + 1) % HUB_VIDEOS.length)}
        >
          <source src={HUB_VIDEOS[hubVideoIdx]} type="video/mp4" />
        </video>
      </div>

      {/* Aurora mesh background */}
      <div className="aurora-mesh" aria-hidden="true">
        <div className="aurora-blob-3" />
      </div>

      {/* CRT noise + scanlines cinematic grain */}
      <svg className="crt-noise-overlay" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <filter id="cinematicNoise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#cinematicNoise)" />
      </svg>
      <div className="crt-scanlines" aria-hidden="true" />

      {/* Interactive Grid — Gemini cursor-following */}
      <div ref={gridRef} className="interactive-grid" aria-hidden="true" />

      {/* Ambient depth layers */}
      <div className="ambient-noise" />

      <div className="relative z-[1] mx-auto max-w-[1440px] px-4 py-6 pb-32 sm:px-6 md:px-8 lg:px-12">

        {/* ═══ 1. HEADER ZONE ═══ */}
        <header className="relative flex items-center justify-between pb-6">
          {/* Left: brand → links to hero page */}
          <Link href="/" className="transition-opacity hover:opacity-80">
            <BrandLogo size="lg" />
          </Link>

          {/* Center: conversation meta */}
          <div className="flex items-center gap-3">
            <span className="font-[var(--font-syne)] text-[17px] font-bold tracking-tight text-white">
              {conversation.title}
            </span>
            <span className="hidden sm:inline font-mono text-[13px] tracking-[0.02em] text-white/40">
              {durationLabel}
            </span>
          </div>

          {/* Right: export button */}
          <Link
            href={`/analysis/${id}/share`}
            className="flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-5 py-2.5 text-sm font-medium text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_0_20px_rgba(139,92,246,0.15)] transition-all hover:bg-violet-500/20 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_0_30px_rgba(139,92,246,0.4)] hover:-translate-y-px"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            <span>Eksportuj Raport</span>
          </Link>

          {/* Subtle bottom divider */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
        </header>

        {/* ═══ DISCLAIMER ═══ */}
        <div className="mb-8 flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <span className="mt-0.5 shrink-0 text-amber-500 text-sm leading-none">&#9888;</span>
          <p className="text-xs leading-relaxed text-amber-200/70">
            Ta analiza służy celom informacyjnym i rozrywkowym.{' '}
            <strong className="text-amber-200/90">NIE stanowi oceny klinicznej, psychologicznej ani profesjonalnej.</strong>
          </p>
        </div>

        {/* ═══ 2. KPI STRIP — Gemini scramble counters ═══ */}
        <SectionErrorBoundary section="KPI">
          <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 lg:gap-5">
            <KPICard
              label="Wiadomości"
              value={totalMessages}
              displayValue={formatNumber(totalMessages)}
              accent="#f97316"
            />
            <KPICard
              label="Średni RT"
              value={0}
              displayValue={formatResponseTime(avgResponseTime)}
              accent="#06b6d4"
            />
            <KPICard
              label="Kompatybilność"
              value={compatibilityScore ?? 0}
              displayValue={compatibilityScore !== undefined ? `${compatibilityScore}` : '--'}
              valueSuffix="%"
              accent="#6366f1"
            />
            <KPICard
              label="Health Score"
              value={healthScore ?? 0}
              displayValue={healthScore !== undefined ? `${healthScore}` : '--'}
              valueSuffix="/100"
              accent="#10b981"
            />
            <KPICard
              label="Odznaki"
              value={badgeCount}
              displayValue={`${badgeCount}`}
              accent="#f59e0b"
              premium
              premiumLabel={badgeCount > 10 ? 'Top 5%' : undefined}
            />
          </section>
        </SectionErrorBoundary>

        {/* ═══ 3. PROGRESS BAR ═══ */}
        <section className="mb-12">
          <div className="mb-3 flex justify-between font-mono text-xs tracking-[0.05em]">
            <span className="uppercase text-zinc-400">Analiza konwersacji</span>
            <span className="tabular-nums text-white/80">{completedCount}<span className="text-zinc-400">/{visibleModes.length}</span></span>
          </div>
          {/* Gemini: segmented progress bar */}
          <div className="flex gap-1">
            {visibleModes.map((mode, i) => {
              const isCompleted = getPortalStatus(mode) === 'completed';
              const isHead = i === lastCompletedIdx && completedCount < visibleModes.length;
              return (
                <div
                  key={mode.id}
                  className={`progress-seg ${isCompleted ? 'progress-seg-filled' : ''} ${isHead ? 'progress-seg-head' : ''}`}
                  style={{ color: mode.accent }}
                  title={mode.title}
                />
              );
            })}
          </div>
        </section>

        {/* ═══ AI STATUS ═══ */}
        {!hasQualitative && (
          <section className="mb-10">
            <Link
              href={`/analysis/${id}/ai`}
              className="glass group flex items-center justify-center gap-3 rounded-2xl p-5 font-mono text-sm uppercase tracking-wider text-purple-300 transition-all pulse-border hover:bg-purple-500/10"
              style={{ '--mode-accent': '#a855f7', '--mode-glow': 'rgba(168,85,247,0.12)' } as React.CSSProperties}
            >
              <span className="size-2 animate-pulse rounded-full bg-purple-500" />
              Uruchom Analizę AI — odblokuj 10 trybów
              <span className="ml-1 inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
            </Link>
          </section>
        )}

        {/* ═══ QUICK ACTIONS ═══ */}
        <div className="mb-8 flex flex-wrap gap-3">
          <Link
            href={`/analysis/${id}/story`}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 font-mono text-xs font-medium uppercase tracking-wider transition-colors hover:bg-card-hover"
          >
            Story Mode
          </Link>
          <Link
            href={`/analysis/${id}/wrapped`}
            className="inline-flex items-center gap-2 rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-5 py-3 font-mono text-xs font-medium uppercase tracking-wider text-purple-300 transition-colors hover:from-purple-500/20 hover:to-blue-500/20"
          >
            Wrapped
          </Link>
        </div>

        {/* ═══ 4. PORTAL CARDS GRID — grouped by category ═══ */}
        <SectionErrorBoundary section="Portal Cards">
          {(['analysis', 'entertainment', 'tools'] as ModeCategory[]).map((cat) => {
            const catModes = visibleModes.filter((m) => m.category === cat);
            if (catModes.length === 0) return null;
            return (
              <section key={cat} className="mb-10" aria-labelledby={`cat-${cat}`}>
                <h2
                  id={`cat-${cat}`}
                  className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground"
                >
                  {CATEGORY_LABELS[cat]}
                </h2>
                <motion.div
                  className="portal-grid-3d grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.08 } },
                  }}
                >
                  {catModes.map((mode) => (
                    <motion.div
                      key={mode.id}
                      variants={{
                        hidden: { opacity: 0, y: 30, scale: 0.95 },
                        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
                      }}
                    >
                      <PortalCard
                        mode={mode.id}
                        analysisId={id}
                        title={mode.title}
                        description={mode.description}
                        status={getPortalStatus(mode)}
                        lockReason={mode.requiresAI && !hasQualitative ? 'Analiza AI' : undefined}
                        illustration={mode.illustration}
                        accent={mode.accent}
                        preview={getModePreview(mode)}
                        videoSrc={mode.videoSrc}
                        completionBadge={mode.recommended ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-primary">
                            Rekomendowane
                          </span>
                        ) : undefined}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </section>
            );
          })}
        </SectionErrorBoundary>
      </div>
    </div>
  );
}

// ── KPI Card — Gemini 1:1 with scramble counter + spotlight ──

function KPICard({
  label,
  value,
  displayValue,
  valueSuffix,
  accent = '#3b82f6',
  premium,
  premiumLabel,
}: {
  label: string;
  value: number;
  displayValue: string;
  valueSuffix?: string;
  accent?: string;
  premium?: boolean;
  premiumLabel?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty('--mouse-x', `${x}px`);
    cardRef.current.style.setProperty('--mouse-y', `${y}px`);
  }, []);

  return (
    <div
      ref={cardRef}
      role="article"
      aria-label={`${label}: ${displayValue}${valueSuffix || ''}`}
      className={`kpi-card ${premium ? 'kpi-card-premium' : ''}`}
      style={{ '--kpi-accent': accent } as React.CSSProperties}
      onMouseMove={handleMouseMove}
    >
      <div className="flex items-center justify-between mb-3 relative z-[2]">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </span>
        {premium && premiumLabel && (
          <span className="inline-flex items-center gap-1 rounded bg-gradient-to-r from-amber-200 to-amber-500 px-2 py-0.5 font-mono text-[11px] font-extrabold uppercase text-black shadow-[0_0_10px_rgba(245,158,11,0.3)]">
            <span className="text-[10px] leading-none">&#9733;</span>
            {premiumLabel}
          </span>
        )}
      </div>
      <div className="relative z-[2]">
        <ScrambleCounter value={value} displayValue={displayValue} suffix={valueSuffix} />
      </div>
    </div>
  );
}
