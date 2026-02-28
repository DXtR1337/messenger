import { useId } from 'react';

interface BrandPProps {
  /** Height in CSS units (e.g. '1em', '42px'). Defaults to '1em' to match surrounding text. */
  height?: string;
  className?: string;
}

/**
 * The "P" letter from the PT monogram logo — with chat bubble cutout.
 * Designed to sit inline replacing the text "P" in "PodTeksT".
 * viewBox covers just the P: 0,0 → 310,370 (aspect ~0.838:1)
 */
export default function BrandP({ height = '1em', className = '' }: BrandPProps) {
  const uid = useId().replace(/:/g, '_');
  const gradId = `bp-g${uid}`;
  const maskId = `bp-m${uid}`;

  return (
    <svg
      viewBox="0 0 310 370"
      fill="none"
      className={className}
      aria-hidden="true"
      style={{
        height,
        width: 'auto',
        display: 'inline-block',
        verticalAlign: 'baseline',
        marginBottom: '-0.05em',
      }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
        <mask id={maskId}>
          <rect width="310" height="370" fill="white" />
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
    </svg>
  );
}
