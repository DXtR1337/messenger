'use client';

import { forwardRef, memo, useEffect, useImperativeHandle, useRef } from 'react';
import BrandP from '@/components/shared/BrandP';
import {
  type PhysicsState,
  LETTERS,
  N,
  FONT_SIZE_DESKTOP,
  FONT_SIZE_MOBILE,
  MOBILE_ROPE_SCALE,
  NEON_FULL,
  NEON_DIM,
  RED_GLOW,
  createPhysicsState,
  initializePendulums,
  computeGroupRopeLengths,
  physicsTick,
  computeRopePath,
  isGroupPhase,
  lerpColor,
} from '@/lib/animation/hanging-physics';

/* ═══════════════════════════════════════════════════════════════ */

export interface HangingLettersHandle {
  startRise(): void;
  activateNeon(): void;
  enableInteraction(): void;
  startIdleWind(): void;
}

export type { HangingLettersHandle as default_handle };

const HangingLetters = memo(forwardRef<HangingLettersHandle>(function HangingLetters(_, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const letterRefs = useRef<(HTMLDivElement | null)[]>(new Array(N).fill(null));
  const pathRefs = useRef<(SVGPathElement | null)[]>(new Array(N).fill(null));
  const shadowRefs = useRef<(SVGPathElement | null)[]>(new Array(N).fill(null));
  const circleRefs = useRef<(SVGCircleElement | null)[]>(new Array(N).fill(null));
  const measureRef = useRef<HTMLDivElement>(null);

  const phys = useRef<PhysicsState>(createPhysicsState());

  const rafId = useRef(0);
  const neonBreathIds = useRef<Animation[]>([]);

  useImperativeHandle(ref, () => ({
    startRise() {
      const s = phys.current;
      if (s.phase !== 'waiting') return;
      s.phase = 'dropping';
      s.phaseStart = performance.now();
    },
    activateNeon() { activateNeonEffect(); },
    enableInteraction() {
      phys.current.interactionEnabled = true;
      // Enable pointer events on individual letter divs only — NOT the container
      // This lets the Spline brain scene below receive mouse events
      for (let i = 0; i < N; i++) {
        const el = letterRefs.current[i];
        if (el) {
          el.style.pointerEvents = 'auto';
          el.style.cursor = 'default';
        }
      }
    },
    startIdleWind() {
      // If still transitioning, let it finish naturally
      if (phys.current.phase !== 'transitioning') {
        phys.current.phase = 'idle';
      }
    },
  }));

  function activateNeonEffect() {
    phys.current.neonActive = true;
    [4, 5, 6].forEach((idx, i) => {
      const el = letterRefs.current[idx];
      if (!el) return;
      setTimeout(() => {
        el.animate(
          [{ opacity: '1' }, { opacity: '0.4' }, { opacity: '0.9' },
           { opacity: '0.5' }, { opacity: '1' }],
          { duration: 500, easing: 'ease-in-out' },
        );
        el.animate(
          [{ color: '#3b2060', textShadow: 'none' },
           { color: '#a855f7', textShadow: NEON_FULL }],
          { duration: 1200, fill: 'forwards', easing: 'ease-out' },
        );
        setTimeout(() => {
          const anim = el.animate(
            [{ textShadow: NEON_FULL }, { textShadow: NEON_DIM }, { textShadow: NEON_FULL }],
            { duration: 4500 + i * 400, iterations: Infinity, easing: 'ease-in-out' },
          );
          neonBreathIds.current.push(anim);
        }, 1200);
      }, i * 100);
    });
  }

  function handleEksHover(entering: boolean) {
    if (!phys.current.neonActive) return;
    [4, 5, 6].forEach((idx) => {
      const el = letterRefs.current[idx];
      if (!el) return;
      el.getAnimations().forEach((a) => a.cancel());
      if (entering) {
        el.animate([{ color: '#ef4444', textShadow: RED_GLOW }], { duration: 300, fill: 'forwards' });
      } else {
        el.animate([{ color: '#a855f7', textShadow: NEON_FULL }], { duration: 400, fill: 'forwards' });
        const anim = el.animate(
          [{ textShadow: NEON_FULL }, { textShadow: NEON_DIM }, { textShadow: NEON_FULL }],
          { duration: 4500, iterations: Infinity, easing: 'ease-in-out' },
        );
        neonBreathIds.current.push(anim);
      }
    });
  }

  /* ════════════════════════════════════════════════════════════
     MAIN EFFECT
     ════════════════════════════════════════════════════════════ */

  useEffect(() => {
    const s = phys.current;
    s.isMobile = window.matchMedia('(max-width: 767px)').matches;
    const fontSize = s.isMobile ? FONT_SIZE_MOBILE : FONT_SIZE_DESKTOP;
    const ropeScale = s.isMobile ? MOBILE_ROPE_SCALE : 1;
    const vh = window.innerHeight;
    s.vh = vh;

    function measure() {
      const mEl = measureRef.current;
      if (!mEl) return;
      mEl.style.fontSize = `${fontSize}px`;

      const widths: number[] = [];
      const heights: number[] = [];
      mEl.querySelectorAll<HTMLElement>('[data-m]').forEach((span) => {
        const rect = span.getBoundingClientRect();
        widths.push(rect.width);
        heights.push(rect.height);
      });
      if (widths.length !== N) return;

      // Compute group rope lengths
      const groupLens = computeGroupRopeLengths(s.vh, ropeScale);
      s.groupRopeLenInitial = groupLens.initial;
      s.groupRopeLenDrop = groupLens.drop;
      s.groupRopeLenFinal = groupLens.final;
      s.groupRopeLen = groupLens.initial;

      // Initialize pendulums from measured dimensions
      s.pendulums = initializePendulums(
        widths,
        heights,
        window.innerWidth,
        ropeScale,
        s.groupRopeLen,
      );
      s.measured = true;

      renderFrame();

      // Reveal letters and ropes (they start hidden to prevent flash)
      for (let i = 0; i < N; i++) {
        const el = letterRefs.current[i];
        if (el) el.style.opacity = '1';
      }
      // Ropes start dimmed — they brighten when rise completes
      if (svgRef.current) svgRef.current.style.opacity = '0.25';
    }

    if (document.fonts?.ready) {
      document.fonts.ready.then(measure);
    } else {
      setTimeout(measure, 200);
    }

    function tick(now: number) {
      const result = physicsTick(s, now, window.innerWidth);

      // Brighten ropes when rise completes
      if (result.riseJustCompleted && !s.ropesBrightened && svgRef.current) {
        s.ropesBrightened = true;
        svgRef.current.animate(
          [{ opacity: '0.25' }, { opacity: '1' }],
          { duration: 1200, fill: 'forwards', easing: 'ease-out' },
        );
      }
    }

    function renderFrame() {
      if (!s.measured || s.pendulums.length === 0) return;

      const groupPhase = isGroupPhase(s.phase);

      for (let i = 0; i < s.pendulums.length; i++) {
        const p = s.pendulums[i];
        const el = letterRefs.current[i];
        const path = pathRefs.current[i];
        const shadow = shadowRefs.current[i];
        const circle = circleRefs.current[i];

        if (el) {
          el.style.transform = `translate(${p.bobX - p.letterW / 2}px, ${p.bobY}px)`;
        }

        // Rope rendering
        if (path) {
          const d = computeRopePath(p, groupPhase);
          path.setAttribute('d', d);
          if (shadow) shadow.setAttribute('d', d);
        }

        if (circle) {
          circle.setAttribute('cx', String(p.anchorX));
          circle.setAttribute('cy', String(p.anchorY));
        }

        // Interactive gradient (idle only)
        if (!s.isMobile && s.mouseActive && s.interactionEnabled && LETTERS[i].group === 'brand' && el) {
          const relX = s.mouseX / window.innerWidth;
          const dist = Math.sqrt((p.bobX - s.mouseX) ** 2 + (p.bobY - s.mouseY) ** 2);
          const proximity = Math.max(0, 1 - dist / 350);
          if (proximity > 0.03) {
            const mouseColor = lerpColor('#3b82f6', '#ec4899', relX);
            const blended = lerpColor(
              LETTERS[i].baseColor === 'gradient' ? '#7c3aed' : LETTERS[i].baseColor,
              mouseColor, proximity * 0.4);
            el.style.color = blended;
          } else if (LETTERS[i].baseColor !== 'gradient') {
            el.style.color = LETTERS[i].baseColor;
          }
        }
      }
    }

    function loop(now: number) {
      rafId.current = requestAnimationFrame(loop);
      tick(now);
      renderFrame();
    }
    rafId.current = requestAnimationFrame(loop);

    // Mouse
    let eksHovering = false;
    function onMouseMove(e: MouseEvent) {
      s.mouseX = e.clientX; s.mouseY = e.clientY; s.mouseActive = true;

      // Eks hover detection (moved from container onMouseMove to window-level)
      if (s.neonActive && s.interactionEnabled) {
        let nearEks = false;
        for (const idx of [4, 5, 6]) {
          const p = s.pendulums[idx]; if (!p) continue;
          if (Math.sqrt((e.clientX - p.bobX) ** 2 + (e.clientY - p.bobY) ** 2) < 70) { nearEks = true; break; }
        }
        if (nearEks && !eksHovering) { eksHovering = true; handleEksHover(true); }
        else if (!nearEks && eksHovering) { eksHovering = false; handleEksHover(false); }
      }
    }
    function onMouseLeave() {
      if (eksHovering) { eksHovering = false; handleEksHover(false); }
      s.mouseActive = false;
      for (let i = 0; i < N; i++) {
        const el = letterRefs.current[i];
        if (el && LETTERS[i].group === 'brand' && LETTERS[i].baseColor !== 'gradient') el.style.color = LETTERS[i].baseColor;
      }
    }
    if (!s.isMobile) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseleave', onMouseLeave);
    }

    // Touch
    function onTouchStart(e: TouchEvent) {
      if (!s.interactionEnabled || s.pendulums.length === 0) return;
      const touch = e.touches[0]; if (!touch) return;
      s.mouseX = touch.clientX; s.mouseY = touch.clientY; s.mouseActive = true;
      let minD = Infinity, cl = -1;
      for (let i = 0; i < s.pendulums.length; i++) {
        const d = Math.sqrt((s.pendulums[i].bobX - touch.clientX) ** 2 + (s.pendulums[i].bobY - touch.clientY) ** 2);
        if (d < minD) { minD = d; cl = i; }
      }
      if (cl >= 0 && minD < 120) s.pendulums[cl].omega += (s.pendulums[cl].bobX > touch.clientX ? 1 : -1) * 1.5 / s.pendulums[cl].mass;
    }
    function onTouchMove(e: TouchEvent) { if (!s.interactionEnabled) return; const t = e.touches[0]; if (t) { s.mouseX = t.clientX; s.mouseY = t.clientY; s.mouseActive = true; } }
    function onTouchEnd() { s.mouseActive = false; }
    if (s.isMobile) {
      window.addEventListener('touchstart', onTouchStart, { passive: true });
      window.addEventListener('touchmove', onTouchMove, { passive: true });
      window.addEventListener('touchend', onTouchEnd);
    }

    // Visibility
    function onVis() {
      if (document.hidden) {
        cancelAnimationFrame(rafId.current);
      } else {
        s.lastTime = 0;
        rafId.current = requestAnimationFrame(loop);
      }
    }
    document.addEventListener('visibilitychange', onVis);

    // Scroll — track scrollY for rope shortening
    function onScroll() { s.scrollY = window.scrollY; }
    window.addEventListener('scroll', onScroll, { passive: true });

    // Toggle visibility via custom event from ToggleLettersButton
    function onToggleLetters(e: Event) {
      const hidden = (e as CustomEvent).detail?.hidden;
      const el = containerRef.current;
      if (el) {
        el.style.opacity = hidden ? '0' : '1';
        el.style.transition = 'opacity 0.4s ease';
      }
    }
    window.addEventListener('toggle-letters', onToggleLetters);

    // Resize
    function onResize() {
      s.isMobile = window.matchMedia('(max-width: 767px)').matches;
      s.vh = window.innerHeight;
      measure();
    }
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('toggle-letters', onToggleLetters);
      window.removeEventListener('resize', onResize);
      neonBreathIds.current.forEach((a) => a.cancel());
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', inset: 0, zIndex: 1001, pointerEvents: 'none' }}
    >
      {/* Hidden measurement row */}
      <div
        ref={measureRef}
        style={{
          position: 'absolute', visibility: 'hidden', whiteSpace: 'nowrap',
          fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700,
          fontSize: FONT_SIZE_DESKTOP, display: 'flex', alignItems: 'baseline',
        }}
      >
        {LETTERS.map((l, i) => (
          <span key={i} data-m={i} style={{ display: 'inline-block' }}>
            {l.char === 'P_SVG' ? <BrandP height="1em" /> : l.char}
          </span>
        ))}
      </div>

      {/* SVG ropes — hidden until measured */}
      <svg ref={svgRef} aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0 }}>
        <defs>
          <linearGradient id="rope-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
            <stop offset="50%" stopColor="rgba(220,215,205,0.6)" />
            <stop offset="100%" stopColor="rgba(180,175,168,0.4)" />
          </linearGradient>
          <linearGradient id="rope-grad-eks" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(239,68,68,0.7)" />
            <stop offset="50%" stopColor="rgba(200,50,50,0.45)" />
            <stop offset="100%" stopColor="rgba(160,40,40,0.3)" />
          </linearGradient>
        </defs>
        {LETTERS.map((l, i) => {
          const isEks = l.group === 'eks';
          return (
            <g key={i}>
              <path ref={(el) => { shadowRefs.current[i] = el; }} d="M 0,0 C 0,0 0,0 0,0" stroke={isEks ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.12)'} strokeWidth="6" fill="none" strokeLinecap="round" />
              <path ref={(el) => { pathRefs.current[i] = el; }} d="M 0,0 C 0,0 0,0 0,0" stroke={isEks ? 'url(#rope-grad-eks)' : 'url(#rope-grad)'} strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <circle ref={(el) => { circleRefs.current[i] = el; }} r="3.5" fill={isEks ? '#c45050' : '#e0dbd4'} stroke={isEks ? 'rgba(180,60,60,0.4)' : 'rgba(200,195,188,0.5)'} strokeWidth="0.8" cx="0" cy="0" />
            </g>
          );
        })}
      </svg>

      {/* Letter divs — hidden until measured to prevent flash */}
      {LETTERS.map((l, i) => (
        <div
          key={i}
          ref={(el) => { letterRefs.current[i] = el; }}
          style={{
            position: 'absolute', left: 0, top: 0,
            fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700,
            fontSize: FONT_SIZE_DESKTOP,
            color: l.baseColor === 'gradient' ? '#7c3aed' : l.baseColor,
            userSelect: 'none', willChange: 'transform',
            textShadow: '0 2px 12px rgba(0,0,0,0.6), 0 6px 24px rgba(0,0,0,0.25)',
            lineHeight: 1,
            opacity: 0,
          }}
        >
          {l.char === 'P_SVG' ? <BrandP height="1em" /> : l.char}
        </div>
      ))}
    </div>
  );
}));

export default HangingLetters;
