'use client';

import { cn } from '@/lib/utils';

interface BrandShimmerProps {
  /** Width class (e.g. 'w-full', 'w-48') */
  className?: string;
  /** Number of shimmer rows to render */
  rows?: number;
}

/**
 * Premium loading skeleton with blue-purple gradient shimmer.
 * Replaces plain gray pulse skeletons across the app.
 */
export default function BrandShimmer({ className, rows = 3 }: BrandShimmerProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="brand-shimmer"
          style={{
            height: i === 0 ? '12rem' : i === 1 ? '8rem' : '16rem',
          }}
        />
      ))}
    </div>
  );
}
