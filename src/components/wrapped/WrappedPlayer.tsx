'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2 } from 'lucide-react';
import Link from 'next/link';
import type { WrappedSlide } from '@/lib/analysis/wrapped-data';

// ─── Props ───────────────────────────────────────────────

interface WrappedPlayerProps {
  slides: WrappedSlide[];
  conversationTitle: string;
  analysisId: string;
}

// ─── Animated Number Counter ─────────────────────────────

function AnimatedValue({ value }: { value: string }) {
  const numericMatch = value.match(/^[\d\s.,]+/);

  // If the value starts with a number, animate just the numeric portion
  if (numericMatch) {
    const numericPart = numericMatch[0];
    const suffix = value.slice(numericPart.length);
    const targetNumber = parseFloat(numericPart.replace(/[\s.]/g, '').replace(',', '.'));

    return (
      <span>
        <CountUp target={targetNumber} format={numericPart} />
        {suffix}
      </span>
    );
  }

  // Non-numeric values just appear as-is
  return <span>{value}</span>;
}

function CountUp({
  target,
  format,
}: {
  target: number;
  format: string;
}) {
  const [current, setCurrent] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    setCurrent(0);
    const duration = 1200;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    }

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target]);

  // Reproduce the original formatting pattern (thousand separators, etc.)
  const hasSpaceSeparator = format.includes(' ') && /\d\s\d/.test(format);
  const hasDotSeparator = format.includes('.') && /\d\.\d{3}/.test(format);

  if (hasSpaceSeparator) {
    return <>{current.toLocaleString('pl-PL')}</>;
  }
  if (hasDotSeparator) {
    return <>{current.toLocaleString('pl-PL')}</>;
  }

  return <>{current.toLocaleString('pl-PL')}</>;
}

// ─── Grain Overlay (CSS-only noise) ─────────────────────

function GrainOverlay() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
        opacity: 0.04,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
    />
  );
}

// ─── Progress Bar (segmented, Instagram Stories-style) ───

const AUTO_ADVANCE_MS = 7000;

function ProgressBar({
  total,
  current,
  isPaused,
  durationMs,
}: {
  total: number;
  current: number;
  isPaused: boolean;
  durationMs: number;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 'max(12px, calc(env(safe-area-inset-top, 0px) + 4px))',
        left: 16,
        right: 16,
        zIndex: 20,
        display: 'flex',
        gap: 4,
      }}
    >
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            background: 'rgba(255, 255, 255, 0.15)',
            overflow: 'hidden',
          }}
        >
          <div
            key={`fill-${i}-${current}`}
            className="wrapped-progress-fill"
            style={{
              height: '100%',
              borderRadius: 2,
              background: 'rgba(255, 255, 255, 0.9)',
              width: i < current ? '100%' : '0%',
              ...(i === current
                ? {
                    animation: `wrappedProgressFill ${durationMs}ms linear forwards`,
                    animationPlayState: isPaused ? 'paused' : 'running',
                  }
                : {}),
            }}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Slide Renderers ─────────────────────────────────────

function IntroSlide({ slide }: { slide: WrappedSlide }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        textAlign: 'center',
        padding: '0 24px',
        gap: 16,
      }}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{ fontSize: '4rem', lineHeight: 1 }}
      >
        {slide.emoji}
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        style={{
          fontFamily: 'var(--font-syne)',
          fontWeight: 800,
          fontSize: 'clamp(1.8rem, 8vw, 2.8rem)',
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          color: '#ffffff',
          margin: 0,
        }}
      >
        {slide.title}
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        style={{
          fontFamily: 'var(--font-syne)',
          fontWeight: 800,
          fontSize: 'clamp(2rem, 8vw, 3rem)',
          lineHeight: 1,
          letterSpacing: '-0.03em',
          overflowWrap: 'break-word' as const,
          wordBreak: 'break-word' as const,
          background: 'linear-gradient(135deg, #6d9fff, #b38cff, #ff6b9d)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {slide.value}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        style={{
          fontFamily: 'var(--font-space-grotesk)',
          fontSize: '0.85rem',
          color: 'rgba(255, 255, 255, 0.5)',
          margin: 0,
        }}
      >
        {slide.subtitle}
      </motion.p>
    </div>
  );
}

