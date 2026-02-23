'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sparkles, ChevronRight } from 'lucide-react';

import type { StoredAnalysis, QualitativeAnalysis } from '@/lib/analysis/types';
import type { QuantitativeAnalysis, ParsedConversation, ThreatMetersResult } from '@/lib/parsers/types';
import type { DeltaMetrics } from '@/lib/analysis/delta';

import KPICards from '@/components/analysis/KPICards';
import StatsGrid from '@/components/analysis/StatsGrid';
import SectionDivider from '@/components/analysis/SectionDivider';
import PersonNavigator from '@/components/analysis/PersonNavigator';
import PersonProfile from '@/components/analysis/PersonProfile';
import ServerOverview from '@/components/analysis/ServerOverview';
import ServerLeaderboard from '@/components/analysis/ServerLeaderboard';
import PairwiseComparison from '@/components/analysis/PairwiseComparison';

const LongitudinalDelta = dynamic(() => import('@/components/analysis/LongitudinalDelta'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const TeamRoles = dynamic(() => import('@/components/analysis/TeamRoles'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const CommunityMap = dynamic(() => import('@/components/analysis/CommunityMap'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const BadgesGrid = dynamic(() => import('@/components/analysis/BadgesGrid'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const RankingBadges = dynamic(() => import('@/components/analysis/RankingBadges'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const GroupChatAwards = dynamic(() => import('@/components/analysis/GroupChatAwards'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const NetworkGraph = dynamic(() => import('@/components/analysis/NetworkGraph'), {
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

interface OverviewTabProps {
  analysis: StoredAnalysis;
  quantitative: QuantitativeAnalysis;
  qualitative: QualitativeAnalysis | undefined;
  conversation: ParsedConversation;
  participants: string[];
  isServerView: boolean;
  sortedParticipants: string[];
  deltaMetrics: DeltaMetrics | null;
  threatMeters: ThreatMetersResult | undefined;
}

export default function OverviewTab({
  analysis,
  quantitative,
  qualitative,
  conversation,
  participants,
  isServerView,
  sortedParticipants,
  deltaMetrics,
  threatMeters,
}: OverviewTabProps) {
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const selectedPersonIndex = selectedPerson ? sortedParticipants.indexOf(selectedPerson) : -1;

  return (
    <div>
      {/* ======= SERVER VIEW: OVERVIEW ======= */}
      {isServerView && (
        <>
          <SectionDivider number="00" title="Przegląd serwera" subtitle={`${participants.length} uczestników`} id="section-server" />
          <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
            <ServerOverview quantitative={quantitative} conversation={conversation} participants={participants} />
          </motion.div>
        </>
      )}

      {/* ======= SERVER VIEW: DYNAMIKA ZESPOLU ======= */}
      {isServerView && quantitative.teamAnalysis && (
        <>
          <SectionDivider number="00.5" title="Dynamika zespołu" subtitle="Role i podgrupy w grupie" id="section-team" />
          <div className="space-y-4">
            <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
              <TeamRoles teamAnalysis={quantitative.teamAnalysis} participants={participants} />
            </motion.div>
            <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
              <CommunityMap communities={quantitative.teamAnalysis.communities} participants={participants} />
            </motion.div>
          </div>
        </>
      )}

      {/* ======= KLUCZOWE METRYKI ======= */}
      <SectionDivider number="01" title="Kluczowe metryki" id="section-metrics" />
      <div className="space-y-4">
        <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
          <KPICards quantitative={quantitative} conversation={conversation} />
        </motion.div>
        <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
          <StatsGrid quantitative={quantitative} participants={participants} platform={conversation.platform} />
        </motion.div>
      </div>

      {/* ======= LONGITUDINAL DELTA ======= */}
      {deltaMetrics && (
        <motion.div className="mt-10" variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
          <LongitudinalDelta delta={deltaMetrics} />
        </motion.div>
      )}

      {/* ======= SERVER VIEW: UCZESTNICY ======= */}
      {isServerView && (
        <>
          <SectionDivider number="01.5" title="Uczestnicy" subtitle="Kliknij osobę, aby zobaczyć jej profil" id="section-participants" />
          <motion.div
            className="grid gap-4 grid-cols-1 lg:grid-cols-[300px_1fr]"
            variants={sv}
            initial="hidden"
            whileInView="visible"
            viewport={vp}
            transition={{ duration: dur }}
          >
            <PersonNavigator
              participants={participants}
              perPerson={quantitative.perPerson}
              totalMessages={conversation.metadata.totalMessages}
              selectedPerson={selectedPerson}
              onSelectPerson={setSelectedPerson}
              quantitative={quantitative}
            />
            {selectedPerson ? (
              <PersonProfile
                name={selectedPerson}
                index={selectedPersonIndex >= 0 ? selectedPersonIndex : 0}
                quantitative={quantitative}
                conversation={conversation}
              />
            ) : (
              <div className="flex items-center justify-center rounded-xl border border-border border-dashed bg-card/50 p-12 text-center">
                <div>
                  <div className="text-3xl mb-2">{'\u{1F464}'}</div>
                  <p className="text-sm text-text-muted">Wybierz osobę z listy,<br />aby zobaczyć szczegółowy profil</p>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}

      {/* ======= SERVER VIEW: RANKING + POROWNANIE ======= */}
      {isServerView && (
        <>
          <SectionDivider number="03.5" title="Ranking i porównania" subtitle="Kto dominuje, kto kisi się w cieniu" id="section-ranking" />
          <motion.div
            className="grid gap-4 grid-cols-1 lg:grid-cols-2"
            variants={sv}
            initial="hidden"
            whileInView="visible"
            viewport={vp}
            transition={{ duration: dur }}
          >
            <ServerLeaderboard
              participants={participants}
              quantitative={quantitative}
              platform={conversation.platform}
              onSelectPerson={(name) => {
                setSelectedPerson(name);
                document.getElementById('section-participants')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
            <PairwiseComparison
              participants={participants}
              quantitative={quantitative}
            />
          </motion.div>
        </>
      )}

      {/* ======= THREAT METERS ======= */}
      {threatMeters && threatMeters.meters.length > 0 && !isServerView && (
        <>
          <SectionDivider title="Wskaźniki zagrożeń" subtitle="Ukryte wzorce, które warto monitorować" />
          <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
            <ThreatMeters meters={threatMeters} />
          </motion.div>
        </>
      )}

      {/* ======= OSIAGNIECIA ======= */}
      {quantitative.badges && quantitative.badges.length > 0 && (
        <>
          <SectionDivider title="Osiągnięcia" subtitle="Odznaki za zasługi i przewinienia" id="section-badges" />
          <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
            <BadgesGrid badges={quantitative.badges} participants={participants} />
          </motion.div>
        </>
      )}

      {/* ======= RANKING PERCENTILES ======= */}
      {quantitative.rankingPercentiles && (
        <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
          <RankingBadges rankings={quantitative.rankingPercentiles} />
        </motion.div>
      )}

      {/* ======= DELUSION QUIZ RESULTS ======= */}
      {!conversation.metadata.isGroup && participants.length === 2 && qualitative?.delusionQuiz && (
        <>
          <SectionDivider title="Stawiam Zakład" subtitle="Twój wynik z quizu samoświadomości." />
          <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-2 font-mono text-xs uppercase tracking-widest text-text-muted">Twój wynik</div>
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-4xl font-bold text-foreground">{qualitative.delusionQuiz.score}/15</span>
                <span className="font-mono text-lg text-purple-400">{qualitative.delusionQuiz.label}</span>
              </div>
              <div className="mt-1 text-sm text-text-muted">Delusion Index: {qualitative.delusionQuiz.delusionIndex}/100</div>
              <Link href={`/analysis/${analysis.id}/couple`}>
                <Button variant="outline" className="mt-4 gap-2 border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
                  <Sparkles className="size-4" />
                  Wyzwij drugą osobę
                  <ChevronRight className="size-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </>
      )}

      {/* ======= GROUP CHAT AWARDS ======= */}
      {conversation.metadata.isGroup && (
        <>
          <SectionDivider title="Group Chat Awards" subtitle="Nagrody za wybitne osiągnięcia grupowe" />
          <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
            <GroupChatAwards quantitative={quantitative} conversation={conversation} />
          </motion.div>
        </>
      )}

      {/* ======= SIEC INTERAKCJI ======= */}
      {quantitative.networkMetrics && (
        <>
          <SectionDivider title="Sieć interakcji" subtitle="Kto z kim rozmawia, a kto jest pomijany" />
          <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
            <NetworkGraph
              networkMetrics={quantitative.networkMetrics}
              participants={participants}
            />
          </motion.div>
        </>
      )}
    </div>
  );
}
