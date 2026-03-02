'use client';

import React, { lazy, Suspense, useState, useCallback, useEffect, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, X, Link2, Check } from 'lucide-react';
import Image from 'next/image';
import type { StoredAnalysis } from '@/lib/analysis/types';
import { useTier } from '@/lib/tiers/tier-context';
import { SectionErrorBoundary } from '@/components/shared/SectionErrorBoundary';

// -------------------------------------------------------------------
// Share-card download guard context
// Allows useCardDownload to check tier limits before downloading.
// -------------------------------------------------------------------

type DownloadGuard = () => boolean;

const DownloadGuardContext = createContext<DownloadGuard | null>(null);

/** Used by useCardDownload to check if the download is allowed. */
export function useDownloadGuard(): DownloadGuard | null {
  return useContext(DownloadGuardContext);
}

// Lazy-loaded card components — only fetched when a card is actually rendered
const HealthScoreCard = lazy(() => import('./HealthScoreCard'));
const VersusCard = lazy(() => import('./VersusCard'));
const StatsCard = lazy(() => import('./StatsCard'));
const FlagsCard = lazy(() => import('./FlagsCard'));
const PersonalityCard = lazy(() => import('./PersonalityCard'));
const ScoresCard = lazy(() => import('./ScoresCard'));
const BadgesCard = lazy(() => import('./BadgesCard'));
const MBTICard = lazy(() => import('./MBTICard'));
const ReceiptCard = lazy(() => import('./ReceiptCard'));
const RedFlagCard = lazy(() => import('./RedFlagCard'));
const VersusCardV2 = lazy(() => import('./VersusCardV2'));
const LabelCard = lazy(() => import('./LabelCard'));
const CompatibilityCardV2 = lazy(() => import('./CompatibilityCardV2'));
const GhostForecastCard = lazy(() => import('./GhostForecastCard'));
const PersonalityPassportCard = lazy(() => import('./PersonalityPassportCard'));
const CPSCard = lazy(() => import('./CPSCard'));
const SubtextCard = lazy(() => import('./SubtextCard'));
const DelusionCard = lazy(() => import('./DelusionCard'));
const MugshotCard = lazy(() => import('./MugshotCard'));
const DatingProfileCard = lazy(() => import('./DatingProfileCard'));
const CoupleQuizCard = lazy(() => import('./CoupleQuizCard'));
const PrzegrywTygodniaCard = lazy(() => import('./PrzegrywTygodniaCard'));
const NekrologCard = lazy(() => import('./NekrologCard'));
const AktZgonuCard = lazy(() => import('./AktZgonuCard'));
const ParagonCzasuCard = lazy(() => import('./ParagonCzasuCard'));
const AutopsyCard = lazy(() => import('./AutopsyCard'));
const ForecastCard = lazy(() => import('./ForecastCard'));
const DecayPhasesCard = lazy(() => import('./DecayPhasesCard'));
const TombstoneCard = lazy(() => import('./TombstoneCard'));
const GoldenAgeCard = lazy(() => import('./GoldenAgeCard'));
const UnsaidCard = lazy(() => import('./UnsaidCard'));
const DeathCertificateCard = lazy(() => import('./DeathCertificateCard'));
const DeathLineCard = lazy(() => import('./DeathLineCard'));
import { buildShareUrl } from '@/lib/share/encode';

/** Detect mobile viewport via matchMedia (SSR-safe) */
function useIsMobile(breakpoint = 767): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia(`(max-width: ${breakpoint}px)`).matches
      : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}


interface ShareCardGalleryProps {
  analysis: StoredAnalysis;
  selectedPair?: [string, string] | null;
}

interface CardConfig {
  id: string;
  title: string;
  emoji: string;
  icon?: string;
  requiresQualitative: boolean;
  size?: string;
  /** Optional group label — displayed as section header before this card */
  groupStart?: string;
}

