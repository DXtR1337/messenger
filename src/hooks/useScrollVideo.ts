'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

interface UseScrollVideoOptions {
  /** Ref to the scrollable container whose scroll position drives video time */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Whether the scroll-linked video should be active (default: true) */
  enabled?: boolean;
}

interface UseScrollVideoReturn {
  /** Ref to attach to the <video> element */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Current scroll progress 0-1 */
  progress: number;
  /** Whether the video metadata is loaded and duration is known */
  isReady: boolean;
}

/**
 * useScrollVideo -- controls video playback position based on scroll progress
 * within a container element.
 *
 * The video is paused on mount and driven entirely by scroll position:
 *   video.currentTime = progress * video.duration
 *
 * Features:
 *   - requestAnimationFrame-throttled scroll handler (~60fps)
 *   - IntersectionObserver gating: only updates when container is visible
 *   - prefers-reduced-motion: freezes at first frame (poster equivalent)
 *   - Graceful degradation: missing video, unknown duration, mobile
 *   - Full cleanup on unmount
 */
export function useScrollVideo({
  containerRef,
  enabled = true,
}: UseScrollVideoOptions): UseScrollVideoReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Mutable refs for rAF loop state (avoids re-renders)
  const rafIdRef = useRef<number>(0);
  const isVisibleRef = useRef(false);
  const reducedMotionRef = useRef(false);

  // Calculate scroll progress within the container
  const computeProgress = useCallback((): number => {
    const container = containerRef.current;
    if (!container) return 0;

    const rect = container.getBoundingClientRect();
    const containerHeight = container.scrollHeight || container.offsetHeight;
    const viewportHeight = window.innerHeight;

    // scrolled = how far the top of the container has scrolled past the top of the viewport
    const scrolled = -rect.top;
    // total scrollable distance = container height minus one viewport (at which point bottom is at viewport bottom)
    const scrollable = containerHeight - viewportHeight;

    if (scrollable <= 0) return 0;
    return Math.min(1, Math.max(0, scrolled / scrollable));
  }, [containerRef]);

  // rAF-based scroll sync
  const updateVideoTime = useCallback(() => {
    if (!isVisibleRef.current || reducedMotionRef.current) return;

    const video = videoRef.current;
    if (!video || !video.duration || Number.isNaN(video.duration)) return;

    const p = computeProgress();
    setProgress(p);

    // Clamp target time to valid range
    const targetTime = Math.min(video.duration, Math.max(0, p * video.duration));

    // Only seek if the delta is significant enough to avoid unnecessary seeks
    if (Math.abs(video.currentTime - targetTime) > 0.03) {
      video.currentTime = targetTime;
    }
  }, [computeProgress]);

  // Scroll listener that uses rAF for throttling
  const handleScroll = useCallback(() => {
    if (rafIdRef.current) return; // already scheduled
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = 0;
      updateVideoTime();
    });
  }, [updateVideoTime]);

  useEffect(() => {
    if (!enabled) return;

    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    // ---- Reduced motion check ----
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = motionQuery.matches;

    const handleMotionChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
      if (e.matches && video.readyState >= 1) {
        // Freeze at first frame
        video.currentTime = 0;
        video.pause();
      }
    };
    motionQuery.addEventListener('change', handleMotionChange);

    // ---- Pause video immediately (scroll drives playback) ----
    video.pause();

    // ---- Handle metadata loaded ----
    const onLoadedMetadata = () => {
      setIsReady(true);
      video.pause();

      if (reducedMotionRef.current) {
        video.currentTime = 0;
      } else {
        // Sync to current scroll position immediately
        updateVideoTime();
      }
    };

    // If metadata already loaded (e.g. from cache)
    if (video.readyState >= 1 && video.duration && !Number.isNaN(video.duration)) {
      onLoadedMetadata();
    } else {
      video.addEventListener('loadedmetadata', onLoadedMetadata);
    }

    // ---- Handle video errors gracefully ----
    const onError = () => {
      setIsReady(false);
    };
    video.addEventListener('error', onError);

    // ---- IntersectionObserver: only process scroll when container is visible ----
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            isVisibleRef.current = entry.isIntersecting;
          }
        },
        { threshold: 0 },
      );
      observer.observe(container);
    } else {
      // Fallback: assume always visible
      isVisibleRef.current = true;
    }

    // ---- Scroll listener ----
    window.addEventListener('scroll', handleScroll, { passive: true });

    // ---- Pause when tab hidden (saves resources) ----
    const handleVisibility = () => {
      if (document.hidden) {
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = 0;
        }
      } else {
        // Re-sync on return
        handleScroll();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // ---- Cleanup ----
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibility);
      motionQuery.removeEventListener('change', handleMotionChange);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('error', onError);
      observer?.disconnect();
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = 0;
      }
    };
  }, [enabled, containerRef, handleScroll, updateVideoTime]);

  return { videoRef, progress, isReady };
}
