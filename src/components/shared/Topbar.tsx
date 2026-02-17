'use client';

import { useSidebar } from '@/components/shared/SidebarContext';

/* ------------------------------------------------------------------ */
/*  Inline SVG icons                                                   */
/* ------------------------------------------------------------------ */

function HamburgerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 4.5H15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M3 9H15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M3 13.5H15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="7"
        cy="7"
        r="4.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M10.5 10.5L14 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9 3V12M9 12L5.5 8.5M9 12L12.5 8.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 13V14.5C3 15.3284 3.67157 16 4.5 16H13.5C14.3284 16 15 15.3284 15 14.5V13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="13"
        cy="4"
        r="2.25"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle
        cx="5"
        cy="9"
        r="2.25"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle
        cx="13"
        cy="14"
        r="2.25"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M7 7.8L11 5.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M7 10.2L11 12.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 5.5L7 8.5L10 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Topbar component                                                   */
/* ------------------------------------------------------------------ */

export function Topbar() {
  const { toggleCollapsed, breadcrumb } = useSidebar();

  return (
    <header
      className="sticky top-0 z-50 flex h-[var(--topbar-h)] shrink-0 items-center gap-4 border-b border-[#1a1a1a] px-4"
      style={{
        background: 'rgba(5, 5, 5, 0.75)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      {/* ---- Left: hamburger + breadcrumb ---- */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex items-center justify-center rounded-lg p-2 text-[#888888] transition-colors hover:bg-white/[0.05] hover:text-white"
          aria-label="Toggle sidebar"
        >
          <HamburgerIcon />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5">
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

      {/* ---- Center: search ---- */}
      <div className="mx-auto flex w-full max-w-[420px] items-center">
        <div className="group relative flex h-9 w-full items-center rounded-lg border border-[#1a1a1a] bg-white/[0.03] transition-colors focus-within:border-[#3b82f6] focus-within:shadow-[0_0_0_1px_rgba(59,130,246,0.15)]">
          <span className="pointer-events-none pl-3 text-[#555555]">
            <SearchIcon />
          </span>
          <input
            type="text"
            placeholder="Szukaj w analizie..."
            className="h-full flex-1 bg-transparent px-2.5 text-sm text-[#fafafa] placeholder:text-[#555555] outline-none"
          />
          <kbd className="mr-2.5 flex h-5 items-center gap-0.5 rounded border border-[#1a1a1a] bg-white/[0.03] px-1.5 font-mono text-[0.625rem] text-[#555555] select-none">
            <span className="text-[0.7rem]">{'\u2318'}</span>K
          </kbd>
        </div>
      </div>

      {/* ---- Right: actions ---- */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="flex items-center justify-center rounded-lg p-2 text-[#888888] transition-colors hover:bg-white/[0.05] hover:text-white"
          aria-label="Export PDF"
        >
          <DownloadIcon />
        </button>

        <button
          type="button"
          className="flex items-center justify-center rounded-lg p-2 text-[#888888] transition-colors hover:bg-white/[0.05] hover:text-white"
          aria-label="Share"
        >
          <ShareIcon />
        </button>

        {/* Divider */}
        <span
          className="mx-1 inline-block h-6 w-px bg-[#1a1a1a]"
          aria-hidden="true"
        />

        {/* Profile avatar */}
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg p-1.5 text-[#888888] transition-colors hover:bg-white/[0.05] hover:text-white"
          aria-label="Profile menu"
        >
          <span
            className="flex shrink-0 items-center justify-center rounded-lg text-[0.625rem] font-semibold text-white"
            style={{
              width: 30,
              height: 30,
              background:
                'linear-gradient(135deg, var(--chart-a), var(--chart-b))',
            }}
          >
            MK
          </span>
          <ChevronDownIcon />
        </button>
      </div>
    </header>
  );
}
