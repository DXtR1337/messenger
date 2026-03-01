'use client';

import React, { useState, useCallback, useEffect, createContext, useContext } from 'react';
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
import HealthScoreCard from './HealthScoreCard';
import VersusCard from './VersusCard';
import StatsCard from './StatsCard';
import FlagsCard from './FlagsCard';
import PersonalityCard from './PersonalityCard';
import ScoresCard from './ScoresCard';
import BadgesCard from './BadgesCard';
import MBTICard from './MBTICard';
import ReceiptCard from './ReceiptCard';
import RedFlagCard from './RedFlagCard';
import VersusCardV2 from './VersusCardV2';
import LabelCard from './LabelCard';
import CompatibilityCardV2 from './CompatibilityCardV2';
import GhostForecastCard from './GhostForecastCard';
import PersonalityPassportCard from './PersonalityPassportCard';
import CPSCard from './CPSCard';
import SubtextCard from './SubtextCard';
import DelusionCard from './DelusionCard';
import MugshotCard from './MugshotCard';
import DatingProfileCard from './DatingProfileCard';
import SimulatorCard from './SimulatorCard';
import CoupleQuizCard from './CoupleQuizCard';
import CwelTygodniaCard from './CwelTygodniaCard';
import { buildShareUrl } from '@/lib/share/encode';

/** Detect mobile viewport via matchMedia (SSR-safe) */
function useIsMobile(breakpoint = 767): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setIsMobile(mql.matches);

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
  { id: 'cwel-tygodnia', title: 'Cwel Tygodnia', emoji: '\u{1F480}', requiresQualitative: false },
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
      case 'cwel-tygodnia':
        if (!qualitative?.cwelTygodnia) return null;
        return <CwelTygodniaCard result={qualitative.cwelTygodnia} />;
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
                    {renderFullCard(activeCard)}
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
      <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-3 sm:overflow-x-auto pb-2 scrollbar-thin">
        {availableCards.map((card) => (
          <button
            key={card.id}
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
                  {renderFullCard(activeCard)}
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
