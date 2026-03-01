'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

// Register ONCE at module level
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let id: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => { clearTimeout(id); id = setTimeout(() => fn(...args), ms); }) as T;
}

/**
 * AI Deep Dive page scroll setup.
 *
 * All decorative GSAP scroll choreography (card entries, header reveals,
 * proximity glow, vignette, FIN reveal, speed streaks) has been removed.
 * The hook now only ensures every card/header/line reaches its final
 * visible state immediately, observing late-mounted Suspense children.
 */
export function useAIScrollChoreography(
  containerRef: React.RefObject<HTMLElement | null>,
): void {
  useGSAP(
    () => {
      const container = containerRef.current;
      if (!container) return;

      const setFinalStates = () => {
        gsap.set(container.querySelectorAll('[data-ai-card]'), {
          opacity: 1, x: 0, y: 0, scale: 1, rotation: 0,
        });
        gsap.set(container.querySelectorAll('[data-ai-header]'), {
          opacity: 1, x: 0, y: 0,
        });
        gsap.set(container.querySelectorAll('[data-ai-line]'), {
          scaleX: 1, opacity: 1,
        });
        container.querySelectorAll<HTMLElement>('.analysis-card-accent').forEach((c) => {
          c.classList.add('ai-scanned');
        });
        container.querySelectorAll<HTMLElement>('.ai-boot-entry').forEach((e) => {
          e.style.opacity = '1';
          const status = e.querySelector<HTMLElement>('.ai-boot-status');
          if (status) status.style.opacity = '1';
        });
      };

      setFinalStates();
      const obs = new MutationObserver(debounce(() => setFinalStates(), 100));
      obs.observe(container, { childList: true, subtree: true });
      return () => obs.disconnect();
    },
    { scope: containerRef },
  );
}
