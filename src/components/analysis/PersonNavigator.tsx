'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, Users } from 'lucide-react';
import type { PersonMetrics, QuantitativeAnalysis } from '@/lib/parsers/types';

// Extended palette for 20+ participants
const PERSON_COLORS = [
  '#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#8b5cf6',
  '#14b8a6', '#e11d48', '#0ea5e9', '#d946ef', '#22c55e',
  '#eab308', '#6366f1', '#f43f5e', '#2dd4bf', '#fb923c',
];

export function getPersonColor(index: number): string {
  return PERSON_COLORS[index % PERSON_COLORS.length];
}

interface PersonNavigatorProps {
  participants: string[];
  perPerson: Record<string, PersonMetrics>;
  totalMessages: number;
  selectedPerson: string | null;
  onSelectPerson: (name: string | null) => void;
  quantitative?: QuantitativeAnalysis;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString('pl-PL');
}

export default function PersonNavigator({
  participants,
  perPerson,
  totalMessages,
  selectedPerson,
  onSelectPerson,
  quantitative,
}: PersonNavigatorProps) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(false);

  const safeTotal = Math.max(totalMessages, 1);

  // Sort participants by message count descending
  const sorted = useMemo(() => {
    return [...participants].sort((a, b) => {
      const aCount = perPerson[a]?.totalMessages ?? 0;
      const bCount = perPerson[b]?.totalMessages ?? 0;
      return bCount - aCount;
    });
  }, [participants, perPerson]);

  const filtered = useMemo(() => {
    if (!search) return sorted;
    const q = search.toLowerCase();
    return sorted.filter((name) => name.toLowerCase().includes(q));
  }, [sorted, search]);

  // Show first 8 unless expanded
  const visible = expanded ? filtered : filtered.slice(0, 8);
  const hasMore = filtered.length > 8;

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-text-muted" />
          <span className="font-mono text-xs uppercase tracking-widest text-text-muted">
            Uczestnicy ({participants.length})
          </span>
        </div>
        {selectedPerson && (
          <button
            onClick={() => onSelectPerson(null)}
            className="font-mono text-[10px] uppercase tracking-widest text-primary hover:underline"
          >
            Pokaż wszystkich
          </button>
        )}
      </div>

      {/* Search */}
      {participants.length > 6 && (
        <div className="relative border-b border-border px-4 py-2">
          <Search className="absolute left-6 top-1/2 size-3.5 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Szukaj..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent py-1 pl-6 pr-2 text-xs text-foreground outline-none placeholder:text-text-muted/50"
          />
        </div>
      )}

      {/* Participant list */}
      <div className="divide-y divide-border/50">
        {visible.map((name, i) => {
          const originalIndex = sorted.indexOf(name);
          const color = getPersonColor(originalIndex);
          const metrics = perPerson[name];
          const msgCount = metrics?.totalMessages ?? 0;
          const pct = ((msgCount / safeTotal) * 100).toFixed(1);
          const isSelected = selectedPerson === name;

          // Get ghost risk if available
          const ghostRisk = quantitative?.viralScores?.ghostRisk?.[name]?.score;

          return (
            <button
              key={name}
              onClick={() => onSelectPerson(isSelected ? null : name)}
              className={`flex w-full items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 text-left transition-colors hover:bg-card-hover active:bg-card-hover ${
                isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : ''
              }`}
            >
              {/* Rank + Avatar */}
              <span className="w-4 sm:w-5 text-center font-mono text-[10px] text-text-muted">
                {originalIndex + 1}
              </span>
              <div
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {name.charAt(0).toUpperCase()}
              </div>

              {/* Name + stats */}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] sm:text-sm font-medium text-foreground">{name}</div>
                <div className="flex items-center gap-2 text-[10px] text-text-muted">
                  <span>{formatCount(msgCount)} msg</span>
                  <span>&middot;</span>
                  <span>{pct}%</span>
                  {ghostRisk !== undefined && ghostRisk > 50 && (
                    <>
                      <span>&middot;</span>
                      <span className="text-red-400">{'\u{1F47B}'} {ghostRisk}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Mini bar */}
              <div className="h-1 w-8 sm:w-12 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Show more/less */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-center gap-1 border-t border-border py-2 text-[10px] uppercase tracking-widest text-text-muted hover:text-foreground"
        >
          {expanded ? (
            <>
              <ChevronUp className="size-3" />
              Zwiń
            </>
          ) : (
            <>
              <ChevronDown className="size-3" />
              Pokaż wszystkich ({filtered.length})
            </>
          )}
        </button>
      )}
    </div>
  );
}
