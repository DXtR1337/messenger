'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Check, Users } from 'lucide-react';
import type { AnalysisIndexEntry } from '@/lib/analysis/types';

interface CompareHeaderProps {
  entries: AnalysisIndexEntry[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  selfName: string | null;
}

export default function CompareHeader({
  entries,
  selectedIds,
  onToggle,
  onSelectAll,
  onDeselectAll,
  selfName,
}: CompareHeaderProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const oneOnOneEntries = useMemo(
    () => entries.filter((e) => e.participants.length === 2),
    [entries],
  );

  const selectedCount = selectedIds.size;

  // Close dropdown on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="space-y-3">
      {/* Title — compact single line */}
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20">
          <Users className="size-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-lg font-bold">
            {selfName ? (
              <>
                Porównanie relacji{' '}
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {selfName}
                </span>
              </>
            ) : (
              'Porównanie analiz'
            )}
          </h1>
          <p className="text-xs text-muted-foreground">
            {selectedCount} analiz wybranych
            {selfName && ` · Wspólny uczestnik: ${selfName}`}
          </p>
        </div>
      </div>

      {/* Compact picker — chip strip with toggle dropdown */}
      <div ref={containerRef} className="relative">
        {/* Selected chips as inline strip — clicking individual chips toggles them */}
        <div className="flex items-center gap-2">
          <div className="flex flex-1 flex-wrap items-center gap-1">
            {oneOnOneEntries
              .filter((e) => selectedIds.has(e.id))
              .slice(0, 5)
              .map((e) => {
                const partner = e.participants.find(
                  (p) => p.toLowerCase() !== selfName?.toLowerCase(),
                );
                return (
                  <button
                    key={e.id}
                    onClick={() => onToggle(e.id)}
                    className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-2 py-0.5 text-xs font-medium transition-colors hover:bg-white/[0.12]"
                    title={`Odznacz: ${e.title}`}
                  >
                    {partner ?? e.title}
                    <span className="ml-0.5 text-muted-foreground/60">&times;</span>
                  </button>
                );
              })}
            {selectedCount > 5 && (
              <span className="text-xs text-muted-foreground">+{selectedCount - 5}</span>
            )}
          </div>

          {/* Dropdown toggle */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs transition-colors hover:border-border-hover"
          >
            <span className="font-mono text-primary">{selectedCount}/{oneOnOneEntries.length}</span>
            <ChevronDown className={`size-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Dropdown list */}
        {open && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl border border-border bg-card shadow-xl">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <button onClick={onSelectAll} className="text-xs text-primary hover:underline">
                Zaznacz wszystko
              </button>
              <span className="text-xs text-muted-foreground">/</span>
              <button onClick={onDeselectAll} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                Odznacz
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {oneOnOneEntries.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Brak analiz 1:1
                </p>
              )}
              {oneOnOneEntries.map((entry) => {
                const checked = selectedIds.has(entry.id);
                const partner = entry.participants.find(
                  (p) => p.toLowerCase() !== selfName?.toLowerCase(),
                );
                return (
                  <button
                    key={entry.id}
                    onClick={() => onToggle(entry.id)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-secondary/50"
                  >
                    <span
                      className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        checked
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border'
                      }`}
                    >
                      {checked && <Check className="size-2.5" />}
                    </span>
                    <span className="flex-1 truncate text-sm">
                      {partner ?? entry.title}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                      {entry.messageCount.toLocaleString('pl-PL')}
                    </span>
                    {entry.hasQualitative && (
                      <span className="shrink-0 text-[10px] text-primary">AI</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
