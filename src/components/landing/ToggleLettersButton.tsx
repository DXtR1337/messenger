'use client';

import { useState, useEffect } from 'react';

export default function ToggleLettersButton() {
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Show only after curtain reveal is done (~4s)
    const timer = setTimeout(() => setMounted(true), 4500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('toggle-letters', { detail: { hidden } }));
  }, [hidden]);

  if (!mounted) return null;

  return (
    <button
      onClick={() => setHidden((h) => !h)}
      className="fixed bottom-4 left-4 z-[999] flex size-8 items-center justify-center rounded-lg border border-border bg-card/80 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-card hover:text-foreground"
      aria-label={hidden ? 'Pokaż logo' : 'Ukryj logo'}
      title={hidden ? 'Pokaż logo' : 'Ukryj logo'}
    >
      {hidden ? (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M2 2l12 12" />
          <path d="M6.5 6.5a2 2 0 002.8 2.8" />
          <path d="M3.6 3.6C2.2 4.8 1.2 6.3 1 8c.8 3.1 3.8 5.4 7 5.4 1.3 0 2.5-.3 3.5-.9" />
          <path d="M10 4.2A7.2 7.2 0 0115 8c-.2.8-.6 1.6-1 2.3" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" />
          <circle cx="8" cy="8" r="2" />
        </svg>
      )}
    </button>
  );
}
