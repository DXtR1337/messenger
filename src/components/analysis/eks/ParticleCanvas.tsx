'use client';

import { useRef, useEffect, useCallback } from 'react';

// ── Types ────────────────────────────────────────────────────

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  opacity: number;
  color: string;
  phase: number; // noise phase offset per particle
  life: number; // 0-1, used for fade-in/out
  maxLife: number;
}

type ParticleVariant = 'embers' | 'ash' | 'dust';

interface ParticleCanvasProps {
  variant?: ParticleVariant;
  intensity?: number; // 0-1, default 0.5
}

// ── Pseudo-simplex noise (zero deps) ─────────────────────────
// Hash-based 2D noise with smooth interpolation — gives organic
// drift without pulling in simplex-noise as a dependency.

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function noise2d(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  const u = fade(fx);
  const v = fade(fy);

  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);

  // Remap 0-1 to -1..1 for natural drift
  return lerp(lerp(a, b, u), lerp(c, d, u), v) * 2 - 1;
}

// ── Color palettes ───────────────────────────────────────────

const PALETTES: Record<ParticleVariant, string[]> = {
  embers: [
    'rgba(220,38,38,0.4)',
    'rgba(153,27,27,0.3)',
    'rgba(212,160,122,0.3)',
    'rgba(180,83,9,0.35)',
    'rgba(127,29,29,0.3)',
  ],
  ash: [
    'rgba(156,163,175,0.2)',
    'rgba(209,213,219,0.15)',
    'rgba(107,114,128,0.15)',
  ],
  dust: [
    'rgba(212,160,122,0.1)',
    'rgba(180,83,9,0.08)',
    'rgba(153,27,27,0.08)',
  ],
};

// ── Per-variant configuration ────────────────────────────────

interface VariantConfig {
  count: number;
  minSize: number;
  maxSize: number;
  speedMin: number;
  speedMax: number;
  direction: -1 | 0 | 1; // -1 = up (embers), 1 = down (ash), 0 = float (dust)
  driftRange: number;
  glowBlur: number; // shadowBlur for glow effect
}

const CONFIGS: Record<ParticleVariant, VariantConfig> = {
  embers: {
    count: 40,
    minSize: 2,
    maxSize: 6,
    speedMin: 0.3,
    speedMax: 0.8,
    direction: -1,
    driftRange: 0.5,
    glowBlur: 8,
  },
  ash: {
    count: 25,
    minSize: 1,
    maxSize: 3,
    speedMin: 0.1,
    speedMax: 0.3,
    direction: 1,
    driftRange: 0.2,
    glowBlur: 0,
  },
  dust: {
    count: 35,
    minSize: 0.5,
    maxSize: 2,
    speedMin: 0.05,
    speedMax: 0.15,
    direction: 0,
    driftRange: 0.3,
    glowBlur: 0,
  },
};

// ── Helpers ──────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function createParticle(
  config: VariantConfig,
  palette: string[],
  canvasW: number,
  canvasH: number,
  randomizeY = true,
): Particle {
  const maxLife = rand(300, 800); // frames

  // Start position: embers at bottom, ash at top, dust anywhere
  let y: number;
  if (!randomizeY) {
    // Spawn at edge for respawn
    if (config.direction === -1) y = canvasH + rand(10, 60);
    else if (config.direction === 1) y = -rand(10, 60);
    else y = rand(0, canvasH);
  } else {
    // Initial random spread
    y = rand(0, canvasH);
  }

  return {
    x: rand(0, canvasW),
    y,
    size: rand(config.minSize, config.maxSize),
    speed: rand(config.speedMin, config.speedMax),
    drift: rand(-config.driftRange, config.driftRange),
    opacity: 0,
    color: pickRandom(palette),
    phase: rand(0, 1000),
    life: 0,
    maxLife,
  };
}

// ── Parse rgba color into components for gradient construction ─

function parseRgba(color: string): { r: number; g: number; b: number; a: number } {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]*)\)/);
  if (!match) return { r: 200, g: 60, b: 60, a: 0.3 };
  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10),
    a: match[4] ? parseFloat(match[4]) : 1,
  };
}

// ── Component ────────────────────────────────────────────────

