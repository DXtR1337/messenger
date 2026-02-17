'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/shared/SidebarContext';

/* ------------------------------------------------------------------ */
/*  Nav item definitions                                               */
/* ------------------------------------------------------------------ */

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

function GridIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="2"
        y="2"
        width="5.5"
        height="5.5"
        rx="1.25"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="10.5"
        y="2"
        width="5.5"
        height="5.5"
        rx="1.25"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="2"
        y="10.5"
        width="5.5"
        height="5.5"
        rx="1.25"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="10.5"
        y="10.5"
        width="5.5"
        height="5.5"
        rx="1.25"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9 12V3M9 3L5.5 6.5M9 3L12.5 6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 11V13.5C3 14.3284 3.67157 15 4.5 15H13.5C14.3284 15 15 14.3284 15 13.5V11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.5 2H5.5C4.67157 2 4 2.67157 4 3.5V14.5C4 15.3284 4.67157 16 5.5 16H12.5C13.3284 16 14 15.3284 14 14.5V5.5L10.5 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 2V6H14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 9.5H11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M7 12H11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Section definitions                                                */
/* ------------------------------------------------------------------ */

interface NavSection {
  label: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    label: 'ANALIZA',
    items: [
      { href: '/dashboard', label: 'Przegl\u0105d', icon: <GridIcon /> },
      { href: '/analysis/new', label: 'Nowa analiza', icon: <UploadIcon /> },
    ],
  },
  {
    label: 'NARZ\u0118DZIA',
    items: [
      { href: '/dashboard', label: 'Historia analiz', icon: <FileIcon /> },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Navigation component                                               */
/* ------------------------------------------------------------------ */

export function Navigation() {
  const { collapsed } = useSidebar();
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-[#1a1a1a] bg-[#0a0a0a]',
        'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
        collapsed ? 'w-[var(--sidebar-collapsed-w)]' : 'w-[var(--sidebar-w)]'
      )}
    >
      {/* ---- Brand ---- */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-[#1a1a1a]">
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          className="shrink-0"
        >
          <path
            d="M14 2C7.4 2 2 6.9 2 13c0 3.1 1.5 5.8 3.8 7.7V26l4.9-2.7c1 .3 2.1.4 3.3.4 6.6 0 12-4.9 12-10.7S20.6 2 14 2z"
            fill="url(#brand)"
            opacity="0.9"
          />
          <circle cx="9" cy="13" r="1.5" fill="#fafafa" />
          <circle cx="14" cy="13" r="1.5" fill="#fafafa" />
          <circle cx="19" cy="13" r="1.5" fill="#fafafa" />
          <defs>
            <linearGradient id="brand" x1="2" y1="2" x2="26" y2="26">
              <stop stopColor="#3b82f6" />
              <stop offset="1" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>
        {!collapsed && (
          <span className="font-display text-base font-bold tracking-tight whitespace-nowrap">
            Chat<span className="text-[#a855f7]">Scope</span>
          </span>
        )}
      </div>

      {/* ---- Nav sections ---- */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pt-4">
        {sections.map((section, sectionIdx) => (
          <div key={section.label} className={cn(sectionIdx > 0 && 'mt-5')}>
            {/* Section label — hidden when collapsed */}
            {!collapsed && (
              <span className="block px-2 pb-2 font-display text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[#555555] select-none">
                {section.label}
              </span>
            )}

            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' &&
                    pathname.startsWith(`${item.href}/`));

                return (
                  <li key={`${section.label}-${item.label}`}>
                    <Link
                      href={item.href}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors',
                        'text-[#888888] hover:bg-white/[0.04] hover:text-[#fafafa]',
                        collapsed && 'justify-center px-0',
                        isActive &&
                          'bg-[rgba(59,130,246,0.1)] text-[#fafafa]'
                      )}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#3b82f6]" />
                      )}

                      <span className="shrink-0">{item.icon}</span>

                      {!collapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ---- Footer — user card ---- */}
      <div className="border-t border-[#1a1a1a] px-3 py-3">
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.04]',
            collapsed && 'justify-center px-0'
          )}
        >
          {/* Avatar */}
          <span
            className="flex shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white"
            style={{
              width: 34,
              height: 34,
              background: 'linear-gradient(135deg, var(--chart-a), var(--chart-b))',
            }}
          >
            MK
          </span>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#fafafa]">
                U\u017cytkownik
              </p>
              <p className="truncate text-xs text-[#555555]">Free plan</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