function StatSlide({ slide }: { slide: WrappedSlide }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        textAlign: 'center',
        padding: '0 24px',
        gap: 12,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{
          fontFamily: 'var(--font-space-grotesk)',
          fontSize: '0.8rem',
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
          color: 'rgba(255, 255, 255, 0.5)',
        }}
      >
        {slide.emoji} {slide.title}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        style={{
          fontFamily: 'var(--font-syne)',
          fontWeight: 800,
          fontSize: 'clamp(2.5rem, 8vw, 4rem)',
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          overflowWrap: 'break-word' as const,
          wordBreak: 'break-word' as const,
          color: '#ffffff',
        }}
      >
        <AnimatedValue value={slide.value} />
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        style={{
          fontFamily: 'var(--font-syne)',
          fontWeight: 600,
          fontSize: 'clamp(1rem, 4vw, 1.4rem)',
          color: 'rgba(255, 255, 255, 0.8)',
          margin: 0,
        }}
      >
        {slide.subtitle}
      </motion.p>

      {slide.detail && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          style={{
            fontFamily: 'var(--font-space-grotesk)',
            fontSize: '0.78rem',
            color: 'rgba(255, 255, 255, 0.4)',
            margin: '8px 0 0',
            maxWidth: 320,
            lineHeight: 1.5,
          }}
        >
          {slide.detail}
        </motion.p>
      )}
    </div>
  );
}

function ComparisonSlide({ slide }: { slide: WrappedSlide }) {
  const { personA, personB } = slide;
  if (!personA || !personB) return <StatSlide slide={slide} />;

  const aIsWinner = personA.percent >= personB.percent;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        textAlign: 'center',
        padding: '0 24px',
        gap: 24,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{
          fontFamily: 'var(--font-space-grotesk)',
          fontSize: '0.8rem',
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
          color: 'rgba(255, 255, 255, 0.5)',
        }}
      >
        {slide.emoji} {slide.title}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        style={{
          fontFamily: 'var(--font-syne)',
          fontWeight: 800,
          fontSize: 'clamp(2rem, 8vw, 3rem)',
          lineHeight: 1.1,
          color: '#ffffff',
        }}
      >
        {slide.value}
      </motion.div>

      {/* Comparison bars */}
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Person A */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-syne)',
                fontWeight: aIsWinner ? 700 : 500,
                fontSize: '0.85rem',
                color: aIsWinner ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
              }}
            >
              {personA.name}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-space-grotesk)',
                fontSize: '0.78rem',
                color: 'rgba(255, 255, 255, 0.5)',
              }}
            >
              {personA.value}
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: 8,
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.1)',
              overflow: 'hidden',
            }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${personA.percent}%` }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{
                height: '100%',
                borderRadius: 4,
                background: aIsWinner
                  ? 'linear-gradient(90deg, #3b82f6, #6d9fff)'
                  : 'rgba(255, 255, 255, 0.25)',
              }}
            />
          </div>
        </motion.div>

        {/* Person B */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-syne)',
                fontWeight: !aIsWinner ? 700 : 500,
                fontSize: '0.85rem',
                color: !aIsWinner ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
              }}
            >
              {personB.name}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-space-grotesk)',
                fontSize: '0.78rem',
                color: 'rgba(255, 255, 255, 0.5)',
              }}
            >
              {personB.value}
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: 8,
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.1)',
              overflow: 'hidden',
            }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${personB.percent}%` }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{
                height: '100%',
                borderRadius: 4,
                background: !aIsWinner
                  ? 'linear-gradient(90deg, #a855f7, #b38cff)'
                  : 'rgba(255, 255, 255, 0.25)',
              }}
            />
          </div>
        </motion.div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        style={{
          fontFamily: 'var(--font-space-grotesk)',
          fontSize: '0.78rem',
          color: 'rgba(255, 255, 255, 0.4)',
          margin: 0,
        }}
      >
        {slide.subtitle}
      </motion.p>

      {slide.detail && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          style={{
            fontFamily: 'var(--font-space-grotesk)',
            fontSize: '0.72rem',
            color: 'rgba(255, 255, 255, 0.3)',
            margin: 0,
          }}
        >
          {slide.detail}
        </motion.p>
      )}
    </div>
  );
}

