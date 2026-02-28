'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  animate,
  type PanInfo,
} from 'framer-motion';
import { X } from 'lucide-react';
import Link from 'next/link';

import { type DemoSlide, P, C } from './LandingDemoConstants';
import { SlideOverview, SlidePersonalities, SlideMBTI, SlideVersus } from './LandingDemoSlides1';
import { SlideRedFlags, SlideRoast, SlideCourtDating, SlideInteractive } from './LandingDemoSlides2';
import { SlideStandUpBadges, SlideHeatmapOuter, SlideWrappedOuter } from './LandingDemoSlides3';
import { BrowserChrome } from './LandingDemoBrowserChrome';

// ═══════════════════════════════════════════════════════════
// SLIDES DEFINITION
// ═══════════════════════════════════════════════════════════

const SLIDES: DemoSlide[] = [
  { id: 1, category: 'STATYSTYKI + ZDROWIE', accent: C.green, render: SlideOverview },
  { id: 2, category: 'PROFILE OSOBOWOŚCI', accent: C.blue, render: SlidePersonalities },
  { id: 3, category: 'MBTI + JĘZYKI MIŁOŚCI', accent: C.amber, render: SlideMBTI },
  { id: 4, category: 'VERSUS + PROGNOZA', accent: C.purple, render: SlideVersus },
  { id: 5, category: 'RED FLAGS + NAGRODY', accent: C.red, render: SlideRedFlags },
  { id: 6, category: 'ROAST', accent: C.orange, render: SlideRoast },
  { id: 7, category: 'SĄD + PROFILE RANDKOWE', accent: C.pink, render: SlideCourtDating },
  { id: 8, category: 'PODTEKSTY + SYMULACJA + DELUZJA', accent: C.purple, render: SlideInteractive },
  { id: 9, category: 'STAND-UP + ODZNAKI + CPS', accent: C.amber, render: SlideStandUpBadges },
  { id: 10, category: 'HEATMAPA + FRAZY + CZAS', accent: C.blue, render: SlideHeatmapOuter },
  { id: 11, category: 'WRAPPED + QUIZ + EMOCJE', accent: C.purple, render: SlideWrappedOuter },
];

// ═══════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return mobile;
}

// ═══════════════════════════════════════════════════════════
// 3D COVERFLOW CAROUSEL
// ═══════════════════════════════════════════════════════════

