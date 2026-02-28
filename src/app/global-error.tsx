'use client';

import { useEffect, useState } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  const handleClearCache = () => {
    try {
      localStorage.clear();
      const req = indexedDB.deleteDatabase('podtekst');
      req.onsuccess = () => window.location.reload();
      req.onerror = () => window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  return (
    <html lang="pl" className="dark">
      <body className="bg-[#050505] text-white font-sans antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
          <h1 className="mb-2 text-2xl font-bold">Coś poszło nie tak</h1>
          <p className="mb-6 max-w-md text-sm text-[#a8a8a8]">
            Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę lub wyczyść dane lokalne.
          </p>

          <div className="flex gap-3 mb-4">
            <button
              onClick={reset}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Spróbuj ponownie
            </button>
            <button
              onClick={handleClearCache}
              className="rounded-lg border border-[#2a2a2a] bg-[#111] px-5 py-2.5 text-sm font-medium hover:bg-[#1a1a1a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Wyczyść dane
            </button>
          </div>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-[#666] hover:text-[#999] underline underline-offset-2"
          >
            {showDetails ? 'Ukryj szczegóły' : 'Pokaż szczegóły błędu'}
          </button>

          {showDetails && (
            <div className="mt-3 max-w-lg rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-4 text-left">
              <p className="text-xs font-mono text-[#ef4444] break-all">
                {error.message || 'Unknown error'}
              </p>
              {error.digest && (
                <p className="mt-2 text-xs font-mono text-[#666]">
                  Digest: {error.digest}
                </p>
              )}
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
