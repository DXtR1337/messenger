'use client';

import { useEffect, useCallback, useRef, useId } from 'react';
import {
  motion,
  useAnimationControls,
  useMotionValue,
  useMotionValueEvent,
  animate,
} from 'framer-motion';

interface CourtGavelAnimationProps {
  active: boolean;
  /** When false, shows static pose + idle sway only (no striking). Default true. */
  strike?: boolean;
  onComplete?: () => void;
  className?: string;
}

// Gavel rotation angles (degrees) — the assembly pivots at the shoulder
const REST = -20;
const RAISED = -58;
const RAISED_BIG = -65;
const STRIKE = 38;
const STRIKE_BIG = 42;
const BOUNCE = 22;

// Pivot points (SVG viewBox coordinates)
const GAVEL_PIVOT = { x: 197, y: 208 };
const BLOCK_PIVOT = { x: 270, y: 260 };
const IMPACT_PIVOT = { x: 270, y: 248 };
const LEFT_ARM_PIVOT = { x: 135, y: 215 };

// SVG transform string: rotate around a specific point
function rotateAround(angle: number, cx: number, cy: number) {
  return `translate(${cx},${cy}) rotate(${angle}) translate(${-cx},${-cy})`;
}

// SVG transform string: scale around a specific point
function scaleAround(sx: number, sy: number, cx: number, cy: number) {
  return `translate(${cx},${cy}) scale(${sx},${sy}) translate(${-cx},${-cy})`;
}

// ── Detailed Low-Poly Gavel Head ────────────────────────────

function GavelHead() {
  return (
    <g>
      {/* Main body block */}
      <polygon points="-26,-16 26,-16 26,16 -26,16" fill="#4961b8" />
      {/* Top bevel (lighter blue — 3D depth) */}
      <polygon points="-26,-16 26,-16 22,-22 -22,-22" fill="#6b85d6" />
      {/* Bottom shadow */}
      <polygon points="-26,16 26,16 22,20 -22,20" fill="#2d3d80" />

      {/* Left striking surface (stepped, gold accents) */}
      <polygon points="-26,-16 -26,16 -32,12 -32,-12" fill="#5570c4" />
      <polygon points="-32,-12 -32,12 -36,9 -36,-9" fill="#d4a853" />
      <polygon points="-36,-9 -36,9 -40,6 -40,-6" fill="#4f68ba" />
      <polygon points="-40,-6 -40,6 -43,4 -43,-4" fill="#c49a3a" opacity="0.85" />
      <polygon points="-43,-4 -43,4 -45,2 -45,-2" fill="#5974c8" />

      {/* Right striking surface (mirror, darker shading) */}
      <polygon points="26,-16 26,16 32,12 32,-12" fill="#3b4fa6" />
      <polygon points="32,-12 32,12 36,9 36,-9" fill="#d4a853" />
      <polygon points="36,-9 36,9 40,6 40,-6" fill="#3a4c9e" />
      <polygon points="40,-6 40,6 43,4 43,-4" fill="#c49a3a" opacity="0.85" />
      <polygon points="43,-4 43,4 45,2 45,-2" fill="#4258ae" />

      {/* Top edge highlights */}
      <polygon points="-32,-12 -26,-16 -22,-22 -28,-18" fill="#7b93de" opacity="0.5" />
      <polygon points="26,-16 32,-12 28,-18 22,-22" fill="#7b93de" opacity="0.4" />

      {/* Gold center band */}
      <rect x="-5" y="-22" width="10" height="42" rx="1" fill="#d4a853" opacity="0.2" />

      {/* Front face facet lines (low-poly effect) */}
      <line x1="-12" y1="-16" x2="-18" y2="16" stroke="#3d53a8" strokeWidth="0.8" opacity="0.4" />
      <line x1="12" y1="-16" x2="18" y2="16" stroke="#3d53a8" strokeWidth="0.8" opacity="0.4" />
    </g>
  );
}

function GavelHandle({ gradientId }: { gradientId: string }) {
  return (
    <g>
      <polygon points="-5,8 5,8 6,90 -6,90" fill={`url(#${gradientId})`} />
      <polygon points="-5,8 -2,8 -1,90 -6,90" fill="#e0bd6a" opacity="0.3" />
      <polygon points="2,8 5,8 6,90 1,90" fill="#8b6914" opacity="0.3" />
      <rect x="-7" y="58" width="14" height="5" rx="1.5" fill="#b8941f" opacity="0.65" />
      <rect x="-7" y="68" width="14" height="5" rx="1.5" fill="#9a7a16" opacity="0.55" />
      <rect x="-7" y="78" width="14" height="4" rx="1.5" fill="#b8941f" opacity="0.45" />
      <polygon points="-6,90 6,90 5,94 -5,94" fill="#7a5c10" />
    </g>
  );
}