export default function ParticleCanvas({
  variant = 'embers',
  intensity = 0.5,
}: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const timeRef = useRef(0);
  const reducedMotionRef = useRef(false);
  const isMobileRef = useRef(false);
  const sizeRef = useRef({ w: 0, h: 0 });

  // Store variant/intensity in refs so animation loop reads latest values
  // without triggering a full useEffect restart on every scene change.
  const variantRef = useRef(variant);
  const intensityRef = useRef(intensity);
  const configRef = useRef(CONFIGS[variant]);
  const paletteRef = useRef(PALETTES[variant]);

  useEffect(() => {
    variantRef.current = variant;
    configRef.current = CONFIGS[variant];
    paletteRef.current = PALETTES[variant];
    intensityRef.current = intensity;

    // Smoothly transition particles: re-color existing ones with new palette
    const palette = PALETTES[variant];
    for (const p of particlesRef.current) {
      p.color = pickRandom(palette);
    }
  }, [variant, intensity]);

  // ── Resize handler ─────────────────────────────────────────

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    sizeRef.current = { w: w * dpr, h: h * dpr };

    // Scale context for DPR
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }, []);

  // ── Init + animation loop ─────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check mobile viewport — disable particles entirely on mobile to save battery
    isMobileRef.current = window.innerWidth < 768;
    if (isMobileRef.current) return;

    // Check reduced motion preference
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = mql.matches;

    const onMotionChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
      // Re-init particles when preference changes
      initParticles();
    };
    mql.addEventListener('change', onMotionChange);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initial sizing
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    sizeRef.current = { w: w * dpr, h: h * dpr };
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Logical dimensions (before DPR scaling)
    const logicalW = w;
    const logicalH = h;

    function initParticles() {
      const reduced = reducedMotionRef.current;
      const curConfig = configRef.current;
      const curPalette = paletteRef.current;
      const clampedIntensity = Math.max(0, Math.min(1, intensityRef.current));
      const count = reduced
        ? Math.max(5, Math.round(10 * clampedIntensity))
        : Math.max(10, Math.round(curConfig.count * clampedIntensity));

      particlesRef.current = Array.from({ length: count }, () =>
        createParticle(curConfig, curPalette, logicalW, logicalH, true),
      );
    }

    initParticles();

    // ── Draw a single particle ───────────────────────────────

    function drawParticle(
      renderCtx: CanvasRenderingContext2D,
      p: Particle,
      curVariant: ParticleVariant,
      curConfig: VariantConfig,
    ) {
      const { r, g, b, a } = parseRgba(p.color);
      const effectiveAlpha = a * p.opacity;

      if (effectiveAlpha < 0.005) return; // skip invisible

      renderCtx.save();

      // Glow effect for embers
      if (curVariant === 'embers' && curConfig.glowBlur > 0) {
        renderCtx.shadowColor = `rgba(${r},${g},${b},${effectiveAlpha * 0.6})`;
        renderCtx.shadowBlur = curConfig.glowBlur * p.size * 0.4;
      }

      // Radial gradient for soft edges
      const gradient = renderCtx.createRadialGradient(
        p.x, p.y, 0,
        p.x, p.y, p.size,
      );
      gradient.addColorStop(0, `rgba(${r},${g},${b},${effectiveAlpha})`);
      gradient.addColorStop(0.6, `rgba(${r},${g},${b},${effectiveAlpha * 0.5})`);
      gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);

      renderCtx.fillStyle = gradient;
      renderCtx.beginPath();
      renderCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      renderCtx.fill();

      renderCtx.restore();
    }

    // ── Animation loop ───────────────────────────────────────

    function tick() {
      if (!ctx) return;

      const curVariant = variantRef.current;
      const curConfig = configRef.current;
      const curPalette = paletteRef.current;
      const reduced = reducedMotionRef.current;
      const speedMultiplier = reduced ? 0.3 : 1;
      const noiseScale = 0.003;
      const timeScale = 0.0008;

      timeRef.current += 1;
      const t = timeRef.current * timeScale;

      ctx.clearRect(0, 0, logicalW, logicalH);

      const particles = particlesRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.life += 1;

        const fadeInEnd = 60;
        const fadeOutStart = p.maxLife - 60;
        if (p.life < fadeInEnd) {
          p.opacity = p.life / fadeInEnd;
        } else if (p.life > fadeOutStart) {
          p.opacity = Math.max(0, (p.maxLife - p.life) / 60);
        } else {
          p.opacity = 1;
        }

        if (curVariant === 'embers') {
          const verticalFade = Math.min(1, p.y / (logicalH * 0.15));
          p.opacity *= verticalFade;
        }
        if (curVariant === 'ash') {
          const verticalFade = Math.min(1, (logicalH - p.y) / (logicalH * 0.15));
          p.opacity *= verticalFade;
        }

        const nx = noise2d(p.x * noiseScale + p.phase, t + p.phase * 0.1);
        const ny = noise2d(p.y * noiseScale + p.phase + 100, t + p.phase * 0.1 + 100);

        const driftStrength = curConfig.driftRange * 0.8;
        p.x += (p.drift + nx * driftStrength) * speedMultiplier;
        p.y += p.speed * curConfig.direction * speedMultiplier + ny * 0.15 * speedMultiplier;

        if (curVariant === 'dust') {
          p.x += nx * 0.3 * speedMultiplier;
          p.y += ny * 0.3 * speedMultiplier;
        }

        const outOfBounds =
          p.x < -20 || p.x > logicalW + 20 ||
          p.y < -60 || p.y > logicalH + 60;
        const lifetimeExpired = p.life >= p.maxLife;

        if (outOfBounds || lifetimeExpired) {
          particles[i] = createParticle(curConfig, curPalette, logicalW, logicalH, false);
          continue;
        }

        drawParticle(ctx, p, curVariant, curConfig);
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    window.addEventListener('resize', handleResize);

    // ── Cleanup ──────────────────────────────────────────────

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', handleResize);
      mql.removeEventListener('change', onMotionChange);
      particlesRef.current = [];
    };
  }, [handleResize]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[1]"
      aria-hidden="true"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