function EmojiSlide({ slide }: { slide: WrappedSlide }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        textAlign: 'center',
        padding: '0 24px',
        gap: 12,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{
          fontFamily: 'var(--font-space-grotesk)',
          fontSize: '0.8rem',
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
          color: 'rgba(255, 255, 255, 0.5)',
        }}
      >
        {slide.title}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.3, rotate: -20 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.6, delay: 0.2, type: 'spring', bounce: 0.4 }}
        style={{
          fontSize: '8rem',
          lineHeight: 1,
        }}
      >
        {slide.value}
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        style={{
          fontFamily: 'var(--font-syne)',
          fontWeight: 600,
          fontSize: '1.1rem',
          color: 'rgba(255, 255, 255, 0.8)',
          margin: 0,
        }}
      >
        {slide.subtitle}
      </motion.p>

      {slide.detail && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.55 }}
          style={{
            fontFamily: 'var(--font-space-grotesk)',
            fontSize: '0.78rem',
            color: 'rgba(255, 255, 255, 0.4)',
            margin: '4px 0 0',
            maxWidth: 300,
            lineHeight: 1.5,
          }}
        >
          {slide.detail}
        </motion.p>
      )}
    </div>
  );
}

function SummarySlide({
  slide,
  analysisId,
}: {
  slide: WrappedSlide;
  analysisId: string;
}) {
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');

  const handleShare = useCallback(async () => {
    const shareUrl = `${window.location.origin}/analysis/${analysisId}`;
    const shareData = {
      title: `${slide.title} — Wrapped`,
      text: `${slide.title}: ${slide.subtitle}`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    // Fallback: copy URL to clipboard
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setShareStatus('copied');
        setTimeout(() => setShareStatus('idle'), 2000);
      }
    } catch {
      // Clipboard API not available
    }
  }, [analysisId, slide.title, slide.subtitle]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        textAlign: 'center',
        padding: '0 24px',
        gap: 20,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{
          fontFamily: 'var(--font-syne)',
          fontWeight: 800,
          fontSize: 'clamp(1.4rem, 6vw, 2rem)',
          color: '#ffffff',
          lineHeight: 1.2,
        }}
      >
        {slide.title}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        style={{
          fontFamily: 'var(--font-space-grotesk)',
          fontSize: '0.82rem',
          color: 'rgba(255, 255, 255, 0.5)',
        }}
      >
        {slide.subtitle}
      </motion.div>

      {/* Stats grid */}
      {slide.stats && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
            width: '100%',
            maxWidth: 340,
          }}
        >
          {slide.stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.35 + i * 0.06 }}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 12,
                padding: '14px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>
                {stat.emoji}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-syne)',
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: '#ffffff',
                }}
              >
                {stat.value}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-space-grotesk)',
                  fontSize: '0.68rem',
                  color: 'rgba(255, 255, 255, 0.45)',
                }}
              >
                {stat.label}
              </span>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Share button */}
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={handleShare}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: '#ffffff',
          color: '#111111',
          fontFamily: 'var(--font-syne)',
          fontWeight: 700,
          fontSize: '0.9rem',
          padding: '12px 28px',
          borderRadius: 9999,
          border: 'none',
          cursor: 'pointer',
          marginTop: 8,
        }}
      >
        <Share2 size={16} />
        {shareStatus === 'copied' ? 'Skopiowano link!' : 'Udostępnij Wrapped'}
      </motion.button>
    </div>
  );
}

// ─── Slide Router ────────────────────────────────────────

function SlideContent({
  slide,
  analysisId,
}: {
  slide: WrappedSlide;
  analysisId: string;
}) {
  switch (slide.type) {
    case 'intro':
      return <IntroSlide slide={slide} />;
    case 'who-texts-more':
    case 'response-time':
      return <ComparisonSlide slide={slide} />;
    case 'top-emoji':
      return <EmojiSlide slide={slide} />;
    case 'summary':
      return <SummarySlide slide={slide} analysisId={analysisId} />;
    default:
      return <StatSlide slide={slide} />;
  }
}

// ─── Main Player Component ──────────────────────────────

