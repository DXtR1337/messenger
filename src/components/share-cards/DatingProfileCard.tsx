'use client';

import { useRef, useMemo, type RefObject } from 'react';
import { useCardDownload } from './useCardDownload';
import type { PersonDatingProfile } from '@/lib/analysis/dating-profile-prompts';

interface DatingProfileCardProps {
  profile: PersonDatingProfile;
  cardRef?: RefObject<HTMLDivElement | null>;
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export default function DatingProfileCard({ profile, cardRef: externalRef }: DatingProfileCardProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const cardRef = externalRef ?? internalRef;
  const { download, isDownloading } = useCardDownload(cardRef, 'podtekst-dating-profile', {
    backgroundColor: '#f5f0dc',
  });

  const featuredPrompt = profile.prompts[0];
  const keyStats = profile.stats.slice(0, 3);

  const adNumber = useMemo(() => {
    const rng = seededRandom(profile.name.length * 73 + 1337);
    return Math.floor(rng() * 9000 + 1000);
  }, [profile.name]);

  const pageNumber = useMemo(() => {
    const rng = seededRandom(profile.name.length * 41 + 777);
    return Math.floor(rng() * 30 + 3);
  }, [profile.name]);

  const tornEdgePath = useMemo(() => {
    const rng = seededRandom(4242);
    const points: string[] = ['M0,0'];
    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * 360;
      const y = rng() * 16 + 1;
      points.push(`L${x},${y}`);
    }
    points.push('L360,24 L0,24 Z');
    return points.join(' ');
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={cardRef}
        style={{
          width: 360,
          minHeight: 640,
          background: '#f5f0dc',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'var(--font-space-grotesk)',
          color: '#1a1a1a',
        }}
      >
        {/* Subtle paper grain texture */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Yellowing effect — vignette */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, transparent 50%, rgba(180,160,100,0.12) 100%)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Newspaper header */}
        <div
          style={{
            padding: '14px 16px 0',
            position: 'relative',
            zIndex: 2,
            textAlign: 'center',
          }}
        >
          {/* Top rule line */}
          <div style={{ height: 3, background: '#1a1a1a', margin: '0 0 4px' }} />
          <div style={{ height: 1, background: '#1a1a1a', margin: '0 0 6px' }} />

          <div
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 900,
              fontSize: '1.3rem',
              color: '#1a1a1a',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              lineHeight: 1.1,
            }}
          >
            GAZETA PODTEKSTOWA
          </div>

          {/* Bottom rule lines */}
          <div style={{ height: 1, background: '#1a1a1a', margin: '6px 0 2px' }} />
          <div style={{ height: 2, background: '#1a1a1a', margin: '0 0 4px' }} />

          {/* Issue info */}
          <div
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.63rem',
              color: '#666',
              letterSpacing: '0.06em',
              marginBottom: 6,
            }}
          >
            Nr 2026/02 &bull; Dzial: Ogloszenia Matrymonialne &bull; str. {pageNumber}
          </div>
        </div>

        {/* Ad box */}
        <div
          style={{
            flex: 1,
            margin: '0 14px',
            border: '1.5px solid #1a1a1a',
            padding: '10px 12px',
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Ad number in corner */}
          <div
            style={{
              position: 'absolute',
              top: 3,
              right: 6,
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.75rem',
              color: '#999',
            }}
          >
            Ogl. nr {adNumber}
          </div>

          {/* Name + age_vibe */}
          <div style={{ marginBottom: 6 }}>
            <span
              style={{
                fontFamily: 'var(--font-syne)',
                fontWeight: 800,
                fontSize: '1.05rem',
                color: '#1a1a1a',
                lineHeight: 1.2,
              }}
            >
              {profile.name}
            </span>
            {profile.age_vibe && (
              <span
                style={{
                  fontFamily: 'var(--font-space-grotesk)',
                  fontSize: '0.63rem',
                  color: '#555',
                  marginLeft: 6,
                }}
              >
                {profile.age_vibe}
              </span>
            )}
          </div>

          {/* Bio — justified newspaper column */}
          <p
            style={{
              fontFamily: 'var(--font-space-grotesk)',
              fontSize: '0.72rem',
              lineHeight: 1.5,
              color: '#2a2a2a',
              margin: '0 0 8px',
              textAlign: 'justify',
              hyphens: 'auto',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical' as const,
            }}
          >
            {profile.bio}
          </p>

          {/* Section rule */}
          <div style={{ height: 1, background: '#1a1a1a', opacity: 0.15, margin: '0 0 8px' }} />

          {/* Stats line — bold newspaper style */}
          {keyStats.length > 0 && (
            <div
              style={{
                background: '#ece7d0',
                padding: '6px 8px',
                marginBottom: 8,
                borderLeft: '3px solid #1a1a1a',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-space-grotesk)',
                  fontSize: '0.68rem',
                  color: '#1a1a1a',
                  margin: 0,
                  lineHeight: 1.5,
                  fontWeight: 600,
                }}
              >
                {keyStats.map((stat, i) => (
                  <span key={i}>
                    {stat.label}: {stat.value}
                    {i < keyStats.length - 1 ? '. ' : '.'}
                  </span>
                ))}
              </p>
            </div>
          )}

          {/* Featured prompt */}
          {featuredPrompt && (
            <div style={{ marginBottom: 8 }}>
              <div
                style={{
                  fontFamily: 'var(--font-syne)',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  color: '#1a1a1a',
                  marginBottom: 2,
                }}
              >
                {featuredPrompt.prompt}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-space-grotesk)',
                  fontSize: '0.68rem',
                  color: '#333',
                  fontStyle: 'italic',
                  lineHeight: 1.4,
                  paddingLeft: 8,
                  borderLeft: '2px solid #ccc',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical' as const,
                }}
              >
                {featuredPrompt.answer}
              </div>
            </div>
          )}

          {/* Thin separator */}
          <div style={{ height: 1, background: '#1a1a1a', opacity: 0.18, margin: '2px 0 6px' }} />

          {/* Red flags section */}
          {profile.red_flags.length > 0 && (
            <div style={{ marginBottom: 12, overflow: 'hidden' }}>
              <div
                style={{
                  fontFamily: 'var(--font-syne)',
                  fontWeight: 800,
                  fontSize: '0.68rem',
                  color: '#8b2020',
                  letterSpacing: '0.04em',
                  marginBottom: 3,
                  textTransform: 'uppercase',
                }}
              >
                REDAKCJA OSTRZEGA:
              </div>
              {profile.red_flags.slice(0, 3).map((flag, i) => (
                <div
                  key={i}
                  style={{
                    fontFamily: 'var(--font-space-grotesk)',
                    fontSize: '0.65rem',
                    color: '#6b1a1a',
                    lineHeight: 1.4,
                    paddingLeft: 8,
                    marginBottom: 1,
                    position: 'relative',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ position: 'absolute', left: 0, top: 0 }}>&mdash;</span>
                  {flag}
                </div>
              ))}
            </div>
          )}

          {/* Section rule between flags */}
          {profile.red_flags.length > 0 && profile.green_flags.length > 0 && (
            <div style={{ height: 1, background: '#1a1a1a', opacity: 0.12, margin: '0 0 6px' }} />
          )}

          {/* Green flags section */}
          {profile.green_flags.length > 0 && (
            <div style={{ marginBottom: 4, overflow: 'hidden' }}>
              <div
                style={{
                  fontFamily: 'var(--font-syne)',
                  fontWeight: 800,
                  fontSize: '0.68rem',
                  color: '#1a5a2a',
                  letterSpacing: '0.04em',
                  marginBottom: 3,
                  textTransform: 'uppercase',
                }}
              >
                ATUTY:
              </div>
              {profile.green_flags.slice(0, 3).map((flag, i) => (
                <div
                  key={i}
                  style={{
                    fontFamily: 'var(--font-space-grotesk)',
                    fontSize: '0.65rem',
                    color: '#1a4a28',
                    lineHeight: 1.4,
                    paddingLeft: 8,
                    marginBottom: 1,
                    position: 'relative',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ position: 'absolute', left: 0, top: 0 }}>&mdash;</span>
                  {flag}
                </div>
              ))}
            </div>
          )}

          {/* Rating at bottom of ad box */}
          {profile.overall_rating && (
            <div
              style={{
                marginTop: 'auto',
                paddingTop: 4,
                borderTop: '1px solid #ccc',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.68rem',
                  color: '#1a1a1a',
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              >
                {profile.overall_rating}
              </div>
            </div>
          )}
        </div>

        {/* Adjacent fake ads — decorative, low opacity */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            margin: '6px 14px 0',
            position: 'relative',
            zIndex: 2,
            opacity: 0.35,
          }}
        >
          <div
            style={{
              flex: 1,
              border: '1px solid #1a1a1a',
              padding: '4px 6px',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-space-grotesk)',
                fontSize: '0.63rem',
                color: '#1a1a1a',
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              Szukam kogoś, kto odpowiada na wiadomości w mniej niż 24h. Mile widziane: stabilność emocjonalna. Tel. po 18.
            </p>
          </div>
          <div
            style={{
              flex: 1,
              border: '1px solid #1a1a1a',
              padding: '4px 6px',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-space-grotesk)',
                fontSize: '0.63rem',
                color: '#1a1a1a',
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              Samotny po 3 relacjach. Oferuję: trauma bonding, gaslighting lekki. Szukam: kogoś z cierpliwością anioła.
            </p>
          </div>
        </div>

        {/* Torn edge effect */}
        <div style={{ position: 'relative', zIndex: 3, height: 18 }}>
          <svg
            width="360"
            height="18"
            viewBox="0 0 360 24"
            preserveAspectRatio="none"
            style={{ display: 'block', position: 'absolute', bottom: 0, left: 0 }}
          >
            <path d={tornEdgePath} fill="#f5f0dc" />
            <path
              d={tornEdgePath}
              fill="none"
              stroke="rgba(0,0,0,0.08)"
              strokeWidth="0.5"
            />
          </svg>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '0 16px 10px',
            textAlign: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.63rem',
              color: '#888',
              marginTop: 2,
            }}
          >
            Odpowiedzi kierowac na: podtekst.app
          </div>
        </div>
      </div>

      <button
        onClick={download}
        disabled={isDownloading}
        style={{
          fontFamily: 'var(--font-space-grotesk)',
          fontSize: '0.78rem',
          fontWeight: 500,
          color: '#a1a1aa',
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 8,
          padding: '8px 16px',
          cursor: isDownloading ? 'wait' : 'pointer',
          opacity: isDownloading ? 0.5 : 1,
        }}
      >
        {isDownloading ? 'Pobieranie...' : 'Pobierz karte'}
      </button>
    </div>
  );
}
