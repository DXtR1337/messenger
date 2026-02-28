'use client';

import dynamic from 'next/dynamic';

import { useAnalysis } from '@/lib/analysis/analysis-context';
import ModePageShell from '@/components/shared/ModePageShell';
import AnalysisCard from '@/components/shared/AnalysisCard';

const ShareCardGallery = dynamic(() => import('@/components/share-cards/ShareCardGallery'), { ssr: false });
const ExportPDFButton = dynamic(() => import('@/components/analysis/ExportPDFButton'), { ssr: false });
const StandUpPDFButton = dynamic(() => import('@/components/analysis/StandUpPDFButton'), { ssr: false });
const ParticipantPhotoUpload = dynamic(() => import('@/components/analysis/ParticipantPhotoUpload'), { ssr: false });

export default function ShareModePage() {
  const {
    analysis,
    participants,
    participantPhotos,
    onPhotoUpload,
    onPhotoRemove,
  } = useAnalysis();

  return (
    <ModePageShell
      mode="share"
      title="Studio Eksportu"
      subtitle="Karty do udostepniania, raporty PDF, galeria"
      video={{ src: '/videos/modes/share.mp4' }}
    >
      <div className="space-y-6">
        {/* Photo Upload */}
        <AnalysisCard glass>
          <h3 className="mb-4 font-mono text-sm font-semibold uppercase tracking-wider text-foreground">
            Zdjecia uczestnikow
          </h3>
          <ParticipantPhotoUpload
            participants={participants}
            photos={participantPhotos}
            onUpload={onPhotoUpload}
            onRemove={onPhotoRemove}
          />
        </AnalysisCard>

        {/* PDF Export */}
        <div className="grid gap-4 sm:grid-cols-2">
          <AnalysisCard glass>
            <ExportPDFButton
              analysis={analysis}
            />
          </AnalysisCard>
          <AnalysisCard glass>
            <StandUpPDFButton
              analysis={analysis}
            />
          </AnalysisCard>
        </div>

        {/* Share Card Gallery */}
        <AnalysisCard glass shadow>
          <ShareCardGallery
            analysis={analysis}
          />
        </AnalysisCard>
      </div>
    </ModePageShell>
  );
}
