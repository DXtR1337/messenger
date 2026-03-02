'use client';

import { useRef, type RefObject } from 'react';
import { useCardDownload } from './useCardDownload';
import type { PrzegrywTygodniaResult } from '@/lib/analysis/types';

interface PrzegrywTygodniaCardProps {
  result: PrzegrywTygodniaResult;
  cardRef?: RefObject<HTMLDivElement | null>;
}

export default function PrzegrywTygodniaCard({ result, cardRef: externalRef }: PrzegrywTygodniaCardProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const cardRef = externalRef ?? internalRef;
  const { download, isDownloading } = useCardDownload(cardRef, 'podtekst-przegryw-tygodnia');

  const topNominations = result.nominations
    .filter((n) => n.winner === result.winner)
    .slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={cardRef}
        style={{
          width: 'min(360px, 100vw - 2rem)',
          minHeight: 640,
          background: 'linear-gradient(180deg, #0c0c0c 0%, #1a0a0a 50%, #0c0c0c 100%)',
          borderRadius: 16,
          padding: 28,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
        }}
      >
        {/* Scan lines effect */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(239,68,68,0.03) 2px, rgba(239,68,68,0.03) 4px)',
            pointerEvents: 'none',
          }}
        />

        {/* Header */}
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 4,
              color: '#ef4444',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-geist-mono), monospace',
            }}
          >
            ARCHIWUM HANBY
          </p>
          <div
            style={{
              width: 40,
              height: 1,
              background: '#ef4444',
              margin: '8px auto',
              opacity: 0.5,
            }}
          />
        </div>

        {/* Skull + Title */}
        <div style={{ textAlign: 'center', marginTop: 16, position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: 40 }}>💀</p>
          <p
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: '#ef4444',
              letterSpacing: -0.5,
              marginTop: 8,
              fontFamily: 'var(--font-syne), system-ui, sans-serif',
            }}
          >
            PRZEGRYW TYGODNIA
          </p>
        </div>

        {/* Winner name */}
        <div style={{ textAlign: 'center', marginTop: 20, position: 'relative', zIndex: 1 }}>
          <p
            style={{
              fontSize: 32,
              fontWeight: 900,
              color: '#fafafa',
              letterSpacing: -0.5,
              fontFamily: 'var(--font-syne), system-ui, sans-serif',
            }}
          >
            {result.winner}
          </p>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 16,
              marginTop: 8,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: '#ef4444',
                fontWeight: 700,
                fontFamily: 'var(--font-geist-mono), monospace',
              }}
            >
              {result.winnerScore}/100
            </span>
            <span
              style={{
                fontSize: 11,
                color: '#888',
                fontFamily: 'var(--font-geist-mono), monospace',
              }}
            >
              {result.winnerCategories}/8 kategorii
            </span>
          </div>
        </div>

        {/* Won categories */}
        <div style={{ marginTop: 24, position: 'relative', zIndex: 1 }}>
          {topNominations.map((nom) => (
            <div
              key={nom.categoryId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 0',
                borderBottom: '1px solid rgba(239,68,68,0.1)',
              }}
            >
              <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>{nom.emoji}</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#ef4444',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  fontFamily: 'var(--font-geist-mono), monospace',
                }}
              >
                {nom.categoryTitle}
              </span>
            </div>
          ))}
        </div>

        {/* Verdict */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: 20,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontStyle: 'italic',
              color: '#888',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            &ldquo;{result.verdict.length > 120 ? result.verdict.slice(0, 117) + '...' : result.verdict}&rdquo;
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 20,
            display: 'flex',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <p
            style={{
              fontSize: 9,
              color: '#555',
              letterSpacing: 2,
              fontFamily: 'var(--font-geist-mono), monospace',
            }}
          >
            PODTEKST &bull; 2026
          </p>
        </div>
      </div>

      {!externalRef && (
        <button
          onClick={download}
          disabled={isDownloading}
          style={{
            padding: '8px 20px',
            borderRadius: 8,
            border: '1px solid rgba(239,68,68,0.3)',
            background: 'rgba(239,68,68,0.1)',
            color: '#ef4444',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {isDownloading ? 'Pobieranie...' : 'Pobierz kartę'}
        </button>
      )}
    </div>
  );
}