export default function WrappedPlayer({
  slides,
  conversationTitle,
  analysisId,
}: WrappedPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const swipeDetectedRef = useRef(false);
  const pointerDownTimeRef = useRef(0);
  const pauseDelayRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const remainingRef = useRef(AUTO_ADVANCE_MS);
  const slideTimerStartRef = useRef(Date.now());

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, slides.length - 1));
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // Reset timer tracking when slide changes
  useEffect(() => {
    remainingRef.current = AUTO_ADVANCE_MS;
    slideTimerStartRef.current = Date.now();
  }, [currentIndex]);

  // Auto-advance timer (like Instagram Stories)
  useEffect(() => {
    if (isPaused || currentIndex >= slides.length - 1) return;

    slideTimerStartRef.current = Date.now();
    const timer = setTimeout(() => {
      setCurrentIndex((prev) => Math.min(prev + 1, slides.length - 1));
    }, remainingRef.current);

    return () => {
      clearTimeout(timer);
      const elapsed = Date.now() - slideTimerStartRef.current;
      remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    };
  }, [currentIndex, isPaused, slides.length]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goPrev();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev]);

  // Pointer handlers: long-press to pause (like Instagram Stories hold)
  const handlePointerDown = useCallback(() => {
    pointerDownTimeRef.current = Date.now();
    // Delay pause by 150ms to avoid flicker on quick taps
    pauseDelayRef.current = setTimeout(() => setIsPaused(true), 150);
  }, []);

  const handlePointerUp = useCallback(() => {
    clearTimeout(pauseDelayRef.current);
    setIsPaused(false);
  }, []);

  // Touch handlers for swipe navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartY.current === null) return;

      const deltaY = touchStartY.current - e.changedTouches[0].clientY;
      const deltaX = Math.abs(
        (touchStartX.current ?? 0) - e.changedTouches[0].clientX,
      );

      // Only register vertical swipes (deltaY > 50px, and mostly vertical)
      if (Math.abs(deltaY) > 50 && Math.abs(deltaY) > deltaX) {
        swipeDetectedRef.current = true;
        if (deltaY > 0) {
          goNext();
        } else {
          goPrev();
        }
      }

      touchStartY.current = null;
      touchStartX.current = null;
    },
    [goNext, goPrev],
  );

  // Tap navigation: left 1/3 = prev, right 2/3 = next
  const handleTap = useCallback(
    (e: React.MouseEvent) => {
      // Skip if a swipe was just detected
      if (swipeDetectedRef.current) {
        swipeDetectedRef.current = false;
        return;
      }
      // Skip long presses (>300ms = hold-to-pause, not a tap)
      if (Date.now() - pointerDownTimeRef.current > 300) return;

      // Ignore clicks on buttons/links
      const target = e.target as HTMLElement;
      if (
        target.closest('button') ||
        target.closest('a') ||
        target.tagName === 'BUTTON' ||
        target.tagName === 'A'
      ) {
        return;
      }

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const thirdWidth = rect.width / 3;

      if (clickX < thirdWidth) {
        goPrev();
      } else {
        goNext();
      }
    },
    [goNext, goPrev],
  );

  // Clean up on unmount
  useEffect(() => {
    return () => clearTimeout(pauseDelayRef.current);
  }, []);

  const currentSlide = slides[currentIndex];
  if (!currentSlide) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        width: '100vw',
        height: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#050505',
      }}
    >
      {/* Slide container — phone-width centered */}
      <div
        onClick={handleTap}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          height: '100%',
          overflow: 'hidden',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Gradient background — crossfade (NO mode="wait" = overlap during transition) */}
        <AnimatePresence>
          <motion.div
            key={`bg-${currentIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: currentSlide.gradient,
            }}
          />
        </AnimatePresence>

        {/* Grain overlay */}
        <GrainOverlay />

        {/* Segmented progress bar with auto-advance fill */}
        <ProgressBar
          total={slides.length}
          current={currentIndex}
          isPaused={isPaused}
          durationMs={AUTO_ADVANCE_MS}
        />

        {/* Close button — top left */}
        <Link
          href={`/analysis/${analysisId}`}
          style={{
            position: 'absolute',
            top: 'max(28px, calc(env(safe-area-inset-top, 0px) + 20px))',
            left: 16,
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 9999,
            background: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'rgba(255, 255, 255, 0.8)',
            textDecoration: 'none',
          }}
          aria-label={`Zamknij Wrapped i wróć do analizy ${conversationTitle}`}
        >
          <X size={18} />
        </Link>

        {/* Slide content — crossfade (no mode="wait" = smooth overlap) */}
        <AnimatePresence initial={false}>
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
            }}
          >
            <SlideContent slide={currentSlide} analysisId={analysisId} />
          </motion.div>
        </AnimatePresence>

        {/* Slide counter — bottom center */}
        <div
          style={{
            position: 'absolute',
            bottom: 'max(20px, calc(env(safe-area-inset-bottom, 0px) + 12px))',
            left: 0,
            right: 0,
            zIndex: 20,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-space-grotesk)',
              fontSize: '0.72rem',
              letterSpacing: '0.1em',
              color: 'rgba(255, 255, 255, 0.35)',
              background: 'rgba(0, 0, 0, 0.2)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderRadius: 12,
              padding: '4px 12px',
              userSelect: 'none',
            }}
          >
            <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              {currentIndex + 1}
            </span>
            <span style={{ margin: '0 4px', opacity: 0.5 }}>/</span>
            <span>{slides.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