export default function LandingDemo() {
  const [current, setCurrent] = useState(0);
  const [dragging, setDragging] = useState(false);
  const x = useMotionValue(0);
  const total = SLIDES.length;
  const isMobile = useIsMobile();
  const sectionRef = useRef<HTMLElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [expandedSlide, setExpandedSlide] = useState<number | null>(null);

  // Body scroll lock when mobile overlay is open
  useEffect(() => {
    if (expandedSlide === null) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [expandedSlide]);

  // Keyboard navigation in fullscreen overlay
  useEffect(() => {
    if (expandedSlide === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedSlide(null);
      if (e.key === 'ArrowLeft') setExpandedSlide((p) => p !== null ? ((p - 1) + total) % total : null);
      if (e.key === 'ArrowRight') setExpandedSlide((p) => p !== null ? (p + 1) % total : null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [expandedSlide, total]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setCurrent((p) => (p - 1 + total) % total);
      if (e.key === 'ArrowRight') setCurrent((p) => (p + 1) % total);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [total]);

  const goTo = useCallback((idx: number) => setCurrent(((idx % total) + total) % total), [total]);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    setDragging(false);
    if (info.offset.x < -80) goTo(current + 1);
    else if (info.offset.x > 80) goTo(current - 1);
    animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 });
  }, [current, goTo, x]);

  const slide = SLIDES[current];

  const handleShare = useCallback((slideIdx: number) => {
    const s = SLIDES[slideIdx];
    const url = `https://podtekst.app/#demo?utm_source=demo_share&utm_content=slide_${s.id}`;
    const text = `Sprawdź ten demo — ${s.category} na PodTeksT 🔥`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: 'PodTeksT Demo', text, url }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  }, []);

  const getCardStyle = (index: number): React.CSSProperties => {
    let diff = index - current;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;

    const absDiff = Math.abs(diff);
    const maxVisible = isMobile ? 1 : 2;

    if (absDiff > maxVisible) return { display: 'none' };

    const scale = Math.max(0.75, 1 - absDiff * 0.12);
    const translateX = diff * (isMobile ? 85 : 55);
    const rotateY = isMobile ? 0 : diff * -8;
    const opacity = Math.max(0.3, 1 - absDiff * 0.4);
    const zIndex = 100 - absDiff * 10;
    const brightness = absDiff > 0 ? 0.6 : 1;

    return {
      transform: `translateX(${translateX}%) scale(${scale}) rotateY(${rotateY}deg)`,
      opacity,
      zIndex,
      filter: absDiff > 0 ? `brightness(${brightness})` : undefined,
      transition: 'all 0.5s cubic-bezier(0.32, 0.72, 0, 1)',
      cursor: absDiff > 0 ? 'pointer' : 'default',
      pointerEvents: 'auto' as const,
    };
  };

  return (
    <section
      id="demo"
      ref={sectionRef}
      className="mx-auto px-4 py-24 sm:px-6"
      style={{ maxWidth: '100rem' }}
    >
      {/* Header */}
      <div className="mb-8 text-center">
        <p className="mb-2 font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground">CO KRYJE SIĘ W TWOIM CHACIE?</p>
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">30+ funkcji. Zero cenzury.</h2>
        <p className="mt-2 text-sm text-muted-foreground">Demo: {P.a} &amp; {P.b} &middot; 12 847 msg &middot; 423 dni &middot; rating: toksyczny 🔥</p>
      </div>

      {/* Counter + dots */}
      <div className="mb-6 flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <button onClick={() => goTo(current - 1)} className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-border-hover hover:text-foreground">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 4l-4 4 4 4" /></svg>
          </button>
          <div className="w-64 text-center">
            <p className="font-mono text-lg font-bold text-foreground">{current + 1} <span className="text-muted-foreground/50">/</span> {total}</p>
            <p className="truncate font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: slide.accent }}>{slide.category}</p>
          </div>
          <button onClick={() => goTo(current + 1)} className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-border-hover hover:text-foreground">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 4l4 4-4 4" /></svg>
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {SLIDES.map((s, i) => (
            <button key={s.id} onClick={() => goTo(i)} className="transition-all" style={{ width: i === current ? 24 : 8, height: 8, borderRadius: 4, background: i === current ? slide.accent : 'rgba(255,255,255,0.12)' }} />
          ))}
        </div>
      </div>

      {/* 3D Coverflow */}
      <div
        className="relative mx-auto"
        style={{ perspective: '1500px', maxWidth: '90rem' }}
      >
        <motion.div
          className="absolute inset-0 z-[200] cursor-grab active:cursor-grabbing"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          style={{ x }}
          onDragStart={() => setDragging(true)}
          onDragEnd={handleDragEnd}
          onTap={() => setExpandedSlide(current)}
        />

        <div ref={carouselRef} className="relative" style={{ transformStyle: 'preserve-3d' }}>
          {SLIDES.map((s, i) => {
            const style = getCardStyle(i);
            if (style.display === 'none') return null;

            let diff = i - current;
            if (diff > total / 2) diff -= total;
            if (diff < -total / 2) diff += total;

            return (
              <div
                key={s.id}
                className="group/slide flex w-full flex-col"
                style={{
                  ...style,
                  position: diff === 0 ? 'relative' : 'absolute',
                  top: diff === 0 ? undefined : 0,
                  left: 0,
                }}
                onClick={() => {
                  if (diff !== 0) goTo(i);
                  else if (!dragging) setExpandedSlide(i);
                }}
              >
                {/* Expand hint on active slide */}
                {diff === 0 && (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover/slide:opacity-100">
                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-4 py-2 backdrop-blur-sm">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/70">
                        <circle cx="7" cy="7" r="4.5" />
                        <path d="M10.5 10.5L14 14" />
                        <path d="M5.5 7h3M7 5.5v3" />
                      </svg>
                      <span className="font-mono text-[10px] font-medium tracking-wider text-white/70">POWIĘKSZ</span>
                    </div>
                  </div>
                )}
                <BrowserChrome onShare={() => handleShare(i)}>
                  {s.render()}
                </BrowserChrome>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom navigation — always visible below carousel */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <button onClick={() => goTo(current - 1)} className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-border-hover hover:text-foreground">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 4l-4 4 4 4" /></svg>
        </button>
        <div className="flex items-center gap-1.5">
          {SLIDES.map((s, i) => (
            <button key={s.id} onClick={() => goTo(i)} className="transition-all" style={{ width: i === current ? 24 : 8, height: 8, borderRadius: 4, background: i === current ? slide.accent : 'rgba(255,255,255,0.12)' }} />
          ))}
        </div>
        <button onClick={() => goTo(current + 1)} className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-border-hover hover:text-foreground">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 4l4 4-4 4" /></svg>
        </button>
      </div>

      {/* CTA */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <Link
          href="/analysis/new"
          className="group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-xl px-10 py-4 font-mono text-sm font-bold uppercase tracking-[0.08em] text-white transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_32px_rgba(139,92,246,0.3)] active:scale-[0.97]"
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 50%, #a855f7 100%)',
            boxShadow: '0 0 20px rgba(59,130,246,0.15), 0 0 40px rgba(168,85,247,0.1)',
            minHeight: 52,
          }}
        >
          <span className="absolute inset-0 translate-x-[-200%] bg-gradient-to-r from-white/0 via-white/10 to-white/0 transition-transform duration-700 group-hover:translate-x-[200%]" />
          Odkryj podtekst swojej rozmowy
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:translate-x-0.5"><path d="M3.5 8h9M8.5 4l4 4-4 4" /></svg>
        </Link>
        <button
          onClick={() => handleShare(current)}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 font-mono text-xs text-muted-foreground transition-colors hover:border-border-hover hover:text-foreground"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8v5a1 1 0 001 1h6a1 1 0 001-1V8" /><polyline points="12 4 8 1 4 4" /><line x1="8" y1="1" x2="8" y2="10" /></svg>
          Wyślij kumplowi
        </button>
        {copied && (
          <span className="font-mono text-xs text-green-400">Skopiowano link!</span>
        )}
      </div>

      {/* Mobile fullscreen overlay for expanded demo slide — swipe left/right to navigate */}
      {expandedSlide !== null && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          <motion.div
            key="demo-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/95"
            onClick={(e) => { if (e.target === e.currentTarget) setExpandedSlide(null); }}
          >
            <button
              onClick={() => setExpandedSlide(null)}
              className="fixed top-4 right-4 z-[60] flex size-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground"
              aria-label="Zamknij"
            >
              <X className="size-5" />
            </button>

            {/* Slide category label + counter */}
            <div className="sticky top-0 z-[55] flex items-center justify-center gap-3 py-3" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.9) 60%, transparent)' }}>
              <span className="font-mono text-[10px] text-muted-foreground">{expandedSlide + 1}/{total}</span>
              <span className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color: SLIDES[expandedSlide].accent }}>
                {SLIDES[expandedSlide].category}
              </span>
            </div>

            {/* Desktop: side arrow buttons */}
            <button
              onClick={() => setExpandedSlide(((expandedSlide - 1) + total) % total)}
              className="fixed left-3 top-1/2 z-[60] hidden -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/80 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-card-hover hover:text-foreground md:flex md:size-10"
              aria-label="Poprzedni"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 4l-4 4 4 4" /></svg>
            </button>
            <button
              onClick={() => setExpandedSlide((expandedSlide + 1) % total)}
              className="fixed right-3 top-1/2 z-[60] hidden -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/80 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-card-hover hover:text-foreground md:flex md:size-10"
              aria-label="Następny"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 4l4 4-4 4" /></svg>
            </button>

            {/* Swipeable content area */}
            <motion.div
              className="px-3 pb-16 md:mx-auto md:max-w-4xl md:px-16"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60) {
                  setExpandedSlide((expandedSlide + 1) % total);
                } else if (info.offset.x > 60) {
                  setExpandedSlide(((expandedSlide - 1) + total) % total);
                }
              }}
            >
              {SLIDES[expandedSlide].render()}
            </motion.div>

          </motion.div>
        </AnimatePresence>,
        document.body,
      )}
    </section>
  );
}
