'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { MotionConfig } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

import { useAnalysis } from '@/lib/analysis/analysis-context';
import { useAIScrollChoreography } from '@/hooks/useAIScrollChoreography';
import { SectionErrorBoundary } from '@/components/shared/SectionErrorBoundary';
import ModePageShell from '@/components/shared/ModePageShell';
import AnalysisCard from '@/components/shared/AnalysisCard';
import BrandLogo from '@/components/shared/BrandLogo';

/* ── Purple loading skeleton for AI-mode dynamic imports ── */
function AICardSkeleton() {
  return (
    <div className="space-y-3">
      {/* Header line with icon placeholder */}
      <div className="flex items-center gap-3">
        <div className="ai-card-skeleton h-6 w-6 rounded-full" />
        <div className="ai-card-skeleton h-5 w-2/5 rounded-md" />
      </div>
      {/* Paragraph lines with staggered widths */}
      <div className="space-y-2 pt-1">
        <div className="ai-card-skeleton h-3 w-[85%] rounded" style={{ animationDelay: '0.1s' }} />
        <div className="ai-card-skeleton h-3 w-[65%] rounded" style={{ animationDelay: '0.2s' }} />
        <div className="ai-card-skeleton h-3 w-[75%] rounded" style={{ animationDelay: '0.3s' }} />
      </div>
      {/* Content block */}
      <div className="ai-card-skeleton h-28 w-full rounded-xl" style={{ animationDelay: '0.15s' }} />
      {/* Bottom detail line */}
      <div className="flex gap-3 pt-1">
        <div className="ai-card-skeleton h-3 w-16 rounded" style={{ animationDelay: '0.25s' }} />
        <div className="ai-card-skeleton h-3 w-20 rounded" style={{ animationDelay: '0.35s' }} />
      </div>
    </div>
  );
}

const AIAnalysisButton = dynamic(() => import('@/components/analysis/AIAnalysisButton'), { ssr: false, loading: AICardSkeleton });
const AttachmentStyleCards = dynamic(() => import('@/components/analysis/AttachmentStyleCards'), { ssr: false, loading: AICardSkeleton });
const PersonalityDeepDive = dynamic(() => import('@/components/analysis/PersonalityDeepDive'), { ssr: false, loading: AICardSkeleton });
const LoveLanguageCard = dynamic(() => import('@/components/analysis/LoveLanguageCard'), { ssr: false, loading: AICardSkeleton });
const CognitiveFunctionsClash = dynamic(() => import('@/components/analysis/CognitiveFunctionsClash'), { ssr: false, loading: AICardSkeleton });
const DamageReport = dynamic(() => import('@/components/analysis/DamageReport'), { ssr: false, loading: AICardSkeleton });
const AIPredictions = dynamic(() => import('@/components/analysis/AIPredictions'), { ssr: false, loading: AICardSkeleton });
const ThreatMeters = dynamic(() => import('@/components/analysis/ThreatMeters'), { ssr: false, loading: AICardSkeleton });
const ViralScoresSection = dynamic(() => import('@/components/analysis/ViralScoresSection'), { ssr: false, loading: AICardSkeleton });
const TurningPointsTimeline = dynamic(() => import('@/components/analysis/TurningPointsTimeline'), { ssr: false, loading: AICardSkeleton });
const FinalReport = dynamic(() => import('@/components/analysis/FinalReport'), { ssr: false, loading: AICardSkeleton });

/* ── Animation prefix — debug panel flags non-ai animations as foreign ── */
const AI_ANIM_PREFIX = 'ai-';

/* ── AI section labels for navigation dots ── */
const AI_SECTIONS = [
  'Przywiązanie',
  'Miłość',
  'Profil',
  'Kognitywne',
  'Dynamika',
  'Raport',
  'Viral',
  'Predykcje',
  'Zwroty',
  'Podsumowanie',
];

/* ── Scrollspy hook — tracks which section header is currently in view ── */
function useAISectionSpy() {
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const headers = AI_SECTIONS.map((_, i) => document.getElementById(`ai-section-${i}`)).filter(Boolean) as HTMLElement[];
    if (headers.length === 0) return;

    // Track which headers are currently intersecting
    const visibleSet = new Set<number>();

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = headers.indexOf(entry.target as HTMLElement);
          if (idx < 0) return;
          if (entry.isIntersecting) visibleSet.add(idx);
          else visibleSet.delete(idx);
        });
        // Active = lowest visible index (topmost section in view)
        if (visibleSet.size > 0) {
          setActive(Math.min(...visibleSet));
        }
      },
      { rootMargin: '-10% 0px -40% 0px', threshold: 0 },
    );

    headers.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, []);

  return active;
}

