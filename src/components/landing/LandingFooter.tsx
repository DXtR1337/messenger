import Link from 'next/link';
import BrandP from '@/components/shared/BrandP';

export default function LandingFooter() {
  return (
    <footer className="border-t border-border py-16 px-6">
      {/* Gradient divider */}
      <div
        style={{
          height: '1px',
          background:
            'linear-gradient(90deg, transparent, rgba(59,130,246,0.3), rgba(168,85,247,0.3), transparent)',
          marginBottom: '4rem',
        }}
      />

      <div className="mx-auto max-w-5xl">
        {/* 4-column grid */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Brand */}
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="brand-logo font-display text-lg font-extrabold tracking-tight text-foreground"
            >
              <BrandP height="0.85em" /><span className="text-[#3b82f6]">od</span><span className="text-[#a855f7]">T</span><span className="brand-eks text-[#a855f7]">eks</span><span className="text-[#a855f7]">T</span>
            </Link>
            <p className="font-story-body text-sm italic text-muted-foreground">
              odkryj to, co kryje się między wierszami
            </p>
          </div>

          {/* Column 2: Produkt */}
          <div className="flex flex-col gap-4">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">
              Produkt
            </span>
            <ul className="flex flex-col gap-3">
              <li>
                <Link
                  href="/analysis/new"
                  className="text-sm text-[#888888] hover:text-foreground transition-colors"
                >
                  Analizuj
                </Link>
              </li>
              <li>
                <a
                  href="#social-proof"
                  className="text-sm text-[#888888] hover:text-foreground transition-colors"
                >
                  Karty do pobrania
                </a>
              </li>
              <li>
                <a
                  href="#demo"
                  className="text-sm text-[#888888] hover:text-foreground transition-colors"
                >
                  Wzorce komunikacyjne
                </a>
              </li>
              <li>
                <a
                  href="#demo"
                  className="text-sm text-[#888888] hover:text-foreground transition-colors"
                >
                  Demo
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Analiza */}
          <div className="flex flex-col gap-4">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">
              Analiza
            </span>
            <ul className="flex flex-col gap-3">
              <li>
                <a
                  href="#demo"
                  className="text-sm text-[#888888] hover:text-foreground transition-colors"
                >
                  Profil osobowości
                </a>
              </li>
              <li>
                <a
                  href="#demo"
                  className="text-sm text-[#888888] hover:text-foreground transition-colors"
                >
                  Viral Scores
                </a>
              </li>
              <li>
                <a
                  href="#demo"
                  className="text-sm text-[#888888] hover:text-foreground transition-colors"
                >
                  Red Flag Report
                </a>
              </li>
              <li>
                <a
                  href="#demo"
                  className="text-sm text-[#888888] hover:text-foreground transition-colors"
                >
                  Styl przywiązania
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Informacje */}
          <div className="flex flex-col gap-4">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">
              Informacje
            </span>
            <ul className="flex flex-col gap-3">
              <li>
                <a
                  href="#faq"
                  className="text-sm text-[#888888] hover:text-foreground transition-colors"
                >
                  Jak eksportować
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  className="text-sm text-[#888888] hover:text-foreground transition-colors"
                >
                  Prywatność
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  className="text-sm text-[#888888] hover:text-foreground transition-colors"
                >
                  FAQ
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="font-mono text-xs text-[#888888]">
            &copy; 2026 PodTeksT
          </p>
          <p className="font-mono text-xs text-[#888888]">
            Zbudowane z 🔬 przez PodTeksT
          </p>
        </div>
      </div>
    </footer>
  );
}
