'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import BrandP from '@/components/shared/BrandP';

/* ═══════════════════════════════════════════════════════════════
   TUNABLE CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const G = 420;
const DAMPING = 0.001;
const VELOCITY_DAMPING = 0.018;

// Wind: 3 harmonics — slow, organic, never-repeating
const WIND_AMP_1 = 0.04;
const WIND_AMP_2 = 0.016;
const WIND_AMP_3 = 0.01;
const WIND_FREQ_1 = 0.08;
const WIND_FREQ_2 = 0.21;
const WIND_FREQ_3 = 0.053;

const MOUSE_REPEL_RADIUS = 200;
const MOUSE_REPEL_FORCE = 3.5;
const COLLISION_PUSH = 0.006;
const COLLISION_GAP = 8;

const ANCHOR_Y = 3;

// Animation timing
const DROP_DURATION_S = 0.65;
const RISE_DURATION_S = 1.5;
const SETTLE_TRANSITION_S = 0.8; // smooth transition from group→individual

const FONT_SIZE_DESKTOP = 54;
const FONT_SIZE_MOBILE = 32;
const LETTER_GAP = 2;

const MASSES = [1.4, 0.75, 0.95, 1.3, 0.85, 1.0, 0.8, 1.3];

/* Final rope lengths per letter — slight natural variance */
const ROPE_LENGTHS_FINAL = [197, 201, 199, 195, 204, 200, 202, 196];

const MOBILE_ROPE_SCALE = 0.55;
const MOBILE_WIND_SCALE = 0.45;

const NEON_FULL = '0 0 7px rgba(168,85,247,0.6), 0 0 20px rgba(168,85,247,0.6), 0 0 42px rgba(168,85,247,0.35), 0 0 82px rgba(168,85,247,0.15)';
const NEON_DIM = '0 0 5px rgba(168,85,247,0.4), 0 0 15px rgba(168,85,247,0.4), 0 0 30px rgba(168,85,247,0.2), 0 0 60px rgba(168,85,247,0.08)';
const RED_GLOW = '0 0 10px rgba(239,68,68,0.6), 0 0 30px rgba(239,68,68,0.3)';

// Elastic rope rendering
const ROPE_SAG_BASE = 20;
const ROPE_TRAIL_FACTOR = 38;
const ROPE_SLACK_FACTOR = 12;

// Scroll-linked rope shortening — letters pull up when scrolling past landing
const MIN_ROPE_LEN = 35;              // minimum rope length (letters hugging the top)
const SCROLL_RETRACT_RANGE = 0.6;     // fraction of vh over which full retraction happens

/* ═══════════════════════════════════════════════════════════════ */

interface LetterDef {
  char: string;
  baseColor: string;
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

/* ═══════════════════════════════════════════════════════════════ */

interface Pendulum {
  theta: number;
  omega: number;
  anchorX: number;
  anchorY: number;
  ropeLenFinal: number;
  mass: number;
  windPhase: number;
  letterW: number;
  letterH: number;
  bobX: number;
  bobY: number;
}

/*
  Phases:
  - waiting: letters hang still at initial groupY
  - dropping: group drops together (all letters same Y motion)
  - rising: group rises together
  - transitioning: blending from group position to individual pendulum positions
  - idle: full individual pendulum physics
*/
type Phase = 'waiting' | 'dropping' | 'rising' | 'transitioning' | 'idle';

interface PhysicsState {
  pendulums: Pendulum[];
  phase: Phase;
  phaseStart: number;
  // Group animation state — during drop/rise ALL letters share this Y offset
  groupRopeLen: number;
  groupRopeLenInitial: number;  // starting length (letters at ~45% vh)
  groupRopeLenDrop: number;     // after drop (~55% vh)
  groupRopeLenFinal: number;    // average of individual final lengths
  scrollY: number;
  vh: number;
  mouseX: number;
  mouseY: number;
  mouseActive: boolean;
  interactionEnabled: boolean;
  neonActive: boolean;
  lastTime: number;
  lastBumpTime: number;
  isMobile: boolean;
  measured: boolean;
  ropesBrightened: boolean;
}

/** Returns effective rope length based on scroll position (shorter when scrolled down) */
function scrollAdjustedRopeLen(baseLen: number, scrollY: number, vh: number): number {
  if (scrollY <= 0) return baseLen;
  const scrollFrac = Math.min(scrollY / (vh * SCROLL_RETRACT_RANGE), 1);
  // Smooth ease-out curve for natural retraction
  const t = 1 - (1 - scrollFrac) * (1 - scrollFrac);
  return baseLen + (MIN_ROPE_LEN - baseLen) * t;
}

/* Smooth ease-in for drop (gravity feel) */
function easeInCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * c;
}

