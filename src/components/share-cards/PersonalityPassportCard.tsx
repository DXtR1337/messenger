'use client';

import { useRef, useState } from 'react';
import { useCardDownload } from './useCardDownload';
import type { QualitativeAnalysis } from '@/lib/analysis/types';

interface PersonalityPassportCardProps {
  qualitative: QualitativeAnalysis;
  participants: string[];
}

const ACCENT_COLORS = ['#6d9fff', '#b38cff', '#f472b6', '#fbbf24'];

export default function PersonalityPassportCard({
  qualitative,
  participants,
}: PersonalityPassportCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'chatscope-passport');

  const [activeIdx, setActiveIdx] = useState(0);
  const profiles = qualitative.pass3;
  if (!profiles) return null;

  const name = participants[activeIdx % participants.length];
  const profile = profiles[name];
  if (!profile) return null;

  const accent = ACCENT_COLORS[activeIdx % ACCENT_COLORS.length];
  const mono = 'var(--font-geist-mono)';
  const syne = 'var(--font-syne)';
  const grotesk = 'var(--font-space-grotesk)';

  const mbti = profile.mbti?.type ?? '????';
  const attachment = profile.attachment_indicators?.primary_style ?? '—';
  const loveLanguage = profile.love_language?.primary ?? '—';
  const commStyle = profile.communication_profile?.style ?? '—';

  // Big Five top 3
  const bigFive = profile.big_five_approximation
    ? Object.entries(profile.big_five_approximation)
        .map(([trait, data]) => ({ trait, score: data.score ?? 0 }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
    : [];

  // Red/Green flags for this person
  const greenFlags = qualitative.pass2?.green_flags?.slice(0, 2) ?? [];
  const redFlags = qualitative.pass2?.red_flags?.slice(0, 2) ?? [];

  const firstName = name.split(' ')[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {/* Person picker */}
      {participants.length > 1 && (
        <div style={{ display: 'flex', gap: 6 }}>
          {participants.map((p, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className="rounded-full border border-border px-3 py-1 text-xs transition-colors hover:bg-card-hover"
              style={{
                background: i === activeIdx ? `${ACCENT_COLORS[i % ACCENT_COLORS.length]}20` : undefined,
                borderColor: i === activeIdx ? ACCENT_COLORS[i % ACCENT_COLORS.length] : undefined,
                color: i === activeIdx ? ACCENT_COLORS[i % ACCENT_COLORS.length] : '#888',
              }}
            >
              {p.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      <div
        ref={cardRef}
        style={{
          width: 360,
          height: 640,
          background: '#0c0c10',
          borderRadius: 8,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          border: `2px solid ${accent}25`,
        }}
      >
        {/* Passport header band */}
        <div
          style={{
            background: `linear-gradient(135deg, ${accent}20, ${accent}08)`,
            padding: '14px 20px',
            borderBottom: `1px solid ${accent}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: mono,
                fontSize: '0.42rem',
                letterSpacing: '0.2em',
                color: accent,
                opacity: 0.7,
              }}
            >
              PASZPORT OSOBOWOŚCI
            </div>
            <div
              style={{
                fontFamily: syne,
                fontSize: '0.75rem',
                fontWeight: 800,
                color: '#eee',
                marginTop: 2,
              }}
            >
              ChatScope
            </div>
          </div>
          {/* Photo placeholder */}
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 6,
              background: `linear-gradient(135deg, ${accent}30, ${accent}10)`,
              border: `1px solid ${accent}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: syne,
              fontSize: '1.2rem',
              fontWeight: 900,
              color: accent,
            }}
          >
            {firstName[0]}
          </div>
        </div>

        {/* Name */}
        <div style={{ padding: '14px 20px 0' }}>
          <div style={{ fontFamily: mono, fontSize: '0.42rem', letterSpacing: '0.15em', color: '#555' }}>
            POSIADACZ
          </div>
          <div
            style={{
              fontFamily: syne,
              fontSize: '1.15rem',
              fontWeight: 900,
              color: '#fff',
              marginTop: 2,
            }}
          >
            {name}
          </div>
        </div>

        {/* Key metrics grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 1,
            padding: '12px 20px',
          }}
        >
          {[
            { label: 'MBTI', value: mbti },
            { label: 'PRZYWIĄZANIE', value: attachment },
            { label: 'JĘZYK MIŁOŚCI', value: loveLanguage },
            { label: 'STYL KOMUNIKACJI', value: commStyle },
          ].map((item) => (
            <div key={item.label} style={{ padding: '8px 0' }}>
              <div style={{ fontFamily: mono, fontSize: '0.38rem', letterSpacing: '0.12em', color: '#555' }}>
                {item.label}
              </div>
              <div
                style={{
                  fontFamily: grotesk,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  color: accent,
                  marginTop: 2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Separator */}
        <div style={{ height: 1, background: `${accent}10`, margin: '0 20px' }} />

        {/* Big Five top 3 */}
        {bigFive.length > 0 && (
          <div style={{ padding: '10px 20px' }}>
            <div style={{ fontFamily: mono, fontSize: '0.38rem', letterSpacing: '0.15em', color: '#555', marginBottom: 8 }}>
              GŁÓWNE CECHY
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {bigFive.map((t) => (
                <div key={t.trait} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: grotesk, fontSize: '0.55rem', color: '#aaa', width: 90, textTransform: 'capitalize' }}>
                    {t.trait}
                  </span>
                  <div style={{ flex: 1, height: 3, borderRadius: 2, background: '#1a1a1a', overflow: 'hidden' }}>
                    <div style={{ width: `${t.score}%`, height: '100%', background: accent, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontFamily: mono, fontSize: '0.45rem', color: accent, width: 24, textAlign: 'right' }}>
                    {t.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Separator */}
        <div style={{ height: 1, background: `${accent}10`, margin: '0 20px' }} />

        {/* Flags */}
        <div style={{ padding: '10px 20px', flex: 1 }}>
          {greenFlags.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontFamily: mono, fontSize: '0.38rem', letterSpacing: '0.12em', color: '#16a34a', marginBottom: 4 }}>
                🟢 ZIELONE FLAGI
              </div>
              {greenFlags.map((f, i) => (
                <div key={i} style={{ fontFamily: grotesk, fontSize: '0.5rem', color: '#888', lineHeight: 1.5 }}>
                  • {f.pattern}
                </div>
              ))}
            </div>
          )}
          {redFlags.length > 0 && (
            <div>
              <div style={{ fontFamily: mono, fontSize: '0.38rem', letterSpacing: '0.12em', color: '#dc2626', marginBottom: 4 }}>
                🔴 CZERWONE FLAGI
              </div>
              {redFlags.map((f, i) => (
                <div key={i} style={{ fontFamily: grotesk, fontSize: '0.5rem', color: '#888', lineHeight: 1.5 }}>
                  • {f.pattern}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MRZ-style code at bottom (like a real passport) */}
        <div
          style={{
            background: `${accent}08`,
            padding: '8px 20px',
            borderTop: `1px solid ${accent}10`,
          }}
        >
          <div
            style={{
              fontFamily: mono,
              fontSize: '0.4rem',
              letterSpacing: '0.06em',
              color: '#333',
              lineHeight: 1.6,
              overflow: 'hidden',
            }}
          >
            P&lt;{mbti}&lt;{attachment.toUpperCase().replace(/\s/g, '')}&lt;&lt;{commStyle.toUpperCase().replace(/\s/g, '')}
          </div>
          <div
            style={{
              fontFamily: mono,
              fontSize: '0.4rem',
              letterSpacing: '0.06em',
              color: '#333',
              lineHeight: 1.6,
            }}
          >
            CHATSCOPE&lt;&lt;&lt;&lt;{firstName.toUpperCase()}&lt;&lt;&lt;&lt;2026&lt;&lt;&lt;
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: 'center',
            padding: '6px 0',
          }}
        >
          <span
            style={{
              fontFamily: mono,
              fontSize: '0.38rem',
              letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.15)',
            }}
          >
            chatscope.app
          </span>
        </div>
      </div>

      <button
        onClick={download}
        disabled={isDownloading}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-card-hover hover:text-foreground disabled:opacity-50"
      >
        {isDownloading ? 'Pobieranie...' : '📥 Pobierz paszport'}
      </button>
    </div>
  );
}
