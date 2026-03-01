'use client';

import { useRef } from 'react';
import ShareCardShell from '@/components/share-cards/ShareCardShell';

interface NekrologCardProps {
  participants: string[];
  duration: string;
  deathDate: string;
  causeOfDeath: string;
  epitaph: string;
}

export default function NekrologCard({
  participants,
  duration,
  deathDate,
  causeOfDeath,
  epitaph,
}: NekrologCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <ShareCardShell
      cardRef={cardRef}
      gradient="linear-gradient(180deg, #0a0000, #050000, #030202)"
    >
      {/* Vignette overlay for mourning atmosphere */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.5) 100%)',
          pointerEvents: 'none',
          borderRadius: 20,
        }}
      />

      {/* Ornamental cross — elaborate with flared ends */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20, position: 'relative', zIndex: 1 }}>
        <svg width="52" height="68" viewBox="0 0 52 68" fill="none">
          {/* Vertical bar with flared ends */}
          <path d="M22 4 L22 0 L30 0 L30 4 L28 6 L28 26 L30 26 L30 30 L28 28 L28 60 L30 64 L30 68 L22 68 L22 64 L24 60 L24 28 L22 30 L22 26 L24 26 L24 6 L22 4 Z" fill="#991b1b" />
          {/* Horizontal bar with flared ends */}
          <path d="M4 16 L0 16 L0 24 L4 24 L6 22 L22 22 L22 24 L22 16 L22 18 L6 18 L4 16 Z" fill="#991b1b" />
          <path d="M48 16 L52 16 L52 24 L48 24 L46 22 L30 22 L30 16 L46 18 L48 16 Z" fill="#991b1b" />
          {/* Inner glow cross */}
          <rect x="24" y="3" width="4" height="62" rx="0.5" fill="#dc2626" opacity={0.15} />
          <rect x="4" y="18" width="44" height="4" rx="0.5" fill="#dc2626" opacity={0.15} />
          {/* Decorative circles at endpoints */}
          <circle cx="26" cy="1" r="1.5" fill="#991b1b" opacity={0.5} />
          <circle cx="26" cy="67" r="1.5" fill="#991b1b" opacity={0.5} />
          <circle cx="1" cy="20" r="1.5" fill="#991b1b" opacity={0.5} />
          <circle cx="51" cy="20" r="1.5" fill="#991b1b" opacity={0.5} />
        </svg>
      </div>

      {/* NEKROLOG header */}
      <div
        style={{
          textAlign: 'center',
          fontFamily: 'serif',
          fontSize: '1.7rem',
          fontWeight: 700,
          letterSpacing: '0.3em',
          color: '#991b1b',
          marginBottom: 4,
          textTransform: 'uppercase' as const,
          textShadow: '0 0 20px rgba(153,27,27,0.3)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        NEKROLOG
      </div>

      {/* Ornamental divider with diamond */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 24, position: 'relative', zIndex: 1 }}>
        <div style={{ width: 50, height: 1, background: 'linear-gradient(90deg, transparent, #991b1b66)' }} />
        <div style={{ width: 6, height: 6, background: '#991b1b', transform: 'rotate(45deg)', opacity: 0.6 }} />
        <div style={{ width: 50, height: 1, background: 'linear-gradient(90deg, #991b1b66, transparent)' }} />
      </div>

      {/* "Tu spoczywa związek" */}
      <div
        style={{
          textAlign: 'center',
          fontFamily: 'serif',
          fontSize: '0.82rem',
          color: '#6b3a3a',
          letterSpacing: '0.08em',
          marginBottom: 10,
          position: 'relative',
          zIndex: 1,
        }}
      >
        Tu spoczywa związek
      </div>

      {/* Participant names — the main focal point */}
      <div
        style={{
          textAlign: 'center',
          fontFamily: 'serif',
          fontSize: participants.join(' & ').length > 30 ? '1rem' : '1.2rem',
          fontWeight: 700,
          color: '#d4a07a',
          letterSpacing: '0.04em',
          marginBottom: 24,
          lineHeight: 1.4,
          padding: '0 8px',
          textShadow: '0 1px 6px rgba(212,160,122,0.15)',
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as const,
        }}
      >
        {participants.join(' & ')}
      </div>

      {/* Duration & death date — paired info */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 24, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '0.58rem', color: '#4a3030', letterSpacing: '0.08em', marginBottom: 4, textTransform: 'uppercase' as const }}>
            Trwał
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#8b7355', fontWeight: 600 }}>
            {duration}
          </div>
        </div>
        <div style={{ width: 1, height: 32, background: '#991b1b33' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '0.58rem', color: '#4a3030', letterSpacing: '0.08em', marginBottom: 4, textTransform: 'uppercase' as const }}>
            Zmarł
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#8b7355', fontWeight: 600 }}>
            {deathDate}
          </div>
        </div>
      </div>

      {/* Cause of death — highlighted section */}
      <div
        style={{
          textAlign: 'center',
          fontFamily: 'monospace',
          fontSize: '0.72rem',
          color: '#dc2626',
          marginBottom: 28,
          letterSpacing: '0.02em',
          padding: '10px 16px',
          lineHeight: 1.5,
          background: 'rgba(153,27,27,0.06)',
          borderRadius: 6,
          border: '1px solid rgba(153,27,27,0.15)',
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical' as const,
        }}
      >
        {causeOfDeath}
      </div>

      {/* Thin ornamental line */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20, position: 'relative', zIndex: 1 }}>
        <div style={{ width: 80, height: 1, background: 'linear-gradient(90deg, transparent, #991b1b22)' }} />
        <div style={{ width: 80, height: 1, background: 'linear-gradient(90deg, #991b1b22, transparent)' }} />
      </div>

      {/* Epitaph — the emotional closer */}
      <div
        style={{
          textAlign: 'center',
          fontFamily: 'serif',
          fontSize: '0.82rem',
          fontStyle: 'italic',
          color: '#8b7355',
          lineHeight: 1.7,
          padding: '0 16px',
          flex: 1,
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical' as const,
        }}
      >
        &ldquo;{epitaph}&rdquo;
      </div>

      {/* Brand watermark */}
      <div style={{ marginTop: 'auto', paddingTop: 16, textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <span style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: '#4a4a4a' }}>
          PodTeksT
        </span>
      </div>
    </ShareCardShell>
  );
}
