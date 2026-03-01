'use client';

import { createContext, useContext, useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';

/** Safely coerce AI output to array — AI sometimes returns strings instead of arrays */
export function toArr(val: unknown): string[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') return [val];
  return [];
}

// ── Scene Manager Context ─────────────────────────────────────
// Allows Scene components to self-register with useSceneManager
// without prop-drilling through every scene component.

type RegisterSceneFn = (id: string, el: HTMLElement | null) => void;

const SceneManagerCtx = createContext<RegisterSceneFn | null>(null);

export function SceneManagerProvider({
  registerScene,
  children,
}: {
  registerScene: RegisterSceneFn;
  children: React.ReactNode;
}) {
  return (
    <SceneManagerCtx.Provider value={registerScene}>
      {children}
    </SceneManagerCtx.Provider>
  );
}

// ── Scene wrapper ────────────────────────────────────────────

export function Scene({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const registerScene = useContext(SceneManagerCtx);
  const [reducedMotion] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );

  // Self-register with scene manager for theme tracking
  useEffect(() => {
    if (id && registerScene && ref.current) {
      registerScene(id, ref.current);
      return () => registerScene(id, null);
    }
  }, [id, registerScene]);

  return (
    <motion.div
      ref={ref}
      id={id}
      className={`min-h-[80vh] md:min-h-[60vh] flex flex-col justify-center py-16 md:py-24 scroll-mt-4 ${isInView ? 'in-view' : ''} ${className}`}
      style={{ scrollSnapAlign: 'start', willChange: 'transform, opacity' }}
      initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.8, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

// ── Flatline SVG ─────────────────────────────────────────────

export function FlatlineSVG({ animate = false }: { animate?: boolean }) {
  return (
    <svg
      viewBox="0 0 400 80"
      fill="none"
      className="w-full max-w-md mx-auto"
      aria-hidden="true"
    >
      <path
        d={
          animate
            ? 'M0 40 L60 40 L75 40 L80 15 L85 60 L90 30 L95 50 L100 40 L130 40 L145 40 L150 20 L155 55 L160 35 L165 45 L170 40 L400 40'
            : 'M0 40 L60 40 L75 40 L80 15 L85 60 L90 30 L95 50 L100 40 L130 40 L145 40 L150 20 L155 55 L160 35 L165 45 L170 40 L200 40 L215 40 L220 15 L225 60 L230 30 L235 50 L240 40 L270 40 L285 40 L290 20 L295 55 L300 35 L305 45 L310 40 L400 40'
        }
        stroke="#991b1b"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 1200,
          strokeDashoffset: animate ? 0 : 1200,
          animation: animate ? 'eks-flatline-draw 4s ease-out forwards' : undefined,
        }}
      />
      <style>{`
        @keyframes eks-flatline-draw {
          0% { stroke-dashoffset: 1200; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>
    </svg>
  );
}

// ── Embers ────────────────────────────────────────────────────

export function Embers() {
  const EMBER_COLORS = [
    'rgba(220,38,38,',
    'rgba(153,27,27,',
    'rgba(212,160,122,',
    'rgba(180,83,9,',
    'rgba(127,29,29,',
  ];

  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden="true">
      {Array.from({ length: 15 }).map((_, i) => {
        const color = EMBER_COLORS[i % EMBER_COLORS.length];
        const size = 2 + (i % 3) * 2 + ((i * 7 + 3) % 5) * 0.4;
        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              left: `${5 + (i * 6.3) % 90}%`,
              bottom: `-${5 + (i % 3) * 5}%`,
              background: `radial-gradient(circle, ${color}${(0.3 + (i % 4) * 0.1).toFixed(1)}), transparent)`,
              animation: `eks-ember-float-${i % 3} ${7 + (i % 5) * 3}s ease-in-out infinite`,
              animationDelay: `${(i * 1.3) % 10}s`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes eks-ember-float-0 {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          10% { opacity: 0.5; }
          50% { transform: translateY(-50vh) translateX(25px) scale(0.5); opacity: 0.25; }
          100% { transform: translateY(-100vh) scale(0); opacity: 0; }
        }
        @keyframes eks-ember-float-1 {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          10% { opacity: 0.6; }
          50% { transform: translateY(-55vh) translateX(-35px) scale(0.4); opacity: 0.2; }
          100% { transform: translateY(-100vh) scale(0); opacity: 0; }
        }
        @keyframes eks-ember-float-2 {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          10% { opacity: 0.4; }
          50% { transform: translateY(-45vh) translateX(15px) scale(0.6); opacity: 0.3; }
          100% { transform: translateY(-100vh) scale(0); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ── Mobile Embers (CSS-only fallback for < 768px) ────────────

export function MobileEmbers() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden md:hidden" aria-hidden="true">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${2 + (i % 3) * 1.5}px`,
            height: `${2 + (i % 3) * 1.5}px`,
            left: `${8 + (i * 9.1) % 84}%`,
            bottom: '-5%',
            background: `radial-gradient(circle, rgba(${i % 2 === 0 ? '220,38,38' : '212,160,122'},0.4), transparent)`,
            animation: `eks-mobile-ember ${8 + (i % 4) * 3}s ease-in-out infinite`,
            animationDelay: `${(i * 1.7) % 12}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes eks-mobile-ember {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          10% { opacity: 0.5; }
          50% { transform: translateY(-50vh) translateX(${Math.random() > 0.5 ? '' : '-'}15px) scale(0.5); opacity: 0.2; }
          100% { transform: translateY(-100vh) scale(0); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ── SVG Noise Overlay ────────────────────────────────────────

export function NoiseOverlay() {
  return (
    <svg
      className="pointer-events-none fixed inset-0 z-[2] h-full w-full"
      aria-hidden="true"
      style={{ opacity: 0.02, mixBlendMode: 'overlay' }}
    >
      <filter id="eksPageNoise">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves={3} stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#eksPageNoise)" />
    </svg>
  );
}

// ── EKG Divider ──────────────────────────────────────────────

export function EKGDivider() {
  return (
    <div className="eks-scroll-fade-in flex justify-center py-8" aria-hidden="true">
      <svg viewBox="0 0 200 30" fill="none" className="w-48 md:w-64" style={{ opacity: 0.3 }}>
        <path
          d="M0 15 L50 15 L60 15 L65 5 L70 25 L75 10 L80 20 L85 15 L130 15 L140 15 L200 15"
          stroke="#991b1b"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// ── Phase color gradient helper ──────────────────────────────

export const PHASE_COLORS = ['#d4a07a', '#b45309', '#991b1b', '#7f1d1d', '#1a0808'];

export function getPhaseColor(index: number, total: number): string {
  if (total <= 1) return PHASE_COLORS[0];
  const ratio = index / (total - 1);
  const colorIndex = Math.min(PHASE_COLORS.length - 1, Math.floor(ratio * PHASE_COLORS.length));
  return PHASE_COLORS[colorIndex];
}
