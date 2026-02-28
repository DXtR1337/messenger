import Link from 'next/link';
import PTLogo from '@/components/shared/PTLogo';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground">
      <PTLogo size={48} className="mb-8" />
      <h1 className="mb-3 font-display text-6xl font-bold tracking-tight">404</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Strona nie została znaleziona
      </p>
      <Link
        href="/"
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        Wróć na stronę główną
      </Link>
    </div>
  );
}
