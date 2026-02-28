/**
 * Pure physics engine for the HangingLetters component.
 *
 * Pendulum simulation with Verlet-style integration, multi-harmonic wind,
 * mouse repulsion, inter-letter collision, and scroll-linked rope shortening.
 *
 * No React, no DOM, no canvas — pure math only.
 */

/* ═══════════════════════════════════════════════════════════════
   TUNABLE CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

export const G = 420;
export const DAMPING = 0.001;
export const VELOCITY_DAMPING = 0.018;

// Wind: 3 harmonics — slow, organic, never-repeating
export const WIND_AMP_1 = 0.04;
export const WIND_AMP_2 = 0.016;
export const WIND_AMP_3 = 0.01;
export const WIND_FREQ_1 = 0.08;
export const WIND_FREQ_2 = 0.21;
export const WIND_FREQ_3 = 0.053;

export const MOUSE_REPEL_RADIUS = 200;
export const MOUSE_REPEL_FORCE = 3.5;
export const COLLISION_PUSH = 0.006;
export const COLLISION_GAP = 8;

export const ANCHOR_Y = 3;

// Animation timing
export const DROP_DURATION_S = 0.65;
export const RISE_DURATION_S = 1.5;
export const SETTLE_TRANSITION_S = 0.8;

export const FONT_SIZE_DESKTOP = 54;
export const FONT_SIZE_MOBILE = 32;
export const LETTER_GAP = 2;

export const MASSES = [1.4, 0.75, 0.95, 1.3, 0.85, 1.0, 0.8, 1.3];

/** Final rope lengths per letter — slight natural variance */
export const ROPE_LENGTHS_FINAL = [197, 201, 199, 195, 204, 200, 202, 196];

export const MOBILE_ROPE_SCALE = 0.55;
export const MOBILE_WIND_SCALE = 0.45;

// Neon / glow string constants (visual, but used for style assignment outside canvas)
export const NEON_FULL =
  '0 0 7px rgba(168,85,247,0.6), 0 0 20px rgba(168,85,247,0.6), 0 0 42px rgba(168,85,247,0.35), 0 0 82px rgba(168,85,247,0.15)';
export const NEON_DIM =
  '0 0 5px rgba(168,85,247,0.4), 0 0 15px rgba(168,85,247,0.4), 0 0 30px rgba(168,85,247,0.2), 0 0 60px rgba(168,85,247,0.08)';
export const RED_GLOW =
  '0 0 10px rgba(239,68,68,0.6), 0 0 30px rgba(239,68,68,0.3)';

// Elastic rope rendering
export const ROPE_SAG_BASE = 20;
export const ROPE_TRAIL_FACTOR = 38;
export const ROPE_SLACK_FACTOR = 12;

// Scroll-linked rope shortening — letters pull up when scrolling past landing
export const MIN_ROPE_LEN = 35;
export const SCROLL_RETRACT_RANGE = 0.6;

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

export interface LetterDef {
  char: string;
  baseColor: string;
  group: 'brand' | 'eks';
}

export const LETTERS: LetterDef[] = [
  { char: 'P_SVG', baseColor: 'gradient', group: 'brand' },
  { char: 'o', baseColor: '#3b82f6', group: 'brand' },
  { char: 'd', baseColor: '#3b82f6', group: 'brand' },
  { char: 'T', baseColor: '#a855f7', group: 'brand' },
  { char: 'e', baseColor: '#3b2060', group: 'eks' },
  { char: 'k', baseColor: '#3b2060', group: 'eks' },
  { char: 's', baseColor: '#3b2060', group: 'eks' },
  { char: 'T', baseColor: '#a855f7', group: 'brand' },
];

export const N = LETTERS.length;

export interface Pendulum {
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

/**
 * Phases:
 *  - waiting: letters hang still at initial groupY
 *  - dropping: group drops together (all letters same Y motion)
 *  - rising: group rises together
 *  - transitioning: blending from group position to individual pendulum positions
 *  - idle: full individual pendulum physics
 */
export type Phase = 'waiting' | 'dropping' | 'rising' | 'transitioning' | 'idle';

export interface PhysicsState {
  pendulums: Pendulum[];
  phase: Phase;
  phaseStart: number;
  // Group animation state — during drop/rise ALL letters share this Y offset
  groupRopeLen: number;
  groupRopeLenInitial: number;
  groupRopeLenDrop: number;
  groupRopeLenFinal: number;
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

/* ═══════════════════════════════════════════════════════════════
   EASING FUNCTIONS
   ═══════════════════════════════════════════════════════════════ */

/** Smooth ease-in for drop (gravity feel) */
export function easeInCubic(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * c;
}

/** Smooth ease-in-out for rise */
export function easeRise(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  if (c < 0.5) return 4 * c * c * c;
  const f = -2 * c + 2;
  return 1 - (f * f * f) / 2;
}

/** Smooth blend: ease-in-out */
export function easeInOut(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c < 0.5 ? 2 * c * c : 1 - (-2 * c + 2) * (-2 * c + 2) / 2;
}

/* ═══════════════════════════════════════════════════════════════
   COLOR UTILITIES
   ═══════════════════════════════════════════════════════════════ */

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

export function lerpColor(a: string, b: string, t: number): string {
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
   PHYSICS FUNCTIONS
   ═══════════════════════════════════════════════════════════════ */

/** Returns effective rope length based on scroll position (shorter when scrolled down) */
export function scrollAdjustedRopeLen(baseLen: number, scrollY: number, vh: number): number {
  if (scrollY <= 0) return baseLen;
  const scrollFrac = Math.min(scrollY / (vh * SCROLL_RETRACT_RANGE), 1);
  // Smooth ease-out curve for natural retraction
  const t = 1 - (1 - scrollFrac) * (1 - scrollFrac);
  return baseLen + (MIN_ROPE_LEN - baseLen) * t;
}

/** Create initial physics state with default values */
export function createPhysicsState(): PhysicsState {
  return {
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
  };
}

/** Initialize pendulums from measured letter dimensions */
export function initializePendulums(
  widths: number[],
  heights: number[],
  viewportWidth: number,
  ropeScale: number,
  groupRopeLen: number,
): Pendulum[] {
  const totalW = widths.reduce((a, b) => a + b, 0) + (N - 1) * LETTER_GAP;
  const startX = (viewportWidth - totalW) / 2;
  let accX = startX;

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
      bobY: ANCHOR_Y + groupRopeLen,
    });
    accX += widths[i] + LETTER_GAP;
  }
  return pendulums;
}