const CARD_CONFIGS: CardConfig[] = [
  // V2 cards — anti-slop (highlighted first)
  { id: 'receipt', title: 'Paragon', emoji: '\u{1F9FE}', icon: '/icons/cards/card-receipt.png', requiresQualitative: false },
  { id: 'versus-v2', title: 'Versus V2', emoji: '\u26A1', icon: '/icons/cards/card-versus-v2.png', requiresQualitative: false },
  { id: 'redflag', title: 'Czerwona flaga', emoji: '\u{1F6A9}', icon: '/icons/cards/card-redflag.png', requiresQualitative: false },
  { id: 'ghost-forecast', title: 'Prognoza ghostingu', emoji: '\u{1F47B}', icon: '/icons/cards/card-ghost-forecast.png', requiresQualitative: false },
  { id: 'compatibility-v2', title: 'Match', emoji: '\u{1F495}', icon: '/icons/cards/card-compatibility-v2.png', requiresQualitative: false },
  { id: 'label', title: 'Etykietka', emoji: '\u{1F3F7}\uFE0F', icon: '/icons/cards/card-label.png', requiresQualitative: true },
  { id: 'passport', title: 'Paszport', emoji: '\u{1F6C2}', icon: '/icons/cards/card-passport.png', requiresQualitative: true },
  // Classic cards
  { id: 'stats', title: 'Statystyki', emoji: '\u{1F4CA}', icon: '/icons/cards/card-stats.png', requiresQualitative: false },
  { id: 'versus', title: 'Versus', emoji: '\u2694\uFE0F', icon: '/icons/cards/card-versus.png', requiresQualitative: false },
  { id: 'health', title: 'Wynik zdrowia', emoji: '\u{1F49A}', icon: '/icons/cards/card-health.png', requiresQualitative: true },
  { id: 'flags', title: 'Flagi', emoji: '\u{1F6A9}', icon: '/icons/cards/card-flags.png', requiresQualitative: true },
  { id: 'personality', title: 'Osobowość', emoji: '\u{1F9E0}', icon: '/icons/cards/card-personality.png', requiresQualitative: true },
  { id: 'scores', title: 'Wyniki viralowe', emoji: '\u{1F525}', icon: '/icons/cards/card-scores.png', requiresQualitative: false },
  { id: 'badges', title: 'Osiągnięcia', emoji: '\u{1F3C6}', icon: '/icons/cards/card-badges.png', requiresQualitative: false },
  { id: 'mbti', title: 'MBTI', emoji: '\u{1F9EC}', icon: '/icons/cards/card-mbti.png', requiresQualitative: true },
  { id: 'cps', title: 'Wzorce', emoji: '\u{1F9E0}', icon: '/icons/cards/card-cps.png', requiresQualitative: true },
  { id: 'subtext', title: 'Podtekst', emoji: '\u{1F50D}', icon: '/icons/cards/card-subtext.png', requiresQualitative: true },
  // Faza 20 — Viral Features
  { id: 'delusion', title: 'Deluzja', emoji: '\u{1F921}', icon: '/icons/cards/card-delusion.png', requiresQualitative: false },
  { id: 'mugshot', title: 'Mugshot', emoji: '\u2696\uFE0F', icon: '/icons/cards/card-mugshot.png', requiresQualitative: false },
  { id: 'dating-profile', title: 'Profil randkowy', emoji: '\u{1F498}', icon: '/icons/cards/card-dating-profile.png', requiresQualitative: false },
  { id: 'simulator', title: 'Symulacja', emoji: '\u{1F916}', icon: '/icons/cards/card-simulator.png', requiresQualitative: false },
  { id: 'couple-quiz', title: 'Quiz parowy', emoji: '\u{1F491}', icon: '/icons/cards/card-couple-quiz.png', requiresQualitative: false },
  { id: 'przegryw-tygodnia', title: 'Przegryw Tygodnia', emoji: '\u{1F480}', requiresQualitative: false },
  // Tryb Eks — Relationship Autopsy cards
  { id: 'nekrolog', title: 'Nekrolog', emoji: '\u26B0\uFE0F', requiresQualitative: false, groupStart: 'Tryb Eks' },
  { id: 'akt-zgonu', title: 'Akt Zgonu', emoji: '\u{1F4DC}', requiresQualitative: false },
  { id: 'paragon-czasu', title: 'Paragon Czasu', emoji: '\u{1F9FE}', requiresQualitative: false },
  { id: 'autopsy', title: 'Sekcja', emoji: '\u{1F52C}', requiresQualitative: false },
  { id: 'forecast', title: 'Prognoza', emoji: '\u{1F52E}', requiresQualitative: false },
  { id: 'decay-phases', title: 'Fazy Rozpadu', emoji: '\u{1F4C9}', requiresQualitative: false },
  { id: 'tombstone', title: 'Nagrobek', emoji: '\u{1FAA6}', requiresQualitative: false },
  { id: 'golden-age', title: 'Złoty Okres', emoji: '\u2728', requiresQualitative: false },
  { id: 'unsaid', title: 'Niewypowiedziane', emoji: '\u{1F47B}', requiresQualitative: false },
  { id: 'death-certificate', title: 'Akt Zgonu V2', emoji: '\u{1F4CB}', requiresQualitative: false },
  { id: 'death-line', title: 'Wykres Śmierci', emoji: '\u{1F4CA}', requiresQualitative: false },
];

