'use client';

import { useCallback, useEffect, useRef } from 'react';
import HangingLetters from './HangingLetters';
import type { HangingLettersHandle } from './HangingLetters';

const AUTO_OPEN_MS = 5000;

/**
 * Theatrical curtain reveal — 100% self-contained.
 * ALL styles inline, ALL animations via Web Animations API.
 * Zero dependency on globals.css — bypasses Tailwind/Lightning CSS entirely.
 */
export default function CurtainReveal() {
  const openedRef = useRef(false);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const curtainRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const seamRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLButtonElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const hangingRef = useRef<HangingLettersHandle>(null);

  const openCurtain = useCallback(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);

    // Stop prompt pulsing
    promptRef.current?.getAnimations().forEach(a => a.cancel());
    promptRef.current?.animate(
      [{ opacity: getComputedStyle(promptRef.current).opacity }, { opacity: '0' }],
      { duration: 300, fill: 'forwards' },
    );

    // ── CURTAIN SLIDES OPEN ──
    leftRef.current?.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-100%)' }],
      { duration: 1800, easing: 'cubic-bezier(0.76, 0, 0.24, 1)', fill: 'forwards' },
    );
    rightRef.current?.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }],
      { duration: 1800, easing: 'cubic-bezier(0.76, 0, 0.24, 1)', fill: 'forwards' },
    );
    seamRef.current?.animate(
      [{ opacity: '1' }, { opacity: '0' }],
      { duration: 500, fill: 'forwards' },
    );

    // ── HANGING LETTERS RISE ──
    setTimeout(() => {
      hangingRef.current?.startRise();

      // Show ceiling rail
      railRef.current?.animate(
        [{ opacity: '0' }, { opacity: '1' }],
        { duration: 500, fill: 'forwards' },
      );
    }, 400);

    // ── LANDING CONTENT FADE-IN ──
    setTimeout(() => {
      const landing = document.getElementById('landing-content');
      if (landing) {
        landing.animate(
          [{ opacity: '0' }, { opacity: '1' }],
          { duration: 1200, fill: 'forwards' },
        );
      }
      document.body.style.overflow = '';

      // Ambient glow
      glowRef.current?.animate(
        [{ opacity: '0' }, { opacity: '1' }],
        { duration: 1000, fill: 'forwards' },
      );
    }, 1200);

    // ── NEON "EKS" + IDLE WIND ──
    setTimeout(() => {
      hangingRef.current?.activateNeon();
      hangingRef.current?.startIdleWind();
    }, 2800);

    // ── HIDE CURTAIN DOM + ENABLE INTERACTION ──
    setTimeout(() => {
      if (curtainRef.current) curtainRef.current.style.display = 'none';
      hangingRef.current?.enableInteraction();
    }, 3600);
  }, []);

  // Lock scroll on mount + start prompt pulse
  useEffect(() => {
    document.body.style.overflow = 'hidden';

    // Pulse the prompt text
    promptRef.current?.animate(
      [{ opacity: '0.5' }, { opacity: '1' }, { opacity: '0.5' }],
      { duration: 2000, iterations: Infinity, easing: 'ease-in-out' },
    );

    return () => { document.body.style.overflow = ''; };
  }, []);

  // Auto-open
  useEffect(() => {
    autoTimerRef.current = setTimeout(openCurtain, AUTO_OPEN_MS);
    return () => { if (autoTimerRef.current) clearTimeout(autoTimerRef.current); };
  }, [openCurtain]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCurtain(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [openCurtain]);

  return (
    <>
      {/* ═══════ CURTAIN OVERLAY ═══════ */}
      <div
        ref={curtainRef}
        style={{ position: 'fixed', inset: 0, zIndex: 1000 }}
      >
        {/* Left panel */}
        <div
          ref={leftRef}
          style={{
            position: 'absolute', top: 0, left: 0, width: '50%', height: '100%',
            background: '#0a0a0a', overflow: 'hidden',
          }}
        >
          {/* Fabric texture */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 3px)',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at center, transparent 30%, #030303 100%)',
          }} />
          {/* Fold shadow */}
          <div style={{
            position: 'absolute', top: 0, right: 0, height: '100%', width: 40,
            background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.3))',
          }} />
        </div>

        {/* Right panel */}
        <div
          ref={rightRef}
          style={{
            position: 'absolute', top: 0, right: 0, width: '50%', height: '100%',
            background: '#0a0a0a', overflow: 'hidden',
          }}
        >
          <div style={{
            position: 'absolute', inset: 0,
            background: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 3px)',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at center, transparent 30%, #030303 100%)',
          }} />
          <div style={{
            position: 'absolute', top: 0, left: 0, height: '100%', width: 40,
            background: 'linear-gradient(270deg, transparent, rgba(0,0,0,0.3))',
          }} />
        </div>

        {/* Center seam (blue glow) */}
        <div
          ref={seamRef}
          style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: 2, height: '100%', zIndex: 10,
            background: 'linear-gradient(180deg, transparent 0%, rgba(59,130,246,0.1) 20%, rgba(59,130,246,0.2) 50%, rgba(59,130,246,0.1) 80%, transparent 100%)',
          }}
        />
      </div>

      {/* ═══════ PROMPT ═══════ */}
      <button
        ref={promptRef}
        onClick={openCurtain}
        style={{
          position: 'fixed', bottom: 60, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1002,
          fontFamily: 'var(--font-geist-mono), monospace',
          fontSize: 11, letterSpacing: 5, textTransform: 'uppercase' as const,
          color: '#555555', background: 'none', border: 'none',
          cursor: 'pointer', padding: '16px 32px',
        }}
      >
        kliknij aby ods&#322;oni&#263;
      </button>

      {/* ═══════ CEILING RAIL ═══════ */}
      <div
        ref={railRef}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 3,
          background: '#1a1a1a', zIndex: 999, opacity: 0,
        }}
      />

      {/* ═══════ HANGING LETTERS (replaces static sign) ═══════ */}
      <HangingLetters ref={hangingRef} />

      {/* ═══════ AMBIENT GLOW ═══════ */}
      <div
        ref={glowRef}
        style={{
          position: 'fixed', top: '-20%', left: '50%',
          transform: 'translateX(-50%)', width: '100vw', maxWidth: 600, height: 400,
          background: 'radial-gradient(ellipse, rgba(168,85,247,0.03) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 998, opacity: 0,
        }}
      />
    </>
  );
}
