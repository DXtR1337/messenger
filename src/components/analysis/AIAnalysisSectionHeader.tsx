'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

interface AIAnalysisSectionHeaderProps {
  confidence?: number;
}

function BrainIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      width={16}
      height={16}
    >
      <path d="M12 2a4 4 0 014 4v1a1 1 0 001 1h1a4 4 0 010 8h-1a1 1 0 00-1 1v1a4 4 0 01-8 0v-1a1 1 0 00-1-1H6a4 4 0 010-8h1a1 1 0 001-1V6a4 4 0 014-4z" />
    </svg>
  );
}

export default function AIAnalysisSectionHeader({ confidence }: AIAnalysisSectionHeaderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      className="flex justify-between items-center mb-3.5 px-1"
      initial={{ opacity: 0, y: 8 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="inline-flex items-center gap-1.5 font-display text-[13px] font-semibold text-chart-b bg-chart-b-subtle px-3.5 py-1.5 rounded-full">
        <BrainIcon />
        Analiza AI — Claude
      </div>
      {confidence !== undefined && confidence > 0 && (
        <span className="font-display text-xs text-text-muted">
          Pewność analizy: {confidence}%
        </span>
      )}
    </motion.div>
  );
}
