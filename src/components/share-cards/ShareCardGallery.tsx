'use client';

import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, X, Link2, Check } from 'lucide-react';
import type { StoredAnalysis } from '@/lib/analysis/types';
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
import { buildShareUrl } from '@/lib/share/encode';


interface ShareCardGalleryProps {
  analysis: StoredAnalysis;
}

interface CardConfig {
  id: string;
  title: string;
  emoji: string;
  requiresQualitative: boolean;
  size?: string;
}

const CARD_CONFIGS: CardConfig[] = [
  // V2 cards â€” anti-slop (highlighted first)
  { id: 'receipt', title: 'Paragon', emoji: 'đź§ľ', requiresQualitative: false },
  { id: 'versus-v2', title: 'Versus V2', emoji: 'âšˇ', requiresQualitative: false, size: '1080Ă—1080' },
  { id: 'redflag', title: 'Czerwona flaga', emoji: 'đźš©', requiresQualitative: false },
  { id: 'ghost-forecast', title: 'Prognoza ghostingu', emoji: 'đź‘»', requiresQualitative: false },
  { id: 'compatibility-v2', title: 'Match', emoji: 'đź’•', requiresQualitative: false, size: '1080Ă—1080' },
  { id: 'label', title: 'Etykietka', emoji: 'đźŹ·ď¸Ź', requiresQualitative: true, size: '1080Ă—1080' },
  { id: 'passport', title: 'Paszport', emoji: 'đź›‚', requiresQualitative: true },
  // Classic cards
  { id: 'stats', title: 'Statystyki', emoji: 'đź“Š', requiresQualitative: false },
  { id: 'versus', title: 'Versus', emoji: 'âš”ď¸Ź', requiresQualitative: false },
  { id: 'health', title: 'Wynik zdrowia', emoji: 'đź’š', requiresQualitative: true },
  { id: 'flags', title: 'Flagi', emoji: 'đźš©', requiresQualitative: true },
  { id: 'personality', title: 'OsobowoĹ›Ä‡', emoji: 'đź§ ', requiresQualitative: true },
  { id: 'scores', title: 'Wyniki viralowe', emoji: 'đź”Ą', requiresQualitative: false },
  { id: 'badges', title: 'OsiÄ…gniÄ™cia', emoji: 'đźŹ†', requiresQualitative: false },
  { id: 'mbti', title: 'MBTI', emoji: 'đź§¬', requiresQualitative: true },
  { id: 'cps', title: 'Wzorce', emoji: 'đź§ ', requiresQualitative: true },
];

export default function ShareCardGallery({ analysis }: ShareCardGalleryProps) {
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const { conversation, quantitative, qualitative } = analysis;
  const participants = conversation.participants.map((p) => p.name);
  const hasQualitative = qualitative?.status === 'complete';

  const availableCards = CARD_CONFIGS.filter(
    (c) => !c.requiresQualitative || hasQualitative,
  );

  
  const copyShareLink = useCallback(() => {
    try {
      const shareUrl = buildShareUrl(analysis);
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(shareUrl).then(() => {
          setLinkCopied(true);
          setTimeout(() => setLinkCopied(false), 2000);
        });
      }
    } catch (err) {
      void err;
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
      default:
        return null;
    }
  };

  return (
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
            <><Link2 className="size-3.5" /> Udost\u0119pnij link</>
          )}
        </button>
      </div>
      {/* Card thumbnails */}
      <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-3 sm:overflow-x-auto pb-2 scrollbar-thin">
        {availableCards.map((card) => (
          <button
            key={card.id}
            onClick={() => setActiveCard(activeCard === card.id ? null : card.id)}
            className="group flex min-w-0 sm:w-[120px] sm:shrink-0 flex-col items-center gap-1.5 sm:gap-2 rounded-xl border border-border bg-card p-3 sm:p-4 transition-all hover:border-border-hover hover:bg-card-hover"
            style={{
              width: undefined,
              borderColor: activeCard === card.id ? '#3b82f6' : undefined,
            }}
          >
            <span className="text-lg sm:text-2xl">{card.emoji}</span>
            <span className="text-xs font-medium text-foreground">{card.title}</span>
            <span className="hidden sm:flex items-center gap-1 text-[10px] text-text-muted">
              <Download className="size-3" />
              {card.size ?? '1080Ă—1920'}
            </span>
          </button>
        ))}
      </div>

      {/* Active card preview */}
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
              {renderFullCard(activeCard)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

