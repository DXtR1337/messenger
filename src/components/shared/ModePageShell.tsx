'use client';

import { lazy, Suspense, type ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useScroll } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import VideoBackground from './VideoBackground';

const MetricsScene3D = lazy(() => import('@/components/analysis/MetricsScene3D'));

export type ModeId =
  | 'hub' | 'roast' | 'court' | 'standup' | 'subtext'
  | 'dating' | 'simulator' | 'delusion' | 'cps'
  | 'moral' | 'emotions' | 'capitalization' | 'metrics' | 'ai' | 'share'
  | 'argument';

interface ModePageShellProps {
  /** Mode identifier — sets data-mode attribute for theming */
  mode: ModeId;
  /** Page title displayed at top */
  title: string;
  /** Optional subtitle below title */
  subtitle?: ReactNode;
  /** Optional video background sources */
  video?: {
    src?: string;
    fallbackSrc?: string;
    poster?: string;
  };
  /** Page content */
  children: ReactNode;
  /** Hide back button (useful for hub page) */
  hideBack?: boolean;
  /** Optional badge rendered inline after the title */
  titleBadge?: ReactNode;
}

/**
 * Shared wrapper for all mode pages.
 * Provides: data-mode theming, video background, back navigation, title zone.
 */
export default function ModePageShell({
  mode,
  title,
  subtitle,
  video,
  children,
  hideBack = false,
  titleBadge,
}: ModePageShellProps) {
  const params = useParams();
  const id = params.id as string;
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const [isMobile, setIsMobile] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      if (!gl) { setWebglSupported(false); return; }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    } catch { setWebglSupported(false); }
  }, []);

  return (
    <div data-mode={mode} className="relative min-h-screen">
      {/* Ambient video background */}
      {video && (
        <VideoBackground
          src={video.src}
          fallbackSrc={video.fallbackSrc}
          poster={video.poster}
        />
      )}

      {/* CSS ambient pulse — fallback when no video files exist (skip on mobile) */}
      {!isMobile && (
        <div
          className="pointer-events-none fixed inset-0 z-[-2]"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, var(--mode-glow, rgba(59,130,246,0.04)) 0%, transparent 50%)',
            animation: 'ambient-pulse 8s ease-in-out infinite alternate',
            opacity: 0.5,
          }}
          aria-hidden="true"
        />
      )}

      {/* Gradient overlay for readability */}
      <div
        className="pointer-events-none fixed inset-0 z-[-1]"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, var(--mode-glow, rgba(59,130,246,0.03)) 0%, transparent 60%)',
          opacity: 0.5,
        }}
        aria-hidden="true"
      />

      {/* R3F 3D background — metrics mode only */}
      {mode === 'metrics' && webglSupported && !isMobile && (
        <div className="pointer-events-none fixed inset-0" style={{ zIndex: -1, opacity: 0.5 }} aria-hidden="true">
          <Suspense fallback={null}>
            <MetricsScene3D scrollProgress={scrollYProgress} isMobile={isMobile} />
          </Suspense>
        </div>
      )}

      {/* Content */}
      <div ref={containerRef}>
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Header zone */}
          <header className="mb-8 mode-enter">
            {!hideBack && (
              <Link
                href={`/analysis/${id}`}
                className="mb-4 inline-flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-muted-foreground backdrop-blur-sm transition-colors hover:border-border-hover hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" />
                Command Center
              </Link>
            )}

            <div className="flex flex-wrap items-start gap-x-3">
              <h1
                className="font-[var(--font-syne)] text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
                style={{ color: 'var(--mode-accent, #fafafa)' }}
              >
                {title}
              </h1>
              {titleBadge}
            </div>

            {subtitle && (
              <p className="mt-2 font-mono text-sm tracking-wide text-muted-foreground">
                {subtitle}
              </p>
            )}
          </header>

          {/* Page content with staggered entry */}
          <main className="mode-enter mode-enter-delay-3">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
