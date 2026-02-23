'use client';

import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/shared/SidebarContext';
import PTLogo from '@/components/shared/PTLogo';
import BrandP from '@/components/shared/BrandP';
import {
  LayoutDashboard,
  BarChart3,
  Brain,
  Gamepad2,
  Share2,
  Activity,
  Shield,
  Trophy,
  MessageSquare,
  Clock,
  Flame,
  Sparkles,
  Heart,
  Zap,
  Laugh,
  Scale,
  Search,
  Image,
  FileText,
  Lock,
  Settings,
} from 'lucide-react';
import { useTier } from '@/lib/tiers/tier-context';
import UserMenu from '@/components/auth/UserMenu';

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
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="2" y="2" width="5.5" height="5.5" rx="1.25" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10.5" y="2" width="5.5" height="5.5" rx="1.25" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="10.5" width="5.5" height="5.5" rx="1.25" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10.5" y="10.5" width="5.5" height="5.5" rx="1.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M9 12V3M9 3L5.5 6.5M9 3L12.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 11V13.5C3 14.3284 3.67157 15 4.5 15H13.5C14.3284 15 15 14.3284 15 13.5V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M10.5 2H5.5C4.67157 2 4 2.67157 4 3.5V14.5C4 15.3284 4.67157 16 5.5 16H12.5C13.3284 16 14 15.3284 14 14.5V5.5L10.5 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 2V6H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 9.5H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 12H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4.5 4.5L13.5 13.5M13.5 4.5L4.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Analysis tab definitions                                           */
/* ------------------------------------------------------------------ */

interface AnalysisTab {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  color: string;
  bgColor: string;
  subcategories: Array<{ icon: typeof Activity; label: string; anchorId: string; locked?: boolean }>;
}

const ANALYSIS_TABS: AnalysisTab[] = [
  {
    id: 'overview', label: 'Przegląd', icon: LayoutDashboard,
    color: 'text-blue-400', bgColor: 'bg-blue-500/10',
    subcategories: [
      { icon: Activity, label: 'Health Score', anchorId: 'section-health-score' },
      { icon: Shield, label: 'Flagi & Odznaki', anchorId: 'section-badges' },
      { icon: Trophy, label: 'Ranking', anchorId: 'section-ranking' },
    ],
  },
  {
    id: 'metrics', label: 'Metryki', icon: BarChart3,
    color: 'text-emerald-400', bgColor: 'bg-emerald-500/10',
    subcategories: [
      { icon: MessageSquare, label: 'Wiadomości & Słowa', anchorId: 'section-messages' },
      { icon: Clock, label: 'Czas odpowiedzi', anchorId: 'section-response-time' },
      { icon: Flame, label: 'Aktywność & Heatmapa', anchorId: 'section-activity' },
    ],
  },
  {
    id: 'ai', label: 'AI Insights', icon: Brain,
    color: 'text-purple-400', bgColor: 'bg-purple-500/10',
    subcategories: [
      { icon: Sparkles, label: 'Profile psychologiczne', anchorId: 'section-profiles', locked: true },
      { icon: Heart, label: 'Dynamika relacji', anchorId: 'section-dynamics', locked: true },
      { icon: Zap, label: 'Synteza & Prognozy', anchorId: 'section-synthesis', locked: true },
    ],
  },
  {
    id: 'entertainment', label: 'Rozrywka', icon: Gamepad2,
    color: 'text-orange-400', bgColor: 'bg-orange-500/10',
    subcategories: [
      { icon: Laugh, label: 'Roast & Stand-Up', anchorId: 'section-viral' },
      { icon: Scale, label: 'Sąd & Profil randkowy', anchorId: 'section-court', locked: true },
      { icon: Search, label: 'CPS & Podteksty', anchorId: 'section-cps', locked: true },
    ],
  },
  {
    id: 'share', label: 'Udostępnij', icon: Share2,
    color: 'text-cyan-400', bgColor: 'bg-cyan-500/10',
    subcategories: [
      { icon: Image, label: 'Karty do udostępnienia', anchorId: 'section-cards' },
      { icon: FileText, label: 'Eksport PDF', anchorId: 'section-export', locked: true },
    ],
  },
];

