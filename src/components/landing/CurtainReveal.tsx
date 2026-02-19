'use client';

import { useCallback, useEffect, useRef } from 'react';

const AUTO_OPEN_MS = 5000;

// Neon glow values
const NEON_FULL = '0 0 7px rgba(168,85,247,0.6), 0 0 20px rgba(168,85,247,0.6), 0 0 42px rgba(168,85,247,0.35), 0 0 82px rgba(168,85,247,0.15)';
const NEON_DIM = '0 0 5px rgba(168,85,247,0.4), 0 0 15px rgba(168,85,247,0.4), 0 0 30px rgba(168,85,247,0.2), 0 0 60px rgba(168,85,247,0.08)';

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
  const logoRef = useRef<HTMLDivElement>(null);
  const logoSignRef = useRef<HTMLDivElement>(null);
  const eksRef = useRef<HTMLSpanElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const reflectionRef = useRef<HTMLDivElement>(null);

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
    const easing = 'cubic-bezier(0.76, 0, 0.24, 1)';

    leftRef.current?.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-100%)' }],
      { duration: 1800, easing, fill: 'forwards' },
    );
    rightRef.current?.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }],
      { duration: 1800, easing, fill: 'forwards' },
    );
    seamRef.current?.animate(
      [{ opacity: '1' }, { opacity: '0' }],
      { duration: 500, fill: 'forwards' },
    );

    // ── LOGO RISES ──
    setTimeout(() => {
      const vh = window.innerHeight;
      const targetY = 28 - vh / 2; // from center to 28px from top

      logoRef.current?.animate(
        [
          { transform: 'translate(-50%, -50%) rotate(0deg)' },
          { transform: `translate(-50%, ${targetY}px) rotate(-2deg)` },
        ],
        { duration: 1400, easing, fill: 'forwards' },
      );

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

    // ── NEON "EKS" ──
    setTimeout(() => {
      if (!eksRef.current) return;

      // Flicker 2x
      eksRef.current.animate(
        [
          { opacity: '1' }, { opacity: '0.4' }, { opacity: '1' },
          { opacity: '0.7' }, { opacity: '1' }, { opacity: '0.85' }, { opacity: '1' },
        ],
        { duration: 300 },
      );

      // Light up
      eksRef.current.animate(
        [
          { color: '#3b2060', textShadow: 'none' },
          { color: '#a855f7', textShadow: NEON_FULL },
        ],
        { duration: 800, fill: 'forwards' },
      );

      // Neon breathe loop (starts after light-up)
      setTimeout(() => {
        eksRef.current?.animate(
          [
            { textShadow: NEON_FULL },
            { textShadow: NEON_DIM },
            { textShadow: NEON_FULL },
          ],
          { duration: 4000, iterations: Infinity, easing: 'ease-in-out' },
        );
      }, 800);

      // Neon reflection on sign bottom
      if (reflectionRef.current) {
        reflectionRef.current.animate(
          [
            { background: 'transparent', boxShadow: 'none' },
            { background: 'rgba(168,85,247,0.3)', boxShadow: '0 4px 20px rgba(168,85,247,0.15)' },
          ],
          { duration: 800, fill: 'forwards' },
        );
      }

      // Gentle swing on logo sign
      logoSignRef.current?.animate(
        [
          { transform: 'rotate(0deg)' },
          { transform: 'rotate(0.5deg)' },
          { transform: 'rotate(0deg)' },
          { transform: 'rotate(-0.5deg)' },
          { transform: 'rotate(0deg)' },
        ],
        { duration: 6000, iterations: Infinity, easing: 'ease-in-out' },
      );
    }, 2800);

    // ── HIDE CURTAIN DOM + ENABLE LOGO INTERACTION ──
    setTimeout(() => {
      if (curtainRef.current) curtainRef.current.style.display = 'none';

      // Enable hover on logo (eks → red reveal)
      if (logoRef.current) {
        logoRef.current.style.pointerEvents = 'auto';
        logoRef.current.style.cursor = 'default';
      }

      // Hover: eks turns red, cancels neon breathe; unhover: back to purple neon
      const eksEl = eksRef.current;
      if (eksEl) {
        const RED_GLOW = '0 0 10px rgba(239,68,68,0.6), 0 0 30px rgba(239,68,68,0.3)';

        logoRef.current?.addEventListener('mouseenter', () => {
          eksEl.getAnimations().forEach(a => a.cancel());
          eksEl.animate(
            [{ color: '#ef4444', textShadow: RED_GLOW }],
            { duration: 300, fill: 'forwards' },
          );
        });

        logoRef.current?.addEventListener('mouseleave', () => {
          eksEl.getAnimations().forEach(a => a.cancel());
          eksEl.animate(
            [{ color: '#a855f7', textShadow: NEON_FULL }],
            { duration: 300, fill: 'forwards' },
          );
          // Restart breathe loop
          eksEl.animate(
            [
              { textShadow: NEON_FULL },
              { textShadow: NEON_DIM },
              { textShadow: NEON_FULL },
            ],
            { duration: 4000, iterations: Infinity, easing: 'ease-in-out' },
          );
        });
      }
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

      {/* ═══════ HANGING LOGO ═══════ */}
      <div
        ref={logoRef}
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1001, pointerEvents: 'none',
        }}
      >
        {/* Wires */}
        <div style={{
          position: 'absolute', top: '-200vh', left: '50%',
          transform: 'translateX(-50%)', width: 180, height: '200vh',
          pointerEvents: 'none',
        }}>
          {[15, 50, 85].map((left) => (
            <div key={left} style={{
              position: 'absolute', bottom: 0, left: `${left}%`,
              width: 1, height: '100%',
              background: 'linear-gradient(180deg, transparent 0%, #3a3632 60%, #3a3632 95%, transparent 100%)',
            }}>
              <div style={{
                position: 'absolute', bottom: -2, width: 5, height: 5,
                background: '#3a3632', borderRadius: '50%', transform: 'translateX(-2px)',
              }} />
            </div>
          ))}
        </div>

        {/* Logo sign */}
        <div
          ref={logoSignRef}
          style={{
            position: 'relative', padding: '14px 32px 18px',
            background: '#111111', border: '1px solid #1a1a1a',
            borderRadius: 4,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{
            fontFamily: 'var(--font-jetbrains-mono), monospace',
            fontWeight: 800, fontSize: 42, letterSpacing: -1, userSelect: 'none',
          }}>
            <span style={{ color: '#3b82f6' }}>Pod</span>
            <span style={{ color: '#a855f7' }}>T</span>
            <span ref={eksRef} style={{ color: '#3b2060' }}>eks</span>
            <span style={{ color: '#a855f7' }}>T</span>
          </span>

          {/* Neon reflection */}
          <div
            ref={reflectionRef}
            style={{
              position: 'absolute', bottom: -1, left: '25%', right: '25%',
              height: 1, background: 'transparent',
            }}
          />
        </div>
      </div>

      {/* ═══════ AMBIENT GLOW ═══════ */}
      <div
        ref={glowRef}
        style={{
          position: 'fixed', top: '-20%', left: '50%',
          transform: 'translateX(-50%)', width: 600, height: 400,
          background: 'radial-gradient(ellipse, rgba(168,85,247,0.03) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 998, opacity: 0,
        }}
      />
    </>
  );
}