/* ── Section progress dots — fixed right nav with energy track (desktop, xl+) ── */
function AISectionDots() {
  const active = useAISectionSpy();
  const prevActive = useRef(active);
  const navRef = useRef<HTMLElement>(null);
  const totalDots = AI_SECTIONS.length;
  // Position of the active indicator along the track (0 to 1)
  const activeRatio = active >= 0 ? active / (totalDots - 1) : 0;

  // Ghost trail — spawn fading dots along the path when active changes
  useEffect(() => {
    if (prevActive.current === active || active < 0 || !navRef.current) {
      prevActive.current = active;
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.innerWidth < 1280) {
      prevActive.current = active;
      return;
    }

    const nav = navRef.current;
    const from = prevActive.current;
    const to = active;
    const steps = Math.abs(to - from);
    const dir = to > from ? 1 : -1;
    const trackHeight = (totalDots - 1) * 40; // 2.5rem = 40px

    // Spawn 3-4 ghost dots between old and new position
    const ghostCount = Math.min(steps + 1, 4);
    for (let g = 0; g < ghostCount; g++) {
      const ratio = from + dir * (g / ghostCount) * steps;
      const yPct = ratio / (totalDots - 1);
      const ghost = document.createElement('div');
      ghost.setAttribute('aria-hidden', 'true');
      const size = 6 - g * 1; // decreasing size
      Object.assign(ghost.style, {
        position: 'absolute',
        left: '50%',
        top: `${yPct * trackHeight}px`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: 'rgba(192,132,252,0.6)',
        boxShadow: '0 0 8px rgba(168,85,247,0.5)',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: '5',
        opacity: '1',
        transition: `all ${0.4 + g * 0.1}s cubic-bezier(0.16,1,0.3,1) ${g * 60}ms`,
      });
      nav.appendChild(ghost);

      // Animate toward the new active position then fade
      requestAnimationFrame(() => {
        const targetY = (to / (totalDots - 1)) * trackHeight;
        ghost.style.top = `${targetY}px`;
        ghost.style.opacity = '0';
        ghost.style.transform = `translate(-50%, -50%) scale(0.3)`;
        setTimeout(() => ghost.remove(), 600 + g * 100);
      });
    }

    prevActive.current = active;
  }, [active, totalDots]);

  return (
    <nav
      ref={navRef}
      className="fixed right-6 top-1/2 z-30 hidden -translate-y-1/2 xl:flex"
      aria-label="Nawigacja sekcji AI"
      style={{ height: `${(totalDots - 1) * 2.5}rem` }}
    >
      {/* Background track line — continuous thin line connecting all dots */}
      <div
        className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(168,85,247,0.12) 10%, rgba(168,85,247,0.08) 90%, transparent 100%)',
        }}
        aria-hidden="true"
      />
      {/* Progress fill — glowing line from top to active dot */}
      <div
        className="absolute left-1/2 top-0 w-px -translate-x-1/2 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          height: `${activeRatio * 100}%`,
          background: 'linear-gradient(180deg, rgba(168,85,247,0.05) 0%, rgba(168,85,247,0.3) 40%, rgba(192,132,252,0.6) 100%)',
          boxShadow: '0 0 8px rgba(168,85,247,0.3), 0 0 20px rgba(168,85,247,0.15)',
        }}
        aria-hidden="true"
      />
      {/* Flowing energy particle along the track */}
      <div
        className="absolute left-1/2 w-1 h-8 -translate-x-1/2 pointer-events-none transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          top: `calc(${activeRatio * 100}% - 1rem)`,
          background: 'linear-gradient(180deg, transparent, rgba(192,132,252,0.8), transparent)',
          filter: 'blur(1px)',
          opacity: active >= 0 ? 0.8 : 0,
        }}
        aria-hidden="true"
      />
      {/* Dots */}
      <div className="relative flex h-full flex-col justify-between">
        {AI_SECTIONS.map((section, i) => {
          const isActive = i === active;
          const isPast = i < active;
          return (
            <button
              key={section}
              onClick={(e) => {
                const el = document.getElementById(`ai-section-${i}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Flash ripple on clicked dot
                const btn = e.currentTarget;
                const ripple = document.createElement('span');
                ripple.setAttribute('aria-hidden', 'true');
                Object.assign(ripple.style, {
                  position: 'absolute', left: '50%', top: '50%',
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: 'rgba(233,213,255,0.9)',
                  boxShadow: '0 0 12px rgba(192,132,252,0.8)',
                  transform: 'translate(-50%,-50%) scale(1)',
                  pointerEvents: 'none', zIndex: '10', opacity: '1',
                });
                btn.appendChild(ripple);
                requestAnimationFrame(() => {
                  ripple.style.transition = 'all 0.5s cubic-bezier(0.16,1,0.3,1)';
                  ripple.style.width = '28px';
                  ripple.style.height = '28px';
                  ripple.style.opacity = '0';
                  setTimeout(() => ripple.remove(), 550);
                });
              }}
              className="ai-nav-dot group relative flex items-center"
              title={section}
              aria-current={isActive ? 'step' : undefined}
            >
              {/* Dot */}
              <span
                className={`relative block rounded-full transition-all duration-500
                  ${isActive
                    ? 'h-3 w-3 bg-purple-400 shadow-[0_0_14px_rgba(168,85,247,0.7),0_0_30px_rgba(168,85,247,0.35)] ring-[3px] ring-purple-400/30'
                    : isPast
                      ? 'h-2 w-2 bg-purple-400/50 ring-1 ring-purple-400/20 group-hover:bg-purple-400 group-hover:shadow-[0_0_12px_rgba(168,85,247,0.6)] group-hover:scale-[1.5]'
                      : 'h-1.5 w-1.5 bg-purple-500/20 ring-1 ring-purple-500/10 group-hover:bg-purple-400/60 group-hover:shadow-[0_0_12px_rgba(168,85,247,0.4)] group-hover:scale-[1.8]'
                  }`}
              />
              {/* Active ring pulse — double sonar rings */}
              {isActive && (
                <>
                  <span
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 rounded-full pointer-events-none"
                    style={{
                      border: '1.5px solid rgba(192,132,252,0.35)',
                      animation: 'ai-nav-ring-pulse 2.5s ease-out infinite',
                    }}
                  />
                  <span
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 rounded-full pointer-events-none"
                    style={{
                      border: '1px solid rgba(168,85,247,0.15)',
                      animation: 'ai-nav-ring-pulse-outer 2.5s ease-out 0.4s infinite',
                    }}
                  />
                </>
              )}
              {/* Label — visible on hover OR when active */}
              <span
                className={`pointer-events-none absolute right-full mr-4 whitespace-nowrap rounded-md px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest transition-all duration-300
                  ${isActive
                    ? 'bg-purple-900/90 text-purple-200 opacity-100 translate-x-0 shadow-[0_0_20px_rgba(168,85,247,0.25)] border border-purple-500/20'
                    : 'bg-purple-950/80 text-purple-300/70 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'
                  }`}
              >
                {section}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ── Scroll depth hook — ref-based, updates DOM directly (zero re-renders) ── */
function useScrollDepth() {
  const depthRef = useRef(0);
  const arcRef = useRef<SVGCircleElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const d = docHeight > 0 ? Math.round((window.scrollY / docHeight) * 100) : 0;
      if (d === depthRef.current) return;
      depthRef.current = d;
      // Direct DOM write — no React state
      if (pctRef.current) pctRef.current.textContent = String(d);
      if (arcRef.current) {
        const c = 2 * Math.PI * 10;
        arcRef.current.style.strokeDashoffset = String(c * (1 - d / 100));
      }
    };
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); };
  }, []);

  return { arcRef, pctRef };
}

/* ── Floating section label — persistent bottom-left context indicator (desktop only) ── */
function AIFloatingLabel() {
  const active = useAISectionSpy();
  const { arcRef, pctRef } = useScrollDepth();
  const [displayed, setDisplayed] = useState('');
  const [opacity, setOpacity] = useState(0);
  const prevRef = useRef(-1);

  useEffect(() => {
    if (active < 0 || active >= AI_SECTIONS.length) {
      setOpacity(0);
      return;
    }
    if (active === prevRef.current) return;
    prevRef.current = active;

    setOpacity(0);
    const timer = setTimeout(() => {
      setDisplayed(AI_SECTIONS[active]);
      setOpacity(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [active]);

  const r = 10;
  const c = 2 * Math.PI * r;

  return (
    <div
      className="ai-floating-label fixed bottom-8 left-8 z-30 hidden items-center gap-3 rounded-full border border-purple-500/10 bg-black/40 px-4 py-2 backdrop-blur-md xl:flex"
      aria-hidden="true"
      style={{
        opacity,
        transition: 'opacity 0.4s ease, border-color 0.6s ease, box-shadow 0.6s ease',
        boxShadow: active >= 0
          ? '0 0 20px rgba(168,85,247,0.08), inset 0 0 12px rgba(168,85,247,0.04)'
          : 'none',
      }}
    >
      {/* Mini circular progress arc — ref-driven, zero re-renders on scroll */}
      <div className="relative flex items-center justify-center">
        <svg width="26" height="26" viewBox="0 0 26 26" className="shrink-0 -rotate-90">
          <circle cx="13" cy="13" r={r} fill="none" stroke="rgba(168,85,247,0.10)" strokeWidth="2" />
          <circle
            ref={arcRef}
            cx="13" cy="13" r={r} fill="none"
            stroke="url(#arc-grad)" strokeWidth="2"
            strokeDasharray={c} strokeDashoffset={c}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)' }}
          />
          <defs>
            <linearGradient id="arc-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(192,132,252,0.9)" />
              <stop offset="100%" stopColor="rgba(168,85,247,0.5)" />
            </linearGradient>
          </defs>
        </svg>
        <span ref={pctRef} className="absolute font-mono text-[7px] font-bold tabular-nums text-purple-300/60">
          0
        </span>
      </div>
      {/* Section number */}
      <span className="font-mono text-[9px] tabular-nums tracking-[0.3em] text-purple-400/50">
        {active >= 0 ? String(active + 1).padStart(2, '0') : '--'}
        <span className="text-purple-500/20"> / </span>
        {String(AI_SECTIONS.length).padStart(2, '0')}
      </span>
      {/* Separator line */}
      <span className="h-3 w-px bg-purple-500/15" />
      {/* Section name */}
      <span className="font-[var(--font-syne)] text-[11px] font-semibold uppercase tracking-[0.2em] text-purple-200/60">
        {displayed}
      </span>
    </div>
  );
}

/* ── Text scramble hook — direct DOM mutation (zero re-renders) ── */
const SCRAMBLE_CHARS = '▓▒░█▌▐╳╬◆◇⬡⎔⏣⌬⬢⬣☰▤▥▦▧▨▩';
function useTextScramble(text: string) {
  const elRef = useRef<HTMLHeadingElement>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    const el = elRef.current;
    if (!el || hasRun.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.innerWidth < 768) return; // Skip scramble on mobile — show text immediately

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasRun.current) return;
        hasRun.current = true;
        io.disconnect();

        const chars = text.split('');
        const total = chars.length;
        const staggerPerChar = 600 / total;
        let frame = 0;
        const resolved = new Array(total).fill(false);
        let rafId: number;

        const scramble = () => {
          frame++;
          const elapsed = frame * 16;
          for (let i = 0; i < total; i++) {
            if (!resolved[i] && elapsed > i * staggerPerChar + 100) resolved[i] = true;
          }
          // Direct DOM write — no React state, no re-render
          el.textContent = chars.map((c, i) => c === ' ' ? ' ' : resolved[i] ? c : SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0]).join('');
          if (!resolved.every(Boolean)) rafId = requestAnimationFrame(scramble);
        };

        el.textContent = chars.map(c => c === ' ' ? ' ' : SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0]).join('');
        rafId = requestAnimationFrame(scramble);
        return () => cancelAnimationFrame(rafId);
      },
      { threshold: 0.5 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [text]);

  return { elRef };
}

/* ── Typewriter subtitle — direct DOM mutation (zero re-renders) ── */
function AITypewriterSubtitle({ text }: { text: string }) {
  const elRef = useRef<HTMLSpanElement>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    const el = elRef.current;
    if (!el) return;
    const textNode = el.querySelector<HTMLSpanElement>('[data-tw-text]');
    const cursorNode = el.querySelector<HTMLSpanElement>('[data-tw-cursor]');
    if (!textNode) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.innerWidth < 768) {
      textNode.textContent = text;
      if (cursorNode) cursorNode.style.display = 'none';
      hasRun.current = true;
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasRun.current) return;
        hasRun.current = true;
        io.disconnect();

        let i = 0;
        setTimeout(() => {
          const interval = setInterval(() => {
            i++;
            textNode.textContent = text.slice(0, i);
            if (i >= text.length) {
              clearInterval(interval);
              setTimeout(() => { if (cursorNode) cursorNode.style.display = 'none'; }, 2000);
            }
          }, 40);
        }, 400);
      },
      { threshold: 0.5 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [text]);

  return (
    <span ref={elRef} className="inline">
      <span data-tw-text />
      <span
        data-tw-cursor
        className="ml-0.5 inline-block h-[1.1em] w-[2px] align-middle"
        style={{
          background: 'linear-gradient(180deg, rgba(192,132,252,0.9), rgba(168,85,247,0.6))',
          boxShadow: '0 0 6px rgba(168,85,247,0.5)',
        }}
      />
    </span>
  );
}

/* ── Section header component — watermark number + glowing line ── */
function AISectionHeader({ label, sectionIndex }: { label: string; sectionIndex: number }) {
  const { elRef } = useTextScramble(label);

  return (
    <div
      id={`ai-section-${sectionIndex}`}
      data-ai-header
      className="ai-section-header flex scroll-mt-24 items-center gap-4"
    >
      {/* Horizontal ornamental divider — sits above the section in the gap */}
      {sectionIndex > 0 && (
        <div className="ai-section-divider" aria-hidden="true">
          <div className="ai-section-divider-line" />
          {/* Center gem — pulsing diamond with concentric rings */}
          <div className="ai-section-divider-gem">
            <div className="ai-section-divider-gem-core" />
            <div className="ai-section-divider-gem-ring" />
            <div className="ai-section-divider-gem-ring ai-section-divider-gem-ring-2" />
          </div>
          <div className="ai-section-divider-line" />
        </div>
      )}
      {/* Connector traveler — glowing orb with comet tail that rides the vertical connector */}
      {sectionIndex > 0 && (
        <div className="ai-connector-traveler" aria-hidden="true" />
      )}

      {/* Large ghost number (animated via GSAP) */}
      <span className="ai-section-num" aria-hidden="true">
        {String(sectionIndex + 1).padStart(2, '0')}
      </span>
      {/* Progress fraction — subtle section counter */}
      <span className="ai-section-progress" aria-hidden="true">
        {String(sectionIndex + 1).padStart(2, '0')}<span className="text-purple-500/20"> / </span>{String(AI_SECTIONS.length).padStart(2, '0')}
      </span>
      <h2
        ref={elRef}
        className="ai-section-label whitespace-nowrap font-[var(--font-syne)]"
        aria-label={label}
      >
        {label}
      </h2>
      <div
        data-ai-line
        className="ai-section-line"
        aria-hidden="true"
      />
    </div>
  );
}

/* ── Count-up hook for animated numbers ── */
function useCountUp(end: number, duration = 1200, start = 0, active = true) {
  const [value, setValue] = useState(start);
  const [landed, setLanded] = useState(false);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (!active) { setValue(start); setLanded(false); return; }
    // Skip animation on mobile — show final value immediately
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setValue(end);
      setLanded(true);
      return;
    }
    setLanded(false);
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo for dramatic start, slow finish
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(Math.round(start + (end - start) * eased));
      if (progress < 1) {
        ref.current = requestAnimationFrame(tick);
      } else {
        setLanded(true);
      }
    };

    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [end, duration, start, active]);

  return { value, landed };
}

/* ── Magnetic tilt hook — 3D perspective follow on hover ── */
function useStatTilt(cellRef: React.RefObject<HTMLDivElement | null>) {
  const rafRef = useRef(0);

  useEffect(() => {
    const el = cellRef.current;
    if (!el || window.innerWidth < 768) return;

    const handleMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const rotY = ((x - cx) / cx) * 6;
        const rotX = ((cy - y) / cy) * 6;
        el.style.transform = `perspective(600px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-4px) scale(1.03)`;
        // Spotlight follow
        el.style.setProperty('--stat-spot-x', `${(x / rect.width) * 100}%`);
        el.style.setProperty('--stat-spot-y', `${(y / rect.height) * 100}%`);
      });
    };
    const handleLeave = () => {
      cancelAnimationFrame(rafRef.current);
      el.style.transform = '';
      el.style.removeProperty('--stat-spot-x');
      el.style.removeProperty('--stat-spot-y');
    };

    el.addEventListener('mousemove', handleMove, { passive: true });
    el.addEventListener('mouseleave', handleLeave);
    return () => {
      cancelAnimationFrame(rafRef.current);
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('mouseleave', handleLeave);
    };
  }, [cellRef]);
}

/* ── Single stat cell with magnetic tilt ── */
function StatCell({ stat, index, visible }: { stat: { value: string | number; label: string; sublabel: string; landed?: boolean }; index: number; visible: boolean }) {
  const cellRef = useRef<HTMLDivElement>(null);
  const sparkFired = useRef(false);
  useStatTilt(cellRef);

  // Spark shower on countup landing
  useEffect(() => {
    if (!stat.landed || sparkFired.current || !cellRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.innerWidth < 640) return;
    sparkFired.current = true;

    const cell = cellRef.current;
    const rect = cell.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height * 0.35; // Origin near the number

    const SPARK_COUNT = 6;
    for (let i = 0; i < SPARK_COUNT; i++) {
      const spark = document.createElement('div');
      spark.className = 'ai-stat-spark';
      spark.setAttribute('aria-hidden', 'true');
      // Random angle spread (full circle)
      const angle = (Math.PI * 2 * i) / SPARK_COUNT + (Math.random() - 0.5) * 0.6;
      const distance = 25 + Math.random() * 40;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      const size = 2 + Math.random() * 2;
      Object.assign(spark.style, {
        position: 'absolute',
        left: `${cx}px`,
        top: `${cy}px`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: i % 3 === 0 ? 'rgba(233,213,255,0.9)' : i % 3 === 1 ? 'rgba(192,132,252,0.8)' : 'rgba(168,85,247,0.7)',
        boxShadow: `0 0 ${size * 2}px rgba(168,85,247,0.6)`,
        pointerEvents: 'none',
        zIndex: '30',
        opacity: '0',
      });
      cell.appendChild(spark);

      // Animate: burst outward, fade, shrink
      const delay = Math.random() * 80;
      requestAnimationFrame(() => {
        spark.style.transition = `all ${0.4 + Math.random() * 0.3}s cubic-bezier(0.16,1,0.3,1) ${delay}ms`;
        spark.style.opacity = '1';
        spark.style.transform = `translate(${dx}px, ${dy}px) scale(1)`;
        setTimeout(() => {
          spark.style.transition = `all 0.3s ease-in`;
          spark.style.opacity = '0';
          spark.style.transform = `translate(${dx * 1.5}px, ${dy * 1.5}px) scale(0)`;
          setTimeout(() => spark.remove(), 350);
        }, 300 + delay);
      });
    }

    // Shockwave ring
    const ring = document.createElement('div');
    ring.setAttribute('aria-hidden', 'true');
    Object.assign(ring.style, {
      position: 'absolute',
      left: `${cx - 4}px`,
      top: `${cy - 4}px`,
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      border: '1.5px solid rgba(192,132,252,0.6)',
      boxShadow: '0 0 12px rgba(168,85,247,0.4)',
      pointerEvents: 'none',
      zIndex: '29',
      opacity: '1',
    });
    cell.appendChild(ring);
    requestAnimationFrame(() => {
      ring.style.transition = 'all 0.6s cubic-bezier(0.16,1,0.3,1)';
      ring.style.width = '60px';
      ring.style.height = '60px';
      ring.style.left = `${cx - 30}px`;
      ring.style.top = `${cy - 30}px`;
      ring.style.opacity = '0';
      ring.style.borderColor = 'rgba(168,85,247,0.05)';
      setTimeout(() => ring.remove(), 650);
    });
  }, [stat.landed]);

  return (
    <div
      ref={cellRef}
      className={`ai-stat-cell group relative flex flex-col items-center justify-center rounded-xl border px-4 py-5 text-center transition-[border-color,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-purple-400/25 ${stat.label === 'Health Score' ? 'border-purple-400/20 ai-stat-health' : 'border-purple-500/[0.12]'} ${visible ? 'ai-stat-revealed' : ''}`}
      style={{
        background: 'linear-gradient(180deg, rgba(168,85,247,0.06) 0%, rgba(88,28,135,0.04) 50%, rgba(20,10,30,0.3) 100%)',
        ['--stat-i' as string]: index,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.92)',
        opacity: visible ? 1 : 0,
        transition: `all 0.7s cubic-bezier(0.22,1,0.36,1) ${0.15 + index * 0.12}s`,
        transformStyle: 'preserve-3d' as const,
        boxShadow: visible
          ? `inset 0 1px 0 0 rgba(192,132,252,0.12), 0 0 30px -10px rgba(168,85,247,0.15), 0 4px 20px -4px rgba(168,85,247,0.08)`
          : 'none',
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute inset-x-0 top-0 h-[1px] rounded-t-xl"
        style={{
          background: 'linear-gradient(90deg, transparent 10%, rgba(168,85,247,0.4) 30%, rgba(192,132,252,0.6) 50%, rgba(168,85,247,0.4) 70%, transparent 90%)',
          transformOrigin: 'center',
          transform: visible ? 'scaleX(1)' : 'scaleX(0)',
          transition: `transform 0.8s cubic-bezier(0.22,1,0.36,1) ${0.4 + index * 0.12}s`,
        }}
      />

      {/* Mouse-tracking spotlight */}
      <div
        className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: 'radial-gradient(200px circle at var(--stat-spot-x, 50%) var(--stat-spot-y, 50%), rgba(168,85,247,0.15), transparent 70%)' }}
        aria-hidden="true"
      />

      {/* Number — large, glowing with breathing pulse + landing flash */}
      <span
        className={`ai-stat-number font-mono text-3xl font-black tracking-tight text-purple-200 sm:text-4xl ${stat.landed ? 'ai-countup-landed' : ''}`}
        style={{ animationDelay: `${index * 1}s` }}
      >
        {stat.value}
      </span>

      {/* Label */}
      <span
        className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.25em] text-purple-300/60"
        style={{
          opacity: visible ? 1 : 0,
          transition: `opacity 0.5s ease ${0.5 + index * 0.12}s`,
        }}
      >
        {stat.label}
      </span>
      <span
        className="font-mono text-[7px] uppercase tracking-[0.2em] text-purple-500/30"
        style={{
          opacity: visible ? 1 : 0,
          transition: `opacity 0.5s ease ${0.6 + index * 0.12}s`,
        }}
      >
        {stat.sublabel}
      </span>

      {/* Hover glow pulse */}
      <div
        className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(168,85,247,0.08), transparent 70%)' }}
      />
    </div>
  );
}

/* ── Stats intro banner — dramatic data reveal ── */
function StatsIntroBanner({
  messageCount,
  participantCount,
  passCount,
  healthScore,
}: {
  messageCount: number;
  participantCount: number;
  passCount: number;
  healthScore?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.3 }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  const msgs = useCountUp(messageCount, 1600, 0, visible);
  const parts = useCountUp(participantCount, 800, 0, visible);
  const passes = useCountUp(passCount, 1000, 0, visible);
  const health = useCountUp(healthScore ?? 0, 1400, 0, visible && !!healthScore);

  const stats = [
    { value: msgs.value.toLocaleString('pl-PL'), label: 'wiadomości', sublabel: 'przeanalizowano', landed: msgs.landed },
    { value: parts.value, label: 'uczestników', sublabel: 'zidentyfikowano', landed: parts.landed },
    { value: passes.value, label: 'passy AI', sublabel: 'zakończone', landed: passes.landed },
    ...(healthScore ? [{ value: health.value, label: 'Health Score', sublabel: 'punktów / 100', landed: health.landed }] : []),
  ];

  return (
    <div
      ref={ref}
      className="relative mx-auto max-w-4xl py-8"
      style={{ opacity: visible ? 1 : 0, ...(typeof window !== 'undefined' && window.innerWidth >= 768 ? { transition: 'opacity 0.8s ease' } : {}) }}
    >
      {/* Large ambient glow behind entire stats zone */}
      <div
        className="pointer-events-none absolute -inset-8 rounded-3xl"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(168,85,247,0.10) 0%, rgba(139,92,246,0.04) 40%, transparent 70%)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 1s ease 0.3s',
        }}
        aria-hidden="true"
      />

      {/* Stats grid — glass cells with magnetic tilt */}
      <div className="ai-stats-grid relative grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {stats.map((stat, i) => (
          <StatCell key={i} stat={stat} index={i} visible={visible} />
        ))}
        {/* Connecting circuit lines between cells — desktop only */}
        {stats.length >= 3 && (
          <div className="ai-stat-circuits pointer-events-none absolute inset-0 hidden sm:block" aria-hidden="true">
            {/* Horizontal line spanning cells */}
            <div
              className="absolute left-[25%] right-[25%] top-1/2 h-px -translate-y-1/2"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(168,85,247,0.15) 15%, rgba(192,132,252,0.20) 50%, rgba(168,85,247,0.15) 85%, transparent 100%)',
                opacity: visible ? 1 : 0,
                transition: 'opacity 0.8s ease 0.8s',
              }}
            />
            {/* Traveling dot on the line */}
            <div
              className="absolute top-1/2 -translate-y-1/2"
              style={{
                left: '25%',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'rgba(192,132,252,0.7)',
                boxShadow: '0 0 8px rgba(168,85,247,0.6), 0 0 16px rgba(168,85,247,0.3)',
                opacity: visible ? 1 : 0,
                animation: visible ? 'ai-stat-circuit-travel 4s ease-in-out infinite 1.5s' : 'none',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIModePage() {
  const {
    analysis,
    quantitative,
    qualitative,
    conversation,
    participants,
    isServerView,
    hasQualitative,
    cognitiveFunctions,
    damageReport,
    threatMeters,
    onAIComplete,
    onRoastComplete,
  } = useAnalysis();

  const pass3 = qualitative?.pass3;
  const pass4 = qualitative?.pass4;
  const [showRerun, setShowRerun] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const neuralCanvasRef = useRef<HTMLCanvasElement>(null);
  // Skip heavy decorative JS on mobile (IntersectionObservers, scroll listeners, canvas)
  const isMobileRef = useRef(typeof window !== 'undefined' && window.innerWidth < 768);

  // GSAP scroll choreography — 12 subsystems: card entries, scan-sweep, section headers,
  // boot terminal, proximity glow, scroll vignette, FIN cinematic, velocity streaks, etc.
  useAIScrollChoreography(containerRef);

  // Force purple palette on framer-motion inline styles
  // forcePurple DOM sweep removed — clean version uses CSS-only purple theming

  // Cursor glow — ambient purple orb with lerp trailing (desktop only)
  const cursorGlowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const glow = cursorGlowRef.current;
    if (!glow) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.innerWidth < 1280) return;

    let visible = false;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    const LERP = 0.07; // Lower = more trailing lag (0.07 ≈ 150ms perceived delay)
    const HALF = 350; // Glow is 700px — offset to center on cursor

    const onMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!visible) {
        visible = true;
        // Snap to cursor on first move (no trailing from center)
        currentX = targetX;
        currentY = targetY;
        glow.style.opacity = '1';
      }
    };

    const onLeave = () => {
      visible = false;
      glow.style.opacity = '0';
    };

    let raf: number;
    const update = () => {
      currentX += (targetX - currentX) * LERP;
      currentY += (targetY - currentY) * LERP;
      glow.style.transform = `translate3d(${currentX - HALF}px, ${currentY - HALF}px, 0)`;
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);

    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  // Neural network canvas — faint lines between nearby floating particles + cursor node
  useEffect(() => {
    const canvas = neuralCanvasRef.current;
    if (!canvas) return;
    if (window.innerWidth < 640) return; // Particles hidden on mobile
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const MAX_DIST = 350; // Max distance for particle-particle connections
    const CURSOR_DIST = 250; // Max distance for cursor-particle connections
    const particles = document.querySelectorAll<HTMLElement>('.ai-particle');
    if (particles.length < 2) return;

    // Track cursor position (the cursor becomes a node in the network)
    let mouseX = -999;
    let mouseY = -999;
    let mouseActive = false;
    const onMove = (e: MouseEvent) => { mouseX = e.clientX; mouseY = e.clientY; mouseActive = true; };
    const onLeave = () => { mouseActive = false; };
    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);

    // Resize canvas to match viewport
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Read positions of all particles (center points)
      const positions: { x: number; y: number }[] = [];
      particles.forEach((p) => {
        const rect = p.getBoundingClientRect();
        positions.push({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      });

      // Draw connections between nearby particles
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const dx = positions[j].x - positions[i].x;
          const dy = positions[j].y - positions[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > MAX_DIST) continue;

          const opacity = (1 - dist / MAX_DIST) * 0.12;
          ctx.strokeStyle = `rgba(168,85,247,${opacity.toFixed(4)})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(positions[i].x, positions[i].y);
          ctx.lineTo(positions[j].x, positions[j].y);
          ctx.stroke();
        }
      }

      // Draw cursor → particle connections (brighter, makes cursor feel like a node)
      if (mouseActive) {
        for (let i = 0; i < positions.length; i++) {
          const dx = positions[i].x - mouseX;
          const dy = positions[i].y - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > CURSOR_DIST) continue;

          const t = 1 - dist / CURSOR_DIST;
          const opacity = t * 0.18; // Slightly brighter than particle-particle
          ctx.strokeStyle = `rgba(192,132,252,${opacity.toFixed(4)})`;
          ctx.lineWidth = 0.6 + t * 0.4; // Thicker when closer
          ctx.beginPath();
          ctx.moveTo(mouseX, mouseY);
          ctx.lineTo(positions[i].x, positions[i].y);
          ctx.stroke();
        }
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  // DEV: Animation debug panel — press ";" to toggle
  const [devOpen, setDevOpen] = useState(false);
  const [devStats, setDevStats] = useState<{
    animations: number; animNames: string[]; animCounts: Record<string, number>;
    domNodes: number; aiElements: number; composited: number;
  } | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const onKey = (e: KeyboardEvent) => { if (e.key === ';') setDevOpen(v => !v); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (!devOpen) return;
    const scan = () => {
      const all = document.querySelectorAll('*');
      let animations = 0;
      const countMap: Record<string, number> = {};
      let composited = 0;
      all.forEach(el => {
        const cs = getComputedStyle(el);
        const anim = cs.animationName;
        if (anim && anim !== 'none') {
          anim.split(',').forEach(n => {
            const name = n.trim();
            if (name !== 'none') {
              animations++;
              countMap[name] = (countMap[name] || 0) + 1;
            }
          });
        }
        if (cs.willChange !== 'auto' || cs.transform !== 'none') composited++;
      });
      const sorted = Object.entries(countMap).sort((a, b) => b[1] - a[1]);
      setDevStats({
        animations,
        animNames: sorted.map(([n]) => n),
        animCounts: countMap,
        domNodes: all.length,
        aiElements: document.querySelectorAll('.ai-perf-kill *').length,
        composited,
      });
    };
    scan();
    const id = setInterval(scan, 3000);
    return () => clearInterval(id);
  }, [devOpen]);

  const hasIncompleteProfiles = pass3 && participants.some(name => {
    const p = pass3[name];
    return p && (!p.attachment_indicators?.primary_style || !p.big_five_approximation);
  });

  // Alternating direction helper
  let cardIndex = 0;
  const nextDir = () => (cardIndex++ % 2 === 0 ? 'left' : 'right');

  return (
    <SectionErrorBoundary section="AIInsights">
    <MotionConfig reducedMotion={isMobileRef.current ? 'always' : 'never'}>
    <div className="ai-perf-kill">

    {/* PERF: Kill will-change to prevent compositor layer explosion.
         CSS animations now run freely — only will-change is neutralized. */}
    <style dangerouslySetInnerHTML={{ __html: `
      /* PERF: Neutralize will-change to prevent compositor layer explosion.
         GSAP controls opacity/transform via inline styles — CSS animations run freely. */
      .ai-perf-kill * { will-change: auto !important; }
      /* Card sway — alternating left/right drift for organic feel (post-reveal) — desktop only */
      @keyframes ai-gentle-sway {
        0%, 100% { transform: translateX(0); }
        50% { transform: translateX(5px); }
      }
      @media (min-width: 768px) {
        .ai-perf-kill [data-ai-card]:nth-child(odd) .analysis-card-accent.ai-scanned {
          animation: ai-card-breathe 6s ease-in-out infinite, ai-gentle-sway 12s ease-in-out infinite !important;
        }
        .ai-perf-kill [data-ai-card]:nth-child(even) .analysis-card-accent.ai-scanned {
          animation: ai-card-breathe 6s ease-in-out infinite, ai-gentle-sway 14s ease-in-out 1s infinite reverse !important;
        }
      }
    ` }} />

    {/* DEV: Animation debug panel — press ";" to toggle */}
    {process.env.NODE_ENV === 'development' && devOpen && devStats && (
      <div className="fixed bottom-4 right-4 z-[9999] w-80 max-h-[70vh] overflow-y-auto rounded-xl border border-purple-500/20 bg-black/95 p-4 font-mono text-[11px] text-purple-200/80 backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold text-purple-300">AI Debug</span>
          <span className="text-[9px] text-purple-500/40">press ; to close</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between border-b border-purple-500/10 pb-1">
            <span className="text-purple-400/60">DOM nodes</span>
            <span className="font-bold">{devStats.domNodes}</span>
          </div>
          <div className="flex justify-between border-b border-purple-500/10 pb-1">
            <span className="text-purple-400/60">AI mode elements</span>
            <span className="font-bold">{devStats.aiElements}</span>
          </div>
          <div className="flex justify-between border-b border-purple-500/10 pb-1">
            <span className="text-purple-400/60">Active animations</span>
            <span className={`font-bold ${devStats.animations > 70 ? 'text-red-400' : devStats.animations > 30 ? 'text-yellow-400' : 'text-green-400'}`}>
              {devStats.animations}
            </span>
          </div>
          <div className="flex justify-between border-b border-purple-500/10 pb-1">
            <span className="text-purple-400/60">Composited layers</span>
            <span className={`font-bold ${devStats.composited > 250 ? 'text-red-400' : devStats.composited > 190 ? 'text-yellow-400' : 'text-green-400'}`}>
              {devStats.composited}
            </span>
          </div>
          <div className="pt-1">
            <div className="mb-1 text-[10px] font-semibold text-purple-400/60">
              Animations ({devStats.animNames.length} unique, {devStats.animations} instances):
            </div>
            <div className="max-h-56 space-y-0.5 overflow-y-auto">
              {devStats.animNames.map(name => {
                const count = devStats.animCounts[name] || 0;
                const allowed = name.startsWith(AI_ANIM_PREFIX);
                return (
                  <div key={name} className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${allowed ? 'bg-purple-500/60' : 'bg-red-500'}`} />
                      <span className={`break-all text-[10px] ${allowed ? 'text-purple-300/70' : 'text-red-400 font-bold'}`}>{name}</span>
                    </div>
                    <span className="shrink-0 text-[10px] text-purple-500/50">×{count}</span>
                  </div>
                );
              })}
              {devStats.animNames.length === 0 && (
                <div className="text-[10px] text-green-400/80">No active CSS animations</div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-3 text-[9px] text-purple-500/40">Auto-refresh 3s</div>
      </div>
    )}

    {/* Desktop-only decorative overlays — skip entire DOM subtree on mobile */}
    {!isMobileRef.current && (
      <>
        <div ref={cursorGlowRef} className="ai-cursor-glow" aria-hidden="true" />
        {hasQualitative && <AISectionDots />}
        {hasQualitative && <AIFloatingLabel />}
        <div className="ai-vignette" aria-hidden="true" />
        <div className="ai-viewport-frame" aria-hidden="true" />
        <div className="ai-scanline" aria-hidden="true" />
        <div className="ai-dot-grid" aria-hidden="true" />
        <div className="ai-fireflies" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="ai-firefly" />
          ))}
        </div>
        <div className="ai-depth-fog" aria-hidden="true" />
        <div className="ai-noise-overlay" aria-hidden="true" />
        <div className="ai-data-streams" aria-hidden="true">
          <div className="ai-stream ai-stream-left">
            <div className="ai-stream-dot" style={{ '--x': '8px', '--size': '2px', '--duration': '12s', '--delay': '0s' } as React.CSSProperties} />
            <div className="ai-stream-dot" style={{ '--x': '25px', '--size': '3px', '--duration': '15s', '--delay': '3s' } as React.CSSProperties} />
            <div className="ai-stream-dash" style={{ '--x': '15px', '--duration': '11s', '--delay': '1s' } as React.CSSProperties} />
            <div className="ai-stream-dot" style={{ '--x': '40px', '--size': '2px', '--duration': '18s', '--delay': '6s' } as React.CSSProperties} />
            <div className="ai-stream-dash" style={{ '--x': '32px', '--duration': '14s', '--delay': '9s' } as React.CSSProperties} />
          </div>
          <div className="ai-stream ai-stream-right">
            <div className="ai-stream-dot" style={{ '--x': '12px', '--size': '3px', '--duration': '13s', '--delay': '2s' } as React.CSSProperties} />
            <div className="ai-stream-dash" style={{ '--x': '28px', '--duration': '16s', '--delay': '5s' } as React.CSSProperties} />
            <div className="ai-stream-dot" style={{ '--x': '45px', '--size': '2px', '--duration': '11s', '--delay': '8s' } as React.CSSProperties} />
            <div className="ai-stream-dot" style={{ '--x': '20px', '--size': '2.5px', '--duration': '19s', '--delay': '4s' } as React.CSSProperties} />
            <div className="ai-stream-dash" style={{ '--x': '38px', '--duration': '14s', '--delay': '7s' } as React.CSSProperties} />
          </div>
        </div>
        {hasQualitative && <div className="ai-scroll-progress" aria-hidden="true" />}
      </>
    )}

    <ModePageShell
      mode="ai"
      title="AI Deep Dive"
      subtitle={<AITypewriterSubtitle text="4-etapowa analiza psychologiczna Twojej konwersacji" />}
      video={{
        src: '/videos/modes/ai-neural.webm',
        fallbackSrc: '/videos/modes/ai-neural.mp4',
        poster: '/videos/posters/ai-neural.webp',
      }}
      titleBadge={
        <span className="group/brand inline-flex items-end gap-1 self-start pt-0.5">
          <span
            className="font-mono text-[10px] font-semibold italic text-purple-400/50 transition-colors group-hover/brand:text-purple-400/80"
            style={{ transform: 'rotate(-16deg)', display: 'inline-block' }}
          >
            by
          </span>
          <BrandLogo
            size="sm"
            className="opacity-50 drop-shadow-[0_0_6px_rgba(168,85,247,0.2)] transition-all duration-300 group-hover/brand:opacity-100 group-hover/brand:drop-shadow-[0_0_12px_rgba(168,85,247,0.5)]"
          />
        </span>
      }
    >

      {/* Scroll-linked vignette — edges darken as you go deeper */}
      <div
        className="ai-scroll-vignette pointer-events-none fixed inset-0 z-[1] opacity-0"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, transparent 0%, rgba(5,0,15,0.4) 70%, rgba(5,0,15,0.7) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Floating neural particles — varied shapes drifting across viewport (desktop only) */}
      <div className="pointer-events-none fixed inset-0 z-[1] hidden overflow-hidden sm:block" aria-hidden="true">
        {/* 1 — Neural node: concentric rings + core */}
        <svg className="ai-particle ai-particle-1" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="4" fill="rgba(192,132,252,0.5)" />
          <circle cx="16" cy="16" r="10" stroke="rgba(168,85,247,0.25)" strokeWidth="0.75" fill="none" />
          <circle cx="16" cy="16" r="15" stroke="rgba(139,92,246,0.12)" strokeWidth="0.5" fill="none" />
        </svg>
        {/* 2 — Hexagonal node */}
        <svg className="ai-particle ai-particle-2" viewBox="0 0 32 32" fill="none">
          <polygon points="16,3 27.9,9.5 27.9,22.5 16,29 4.1,22.5 4.1,9.5" stroke="rgba(168,85,247,0.2)" strokeWidth="0.6" fill="none" />
          <polygon points="16,8 23,11.5 23,20.5 16,24 9,20.5 9,11.5" stroke="rgba(192,132,252,0.3)" strokeWidth="0.5" fill="none" />
          <circle cx="16" cy="16" r="2.5" fill="rgba(192,132,252,0.45)" />
        </svg>
        {/* 3 — Diamond + cross */}
        <svg className="ai-particle ai-particle-3" viewBox="0 0 32 32" fill="none">
          <rect x="10" y="10" width="12" height="12" rx="1" transform="rotate(45 16 16)" stroke="rgba(168,85,247,0.25)" strokeWidth="0.6" fill="none" />
          <line x1="16" y1="5" x2="16" y2="27" stroke="rgba(139,92,246,0.12)" strokeWidth="0.4" />
          <line x1="5" y1="16" x2="27" y2="16" stroke="rgba(139,92,246,0.12)" strokeWidth="0.4" />
          <circle cx="16" cy="16" r="2" fill="rgba(233,213,255,0.4)" />
        </svg>
        {/* 4 — Synapse: two nodes with connector */}
        <svg className="ai-particle ai-particle-4" viewBox="0 0 40 24" fill="none">
          <circle cx="8" cy="12" r="3" fill="rgba(192,132,252,0.4)" />
          <circle cx="32" cy="12" r="3" fill="rgba(168,85,247,0.35)" />
          <line x1="11" y1="12" x2="29" y2="12" stroke="rgba(192,132,252,0.2)" strokeWidth="0.5" strokeDasharray="2 2" />
          <circle cx="20" cy="12" r="1.5" fill="rgba(233,213,255,0.5)" />
        </svg>
        {/* 5 — Triple ring: orbit-like */}
        <svg className="ai-particle ai-particle-5" viewBox="0 0 32 32" fill="none">
          <ellipse cx="16" cy="16" rx="14" ry="6" stroke="rgba(168,85,247,0.15)" strokeWidth="0.4" fill="none" transform="rotate(0 16 16)" />
          <ellipse cx="16" cy="16" rx="14" ry="6" stroke="rgba(139,92,246,0.12)" strokeWidth="0.4" fill="none" transform="rotate(60 16 16)" />
          <ellipse cx="16" cy="16" rx="14" ry="6" stroke="rgba(124,58,237,0.10)" strokeWidth="0.4" fill="none" transform="rotate(120 16 16)" />
          <circle cx="16" cy="16" r="2.5" fill="rgba(192,132,252,0.5)" />
        </svg>
        {/* 6 — Data cluster: small scattered dots */}
        <svg className="ai-particle ai-particle-6" viewBox="0 0 32 32" fill="none">
          <circle cx="10" cy="8" r="1.5" fill="rgba(192,132,252,0.35)" />
          <circle cx="22" cy="10" r="2" fill="rgba(168,85,247,0.4)" />
          <circle cx="14" cy="20" r="1.8" fill="rgba(139,92,246,0.3)" />
          <circle cx="25" cy="22" r="1.2" fill="rgba(192,132,252,0.25)" />
          <circle cx="16" cy="14" r="3" fill="rgba(192,132,252,0.45)" />
          <line x1="16" y1="14" x2="10" y2="8" stroke="rgba(168,85,247,0.15)" strokeWidth="0.3" />
          <line x1="16" y1="14" x2="22" y2="10" stroke="rgba(168,85,247,0.15)" strokeWidth="0.3" />
          <line x1="16" y1="14" x2="14" y2="20" stroke="rgba(168,85,247,0.15)" strokeWidth="0.3" />
        </svg>
        {/* 7 — Helix wave */}
        <svg className="ai-particle ai-particle-7" viewBox="0 0 40 20" fill="none">
          <path d="M4,10 Q10,2 16,10 Q22,18 28,10 Q34,2 40,10" stroke="rgba(192,132,252,0.25)" strokeWidth="0.6" fill="none" />
          <path d="M4,10 Q10,18 16,10 Q22,2 28,10 Q34,18 40,10" stroke="rgba(168,85,247,0.15)" strokeWidth="0.4" fill="none" />
          <circle cx="16" cy="10" r="1.5" fill="rgba(233,213,255,0.45)" />
          <circle cx="28" cy="10" r="1.5" fill="rgba(192,132,252,0.35)" />
        </svg>
        {/* 8 — Neural node variant (larger rings) */}
        <svg className="ai-particle ai-particle-8" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="5" fill="rgba(168,85,247,0.35)" />
          <circle cx="16" cy="16" r="9" stroke="rgba(192,132,252,0.2)" strokeWidth="0.5" fill="none" strokeDasharray="3 3" />
          <circle cx="16" cy="16" r="14" stroke="rgba(139,92,246,0.10)" strokeWidth="0.4" fill="none" strokeDasharray="5 5" />
        </svg>
        {/* Neural network canvas — draws proximity-based connections between particles */}
        <canvas ref={neuralCanvasRef} className="absolute inset-0 h-full w-full" />
      </div>

      <div ref={containerRef} className="ai-sections-layout relative">
        {/* Nebula blobs — 5 large atmospheric orbs positioned between sections */}
        <div className="ai-blob ai-blob-1" aria-hidden="true" />
        <div className="ai-blob ai-blob-2" aria-hidden="true" />
        <div className="ai-blob ai-blob-3" aria-hidden="true" />
        <div className="ai-blob ai-blob-4" aria-hidden="true" />
        <div className="ai-blob ai-blob-5" aria-hidden="true" />

        {/* ── AI Trigger — cinematic centered CTA ── */}
        {!hasQualitative && (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="ai-cta-entrance relative w-full max-w-2xl">
              {/* Outer pulsing halo */}
              <div
                className="ai-cta-beacon absolute -inset-12 rounded-[2rem] opacity-20 blur-3xl"
                style={{ background: 'radial-gradient(ellipse, rgba(168,85,247,0.5), rgba(124,58,237,0.2) 40%, transparent 70%)' }}
                aria-hidden="true"
              />
              {/* Inner sharp glow ring */}
              <div
                className="absolute -inset-px rounded-2xl opacity-60"
                style={{ background: 'conic-gradient(from 180deg, rgba(168,85,247,0.4), transparent 25%, rgba(124,58,237,0.3) 50%, transparent 75%, rgba(168,85,247,0.4))', animation: 'ai-border-spin 8s linear infinite' }}
                aria-hidden="true"
              />
              {/* Breathing magnetic field rings */}
              <div
                className="pointer-events-none absolute -inset-6 rounded-[1.5rem]"
                style={{ border: '1px solid rgba(168,85,247,0.12)', animation: 'ai-cta-field-breathe 4s ease-in-out infinite' }}
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute -inset-10 rounded-[2rem]"
                style={{ border: '1px solid rgba(168,85,247,0.06)', animation: 'ai-cta-field-breathe 4s ease-in-out 1s infinite' }}
                aria-hidden="true"
              />
              <AnalysisCard glass shadow accent className="relative">
                <AIAnalysisButton
                  analysisId={analysis.id}
                  conversation={conversation}
                  quantitative={quantitative}
                  relationshipContext={analysis.relationshipContext}
                  onComplete={onAIComplete}
                  onRoastComplete={onRoastComplete}
                />
              </AnalysisCard>
            </div>
          </div>
        )}

        {/* ── AI Results ── */}
        {hasQualitative && (
          <>
            {/* Re-run AI */}
            {(hasIncompleteProfiles || showRerun) && (
              <AnalysisCard glass shadow accent>
                <AIAnalysisButton
                  analysisId={analysis.id}
                  conversation={conversation}
                  quantitative={quantitative}
                  relationshipContext={analysis.relationshipContext}
                  onComplete={onAIComplete}
                  onRoastComplete={onRoastComplete}
                />
                {hasIncompleteProfiles && !showRerun && (
                  <div className="ai-incomplete-warning mt-3 flex items-center justify-center gap-2.5 rounded-lg border border-fuchsia-500/15 bg-fuchsia-500/[0.04] px-4 py-2.5">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0 text-fuchsia-400/70" aria-hidden="true">
                      <path d="M8 1L15 14H1L8 1Z" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
                      <path d="M8 6v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      <circle cx="8" cy="12" r="0.7" fill="currentColor" />
                    </svg>
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-fuchsia-300/70">
                      Wykryto niekompletne profile — ponów analizę aby uzupełnić dane
                    </span>
                  </div>
                )}
              </AnalysisCard>
            )}

            {/* Manual re-run trigger */}
            {!hasIncompleteProfiles && !showRerun && (
              <div className="flex justify-end">
                <button
                  onClick={() => setShowRerun(true)}
                  className="ai-rerun-btn group relative flex items-center gap-2 overflow-hidden rounded-xl border border-purple-500/15 bg-purple-500/[0.04] px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.25em] text-purple-300/60 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-purple-400/35 hover:bg-purple-500/[0.10] hover:text-purple-200 hover:shadow-[0_0_24px_rgba(168,85,247,0.18),0_0_60px_rgba(168,85,247,0.06)]"
                >
                  <RefreshCw className="size-3.5 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:rotate-[270deg]" />
                  Ponów analizę AI
                  {/* Diagonal light sweep */}
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/10 to-transparent -translate-x-[200%] transition-transform duration-700 group-hover:translate-x-[200%]" />
                  {/* Inner top edge glow */}
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/25 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                </button>
              </div>
            )}

            {/* ── Stats intro banner — animated count-ups ── */}
            <StatsIntroBanner
              messageCount={conversation.messages.length}
              participantCount={participants.length}
              passCount={(qualitative?.pass1 ? 1 : 0) + (qualitative?.pass2 ? 1 : 0) + (qualitative?.pass3 ? 1 : 0) + (qualitative?.pass4 ? 1 : 0)}
              healthScore={pass4?.health_score?.overall}
            />

            {/* ── Stats→Ticker separator — horizontal accent with traveling light ── */}
            <div className="ai-stats-separator relative mx-auto max-w-4xl py-4" aria-hidden="true">
              <div
                className="h-px"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(168,85,247,0.08) 15%, rgba(192,132,252,0.25) 50%, rgba(168,85,247,0.08) 85%, transparent 100%)',
                }}
              />
              {/* Traveling energy dot */}
              <div
                className="ai-stats-sep-dot absolute top-1/2 -translate-y-1/2"
                style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  background: 'rgba(233,213,255,0.8)',
                  boxShadow: '0 0 8px rgba(192,132,252,0.8), 0 0 20px rgba(168,85,247,0.4)',
                  animation: 'ai-stats-sep-travel 6s ease-in-out infinite',
                }}
              />
            </div>

            {/* ── Data Ticker — horizontal scrolling analysis metadata ── */}
            <div className="ai-data-ticker" aria-hidden="true">
              <div className="ai-data-ticker-track">
                {/* Duplicate items for seamless infinite scroll */}
                {[0, 1].map((copy) => (
                  <div key={copy} className="flex items-center gap-8">
                    <div className="ai-data-ticker-item">
                      <span className="ai-data-ticker-label">wiadomości</span>
                      <span className="ai-data-ticker-value">{conversation.messages.length.toLocaleString('pl-PL')}</span>
                    </div>
                    <div className="ai-data-ticker-sep" />
                    <div className="ai-data-ticker-item">
                      <span className="ai-data-ticker-label">uczestnicy</span>
                      <span className="ai-data-ticker-value">{participants.length}</span>
                    </div>
                    <div className="ai-data-ticker-sep" />
                    <div className="ai-data-ticker-item">
                      <span className="ai-data-ticker-label">passy AI</span>
                      <span className="ai-data-ticker-value">{(qualitative?.pass1 ? 1 : 0) + (qualitative?.pass2 ? 1 : 0) + (qualitative?.pass3 ? 1 : 0) + (qualitative?.pass4 ? 1 : 0)}/4</span>
                    </div>
                    <div className="ai-data-ticker-sep" />
                    {pass4?.health_score?.overall != null && (
                      <>
                        <div className="ai-data-ticker-item">
                          <span className="ai-data-ticker-label">health</span>
                          <span className="ai-data-ticker-value">{pass4.health_score.overall}/100</span>
                        </div>
                        <div className="ai-data-ticker-sep" />
                      </>
                    )}
                    <div className="ai-data-ticker-item">
                      <span className="ai-data-ticker-label">platforma</span>
                      <span className="ai-data-ticker-value">{conversation.platform ?? 'unknown'}</span>
                    </div>
                    <div className="ai-data-ticker-sep" />
                    {conversation.metadata?.dateRange && (
                      <>
                        <div className="ai-data-ticker-item">
                          <span className="ai-data-ticker-label">zakres</span>
                          <span className="ai-data-ticker-value">
                            {new Date(conversation.metadata.dateRange.start).toLocaleDateString('pl-PL', { month: 'short', year: 'numeric' })}
                            {' → '}
                            {new Date(conversation.metadata.dateRange.end).toLocaleDateString('pl-PL', { month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="ai-data-ticker-sep" />
                      </>
                    )}
                    <div className="ai-data-ticker-item">
                      <span className="ai-data-ticker-label">model</span>
                      <span className="ai-data-ticker-value">gemini-flash</span>
                    </div>
                    <div className="ai-data-ticker-sep" />
                    <div className="ai-data-ticker-item">
                      <span className="ai-data-ticker-label">sekcje</span>
                      <span className="ai-data-ticker-value">{AI_SECTIONS.length}</span>
                    </div>
                    <div className="ai-data-ticker-sep" />
                    <div className="ai-data-ticker-item">
                      <span className="ai-data-ticker-label">silnik</span>
                      <span className="ai-data-ticker-value">podtekst neural v2.0</span>
                    </div>
                    <div className="ai-data-ticker-sep" />
                    {quantitative.viralScores?.compatibilityScore != null && (
                      <>
                        <div className="ai-data-ticker-item">
                          <span className="ai-data-ticker-label">kompatybilność</span>
                          <span className="ai-data-ticker-value">{quantitative.viralScores.compatibilityScore}%</span>
                        </div>
                        <div className="ai-data-ticker-sep" />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Scroll indicator — gateway portal effect ── */}
            <div className="ai-scroll-cue flex flex-col items-center gap-6 py-24 sm:py-32" aria-hidden="true">
              {/* Gateway orb — concentric rings radiating from center */}
              <div className="ai-gateway-orb relative flex items-center justify-center">
                {/* Ambient glow */}
                <div className="ai-gateway-glow absolute h-32 w-32 rounded-full" />
                {/* Concentric expanding rings */}
                <div className="ai-gateway-ring ai-gateway-ring-1 absolute rounded-full" />
                <div className="ai-gateway-ring ai-gateway-ring-2 absolute rounded-full" />
                <div className="ai-gateway-ring ai-gateway-ring-3 absolute rounded-full" />
                {/* Orbiting dots */}
                <div className="ai-gateway-orbit ai-gateway-orbit-1 absolute" />
                <div className="ai-gateway-orbit ai-gateway-orbit-2 absolute" />
                <div className="ai-gateway-orbit ai-gateway-orbit-3 absolute" />
                {/* Core dot */}
                <div className="ai-gateway-core h-3 w-3 rounded-full bg-purple-300/80" />
              </div>

              {/* Text with flanking lines */}
              <div className="flex items-center gap-4">
                <div className="ai-gateway-bar-left h-px w-12 sm:w-20" />
                <span className="ai-gateway-text font-mono text-[10px] uppercase tracking-[0.5em] text-purple-300/60 sm:text-xs">
                  <span className="text-purple-300/90 font-bold">{AI_SECTIONS.length}</span> sekcji do odkrycia
                </span>
                <div className="ai-gateway-bar-right h-px w-12 sm:w-20" />
              </div>

              {/* Chevrons with glow */}
              <div className="ai-scroll-chevrons flex flex-col items-center gap-2">
                <svg width="32" height="14" viewBox="0 0 32 14" className="ai-chevron-1 text-purple-400/60" style={{ filter: 'drop-shadow(0 0 4px rgba(168,85,247,0.4))' }}>
                  <path d="M4 2L16 11L28 2" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
                <svg width="32" height="14" viewBox="0 0 32 14" className="ai-chevron-2 text-purple-400/40" style={{ filter: 'drop-shadow(0 0 3px rgba(168,85,247,0.3))' }}>
                  <path d="M4 2L16 11L28 2" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
                <svg width="32" height="14" viewBox="0 0 32 14" className="ai-chevron-3 text-purple-400/20">
                  <path d="M4 2L16 11L28 2" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* ── System boot terminal — multi-line typing sequence ── */}
            <div className="ai-system-boot flex flex-col items-center gap-2 py-6" aria-hidden="true">
              {/* Terminal window frame */}
              <div className="ai-boot-terminal relative w-full max-w-md overflow-hidden rounded-lg border border-purple-500/10 bg-black/30 px-4 py-3">
                {/* Top bar dots */}
                <div className="mb-2.5 flex items-center gap-1.5">
                  <div className="size-1.5 rounded-full bg-purple-500/30" />
                  <div className="size-1.5 rounded-full bg-purple-500/20" />
                  <div className="size-1.5 rounded-full bg-purple-500/15" />
                  <span className="ml-2 font-mono text-[8px] uppercase tracking-[0.3em] text-purple-500/20">podtekst://neural-engine</span>
                </div>

                {/* Boot lines — each revealed by GSAP */}
                <div className="ai-boot-lines space-y-1 font-mono text-[10px] leading-relaxed">
                  <div className="ai-boot-entry" data-boot-line="0">
                    <span className="text-purple-500/40">&gt;</span>
                    <span className="ai-boot-text ml-1.5 text-purple-300/50">inicjalizacja silnika analizy...</span>
                    <span className="ai-boot-status ml-1.5 text-purple-400/60 opacity-0">OK</span>
                  </div>
                  <div className="ai-boot-entry" data-boot-line="1">
                    <span className="text-purple-500/40">&gt;</span>
                    <span className="ai-boot-text ml-1.5 text-purple-300/50">ładowanie modeli psychologicznych...</span>
                    <span className="ai-boot-status ml-1.5 text-purple-400/60 opacity-0">OK</span>
                  </div>
                  <div className="ai-boot-entry" data-boot-line="2">
                    <span className="text-purple-500/40">&gt;</span>
                    <span className="ai-boot-text ml-1.5 text-purple-300/50">kalibracja wzorców komunikacji...</span>
                    <span className="ai-boot-status ml-1.5 text-purple-400/60 opacity-0">OK</span>
                  </div>
                  <div className="ai-boot-entry" data-boot-line="3">
                    <span className="text-purple-500/40">&gt;</span>
                    <span className="ai-boot-text ml-1.5 text-purple-200/70 font-medium">system ready — analiza rozpoczęta</span>
                    <span className="ai-boot-status ml-1.5 opacity-0">
                      <span className="inline-block size-1.5 rounded-full bg-purple-400/80 shadow-[0_0_6px_rgba(168,85,247,0.6)]" />
                    </span>
                  </div>
                </div>

                {/* Blinking cursor + heartbeat status at bottom */}
                <div className="ai-boot-cursor-line mt-1 flex items-center">
                  <span className="text-purple-500/40 font-mono text-[10px]">&gt;</span>
                  <span className="ai-boot-heartbeat ml-1.5 font-mono text-[10px] text-purple-300/40" />
                  <span className="ai-boot-cursor ml-1 inline-block h-3 w-[6px] bg-purple-400/50" />
                </div>

                {/* Internal glow */}
                <div className="pointer-events-none absolute inset-0 rounded-lg" style={{ boxShadow: 'inset 0 0 30px rgba(168,85,247,0.04)' }} />
              </div>

              {/* Horizontal beam sweep below terminal */}
              <div className="ai-beam-sweep" />

              {/* Boot complete flash — full-width purple burst (desktop only) */}
              <div
                className="ai-boot-flash pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 hidden sm:block"
                style={{
                  height: '120px',
                  background: 'linear-gradient(180deg, transparent 0%, rgba(168,85,247,0.35) 30%, rgba(192,132,252,0.5) 50%, rgba(168,85,247,0.35) 70%, transparent 100%)',
                  boxShadow: '0 0 80px rgba(168,85,247,0.4), 0 0 160px rgba(168,85,247,0.2)',
                  transformOrigin: 'center center',
                  opacity: 0,
                }}
                aria-hidden="true"
              />
            </div>

            {/* ── Attachment Styles ── */}
            {pass3 && (
              <>
                <AISectionHeader label="Styl Przywiązania" sectionIndex={0} />
                <div data-ai-card={nextDir()}>
                  <AnalysisCard glass shadow accent>
                    <AttachmentStyleCards profiles={pass3} participants={participants} />
                  </AnalysisCard>
                </div>
              </>
            )}

            {/* ── Love Languages ── */}
            {pass3 && participants.some(n => pass3[n]?.love_language) && (
              <>
                <AISectionHeader label="Języki Miłości" sectionIndex={1} />
                <div data-ai-card={nextDir()}>
                  <AnalysisCard glass shadow accent>
                    <LoveLanguageCard profiles={pass3} participants={participants} />
                  </AnalysisCard>
                </div>
              </>
            )}

            {/* ── Personality Deep Dive ── */}
            {pass3 && (
              <>
                <AISectionHeader label="Profil Komunikacyjny" sectionIndex={2} />
                <div data-ai-card={nextDir()}>
                  <AnalysisCard glass shadow accent>
                    <PersonalityDeepDive profiles={pass3} participants={participants} />
                  </AnalysisCard>
                </div>
              </>
            )}

            {/* ── Cognitive Functions ── */}
            {!isServerView && cognitiveFunctions && (
              <>
                <AISectionHeader label="Funkcje Kognitywne" sectionIndex={3} />
                <div data-ai-card={nextDir()}>
                  <AnalysisCard glass shadow accent>
                    <CognitiveFunctionsClash result={cognitiveFunctions} participants={participants} />
                  </AnalysisCard>
                </div>
              </>
            )}

            {/* ── Threat Meters ── */}
            {threatMeters && (
              <>
                <AISectionHeader label="Wskaźniki Dynamiki" sectionIndex={4} />
                <div data-ai-card={nextDir()}>
                  <AnalysisCard glass shadow accent>
                    <ThreatMeters meters={threatMeters} />
                  </AnalysisCard>
                </div>
              </>
            )}

            {/* ── Damage Report ── */}
            {!isServerView && damageReport && (
              <>
                <AISectionHeader label="Raport Uszkodzeń" sectionIndex={5} />
                <div data-ai-card={nextDir()}>
                  <AnalysisCard glass shadow accent>
                    <DamageReport report={damageReport} />
                  </AnalysisCard>
                </div>
              </>
            )}

            {/* ── Viral Scores ── */}
            {!isServerView && quantitative.viralScores && (
              <>
                <AISectionHeader label="Wyniki Viralowe" sectionIndex={6} />
                <div data-ai-card={nextDir()}>
                  <AnalysisCard glass shadow accent>
                    <ViralScoresSection quantitative={quantitative} participants={participants} />
                  </AnalysisCard>
                </div>
              </>
            )}

            {/* ── AI Predictions ── */}
            {pass4?.predictions && pass4.predictions.length > 0 && (
              <>
                <AISectionHeader label="Predykcje AI" sectionIndex={7} />
                <div data-ai-card={nextDir()}>
                  <AnalysisCard glass shadow accent>
                    <AIPredictions predictions={pass4.predictions} />
                  </AnalysisCard>
                </div>
              </>
            )}

            {/* ── Turning Points ── */}
            {(qualitative?.pass2 || pass4) && (
              <>
                <AISectionHeader label="Punkty Zwrotne" sectionIndex={8} />
                <div data-ai-card={nextDir()}>
                  <AnalysisCard glass shadow accent>
                    <TurningPointsTimeline pass2={qualitative?.pass2} pass4={pass4} participants={participants} dateRange={conversation.metadata?.dateRange} />
                  </AnalysisCard>
                </div>
              </>
            )}

            {/* ── Final Report — the culmination, deserves crown treatment ── */}
            {pass4 && (
              <>
                <AISectionHeader label="Raport Końcowy" sectionIndex={9} />
                <div data-ai-card={nextDir()} className="ai-final-report-wrapper relative">
                  {/* Outer ceremonial glow — desktop only */}
                  {!isMobileRef.current && (
                    <div
                      className="pointer-events-none absolute -inset-4 -z-10 rounded-3xl opacity-70"
                      style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(168,85,247,0.18) 0%, rgba(139,92,246,0.06) 50%, transparent 80%)' }}
                      aria-hidden="true"
                    />
                  )}
                  <AnalysisCard glass shadow accent className="ai-final-card ring-1 ring-purple-500/15">
                    <FinalReport pass4={pass4} participants={participants} />
                  </AnalysisCard>
                </div>
              </>
            )}

            {/* End-of-analysis — cinematic FIN sequence (simplified on mobile) */}
            <div className="ai-fin-separator relative flex flex-col items-center justify-center gap-4 py-16 sm:py-44" aria-hidden="true">
              {/* Desktop-only decorative layers */}
              {!isMobileRef.current && (
                <>
                  <div className="ai-fin-glow pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 90% 70% at 50% 50%, rgba(168,85,247,0.28) 0%, rgba(139,92,246,0.12) 35%, rgba(124,58,237,0.04) 55%, transparent 75%)' }} />
                  <div className="ai-fin-rings pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="ai-fin-ring ai-fin-ring-1" />
                    <div className="ai-fin-ring ai-fin-ring-2" />
                    <div className="ai-fin-ring ai-fin-ring-3" />
                    <div className="ai-fin-ring ai-fin-ring-4" />
                  </div>
                  <div className="ai-fin-aurora pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: 'conic-gradient(from 0deg, transparent 0%, rgba(168,85,247,0.20) 20%, rgba(192,132,252,0.08) 35%, transparent 50%, rgba(139,92,246,0.15) 70%, rgba(168,85,247,0.06) 85%, transparent 100%)', filter: 'blur(32px)' }} />
                  <div className="ai-fin-crosshair pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="ai-fin-cross-h" />
                    <div className="ai-fin-cross-v" />
                  </div>
                </>
              )}

              <div className="relative flex w-full max-w-3xl items-center gap-4 sm:gap-8">
                <div className="ai-fin-line-left h-[2px] flex-1" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(168,85,247,0.12) 15%, rgba(168,85,247,0.5) 60%, rgba(192,132,252,0.7) 100%)' }} />
                <div className="relative flex flex-col items-center gap-3">
                  {!isMobileRef.current && <div className="ai-fin-halo absolute -inset-24 rounded-full" />}
                  <div className="ai-fin-diamond mb-1 h-2.5 w-2.5 rotate-45 border border-purple-400/60 bg-purple-400/30" />
                  <span
                    className="ai-fin-text relative font-[var(--font-syne)] text-4xl font-black uppercase tracking-[0.6em] text-purple-100/90 sm:text-5xl"
                    style={isMobileRef.current ? undefined : { textShadow: '0 0 30px rgba(168,85,247,0.8), 0 0 60px rgba(168,85,247,0.45), 0 0 100px rgba(139,92,246,0.25), 0 0 160px rgba(124,58,237,0.12)' }}
                  >
                    fin
                  </span>
                  <p className="ai-fin-subtitle font-mono text-[10px] uppercase tracking-[0.5em] text-purple-300/50 sm:text-xs">
                    koniec analizy
                  </p>
                </div>
                <div className="ai-fin-line-right h-[2px] flex-1" style={{ background: 'linear-gradient(90deg, rgba(192,132,252,0.7) 0%, rgba(168,85,247,0.5) 40%, rgba(168,85,247,0.12) 85%, transparent 100%)' }} />
              </div>
            </div>

            {/* Disclaimer — ceremonial seal treatment */}
            <div className="ai-mode-disclaimer" data-ai-card="center">
              {/* Corner bracket ornaments — L-shaped lines at all 4 corners */}
              <div className="ai-disclaimer-corner ai-disclaimer-corner-tl" aria-hidden="true" />
              <div className="ai-disclaimer-corner ai-disclaimer-corner-tr" aria-hidden="true" />
              <div className="ai-disclaimer-corner ai-disclaimer-corner-bl" aria-hidden="true" />
              <div className="ai-disclaimer-corner ai-disclaimer-corner-br" aria-hidden="true" />
              {/* Central seal ornament */}
              <div className="ai-disclaimer-seal">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                  <circle cx="14" cy="14" r="12" stroke="rgba(168,85,247,0.25)" strokeWidth="0.75" />
                  <circle cx="14" cy="14" r="8" stroke="rgba(168,85,247,0.15)" strokeWidth="0.5" />
                  <path d="M14 6v4M14 18v4M6 14h4M18 14h4" stroke="rgba(192,132,252,0.3)" strokeWidth="0.75" strokeLinecap="round" />
                  <circle cx="14" cy="14" r="2.5" fill="rgba(168,85,247,0.15)" stroke="rgba(192,132,252,0.3)" strokeWidth="0.5" />
                </svg>
              </div>
              <p className="ai-disclaimer-text">
                Analiza AI opiera się na statystycznych wzorcach komunikacji i nie stanowi diagnozy psychologicznej.
                Wyniki mają charakter orientacyjny i rozrywkowy.
              </p>
              <div className="ai-disclaimer-sig font-mono text-[8px] uppercase tracking-[0.35em] text-purple-500/20">
                podtekst neural engine v2.0
              </div>
            </div>
          </>
        )}
      </div>
    </ModePageShell>
    </div>
    </MotionConfig>
    </SectionErrorBoundary>
  );
}
