'use client';

import { useRef, useState, useEffect } from 'react';
import type { RefObject, ReactNode } from 'react';

interface ShareCardShellProps {
  children: ReactNode;
  cardRef: RefObject<HTMLDivElement | null>;
  /** Optional gradient override — defaults to deep blue/purple */
  gradient?: string;
}

export default function ShareCardShell({
  children,
  cardRef,
  gradient = 'linear-gradient(160deg, #0a0a1a 0%, #0d0b1e 25%, #12082a 50%, #0a0e1f 75%, #080818 100%)',
}: ShareCardShellProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const updateScale = () => {
      const containerWidth = wrapper.clientWidth;
      setScale(Math.min(1, containerWidth / 380));
    };

    updateScale();

    const observer = new ResizeObserver(updateScale);
    observer.observe(wrapper);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={wrapperRef}
      style={{
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
        height: Math.ceil(640 * scale),
        overflow: 'hidden',
      }}
    >
      <div
        ref={cardRef}
        style={{
          width: 360,
          height: 640,
          background: gradient,
          borderRadius: 20,
          padding: 28,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
        }}
      >
        {/* Ambient glow blobs — rendered behind content */}
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -30,
            left: -30,
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)',
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />

        {/* Header — glassmorphism pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
            flexShrink: 0,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 800,
              fontSize: '1rem',
              background: 'linear-gradient(135deg, #818cf8, #c084fc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            PodTeksT
          </span>
          <span
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.58rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
              color: 'rgba(255,255,255,0.5)',
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(8px)',
              borderRadius: 9999,
              padding: '3px 12px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            2026
          </span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative', zIndex: 1 }}>
          {children}
        </div>

        {/* Footer — subtle watermark */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            paddingTop: 14,
            flexShrink: 0,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.58rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase' as const,
              color: 'rgba(255,255,255,0.25)',
            }}
          >
            podtekst.app
          </span>
          <span
            style={{
              fontFamily: 'var(--font-space-grotesk)',
              fontSize: '0.52rem',
              color: 'rgba(255,255,255,0.18)',
            }}
          >
            Zobacz swoje relacje przez dane
          </span>
        </div>
      </div>
    </div>
  );
}
