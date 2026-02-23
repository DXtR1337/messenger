'use client';

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  ChevronUp,
  LayoutDashboard,
  BarChart3,
  Brain,
  Gamepad2,
  Share2,
} from 'lucide-react';

import type { StoredAnalysis, QualitativeAnalysis, RoastResult, MegaRoastResult, CwelTygodniaResult } from '@/lib/analysis/types';
import type { CPSResult } from '@/lib/analysis/communication-patterns';
import type { SubtextResult } from '@/lib/analysis/subtext';
import type { CourtResult } from '@/lib/analysis/court-prompts';
import type { DatingProfileResult } from '@/lib/analysis/dating-profile-prompts';
import type { DeltaMetrics } from '@/lib/analysis/delta';
import type { ThreatMetersResult, DamageReportResult } from '@/lib/parsers/types';
import type { CognitiveFunctionsResult } from '@/lib/analysis/cognitive-functions';
import type { GottmanResult } from '@/lib/analysis/gottman-horsemen';

// Lazy-loaded tab components
const OverviewTab = lazy(() => import('./tabs/OverviewTab'));
const MetricsTab = lazy(() => import('./tabs/MetricsTab'));
const AIInsightsTab = lazy(() => import('./tabs/AIInsightsTab'));
const EntertainmentTab = lazy(() => import('./tabs/EntertainmentTab'));
const ShareTab = lazy(() => import('./tabs/ShareTab'));

export type TabId = 'overview' | 'metrics' | 'ai' | 'entertainment' | 'share';

interface MobileTab {
  id: TabId;
  label: string;
  icon: typeof LayoutDashboard;
  color: string;
  bgColor: string;
}

const TABS: MobileTab[] = [
  { id: 'overview',      label: 'Przegląd',   icon: LayoutDashboard, color: 'text-blue-400',    bgColor: 'bg-blue-500/10' },
  { id: 'metrics',       label: 'Metryki',    icon: BarChart3,       color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  { id: 'ai',            label: 'AI Insights', icon: Brain,           color: 'text-purple-400',  bgColor: 'bg-purple-500/10' },
  { id: 'entertainment', label: 'Rozrywka',   icon: Gamepad2,        color: 'text-orange-400',  bgColor: 'bg-orange-500/10' },
  { id: 'share',         label: 'Udostępnij', icon: Share2,          color: 'text-cyan-400',    bgColor: 'bg-cyan-500/10' },
];

function TabSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-48 animate-pulse rounded-xl bg-card" />
      <div className="h-32 animate-pulse rounded-xl bg-card" />
      <div className="h-64 animate-pulse rounded-xl bg-card" />
    </div>
  );
}

export interface AnalysisTabsProps {
  analysis: StoredAnalysis;
  isServerView: boolean;
  sortedParticipants: string[];
  participants: string[];
  hasQualitative: boolean;
  deltaMetrics: DeltaMetrics | null;
  threatMeters: ThreatMetersResult | undefined;
  damageReport: DamageReportResult | undefined;
  cognitiveFunctions: CognitiveFunctionsResult | undefined;
  gottmanResult: GottmanResult | undefined;
  participantPhotos: Record<string, string>;
  // Callbacks
  onAIComplete: (qualitative: QualitativeAnalysis) => void;
  onRoastComplete: (roast: RoastResult) => void;
  onCPSComplete: (cps: CPSResult) => void;
  onSubtextComplete: (subtext: SubtextResult) => void;
  onCourtComplete: (court: CourtResult) => void;
  onMegaRoastComplete: (megaRoast: MegaRoastResult) => void;
  onCwelComplete: (cwel: CwelTygodniaResult) => void;
  onDatingProfileComplete: (profile: DatingProfileResult) => void;
  onPhotoUpload: (name: string, base64: string) => void;
  onPhotoRemove: (name: string) => void;
  onImageSaved: (key: string, dataUrl: string) => void;
}

const STORAGE_KEY = 'podtekst-analysis-tab';

