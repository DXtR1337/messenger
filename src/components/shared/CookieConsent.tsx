'use client';

import { useState, useEffect } from 'react';

export default function CookieConsent() {
  const [consent, setConsent] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('podtekst-cookie-consent');
    if (stored !== null) {
      setConsent(stored === 'true');
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('podtekst-cookie-consent', 'true');
    setConsent(true);
    // Reload to activate GA4
    window.location.reload();
  };

  const handleReject = () => {
    localStorage.setItem('podtekst-cookie-consent', 'false');
    setConsent(false);
  };

  // Don't show if already decided, or still loading
  if (consent !== null) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[9998] border-t border-border bg-card/95 backdrop-blur-sm p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Używamy plików cookie Google Analytics do analityki ruchu. Żadne dane osobowe nie są zbierane.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={handleReject}
            className="rounded-lg border border-border px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            Odrzucam
          </button>
          <button
            onClick={handleAccept}
            className="rounded-lg bg-primary px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Akceptuję
          </button>
        </div>
      </div>
    </div>
  );
}