/** Compute group rope length parameters from viewport height and rope scale */
export function computeGroupRopeLengths(
  vh: number,
  ropeScale: number,
): { initial: number; drop: number; final: number } {
  const avgFinal = ROPE_LENGTHS_FINAL.reduce((a, b) => a + b, 0) / N * ropeScale;
  return {
    initial: vh * 0.45 - ANCHOR_Y,
    drop: vh * 0.55 - ANCHOR_Y,
    final: avgFinal,
  };
}

/**
 * Physics tick — advances the simulation by one frame.
 *
 * Mutates state.pendulums in place for performance (60fps hot path).
 * Returns whether the rise phase just completed (so the renderer can
 * trigger rope brightening).
 */
export function physicsTick(
  s: PhysicsState,
  now: number,
  viewportWidth: number,
): { riseJustCompleted: boolean } {
  let riseJustCompleted = false;

  if (s.lastTime === 0) { s.lastTime = now; return { riseJustCompleted }; }
  const rawDt = (now - s.lastTime) / 1000;
  const dt = Math.min(rawDt, 0.033);
  s.lastTime = now;
  if (!s.measured || s.pendulums.length === 0) return { riseJustCompleted };

  const timeS = now / 1000;
  const phaseElapsed = (now - s.phaseStart) / 1000;

  // ── GROUP PHASES: all letters move together ──

  if (s.phase === 'dropping') {
    const t = Math.min(phaseElapsed / DROP_DURATION_S, 1);
    const eased = easeInCubic(t);
    s.groupRopeLen = s.groupRopeLenInitial +
      (s.groupRopeLenDrop - s.groupRopeLenInitial) * eased;

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
      for (const p of s.pendulums) {
        p.bobY = p.anchorY + p.ropeLenFinal;
      }
      riseJustCompleted = true;
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

    // Particle -> text bump: when mouse hovers brain zone, gently jostle letters
    if (s.mouseActive && !s.isMobile && s.scrollY < 10) {
      const inBrainX = s.mouseX > viewportWidth * 0.3 && s.mouseX < viewportWidth * 0.7;
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

  return { riseJustCompleted };
}

/**
 * Compute SVG path `d` attribute for a rope connecting anchor to bob.
 *
 * During group phases (waiting/dropping/rising) produces a gentle quadratic sag.
 * During individual physics (transitioning/idle) produces a cubic curve
 * with trail and sag proportional to angular velocity.
 */
export function computeRopePath(
  p: Pendulum,
  isGroupPhase: boolean,
): string {
  const ax = p.anchorX, ay = p.anchorY;
  const bx = p.bobX, by = p.bobY;

  if (isGroupPhase) {
    const ropeLen = by - ay;
    const sagY = Math.max(8, ropeLen * 0.04);
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2 + sagY;
    return `M ${ax},${ay} Q ${mx},${my} ${bx},${by}`;
  }

  // Elastic rope with trail and sag during individual physics
  const trailX = -p.omega * ROPE_TRAIL_FACTOR;
  const sagY = ROPE_SAG_BASE + Math.abs(p.omega) * ROPE_SLACK_FACTOR;

  const c1x = ax + (bx - ax) * 0.25 + trailX * 0.1;
  const c1y = ay + (by - ay) * 0.25 + sagY * 0.15;
  const c2x = ax + (bx - ax) * 0.75 + trailX * 0.9;
  const c2y = ay + (by - ay) * 0.75 + sagY * 0.5;

  return `M ${ax},${ay} C ${c1x},${c1y} ${c2x},${c2y} ${bx},${by}`;
}

/** Whether the phase is a group phase (all letters move uniformly) */
export function isGroupPhase(phase: Phase): boolean {
  return phase === 'waiting' || phase === 'dropping' || phase === 'rising';
}
