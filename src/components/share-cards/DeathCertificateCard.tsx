'use client';

import { useRef } from 'react';
import ShareCardShell from '@/components/share-cards/ShareCardShell';

interface DeathCertificateCardProps {
  caseNumber: string;
  dateOfBirth: string;
  dateOfDeath: string;
  placeOfDeath: string;
  attendingPhysician: string;
  mannerOfDeath: 'natural' | 'accident' | 'homicide' | 'suicide' | 'undetermined';
  participants: string[];
}

function getMannerLabel(manner: string): string {
  switch (manner) {
    case 'natural': return 'ŚMIERĆ NATURALNA';
    case 'accident': return 'WYPADEK';
    case 'homicide': return 'ZABÓJSTWO';
    case 'suicide': return 'SAMOBÓJSTWO';
    case 'undetermined': return 'NIEOKREŚLONA';
    default: return 'NIEOKREŚLONA';
  }
}

function getMannerColor(manner: string): string {
  switch (manner) {
    case 'natural': return '#8b7355';
    case 'accident': return '#b45309';
    case 'homicide': return '#dc2626';
    case 'suicide': return '#991b1b';
    case 'undetermined': return '#6b7280';
    default: return '#6b7280';
  }
}

function CertRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontFamily: '"Courier New", Courier, monospace',
          fontSize: '0.5rem',
          color: '#78716c',
          letterSpacing: '0.15em',
          textTransform: 'uppercase' as const,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
        <div
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '0.88rem',
            color: valueColor || '#d6d3d1',
            fontWeight: 500,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap' as const,
          }}
        >
          {value}
        </div>
        <div
          style={{
            flex: 1,
            borderBottom: '1px dotted rgba(120, 113, 108, 0.25)',
            position: 'relative',
            top: -4,
          }}
        />
      </div>
    </div>
  );
}

export default function DeathCertificateCard({
  caseNumber,
  dateOfBirth,
  dateOfDeath,
  placeOfDeath,
  attendingPhysician,
  mannerOfDeath,
  participants,
}: DeathCertificateCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mannerLabel = getMannerLabel(mannerOfDeath);
  const mannerColor = getMannerColor(mannerOfDeath);

  return (
    <ShareCardShell
      cardRef={cardRef}
      gradient="linear-gradient(170deg, #1c1917 0%, #0c0a09 50%, #050403 100%)"
    >
      {/* Sepia ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 280,
          height: 280,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(180, 160, 130, 0.04) 0%, transparent 60%)',
          filter: 'blur(30px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Paper texture */}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.08, pointerEvents: 'none', zIndex: 0, mixBlendMode: 'overlay' as const }}>
        <filter id="certNoise">
          <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves={4} stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#certNoise)" />
      </svg>

      {/* Double border frame */}
      <div
        style={{
          position: 'absolute',
          inset: 14,
          border: '1px solid rgba(168, 162, 158, 0.15)',
          borderRadius: 14,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 20,
          border: '1px solid rgba(168, 162, 158, 0.06)',
          borderRadius: 8,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Main content */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: '40px 28px 28px 28px',
        }}
      >
        {/* Header — formal document style */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div
            style={{
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: '0.5rem',
              color: '#78716c',
              letterSpacing: '0.2em',
              marginBottom: 10,
            }}
          >
            DOKUMENT URZĘDOWY
          </div>
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '1.8rem',
              fontWeight: 400,
              letterSpacing: '0.15em',
              color: '#d6d3d1',
              margin: 0,
              lineHeight: 1.1,
              textShadow: '0 2px 10px rgba(214, 211, 209, 0.1)',
            }}
          >
            AKT ZGONU
          </div>
          <div
            style={{
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: '0.5rem',
              color: '#57534e',
              letterSpacing: '0.15em',
              marginTop: 6,
            }}
          >
            ZWIĄZKU INTERPERSONALNEGO
          </div>
          <div
            style={{
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(168, 162, 158, 0.3), transparent)',
              marginTop: 14,
              width: '80%',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          />
        </div>

        {/* Certificate fields */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <CertRow label="Nr sprawy" value={caseNumber} />
          <CertRow label="Strony związku" value={participants.join(' & ')} />

          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <CertRow label="Data narodzin" value={dateOfBirth} />
            </div>
            <div style={{ flex: 1 }}>
              <CertRow label="Data zgonu" value={dateOfDeath} />
            </div>
          </div>

          <CertRow label="Miejsce zgonu" value={placeOfDeath} />

          {/* Manner of death — highlighted */}
          <div style={{ marginBottom: 12, marginTop: 4 }}>
            <div
              style={{
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: '0.5rem',
                color: '#78716c',
                letterSpacing: '0.15em',
                textTransform: 'uppercase' as const,
                marginBottom: 6,
              }}
            >
              Sposób zgonu
            </div>
            <div
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '1.3rem',
                fontWeight: 600,
                color: mannerColor,
                letterSpacing: '0.1em',
                textShadow: `0 2px 12px ${mannerColor}40`,
              }}
            >
              {mannerLabel}
            </div>
          </div>

          <CertRow label="Lekarz prowadzący" value={attendingPhysician} />
        </div>

        {/* Official stamp + signature area */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            paddingTop: 16,
            borderTop: '1px solid rgba(168, 162, 158, 0.1)',
            position: 'relative',
          }}
        >
          {/* Signature line */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                width: '70%',
                borderBottom: '1px solid rgba(168, 162, 158, 0.2)',
                marginBottom: 4,
              }}
            />
            <div
              style={{
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: '0.45rem',
                color: '#57534e',
                letterSpacing: '0.1em',
              }}
            >
              Podpis patologa
            </div>
          </div>

          {/* Official stamp */}
          <div
            style={{
              position: 'absolute',
              right: -8,
              bottom: -8,
              transform: 'rotate(-15deg)',
              mixBlendMode: 'screen' as const,
            }}
          >
            <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
              <circle cx="45" cy="45" r="40" stroke={mannerColor} strokeWidth="1.5" strokeDasharray="4 2 8 2" opacity={0.5} />
              <circle cx="45" cy="45" r="34" stroke={mannerColor} strokeWidth="0.8" opacity={0.35} />
              <circle cx="45" cy="45" r="22" stroke={mannerColor} strokeWidth="0.5" opacity={0.25} />
              <path id="curveCertTop" d="M 15,45 A 30,30 0 0,1 75,45" fill="transparent" />
              <text fill={mannerColor} fontSize="6" fontFamily="serif" fontWeight="600" letterSpacing="0.1em" opacity={0.6}>
                <textPath href="#curveCertTop" startOffset="50%" textAnchor="middle">
                  PATOLOG RELACJI
                </textPath>
              </text>
              <path id="curveCertBottom" d="M 75,45 A 30,30 0 0,1 15,45" fill="transparent" />
              <text fill={mannerColor} fontSize="5.5" fontFamily="monospace" letterSpacing="0.15em" opacity={0.45}>
                <textPath href="#curveCertBottom" startOffset="50%" textAnchor="middle">
                  PODTEKST
                </textPath>
              </text>
              <text x="45" y="42" textAnchor="middle" fill={mannerColor} fontSize="12" fontFamily="serif" fontWeight="700" opacity={0.7}>
                PT
              </text>
              <line x1="30" y1="48" x2="60" y2="48" stroke={mannerColor} strokeWidth="0.8" opacity={0.4} />
              <text x="45" y="57" textAnchor="middle" fill={mannerColor} fontSize="7" fontFamily="monospace" opacity={0.5}>
                2026
              </text>
            </svg>
          </div>
        </div>
      </div>
    </ShareCardShell>
  );
}
