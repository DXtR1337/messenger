'use client';

import { useState, useEffect } from 'react';
import { useScrollVideo } from '@/hooks/useScrollVideo';

interface ScrollVideoProps {
  /** Video source URL (MP4 or WebM) */
  src: string;
  /** Poster image shown while video loads, on error, or for reduced motion */
  poster?: string;
  /** Ref to the scrollable container that drives video time */
  containerRef: React.RefObject<HTMLElement | null>;
}

/**
 * ScrollVideo -- fixed-position scroll-linked video background for EKS mode.
 *
 * Uses the useScrollVideo hook to map scroll progress to video playback position.
 * Falls back to poster image when:
 *   - On mobile (viewport < 768px)
 *   - Video fails to load or src is missing
 *   - IntersectionObserver or rAF unavailable
 *
 * Positioned identically to VideoBackground (mode-video-bg class) so it layers
 * correctly with the existing ModePageShell structure.
 */
export default function ScrollVideo({ src, poster, containerRef }: ScrollVideoProps) {
  const [hasError, setHasError] = useState(false);
  const [isMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  );
  // Only enable scroll-linked playback on desktop
  const shouldPlayVideo = !isMobile && !hasError && !!src;

  const { videoRef, isReady } = useScrollVideo({
    containerRef,
    enabled: shouldPlayVideo,
  });

  // Poster fallback: mobile, reduced motion, error, or no src
  if (!shouldPlayVideo) {
    if (!poster) return null;
    return (
      <div
        className="mode-video-bg"
        style={{
          backgroundImage: `url(${poster})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <>
      <video
        ref={videoRef}
        className="mode-video-bg"
        muted
        playsInline
        preload="metadata"
        poster={poster}
        onError={() => setHasError(true)}
        aria-hidden="true"
        // Prevent browser auto-play; scroll drives currentTime
        autoPlay={false}
        style={{
          // Fade in once metadata is ready to avoid flash of black
          opacity: isReady ? undefined : 0,
          transition: 'opacity 0.6s ease-in-out',
        }}
      >
        {src.endsWith('.webm') ? (
          <source src={src} type="video/webm" />
        ) : (
          <source src={src} type="video/mp4" />
        )}
      </video>

      {/* Readability overlay — darkens video for text contrast */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          zIndex: -1,
          background: 'linear-gradient(to bottom, rgba(5,5,5,0.4) 0%, rgba(5,5,5,0.6) 50%, rgba(5,5,5,0.4) 100%)',
        }}
        aria-hidden="true"
      />
    </>
  );
}
