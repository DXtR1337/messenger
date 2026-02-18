'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSidebar } from '@/components/shared/SidebarContext';

/* ------------------------------------------------------------------ */
/*  Inline SVG icons                                                   */
/* ------------------------------------------------------------------ */

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M3 4.5H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 9H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 13.5H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Topbar component                                                   */
/* ------------------------------------------------------------------ */

export function Topbar() {
  const { toggleCollapsed, breadcrumb } = useSidebar();
  const pathname = usePathname();
  const [showCTA, setShowCTA] = useState<boolean>(false);

  useEffect(() => {
    if (pathname !== '/') {
      setShowCTA(false);
      return;
    }

    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        setShowCTA(window.scrollY > window.innerHeight * 0.8);
        rafId = null;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Check initial scroll position
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [pathname]);

  return (
    <header
      className="sticky top-0 z-50 flex h-[var(--topbar-h)] shrink-0 items-center gap-2 sm:gap-4 border-b border-[#1a1a1a] px-3 sm:px-4"
      style={{
        background: 'rgba(5, 5, 5, 0.75)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      {/* ---- Left: hamburger + breadcrumb ---- */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex items-center justify-center rounded-lg p-2 text-[#888888] transition-colors hover:bg-white/[0.05] hover:text-white"
          aria-label="Przełącz panel boczny"
        >
          <HamburgerIcon />
        </button>

        <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5">
          {breadcrumb.map((item, idx) => (
            <span key={`${item}-${idx}`} className="flex items-center gap-1.5">
              {idx > 0 && (
                <span className="text-xs text-[#555555] select-none">/</span>
              )}
              <span
                className={
                  idx === breadcrumb.length - 1
                    ? 'text-sm font-medium text-[#fafafa]'
                    : 'text-sm text-[#888888]'
                }
              >
                {item}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* ---- Spacer ---- */}
      <div className="flex-1" />

      {/* ---- Right: actions ---- */}
      <div className="flex items-center gap-1">
        {showCTA && (
          <Link
            href="/analysis/new"
            className="hidden items-center rounded-lg bg-primary px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-primary-foreground transition-all duration-300 hover:bg-primary/90 md:inline-flex"
            style={{
              animation: 'heroFadeSlideUp 0.3s ease-out both',
            }}
          >
            Analizuj
          </Link>
        )}
      </div>
    </header>
  );
}
