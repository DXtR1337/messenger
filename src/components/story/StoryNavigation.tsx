'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface StoryNavigationProps {
  totalScenes: number;
  children: React.ReactNode;
}

export default function StoryNavigation({
  totalScenes,
  children,
}: StoryNavigationProps) {
  const [activeScene, setActiveScene] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const scenesRef = useRef<Map<number, HTMLElement>>(new Map());
  const navTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track scene visibility via IntersectionObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Small delay to ensure all scenes are mounted and have data-scene-index
    const setupTimer = setTimeout(() => {
      const scenes = container.querySelectorAll<HTMLElement>('[data-scene-index]');
      scenesRef.current.clear();
      scenes.forEach((el) => {
        const index = parseInt(el.dataset.sceneIndex ?? '0', 10);
        scenesRef.current.set(index, el);
      });

      // Disconnect previous observer if any
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      const visibleScenes = new Map<number, number>();

      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const el = entry.target as HTMLElement;
            const index = parseInt(el.dataset.sceneIndex ?? '0', 10);

            if (entry.isIntersecting) {
              visibleScenes.set(index, entry.intersectionRatio);
            } else {
              visibleScenes.delete(index);
            }
          });

          // The active scene is the one with the highest visibility
          // If multiple are visible, pick the one most visible
          if (visibleScenes.size > 0 && !isNavigating) {
            let bestIndex = 0;
            let bestRatio = 0;
            visibleScenes.forEach((ratio, index) => {
              if (ratio > bestRatio) {
                bestRatio = ratio;
                bestIndex = index;
              }
            });
            setActiveScene(bestIndex);
          }
        },
        {
          threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0],
        },
      );

      scenes.forEach((el) => {
        observerRef.current!.observe(el);
      });
    }, 200);

    return () => {
      clearTimeout(setupTimer);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [totalScenes, isNavigating]);

  const scrollToScene = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, totalScenes - 1));
      const el = scenesRef.current.get(clamped);
      if (!el) return;

      setIsNavigating(true);
      setActiveScene(clamped);
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Re-enable observer tracking after scroll settles
      if (navTimeoutRef.current) {
        clearTimeout(navTimeoutRef.current);
      }
      navTimeoutRef.current = setTimeout(() => {
        setIsNavigating(false);
      }, 800);
    },
    [totalScenes],
  );

  const goUp = useCallback(() => {
    scrollToScene(activeScene - 1);
  }, [activeScene, scrollToScene]);

  const goDown = useCallback(() => {
    scrollToScene(activeScene + 1);
  }, [activeScene, scrollToScene]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept if user is typing in an input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        goUp();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        goDown();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goUp, goDown]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (navTimeoutRef.current) {
        clearTimeout(navTimeoutRef.current);
      }
    };
  }, []);

  const progress = totalScenes > 1 ? activeScene / (totalScenes - 1) : 0;

  const canGoUp = activeScene > 0;
  const canGoDown = activeScene < totalScenes - 1;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Progress bar — fixed at very top */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          zIndex: 40,
          background: 'rgba(255, 255, 255, 0.04)',
          pointerEvents: 'none',
        }}
      >
        <motion.div
          style={{
            height: '100%',
            background: 'var(--story-blue)',
            borderRadius: '0 2px 2px 0',
            boxShadow: '0 0 8px rgba(109, 159, 255, 0.4)',
          }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      {/* Scene counter — fixed top right */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeScene}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 40,
            fontFamily: 'var(--font-space-grotesk)',
            fontSize: '0.68rem',
            letterSpacing: '0.1em',
            color: 'var(--story-text-2)',
            background: 'rgba(255, 255, 255, 0.04)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid var(--story-border)',
            borderRadius: 20,
            padding: '6px 14px',
            userSelect: 'none',
          }}
        >
          <span style={{ color: 'var(--story-blue)' }}>{activeScene + 1}</span>
          <span style={{ opacity: 0.4, margin: '0 4px' }}>/</span>
          <span>{totalScenes}</span>
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons — fixed right side, vertically centered */}
      <div
        style={{
          position: 'fixed',
          right: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {/* Up button */}
        <motion.button
          onClick={goUp}
          disabled={!canGoUp}
          aria-label="Poprzednia scena"
          initial={false}
          animate={{ opacity: canGoUp ? 1 : 0.2 }}
          whileHover={canGoUp ? { scale: 1.1, background: 'rgba(255, 255, 255, 0.1)' } : {}}
          whileTap={canGoUp ? { scale: 0.95 } : {}}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            border: '1px solid var(--story-border)',
            background: 'rgba(255, 255, 255, 0.04)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: 'var(--story-text-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: canGoUp ? 'pointer' : 'default',
            transition: 'background 0.2s, border-color 0.2s',
            outline: 'none',
          }}
        >
          <ChevronUp size={18} />
        </motion.button>

        {/* Down button */}
        <motion.button
          onClick={goDown}
          disabled={!canGoDown}
          aria-label="Nastepna scena"
          initial={false}
          animate={{ opacity: canGoDown ? 1 : 0.2 }}
          whileHover={canGoDown ? { scale: 1.1, background: 'rgba(255, 255, 255, 0.1)' } : {}}
          whileTap={canGoDown ? { scale: 0.95 } : {}}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            border: '1px solid var(--story-border)',
            background: 'rgba(255, 255, 255, 0.04)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: 'var(--story-text-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: canGoDown ? 'pointer' : 'default',
            transition: 'background 0.2s, border-color 0.2s',
            outline: 'none',
          }}
        >
          <ChevronDown size={18} />
        </motion.button>
      </div>

      {/* The actual story content */}
      {children}
    </div>
  );
}