/** Returns true when the user is viewing a specific analysis result page */
function isAnalysisPage(pathname: string): boolean {
  return /^\/analysis\/[^/]+$/.test(pathname) && pathname !== '/analysis/new' && pathname !== '/analysis/compare';
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
      { href: '/dashboard', label: 'Przegląd', icon: <GridIcon /> },
      { href: '/analysis/new', label: 'Nowa analiza', icon: <UploadIcon /> },
    ],
  },
  {
    label: 'NARZĘDZIA',
    items: [
      { href: '/analysis/compare', label: 'Porównanie analiz', icon: <FileIcon /> },
      { href: '/settings', label: 'Ustawienia', icon: <Settings className="size-[18px]" /> },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Navigation component                                               */
/* ------------------------------------------------------------------ */

export function Navigation() {
  const { collapsed, isMobile, mobileOpen, setMobileOpen } = useSidebar();
  const pathname = usePathname();

  // Mobile: overlay drawer
  if (isMobile) {
    return (
      <>
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <aside
          className={cn(
            'fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col border-r border-[#1a1a1a] bg-[#0a0a0a] pb-[env(safe-area-inset-bottom)]',
            'transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <SidebarContent
            collapsed={false}
            pathname={pathname}
            onNavigate={() => setMobileOpen(false)}
            showClose
            onClose={() => setMobileOpen(false)}
          />
        </aside>
      </>
    );
  }

  // Desktop: fixed sidebar
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-[#1a1a1a] bg-[#0a0a0a]',
        'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
        collapsed ? 'w-[var(--sidebar-collapsed-w)]' : 'w-[var(--sidebar-w)]'
      )}
    >
      <SidebarContent collapsed={collapsed} pathname={pathname} />
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar inner content (shared between mobile & desktop)            */
/* ------------------------------------------------------------------ */

function SidebarContent({
  collapsed,
  pathname,
  onNavigate,
  showClose,
  onClose,
}: {
  collapsed: boolean;
  pathname: string;
  onNavigate?: () => void;
  showClose?: boolean;
  onClose?: () => void;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { tier } = useTier();
  const showAnalysisTabs = isAnalysisPage(pathname);
  const activeTab = searchParams.get('tab') || 'overview';

  const handleTabClick = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onNavigate?.();
  };

  return (
    <>
      {/* ---- Brand ---- */}
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4 border-b border-[#1a1a1a]">
        <Link
          href="/"
          className={cn(
            'flex items-center gap-3 transition-opacity hover:opacity-80',
            collapsed ? 'justify-center w-full' : ''
          )}
        >
          <PTLogo size={collapsed ? 24 : 28} className="shrink-0" />
          {!collapsed && (
            <span className="brand-logo font-display text-base font-bold tracking-tight whitespace-nowrap leading-none flex items-center">
              <BrandP height="0.85em" /><span className="text-[#3b82f6]">od</span><span className="text-[#a855f7]">T</span><span className="brand-eks text-[#a855f7]">eks</span><span className="text-[#a855f7]">T</span>
            </span>
          )}
        </Link>
        {showClose && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij panel boczny"
            className="flex items-center justify-center rounded-lg p-1.5 text-[#888888] transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            <CloseIcon />
          </button>
        )}
      </div>

      {/* ---- Nav sections ---- */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pt-4">
        {sections.map((section, sectionIdx) => (
          <div key={section.label} className={cn(sectionIdx > 0 && 'mt-5')}>
            {!collapsed && (
              <span className="block px-2 pb-2 font-display text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[#555555] select-none">
                {section.label}
              </span>
            )}
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));

                return (
                  <li key={`${section.label}-${item.label}`}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors',
                        'text-[#888888] hover:bg-white/[0.04] hover:text-[#fafafa]',
                        collapsed && 'justify-center px-0',
                        isActive && 'bg-[rgba(59,130,246,0.1)] text-[#fafafa]'
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#3b82f6]" />
                      )}
                      <span className="shrink-0">{item.icon}</span>
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {/* ---- Analysis Tabs — only on analysis result pages ---- */}
        {showAnalysisTabs && (
          <div className="mt-5">
            {!collapsed && (
              <span className="block px-2 pb-2 font-display text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[#555555] select-none">
                Sekcje
              </span>
            )}
            <ul className="flex flex-col gap-0.5">
              {ANALYSIS_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <li key={tab.id}>
                    <button
                      onClick={() => handleTabClick(tab.id)}
                      className={cn(
                        'group relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors text-left',
                        collapsed && 'justify-center px-0',
                        isActive
                          ? `${tab.bgColor} ${tab.color}`
                          : 'text-[#888888] hover:bg-white/[0.04] hover:text-[#fafafa]',
                      )}
                    >
                      {isActive && (
                        <span
                          className={cn(
                            'absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full',
                            tab.color.replace('text-', 'bg-'),
                          )}
                        />
                      )}
                      <Icon className={cn('size-[18px] shrink-0', isActive ? tab.color : 'text-[#888888] group-hover:text-[#fafafa]')} />
                      {!collapsed && <span className="truncate">{tab.label}</span>}
                    </button>
                    {/* Subcategories — visible when active & sidebar not collapsed */}
                    {isActive && !collapsed && tab.subcategories.length > 0 && (
                      <ul className="ml-[21px] mt-0.5 space-y-px border-l border-white/10 pl-3 pb-1">
                        {tab.subcategories.map((sub) => {
                          const SubIcon = sub.icon;
                          return (
                            <li key={sub.label}>
                              <button
                                type="button"
                                onClick={() => {
                                  const el = document.getElementById(sub.anchorId);
                                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  onNavigate?.();
                                }}
                                className={cn(
                                  'flex w-full items-center gap-2 rounded px-1.5 py-1 text-[11px] text-left transition-colors',
                                  tab.color, 'opacity-60 hover:opacity-100 hover:bg-white/[0.04]',
                                )}
                              >
                                <SubIcon className="size-3 shrink-0" />
                                <span className="truncate">{sub.label}</span>
                                {sub.locked && tier === 'free' && <Lock className="size-2.5 text-muted-foreground/40" />}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      {/* ---- Footer — user menu ---- */}
      <div className="border-t border-[#1a1a1a] px-3 py-3">
        <UserMenu collapsed={collapsed} />
      </div>
    </>
  );
}
