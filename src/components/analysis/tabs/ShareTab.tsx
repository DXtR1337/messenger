'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Sparkles, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';

import type { StoredAnalysis, QualitativeAnalysis, MegaRoastResult, CwelTygodniaResult } from '@/lib/analysis/types';
import type { QuantitativeAnalysis, ParsedConversation } from '@/lib/parsers/types';

import ParticipantPhotoUpload from '@/components/analysis/ParticipantPhotoUpload';
import ShareCaptionModal from '@/components/analysis/ShareCaptionModal';
import SectionDivider from '@/components/analysis/SectionDivider';
import PaywallGate from '@/components/shared/PaywallGate';

const ExportPDFButton = dynamic(() => import('@/components/analysis/ExportPDFButton'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const StandUpPDFButton = dynamic(() => import('@/components/analysis/StandUpPDFButton'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const ShareCardGallery = dynamic(() => import('@/components/share-cards/ShareCardGallery'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-xl bg-card" />,
});
const ParticipantPicker = dynamic(() => import('@/components/analysis/ParticipantPicker'), {
  ssr: false,
});
const MegaRoastButton = dynamic(() => import('@/components/analysis/MegaRoastButton'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const MegaRoastSection = dynamic(() => import('@/components/analysis/MegaRoastSection'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const CwelTygodniaButton = dynamic(() => import('@/components/analysis/CwelTygodniaButton'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const CwelTygodniaSection = dynamic(() => import('@/components/analysis/CwelTygodniaSection'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});

const sv = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};
const dur = 0.4;
const vp = { once: true, margin: '-80px' as const };

interface ShareTabProps {
  analysis: StoredAnalysis;
  quantitative: QuantitativeAnalysis;
  conversation: ParsedConversation;
  participants: string[];
  isServerView: boolean;
  sortedParticipants: string[];
  qualitative: QualitativeAnalysis | undefined;
  participantPhotos: Record<string, string>;
  onPhotoUpload: (name: string, base64: string) => void;
  onPhotoRemove: (name: string) => void;
  onMegaRoastComplete: (megaRoast: MegaRoastResult) => void;
  onCwelComplete: (cwel: CwelTygodniaResult) => void;
}

export default function ShareTab({
  analysis,
  quantitative,
  conversation,
  participants,
  isServerView,
  sortedParticipants,
  qualitative,
  participantPhotos,
  onPhotoUpload,
  onPhotoRemove,
  onMegaRoastComplete,
  onCwelComplete,
}: ShareTabProps) {
  const [showCaptionModal, setShowCaptionModal] = useState(false);
  const [selectedPair, setSelectedPair] = useState<[string, string] | null>(null);
  const [megaRoastTarget, setMegaRoastTarget] = useState<string | null>(null);

  return (
    <div>
      <SectionDivider number="05" title="Udostępnij wyniki" subtitle="Niech inni też zobaczą" id="section-share" />

      <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
        <ParticipantPhotoUpload
          participants={participants}
          photos={participantPhotos}
          onUpload={onPhotoUpload}
          onRemove={onPhotoRemove}
        />
      </motion.div>

      <motion.div id="section-export" className="mt-6" variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
        <div className="mb-4 flex items-center gap-3">
          <PaywallGate feature="pdf_export" blurPreview={false}>
            <div className="flex items-center gap-3">
              <ExportPDFButton analysis={{...analysis, participantPhotos}} />
              <StandUpPDFButton analysis={analysis} />
            </div>
          </PaywallGate>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCaptionModal(true)}
            className="gap-2"
          >
            <Sparkles className="size-4" />
            Gotowe captiony
          </Button>
        </div>
      </motion.div>

      <ShareCaptionModal
        isOpen={showCaptionModal}
        onClose={() => setShowCaptionModal(false)}
        participants={participants}
        healthScore={qualitative?.pass4?.health_score?.overall}
        compatibilityScore={quantitative.viralScores?.compatibilityScore}
        delusionScore={quantitative.viralScores?.delusionScore}
        analysis={analysis}
      />

      {isServerView && (
        <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
          <ParticipantPicker
            participants={sortedParticipants}
            quantitative={quantitative}
            onPairSelected={setSelectedPair}
          />
        </motion.div>
      )}

      {/* Mega Roast — single-target roast (server view) */}
      {isServerView && (
        <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Flame className="size-4 text-orange-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mega Roast — wybierz ofiarę
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={megaRoastTarget ?? ''}
                onChange={(e) => setMegaRoastTarget(e.target.value || null)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-sm text-foreground outline-none transition-colors hover:border-border-hover focus:border-orange-500"
              >
                <option value="">Wybierz osobę...</option>
                {sortedParticipants.map((name) => (
                  <option key={name} value={name}>
                    {name} ({quantitative.perPerson[name]?.totalMessages ?? 0} msg)
                  </option>
                ))}
              </select>
              {megaRoastTarget && !analysis.qualitative?.megaRoast && (
                <MegaRoastButton
                  analysis={analysis}
                  targetPerson={megaRoastTarget}
                  onComplete={onMegaRoastComplete}
                />
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Mega Roast Results */}
      {analysis.qualitative?.megaRoast && (
        <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
          <MegaRoastSection result={analysis.qualitative.megaRoast} discordChannelId={analysis.conversation.metadata.discordChannelId} />
        </motion.div>
      )}

      {/* Cwel Tygodnia (server view / 3+ participants) */}
      {isServerView && (
        <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
          {analysis.qualitative?.cwelTygodnia ? (
            <CwelTygodniaSection result={analysis.qualitative.cwelTygodnia} discordChannelId={analysis.conversation.metadata.discordChannelId} />
          ) : (
            <CwelTygodniaButton analysis={analysis} onComplete={onCwelComplete} />
          )}
        </motion.div>
      )}

      <motion.div id="section-cards" variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
        <ShareCardGallery analysis={analysis} selectedPair={selectedPair} />
      </motion.div>
    </div>
  );
}
