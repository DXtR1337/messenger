'use client';

import { useId } from 'react';

interface PTLogoProps {
  /** Height in pixels (width auto-calculated from 580:370 aspect ratio) */
  size?: number;
  className?: string;
}

export default function PTLogo({ size = 28, className = '' }: PTLogoProps) {
  const uid = useId();
  const gradId = `ptgrad-${uid}`;
  const maskId = `ptmask-${uid}`;

  // Original viewBox: 580 x 370 → aspect ratio ~1.568
  const width = Math.round(size * (580 / 370));

  return (
    <svg
      width={width}
      height={size}
      viewBox="0 0 580 370"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
        <mask id={maskId}>
          <rect width="580" height="370" fill="white" />
          <path
            d="M 100,40 Q 100,30 112,30 L 230,30 Q 242,30 242,42 L 242,125 Q 242,137 230,137 L 165,137 L 145,165 L 140,137 L 112,137 Q 100,137 100,125 Z"
            fill="black"
          />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`}>
        <path
          d="M 0,0 L 240,0 Q 310,0 310,70 L 310,130 Q 310,200 240,200 L 85,200 L 85,370 L 0,370 Z"
          fill={`url(#${gradId})`}
        />
      </g>
      <path
        d="M 330,0 L 580,0 L 580,85 L 497,85 L 497,370 L 413,370 L 413,85 L 330,85 Z"
        fill={`url(#${gradId})`}
      />
    </svg>
  );
}