export default function AnalysisTabs(props: AnalysisTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tabFromUrl = searchParams.get('tab') as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (tabFromUrl && TABS.some(t => t.id === tabFromUrl)) return tabFromUrl;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as TabId | null;
      if (stored && TABS.some(t => t.id === stored)) return stored;
    }
    return 'overview';
  });

  const [showBackToTop, setShowBackToTop] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Sync tab with URL (sidebar or mobile bar may change it)
  useEffect(() => {
    if (tabFromUrl && TABS.some(t => t.id === tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl, activeTab]);

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    localStorage.setItem(STORAGE_KEY, tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchParams, router, pathname]);

  // Scroll progress + back-to-top visibility
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0);
      setShowBackToTop(scrollTop > 600);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const { analysis, isServerView, sortedParticipants, participants, hasQualitative } = props;
  const quantitative = analysis.quantitative;
  const qualitative = analysis.qualitative;
  const conversation = analysis.conversation;

  // Track which tabs have been visited so we lazy-load on first visit
  // but keep them mounted (hidden) afterward to preserve SSE connections etc.
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(() => new Set([activeTab]));

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      return new Set([...prev, activeTab]);
    });
  }, [activeTab]);

  return (
    <>
      {/* Scroll progress bar */}
      <div className="fixed top-0 left-0 z-50 h-1 w-full bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 transition-[width] duration-150"
          style={{ width: `${scrollProgress * 100}%` }}
        />
      </div>

      {/* Mobile: prominent color-coded top tabs (hidden on desktop — sidebar handles it) */}
      <nav className="sticky top-0 z-30 -mx-4 mb-5 md:hidden">
        <div className="border-b border-border/60 bg-[#0a0a0a]/95 px-2 py-2 backdrop-blur-md">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    'flex shrink-0 flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all active:scale-95',
                    isActive
                      ? `${tab.bgColor} ${tab.color} shadow-sm`
                      : 'text-muted-foreground',
                  )}
                >
                  <div
                    className={cn(
                      'flex size-8 items-center justify-center rounded-lg',
                      isActive ? tab.bgColor : 'bg-white/5',
                    )}
                  >
                    <Icon className={cn('size-4', isActive ? tab.color : 'text-muted-foreground')} />
                  </div>
                  <span className={cn('text-[10px] font-bold', isActive ? tab.color : 'text-muted-foreground/70')}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Tab Content — tabs stay mounted once visited (hidden via CSS) to preserve SSE streams */}
      {visitedTabs.has('overview') && (
        <div className={activeTab !== 'overview' ? 'hidden' : undefined}>
          <Suspense fallback={<TabSkeleton />}>
            <OverviewTab
              analysis={analysis}
              quantitative={quantitative}
              qualitative={qualitative}
              conversation={conversation}
              participants={participants}
              isServerView={isServerView}
              sortedParticipants={sortedParticipants}
              deltaMetrics={props.deltaMetrics}
              threatMeters={props.threatMeters}
            />
          </Suspense>
        </div>
      )}
      {visitedTabs.has('metrics') && (
        <div className={activeTab !== 'metrics' ? 'hidden' : undefined}>
          <Suspense fallback={<TabSkeleton />}>
            <MetricsTab
              quantitative={quantitative}
              conversation={conversation}
              participants={participants}
              isServerView={isServerView}
              sortedParticipants={sortedParticipants}
            />
          </Suspense>
        </div>
      )}
      {visitedTabs.has('ai') && (
        <div className={activeTab !== 'ai' ? 'hidden' : undefined}>
          <Suspense fallback={<TabSkeleton />}>
            <AIInsightsTab
              analysis={analysis}
              quantitative={quantitative}
              qualitative={qualitative}
              conversation={conversation}
              participants={participants}
              isServerView={isServerView}
              sortedParticipants={sortedParticipants}
              hasQualitative={hasQualitative}
              cognitiveFunctions={props.cognitiveFunctions}
              damageReport={props.damageReport}
              onAIComplete={props.onAIComplete}
              onRoastComplete={props.onRoastComplete}
              onImageSaved={props.onImageSaved}
            />
          </Suspense>
        </div>
      )}
      {visitedTabs.has('entertainment') && (
        <div className={activeTab !== 'entertainment' ? 'hidden' : undefined}>
          <Suspense fallback={<TabSkeleton />}>
            <EntertainmentTab
              analysis={analysis}
              quantitative={quantitative}
              qualitative={qualitative}
              conversation={conversation}
              participants={participants}
              isServerView={isServerView}
              sortedParticipants={sortedParticipants}
              hasQualitative={hasQualitative}
              gottmanResult={props.gottmanResult}
              threatMeters={props.threatMeters}
              onCPSComplete={props.onCPSComplete}
              onSubtextComplete={props.onSubtextComplete}
              onCourtComplete={props.onCourtComplete}
              onDatingProfileComplete={props.onDatingProfileComplete}
            />
          </Suspense>
        </div>
      )}
      {visitedTabs.has('share') && (
        <div className={activeTab !== 'share' ? 'hidden' : undefined}>
          <Suspense fallback={<TabSkeleton />}>
            <ShareTab
              analysis={analysis}
              quantitative={quantitative}
              conversation={conversation}
              participants={participants}
              isServerView={isServerView}
              sortedParticipants={sortedParticipants}
              qualitative={qualitative}
              participantPhotos={props.participantPhotos}
              onPhotoUpload={props.onPhotoUpload}
              onPhotoRemove={props.onPhotoRemove}
              onMegaRoastComplete={props.onMegaRoastComplete}
              onCwelComplete={props.onCwelComplete}
            />
          </Suspense>
        </div>
      )}

      {/* Back to Top button */}
      <button
        onClick={scrollToTop}
        className={cn(
          'fixed z-40 flex items-center justify-center rounded-full border border-border/50 bg-card/90 shadow-lg backdrop-blur-sm transition-all duration-300',
          'size-10 right-4 bottom-6',
          showBackToTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none',
        )}
        aria-label="Przewin do gory"
      >
        <ChevronUp className="size-5 text-muted-foreground" />
      </button>

      {/* Bottom spacer */}
      <div className="h-24 sm:h-16" />
    </>
  );
}
