'use client';

import { useEffect, useRef, useState } from 'react';

interface VideoBackgroundProps {
  /** WebM video source (primary) */
  src?: string;
  /** MP4 fallback source */
  fallbackSrc?: string;
  /** WebP poster image for initial load */
  poster?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Ambient video background for mode pages.
 * Renders a looping, muted <video> with auto-pause when tab is hidden
 * and IntersectionObserver-based lazy loading.
 * Falls back to poster image if video not provided or fails.
 */
export default function VideoBackground({ src, fallbackSrc, poster, className }: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);

  // Ensure playback starts + pause when tab hidden (saves battery)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Explicit play() — some desktop browsers ignore autoPlay even with muted
    video.play().catch(() => {});

    const handleVisibility = () => {
      if (document.hidden) {
        video.pause();
      } else {
        video.play().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // If no video source, render poster as gradient fallback
  if (!src || hasError) {
    return poster ? (
      <div
        className={`mode-video-bg ${className ?? ''}`}
        style={{
          backgroundImage: `url(${poster})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        aria-hidden="true"
      />
    ) : null;
  }

  return (
    <video
      ref={videoRef}
      className={`mode-video-bg ${className ?? ''}`}
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      poster={poster}
      onError={() => setHasError(true)}
      aria-hidden="true"
    >
      {src.endsWith('.webm') ? (
        <source src={src} type="video/webm" />
      ) : (
        <source src={src} type="video/mp4" />
      )}
      {fallbackSrc && <source src={fallbackSrc} type="video/mp4" />}
    </video>
  );
}
