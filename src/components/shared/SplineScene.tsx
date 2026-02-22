'use client';

import { Component, Suspense, lazy, useRef, useState, useEffect, useCallback } from 'react';
import type { Application } from '@splinetool/runtime';
import type { ReactNode, ErrorInfo } from 'react';

class SplineErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Spline fetch failure — degrade gracefully
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

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

/**
 * Probe WebGL2 for features Spline requires.
 * Returns false if clearBufferfv is missing or float textures aren't supported
 * (common Firefox issue that causes runtime crashes).
 */
function checkWebGL2Support(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return false;

    // Spline runtime calls clearBufferfv — Firefox sometimes stubs it out
    if (typeof gl.clearBufferfv !== 'function') {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return false;
    }

    // Float textures needed for depth buffers
    const hasColorBufferFloat = !!gl.getExtension('EXT_color_buffer_float');
    const hasFloatBlend = !!gl.getExtension('EXT_float_blend');

    gl.getExtension('WEBGL_lose_context')?.loseContext();

    // EXT_color_buffer_float is the critical one
    return hasColorBufferFloat;
  } catch {
    return false;
  }
}

interface SplineSceneProps {
  scene: string;
  className?: string;
  onLoad?: (app: Application) => void;
}

export function SplineScene({ scene, className, onLoad }: SplineSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showSpline, setShowSpline] = useState(false);
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);

  // Check WebGL2 support once on mount
  useEffect(() => {
    setWebglSupported(checkWebGL2Support());
  }, []);

  // Defer Spline loading until browser is idle (only if WebGL2 is supported)
  useEffect(() => {
    if (webglSupported !== true) return;

    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(() => setShowSpline(true), { timeout: 2000 });
      return () => cancelIdleCallback(id);
    } else {
      const timer = setTimeout(() => setShowSpline(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [webglSupported]);

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

  // WebGL2 not supported — show static gradient fallback
  if (webglSupported === false) {
    return (
      <div
        className="h-full w-full"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.06) 0%, rgba(168,85,247,0.04) 40%, transparent 70%)',
        }}
      />
    );
  }

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
        <SplineErrorBoundary fallback={null}>
          <Suspense
            fallback={
              <div className="flex h-full w-full items-center justify-center">
                <span className="size-10 animate-spin rounded-full border-[3px] border-white/20 border-t-white" />
              </div>
            }
          >
            <Spline scene={scene} className={className} onLoad={handleLoad} />
          </Suspense>
        </SplineErrorBoundary>
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="size-10 animate-spin rounded-full border-[3px] border-white/20 border-t-white" />
        </div>
      )}
    </div>
  );
}
