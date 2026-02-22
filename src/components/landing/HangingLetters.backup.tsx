'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import BrandP from '@/components/shared/BrandP';

/* ═══════════════════════════════════════════════════════════════
   TUNABLE CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const G = 900;                     // gravity (px/s²), tuned for visual feel
const DAMPING = 0.003;             // per-frame angular velocity damping
const IDLE_WIND_FORCE = 0.10;      // amplitude of wind sine wave
const IDLE_WIND_FREQ = 0.25;       // Hz, base frequency of wind
const MOUSE_REPEL_RADIUS = 150;    // px, cursor interaction range
const MOUSE_REPEL_FORCE = 6.0;     // strength of cursor push
const COLLISION_PUSH = 0.012;      // collision separation impulse
const COLLISION_GAP = 4;           // min px gap between letters
const RISE_DURATION_S = 1.4;       // seconds for rise animation
const FONT_SIZE_DESKTOP = 42;
const FONT_SIZE_MOBILE = 28;
const LETTER_GAP = 2;              // px gap between letters at rest

/* Per-letter mass (heavier = slower swing, lighter = faster) */
const MASSES = [1.4, 0.8, 1.0, 1.3, 0.9, 1.0, 0.85, 1.3];

/* Per-letter rope lengths (px) — vary for natural unevenness */
const ROPE_LENGTHS = [110, 125, 118, 105, 130, 120, 128, 108];

/* Per-letter rope length multiplier for mobile */
const MOBILE_ROPE_SCALE = 0.6;
const MOBILE_WIND_SCALE = 0.5;

/* Neon glow values (matching CurtainReveal) */
const NEON_FULL = '0 0 7px rgba(168,85,247,0.6), 0 0 20px rgba(168,85,247,0.6), 0 0 42px rgba(168,85,247,0.35), 0 0 82px rgba(168,85,247,0.15)';
const NEON_DIM = '0 0 5px rgba(168,85,247,0.4), 0 0 15px rgba(168,85,247,0.4), 0 0 30px rgba(168,85,247,0.2), 0 0 60px rgba(168,85,247,0.08)';
const RED_GLOW = '0 0 10px rgba(239,68,68,0.6), 0 0 30px rgba(239,68,68,0.3)';

/* ═══════════════════════════════════════════════════════════════
   LETTER DEFINITIONS
   ═══════════════════════════════════════════════════════════════ */

interface LetterDef {
  char: string;     // 'P_SVG' for the SVG P, else text character
  baseColor: string; // starting color
  group: 'brand' | 'eks';
}

const LETTERS: LetterDef[] = [
  { char: 'P_SVG', baseColor: 'gradient', group: 'brand' },
  { char: 'o',     baseColor: '#3b82f6',  group: 'brand' },
  { char: 'd',     baseColor: '#3b82f6',  group: 'brand' },
  { char: 'T',     baseColor: '#a855f7',  group: 'brand' },
  { char: 'e',     baseColor: '#3b2060',  group: 'eks' },
  { char: 'k',     baseColor: '#3b2060',  group: 'eks' },
  { char: 's',     baseColor: '#3b2060',  group: 'eks' },
  { char: 'T',     baseColor: '#a855f7',  group: 'brand' },
];

/* ═══════════════════════════════════════════════════════════════
   PHYSICS STATE TYPES
   ═══════════════════════════════════════════════════════════════ */

interface Pendulum {
  theta: number;       // angle from vertical (rad)
  omega: number;       // angular velocity (rad/s)
  anchorX: number;     // hook X position (px)
  anchorY: number;     // hook Y position (px)
  ropeLen: number;     // rope length (px)
  mass: number;
  windPhase: number;   // random offset for wind
  letterW: number;     // measured letter width
  bobX: number;        // computed bob center X
  bobY: number;        // computed bob center Y
}

type Phase = 'hidden' | 'rising' | 'settling' | 'idle';

interface PhysicsState {
  pendulums: Pendulum[];
  phase: Phase;
  riseStart: number;       // timestamp when rise began
  riseFromY: number;       // starting Y for rise
  riseToY: number;         // target Y for rise
  mouseX: number;
  mouseY: number;
  mouseActive: boolean;
  interactionEnabled: boolean;
  neonActive: boolean;
  lastTime: number;
  isMobile: boolean;
}

/* ═══════════════════════════════════════════════════════════════
   EASING — cubic-bezier(0.76, 0, 0.24, 1) in JS
   ═══════════════════════════════════════════════════════════════ */

