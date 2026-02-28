'use client';

import { type ReactNode } from 'react';

// ═══════════════════════════════════════════════════════════════
// SceneParticles — CSS-only animated floating objects per mode
// Uses nth-child staggering (like roast-ember pattern)
// Zero JS runtime cost — pure CSS animations
// ═══════════════════════════════════════════════════════════════

interface SceneParticlesProps {
  /** Base CSS class for particles — defines keyframe + color (e.g. "court-particle") */
  className: string;
  /** Number of particles to render (default: 8) */
  count?: number;
  /** Optional inline SVG shapes to use instead of dots */
  shapes?: ReactNode[];
  /** Extra wrapper class */
  wrapperClassName?: string;
}

export default function SceneParticles({
  className,
  count = 8,
  shapes,
  wrapperClassName = '',
}: SceneParticlesProps) {
  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[1] overflow-hidden ${wrapperClassName}`}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) =>
        shapes && shapes[i % shapes.length] ? (
          <div key={i} className={`${className} ${className}-${i + 1}`}>
            {shapes[i % shapes.length]}
          </div>
        ) : (
          <div key={i} className={`${className} ${className}-${i + 1}`} />
        ),
      )}
    </div>
  );
}

// ── Pre-built SVG shapes for specific modes ─────────────────

export function CourtPaperSVG() {
  return (
    <svg viewBox="0 0 20 26" fill="none" className="h-full w-full">
      <rect x="1" y="1" width="18" height="24" rx="1" stroke="#d4a853" strokeWidth="0.5" fill="#d4a853" fillOpacity="0.06" />
      <line x1="4" y1="6" x2="16" y2="6" stroke="#d4a853" strokeWidth="0.3" opacity="0.4" />
      <line x1="4" y1="10" x2="14" y2="10" stroke="#d4a853" strokeWidth="0.3" opacity="0.3" />
      <line x1="4" y1="14" x2="15" y2="14" stroke="#d4a853" strokeWidth="0.3" opacity="0.3" />
      <line x1="4" y1="18" x2="12" y2="18" stroke="#d4a853" strokeWidth="0.3" opacity="0.2" />
    </svg>
  );
}

export function HeartSVG({ color = '#ff006e' }: { color?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-full w-full">
      <path
        d="M10 17 C10 17 2 12 2 7 C2 4 4 2 7 2 C8.5 2 10 3 10 3 C10 3 11.5 2 13 2 C16 2 18 4 18 7 C18 12 10 17 10 17Z"
        fill={color}
        fillOpacity="0.15"
        stroke={color}
        strokeWidth="0.5"
        opacity="0.6"
      />
    </svg>
  );
}

export function MirrorShardSVG() {
  return (
    <svg viewBox="0 0 16 20" fill="none" className="h-full w-full">
      <polygon
        points="3,0 13,2 16,18 0,20"
        fill="url(#shardGrad)"
        fillOpacity="0.12"
        stroke="#8b5cf6"
        strokeWidth="0.4"
        opacity="0.5"
      />
      <defs>
        <linearGradient id="shardGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function ChatBubbleMiniSVG() {
  return (
    <svg viewBox="0 0 22 16" fill="none" className="h-full w-full">
      <rect x="1" y="1" width="20" height="12" rx="6" fill="#0084ff" fillOpacity="0.1" stroke="#0084ff" strokeWidth="0.4" opacity="0.5" />
      <polygon points="6,13 10,13 5,16" fill="#0084ff" fillOpacity="0.1" />
    </svg>
  );
}

export function DataNodeSVG({ color = '#10b981' }: { color?: string }) {
  return (
    <svg viewBox="0 0 12 12" fill="none" className="h-full w-full">
      <circle cx="6" cy="6" r="4" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="0.5" opacity="0.5" />
      <circle cx="6" cy="6" r="1.5" fill={color} fillOpacity="0.3" />
    </svg>
  );
}
