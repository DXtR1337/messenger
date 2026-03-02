'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { EASE } from '@/lib/animation/easings';
import { SCROLL_CONFIG } from '@/lib/animation/scroll-config';

// Register ScrollTrigger ONCE at module level
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// Inline debounce — no lodash dependency
function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let id: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => { clearTimeout(id); id = setTimeout(() => fn(...args), ms); }) as T;
}

/**
 * GSAP + ScrollTrigger scroll choreography for the metrics dashboard.
 *
 * Split-behavior pattern throughout:
 *   - Opacity fires ONCE (toggleActions play-none-none-none)
 *   - Position / scale is SCRUB-linked (bidirectional with scroll)
 *
 * All animations use gsap.fromTo() — never gsap.from() — to avoid FOUC.
 * Only transform + opacity are animated (GPU-composited properties).
 */
export function useScrollChoreography(
  containerRef: React.RefObject<HTMLElement | null>,
): void {
  useGSAP(
    () => {
      const container = containerRef.current;
      if (!container) return;

      // ---------------------------------------------------------------
      // Mobile scaling factors
      // ---------------------------------------------------------------
      const isMobile = window.innerWidth < 768;
      const scrubMultiplier = isMobile ? 0.6 : 1;
      const translateScale = isMobile ? 0.5 : 1;

      // ---------------------------------------------------------------
      // GPU promotion on all animated targets
      // ---------------------------------------------------------------
      gsap.set(
        container.querySelectorAll('[data-scroll-group], [data-scroll-card], [data-scroll-column]'),
        { willChange: 'transform, opacity', force3D: true },
      );

      // ---------------------------------------------------------------
      // STAT CARDS — split-behavior (left/right columns)
      // ---------------------------------------------------------------
      const allStatCards = container.querySelectorAll('[data-scroll-column]');
      const statCardsContainer = allStatCards[0] ?? container;

      // Layer A: Opacity (once, fire-and-forget)
      if (allStatCards.length > 0) {
        gsap.fromTo(
          allStatCards,
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.6,
            stagger: 0.04,
            ease: EASE.enter,
            scrollTrigger: {
              trigger: allStatCards[0],
              start: SCROLL_CONFIG.statCards.start,
              toggleActions: 'play none none none',
            },
          },
        );
      }

      // Layer B: Position — left column cards enter from left
      const leftCards = container.querySelectorAll('[data-scroll-column="left"]');
      if (leftCards.length > 0) {
        gsap.fromTo(
          leftCards,
          { x: -SCROLL_CONFIG.statCards.translateX * translateScale },
          {
            x: 0,
            ease: EASE.scrub,
            stagger: SCROLL_CONFIG.statCards.staggerWithinColumn,
            scrollTrigger: {
              trigger: statCardsContainer,
              start: SCROLL_CONFIG.statCards.start,
              end: SCROLL_CONFIG.statCards.end,
              scrub: SCROLL_CONFIG.statCards.scrub * scrubMultiplier,
            },
          },
        );
      }

      // Layer B: Position — right column cards enter from right
      const rightCards = container.querySelectorAll('[data-scroll-column="right"]');
      if (rightCards.length > 0) {
        gsap.fromTo(
          rightCards,
          { x: SCROLL_CONFIG.statCards.translateX * translateScale },
          {
            x: 0,
            ease: EASE.scrub,
            stagger: SCROLL_CONFIG.statCards.staggerWithinColumn,
            scrollTrigger: {
              trigger: statCardsContainer,
              start: SCROLL_CONFIG.statCards.start,
              end: SCROLL_CONFIG.statCards.end,
              scrub: SCROLL_CONFIG.statCards.scrub * scrubMultiplier,
            },
          },
        );
      }

      // ---------------------------------------------------------------
      // GENERAL CARDS — split-behavior (Y translate)
      // ---------------------------------------------------------------
      const cards = container.querySelectorAll('[data-scroll-card]');
      cards.forEach((card) => {
        // Opacity: once
        gsap.fromTo(
          card,
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.6,
            ease: EASE.enter,
            scrollTrigger: {
              trigger: card,
              start: SCROLL_CONFIG.cards.start,
              toggleActions: 'play none none none',
            },
          },
        );

        // Position: scrub Y
        gsap.fromTo(
          card,
          { y: SCROLL_CONFIG.cards.translateY * translateScale },
          {
            y: 0,
            ease: EASE.scrub,
            scrollTrigger: {
              trigger: card,
              start: SCROLL_CONFIG.cards.start,
              end: SCROLL_CONFIG.cards.end,
              scrub: SCROLL_CONFIG.cards.scrub * scrubMultiplier,
            },
          },
        );
      });

      // ---------------------------------------------------------------
      // ACHIEVEMENT CARDS — split-behavior (scale + stagger grid)
      // ---------------------------------------------------------------
      const achievementGrids = container.querySelectorAll('[data-scroll-group="achievements"]');
      achievementGrids.forEach((grid) => {
        const items = (grid as HTMLElement).children;
        if (items.length === 0) return;

        // Scale + Y: scrub-linked
        gsap.fromTo(
          items,
          { scale: SCROLL_CONFIG.achievements.scaleFrom, y: 20 },
          {
            scale: 1,
            y: 0,
            ease: EASE.scrub,
            stagger: {
              each: SCROLL_CONFIG.achievements.staggerPerRow,
              grid: 'auto',
              from: 'start',
              axis: 'y',
            },
            scrollTrigger: {
              trigger: grid,
              start: SCROLL_CONFIG.achievements.start,
              end: SCROLL_CONFIG.achievements.end,
              scrub: SCROLL_CONFIG.achievements.scrub * scrubMultiplier,
            },
          },
        );

        // Opacity: once
        gsap.fromTo(
          items,
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.5,
            stagger: {
              each: 0.06,
              grid: 'auto',
              from: 'start',
              axis: 'y',
            },
            ease: EASE.enter,
            scrollTrigger: {
              trigger: grid,
              start: SCROLL_CONFIG.achievements.start,
              toggleActions: 'play none none none',
            },
          },
        );
      });

      // ---------------------------------------------------------------
      // SECTION HEADERS — scrub-linked position + header line
      // ---------------------------------------------------------------
      const headers = container.querySelectorAll('[data-scroll-group="section-header"]');
      headers.forEach((header) => {
        // Position: scrub-linked
        gsap.fromTo(
          header,
          { x: SCROLL_CONFIG.sectionHeaders.translateX * translateScale },
          {
            x: 0,
            ease: EASE.scrub,
            scrollTrigger: {
              trigger: header,
              start: SCROLL_CONFIG.sectionHeaders.start,
              end: SCROLL_CONFIG.sectionHeaders.end,
              scrub: SCROLL_CONFIG.sectionHeaders.scrub * scrubMultiplier,
            },
          },
        );

        // Header line: scaleX 0 -> 1, scrub-linked
        const line = (header as HTMLElement).querySelector('[data-scroll-element="header-line"]');
        if (line) {
          gsap.fromTo(
            line,
            { scaleX: 0, transformOrigin: 'left center' },
            {
              scaleX: 1,
              ease: EASE.scrub,
              scrollTrigger: {
                trigger: header,
                start: SCROLL_CONFIG.sectionHeaders.start,
                end: SCROLL_CONFIG.sectionHeaders.end,
                scrub: SCROLL_CONFIG.sectionHeaders.scrub * scrubMultiplier,
              },
            },
          );
        }

        // Opacity: once
        gsap.fromTo(
          header,
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.4,
            ease: EASE.enter,
            scrollTrigger: {
              trigger: header,
              start: SCROLL_CONFIG.sectionHeaders.start,
              toggleActions: 'play none none none',
            },
          },
        );
      });

      // ---------------------------------------------------------------
      // Progressive enhancement marker
      // ---------------------------------------------------------------
      container.classList.add('gsap-ready');

      // ---------------------------------------------------------------
      // Initial state: refresh + fast-forward past-start triggers
      // ---------------------------------------------------------------
      ScrollTrigger.refresh();

      ScrollTrigger.getAll().forEach((trigger) => {
        if (trigger.progress > 0) {
          trigger.animation?.progress(trigger.progress);
        }
      });

      const triggerCount = ScrollTrigger.getAll().length;
      console.log(`[ScrollChoreography] initialized, ${triggerCount} triggers created`);

      // ---------------------------------------------------------------
      // ResizeObserver for layout-shift refresh
      // ---------------------------------------------------------------
      const resizeObserver = new ResizeObserver(
        debounce(() => ScrollTrigger.refresh(), 200),
      );
      resizeObserver.observe(container);

      // ---------------------------------------------------------------
      // MutationObserver — catch late-mounting Suspense cards
      // ---------------------------------------------------------------
      const handleMutations = debounce(() => {
        ScrollTrigger.refresh();
      }, 200);
      const mutationObserver = new MutationObserver(handleMutations);
      mutationObserver.observe(container, { childList: true, subtree: true });

      // ---------------------------------------------------------------
      // Cleanup (runs when useGSAP context reverts)
      // ---------------------------------------------------------------
      return () => {
        resizeObserver.disconnect();
        mutationObserver.disconnect();
        container.classList.remove('gsap-ready');
      };
    },
    { scope: containerRef },
  );
}
