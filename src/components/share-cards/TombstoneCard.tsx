'use client';

import { useRef } from 'react';
import ShareCardShell from '@/components/share-cards/ShareCardShell';

interface TombstoneCardProps {
  participants: string[];
  duration: string;
  deathDate: string;
  epitaph: string;
}

export default function TombstoneCard({
  participants,
  duration,
  deathDate,
  epitaph,
}: TombstoneCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const silverGradient = 'linear-gradient(135deg, #f8fafc 0%, #cbd5e1 40%, #94a3b8 60%, #475569 100%)';

  return (
    <ShareCardShell
      cardRef={cardRef}
      gradient="linear-gradient(160deg, #09090b, #0a0a0c, #050506)"
    >
      {/* Stone noise texture */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0.25,
          pointerEvents: 'none',
          zIndex: 0,
          mixBlendMode: 'overlay',
          borderRadius: 20,
        }}
      >
        <filter id="stoneNoise">
          <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="1 0 0 0 0, 0 1 0 0 0, 0 0 1 0 0, 0 0 0 0.3 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#stoneNoise)" />
      </svg>

      {/* Moonlight from top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          height: 200,
          background: 'radial-gradient(ellipse at top, rgba(148, 163, 184, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Purple mist at bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '120%',
          height: 250,
          background: 'radial-gradient(ellipse at bottom, rgba(76, 29, 149, 0.1) 0%, transparent 60%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Tombstone arch inset */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 100%)',
          borderRadius: '160px 160px 14px 14px',
          position: 'relative',
          zIndex: 1,
          padding: '44px 28px 32px 28px',
          boxShadow: 'inset 0 15px 30px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(0,0,0,0.9), 0 1px 1px rgba(255,255,255,0.08)',
        }}
      >
        {/* Cross */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <svg
            width="28"
            height="40"
            viewBox="0 0 28 40"
            fill="none"
            style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.8))' }}
          >
            <path d="M14 0V40M0 12H28" stroke="url(#silverGradTomb)" strokeWidth="1.5" strokeLinecap="round" />
            <defs>
              <linearGradient id="silverGradTomb" x1="0" y1="0" x2="28" y2="40" gradientUnits="userSpaceOnUse">
                <stop stopColor="#f8fafc" />
                <stop offset="0.5" stopColor="#94a3b8" />
                <stop offset="1" stopColor="#475569" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* R.I.P. — silver inkrustation */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '3.5rem',
              fontWeight: 700,
              letterSpacing: '0.2em',
              color: '#c0c8d4',
              filter: 'drop-shadow(0px -1px 1px rgba(0,0,0,0.9)) drop-shadow(0px 2px 2px rgba(0,0,0,0.8)) drop-shadow(0px 1px 0px rgba(255,255,255,0.15))',
            }}
          >
            R.I.P.
          </div>
        </div>

        {/* Ornamental separator with diamond */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 36 }}>
          <div style={{ height: 1, width: 40, background: 'linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.4))' }} />
          <div
            style={{
              width: 6,
              height: 6,
              transform: 'rotate(45deg)',
              background: '#94a3b8',
              boxShadow: '0 0 4px rgba(255,255,255,0.2), inset 0 1px 1px rgba(255,255,255,0.8)',
            }}
          />
          <div style={{ height: 1, width: 40, background: 'linear-gradient(270deg, transparent, rgba(148, 163, 184, 0.4))' }} />
        </div>

        {/* Names — silver */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: participants.join(' & ').length > 25 ? '1.15rem' : '1.35rem',
              fontWeight: 600,
              lineHeight: 1.3,
              color: '#c0c8d4',
              filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.9))',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
            }}
          >
            {participants.join(' & ')}
          </div>
        </div>

        {/* Info plaque — dates */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            alignItems: 'center',
            marginBottom: 'auto',
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '0.85rem',
            letterSpacing: '0.1em',
            background: 'rgba(0,0,0,0.4)',
            padding: '16px 24px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.03)',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), 0 1px 1px rgba(255,255,255,0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b' }}>
            <span style={{ textTransform: 'uppercase' as const, fontSize: '0.7rem' }}>Trwało:</span>
            <span style={{ fontWeight: 700, color: '#e2e8f0', textShadow: '0 1px 2px #000' }}>{duration}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b' }}>
            <span style={{ textTransform: 'uppercase' as const, fontSize: '0.7rem' }}>Zmarło:</span>
            <span style={{ fontWeight: 700, color: '#e2e8f0', textShadow: '0 1px 2px #000' }}>{deathDate}</span>
          </div>
        </div>

        {/* Epitaph — deeply engraved */}
        <div
          style={{
            textAlign: 'center',
            fontFamily: 'Georgia, serif',
            fontSize: '0.92rem',
            fontStyle: 'italic',
            color: '#94a3b8',
            lineHeight: 1.7,
            padding: '0 8px',
            marginTop: 36,
            textShadow: '0 -1px 1px rgba(0,0,0,0.8), 0 1px 1px rgba(255,255,255,0.1)',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical' as const,
          }}
        >
          &ldquo;{epitaph}&rdquo;
        </div>
      </div>

      {/* Brand — embossed in stone */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          position: 'relative',
          zIndex: 2,
        }}
      >
        <span
          style={{
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '0.6rem',
            letterSpacing: '0.4em',
            color: '#334155',
            textTransform: 'uppercase' as const,
            textShadow: '0 1px 1px rgba(255,255,255,0.1)',
          }}
        >
          PodTeksT
        </span>
      </div>
    </ShareCardShell>
  );
}
