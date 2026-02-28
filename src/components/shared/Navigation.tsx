'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/shared/SidebarContext';
import PTLogo from '@/components/shared/PTLogo';
import BrandP from '@/components/shared/BrandP';
import {
  ChevronRight,
  Menu,
  X,
  ArrowLeft,
  Compass,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Route helpers                                                       */
/* ------------------------------------------------------------------ */

function extractAnalysisId(pathname: string): string | null {
  const match = pathname.match(/^\/analysis\/([^/]+)/);
  if (!match) return null;
  if (match[1] === 'new' || match[1] === 'compare') return null;
  return match[1];
}

function extractModeSlug(pathname: string): string | null {
  const match = pathname.match(/^\/analysis\/[^/]+\/([^/]+)/);
  return match ? match[1] : null;
}

const MODE_LABELS: Record<string, { label: string; accent: string }> = {
  roast: { label: 'Roast Arena', accent: '#ff4500' },
  court: { label: 'Sad Chatowy', accent: '#d4a853' },
  standup: { label: 'Stand-Up Comedy', accent: '#ff9f0a' },
  subtext: { label: 'Subtext Decoder', accent: '#00ff41' },
  dating: { label: 'Dating Profile', accent: '#ff006e' },
  simulator: { label: 'Reply Simulator', accent: '#0084ff' },
  delusion: { label: 'Delusion Quiz', accent: '#8b5cf6' },
  cps: { label: 'CPS Screening', accent: '#10b981' },
  moral: { label: 'Moral Foundations', accent: '#f97316' },
  emotions: { label: 'Emotion Causes', accent: '#06b6d4' },
  ai: { label: 'AI Deep Dive', accent: '#a855f7' },
  metrics: { label: 'Data Observatory', accent: '#3b82f6' },
  share: { label: 'Export Studio', accent: '#8b5cf6' },
  couple: { label: 'Couple View', accent: '#ec4899' },
  story: { label: 'Story Mode', accent: '#f59e0b' },
  wrapped: { label: 'Wrapped', accent: '#a855f7' },
  capitalization: { label: 'Kapitalizacja', accent: '#ec4899' },
};

/* ------------------------------------------------------------------ */
/*  Nav link definitions (for app pages only)                           */
/* ------------------------------------------------------------------ */

interface NavLink {
  href: string;
  label: string;
}

const MAIN_LINKS: NavLink[] = [
  { href: '/dashboard', label: 'Analizy' },
  { href: '/analysis/new', label: 'Nowa analiza' },
  { href: '/analysis/compare', label: 'Porownanie' },
  { href: '/settings', label: 'Ustawienia' },
];

/* ------------------------------------------------------------------ */
/*  Chevron separator                                                    */
/* ------------------------------------------------------------------ */

function BreadcrumbSep() {
  return <ChevronRight className="size-3 text-[#333] shrink-0" />;
}

/* ------------------------------------------------------------------ */
/*  CinematicNav — floating transparent top bar                        */
/* ------------------------------------------------------------------ */

export function CinematicNav() {
  const { breadcrumb } = useSidebar();
  const pathname = usePathname();
  const analysisId = extractAnalysisId(pathname);
  const modeSlug = extractModeSlug(pathname);
  const isOnAnalysis = !!analysisId;
  const isOnMode = isOnAnalysis && !!modeSlug;
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const conversationTitle = breadcrumb.length > 1 ? breadcrumb[1] : null;
  const modeInfo = modeSlug ? MODE_LABELS[modeSlug] : null;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  /* ── Desktop center content ── */
  const renderDesktopCenter = () => {
    // On analysis pages: show breadcrumbs
    if (isOnAnalysis && conversationTitle) {
      return (
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/dashboard"
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-400 transition-colors hover:text-[#999]"
          >
            Analizy
          </Link>
          <BreadcrumbSep />
          <Link
            href={`/analysis/${analysisId}`}
            className={cn(
              'font-mono text-[11px] uppercase tracking-[0.12em] transition-colors max-w-[200px] truncate',
              isOnMode ? 'text-zinc-400 hover:text-[#999]' : 'text-white',
            )}
          >
            {conversationTitle}
          </Link>
          {isOnMode && modeInfo && (
            <>
              <BreadcrumbSep />
              <span
                className="font-mono text-[11px] uppercase tracking-[0.12em] font-medium"
                style={{ color: modeInfo.accent }}
              >
                {modeInfo.label}
              </span>
            </>
          )}
        </div>
      );
    }

    // On app pages: show nav links
    return (
      <div className="hidden items-center gap-8 md:flex">
        {MAIN_LINKS.map((link) => {
          const isActive = pathname === link.href
            || (link.href !== '/dashboard' && pathname.startsWith(`${link.href}/`));

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'relative font-mono text-[11px] uppercase tracking-[0.12em] transition-colors duration-200',
                isActive
                  ? 'text-white'
                  : 'text-zinc-400 hover:text-[#999]',
              )}
            >
              {link.label}
              {isActive && (
                <span className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              )}
            </Link>
          );
        })}
      </div>
    );
  };

  /* ── Mobile menu content ── */
  const renderMobileMenu = () => {
    if (isOnAnalysis) {
      return (
        <div className="flex flex-col gap-0.5">
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-3 font-mono text-[12px] uppercase tracking-[0.15em] border-b border-white/[0.04] text-[#666] hover:text-white transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Wszystkie analizy
          </Link>
          {isOnMode && analysisId && (
            <Link
              href={`/analysis/${analysisId}`}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 py-3 font-mono text-[12px] uppercase tracking-[0.15em] border-b border-white/[0.04] text-[#666] hover:text-white transition-colors"
            >
              <Compass className="size-3.5" />
              Command Center
            </Link>
          )}
          {conversationTitle && (
            <div className="py-3 font-mono text-[12px] uppercase tracking-[0.15em] text-white/40 border-b border-white/[0.04]">
              {conversationTitle}
            </div>
          )}
          {isOnMode && modeInfo && (
            <div
              className="py-3 font-mono text-[12px] uppercase tracking-[0.15em] font-medium"
              style={{ color: modeInfo.accent }}
            >
              {modeInfo.label}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-0.5">
        {MAIN_LINKS.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                'py-3 font-mono text-[12px] uppercase tracking-[0.15em] border-b border-white/[0.04] transition-colors',
                isActive ? 'text-white' : 'text-[#666] hover:text-white',
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <nav
        ref={navRef}
        className={cn(
          'fixed top-0 left-0 right-0 z-50 h-16',
          'transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
          scrolled
            ? 'bg-[#050505]/80 backdrop-blur-2xl border-b border-white/[0.06]'
            : 'bg-transparent border-b border-transparent',
        )}
      >
        <div className="flex h-full items-center justify-between px-6 sm:px-10">
          {/* ── Left: Logo + Brand ── */}
          <Link
            href="/"
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <PTLogo size={32} className="shrink-0" />
            <span className="brand-logo font-display text-[17px] font-bold tracking-tight flex items-center">
              <BrandP height="0.9em" /><span className="text-[#3b82f6]">od</span><span className="text-[#a855f7]">T</span><span className="brand-eks text-[#a855f7]">eks</span><span className="text-[#a855f7]">T</span>
            </span>
          </Link>

          {/* ── Center: contextual content ── */}
          {renderDesktopCenter()}

          {/* ── Right: mobile menu toggle ── */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center justify-center p-3 -m-1 text-zinc-400 transition-colors hover:text-white md:hidden"
              aria-label={mobileMenuOpen ? 'Zamknij menu' : 'Otwórz menu'}
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile menu overlay ── */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-16 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#0a0a0a]/95 backdrop-blur-2xl px-6 py-5">
            {renderMobileMenu()}
          </div>
        </>
      )}

      {/* Spacer — push content below the fixed nav bar */}
      <div className="h-16" />
    </>
  );
}

// Keep backward-compatible named export
export { CinematicNav as Navigation };
