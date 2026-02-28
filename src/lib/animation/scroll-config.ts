/**
 * ScrollTrigger timing, offset, and stagger configuration.
 * Single source of truth — every magic number lives here.
 */
export const SCROLL_CONFIG = {
  statCards: {
    /** How far offscreen cards start (px) */
    translateX: 60,
    /** Scrub value for position (bidirectional) */
    scrub: 1.5,
    start: 'top 85%',
    end: 'top 40%',
    /** Stagger between cards in the same column group */
    staggerWithinColumn: 0.06,
  },

  countUp: {
    /** Duration of the number roll animation (seconds) */
    duration: 2.2,
    /** Trigger point — fires once, not scrub-linked */
    triggerStart: 'top 75%',
    /** Delay after card entrance begins */
    delay: 0.3,
  },

  achievements: {
    scaleFrom: 0.82,
    scrub: 1.2,
    start: 'top 90%',
    end: 'top 50%',
    /** Stagger: row-by-row */
    staggerPerRow: 0.08,
  },

  sectionHeaders: {
    translateX: -50,
    scrub: 1,
    start: 'top 88%',
    end: 'top 65%',
  },

  /** General card containers (non-stat) */
  cards: {
    translateY: 40,
    scrub: 1.2,
    start: 'top 85%',
    end: 'top 40%',
  },

  parallax: {
    speedMin: 0.3,
    speedMax: 1.8,
    maxDisplacement: 250,
  },

  /** AI Deep Dive — alternating left/right card entries */
  aiCards: {
    translateX: 60,
    translateY: 30,
    scrub: 1.2,
    start: 'top 90%',
    end: 'top 42%',
  },

  aiHeaders: {
    translateX: -40,
    scrub: 1.0,
    start: 'top 92%',
    end: 'top 68%',
  },
} as const;
