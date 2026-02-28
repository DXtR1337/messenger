/**
 * GSAP easing vocabulary for scroll choreography.
 * Every animation in the system pulls from this vocabulary — no inline easing strings.
 */
export const EASE = {
  /** Primary entrance — snappy deceleration, slight overshoot settle */
  enter: 'power3.out',

  /** Scrub-linked motion — scroll IS the easing, no bounce */
  scrub: 'none',

  /** CountUp numbers — fast start, gentle coast to final value */
  countUp: 'power2.out',

  /** Parallax — linear relationship to scroll */
  parallax: 'none',

  /** Scale entrance for achievement cards — fast scale-up with micro-settle */
  scaleReveal: 'back.out(1.4)',
} as const;

export type EaseName = keyof typeof EASE;
