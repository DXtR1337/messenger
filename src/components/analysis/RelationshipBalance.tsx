'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/utils';
import type { Pass4Result, Pass2Result, HealthScoreComponents } from '@/lib/analysis/types';

interface RelationshipBalanceProps {
  pass4?: Pass4Result;
  pass2?: Pass2Result;
}

type GradientColor = 'blue' | 'emerald' | 'purple' | 'amber' | 'cyan';

interface BalanceMetric {
  name: string;
  key: keyof HealthScoreComponents;
  color: GradientColor;
}

const BALANCE_METRICS: BalanceMetric[] = [
  { name: 'Wzajemność', key: 'balance', color: 'blue' },
  { name: 'Emocjonalny wkład', key: 'emotional_safety', color: 'emerald' },
  { name: 'Otwartość', key: 'communication_quality', color: 'purple' },
  { name: 'Stabilność', key: 'growth_trajectory', color: 'amber' },
  { name: 'Głębokość tematów', key: 'engagement', color: 'cyan' },
];

const GRADIENT_MAP: Record<GradientColor, string> = {
  blue: 'linear-gradient(90deg, #3b82f6, #a855f7)',
  emerald: 'linear-gradient(90deg, #10b981, #06b6d4)',
  purple: 'linear-gradient(90deg, #a855f7, #ec4899)',
  amber: 'linear-gradient(90deg, #f59e0b, #f97316)',
  cyan: 'linear-gradient(90deg, #06b6d4, #3b82f6)',
};

function ProgressBar({
  name,
  value,
  color,
  delay,
}: {
  name: string;
  value: number;
  color: GradientColor;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div ref={ref}>
      <div className="flex justify-between mb-1.5">
        <span className="text-[0.82rem] text-muted-foreground">{name}</span>
        <span className="font-display text-[0.82rem] font-bold">
          {clampedValue}%
        </span>
      </div>
      <div className="h-[5px] bg-white/5 rounded-sm overflow-hidden">
        <motion.div
          className="h-full rounded-sm"
          style={{ background: GRADIENT_MAP[color] }}
          initial={{ width: 0 }}
          animate={isInView ? { width: `${clampedValue}%` } : { width: 0 }}
          transition={{
            duration: 1.2,
            delay,
            ease: [0.4, 0, 0.2, 1],
          }}
        />
      </div>
    </div>
  );
}

function getFlagSeverityClass(severity: string): string {
  const lower = severity.toLowerCase();
  if (lower === 'severe' || lower === 'moderate' || lower === 'high' || lower === 'warning') {
    return 'bg-warning-subtle text-warning';
  }
  return 'bg-white/[0.03] text-muted-foreground';
}

export default function RelationshipBalance({
  pass4,
  pass2,
}: RelationshipBalanceProps) {
  const components = pass4?.health_score?.components;
  const redFlags = pass2?.red_flags ?? [];
  const greenFlags = pass2?.green_flags ?? [];

  if (!components) return null;

  const hasRedFlags = redFlags.length > 0;
  const hasGreenFlags = greenFlags.length > 0;
  const hasFlags = hasRedFlags || hasGreenFlags;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 pt-4">
        <h3 className="font-display text-[0.93rem] font-bold">
          Bilans relacji
        </h3>
      </div>
      <div className="px-5 py-4 flex flex-col gap-3.5">
        {/* Progress bars */}
        {BALANCE_METRICS.map((metric, index) => (
          <ProgressBar
            key={metric.key}
            name={metric.name}
            value={components[metric.key]}
            color={metric.color}
            delay={index * 0.12}
          />
        ))}

        {/* Flags section */}
        {hasFlags && (
          <div className="mt-4 pt-3.5 border-t border-border">
            <div className="font-display text-[0.78rem] font-semibold mb-2">
              {hasRedFlags ? '\u26A0\uFE0F Flagi' : '\u2705 Pozytywne sygnały'}
            </div>

            {hasRedFlags
              ? redFlags.map((flag, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'text-[0.75rem] px-3 py-2 rounded-lg mb-1.5 leading-relaxed',
                      getFlagSeverityClass(flag.severity),
                    )}
                  >
                    {flag.pattern}
                  </div>
                ))
              : greenFlags.map((flag, idx) => (
                  <div
                    key={idx}
                    className="text-[0.75rem] px-3 py-2 rounded-lg mb-1.5 leading-relaxed bg-success-subtle text-success"
                  >
                    {flag.pattern}
                  </div>
                ))}
          </div>
        )}
      </div>
    </div>
  );
}
