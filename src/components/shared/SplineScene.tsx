'use client';

import { Suspense, lazy, useRef, useState, useEffect, useCallback } from 'react';
import type { Application } from '@splinetool/runtime';

/**
 * Internal/undocumented Spline runtime APIs used to force transparent background
 * and disable zoom. These aren't part of the public Application type.
 */
interface SplineInternalApp {
  setZoom?: (value: number) => void;
  _renderer?: {
    setClearColor?: (color: number, alpha: number) => void;
    setClearAlpha?: (alpha: number) => void;
  };
  renderer?: {
    setClearColor?: (color: number, alpha: number) => void;
    setClearAlpha?: (alpha: number) => void;
  };
  _scene?: { background: unknown };
  scene?: { background: unknown };
}

const Spline = lazy(() => import('@splinetool/react-spline'));

interface SplineSceneProps {
  scene: string;
  className?: string;
  onLoad?: (app: Application) => void;
}

export function SplineScene({ scene, className, onLoad }: SplineSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showSpline, setShowSpline] = useState(false);

  // Defer Spline loading until browser is idle
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(() => setShowSpline(true), { timeout: 2000 });
      return () => cancelIdleCallback(id);
    } else {
      const timer = setTimeout(() => setShowSpline(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Block wheel events on the Spline canvas so page scrolls normally
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleWheel(e: WheelEvent) {
      // Prevent Spline from zooming — let the event bubble to scroll the page
      e.stopPropagation();
    }

    // Use capture phase to intercept before Spline's own handler
    container.addEventListener('wheel', handleWheel, { capture: true, passive: true });
    return () => container.removeEventListener('wheel', handleWheel, { capture: true });
  }, []);

  // MutationObserver to ensure canvas background stays transparent
  // Belt-and-suspenders: Spline may create the canvas after mount or recreate it
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new MutationObserver(() => {
      const canvas = container.querySelector('canvas');
      if (canvas && canvas.style.background !== 'transparent') {
        canvas.style.background = 'transparent';
      }
    });

    observer.observe(container, { childList: true, subtree: true });

    // Also check immediately in case canvas already exists
    const canvas = container.querySelector('canvas');
    if (canvas) canvas.style.background = 'transparent';

    return () => observer.disconnect();
  }, []);

  const handleLoad = useCallback(
    (app: Application) => {
      // Make Spline canvas transparent so particles show through
      const container = containerRef.current;
      if (container) {
        const canvas = container.querySelector('canvas');
        if (canvas) {
          canvas.style.background = 'transparent';
        }
      }

      // Disable Spline's built-in zoom and try to set renderer clear color to transparent
      try {
        const a = app as unknown as SplineInternalApp;
        if (typeof a.setZoom === 'function') a.setZoom(1);

        // Try various Spline/Three.js APIs for transparent background
        if (a._renderer) {
          if (typeof a._renderer.setClearColor === 'function') {
            a._renderer.setClearColor(0x000000, 0);
          }
          if (typeof a._renderer.setClearAlpha === 'function') {
            a._renderer.setClearAlpha(0);
          }
        }
        if (a.renderer) {
          if (typeof a.renderer.setClearColor === 'function') {
            a.renderer.setClearColor(0x000000, 0);
          }
          if (typeof a.renderer.setClearAlpha === 'function') {
            a.renderer.setClearAlpha(0);
          }
        }
        // Try to null Three.js scene background directly
        if (a._scene) a._scene.background = null;
        if (a.scene) a.scene.background = null;
      } catch {
        // ignore
      }
      onLoad?.(app);
    },
    [onLoad],
  );

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{
        background: 'transparent',
        WebkitMaskImage: 'radial-gradient(ellipse 55% 55% at 50% 50%, black 40%, transparent 80%)',
        maskImage: 'radial-gradient(ellipse 55% 55% at 50% 50%, black 40%, transparent 80%)',
      }}
    >
      {showSpline ? (
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center">
              <span className="size-10 animate-spin rounded-full border-[3px] border-white/20 border-t-white" />
            </div>
          }
        >
          <Spline scene={scene} className={className} onLoad={handleLoad} />
        </Suspense>
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="size-10 animate-spin rounded-full border-[3px] border-white/20 border-t-white" />
        </div>
      )}
    </div>
  );
}
