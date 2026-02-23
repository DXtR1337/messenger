'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

import type { StoredAnalysis, QualitativeAnalysis } from '@/lib/analysis/types';
import type { QuantitativeAnalysis, ParsedConversation, ThreatMetersResult } from '@/lib/parsers/types';
import type { CPSResult } from '@/lib/analysis/communication-patterns';
import { meetsCPSRequirements } from '@/lib/analysis/communication-patterns';
import { useCPSAnalysis } from '@/hooks/useCPSAnalysis';
import type { SubtextResult } from '@/lib/analysis/subtext';
import { useSubtextAnalysis } from '@/hooks/useSubtextAnalysis';
import type { CourtResult } from '@/lib/analysis/court-prompts';
import type { DatingProfileResult } from '@/lib/analysis/dating-profile-prompts';
import type { GottmanResult } from '@/lib/analysis/gottman-horsemen';

import SectionDivider from '@/components/analysis/SectionDivider';
import PaywallGate from '@/components/shared/PaywallGate';
import ViralScoresSection from '@/components/analysis/ViralScoresSection';
import BestTimeToTextCard from '@/components/analysis/BestTimeToTextCard';
import CatchphraseCard from '@/components/analysis/CatchphraseCard';

const CPSScreener = dynamic(() => import('@/components/analysis/CPSScreener'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const SubtextDecoder = dynamic(() => import('@/components/analysis/SubtextDecoder'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const GottmanHorsemen = dynamic(() => import('@/components/analysis/GottmanHorsemen'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const ChatCourtButton = dynamic(() => import('@/components/analysis/ChatCourtButton'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const CourtVerdict = dynamic(() => import('@/components/analysis/CourtVerdict'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const DatingProfileButton = dynamic(() => import('@/components/analysis/DatingProfileButton'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const DatingProfileResult = dynamic(() => import('@/components/analysis/DatingProfileResult'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const ReplySimulator = dynamic(() => import('@/components/analysis/ReplySimulator'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const GhostForecast = dynamic(() => import('@/components/analysis/GhostForecast'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const ThreatMeters = dynamic(() => import('@/components/analysis/ThreatMeters'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});

const sv = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};
const dur = 0.4;
const vp = { once: true, margin: '-80px' as const };

interface EntertainmentTabProps {
  analysis: StoredAnalysis;
  quantitative: QuantitativeAnalysis;
  qualitative: QualitativeAnalysis | undefined;
  conversation: ParsedConversation;
  participants: string[];
  isServerView: boolean;
  sortedParticipants: string[];
  hasQualitative: boolean;
  gottmanResult: GottmanResult | undefined;
  threatMeters: ThreatMetersResult | undefined;
  onCPSComplete: (cps: CPSResult) => void;
  onSubtextComplete: (subtext: SubtextResult) => void;
  onCourtComplete: (court: CourtResult) => void;
  onDatingProfileComplete: (profile: DatingProfileResult) => void;
}

export default function EntertainmentTab({
  analysis,
  quantitative,
  qualitative,
  conversation,
  participants,
  isServerView,
  hasQualitative,
  gottmanResult,
  threatMeters,
  onCPSComplete,
  onSubtextComplete,
  onCourtComplete,
  onDatingProfileComplete,
}: EntertainmentTabProps) {
  return (
    <div>
      {/* ======= VIRAL SCORES ======= */}
      {quantitative.viralScores && !isServerView && (
        <>
          <SectionDivider number="04" title="Viral Scores" subtitle="Liczby nie kłamią. Ludzie — owszem." id="section-viral" />
          <div className="space-y-4">
            <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
              <ViralScoresSection quantitative={quantitative} participants={participants} />
            </motion.div>
            <motion.div
              className="grid gap-4 grid-cols-1 lg:grid-cols-2"
              variants={sv}
              initial="hidden"
              animate="visible"
              transition={{ duration: dur }}
            >
              {quantitative.bestTimeToText && (
                <BestTimeToTextCard bestTimeToText={quantitative.bestTimeToText} participants={participants} />
              )}
              {quantitative.catchphrases && (
                <CatchphraseCard catchphrases={quantitative.catchphrases} participants={participants} />
              )}
            </motion.div>
          </div>
        </>
      )}

      {/* ======= GHOST FORECAST ======= */}
      {quantitative.viralScores?.ghostRisk && !isServerView && (
        <>
          <SectionDivider title="Prognoza Ghostingu" subtitle="Prawdopodobieństwo że rozmowa ucichnie. Na zawsze." />
          <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
            <GhostForecast viralScores={quantitative.viralScores} participants={participants} />
          </motion.div>
        </>
      )}

      {/* ======= THREAT METERS (duplicated here from overview for entertainment context) ======= */}
      {threatMeters && threatMeters.meters.length > 0 && !isServerView && (
        <>
          <SectionDivider title="Wskaźniki zagrożeń" subtitle="Ukryte wzorce, które warto monitorować" />
          <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
            <ThreatMeters meters={threatMeters} />
          </motion.div>
        </>
      )}

      {/* ======= CPS SCREENER ======= */}
      {hasQualitative && (
        <>
          <SectionDivider title="Wzorce komunikacyjne" subtitle="Jak rozmawiacie — styl, tempo, nawyki" id="section-cps" />
          <PaywallGate feature="cps_screener" teaser={{
            headline: '63 wzorce komunikacji do analizy',
            detail: 'Wykryliśmy potencjalne wzorce manipulacji...',
            icon: 'fire',
          }}>
            <CPSScreenerSection
              analysis={analysis}
              onCPSComplete={onCPSComplete}
            />
            <p className="text-[11px] italic text-muted-foreground/50 px-1 mt-2">
              CPS to narzędzie orientacyjne oparte na analizie wzorców tekstu. Nie zastępuje konsultacji ze specjalistą i nie stanowi diagnozy klinicznej.
            </p>
          </PaywallGate>
        </>
      )}

      {/* ======= GOTTMAN FOUR HORSEMEN ======= */}
      {gottmanResult && !isServerView && (
        <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
          <GottmanHorsemen result={gottmanResult} />
        </motion.div>
      )}

      {/* ======= SUBTEXT DECODER ======= */}
      {hasQualitative && (
        <>
          <SectionDivider title="Translator podtekstów" subtitle="Co naprawdę mieli na myśli?" />
          <PaywallGate feature="subtext_decoder" teaser={{
            headline: 'Ukryte podteksty wykryte',
            detail: 'W tym pasywno-agresywne wiadomości...',
            icon: 'sparkles',
          }}>
            <SubtextSection
              analysis={analysis}
              onSubtextComplete={onSubtextComplete}
            />
          </PaywallGate>
        </>
      )}

      {/* ======= COURT TRIAL ======= */}
      <SectionDivider title="Twój Chat w Sądzie" subtitle="Każda rozmowa ma swoje ofiary. I sprawców." id="section-court" />
      <PaywallGate feature="court_trial" teaser={{
        headline: 'Akt oskarżenia gotowy',
        detail: 'Zarzuty: ghosting, manipulacja emocjonalna...',
        icon: 'shield',
      }}>
        <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
          {qualitative?.courtTrial ? (
            <CourtVerdict result={qualitative.courtTrial} />
          ) : (
            <ChatCourtButton
              analysis={analysis}
              onComplete={onCourtComplete}
            />
          )}
        </motion.div>
      </PaywallGate>

      {/* ======= DATING PROFILE ======= */}
      <SectionDivider title="Szczery Profil Randkowy" subtitle="Tinder na podstawie tego jak naprawdę piszesz. Bez filtrów." />
      <PaywallGate feature="dating_profile" teaser={{
        headline: 'Twój szczery profil randkowy czeka',
        detail: `Na podstawie ${conversation.messages?.length ?? 'tysięcy'} wiadomości...`,
        icon: 'heart',
      }}>
        <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
          {qualitative?.datingProfile ? (
            <DatingProfileResult result={qualitative.datingProfile} participants={participants} />
          ) : (
            <DatingProfileButton
              analysis={analysis}
              onComplete={onDatingProfileComplete}
            />
          )}
        </motion.div>
      </PaywallGate>

      {/* ======= REPLY SIMULATOR ======= */}
      <SectionDivider title="Symulator Odpowiedzi" subtitle="Napisz wiadomość. AI odpowie tak jak ta osoba." />
      <PaywallGate feature="reply_simulator" teaser={{
        headline: `${participants[1] || 'Druga osoba'} odpowie za chwilę...`,
        detail: 'Symulacja na podstawie stylu pisania',
        icon: 'brain',
      }}>
        <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
          <ReplySimulator
            conversation={conversation}
            quantitative={quantitative}
            qualitative={qualitative}
            participants={participants}
          />
        </motion.div>
      </PaywallGate>
    </div>
  );
}

// ===============================================================
// CPS (Communication Pattern Screener) Section Component
// ===============================================================

interface CPSScreenerSectionProps {
  analysis: StoredAnalysis;
  onCPSComplete: (cps: CPSResult) => void;
}

function CPSScreenerSection({ analysis, onCPSComplete }: CPSScreenerSectionProps) {
  const { conversation, quantitative, qualitative } = analysis;
  const participants = conversation.participants.map((p) => p.name);

  const [selectedParticipant, setSelectedParticipant] = useState(participants[0]);

  const { runCPS, isLoading, progress, result, error, reset } = useCPSAnalysis({
    conversation,
    quantitative,
    participantName: selectedParticipant,
  });

  // Calculate timespan in ms
  const timespanMs = conversation.metadata.dateRange.end
    ? conversation.metadata.dateRange.end - conversation.metadata.dateRange.start
    : Date.now() - conversation.metadata.dateRange.start;

  // Check requirements
  const completedPasses: number[] = [];
  if (qualitative?.pass1) completedPasses.push(1);
  if (qualitative?.pass2) completedPasses.push(2);
  if (qualitative?.pass3) completedPasses.push(3);
  const requirementsCheck = meetsCPSRequirements(
    conversation.metadata.totalMessages,
    timespanMs,
    completedPasses,
  );

  // Use saved result only if it matches the selected participant
  const savedResult = qualitative?.cps;
  const savedMatchesSelected = savedResult?.participantName === selectedParticipant;
  const displayResult = result ?? (savedMatchesSelected ? savedResult : undefined);

  const handleRun = useCallback(async () => {
    await runCPS();
  }, [runCPS]);

  const handleParticipantChange = useCallback((name: string) => {
    setSelectedParticipant(name);
    reset();
  }, [reset]);

  // When we get a new result, save it
  useEffect(() => {
    if (result) {
      onCPSComplete(result);
    }
  }, [result, onCPSComplete]);

  return (
    <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
      <div className="space-y-4">
        {/* Participant selector for multi-person conversations */}
        {participants.length > 1 && !isLoading && (
          <div className="flex items-center gap-3 p-3 bg-card/50 rounded-lg border border-border">
            <span className="text-sm text-muted-foreground">Analizuj dla:</span>
            <div className="flex gap-2">
              {participants.map((name) => (
                <Button
                  key={name}
                  size="sm"
                  variant={selectedParticipant === name ? 'default' : 'outline'}
                  onClick={() => handleParticipantChange(name)}
                  className={
                    selectedParticipant === name
                      ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                      : 'border-border text-muted-foreground'
                  }
                >
                  {name}
                </Button>
              ))}
            </div>
          </div>
        )}

        <CPSScreener
          cpsResult={displayResult}
          onRunCPS={handleRun}
          isLoading={isLoading}
          progress={progress}
          messageCount={conversation.metadata.totalMessages}
          timespanMs={timespanMs}
          completedPasses={completedPasses}
          canRun={requirementsCheck.meets}
          reasonsCannotRun={requirementsCheck.reasons}
        />

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg space-y-2">
            <p className="text-sm font-medium text-red-400">Błąd analizy wzorców</p>
            <p className="text-xs text-red-300/80">{error}</p>
            <button
              onClick={reset}
              className="text-xs text-red-400 underline hover:text-red-300"
            >
              Spróbuj ponownie
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ===============================================================
// Subtext Decoder Section Component
// ===============================================================

interface SubtextSectionProps {
  analysis: StoredAnalysis;
  onSubtextComplete: (subtext: SubtextResult) => void;
}

function SubtextSection({ analysis, onSubtextComplete }: SubtextSectionProps) {
  const { conversation, quantitative, qualitative } = analysis;

  const { runSubtext, isLoading, progress, result, error, reset } = useSubtextAnalysis({
    conversation,
    quantitative,
    qualitative,
  });

  // Use saved result if available
  const savedResult = qualitative?.subtext;
  const displayResult = result ?? savedResult;

  const handleRun = useCallback(async () => {
    await runSubtext();
  }, [runSubtext]);

  // When we get a new result, save it
  useEffect(() => {
    if (result) {
      onSubtextComplete(result);
    }
  }, [result, onSubtextComplete]);

  return (
    <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
      <SubtextDecoder
        subtextResult={displayResult}
        onRunSubtext={handleRun}
        isLoading={isLoading}
        progress={progress}
        canRun={conversation.metadata.totalMessages >= 100}
        error={error}
      />
      {error && !isLoading && (
        <div className="mt-2 text-center">
          <button
            onClick={reset}
            className="text-xs text-purple-400 underline hover:text-purple-300"
          >
            Resetuj i spróbuj ponownie
          </button>
        </div>
      )}
    </motion.div>
  );
}
