'use client';

import { useRef } from 'react';
import ShareCardShell from '@/components/share-cards/ShareCardShell';

interface UnsaidCardProps {
  perPerson: Record<string, string[]>;
  sharedUnsaid: string;
}

export default function UnsaidCard({
  perPerson,
  sharedUnsaid,
}: UnsaidCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const personEntries = Object.entries(perPerson).slice(0, 2);

  return (
    <ShareCardShell
      cardRef={cardRef}
      gradient="linear-gradient(170deg, #0a0a0f 0%, #08080e 50%, #04040a 100%)"
    >
      {/* Ghost ambient glows */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '30%',
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(148, 163, 184, 0.06) 0%, transparent 60%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '15%',
          right: '20%',
          width: 150,
          height: 150,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(100, 116, 139, 0.05) 0%, transparent 60%)',
          filter: 'blur(30px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* SVG noise texture */}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.08, pointerEvents: 'none', zIndex: 0, mixBlendMode: 'overlay' as const }}>
        <filter id="unsaidNoise">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves={3} stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#unsaidNoise)" />
      </svg>

      {/* Main content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: '36px 20px 28px 20px',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          {/* Ghost icon */}
          <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'center', opacity: 0.5 }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 2C9.373 2 4 7.373 4 14v12c0 1.1.4 2 1.2 2.4.8.4 1.6.2 2.2-.4l2-2.4 2 2.4c.8 1 2.4 1 3.2 0l1.4-1.7 1.4 1.7c.8 1 2.4 1 3.2 0l2-2.4 2 2.4c.6.6 1.4.8 2.2.4.8-.4 1.2-1.3 1.2-2.4V14c0-6.627-5.373-12-12-12z" stroke="#64748b" strokeWidth="1.5" fill="none" opacity={0.6} />
              <circle cx="12" cy="15" r="2" fill="#64748b" opacity={0.4} />
              <circle cx="20" cy="15" r="2" fill="#64748b" opacity={0.4} />
            </svg>
          </div>

          <div
            style={{
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: '0.55rem',
              color: '#475569',
              letterSpacing: '0.25em',
              marginBottom: 8,
              textTransform: 'uppercase' as const,
            }}
          >
            Karta Pamięci
          </div>
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '1.5rem',
              fontWeight: 400,
              letterSpacing: '0.12em',
              color: '#94a3b8',
              margin: 0,
              lineHeight: 1.2,
              textShadow: '0 2px 12px rgba(148, 163, 184, 0.15)',
            }}
          >
            NIEWYPOWIEDZIANE
          </div>
          <div
            style={{
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.2), transparent)',
              marginTop: 16,
              width: '80%',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          />
        </div>

        {/* Per-person unsaid things */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
          {personEntries.map(([name, things]) => (
            <div key={name}>
              <div
                style={{
                  fontFamily: '"Courier New", Courier, monospace',
                  fontSize: '0.6rem',
                  color: '#475569',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase' as const,
                  marginBottom: 10,
                }}
              >
                {name} nigdy nie powiedział/a:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {things.slice(0, 3).map((thing, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'relative',
                      padding: '10px 14px',
                      background: 'rgba(148, 163, 184, 0.03)',
                      borderLeft: '2px solid rgba(148, 163, 184, 0.15)',
                      borderRadius: '0 8px 8px 0',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'Georgia, serif',
                        fontSize: '0.78rem',
                        fontStyle: 'italic',
                        color: '#cbd5e1',
                        lineHeight: 1.5,
                        opacity: 0.7,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const,
                      }}
                    >
                      &ldquo;{thing}&rdquo;
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Shared unsaid — the emotional climax */}
        {sharedUnsaid && (
          <div style={{ marginTop: 24, textAlign: 'center', position: 'relative' }}>
            <div
              style={{
                height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.15), transparent)',
                marginBottom: 16,
              }}
            />
            <div
              style={{
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: '0.5rem',
                color: '#475569',
                letterSpacing: '0.2em',
                textTransform: 'uppercase' as const,
                marginBottom: 10,
              }}
            >
              Oboje unikali
            </div>
            <div
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '0.95rem',
                fontStyle: 'italic',
                color: '#e2e8f0',
                lineHeight: 1.6,
                padding: '0 12px',
                textShadow: '0 2px 8px rgba(226, 232, 240, 0.1)',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical' as const,
              }}
            >
              &ldquo;{sharedUnsaid}&rdquo;
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: 20,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div
            style={{
              width: '100%',
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.1), transparent)',
              marginBottom: 4,
            }}
          />
          <span
            style={{
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: '0.45rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase' as const,
              color: '#475569',
            }}
          >
            Archiwum Ciszy &bull; PodTeksT
          </span>
        </div>
      </div>
    </ShareCardShell>
  );
}
