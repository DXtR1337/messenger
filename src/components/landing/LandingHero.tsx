'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { SectionErrorBoundary } from '@/components/shared/SectionErrorBoundary';

const SplineScene = dynamic(
  () => import('@/components/shared/SplineScene').then((m) => ({ default: m.SplineScene })),
  { ssr: false },
);

// Floating data fragment definitions (reduced to 6)
const DATA_FRAGMENTS = [
  { text: '4 521 wiadomości', top: '12%', left: '6%', delay: 0, duration: 18, rotate: -3 },
  { text: '78 / 100', top: '22%', left: '88%', delay: 2.5, duration: 22, rotate: 2 },
  { text: '23:00', top: '60%', left: '5%', delay: 1.2, duration: 16, rotate: -1.5 },
  { text: 'ENFP', top: '70%', left: '91%', delay: 3.8, duration: 20, rotate: 3 },
  { text: 'ghosting: 3d', top: '38%', left: '4%', delay: 0.6, duration: 24, rotate: -2 },
  { text: '❤️ 1 234×', top: '80%', left: '82%', delay: 1.8, duration: 19, rotate: 1.5 },
];

export default function LandingHero() {
  // Conditional render instead of CSS hide — prevents Spline JS + .splinecode download on mobile
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Layer 1: Spline 3D brain scene (desktop only — not rendered on mobile) */}
      {isDesktop && (
        <SectionErrorBoundary section="Spline 3D" fallback={null}>
          <div className="absolute inset-0" style={{ zIndex: 1 }}>
            <SplineScene scene="/scene.splinecode" className="h-full w-full" />
          </div>
        </SectionErrorBoundary>
      )}

      {/* Grain overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          zIndex: 2,
          opacity: 0.03,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Floating data fragments — staggered fade-in */}
      {DATA_FRAGMENTS.map((frag, idx) => (
        <div
          key={idx}
          className="pointer-events-none absolute hidden select-none font-mono md:block"
          style={{
            top: frag.top,
            left: frag.left,
            fontSize: '0.65rem',
            letterSpacing: '0.08em',
            color: '#fafafa',
            zIndex: 2,
            opacity: 0,
            animation: `heroFragmentFadeIn 0.6s ease-out ${0.8 + Math.min(idx * 0.15, 1.2)}s forwards, heroFragmentDrift ${frag.duration}s ease-in-out ${frag.delay}s infinite`,
            ['--frag-target-opacity' as string]: 0.07 + (idx % 3) * 0.015,
            transform: `rotate(${frag.rotate}deg)`,
          }}
        >
          {frag.text}
        </div>
      ))}

      {/* ─── DESKTOP: diagonal text layout ─── */}
      <div className="pointer-events-none relative hidden min-h-screen w-full flex-col items-center justify-center md:flex" style={{ zIndex: 10 }}>
        <h1 className="contents">
        {/* Upper-left text: "Twoje rozmowy mówią" — BLUE — gentle float */}
        <div
          className="absolute"
          style={{ top: '18%', left: '6%', zIndex: 20, animation: 'heroTextFloatLeft 12s ease-in-out infinite' }}
        >
          <div className="flex flex-col items-start">
            {['Twoje', 'rozmowy', 'mówią'].map((word, i) => (
              <span
                key={word}
                className="font-story-display font-black tracking-[-0.04em]"
                style={{
                  fontSize: 'clamp(2rem, 5vw, 3.8rem)',
                  lineHeight: 1.1,
                  color: '#3b82f6',
                  animation: `heroFadeSlideLeft 0.5s ease-out ${0.05 + i * 0.04}s both`,
                }}
              >
                {word}
              </span>
            ))}
          </div>
        </div>

        {/* Lower-right text: "więcej niż myślisz." — PURPLE — gentle float */}
        <div
          className="absolute"
          style={{ bottom: '22%', right: '6%', zIndex: 20, animation: 'heroTextFloatRight 14s ease-in-out infinite' }}
        >
          <div className="flex flex-col items-end">
            {['więcej', 'niż', 'myślisz.'].map((word, i) => (
              <span
                key={word}
                className="font-story-display font-black tracking-[-0.04em]"
                style={{
                  fontSize: 'clamp(2rem, 5vw, 3.8rem)',
                  lineHeight: 1.1,
                  color: '#a855f7',
                  animation: `heroFadeSlideRight 0.5s ease-out ${0.17 + i * 0.04}s both`,
                }}
              >
                {word}
              </span>
            ))}
          </div>
        </div>
        </h1>

        {/* ─── CTA: Floating buttons ─── */}
        <div
          className="pointer-events-auto absolute bottom-[7vh] flex flex-col items-center gap-3"
          style={{ zIndex: 20, animation: 'heroFadeSlideUp 0.5s ease-out 0.3s both' }}
        >
          <div className="flex flex-row items-center gap-3">
            <Link
              href="/analysis/new"
              className="inline-flex items-center justify-center gap-2.5 rounded-xl px-8 py-3.5 font-mono text-[0.82rem] font-bold uppercase tracking-[0.08em] text-white"
            >
              Inicjuj analizę
            </Link>
            <a
              href="#demo"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 px-7 py-3.5 font-mono text-[0.78rem] uppercase tracking-[0.08em] text-white/40 transition-colors duration-300 hover:border-white/20 hover:text-white/60"
            >
              Zobacz demo
            </a>
          </div>
        </div>
      </div>

      {/* ─── MOBILE: stacked layout with diagonal energy ─── */}
      <div className="relative z-10 flex min-h-screen flex-col justify-center px-6 md:hidden">
        {/* Headline — skewed, split alignment */}
        <h1
          className="font-story-display font-black tracking-[-0.04em] text-foreground"
          style={{ fontSize: 'clamp(2.2rem, 8vw, 3.5rem)', lineHeight: 1.05 }}
        >
          <span
            className="block text-left"
            style={{
              color: '#3b82f6',
              transform: 'rotate(-2deg)',
              marginBottom: '0.6em',
            }}
          >
            {['Twoje', 'rozmowy', 'mówią'].map((word, i) => (
              <span
                key={word}
                className="inline-block"
                style={{
                  marginRight: '0.28em',
                  animation: `heroFadeSlideLeft 0.5s ease-out ${0.05 + i * 0.04}s both`,
                }}
              >
                {word}
              </span>
            ))}
          </span>
          <span
            className="block text-right"
            style={{
              color: '#a855f7',
              transform: 'rotate(-2deg)',
            }}
          >
            {['więcej', 'niż', 'myślisz.'].map((word, i) => (
              <span
                key={word}
                className="inline-block"
                style={{
                  marginRight: i < 2 ? '0.28em' : 0,
                  animation: `heroFadeSlideRight 0.5s ease-out ${0.15 + i * 0.05}s both`,
                }}
              >
                {word}
              </span>
            ))}
          </span>
        </h1>

        {/* ─── MOBILE CTA: Pinned to bottom ─── */}
        <div
          className="absolute bottom-[6vh] left-6 right-6 mx-auto flex max-w-sm flex-col items-center gap-3"
          style={{ animation: 'heroFadeSlideUp 0.5s ease-out 0.3s both' }}
        >
          <Link
            href="/analysis/new"
            className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl px-7 py-3.5 font-mono text-[0.78rem] font-bold uppercase tracking-[0.06em] text-white"
          >
            Inicjuj analizę
          </Link>
          <a
            href="#demo"
            className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 px-6 py-3 font-mono text-[0.72rem] uppercase tracking-[0.08em] text-white/40 transition-colors hover:text-white/60"
          >
            Zobacz demo
          </a>
        </div>
      </div>

      {/* Scroll indicator — minimal chevron pulse */}
      <div
        className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 hidden sm:block"
        style={{ zIndex: 15, animation: 'heroFadeIn 0.8s ease-out 1.2s both' }}
      >
        <svg
          width="20"
          height="10"
          viewBox="0 0 20 10"
          fill="none"
          stroke="url(#scrollGrad)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ animation: 'heroPulseDown 2s ease-in-out infinite' }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="scrollGrad" x1="0" y1="0" x2="20" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          <path d="M2 2l8 6 8-6" />
        </svg>
      </div>
    </section>
  );
}