function easeRise(t: number): number {
  // Approximation of cubic-bezier(0.76, 0, 0.24, 1) using ease-in-out quartic
  const c = Math.min(1, Math.max(0, t));
  if (c < 0.5) return 8 * c * c * c * c;
  const f = -2 * c + 2;
  return 1 - (f * f * f * f) / 2;
}

/* ═══════════════════════════════════════════════════════════════
   COLOR INTERPOLATION FOR MOUSE GRADIENT
   ═══════════════════════════════════════════════════════════════ */

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const ct = Math.min(1, Math.max(0, t));
  return rgbToHex(
    Math.round(ar + (br - ar) * ct),
    Math.round(ag + (bg - ag) * ct),
    Math.round(ab + (bb - ab) * ct),
  );
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export interface HangingLettersHandle {
  startRise(): void;
  activateNeon(): void;
  enableInteraction(): void;
  startIdleWind(): void;
}

const N = LETTERS.length; // 8

const HangingLetters = forwardRef<HangingLettersHandle>(function HangingLetters(_, ref) {
  /* ── Refs to DOM elements ── */
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const letterRefs = useRef<(HTMLDivElement | null)[]>(new Array(N).fill(null));
  const lineRefs = useRef<(SVGLineElement | null)[]>(new Array(N).fill(null));
  const circleRefs = useRef<(SVGCircleElement | null)[]>(new Array(N).fill(null));
  const measureRef = useRef<HTMLDivElement>(null);

  /* ── Physics state (never triggers React render) ── */
  const phys = useRef<PhysicsState>({
    pendulums: [],
    phase: 'hidden',
    riseStart: 0,
    riseFromY: 0,
    riseToY: 3,
    mouseX: 0,
    mouseY: 0,
    mouseActive: false,
    interactionEnabled: false,
    neonActive: false,
    lastTime: 0,
    isMobile: false,
  });

  const rafId = useRef(0);
  const neonBreathIds = useRef<Animation[]>([]);

  /* ── Imperative handle for CurtainReveal ── */
  useImperativeHandle(ref, () => ({
    startRise() {
      const s = phys.current;
      s.phase = 'rising';
      s.riseStart = performance.now();
      s.riseFromY = window.innerHeight / 2;
      // Give each letter a random initial nudge (inertia from rising)
      for (const p of s.pendulums) {
        p.theta = (Math.random() - 0.5) * 0.25;
        p.omega = (Math.random() - 0.5) * 1.5;
      }
      // Show letters
      for (const el of letterRefs.current) {
        if (el) el.style.opacity = '1';
      }
    },
    activateNeon() {
      activateNeonEffect();
    },
    enableInteraction() {
      phys.current.interactionEnabled = true;
      if (containerRef.current) {
        containerRef.current.style.pointerEvents = 'auto';
        containerRef.current.style.cursor = 'default';
      }
    },
    startIdleWind() {
      phys.current.phase = 'idle';
    },
  }));

  /* ── Neon effect for e, k, s (indices 4, 5, 6) ── */
  function activateNeonEffect() {
    phys.current.neonActive = true;
    [4, 5, 6].forEach((idx, i) => {
      const el = letterRefs.current[idx];
      if (!el) return;
      const stagger = i * 60;

      setTimeout(() => {
        // Flicker
        el.animate(
          [
            { opacity: '1' }, { opacity: '0.4' }, { opacity: '1' },
            { opacity: '0.7' }, { opacity: '1' }, { opacity: '0.85' }, { opacity: '1' },
          ],
          { duration: 300 },
        );
        // Light up
        el.animate(
          [
            { color: '#3b2060', textShadow: 'none' },
            { color: '#a855f7', textShadow: NEON_FULL },
          ],
          { duration: 800, fill: 'forwards' },
        );
        // Breathe loop (staggered cycle duration for organic feel)
        setTimeout(() => {
          const anim = el.animate(
            [
              { textShadow: NEON_FULL },
              { textShadow: NEON_DIM },
              { textShadow: NEON_FULL },
            ],
            { duration: 4000 + i * 200, iterations: Infinity, easing: 'ease-in-out' },
          );
          neonBreathIds.current.push(anim);
        }, 800);
      }, stagger);
    });
  }

  /* ── Hover: eks turns red / unhover returns purple ── */
  function handleEksHover(entering: boolean) {
    if (!phys.current.neonActive) return;
    [4, 5, 6].forEach((idx) => {
      const el = letterRefs.current[idx];
      if (!el) return;
      el.getAnimations().forEach((a) => a.cancel());

      if (entering) {
        el.animate(
          [{ color: '#ef4444', textShadow: RED_GLOW }],
          { duration: 300, fill: 'forwards' },
        );
      } else {
        el.animate(
          [{ color: '#a855f7', textShadow: NEON_FULL }],
          { duration: 300, fill: 'forwards' },
        );
        // Restart breathe
        const anim = el.animate(
          [
            { textShadow: NEON_FULL },
            { textShadow: NEON_DIM },
            { textShadow: NEON_FULL },
          ],
          { duration: 4000, iterations: Infinity, easing: 'ease-in-out' },
        );
        neonBreathIds.current.push(anim);
      }
    });
  }

  /* ════════════════════════════════════════════════════════════
     MAIN EFFECT — measurement, physics loop, event listeners
     ════════════════════════════════════════════════════════════ */

  useEffect(() => {
    const s = phys.current;
    s.isMobile = window.matchMedia('(max-width: 767px)').matches;
    const fontSize = s.isMobile ? FONT_SIZE_MOBILE : FONT_SIZE_DESKTOP;
    const ropeScale = s.isMobile ? MOBILE_ROPE_SCALE : 1;

    /* ── Measure letter widths ── */
    function measure() {
      const mEl = measureRef.current;
      if (!mEl) return;
      // Set font for measurement
      mEl.style.fontSize = `${fontSize}px`;

      const widths: number[] = [];
      const spans = mEl.querySelectorAll<HTMLSpanElement>('[data-m]');
      spans.forEach((span) => {
        widths.push(span.getBoundingClientRect().width);
      });
      if (widths.length !== N) return;

      // Compute anchor X positions (centered)
      const totalW = widths.reduce((a, b) => a + b, 0) + (N - 1) * LETTER_GAP;
      const startX = (window.innerWidth - totalW) / 2;
      let accX = startX;

      s.pendulums = [];
      for (let i = 0; i < N; i++) {
        const rLen = ROPE_LENGTHS[i] * ropeScale;
        s.pendulums.push({
          theta: 0,
          omega: 0,
          anchorX: accX + widths[i] / 2,
          anchorY: s.riseToY,
          ropeLen: rLen,
          mass: MASSES[i],
          windPhase: Math.random() * Math.PI * 2,
          letterW: widths[i],
          bobX: accX + widths[i] / 2,
          bobY: s.riseToY + rLen,
        });
        accX += widths[i] + LETTER_GAP;
      }
    }

    // Wait for fonts to load before measuring
    if (document.fonts?.ready) {
      document.fonts.ready.then(measure);
    } else {
      setTimeout(measure, 200);
    }

    /* ── Physics tick ── */
    function tick(now: number) {
      if (s.lastTime === 0) { s.lastTime = now; return; }
      const rawDt = (now - s.lastTime) / 1000;
      const dt = Math.min(rawDt, 0.033); // cap at ~30fps equivalent
      s.lastTime = now;

      if (s.phase === 'hidden' || s.pendulums.length === 0) return;

      const timeS = now / 1000;

      // Rise interpolation
      if (s.phase === 'rising') {
        const elapsed = (now - s.riseStart) / 1000;
        const t = Math.min(elapsed / RISE_DURATION_S, 1);
        const eased = easeRise(t);
        const currentY = s.riseFromY + (s.riseToY - s.riseFromY) * eased;

        for (const p of s.pendulums) {
          p.anchorY = currentY;
        }
        if (t >= 1) {
          s.phase = 'settling';
        }
      }

      // Physics for each pendulum
      for (let i = 0; i < s.pendulums.length; i++) {
        const p = s.pendulums[i];

        // 1. Gravity torque
        let alpha = -(G / p.ropeLen) * Math.sin(p.theta) / p.mass;

        // 2. Velocity damping
        alpha -= p.omega * DAMPING * 60;

        // 3. Idle wind (only in settling/idle phase)
        if (s.phase === 'idle' || s.phase === 'settling') {
          const windScale = s.isMobile ? MOBILE_WIND_SCALE : 1;
          const w1 = IDLE_WIND_FORCE * Math.sin(timeS * IDLE_WIND_FREQ * Math.PI * 2 + p.windPhase);
          const w2 = 0.04 * Math.sin(timeS * 0.17 + p.windPhase * 2.3);
          alpha += (w1 + w2) * windScale / p.mass;
        }

        // 4. Mouse repulsion (idle + interaction enabled + not mobile)
        if (s.phase === 'idle' && s.interactionEnabled && s.mouseActive && !s.isMobile) {
          const dx = p.bobX - s.mouseX;
          const dy = p.bobY - s.mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MOUSE_REPEL_RADIUS && dist > 1) {
            const tangentX = Math.cos(p.theta);
            const proj = (dx * tangentX) / dist;
            const strength = (1 - dist / MOUSE_REPEL_RADIUS) * MOUSE_REPEL_FORCE;
            alpha += (proj * strength) / (p.mass * p.ropeLen);
          }
        }

        // 5. Collision with adjacent letters
        for (const adj of [-1, 1]) {
          const j = i + adj;
          if (j < 0 || j >= s.pendulums.length) continue;
          const q = s.pendulums[j];
          const gap = (p.letterW / 2 + q.letterW / 2 + COLLISION_GAP);
          const overlap = gap - Math.abs(p.bobX - q.bobX);
          if (overlap > 0) {
            const dir = p.bobX > q.bobX ? 1 : -1;
            p.omega += dir * COLLISION_PUSH * overlap / p.mass;
          }
        }

        // 6. Integrate
        p.omega += alpha * dt;
        p.omega *= (1 - DAMPING);
        p.theta += p.omega * dt;

        // 7. Clamp angle
        p.theta = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, p.theta));

        // 8. Update bob position
        p.bobX = p.anchorX + p.ropeLen * Math.sin(p.theta);
        p.bobY = p.anchorY + p.ropeLen * Math.cos(p.theta);
      }
    }

    /* ── Render — write to DOM ── */
    function render() {
      if (s.pendulums.length === 0) return;

      for (let i = 0; i < s.pendulums.length; i++) {
        const p = s.pendulums[i];
        const el = letterRefs.current[i];
        const line = lineRefs.current[i];
        const circle = circleRefs.current[i];

        // Letter position (translate so center of letter is at bobX, bobY)
        if (el) {
          el.style.transform = `translate(${p.bobX - p.letterW / 2}px, ${p.bobY}px)`;
        }

        // Rope line
        if (line) {
          line.setAttribute('x1', String(p.anchorX));
          line.setAttribute('y1', String(p.anchorY));
          line.setAttribute('x2', String(p.bobX));
          line.setAttribute('y2', String(p.bobY));
        }

        // Hook circle
        if (circle) {
          circle.setAttribute('cx', String(p.anchorX));
          circle.setAttribute('cy', String(p.anchorY));
        }

        // Interactive gradient: brand letters shift color based on mouse X
        if (!s.isMobile && s.mouseActive && s.interactionEnabled && LETTERS[i].group === 'brand' && el) {
          const relX = s.mouseX / window.innerWidth; // 0 to 1
          const dist = Math.sqrt((p.bobX - s.mouseX) ** 2 + (p.bobY - s.mouseY) ** 2);
          const proximity = Math.max(0, 1 - dist / 300);
          if (proximity > 0.05) {
            const mouseColor = lerpColor('#3b82f6', '#ec4899', relX);
            const blended = lerpColor(LETTERS[i].baseColor === 'gradient' ? '#7c3aed' : LETTERS[i].baseColor, mouseColor, proximity * 0.5);
            el.style.color = blended;
          } else if (LETTERS[i].baseColor !== 'gradient') {
            el.style.color = LETTERS[i].baseColor;
          }
        }
      }
    }

    /* ── Animation loop ── */
    function loop(now: number) {
      rafId.current = requestAnimationFrame(loop);
      tick(now);
      render();
    }
    rafId.current = requestAnimationFrame(loop);

    /* ── Mouse events ── */
    function onMouseMove(e: MouseEvent) {
      s.mouseX = e.clientX;
      s.mouseY = e.clientY;
      s.mouseActive = true;
    }
    function onMouseLeave() {
      s.mouseActive = false;
      // Reset brand letter colors
      for (let i = 0; i < N; i++) {
        const el = letterRefs.current[i];
        if (el && LETTERS[i].group === 'brand' && LETTERS[i].baseColor !== 'gradient') {
          el.style.color = LETTERS[i].baseColor;
        }
      }
    }

    if (!s.isMobile) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseleave', onMouseLeave);
    }

    /* ── Touch events (mobile) ── */
    function onTouchMove(e: TouchEvent) {
      if (!s.interactionEnabled || s.pendulums.length === 0) return;
      const touch = e.touches[0];
      if (!touch) return;
      s.mouseX = touch.clientX;
      s.mouseY = touch.clientY;
      s.mouseActive = true;
    }
    function onTouchEnd() {
      s.mouseActive = false;
    }

    if (s.isMobile) {
      window.addEventListener('touchmove', onTouchMove, { passive: true });
      window.addEventListener('touchend', onTouchEnd);
    }

    /* ── Visibility pause ── */
    function onVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(rafId.current);
      } else {
        s.lastTime = 0; // reset dt on resume
        rafId.current = requestAnimationFrame(loop);
      }
    }
    document.addEventListener('visibilitychange', onVisibility);

    /* ── Resize ── */
    function onResize() {
      s.isMobile = window.matchMedia('(max-width: 767px)').matches;
      measure();
      // Reset physics on resize to prevent jarring positions
      for (const p of s.pendulums) {
        p.theta = 0;
        p.omega = 0;
      }
    }
    window.addEventListener('resize', onResize);

    /* ── Cleanup ── */
    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
      neonBreathIds.current.forEach((a) => a.cancel());
    };
  }, []);

  /* ── Hover detection for eks region ── */
  function onContainerMouseMove(e: React.MouseEvent) {
    if (!phys.current.neonActive || !phys.current.interactionEnabled) return;
    const s = phys.current;
    // Check if mouse is near any eks letter (indices 4,5,6)
    let nearEks = false;
    for (const idx of [4, 5, 6]) {
      const p = s.pendulums[idx];
      if (!p) continue;
      const dx = e.clientX - p.bobX;
      const dy = e.clientY - p.bobY;
      if (Math.sqrt(dx * dx + dy * dy) < 60) {
        nearEks = true;
        break;
      }
    }
    // Track hover state to avoid re-triggering
    const container = containerRef.current;
    if (!container) return;
    const wasHovering = container.dataset.eksHover === '1';
    if (nearEks && !wasHovering) {
      container.dataset.eksHover = '1';
      handleEksHover(true);
    } else if (!nearEks && wasHovering) {
      container.dataset.eksHover = '0';
      handleEksHover(false);
    }
  }

  function onContainerMouseLeave() {
    const container = containerRef.current;
    if (container?.dataset.eksHover === '1') {
      container.dataset.eksHover = '0';
      handleEksHover(false);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */

  return (
    <div
      ref={containerRef}
      onMouseMove={onContainerMouseMove}
      onMouseLeave={onContainerMouseLeave}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1001,
        pointerEvents: 'none',
      }}
    >
      {/* Hidden measurement row (visibility:hidden keeps layout) */}
      <div
        ref={measureRef}
        style={{
          position: 'absolute',
          visibility: 'hidden',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-jetbrains-mono), monospace',
          fontWeight: 800,
          fontSize: FONT_SIZE_DESKTOP,
          letterSpacing: -1,
        }}
      >
        {LETTERS.map((l, i) => (
          <span key={i} data-m={i}>
            {l.char === 'P_SVG' ? 'P' : l.char}
          </span>
        ))}
      </div>

      {/* SVG overlay — ropes and hooks */}
      <svg
        ref={svgRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {LETTERS.map((_, i) => (
          <g key={i}>
            <line
              ref={(el) => { lineRefs.current[i] = el; }}
              stroke="rgba(120,110,100,0.35)"
              strokeWidth="1"
              x1="0" y1="0" x2="0" y2="0"
            />
            <circle
              ref={(el) => { circleRefs.current[i] = el; }}
              r="2.5"
              fill="#3a3632"
              cx="0" cy="0"
            />
          </g>
        ))}
      </svg>

      {/* Letter bobs */}
      {LETTERS.map((l, i) => (
        <div
          key={i}
          ref={(el) => { letterRefs.current[i] = el; }}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            fontFamily: 'var(--font-jetbrains-mono), monospace',
            fontWeight: 800,
            fontSize: FONT_SIZE_DESKTOP,
            letterSpacing: -1,
            color: l.baseColor === 'gradient' ? '#7c3aed' : l.baseColor,
            userSelect: 'none',
            willChange: 'transform',
            opacity: 0,
            textShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          {l.char === 'P_SVG' ? (
            <BrandP height="0.9em" />
          ) : (
            l.char
          )}
        </div>
      ))}
    </div>
  );
});

export default HangingLetters;
