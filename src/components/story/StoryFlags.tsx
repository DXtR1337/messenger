'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import type { RedFlag, GreenFlag } from '@/lib/analysis/types';

interface StoryFlagsProps {
  redFlags: RedFlag[];
  greenFlags: GreenFlag[];
}

function SeverityBadge({ severity }: { severity: RedFlag['severity'] }) {
  const config: Record<
    RedFlag['severity'],
    { label: string; bg: string; text: string }
  > = {
    mild: {
      label: 'Lekki',
      bg: 'rgba(255, 255, 255, 0.06)',
      text: 'var(--story-text-3)',
    },
    moderate: {
      label: 'Umiarkowany',
      bg: 'rgba(251, 191, 36, 0.12)',
      text: 'var(--story-amber)',
    },
    severe: {
      label: 'Poważny',
      bg: 'rgba(255, 107, 107, 0.12)',
      text: 'var(--story-red)',
    },
  };

  const c = config[severity];

  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5"
      style={{
        background: c.bg,
        fontFamily: 'var(--font-space-grotesk)',
        fontSize: '0.62rem',
        fontWeight: 600,
        color: c.text,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      {c.label}
    </span>
  );
}

function FlagCard({
  text,
  severity,
  index,
  isInView,
  variant,
}: {
  text: string;
  severity?: RedFlag['severity'];
  index: number;
  isInView: boolean;
  variant: 'green' | 'red';
}) {
  const accentColor =
    variant === 'green' ? 'var(--story-green)' : 'var(--story-red)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.45,
        delay: 0.15 + index * 0.08,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="flex flex-col gap-2 p-4 transition-colors"
      style={{
        background: 'var(--story-bg-card)',
        border: '1px solid var(--story-border)',
        borderRadius: 'var(--story-radius)',
        borderLeftWidth: 2,
        borderLeftColor: accentColor,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--story-border-hover)';
        e.currentTarget.style.borderLeftColor = accentColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--story-border)';
        e.currentTarget.style.borderLeftColor = accentColor;
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-space-grotesk)',
          fontSize: '0.82rem',
          color: 'var(--story-text)',
          lineHeight: 1.5,
        }}
      >
        {text}
      </span>
      {severity && <SeverityBadge severity={severity} />}
    </motion.div>
  );
}

function EmptyPlaceholder() {
  return (
    <div
      className="flex items-center justify-center rounded-xl py-8"
      style={{
        background: 'var(--story-bg-card)',
        border: '1px solid var(--story-border)',
        borderRadius: 'var(--story-radius)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-space-grotesk)',
          fontSize: '0.82rem',
          color: 'var(--story-text-3)',
        }}
      >
        Brak
      </span>
    </div>
  );
}

export default function StoryFlags({ redFlags, greenFlags }: StoryFlagsProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 });

  return (
    <div ref={sectionRef} className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Green flags column */}
      <div className="flex flex-col gap-3">
        <div className="mb-1 flex items-center gap-2">
          <span style={{ fontSize: '1.1rem' }}>&#x1F7E2;</span>
          <span
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 700,
              fontSize: '1rem',
              color: 'var(--story-green)',
            }}
          >
            Zielone flagi
          </span>
        </div>

        {greenFlags.length === 0 ? (
          <EmptyPlaceholder />
        ) : (
          greenFlags.map((flag, i) => (
            <FlagCard
              key={`green-${i}`}
              text={flag.pattern}
              index={i}
              isInView={isInView}
              variant="green"
            />
          ))
        )}
      </div>

      {/* Red flags column */}
      <div className="flex flex-col gap-3">
        <div className="mb-1 flex items-center gap-2">
          <span style={{ fontSize: '1.1rem' }}>&#x1F534;</span>
          <span
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 700,
              fontSize: '1rem',
              color: 'var(--story-red)',
            }}
          >
            Czerwone flagi
          </span>
        </div>

        {redFlags.length === 0 ? (
          <EmptyPlaceholder />
        ) : (
          redFlags.map((flag, i) => (
            <FlagCard
              key={`red-${i}`}
              text={flag.pattern}
              severity={flag.severity}
              index={i}
              isInView={isInView}
              variant="red"
            />
          ))
        )}
      </div>
    </div>
  );
}