function ShareCardGallery({ analysis, selectedPair }: ShareCardGalleryProps) {
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showLimitOverlay, setShowLimitOverlay] = useState(false);
  const isMobile = useIsMobile();
  const { tier, remainingShareCards } = useTier();

  // Guard callback: returns true if download is allowed, false if blocked
  const downloadGuard = useCallback<DownloadGuard>(() => {
    if (tier === 'free' && remainingShareCards <= 0) {
      setShowLimitOverlay(true);
      return false;
    }
    return true;
  }, [tier, remainingShareCards]);

  const { conversation, quantitative, qualitative } = analysis;
  const allParticipants = conversation.participants.map((p) => p.name);
  // For duo cards: use selectedPair when available (server view), otherwise original participants
  const participants = selectedPair && allParticipants.length > 2 ? [...selectedPair] : allParticipants;
  const hasQualitative = qualitative?.status === 'complete';

  const availableCards = CARD_CONFIGS.filter(
    (c) => !c.requiresQualitative || hasQualitative,
  );

  // Body scroll lock when mobile overlay is open
  useEffect(() => {
    if (!isMobile || !activeCard) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, activeCard]);

  // Escape key closes active card
  useEffect(() => {
    if (!activeCard) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveCard(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeCard]);

  const copyShareLink = useCallback(async () => {
    try {
      const shareUrl = buildShareUrl(analysis);
      // Try modern clipboard API first, fallback to execCommand
      try {
        if (!navigator.clipboard) throw new Error('no clipboard');
        await navigator.clipboard.writeText(shareUrl);
      } catch {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Share link copy failed:', err);
    }
  }, [analysis]);

  const renderFullCard = (id: string) => {
    switch (id) {
      // V2 cards
      case 'receipt':
        return (
          <ReceiptCard quantitative={quantitative} conversation={conversation} />
        );
      case 'versus-v2':
        if (participants.length !== 2) return null;
        return (
          <VersusCardV2 quantitative={quantitative} participants={participants} />
        );
      case 'redflag':
        return (
          <RedFlagCard
            quantitative={quantitative}
            qualitative={qualitative}
            participants={participants}
          />
        );
      case 'ghost-forecast':
        if (!quantitative.viralScores?.ghostRisk) return null;
        return (
          <GhostForecastCard viralScores={quantitative.viralScores} participants={participants} />
        );
      case 'compatibility-v2':
        if (!quantitative.viralScores || participants.length !== 2) return null;
        return (
          <CompatibilityCardV2 viralScores={quantitative.viralScores} participants={participants} />
        );
      case 'label':
        if (!qualitative) return null;
        return (
          <LabelCard qualitative={qualitative} participants={participants} />
        );
      case 'passport':
        if (!qualitative) return null;
        return (
          <PersonalityPassportCard qualitative={qualitative} participants={participants} />
        );
      // Classic cards
      case 'stats':
        return (
          <StatsCard
            quantitative={quantitative}
            conversation={conversation}
            participants={participants}
          />
        );
      case 'versus':
        return (
          <VersusCard quantitative={quantitative} participants={participants} />
        );
      case 'health':
        if (!qualitative?.pass4) return null;
        return (
          <HealthScoreCard pass4={qualitative.pass4} participants={participants} />
        );
      case 'flags':
        if (!qualitative?.pass2) return null;
        return (
          <FlagsCard
            redFlags={qualitative.pass2.red_flags ?? []}
            greenFlags={qualitative.pass2.green_flags ?? []}
          />
        );
      case 'personality':
        if (!qualitative?.pass3) return null;
        return (
          <PersonalityCard
            profiles={qualitative.pass3}
            participants={participants}
            quantitative={quantitative}
          />
        );
      case 'scores':
        if (!quantitative.viralScores) return null;
        return (
          <ScoresCard viralScores={quantitative.viralScores} participants={participants} />
        );
      case 'badges':
        if (!quantitative.badges || quantitative.badges.length === 0) return null;
        return (
          <BadgesCard badges={quantitative.badges} participants={participants} />
        );
      case 'mbti':
        if (!qualitative?.pass3) return null;
        return (
          <MBTICard profiles={qualitative.pass3} participants={participants} />
        );
      case 'cps':
        if (!qualitative?.cps) return null;
        return <CPSCard cpsResult={qualitative.cps} />;
      case 'subtext':
        if (!qualitative?.subtext) return null;
        return <SubtextCard subtextResult={qualitative.subtext} participants={participants} />;
      // Faza 20 — Viral Feature Cards
      case 'delusion':
        if (!qualitative?.delusionQuiz) return null;
        return <DelusionCard result={qualitative.delusionQuiz} participants={participants} />;
      case 'mugshot': {
        if (!qualitative?.courtTrial) return null;
        const firstPerson = Object.values(qualitative.courtTrial.perPerson)[0];
        if (!firstPerson) return null;
        return <MugshotCard personVerdict={firstPerson} caseNumber={qualitative.courtTrial.caseNumber} />;
      }
      case 'dating-profile': {
        if (!qualitative?.datingProfile) return null;
        const firstProfile = Object.values(qualitative.datingProfile.profiles)[0];
        if (!firstProfile) return null;
        return <DatingProfileCard profile={firstProfile} />;
      }
      case 'simulator':
        return null; // Simulator card requires active session data, not persisted
      case 'couple-quiz':
        if (!qualitative?.coupleQuiz) return null;
        return <CoupleQuizCard comparison={qualitative.coupleQuiz} />;
      case 'przegryw-tygodnia':
        if (!qualitative?.przegrywTygodnia) return null;
        return <PrzegrywTygodniaCard result={qualitative.przegrywTygodnia} />;
      // Tryb Eks cards
      case 'nekrolog': {
        const eks = qualitative?.eksAnalysis;
        if (!eks) return null;
        return <NekrologCard participants={participants} duration={eks.relationshipDuration} deathDate={eks.deathDate} causeOfDeath={eks.causeOfDeath.primary} epitaph={eks.epitaph} />;
      }
      case 'akt-zgonu': {
        const eks = qualitative?.eksAnalysis;
        if (!eks) return null;
        return <AktZgonuCard participants={participants} duration={eks.relationshipDuration} deathDate={eks.deathDate} causeOfDeath={eks.causeOfDeath.primary} contributingFactors={eks.causeOfDeath.contributingFactors} wasItPreventable={eks.causeOfDeath.wasItPreventable} />;
      }
      case 'paragon-czasu': {
        const eks = qualitative?.eksAnalysis;
        if (!eks) return null;
        const totalMsgs = Object.values(quantitative.perPerson).reduce((s, p) => s + p.totalMessages, 0);
        return <ParagonCzasuCard participants={participants} totalMessages={totalMsgs} duration={eks.relationshipDuration} />;
      }
      case 'autopsy': {
        const eks = qualitative?.eksAnalysis;
        if (!eks) return null;
        return <AutopsyCard causeOfDeath={eks.causeOfDeath.primary} turningPointDate={eks.turningPoint.approximateDate} epitaph={eks.epitaph} wasItPreventable={eks.causeOfDeath.wasItPreventable} healthScore={qualitative?.pass4?.health_score?.overall} />;
      }
      case 'forecast': {
        const eks = qualitative?.eksAnalysis;
        if (!eks) return null;
        return <ForecastCard willTheyComeBack={eks.postBreakupForecast.willTheyComeBack} perPerson={eks.postBreakupForecast.perPerson} />;
      }
      case 'decay-phases': {
        const eks = qualitative?.eksAnalysis;
        if (!eks) return null;
        return <DecayPhasesCard phases={eks.phases} />;
      }
      case 'tombstone': {
        const eks = qualitative?.eksAnalysis;
        if (!eks) return null;
        return <TombstoneCard participants={participants} duration={eks.relationshipDuration} deathDate={eks.deathDate} epitaph={eks.epitaph} />;
      }
      case 'golden-age': {
        const eks = qualitative?.eksAnalysis;
        if (!eks) return null;
        return <GoldenAgeCard periodStart={eks.goldenAge.periodStart} periodEnd={eks.goldenAge.periodEnd} peakIntimacy={eks.goldenAge.peakIntimacy} description={eks.goldenAge.description} bestQuotes={eks.goldenAge.bestQuotes} />;
      }
      case 'unsaid': {
        const eks = qualitative?.eksAnalysis;
        if (!eks?.unsaidThings) return null;
        return <UnsaidCard perPerson={eks.unsaidThings.perPerson} sharedUnsaid={eks.unsaidThings.sharedUnsaid} />;
      }
      case 'death-certificate': {
        const eks = qualitative?.eksAnalysis;
        if (!eks?.deathCertificate) return null;
        return <DeathCertificateCard caseNumber={eks.deathCertificate.caseNumber} dateOfBirth={eks.deathCertificate.dateOfBirth} dateOfDeath={eks.deathCertificate.dateOfDeath} placeOfDeath={eks.deathCertificate.placeOfDeath} attendingPhysician={eks.deathCertificate.attendingPhysician} mannerOfDeath={eks.deathCertificate.mannerOfDeath} participants={participants} />;
      }
      case 'death-line': {
        const eks = qualitative?.eksAnalysis;
        if (!eks) return null;
        // Build death line data from quantitative trends
        const intimacyTrend = quantitative?.intimacyProgression?.trend || [];
        const sentimentTrend = quantitative?.trends?.sentimentTrend || [];
        const responseTimeTrend = quantitative?.trends?.responseTimeTrend || [];
        const monthSet = new Set<string>();
        intimacyTrend.forEach((d: { month: string }) => monthSet.add(d.month));
        sentimentTrend.forEach((d: { month: string }) => monthSet.add(d.month));
        responseTimeTrend.forEach((d: { month: string }) => monthSet.add(d.month));
        const months = Array.from(monthSet).sort();
        if (months.length === 0) return null;
        const intimacyMap = new Map(intimacyTrend.map((d: { month: string; score: number }) => [d.month, d.score]));
        const sentimentMap = new Map<string, number>();
        for (const entry of sentimentTrend) {
          const values = Object.values((entry as { perPerson: Record<string, number> }).perPerson);
          if (values.length > 0) sentimentMap.set(entry.month, (values as number[]).reduce((a: number, b: number) => a + b, 0) / values.length);
        }
        const rtMap = new Map<string, number>();
        for (const entry of responseTimeTrend) {
          const values = Object.values((entry as { perPerson: Record<string, number> }).perPerson);
          if (values.length > 0) rtMap.set(entry.month, (values as number[]).reduce((a: number, b: number) => a + b, 0) / values.length);
        }
        const rtValues = Array.from(rtMap.values());
        const maxRt = Math.max(...rtValues, 1);
        const dlData = months.map((month) => {
          const intimacy = intimacyMap.get(month) ?? 50;
          const rawSentiment = sentimentMap.get(month) ?? 0;
          const sentiment = ((rawSentiment + 1) / 2) * 100;
          const rawRt = rtMap.get(month) ?? maxRt / 2;
          const responseTime = Math.max(0, (1 - rawRt / maxRt) * 100);
          const redZone = intimacy < 30 && sentiment < 30 && responseTime < 30 ? 30 : 0;
          return { month, intimacy: Math.round(intimacy), sentiment: Math.round(sentiment), responseTime: Math.round(responseTime), redZone };
        });
        return <DeathLineCard data={dlData} emotionalTimeline={eks.emotionalTimeline} />;
      }
      default:
        return null;
    }
  };

  // Mobile fullscreen overlay — rendered via portal to document.body
  const mobileOverlay =
    isMobile && activeCard
      ? createPortal(
          <AnimatePresence>
            <motion.div
              key="mobile-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              role="dialog"
              aria-modal="true"
              aria-label="Podgląd karty"
              className="fixed inset-0 z-50 overflow-y-auto bg-black/95"
              onClick={(e) => {
                // Close when tapping dark overlay area (not the card itself)
                if (e.target === e.currentTarget) setActiveCard(null);
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Tab') return;
                const focusable = (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(
                  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (focusable.length === 0) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }}
            >
              {/* Close button — fixed position for constant visibility */}
              <button
                onClick={() => setActiveCard(null)}
                className="fixed top-4 right-4 z-[60] flex size-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground"
                aria-label="Zamknij"
              >
                <X className="size-5" />
              </button>

              {/* Card centered — minimal padding so card renders at full 360px */}
              <div
                className="flex min-h-full items-start justify-center px-1 py-12"
                onClick={(e) => {
                  // Close when tapping padding area around the card
                  if (e.target === e.currentTarget) setActiveCard(null);
                }}
              >
                <motion.div
                  key={activeCard}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  style={{ minWidth: 'min(396px, 100%)' }}
                >
                  <SectionErrorBoundary section="Karta udostepniania">
                    <Suspense fallback={<div className="h-48 w-full animate-pulse rounded-xl bg-white/5" />}>
                      {renderFullCard(activeCard)}
                    </Suspense>
                  </SectionErrorBoundary>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>,
          document.body,
        )
      : null;

  return (
    <DownloadGuardContext.Provider value={downloadGuard}>
    <div className="space-y-4">
      {/* Share link button */}
      <div className="flex justify-end">
        <button
          onClick={copyShareLink}
          className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs font-semibold text-blue-400 transition-colors hover:bg-blue-500/20"
        >
          {linkCopied ? (
            <><Check className="size-3.5" /> Skopiowano!</>
          ) : (
            <><Link2 className="size-3.5" /> Udostępnij link</>
          )}
        </button>
      </div>
      {/* Card thumbnails */}
      <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-3 pb-2 scrollbar-thin">
        {availableCards.map((card) => (
          <React.Fragment key={card.id}>
            {/* Section header when a new group starts */}
            {card.groupStart && (
              <div className="col-span-3 sm:w-full flex items-center gap-3 pt-4 pb-1">
                <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, #991b1b40, transparent)' }} />
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] whitespace-nowrap" style={{ color: '#991b1b' }}>
                  {card.groupStart}
                </span>
                <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, #991b1b40, transparent)' }} />
              </div>
            )}
            <button
              onClick={() => setActiveCard(activeCard === card.id ? null : card.id)}
              className="group flex min-w-0 sm:w-[120px] sm:shrink-0 flex-col items-center gap-1.5 sm:gap-2 rounded-xl border border-border bg-card p-3 sm:p-4 min-h-[68px] transition-all hover:border-border-hover hover:bg-card-hover active:scale-[0.97] active:opacity-80"
              style={{
                width: undefined,
                borderColor: activeCard === card.id ? '#3b82f6' : undefined,
              }}
            >
              {card.icon ? (
                <Image src={card.icon} alt={card.title} width={96} height={96} className="size-8 sm:size-10" unoptimized />
              ) : (
                <span className="text-lg sm:text-2xl">{card.emoji}</span>
              )}
              <span className="text-xs font-medium text-foreground">{card.title}</span>
              <span className="hidden sm:flex items-center gap-1 text-[10px] text-text-muted">
                <Download className="size-3" />
                {card.size ?? '1080\u00D71920'}
              </span>
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Desktop: inline card preview (unchanged) */}
      {!isMobile && (
        <AnimatePresence mode="wait">
          {activeCard && (
            <motion.div
              key={activeCard}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              {/* Close button */}
              <button
                onClick={() => setActiveCard(null)}
                className="absolute -top-2 right-0 z-10 flex size-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground"
              >
                <X className="size-3" />
              </button>

              {/* Card render */}
              <div className="flex justify-center overflow-x-auto py-4">
                <SectionErrorBoundary section="Karta udostepniania">
                  <Suspense fallback={<div className="h-48 w-full animate-pulse rounded-xl bg-white/5" />}>
                    {renderFullCard(activeCard)}
                  </Suspense>
                </SectionErrorBoundary>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Mobile: fullscreen overlay portal */}
      {mobileOverlay}

      {/* Share card limit overlay for free tier */}
      {showLimitOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowLimitOverlay(false)}>
          <div className="mx-4 max-w-sm rounded-xl border border-border bg-[#111111] p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="mb-3 text-3xl">{'\u{1F0CF}'}</div>
            <h3 className="mb-1 text-sm font-bold text-foreground">Wykorzystano 3/3 kart</h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Limit kart w darmowym planie wyczerpany na ten miesiąc. Odblokuj unlimited w Pro.
            </p>
            <a
              href="/pricing"
              className="inline-block rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              Odblokuj unlimited {'\u2192'}
            </a>
            <button onClick={() => setShowLimitOverlay(false)} className="mt-3 block w-full text-[11px] text-muted-foreground/60 hover:text-muted-foreground">
              Może później
            </button>
          </div>
        </div>
      )}
    </div>
    </DownloadGuardContext.Provider>
  );
}

export default React.memo(ShareCardGallery);
