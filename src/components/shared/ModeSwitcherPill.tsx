'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAnalysis } from '@/lib/analysis/analysis-context';
import { useSidebar } from '@/components/shared/SidebarContext';
import type { ModeId } from './ModePageShell';
import {
  LayoutDashboard,
  Flame,
  Scale,
  Mic,
  Search,
  Heart,
  MessagesSquare,
  HelpCircle,
  ScanLine,
  Compass,
  Sparkles,
  Brain,
  BarChart3,
  Share2,
  Maximize2,
  Minimize2,
  Swords,
} from 'lucide-react';

interface ModeEntry {
  id: ModeId;
  label: string;
  icon: typeof LayoutDashboard;
  accent: string;
}

const MODES: ModeEntry[] = [
  { id: 'hub',       label: 'Hub',             icon: LayoutDashboard, accent: '#3b82f6' },
  { id: 'roast',     label: 'Roast Arena',     icon: Flame,           accent: '#ff4500' },
  { id: 'court',     label: 'Sąd Chatowy',     icon: Scale,           accent: '#d4a853' },
  { id: 'standup',   label: 'Stand-Up',        icon: Mic,             accent: '#ff9f0a' },
  { id: 'subtext',   label: 'Subtext',         icon: Search,          accent: '#00ff41' },
  { id: 'dating',    label: 'Dating Profile',  icon: Heart,           accent: '#ff006e' },
  { id: 'simulator', label: 'Simulator',       icon: MessagesSquare,  accent: '#0084ff' },
  { id: 'delusion',  label: 'Quiz Deluzji',    icon: HelpCircle,      accent: '#8b5cf6' },
  { id: 'cps',       label: 'CPS',             icon: ScanLine,        accent: '#10b981' },
  { id: 'moral',     label: 'Moral',           icon: Compass,         accent: '#f97316' },
  { id: 'emotions',  label: 'Emocje',          icon: Sparkles,        accent: '#06b6d4' },
  { id: 'capitalization', label: 'ACR',       icon: Heart,           accent: '#ec4899' },
  { id: 'argument',  label: 'Kłótnia',         icon: Swords,          accent: '#ef4444' },
  { id: 'ai',        label: 'AI Deep Dive',    icon: Brain,           accent: '#a855f7' },
  { id: 'metrics',   label: 'Metryki',         icon: BarChart3,       accent: '#3b82f6' },
  { id: 'share',     label: 'Eksport',         icon: Share2,          accent: '#8b5cf6' },
];

/** Check if a mode is completed based on qualitative data */
function isModeCompleted(modeId: ModeId, qualitative: Record<string, unknown> | undefined, hasQualitative: boolean): boolean {
  if (!qualitative) return false;
  switch (modeId) {
    case 'ai': return hasQualitative;
    case 'roast': return !!qualitative.roast;
    case 'court': return !!qualitative.courtTrial;
    case 'standup': return !!qualitative.standupRoast;
    case 'subtext': return !!qualitative.subtext;
    case 'dating': return !!qualitative.datingProfile;
    case 'cps': return !!qualitative.cps;
    case 'delusion': return !!qualitative.delusionQuiz;
    case 'capitalization': return !!qualitative.capitalization;
    case 'argument': return !!qualitative.argumentSimulation;
    case 'metrics': return true; // always "complete" — quantitative data exists
    case 'share': return true;
    default: return false;
  }
}

/**
 * Floating bottom pill for switching between mode pages.
 * Horizontal scrollable strip with Lucide icons + accent-colored active indicator.
 * Includes fullscreen toggle and completion dots.
 */
export default function ModeSwitcherPill() {
  const params = useParams();
  const pathname = usePathname();
  const id = params.id as string;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showPill, setShowPill] = useState(false);
  const { qualitative, hasQualitative } = useAnalysis();
  const { isFullscreen, toggleFullscreen } = useSidebar();

  // Determine active mode from pathname
  const activeMode: ModeId = (() => {
    const base = `/analysis/${id}`;
    const suffix = pathname.replace(base, '').replace(/^\//, '');
    if (!suffix) return 'hub';
    const match = MODES.find(m => m.id === suffix);
    return match ? match.id : 'hub';
  })();

  // Animate pill entry
  useEffect(() => {
    const timer = setTimeout(() => setShowPill(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (!scrollRef.current) return;
    const activeEl = scrollRef.current.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
    }
  }, [activeMode]);

  return (
    <div
      className={cn(
        'fixed bottom-3 left-1/2 z-50 -translate-x-1/2 pb-[env(safe-area-inset-bottom)] transition-all duration-500 sm:bottom-4 md:bottom-6',
        showPill ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
      )}
    >
      <nav
        className="flex items-center gap-1.5 rounded-full px-1"
        aria-label="Nawigacja trybów"
      >
        {/* Mode buttons */}
        <div
          ref={scrollRef}
          className="glass-dense flex max-w-[90vw] items-center gap-0.5 overflow-x-auto rounded-full px-1.5 py-1.5 scrollbar-none sm:max-w-[95vw] sm:gap-1 sm:px-3 md:max-w-xl"
          style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)' }}
        >
          {MODES.map((mode) => {
            const Icon = mode.icon;
            const isActive = mode.id === activeMode;
            const completed = isModeCompleted(mode.id, qualitative as Record<string, unknown> | undefined, hasQualitative);
            const href = mode.id === 'hub'
              ? `/analysis/${id}`
              : `/analysis/${id}/${mode.id}`;

            return (
              <Link
                key={mode.id}
                href={href}
                data-active={isActive}
                className={cn(
                  'relative flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-2 transition-all duration-200',
                  'sm:px-3 sm:py-1.5',
                  'hover:bg-white/[0.05]',
                  isActive
                    ? 'text-white'
                    : 'text-[#666] hover:text-[#999]',
                )}
                style={isActive ? { backgroundColor: `${mode.accent}15`, color: mode.accent } : undefined}
                title={mode.label}
              >
                {/* Active glow indicator */}
                {isActive && (
                  <span
                    className="absolute inset-0 rounded-full opacity-20 blur-sm"
                    style={{ backgroundColor: mode.accent }}
                  />
                )}
                {/* Completed dot */}
                {completed && !isActive && (
                  <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-emerald-500 ring-1 ring-black" />
                )}
                <Icon className="relative size-4 shrink-0" />
                {/* Label — hidden on mobile, shown on desktop */}
                <span className="relative hidden font-mono text-[10px] font-medium uppercase tracking-widest sm:inline">
                  {mode.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Fullscreen toggle button */}
        <button
          onClick={toggleFullscreen}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[#666] backdrop-blur-xl transition-all hover:bg-white/[0.1] hover:text-white"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
          title={isFullscreen ? 'Wyjdź z pełnego ekranu (Esc)' : 'Pełny ekran'}
          aria-label={isFullscreen ? 'Wyjdź z pełnego ekranu' : 'Pełny ekran'}
        >
          {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
        </button>
      </nav>
    </div>
  );
}
