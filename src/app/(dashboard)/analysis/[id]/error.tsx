'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AnalysisError({
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
      <h2 className="text-xl font-semibold text-foreground">Nie udało się załadować analizy</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Analiza mogła zostać usunięta lub wystąpił błąd podczas ładowania.
      </p>
      <div className="mt-2 flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg border border-border px-5 py-2 font-mono text-xs uppercase tracking-wider text-foreground transition-colors hover:bg-card"
        >
          Spróbuj ponownie
        </button>
        <Link
          href="/dashboard"
          className="rounded-lg border border-border px-5 py-2 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
        >
          Wróć do panelu
        </Link>
      </div>
    </div>
  );
}
