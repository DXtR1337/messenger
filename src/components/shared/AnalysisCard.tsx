'use client';

import { useCallback, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AnalysisCardProps {
  children: ReactNode;
  className?: string;
  /** Use glass morphism instead of solid background */
  glass?: boolean;
  /** Add mode-tinted shadow */
  shadow?: boolean;
  /** Purple accent top border + gradient glow + mouse spotlight (AI mode) */
  accent?: boolean;
  /** Inline styles for dynamic values (e.g. animation delays) */
  style?: React.CSSProperties;
}

// Max tilt in degrees — subtle enough to feel premium, not gimmicky
const MAX_TILT = 2.5;
// Glare opacity at strongest point
const MAX_GLARE = 0.12;

/**
 * Standardized card wrapper for mode page content sections.
 * Supports glass morphism (Glass 2.0), mode-tinted shadows, accent variant,
 * 3D perspective tilt, mouse-tracking spotlight, and glare on accent cards.
 */
export default function AnalysisCard({
  children,
  className,
  glass = false,
  shadow = false,
  accent = false,
  style,
}: AnalysisCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  // Skip expensive 3D tilt + holographic glare on mobile (no hover anyway)
  const isMobileRef = useRef(typeof window !== 'undefined' && window.innerWidth < 768);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!accent || isMobileRef.current) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const card = cardRef.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Spotlight position
      card.style.setProperty('--spot-x', `${x}px`);
      card.style.setProperty('--spot-y', `${y}px`);

      // 3D tilt: map mouse position to rotation angles
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateY = ((x - centerX) / centerX) * MAX_TILT;
      const rotateX = ((centerY - y) / centerY) * MAX_TILT;
      card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01,1.01,1.01)`;

      // Holographic glare — purple-spectrum prismatic shift following mouse
      const glare = glareRef.current;
      if (glare) {
        const pctX = (x / rect.width) * 100;
        const pctY = (y / rect.height) * 100;
        const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        const maxDist = Math.sqrt(centerX ** 2 + centerY ** 2);
        const intensity = (dist / maxDist) * MAX_GLARE;
        // Hue shifts through purple family: violet → purple → magenta
        const hue = 270 + (pctX + pctY) * 0.25;
        const hue2 = hue + 25;
        glare.style.background = [
          // Primary holographic spot — bright center with purple hue shift
          `radial-gradient(500px circle at ${pctX}% ${pctY}%, hsla(${hue},75%,82%,${intensity}) 0%, hsla(${hue},55%,68%,${intensity * 0.3}) 30%, transparent 55%)`,
          // Prismatic refraction streak — elongated vertical band
          `radial-gradient(150px 600px at ${pctX}% ${pctY}%, hsla(${hue2},85%,88%,${intensity * 0.35}) 0%, transparent 45%)`,
          // Conic shimmer — subtle rotating rainbow refractions
          `conic-gradient(from ${(pctX + pctY) * 1.8}deg at ${pctX}% ${pctY}%, transparent 0%, hsla(280,70%,80%,${intensity * 0.12}) 10%, transparent 20%, hsla(300,80%,85%,${intensity * 0.08}) 35%, transparent 45%)`,
        ].join(', ');
        glare.style.opacity = '1';
      }
    });
  }, [accent]);

  const handleMouseLeave = useCallback(() => {
    if (!accent) return;
    const card = cardRef.current;
    if (card) {
      card.style.removeProperty('--spot-x');
      card.style.removeProperty('--spot-y');
      card.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
    }
    const glare = glareRef.current;
    if (glare) {
      glare.style.opacity = '0';
    }
  }, [accent]);

  return (
    <div
      ref={cardRef}
      className={cn(
        'group/card relative overflow-hidden rounded-2xl border p-5 sm:p-7',
        'transition-[border-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
        'hover:border-purple-500/[0.15] hover:shadow-[0_8px_32px_-4px_rgba(168,85,247,0.15)]',
        glass
          ? 'bg-purple-950/[0.06] border-purple-500/[0.06]'
          : 'bg-card border-border',
        shadow && 'shadow-mode glow-sm',
        accent && 'analysis-card-accent',
        className,
      )}
      style={{
        ...style,
        ...(isMobileRef.current ? {} : { transformStyle: 'preserve-3d' as const }),
        ...(glass ? { boxShadow: 'inset 0 1px 0 0 rgba(192,132,252,0.08), 0 0 0 0.5px rgba(168,85,247,0.04)' } : {}),
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Border glow — radial gradient masked to only show at card edges (Vercel-style) */}
      {accent && (
        <div
          className="pointer-events-none absolute -inset-px z-[5] hidden rounded-2xl opacity-0 transition-opacity duration-500 group-hover/card:opacity-100 sm:block"
          style={{
            background: 'radial-gradient(600px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(192,132,252,0.8) 0%, rgba(168,85,247,0.4) 20%, rgba(139,92,246,0.15) 35%, transparent 55%)',
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
            padding: '1.5px',
          } as React.CSSProperties}
          aria-hidden="true"
        />
      )}
      {/* Mouse-tracking spotlight (accent cards only, desktop) */}
      {accent && (
        <div
          className="pointer-events-none absolute inset-0 z-10 hidden opacity-0 transition-opacity duration-500 group-hover/card:opacity-100 sm:block"
          style={{
            background: 'radial-gradient(700px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(168,85,247,0.28) 0%, rgba(139,92,246,0.12) 20%, rgba(124,58,237,0.05) 35%, transparent 50%)',
          }}
          aria-hidden="true"
        />
      )}
      {/* Glare/shine layer — diagonal light that follows mouse for 3D depth */}
      {accent && (
        <div
          ref={glareRef}
          className="pointer-events-none absolute inset-0 z-20 hidden opacity-0 transition-opacity duration-700 sm:block"
          style={{ mixBlendMode: 'overlay' }}
          aria-hidden="true"
        />
      )}
      {/* Top gradient glow — makes card feel illuminated from above (desktop only) */}
      {accent && !isMobileRef.current && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-56 opacity-100"
          style={{
            background: 'linear-gradient(180deg, rgba(168,85,247,0.14) 0%, rgba(139,92,246,0.07) 30%, rgba(124,58,237,0.02) 60%, transparent 100%)',
          }}
          aria-hidden="true"
        />
      )}
      {/* Bottom subtle vignette for depth (desktop only) */}
      {accent && !isMobileRef.current && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 opacity-60"
          style={{
            background: 'linear-gradient(0deg, rgba(10,5,20,0.3) 0%, transparent 100%)',
          }}
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  );
}
