'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { TimeRange } from './chart-config';
import { TIME_RANGES } from './chart-config';

interface ChartTimeRangeFilterProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

export default function ChartTimeRangeFilter({ value, onChange }: ChartTimeRangeFilterProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="hidden sm:inline text-[11px] font-medium uppercase tracking-wider text-white/30">
        Zakres
      </span>
      <div className="flex gap-0.5 rounded-lg bg-white/[0.03] p-0.5 border border-white/[0.04]">
        {TIME_RANGES.map((r) => (
          <button
            key={r}
            onClick={() => onChange(r)}
            className={cn(
              'relative cursor-pointer rounded-md border-none bg-transparent px-2.5 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-medium transition-colors',
              value === r
                ? 'text-white'
                : 'text-white/30 hover:text-white/50',
            )}
          >
            {value === r && (
              <motion.div
                layoutId="metrics-range-pill"
                className="absolute inset-0 rounded-md bg-white/[0.08] border border-white/[0.06]"
                transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
              />
            )}
            <span className="relative z-10">{r}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
