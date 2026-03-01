'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, Check, Users, X } from 'lucide-react';
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

  const oneOnOneEntries = useMemo(
    () => entries.filter((e) => e.participants.length === 2),
    [entries],
  );

  const selectedCount = selectedIds.size;

  return (
    <div className="space-y-3">
      {/* Title row */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
          <Users className="size-5 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl font-bold">
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
            {selectedCount === 0
              ? 'Wybierz analizy do porównania'
              : `${selectedCount} ${selectedCount === 1 ? 'analiza' : selectedCount < 5 ? 'analizy' : 'analiz'} wybranych`}
            {selfName && ` \u00b7 Wspólny uczestnik: ${selfName}`}
          </p>
        </div>
      </div>

      {/* Multi-select picker */}
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-border-hover"
        >
          <div className="flex-1 min-w-0">
            {selectedCount === 0 ? (
              <p className="text-sm text-muted-foreground">
                Kliknij, żeby wybrać analizy...
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {oneOnOneEntries
                  .filter((e) => selectedIds.has(e.id))
                  .slice(0, 6)
                  .map((e) => (
                    <span
                      key={e.id}
                      className="inline-flex items-center gap-1 rounded-md bg-secondary/60 px-2 py-0.5 text-xs font-medium"
                    >
                      {e.title}
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onToggle(e.id);
                        }}
                        className="ml-0.5 rounded-sm p-0.5 hover:bg-secondary"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                {selectedCount > 6 && (
                  <span className="inline-flex items-center rounded-md bg-secondary/40 px-2 py-0.5 text-xs text-muted-foreground">
                    +{selectedCount - 6}
                  </span>
                )}
              </div>
            )}
          </div>
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">
            {selectedCount}/{oneOnOneEntries.length}
          </span>
          <ChevronDown
            className={`size-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-border bg-card shadow-xl">
            {/* Actions */}
            <div className="flex items-center gap-2 border-b border-border px-4 py-2">
              <button
                onClick={onSelectAll}
                className="text-xs text-primary hover:underline"
              >
                Zaznacz wszystko
              </button>
              <span className="text-xs text-muted-foreground">/</span>
              <button
                onClick={onDeselectAll}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Odznacz
              </button>
            </div>

            {/* List */}
            <div className="max-h-72 overflow-y-auto py-1">
              {oneOnOneEntries.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Brak analiz 1:1 do porównania
                </p>
              )}
              {oneOnOneEntries.map((entry) => {
                const checked = selectedIds.has(entry.id);
                return (
                  <button
                    key={entry.id}
                    onClick={() => onToggle(entry.id)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-secondary/50"
                  >
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        checked
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border'
                      }`}
                    >
                      {checked && <Check className="size-3" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm">{entry.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.participants.join(', ')} &bull;{' '}
                        {entry.messageCount.toLocaleString('pl-PL')} wiad.
                        {entry.hasQualitative && (
                          <span className="ml-1 text-primary">AI</span>
                        )}
                      </p>
                    </div>
                    {entry.healthScore != null && (
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {entry.healthScore}/100
                      </span>
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
