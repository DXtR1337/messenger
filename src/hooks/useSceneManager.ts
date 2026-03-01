import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { SCENE_THEMES, applySceneTheme } from '@/components/analysis/eks/scene-themes';
import type { SceneTheme } from '@/components/analysis/eks/scene-themes';

export interface SceneManagerState {
  /** Currently active scene index */
  activeIndex: number;
  /** Currently active scene id */
  activeId: string;
  /** Currently active theme */
  activeTheme: SceneTheme;
  /** Total registered scenes */
  totalScenes: number;
  /** Register a scene element for observation */
  registerScene: (id: string, el: HTMLElement | null) => void;
  /** Scroll to scene by index */
  scrollToScene: (index: number) => void;
  /** Container ref to attach to the root element */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * useSceneManager — IntersectionObserver-based scene tracker for EKS V4 scrollytelling.
 *
 * Tracks which scene is currently in view, applies per-scene CSS custom properties
 * via SCENE_THEMES, and provides scroll-to-scene navigation for the scene indicator dots.
 */
export function useSceneManager(): SceneManagerState {
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeId, setActiveId] = useState(SCENE_THEMES[0].id);
  const [sceneCount, setSceneCount] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneMapRef = useRef<Map<string, HTMLElement>>(new Map());
  const sceneOrderRef = useRef<string[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const visibilityMapRef = useRef<Map<string, number>>(new Map());
  const lastActiveIdRef = useRef<string>('');
  const rafRef = useRef<number>(0);

  // Create observer once
  useEffect(() => {
    const visibilityMap = visibilityMapRef.current;

    const processVisibility = () => {
      // Find the scene with highest visibility
      let maxRatio = 0;
      let maxId = sceneOrderRef.current[0] ?? '';
      for (const [id, ratio] of visibilityMap) {
        if (ratio > maxRatio) {
          maxRatio = ratio;
          maxId = id;
        }
      }

      // Only update state if active scene changed (avoids re-renders)
      if (maxId !== lastActiveIdRef.current) {
        lastActiveIdRef.current = maxId;
        const idx = sceneOrderRef.current.indexOf(maxId);
        if (idx >= 0) {
          setActiveIndex(idx);
          setActiveId(maxId);

          // Apply theme CSS custom properties to container
          const themeIdx = SCENE_THEMES.findIndex((t) => t.id === maxId);
          if (themeIdx >= 0 && containerRef.current) {
            applySceneTheme(containerRef.current, SCENE_THEMES[themeIdx]);
          }
        }
      }
    };

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.getAttribute('data-scene-id');
          if (id) {
            visibilityMap.set(id, entry.intersectionRatio);
          }
        }

        // Throttle state updates via rAF to avoid rapid re-renders during scroll
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(processVisibility);
      },
      {
        threshold: [0, 0.1, 0.2, 0.3, 0.5, 0.7, 1.0],
      },
    );

    return () => {
      observerRef.current?.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Register a scene element — immediately starts observing
  const registerScene = useCallback((id: string, el: HTMLElement | null) => {
    const map = sceneMapRef.current;
    const observer = observerRef.current;

    if (el) {
      // Add to map and order
      if (!map.has(id)) {
        sceneOrderRef.current.push(id);
      }
      map.set(id, el);

      // Immediately observe
      el.setAttribute('data-scene-id', id);
      observer?.observe(el);

      setSceneCount(map.size);
    } else {
      // Unregister
      const existing = map.get(id);
      if (existing) {
        observer?.unobserve(existing);
        visibilityMapRef.current.delete(id);
      }
      map.delete(id);
      sceneOrderRef.current = sceneOrderRef.current.filter((s) => s !== id);

      setSceneCount(map.size);
    }
  }, []);

  const scrollToScene = useCallback((index: number) => {
    const id = sceneOrderRef.current[index];
    if (!id) return;
    const el = sceneMapRef.current.get(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const activeTheme = useMemo(() => {
    const themeIdx = SCENE_THEMES.findIndex((t) => t.id === activeId);
    return SCENE_THEMES[themeIdx >= 0 ? themeIdx : 0];
  }, [activeId]);

  return {
    activeIndex,
    activeId,
    activeTheme,
    totalScenes: sceneCount || SCENE_THEMES.length,
    registerScene,
    scrollToScene,
    containerRef,
  };
}
