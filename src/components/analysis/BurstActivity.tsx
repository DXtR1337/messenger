'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { QuantitativeAnalysis } from '@/lib/parsers/types';
import { formatNumber } from '@/lib/utils';
import { CHART_TOOLTIP_STYLE } from './chart-config';

interface BurstActivityProps {
  quantitative: QuantitativeAnalysis;
}

export default function BurstActivity({ quantitative }: BurstActivityProps) {
  const bursts = quantitative?.patterns?.bursts;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const topBursts = useMemo(() => {
    if (!bursts) return [];
    return [...bursts]
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 8);
  }, [bursts]);

  const maxMessageCount = useMemo(() => {
    if (topBursts.length === 0) return 1;
    return topBursts[0].messageCount;
  }, [topBursts]);

  if (!quantitative || !quantitative.patterns || !bursts) {
    return (
      <div className="rounded-xl border border-border bg-muted p-6 text-center text-sm text-muted-foreground">
        Brak danych do wyświetlenia
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="px-4 sm:px-6 pt-4">
        <h3 className="font-[family-name:var(--font-syne)] text-base font-semibold text-white">Wzmożona aktywność</h3>
        <p className="mt-0.5 text-xs text-white/50">
          Okresy najintensywniejszej aktywności
        </p>
      </div>
      <div className="px-4 sm:px-6 py-4">
        {topBursts.length === 0 ? (
          <p className="text-sm text-white/50">
            Nie wykryto okresów wzmożonej aktywności
          </p>
        ) : (
          <div className="flex flex-col space-y-4">
            {topBursts.map((burst, index) => {
              const percentage = (burst.messageCount / maxMessageCount) * 100;
              const isHovered = hoveredIndex === index;

              return (
                <motion.div
                  key={`${burst.startDate}-${burst.endDate}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="relative flex flex-col gap-2"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-mono text-[11px] text-white/50">
                      {burst.startDate} &mdash; {burst.endDate}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-white/80">
                        {formatNumber(burst.messageCount)} wiad.
                      </span>
                      <span className="text-[11px] text-white/50">
                        {burst.avgDaily.toFixed(1)}/dzień
                      </span>
                    </div>
                  </div>
                  <div
                    className="h-[5px] w-full overflow-hidden rounded-full bg-white/[0.04]"
                    style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: isHovered
                          ? 'linear-gradient(90deg, rgba(59,130,246,0.7), rgba(168,85,247,0.85))'
                          : 'linear-gradient(90deg, rgba(59,130,246,0.5), rgba(168,85,247,0.6))',
                        boxShadow: isHovered
                          ? '0 0 14px rgba(168,85,247,0.3)'
                          : '0 0 8px rgba(168,85,247,0.15)',
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{
                        delay: index * 0.05 + 0.15,
                        duration: 0.5,
                        ease: 'easeOut',
                      }}
                    />
                  </div>

                  {/* Hover tooltip */}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.12 }}
                        className="pointer-events-none absolute right-0 bottom-full z-50 mb-2"
                        style={{
                          ...CHART_TOOLTIP_STYLE,
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <p style={{ color: '#aaa', fontSize: 11, marginBottom: 4, fontWeight: 500 }}>
                          {burst.startDate} — {burst.endDate}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2, fontSize: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                            <span style={{ color: '#888' }}>Wiadomości</span>
                            <span style={{ fontWeight: 600, fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
                              {formatNumber(burst.messageCount)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                            <span style={{ color: '#888' }}>Średnio/dzień</span>
                            <span style={{ fontWeight: 600, fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
                              {burst.avgDaily.toFixed(1)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                            <span style={{ color: '#888' }}>Intensywność</span>
                            <span style={{ fontWeight: 600, fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
                              {Math.round(percentage)}%
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
