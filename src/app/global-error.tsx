'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pl" className="dark">
      <body className="bg-[#050505] text-white font-sans antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center p-6">
          <h2 className="mb-4 text-xl font-bold">Coś poszło nie tak</h2>
          <p className="mb-6 text-sm text-gray-400">{error.message}</p>
          <button
            onClick={reset}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700"
          >
            Spróbuj ponownie
          </button>
        </div>
      </body>
    </html>
  );
}
