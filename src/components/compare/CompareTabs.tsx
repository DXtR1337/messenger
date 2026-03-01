'use client';

import { useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

export interface TabDef {
  key: string;
  label: string;
  icon: string;
  /** Minimum required records (default 1) */
  minRecords?: number;
  /** Requires AI data? */
  requiresAI?: boolean;
}

export const COMPARE_TABS: TabDef[] = [
  { key: 'dynamics', label: 'Dynamika', icon: '🎭', requiresAI: true },
  { key: 'quant', label: 'Statystyki', icon: '📊' },
  { key: 'variations', label: 'Wariancje', icon: '🔀', minRecords: 3, requiresAI: true },
  { key: 'insights', label: 'Odkrycia', icon: '💡' },
  { key: 'ranking', label: 'Ranking', icon: '🏆', minRecords: 2 },
  { key: 'radar', label: 'Radar', icon: '🕸️' },
  { key: 'profile', label: 'Profil', icon: '👤' },
  { key: 'health', label: 'Zdrowie', icon: '❤️' },
  { key: 'timeline', label: 'Trendy', icon: '📈', minRecords: 2 },
];

interface CompareTabsProps {
  activeTab: string;
  onTabChange: (key: string) => void;
  recordCount: number;
  aiCount: number;
}

export default function CompareTabs({
  activeTab,
  onTabChange,
  recordCount,
  aiCount,
}: CompareTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll active tab into view on mount/change
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const el = activeRef.current;
      const left = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;
      container.scrollTo({ left, behavior: 'smooth' });
    }
  }, [activeTab]);

  const isEnabled = useCallback(
    (tab: TabDef) => {
      if (tab.minRecords && recordCount < tab.minRecords) return false;
      if (tab.requiresAI && aiCount === 0) return false;
      return true;
    },
    [recordCount, aiCount],
  );

  return (
    <div className="sticky top-0 z-30 -mx-4 bg-background/80 px-4 backdrop-blur-xl sm:-mx-6 sm:px-6">
      <div
        ref={scrollRef}
        className="no-scrollbar flex gap-1 overflow-x-auto py-2"
      >
        {COMPARE_TABS.map((tab) => {
          const active = activeTab === tab.key;
          const enabled = isEnabled(tab);

          return (
            <button
              key={tab.key}
              ref={active ? activeRef : undefined}
              onClick={() => enabled && onTabChange(tab.key)}
              disabled={!enabled}
              className={`relative flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'text-foreground'
                  : enabled
                    ? 'text-muted-foreground hover:text-foreground/80'
                    : 'cursor-not-allowed text-muted-foreground/40'
              }`}
              title={
                !enabled
                  ? tab.requiresAI && aiCount === 0
                    ? 'Wymaga analizy AI'
                    : `Wymaga min. ${tab.minRecords} analiz`
                  : undefined
              }
            >
              <span className="text-base">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {active && (
                <motion.div
                  layoutId="compare-tab-underline"
                  className="absolute inset-x-1 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
      <div className="h-px bg-border" />
    </div>
  );
}