function SoundBlock() {
  return (
    <g>
      <polygon points="243,250 297,250 292,246 248,246" fill="#c49a3a" />
      <polygon points="243,250 297,250 302,272 238,272" fill="#8b6914" />
      <polygon points="238,272 243,250 248,246 243,268" fill="#5a420e" opacity="0.7" />
      <polygon points="297,250 302,272 297,268 292,246" fill="#6b5310" opacity="0.5" />
      <line x1="248" y1="252" x2="292" y2="252" stroke="#d4a853" strokeWidth="0.6" opacity="0.4" />
      <line x1="238" y1="272" x2="302" y2="272" stroke="#3a2d08" strokeWidth="1.2" opacity="0.3" />
      <ellipse cx="270" cy="248" rx="10" ry="2" fill="#d4a853" opacity="0.15" />
      <ellipse cx="270" cy="276" rx="38" ry="3" fill="#000" opacity="0.15" />
    </g>
  );
}

function PTLogoBody({ gradientId, maskId }: { gradientId: string; maskId: string }) {
  return (
    <g transform="translate(120, 180) scale(0.125)">
      <g mask={`url(#${maskId})`}>
        <path
          d="M 0,0 L 240,0 Q 310,0 310,70 L 310,130 Q 310,200 240,200 L 85,200 L 85,370 L 0,370 Z"
          fill={`url(#${gradientId})`}
        />
      </g>
      <path
        d="M 330,0 L 580,0 L 580,85 L 497,85 L 497,370 L 413,370 L 413,85 L 330,85 Z"
        fill={`url(#${gradientId})`}
      />
    </g>
  );
}

function LeftArm() {
  return (
    <g>
      <path d="M 135,215 Q 115,220 108,235 Q 102,250 106,262"
        stroke="#fafafa" strokeWidth="10" strokeLinecap="round" fill="none" />
      <g transform="translate(106, 268)">
        <rect x="-9" y="-5" width="18" height="6" rx="3" fill="white" stroke="#e0e0e0" strokeWidth="0.8" />
        <ellipse cx="0" cy="7" rx="12" ry="10" fill="white" stroke="#e0e0e0" strokeWidth="1" />
        <ellipse cx="-10" cy="3" rx="5" ry="4" fill="white" stroke="#e0e0e0" strokeWidth="0.8"
          transform="rotate(-25,-10,3)" />
        <line x1="-3" y1="0" x2="-3" y2="10" stroke="#d0d0d0" strokeWidth="0.7" />
        <line x1="3" y1="0" x2="3" y2="9" stroke="#d0d0d0" strokeWidth="0.7" />
      </g>
    </g>
  );
}

function RightArmWithGavel({ handleGradId }: { handleGradId: string }) {
  return (
    <g>
      <path d="M 0,0 Q 20,-5 40,-3 Q 55,0 65,3"
        stroke="#fafafa" strokeWidth="10" strokeLinecap="round" fill="none" />
      <path d="M 65,3 Q 72,4 78,5"
        stroke="#fafafa" strokeWidth="9" strokeLinecap="round" fill="none" />
      <g transform="translate(84,6)">
        <rect x="-9" y="-12" width="18" height="6" rx="3" fill="white" stroke="#e0e0e0" strokeWidth="0.8" />
        <ellipse cx="0" cy="0" rx="11" ry="9" fill="white" stroke="#e0e0e0" strokeWidth="1" />
        <path d="M -7,-6 Q -2,-10 4,-8" stroke="#d0d0d0" strokeWidth="0.8" fill="none" />
        <path d="M -6,-3 Q -1,-7 5,-5" stroke="#d0d0d0" strokeWidth="0.8" fill="none" />
        <path d="M -5,0 Q 0,-4 5,-2" stroke="#d0d0d0" strokeWidth="0.8" fill="none" />
      </g>
      <g transform="translate(84,0) rotate(90)">
        <g transform="translate(0,-10)">
          <GavelHandle gradientId={handleGradId} />
        </g>
        <g transform="translate(0,-12) scale(1.35)">
          <GavelHead />
        </g>
      </g>
    </g>
  );
}

function ImpactBurst() {
  const angles = [0, 40, 80, 120, 160, 200, 240, 280, 320];
  return (
    <g>
      {angles.map(a => (
        <line key={a}
          x1={0} y1={0}
          x2={Math.cos((a * Math.PI) / 180) * 22}
          y2={Math.sin((a * Math.PI) / 180) * 22}
          stroke="#d4a853" strokeWidth="2.5" strokeLinecap="round"
        />
      ))}
      <circle cx={0} cy={0} r="8" fill="#d4a853" opacity="0.35" />
      <circle cx={0} cy={0} r="4" fill="#f5d78e" opacity="0.5" />
    </g>
  );
}

