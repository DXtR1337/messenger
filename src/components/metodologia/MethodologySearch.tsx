'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';

interface MethodologySearchProps {
  onSearch: (query: string) => void;
}

export default function MethodologySearch({ onSearch }: MethodologySearchProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleChange = useCallback(
    (v: string) => {
      setValue(v);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onSearch(v), 150);
    },
    [onSearch],
  );

  const handleClear = useCallback(() => {
    setValue('');
    onSearch('');
    inputRef.current?.focus();
  }, [onSearch]);

  // ⌘K / Ctrl+K to focus
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        handleClear();
        inputRef.current?.blur();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClear]);

  return (
    <div className="sticky top-0 z-20 -mx-6 px-6 pb-6 pt-2" style={{ background: 'linear-gradient(to bottom, #050505 70%, transparent)' }}>
      <div
        className="relative flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors focus-within:border-[#3b82f6]/40"
        style={{
          background: '#111111',
          borderColor: '#1a1a1a',
        }}
      >
        <Search className="size-4 shrink-0 text-[#555555]" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Szukaj algorytmu..."
          className="min-w-0 flex-1 bg-transparent font-[family-name:var(--font-story-body)] text-sm text-foreground outline-none placeholder:text-[#444444]"
        />
        {value ? (
          <button
            onClick={handleClear}
            className="shrink-0 rounded-md p-1 text-[#555555] transition-colors hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        ) : (
          <kbd className="hidden shrink-0 rounded-md border border-[#1a1a1a] bg-[#0a0a0a] px-1.5 py-0.5 font-mono text-[10px] text-[#444444] sm:inline">
            ⌘K
          </kbd>
        )}
      </div>
    </div>
  );
}
