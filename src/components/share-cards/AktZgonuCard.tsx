'use client';

import { useRef } from 'react';
import ShareCardShell from '@/components/share-cards/ShareCardShell';

interface AktZgonuCardProps {
  participants: string[];
  duration: string;
  deathDate: string;
  causeOfDeath: string;
  contributingFactors: string[];
  wasItPreventable: boolean;
}

function generateCaseId(participants: string[]): string {
  const initials = participants
    .map((name) => name.split(' ').map((w) => w.charAt(0).toUpperCase()).join(''))
    .join('/');
  const hash = participants.join('').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 9999;
  return `${initials}/${hash.toString().padStart(4, '0')}/ZG`;
}

function FormRow({
  label,
  value,
  isRed = false,
  valueStyle = {},
}: {
  label: string;
  value: string;
  isRed?: boolean;
  valueStyle?: React.CSSProperties;
}) {
  return (
    <div style={{ marginBottom: 14, position: 'relative', zIndex: 2 }}>
      <div
        style={{
          fontFamily: '"Courier New", Courier, monospace',
          fontSize: '0.55rem',
          color: '#8b7a63',
          marginBottom: 4,
          letterSpacing: '0.12em',
          textTransform: 'uppercase' as const,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <div
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '0.95rem',
            color: isRed ? '#d93838' : '#e6dfd5',
            fontWeight: 500,
            lineHeight: 1.3,
            ...valueStyle,
          }}
        >
          {value}
        </div>
        <div
          style={{
            flex: 1,
            borderBottom: '1px dotted rgba(139, 122, 99, 0.3)',
            position: 'relative',
            top: -4,
          }}
        />
      </div>
    </div>
  );
}

export default function AktZgonuCard({
  participants,
  duration,
  deathDate,
  causeOfDeath,
  contributingFactors,
  wasItPreventable,
}: AktZgonuCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const caseId = generateCaseId(participants);
  const factors = contributingFactors.slice(0, 3);

  return (
    <ShareCardShell
      cardRef={cardRef}
      gradient="linear-gradient(160deg, #161412 0%, #0d0c0a 50%, #050403 100%)"
    >
      {/* Vignette glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 30%, rgba(212, 185, 140, 0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Elegant double border */}
      <div
        style={{
          position: 'absolute',
          inset: 16,
          border: '1px solid rgba(212, 185, 140, 0.2)',
          borderRadius: 16,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 22,
          border: '1px solid rgba(212, 185, 140, 0.08)',
          borderRadius: 10,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Main content */}
      <div
        style={{
          padding: '40px 32px 32px 32px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: '0.5rem',
              color: '#8b7a63',
              letterSpacing: '0.2em',
              marginBottom: 12,
            }}
          >
            URZĄD STANU CYWILNEGO
          </div>
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '2rem',
              fontWeight: 400,
              letterSpacing: '0.2em',
              color: '#d4b98c',
              margin: 0,
              lineHeight: 1,
              textShadow: '0 2px 10px rgba(212, 185, 140, 0.15)',
            }}
          >
            AKT ZGONU
          </div>
          <div
            style={{
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(212, 185, 140, 0.4), transparent)',
              marginTop: 16,
              width: '80%',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          />
        </div>

        {/* Data fields */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
          <FormRow
            label="Sygnatura Akt"
            value={caseId}
            valueStyle={{ fontFamily: '"Courier New", Courier, monospace', letterSpacing: '0.05em', fontSize: '0.85rem' }}
          />

          <FormRow label="Strony Związku" value={participants.join(' & ')} />

          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ flex: 1 }}>
              <FormRow label="Czas trwania" value={duration} />
            </div>
            <div style={{ flex: 1 }}>
              <FormRow label="Data Zakończenia" value={deathDate} />
            </div>
          </div>

          <FormRow
            label="Bezpośrednia Przyczyna"
            value={causeOfDeath}
            isRed
            valueStyle={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
            }}
          />

          {/* Contributing factors */}
          {factors.length > 0 && (
            <div style={{ marginBottom: 16, position: 'relative', zIndex: 2, marginTop: 4 }}>
              <div
                style={{
                  fontFamily: '"Courier New", Courier, monospace',
                  fontSize: '0.55rem',
                  color: '#8b7a63',
                  marginBottom: 8,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase' as const,
                }}
              >
                Czynniki Sprzyjające
              </div>
              <div style={{ paddingLeft: 12, borderLeft: '1px solid rgba(212, 185, 140, 0.2)' }}>
                {factors.map((factor, i) => (
                  <div
                    key={i}
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '0.85rem',
                      color: '#c2b8a7',
                      marginBottom: 6,
                      lineHeight: 1.4,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                    }}
                  >
                    <span style={{ color: '#8b7a63', fontSize: '0.6rem', marginTop: 4 }}>&#9670;</span>
                    {factor}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer: Stamp + Preventable */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            position: 'relative',
            paddingTop: 20,
            borderTop: '1px solid rgba(212, 185, 140, 0.15)',
          }}
        >
          <div style={{ zIndex: 2 }}>
            <div
              style={{
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: '0.5rem',
                color: '#8b7a63',
                marginBottom: 4,
                letterSpacing: '0.15em',
                textTransform: 'uppercase' as const,
              }}
            >
              Czy można było zapobiec?
            </div>
            <div
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '1.5rem',
                fontWeight: 600,
                color: wasItPreventable ? '#d93838' : '#8b7a63',
                letterSpacing: '0.1em',
              }}
            >
              {wasItPreventable ? 'TAK' : 'NIE'}
            </div>
          </div>

          {/* Official stamp */}
          <div
            style={{
              position: 'absolute',
              right: -10,
              bottom: -10,
              transform: 'rotate(-12deg)',
              mixBlendMode: 'screen',
            }}
          >
            <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="44" stroke="#8a1c1c" strokeWidth="1.5" strokeDasharray="4 2 8 2" opacity={0.6} />
              <circle cx="50" cy="50" r="38" stroke="#8a1c1c" strokeWidth="1" opacity={0.4} />
              <circle cx="50" cy="50" r="26" stroke="#8a1c1c" strokeWidth="0.5" opacity={0.3} />
              <path id="curveTopAkt" d="M 20,50 A 30,30 0 0,1 80,50" fill="transparent" />
              <text fill="#8a1c1c" fontSize="7" fontFamily="serif" fontWeight="600" letterSpacing="0.1em" opacity={0.7}>
                <textPath href="#curveTopAkt" startOffset="50%" textAnchor="middle">
                  DEPARTAMENT ZAKOŃCZEŃ
                </textPath>
              </text>
              <path id="curveBottomAkt" d="M 80,50 A 30,30 0 0,1 20,50" fill="transparent" />
              <text fill="#8a1c1c" fontSize="6" fontFamily="monospace" letterSpacing="0.2em" opacity={0.5}>
                <textPath href="#curveBottomAkt" startOffset="50%" textAnchor="middle">
                  PODTEKST
                </textPath>
              </text>
              <text x="50" y="47" textAnchor="middle" fill="#8a1c1c" fontSize="14" fontFamily="serif" fontWeight="700" opacity={0.8}>
                USC
              </text>
              <line x1="32" y1="52" x2="68" y2="52" stroke="#8a1c1c" strokeWidth="1" opacity={0.5} />
              <text x="50" y="62" textAnchor="middle" fill="#8a1c1c" fontSize="8" fontFamily="monospace" opacity={0.6}>
                2026
              </text>
            </svg>
          </div>
        </div>
      </div>
    </ShareCardShell>
  );
}