function DebrisParticles() {
  return (
    <g>
      <rect x="-8" y="-4" width="5" height="5" fill="#d4a853" rx="0.5" transform="rotate(15)" />
      <rect x="6" y="-6" width="4" height="4" fill="#b8941f" rx="0.5" transform="rotate(-20)" />
      <rect x="-2" y="-8" width="3" height="6" fill="#d4a853" rx="0.5" transform="rotate(35)" />
      <rect x="10" y="2" width="4" height="3" fill="#c49a3a" rx="0.5" transform="rotate(-10)" />
    </g>
  );
}

// ── Main Component ─────────────────────────────────────────
// Uses useMotionValue + direct SVG transform attribute manipulation
// to bypass framer-motion's SVG rendering which forces fill-box 50% 50%.

export default function CourtGavelAnimation({
  active,
  strike = true,
  onComplete,
  className = '',
}: CourtGavelAnimationProps) {
  const uid = useId().replace(/:/g, '');

  // Refs for direct SVG transform manipulation
  const gavelRef = useRef<SVGGElement>(null);
  const blockRef = useRef<SVGGElement>(null);
  const impactRef = useRef<SVGGElement>(null);
  const leftArmRef = useRef<SVGGElement>(null);

  // Motion values for smooth interpolation
  const gavelRotation = useMotionValue(REST);
  const blockScaleX = useMotionValue(1);
  const blockScaleY = useMotionValue(1);
  const impactScale = useMotionValue(0);
  const impactOpacity = useMotionValue(0);
  const leftArmRotation = useMotionValue(0);

  // Character entrance still uses motion.g (no pivot issues with y/opacity)
  const charControls = useAnimationControls();
  // Debris still uses motion.g (no pivot issues with y/opacity)
  const debrisControls = useAnimationControls();

  const gradId = `cga-g${uid}`;
  const hGradId = `cga-h${uid}`;
  const maskId = `cga-m${uid}`;

  const wait = useCallback(
    (ms: number) => new Promise<void>(r => setTimeout(r, ms)),
    [],
  );

  // Apply SVG transforms on every motion value change
  useMotionValueEvent(gavelRotation, 'change', (v) => {
    gavelRef.current?.setAttribute('transform',
      rotateAround(v, GAVEL_PIVOT.x, GAVEL_PIVOT.y));
  });

  useMotionValueEvent(blockScaleX, 'change', () => {
    blockRef.current?.setAttribute('transform',
      scaleAround(blockScaleX.get(), blockScaleY.get(), BLOCK_PIVOT.x, BLOCK_PIVOT.y));
  });
  useMotionValueEvent(blockScaleY, 'change', () => {
    blockRef.current?.setAttribute('transform',
      scaleAround(blockScaleX.get(), blockScaleY.get(), BLOCK_PIVOT.x, BLOCK_PIVOT.y));
  });

  useMotionValueEvent(impactScale, 'change', () => {
    if (!impactRef.current) return;
    const s = impactScale.get();
    const o = impactOpacity.get();
    impactRef.current.setAttribute('transform',
      `translate(${IMPACT_PIVOT.x},${IMPACT_PIVOT.y}) scale(${s})`);
    impactRef.current.setAttribute('opacity', String(o));
  });
  useMotionValueEvent(impactOpacity, 'change', () => {
    if (!impactRef.current) return;
    const s = impactScale.get();
    const o = impactOpacity.get();
    impactRef.current.setAttribute('transform',
      `translate(${IMPACT_PIVOT.x},${IMPACT_PIVOT.y}) scale(${s})`);
    impactRef.current.setAttribute('opacity', String(o));
  });

  useMotionValueEvent(leftArmRotation, 'change', (v) => {
    leftArmRef.current?.setAttribute('transform',
      rotateAround(v, LEFT_ARM_PIVOT.x, LEFT_ARM_PIVOT.y));
  });

  // Set initial transform on mount
  useEffect(() => {
    gavelRef.current?.setAttribute('transform',
      rotateAround(REST, GAVEL_PIVOT.x, GAVEL_PIVOT.y));
    impactRef.current?.setAttribute('opacity', '0');
  }, []);

  const triggerImpact = useCallback(
    (strike: number) => {
      const big = strike === 3;
      const s = big ? 1.4 : 1;

      // Impact burst
      animate(impactOpacity, [0, 0.85, 0], { duration: 0.3, ease: 'easeOut' });
      animate(impactScale, [0.3, 1.15 * s, 0], { duration: 0.3, ease: 'easeOut' });

      // Block squash
      animate(blockScaleY, [1, 0.82, 1.08, 1], { duration: 0.25, ease: 'easeOut' });
      animate(blockScaleX, [1, 1.12, 0.96, 1], { duration: 0.25, ease: 'easeOut' });

      // Debris
      debrisControls.start({
        opacity: [0, 1, 0],
        y: [0, -16 * s, -32 * s],
        transition: { duration: 0.45, ease: 'easeOut' },
      });

      // Left arm sympathetic bounce
      animate(leftArmRotation, [0, -4, 0], { duration: 0.25, ease: 'easeOut' });

      // Screen shake on 3rd strike
      if (big) {
        const courtBg = document.querySelector('.court-bg');
        if (courtBg) {
          courtBg.classList.add('court-shake');
          setTimeout(() => courtBg.classList.remove('court-shake'), 500);
        }
      }
    },
    [impactOpacity, impactScale, blockScaleX, blockScaleY, debrisControls, leftArmRotation],
  );

  // Idle sway loop (shared between static + post-strike)
  const startIdleSway = useCallback(() => {
    const loop = async () => {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        await animate(gavelRotation, REST + 3, { duration: 0.75, ease: 'easeInOut' });
        await animate(gavelRotation, REST, { duration: 0.75, ease: 'easeInOut' });
        await animate(gavelRotation, REST - 3, { duration: 0.75, ease: 'easeInOut' });
        await animate(gavelRotation, REST, { duration: 0.75, ease: 'easeInOut' });
      }
    };
    loop();
  }, [gavelRotation]);

  useEffect(() => {
    if (!active) return;

    // Static mode: just show immediately + idle sway
    if (!strike) {
      gavelRotation.set(REST);
      charControls.set({ opacity: 1, y: 0 });
      startIdleSway();
      return;
    }

    // Strike mode: entrance + 3x strikes + idle sway
    const run = async () => {
      gavelRotation.set(REST);

      // Entrance: character fades in + slides up
      await charControls.start({
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: 'easeOut' },
      });

      // 3 strikes
      for (let i = 1; i <= 3; i++) {
        const big = i === 3;
        const raise = big ? RAISED_BIG : RAISED;
        const strikeAngle = big ? STRIKE_BIG : STRIKE;
        const raiseDur = i === 1 ? 0.35 : 0.28;

        await animate(gavelRotation, raise, {
          duration: raiseDur, ease: 'easeInOut',
        });

        await animate(gavelRotation, strikeAngle, {
          duration: 0.12, ease: [0.22, 0.61, 0.36, 1],
        });
        triggerImpact(i);

        await animate(gavelRotation, BOUNCE, {
          duration: 0.08, ease: 'easeOut',
        });

        await animate(gavelRotation, REST, {
          duration: 0.15, ease: 'easeOut',
        });

        if (i < 3) await wait(350);
      }

      onComplete?.();
      startIdleSway();
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div className={`court-gavel-animation ${className}`}>
      <svg
        viewBox="0 0 400 300"
        fill="none"
        className="h-auto w-full max-w-[300px] sm:max-w-sm drop-shadow-[0_0_20px_rgba(212,168,83,0.3)]"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
          <linearGradient id={hGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4a853" />
            <stop offset="50%" stopColor="#c49a3a" />
            <stop offset="100%" stopColor="#8b6914" />
          </linearGradient>
          <mask id={maskId}>
            <rect width="580" height="370" fill="white" />
            <path
              d="M 100,40 Q 100,30 112,30 L 230,30 Q 242,30 242,42 L 242,125 Q 242,137 230,137 L 165,137 L 145,165 L 140,137 L 112,137 Q 100,137 100,125 Z"
              fill="black"
            />
          </mask>
        </defs>

        {/* ── Sound block (squashes on impact via ref) ── */}
        <g ref={blockRef}>
          <SoundBlock />
        </g>

        {/* ── Impact burst (scales from impact point via ref) ── */}
        <g ref={impactRef} opacity="0">
          <ImpactBurst />
        </g>

        {/* ── Debris particles (y + opacity, no pivot needed) ── */}
        <motion.g
          animate={debrisControls}
          initial={{ opacity: 0 }}
        >
          <g transform="translate(270, 246)">
            <DebrisParticles />
          </g>
        </motion.g>

        {/* ── Character group (fades in + slides up) ── */}
        <motion.g
          animate={charControls}
          initial={{ opacity: 0, y: 25 }}
        >
          {/* PT Logo body */}
          <PTLogoBody gradientId={gradId} maskId={maskId} />

          {/* Left arm (sympathetic bounce via ref) */}
          <g ref={leftArmRef}>
            <LeftArm />
          </g>

          {/* ── Right arm + gavel assembly (pivots at shoulder via ref) ── */}
          <g ref={gavelRef}>
            <g transform={`translate(${GAVEL_PIVOT.x}, ${GAVEL_PIVOT.y})`}>
              <RightArmWithGavel handleGradId={hGradId} />
            </g>
          </g>
        </motion.g>
      </svg>
    </div>
  );
}
