'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface PricingToggleProps {
  children: (isAnnual: boolean) => React.ReactNode;
}

export default function PricingToggle({ children }: PricingToggleProps) {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <>
      {/* Toggle */}
      <div className="mb-12 flex items-center justify-center gap-3">
        <span
          className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          Miesięcznie
        </span>
        <button
          type="button"
          onClick={() => setIsAnnual(!isAnnual)}
          className="relative h-7 w-12 rounded-full border border-[#2a2a2a] bg-[#111111] transition-colors"
          aria-label={isAnnual ? 'Przełącz na plan miesięczny' : 'Przełącz na plan roczny'}
        >
          <motion.div
            className="absolute top-0.5 size-6 rounded-full"
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #a855f7)',
            }}
            animate={{ left: isAnnual ? 22 : 2 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>
        <span
          className={`text-sm font-medium transition-colors ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          Rocznie
        </span>
        {isAnnual && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-full bg-[#10b981]/15 px-2.5 py-0.5 font-mono text-[0.65rem] font-semibold text-[#10b981]"
          >
            -34%
          </motion.span>
        )}
      </div>

      {children(isAnnual)}
    </>
  );
}
