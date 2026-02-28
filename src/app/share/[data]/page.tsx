import type { Metadata } from 'next';
import { decodeShareData } from '@/lib/share/decode';
import SharedReport from '@/components/share/SharedReport';

interface SharePageProps {
  params: Promise<{ data: string }>;
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { data } = await params;
  const payload = decodeShareData(data);

  if (!payload) {
    return {
      title: 'PodTeksT \u2014 Link wygasł lub jest nieprawidłowy',
      description: 'Nie można zdekodować udostępnionej analizy.',
    };
  }

  const healthLabel = payload.healthScore !== null
    ? `Health Score: ${payload.healthScore}/100`
    : 'Analiza rozmowy';

  const description = payload.executiveSummary
    ? payload.executiveSummary.slice(0, 160)
    : `${payload.messageCount.toLocaleString('pl-PL')} wiadomości przeanalizowanych przez AI`;

  return {
    title: `PodTeksT — ${healthLabel}`,
    description,
    openGraph: {
      title: `PodTeksT — ${healthLabel}`,
      description,
      type: 'website',
      locale: 'pl_PL',
      images: [
        {
          url: '/og/share-default.png',
          width: 1200,
          height: 630,
          alt: 'PodTeksT — Analiza rozmowy',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `PodTeksT — ${healthLabel}`,
      description,
      images: ['/og/share-default.png'],
    },
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { data } = await params;
  const payload = decodeShareData(data);

  if (!payload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] p-4">
        <div className="max-w-md text-center">
          <div className="mb-4 text-5xl">🔗</div>
          <h1 className="mb-2 font-display text-xl font-bold text-foreground">
            Link wygasł lub jest nieprawidłowy
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Nie udało się zdekodować udostępnionej analizy. Link mógł zostać
            uszkodzony lub obcięty.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Przejdź do PodTeksT
          </a>
        </div>
      </div>
    );
  }

  return <SharedReport payload={payload} shareUrl={`${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://podtekst.app'}/share/${data}`} />;
}
