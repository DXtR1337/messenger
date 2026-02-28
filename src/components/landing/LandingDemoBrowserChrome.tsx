'use client';

import type React from 'react';

// ═══════════════════════════════════════════════════════════
// BROWSER CHROME — macOS-style browser frame for demo slides
// ═══════════════════════════════════════════════════════════

export interface BrowserChromeProps {
  children: React.ReactNode;
  onShare?: () => void;
}

export function BrowserChrome({ children, onShare }: BrowserChromeProps) {
  return (
    <div
      className="flex w-full flex-1 flex-col overflow-hidden rounded-xl border border-border"
      style={{
        background: 'var(--bg-card, #111111)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)',
      }}
    >
      <div className="flex h-10 items-center gap-2 border-b border-border px-3 sm:h-12 sm:gap-3 sm:px-4" style={{ background: 'rgba(255,255,255,0.015)' }}>
        <div className="flex items-center gap-1.5">
          <div className="size-2 rounded-full sm:size-2.5" style={{ background: '#ff5f5740' }} />
          <div className="size-2 rounded-full sm:size-2.5" style={{ background: '#febc2e40' }} />
          <div className="size-2 rounded-full sm:size-2.5" style={{ background: '#28c84040' }} />
        </div>
        <div className="mx-auto flex max-w-sm flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-0.5 sm:px-3 sm:py-1" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0 text-muted-foreground opacity-40"><rect x="1.5" y="4.5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1" /><path d="M3 4.5V3a2 2 0 0 1 4 0v1.5" stroke="currentColor" strokeWidth="1" fill="none" /></svg>
          <span className="truncate font-mono text-[10px] text-muted-foreground sm:text-xs">podtekst.app/analysis/demo</span>
        </div>
        {onShare && (
          <button onClick={onShare} className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground" aria-label="Udostępnij">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8v5a1 1 0 001 1h6a1 1 0 001-1V8" /><polyline points="12 4 8 1 4 4" /><line x1="8" y1="1" x2="8" y2="10" /></svg>
          </button>
        )}
      </div>
      <div className="relative h-[55vh] overflow-y-auto p-3 sm:h-[60vh] sm:p-4 md:h-[65vh] md:p-5" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
        <div style={{ zoom: 0.82 }}>{children}</div>
      </div>
    </div>
  );
}
