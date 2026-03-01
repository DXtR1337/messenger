'use client';

import { useRef } from 'react';
import ShareCardShell from '@/components/share-cards/ShareCardShell';

interface ParagonCzasuCardProps {
  participants: string[];
  totalMessages: number;
  duration: string;
  ghostings?: number;
  lateNightMessages?: number;
}

function generateBarcode(seed: number): number[] {
  const bars: number[] = [];
  let x = seed;
  for (let i = 0; i < 48; i++) {
    x = ((x * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    bars.push((x % 3) + 1);
  }
  return bars;
}

function estimateHoursTyping(messages: number): string {
  const avgSecondsPerMessage = 45;
  const totalHours = Math.round((messages * avgSecondsPerMessage) / 3600);
  if (totalHours < 1) return '<1h';
  if (totalHours >= 24) {
    const days = Math.round(totalHours / 24);
    return `${days} dni`;
  }
  return `${totalHours}h`;
}

export default function ParagonCzasuCard({
  participants,
  totalMessages,
  duration,
  ghostings,
  lateNightMessages,
}: ParagonCzasuCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const barcode = generateBarcode(totalMessages + participants.length);

  const ink = '#1a1a1a';
  const faded = '#666';
  const light = '#888';

  return (
    <ShareCardShell
      cardRef={cardRef}
      gradient="linear-gradient(180deg, #F9F6F0, #f5f0e8, #ede8df)"
    >
      {/* Paper noise texture — SVG filter */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0.2,
          pointerEvents: 'none',
          zIndex: 0,
          borderRadius: 20,
        }}
      >
        <filter id="noiseParagon">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseParagon)" />
      </svg>

      {/* Thermal gradient top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 40,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.03), transparent)',
          pointerEvents: 'none',
          borderRadius: '20px 20px 0 0',
        }}
      />

      {/* Thermal gradient bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 40,
          background: 'linear-gradient(0deg, rgba(0,0,0,0.03), transparent)',
          pointerEvents: 'none',
          borderRadius: '0 0 20px 20px',
        }}
      />

      {/* "BEZ ZWROT\u00d3W" stamp — rotated red */}
      <div
        style={{
          position: 'absolute',
          top: 170,
          right: -6,
          transform: 'rotate(-15deg)',
          border: '3px solid #ef4444',
          color: '#ef4444',
          padding: '3px 10px',
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          fontWeight: 800,
          letterSpacing: '0.1em',
          textTransform: 'uppercase' as const,
          opacity: 0.7,
          borderRadius: 3,
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        BEZ ZWROTÓW
      </div>

      {/* Brand header */}
      <div
        style={{
          textAlign: 'center',
          fontSize: '0.7rem',
          fontWeight: 600,
          letterSpacing: '0.3em',
          textTransform: 'uppercase' as const,
          color: faded,
          marginBottom: 12,
          position: 'relative',
          zIndex: 1,
        }}
      >
        PodTeksT
      </div>

      {/* Receipt title */}
      <div
        style={{
          textAlign: 'center',
          fontFamily: '"Courier New", Courier, monospace',
          fontSize: '1.6rem',
          fontWeight: 900,
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          color: ink,
          marginBottom: 14,
          position: 'relative',
          zIndex: 1,
        }}
      >
        PARAGON{'\n'}ZA ZMARNOWANY{'\n'}CZAS
      </div>

      {/* Meta: date + TX */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: '"Courier New", Courier, monospace',
          fontSize: '0.65rem',
          color: light,
          marginBottom: 16,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <span>TX: {(totalMessages % 99999).toString().padStart(5, '0')}</span>
        <span>x{participants.length}</span>
      </div>

      {/* Dashed separator */}
      <div style={{ borderTop: '2px dashed #d1caba', marginBottom: 14, position: 'relative', zIndex: 1 }} />

      {/* Participants / Klienci */}
      <div style={{ textAlign: 'center', marginBottom: 14, position: 'relative', zIndex: 1 }}>
        <div
          style={{
            fontSize: '0.6rem',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            color: light,
            marginBottom: 3,
          }}
        >
          Klienci
        </div>
        <div
          style={{
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: participants.join(' & ').length > 28 ? '0.82rem' : '0.95rem',
            fontWeight: 700,
            color: ink,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {participants.join(' & ')}
        </div>
      </div>

      {/* Line items with dotted leaders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14, position: 'relative', zIndex: 1 }}>
        {/* Wiadomo\u015bci */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontFamily: '"Courier New", Courier, monospace', fontSize: '0.78rem' }}>
          <span style={{ color: '#555' }}>Wiadomości wysłane</span>
          <span style={{ borderBottom: '1px dotted #ccc', flex: 1, margin: '0 6px 3px 6px' }} />
          <span style={{ fontWeight: 800, color: ink }}>{totalMessages.toLocaleString('pl-PL')}</span>
        </div>

        {/* Czas pisania */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontFamily: '"Courier New", Courier, monospace', fontSize: '0.78rem' }}>
          <span style={{ color: '#555' }}>Czas pisania (szac.)</span>
          <span style={{ borderBottom: '1px dotted #ccc', flex: 1, margin: '0 6px 3px 6px' }} />
          <span style={{ fontWeight: 800, color: ink }}>{estimateHoursTyping(totalMessages)}</span>
        </div>

        {/* Czas trwania */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontFamily: '"Courier New", Courier, monospace', fontSize: '0.78rem' }}>
          <span style={{ color: '#555' }}>Czas trwania</span>
          <span style={{ borderBottom: '1px dotted #ccc', flex: 1, margin: '0 6px 3px 6px' }} />
          <span style={{ fontWeight: 800, color: ink }}>{duration}</span>
        </div>

        {/* Nocne wiadomo\u015bci */}
        {lateNightMessages !== undefined && lateNightMessages > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontFamily: '"Courier New", Courier, monospace', fontSize: '0.78rem' }}>
            <span style={{ color: '#555' }}>Zarwane nocki (po 2:00)</span>
            <span style={{ borderBottom: '1px dotted #ccc', flex: 1, margin: '0 6px 3px 6px' }} />
            <span style={{ fontWeight: 800, color: ink }}>{lateNightMessages.toLocaleString('pl-PL')}</span>
          </div>
        )}

        {/* Ghostingi */}
        {ghostings !== undefined && ghostings > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontFamily: '"Courier New", Courier, monospace', fontSize: '0.78rem' }}>
            <span style={{ color: '#555' }}>Incydenty ghostingu</span>
            <span style={{ borderBottom: '1px dotted #ccc', flex: 1, margin: '0 6px 3px 6px' }} />
            <span style={{ fontWeight: 800, color: ink }}>{ghostings}</span>
          </div>
        )}
      </div>

      {/* TOTAL — inverted block */}
      <div
        style={{
          background: ink,
          color: '#F9F6F0',
          padding: '12px 16px',
          borderRadius: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          position: 'relative',
          zIndex: 1,
          boxShadow: '0 8px 20px -5px rgba(0,0,0,0.2)',
        }}
      >
        <span style={{ fontFamily: '"Courier New", Courier, monospace', fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.1em' }}>
          SUMA
        </span>
        <span style={{ fontFamily: '"Courier New", Courier, monospace', fontSize: '1.2rem', fontWeight: 900 }}>
          {duration} ŻYCIA
        </span>
      </div>

      {/* Footer text */}
      <div
        style={{
          textAlign: 'center',
          fontFamily: '"Courier New", Courier, monospace',
          fontSize: '0.62rem',
          color: light,
          fontStyle: 'italic',
          marginBottom: 16,
          position: 'relative',
          zIndex: 1,
          lineHeight: 1.5,
        }}
      >
        Dziękujemy za zakupy.
        <br />
        Czas nie podlega reklamacji.
      </div>

      {/* Barcode */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 2, position: 'relative', zIndex: 1, height: 40 }}>
        {barcode.map((w, i) => (
          <div
            key={i}
            style={{
              width: w * 1.4,
              height: i % 11 === 0 ? '100%' : '85%',
              background: ink,
              borderRadius: 1,
            }}
          />
        ))}
      </div>

      {/* Barcode number */}
      <div
        style={{
          textAlign: 'center',
          fontFamily: '"Courier New", Courier, monospace',
          fontSize: '0.6rem',
          letterSpacing: '0.3em',
          color: ink,
          fontWeight: 700,
          marginTop: 4,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {totalMessages}{participants.length}9901
      </div>
    </ShareCardShell>
  );
}
