'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { QuantitativeAnalysis } from '@/lib/parsers/types';
import { formatNumber } from '@/lib/utils';

interface BurstActivityProps {
  quantitative: QuantitativeAnalysis;
}

export default function BurstActivity({ quantitative }: BurstActivityProps) {
  const bursts = quantitative.patterns.bursts;

  const topBursts = useMemo(() => {
    return [...bursts]
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 8);
  }, [bursts]);

  const maxMessageCount = useMemo(() => {
    if (topBursts.length === 0) return 1;
    return topBursts[0].messageCount;
  }, [topBursts]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="px-3 sm:px-5 pt-4">
        <h3 className="font-display text-[15px] font-bold">Wzmożona aktywność</h3>
        <p className="mt-0.5 text-xs text-text-muted">
          Okresy najintensywniejszej aktywności
        </p>
      </div>
      <div className="px-3 sm:px-5 py-4">
        {topBursts.length === 0 ? (
          <p className="text-sm text-text-muted">
            Nie wykryto okresów wzmożonej aktywności
          </p>
        ) : (
          <div className="flex flex-col">
            {topBursts.map((burst, index) => {
              const percentage = (burst.messageCount / maxMessageCount) * 100;
              const isLast = index === topBursts.length - 1;

              return (
                <motion.div
                  key={`${burst.startDate}-${burst.endDate}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className={`flex flex-col gap-2 py-3 ${
                    isLast ? '' : 'border-b border-border'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-mono text-xs text-muted-foreground">
                      {burst.startDate} &mdash; {burst.endDate}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-foreground">
                        {formatNumber(burst.messageCount)} wiad.
                      </span>
                      <span className="text-xs text-text-muted">
                        {burst.avgDaily.toFixed(1)}/dzień
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background:
                          'linear-gradient(90deg, var(--chart-1), var(--chart-2))',
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
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
