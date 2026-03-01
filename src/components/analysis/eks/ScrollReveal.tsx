'use client';

import { useRef, useEffect, useState, type ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  /** Starting blur in px (default: 8) */
  blur?: number;
  /** Vertical offset in px (default: 30) */
  offsetY?: number;
  /** Reveal threshold — 0 to 1, how far into viewport to be fully revealed (default: 0.35) */
  threshold?: number;
  className?: string;
}

/**
 * ScrollReveal — deblur + fade + slide tied to IntersectionObserver ratio.
 * Content starts blurred and translucent, sharpens as it scrolls into view.
 */
export default function ScrollReveal({
  children,
  blur = 8,
  offsetY = 30,
  threshold = 0.35,
  className = '',
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const ratio = entry.intersectionRatio;
          const normalized = Math.min(1, ratio / threshold);
          setProgress(normalized);
          if (normalized >= 1) {
            setRevealed(true);
            observer.unobserve(el);
          }
        }
      },
      {
        threshold: Array.from({ length: 20 }, (_, i) => i / 19),
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const currentBlur = revealed ? 0 : blur * (1 - progress);
  const currentOpacity = revealed ? 1 : 0.15 + progress * 0.85;
  const currentY = revealed ? 0 : offsetY * (1 - progress);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        filter: currentBlur > 0.1 ? `blur(${currentBlur.toFixed(1)}px)` : 'none',
        opacity: currentOpacity,
        transform: `translateY(${currentY.toFixed(1)}px)`,
        transition: revealed ? 'filter 0.3s, opacity 0.3s, transform 0.3s' : undefined,
        willChange: revealed ? 'auto' : 'filter, opacity, transform',
      }}
    >
      {children}
    </div>
  );
}
