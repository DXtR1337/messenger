'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="font-mono text-sm uppercase tracking-widest text-muted-foreground">Błąd</div>
      <h2 className="text-xl font-semibold text-foreground">Coś poszło nie tak</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę.
      </p>
      <button
        onClick={reset}
        className="mt-2 rounded-lg border border-border px-5 py-2 font-mono text-xs uppercase tracking-wider text-foreground transition-colors hover:bg-card"
      >
        Spróbuj ponownie
      </button>
    </div>
  );
}
