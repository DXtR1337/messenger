'use client';

import { type ReactNode, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ModeId } from './ModePageShell';

export type PortalStatus = 'ready' | 'locked' | 'completed' | 'running';

interface PortalCardProps {
  mode: ModeId;
  analysisId: string;
  title: string;
  description: string;
  status: PortalStatus;
  lockReason?: string;
  illustration?: string;
  accent?: string;
  completionBadge?: ReactNode;
  preview?: ReactNode;
  videoSrc?: string;
}

/** Map mode id -> CSS class for the card art background scene */
const CARD_ART_CLASS: Partial<Record<ModeId, string>> = {
  roast: 'card-art-roast',
  court: 'card-art-court',
  standup: 'card-art-standup',
  subtext: 'card-art-subtext',
  cps: 'card-art-cps',
  dating: 'card-art-dating',
  simulator: 'card-art-simulator',
  delusion: 'card-art-delusion',
  moral: 'card-art-moral',
  emotions: 'card-art-emotions',
  capitalization: 'card-art-capitalization',
  ai: 'card-art-ai',
  metrics: 'card-art-metrics',
  share: 'card-art-share',
  eks: 'card-art-eks',
};

export default function PortalCard({
  mode,
  analysisId,
  title,
  description,
  status,
  lockReason,
  illustration,
  accent,
  completionBadge,
  preview,
  videoSrc,
}: PortalCardProps) {
  const isLocked = status === 'locked';
  const href = `/analysis/${analysisId}/${mode === 'hub' ? '' : mode}`;
  const accentColor = accent || '#3b82f6';

  const cardRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });

  const infoRef = useRef<HTMLDivElement>(null);

  // RAF-throttled mouse tracking for 60fps parallax + tilt
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isLocked || window.innerWidth < 768) return;
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    mouseRef.current.x = e.clientX - rect.left;
    mouseRef.current.y = e.clientY - rect.top;

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const { x, y } = mouseRef.current;
        const c = cardRef.current;
        const art = artRef.current;
        const info = infoRef.current;
        if (!c) return;

        const r = c.getBoundingClientRect();
        const cx = r.width / 2;
        const cy = r.height / 2;
        const nx = (x - cx) / cx; // -1 to 1
        const ny = (y - cy) / cy; // -1 to 1

        c.style.setProperty('--mouse-x', `${x}px`);
        c.style.setProperty('--mouse-y', `${y}px`);

        // Per-card tilt — max 3° rotation
        c.style.transform = `perspective(800px) rotateY(${nx * 3}deg) rotateX(${-ny * 3}deg)`;

        // Art parallax at 0.5× intensity
        if (art) {
          const ax = nx * -5;
          const ay = ny * -5;
          art.style.transform = `translate(${ax}px, ${ay}px) scale(1.05)`;
        }

        // Info zone parallax at 0.2× intensity
        if (info) {
          const ix = nx * -2;
          const iy = ny * -2;
          info.style.transform = `translate(${ix}px, ${iy}px)`;
        }
      });
    }
  }, [isLocked]);

  // Seek past potential black intro frame once metadata loads
  const handleVideoLoaded = useCallback(() => {
    const video = videoRef.current;
    if (video && video.currentTime === 0) {
      video.currentTime = 0.5;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (isLocked || !videoRef.current) return;
    const video = videoRef.current;

    video.play().catch(() => {
      // Silently catch autoplay policy errors — fallback is the static illustration + CSS scene
    });
  }, [isLocked]);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    const art = artRef.current;
    const info = infoRef.current;

    // Reset tilt
    if (card) {
      card.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg)';
    }

    if (art) {
      art.style.transform = 'translate(0px, 0px) scale(1)';
    }

    if (info) {
      info.style.transform = 'translate(0px, 0px)';
    }

    // Pause video — keep at current frame (no reset to black)
    const video = videoRef.current;
    if (video) {
      video.pause();
    }

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Pause video when card scrolls out of viewport
  useEffect(() => {
    const card = cardRef.current;
    if (!card || !videoSrc || isLocked) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && videoRef.current) {
          videoRef.current.pause();
        }
      },
      { threshold: 0 },
    );

    observer.observe(card);
    return () => observer.disconnect();
  }, [videoSrc, isLocked]);

  const artClass = CARD_ART_CLASS[mode] || '';

  const statusLabel = isLocked ? 'zablokowane' : status === 'completed' ? 'gotowe' : status === 'running' ? 'analizuje' : 'gotowe do uruchomienia';

  const card = (
    <div
      ref={cardRef}
      data-mode={mode}
      role="article"
      aria-label={`${title} — ${statusLabel}${lockReason ? `, wymaga: ${lockReason}` : ''}`}
      className={cn(
        'portal-card group relative flex min-h-[380px] flex-col overflow-hidden rounded-2xl',
        isLocked && 'portal-card-locked',
        status === 'running' && 'pulse-border border-2',
      )}
      style={{
        '--mode-accent': accentColor,
        '--mode-glow': `${accentColor}33`,
        '--card-accent': `${accentColor}33`,
      } as React.CSSProperties}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Card art zone — 1:1 aspect ratio */}
      <div
        ref={artRef}
        className={cn(
          'card-art relative overflow-hidden bg-[#040404]',
          artClass,
          isLocked && 'grayscale blur-[2px] opacity-50',
        )}
      >
        {/* PNG illustration — silhouette art behind video layer */}
        {illustration && !isLocked && (
          <Image
            src={illustration}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="absolute inset-0 object-contain opacity-40 mix-blend-luminosity transition-all duration-700 group-hover:opacity-55 group-hover:mix-blend-normal"
            loading="lazy"
            draggable={false}
            style={{ filter: 'blur(1px) saturate(0.6)' }}
          />
        )}

        {/* Video — static thumbnail at rest, plays on hover */}
        {videoSrc && !isLocked && (
          <video
            ref={videoRef}
            className="card-video"
            loop
            muted
            playsInline
            preload="metadata"
            onLoadedData={handleVideoLoaded}
          >
            <source src={videoSrc} type="video/mp4" />
          </video>
        )}

        {/* Gradient overlay: art → info zone */}
        <div className="card-art-overlay" />

        {/* Cinematic vignette */}
        <div className="card-art-vignette" />

        {/* Lock shield */}
        {isLocked && (
          <div className="absolute inset-0 z-[6] flex items-center justify-center">
            <Lock className="size-10 text-muted-foreground/50" />
          </div>
        )}

        {/* Running indicator */}
        {status === 'running' && (
          <div className="absolute top-4 right-4 z-[6]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest backdrop-blur-sm" style={{ color: accentColor }}>
              <span className="size-1.5 animate-pulse rounded-full bg-current" />
              Analizuje
            </span>
          </div>
        )}
      </div>

      {/* Info zone — parallax at 0.2× */}
      <div ref={infoRef} className="relative z-10 flex flex-1 flex-col gap-1.5 px-5 pt-4 pb-5" style={{ transition: 'transform 0.15s ease-out' }}>
        <div className="flex items-center justify-between gap-3">
          <h3
            className="font-[var(--font-syne)] text-[22px] font-bold tracking-[-0.02em] truncate"
            style={{
              background: 'linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0.7) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {title}
          </h3>
          {status === 'completed' && (
            <span className="badge-gotowe shrink-0">
              <span className="gotowe-glow-dot" />
              GOTOWE
            </span>
          )}
        </div>

        <p className="text-[13px] leading-snug text-[#666]">
          {description}
        </p>

        {/* Lock reason */}
        {isLocked && lockReason && (
          <p className="mt-auto font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">
            Wymaga: {lockReason}
          </p>
        )}

        {/* Completion preview */}
        {status === 'completed' && preview && (
          <div className="mt-auto">{preview}</div>
        )}

        {/* CTA on hover */}
        {!isLocked && status !== 'completed' && (
          <div className="mt-auto font-mono text-xs font-medium uppercase tracking-widest opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ color: accentColor }}>
            {status === 'running' ? 'Analizuje...' : 'Wejdz'}
            <span className="ml-1 inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
          </div>
        )}

        {completionBadge && (
          <div className="mt-auto pt-2">{completionBadge}</div>
        )}
      </div>
    </div>
  );

  if (isLocked) {
    return card;
  }

  return (
    <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-mode rounded-2xl">
      {card}
    </Link>
  );
}