/* Smooth ease-in-out for rise */
function easeRise(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  if (c < 0.5) return 4 * c * c * c;
  const f = -2 * c + 2;
  return 1 - (f * f * f) / 2;
}

/* Smooth blend: ease-in-out */
function easeInOut(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c < 0.5 ? 2 * c * c : 1 - (-2 * c + 2) * (-2 * c + 2) / 2;
}

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

/* ═══════════════════════════════════════════════════════════════ */

export interface HangingLettersHandle {
  startRise(): void;
  activateNeon(): void;
  enableInteraction(): void;
  startIdleWind(): void;
}

export type { HangingLettersHandle as default_handle };

const N = LETTERS.length;

const HangingLetters = forwardRef<HangingLettersHandle>(function HangingLetters(_, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const letterRefs = useRef<(HTMLDivElement | null)[]>(new Array(N).fill(null));
  const pathRefs = useRef<(SVGPathElement | null)[]>(new Array(N).fill(null));
  const shadowRefs = useRef<(SVGPathElement | null)[]>(new Array(N).fill(null));
  const circleRefs = useRef<(SVGCircleElement | null)[]>(new Array(N).fill(null));
  const measureRef = useRef<HTMLDivElement>(null);

  const phys = useRef<PhysicsState>({
    pendulums: [],
    phase: 'waiting',
    phaseStart: 0,
    groupRopeLen: 0,
    groupRopeLenInitial: 0,
    groupRopeLenDrop: 0,
    groupRopeLenFinal: 0,
    scrollY: 0,
    vh: 0,
    mouseX: 0,
    mouseY: 0,
    mouseActive: false,
    interactionEnabled: false,
    neonActive: false,
    lastTime: 0,
    lastBumpTime: 0,
    isMobile: false,
    measured: false,
    ropesBrightened: false,
  });

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

      const totalW = widths.reduce((a, b) => a + b, 0) + (N - 1) * LETTER_GAP;
      const startX = (window.innerWidth - totalW) / 2;
      let accX = startX;

      // Group rope lengths (same for all during drop/rise)
      const avgFinal = ROPE_LENGTHS_FINAL.reduce((a, b) => a + b, 0) / N * ropeScale;
      s.groupRopeLenInitial = vh * 0.45 - ANCHOR_Y;
      s.groupRopeLenDrop = vh * 0.55 - ANCHOR_Y;
      s.groupRopeLenFinal = avgFinal;
      s.groupRopeLen = s.groupRopeLenInitial;

      const pendulums: Pendulum[] = [];
      for (let i = 0; i < N; i++) {
        const finalLen = ROPE_LENGTHS_FINAL[i] * ropeScale;
        const ax = accX + widths[i] / 2;

        pendulums.push({
          theta: 0,
          omega: 0,
          anchorX: ax,
          anchorY: ANCHOR_Y,
          ropeLenFinal: finalLen,
          mass: MASSES[i],
          windPhase: Math.random() * Math.PI * 2,
          letterW: widths[i],
          letterH: heights[i],
          bobX: ax,
          bobY: ANCHOR_Y + s.groupRopeLen,
        });
        accX += widths[i] + LETTER_GAP;
      }
      s.pendulums = pendulums;
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
      if (s.lastTime === 0) { s.lastTime = now; return; }
      const rawDt = (now - s.lastTime) / 1000;
      const dt = Math.min(rawDt, 0.033);
      s.lastTime = now;
      if (!s.measured || s.pendulums.length === 0) return;

      const timeS = now / 1000;
      const phaseElapsed = (now - s.phaseStart) / 1000;

      // ── GROUP PHASES: all letters move together ──

      if (s.phase === 'dropping') {
        const t = Math.min(phaseElapsed / DROP_DURATION_S, 1);
        const eased = easeInCubic(t);
        s.groupRopeLen = s.groupRopeLenInitial +
          (s.groupRopeLenDrop - s.groupRopeLenInitial) * eased;

        // All letters: same Y, straight down from their anchors
        for (const p of s.pendulums) {
          p.bobX = p.anchorX;
          p.bobY = p.anchorY + s.groupRopeLen;
          p.theta = 0;
          p.omega = 0;
        }

        if (t >= 1) {
          s.phase = 'rising';
          s.phaseStart = now;
        }
      }

      else if (s.phase === 'rising') {
        const t = Math.min(phaseElapsed / RISE_DURATION_S, 1);
        const eased = easeRise(t);
        s.groupRopeLen = s.groupRopeLenDrop +
          (s.groupRopeLenFinal - s.groupRopeLenDrop) * eased;

        for (const p of s.pendulums) {
          p.bobX = p.anchorX;
          p.bobY = p.anchorY + s.groupRopeLen;
          p.theta = 0;
          p.omega = 0;
        }

        if (t >= 1) {
          s.phase = 'transitioning';
          s.phaseStart = now;
          // Set each letter to its final rope length position
          for (const p of s.pendulums) {
            p.bobY = p.anchorY + p.ropeLenFinal;
          }
          // Brighten ropes — animate from dim to full
          if (!s.ropesBrightened && svgRef.current) {
            s.ropesBrightened = true;
            svgRef.current.animate(
              [{ opacity: '0.25' }, { opacity: '1' }],
              { duration: 1200, fill: 'forwards', easing: 'ease-out' },
            );
          }
        }
      }

      else if (s.phase === 'transitioning') {
        const t = Math.min(phaseElapsed / SETTLE_TRANSITION_S, 1);
        const blend = easeInOut(t);

        for (let i = 0; i < s.pendulums.length; i++) {
          const p = s.pendulums[i];
          const effLen = scrollAdjustedRopeLen(p.ropeLenFinal, s.scrollY, s.vh);

          let alpha = -(G / effLen) * Math.sin(p.theta) / p.mass;
          alpha -= p.omega * VELOCITY_DAMPING * 2;

          const windScale = s.isMobile ? MOBILE_WIND_SCALE : 1;
          const w1 = WIND_AMP_1 * Math.sin(timeS * WIND_FREQ_1 * Math.PI * 2 + p.windPhase);
          const w2 = WIND_AMP_2 * Math.sin(timeS * WIND_FREQ_2 * Math.PI * 2 + p.windPhase * 1.7);
          const w3 = WIND_AMP_3 * Math.sin(timeS * WIND_FREQ_3 * Math.PI * 2 + p.windPhase * 0.6);
          alpha += (w1 + w2 + w3) * windScale * blend / p.mass;

          p.omega += alpha * dt;
          p.omega *= (1 - DAMPING * 2);
          p.theta += p.omega * dt * blend;

          const groupEffLen = scrollAdjustedRopeLen(s.groupRopeLenFinal, s.scrollY, s.vh);
          const groupY = p.anchorY + groupEffLen;
          const pendY = p.anchorY + effLen * Math.cos(p.theta);
          const pendX = p.anchorX + effLen * Math.sin(p.theta);

          p.bobX = p.anchorX + (pendX - p.anchorX) * blend;
          p.bobY = groupY + (pendY - groupY) * blend;
        }

        if (t >= 1) {
          s.phase = 'idle';
        }
      }

      else if (s.phase === 'idle') {
        for (let i = 0; i < s.pendulums.length; i++) {
          const p = s.pendulums[i];
          const effLen = scrollAdjustedRopeLen(p.ropeLenFinal, s.scrollY, s.vh);

          let alpha = -(G / effLen) * Math.sin(p.theta) / p.mass;
          alpha -= p.omega * VELOCITY_DAMPING;

          // Reduce wind when scrolled (letters should be calmer at top)
          const scrollDamp = s.scrollY > 0 ? Math.max(0.1, 1 - s.scrollY / (s.vh * 0.5)) : 1;
          const windScale = (s.isMobile ? MOBILE_WIND_SCALE : 1) * scrollDamp;
          const w1 = WIND_AMP_1 * Math.sin(timeS * WIND_FREQ_1 * Math.PI * 2 + p.windPhase);
          const w2 = WIND_AMP_2 * Math.sin(timeS * WIND_FREQ_2 * Math.PI * 2 + p.windPhase * 1.7);
          const w3 = WIND_AMP_3 * Math.sin(timeS * WIND_FREQ_3 * Math.PI * 2 + p.windPhase * 0.6);
          alpha += (w1 + w2 + w3) * windScale / p.mass;

          // Mouse repulsion
          if (s.interactionEnabled && s.mouseActive && !s.isMobile) {
            const dx = p.bobX - s.mouseX;
            const dy = p.bobY - s.mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < MOUSE_REPEL_RADIUS && dist > 1) {
              const tangentX = Math.cos(p.theta);
              const proj = (dx * tangentX) / dist;
              const falloff = (1 - dist / MOUSE_REPEL_RADIUS);
              alpha += (falloff * falloff * MOUSE_REPEL_FORCE * proj) / (p.mass * effLen);
            }
          }

          // Collision
          for (const adj of [-1, 1]) {
            const j = i + adj;
            if (j < 0 || j >= s.pendulums.length) continue;
            const q = s.pendulums[j];
            const gap = (p.letterW / 2 + q.letterW / 2 + COLLISION_GAP);
            const overlap = gap - Math.abs(p.bobX - q.bobX);
            if (overlap > 0) {
              p.omega += (p.bobX > q.bobX ? 1 : -1) * COLLISION_PUSH * overlap / p.mass;
            }
          }

          // Integrate
          p.omega += alpha * dt;
          p.omega *= (1 - DAMPING);
          p.theta += p.omega * dt;

          // Soft clamp — tighter when scrolled (less sway at top)
          const maxAngle = s.scrollY > 0 ? Math.PI / 8 : Math.PI / 3;
          if (Math.abs(p.theta) > maxAngle) {
            p.theta = Math.sign(p.theta) * maxAngle;
            p.omega *= -0.2;
          }

          p.bobX = p.anchorX + effLen * Math.sin(p.theta);
          p.bobY = p.anchorY + effLen * Math.cos(p.theta);
        }

        // Particle → text bump: when mouse hovers brain zone, gently jostle letters
        if (s.mouseActive && !s.isMobile && s.scrollY < 10) {
          const vw = window.innerWidth;
          const inBrainX = s.mouseX > vw * 0.3 && s.mouseX < vw * 0.7;
          const inBrainY = s.mouseY > s.vh * 0.25 && s.mouseY < s.vh * 0.75;
          if (inBrainX && inBrainY && now - s.lastBumpTime > 200) {
            s.lastBumpTime = now;
            const ri = Math.floor(Math.random() * s.pendulums.length);
            s.pendulums[ri].omega += (Math.random() - 0.5) * 0.3 / s.pendulums[ri].mass;
          }
        }
      }

      else if (s.phase === 'waiting') {
        // Static — letters hang straight down
        for (const p of s.pendulums) {
          p.bobX = p.anchorX;
          p.bobY = p.anchorY + s.groupRopeLen;
        }
      }
    }

    function renderFrame() {
      if (!s.measured || s.pendulums.length === 0) return;

      const isGroupPhase = s.phase === 'waiting' || s.phase === 'dropping' || s.phase === 'rising';

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
          const ax = p.anchorX, ay = p.anchorY;
          const bx = p.bobX, by = p.bobY;

          let d: string;
          if (isGroupPhase) {
            // Rope during group phases — slight sag for natural look
            const ropeLen = by - ay;
            const sagY = Math.max(8, ropeLen * 0.04);
            const mx = (ax + bx) / 2;
            const my = (ay + by) / 2 + sagY;
            d = `M ${ax},${ay} Q ${mx},${my} ${bx},${by}`;
          } else {
            // Elastic rope with trail and sag during individual physics
            const trailX = -p.omega * ROPE_TRAIL_FACTOR;
            const sagY = ROPE_SAG_BASE + Math.abs(p.omega) * ROPE_SLACK_FACTOR;

            const c1x = ax + (bx - ax) * 0.25 + trailX * 0.1;
            const c1y = ay + (by - ay) * 0.25 + sagY * 0.15;
            const c2x = ax + (bx - ax) * 0.75 + trailX * 0.9;
            const c2y = ay + (by - ay) * 0.75 + sagY * 0.5;

            d = `M ${ax},${ay} C ${c1x},${c1y} ${c2x},${c2y} ${bx},${by}`;
          }
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
      <svg ref={svgRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0 }}>
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
});

export default HangingLetters;
