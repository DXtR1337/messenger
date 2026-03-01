'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, Share2, X, Loader2 } from 'lucide-react';
import { trackEvent } from '@/lib/analytics/events';
import type { EksResult } from '@/lib/analysis/eks-prompts';
import type { QuantitativeAnalysis } from '@/lib/parsers/types';

// ── Dynamic share card imports (code-split) ──────────────────
const NekrologCard = dynamic(() => import('@/components/share-cards/NekrologCard'), { ssr: false });
const AktZgonuCard = dynamic(() => import('@/components/share-cards/AktZgonuCard'), { ssr: false });
const ParagonCzasuCard = dynamic(() => import('@/components/share-cards/ParagonCzasuCard'), { ssr: false });
const AutopsyCard = dynamic(() => import('@/components/share-cards/AutopsyCard'), { ssr: false });
const ForecastCard = dynamic(() => import('@/components/share-cards/ForecastCard'), { ssr: false });
const DecayPhasesCard = dynamic(() => import('@/components/share-cards/DecayPhasesCard'), { ssr: false });
const TombstoneCard = dynamic(() => import('@/components/share-cards/TombstoneCard'), { ssr: false });
const GoldenAgeCard = dynamic(() => import('@/components/share-cards/GoldenAgeCard'), { ssr: false });
const UnsaidCard = dynamic(() => import('@/components/share-cards/UnsaidCard'), { ssr: false });
const DeathCertificateCard = dynamic(() => import('@/components/share-cards/DeathCertificateCard'), { ssr: false });
const DeathLineCard = dynamic(() => import('@/components/share-cards/DeathLineCard'), { ssr: false });

// ── Types ────────────────────────────────────────────────────

interface EksCardDef {
  id: string;
  emoji: string;
  label: string;
  available: boolean;
}

interface EksCardGalleryProps {
  result: EksResult;
  participants: string[];
  quantitative: QuantitativeAnalysis;
  qualitative?: { pass4?: { health_score?: { overall?: number } } };
}

// ── Death line data builder ──────────────────────────────────

function buildDeathLineData(quantitative: QuantitativeAnalysis) {
  const intimacyTrend = quantitative?.intimacyProgression?.trend || [];
  const sentimentTrend = quantitative?.trends?.sentimentTrend || [];
  const responseTimeTrend = quantitative?.trends?.responseTimeTrend || [];
  const monthSet = new Set<string>();
  intimacyTrend.forEach((d) => monthSet.add(d.month));
  sentimentTrend.forEach((d) => monthSet.add(d.month));
  responseTimeTrend.forEach((d) => monthSet.add(d.month));
  const months = Array.from(monthSet).sort();
  if (months.length === 0) return [];
  const intimacyMap = new Map(intimacyTrend.map((d) => [d.month, d.score]));
  const sentimentMap = new Map<string, number>();
  for (const entry of sentimentTrend) {
    const values = Object.values(entry.perPerson);
    if (values.length > 0) sentimentMap.set(entry.month, values.reduce((a, b) => a + b, 0) / values.length);
  }
  const rtMap = new Map<string, number>();
  for (const entry of responseTimeTrend) {
    const values = Object.values(entry.perPerson);
    if (values.length > 0) rtMap.set(entry.month, values.reduce((a, b) => a + b, 0) / values.length);
  }
  const rtValues = Array.from(rtMap.values());
  const maxRt = Math.max(...rtValues, 1);
  return months.map((month) => {
    const intimacy = intimacyMap.get(month) ?? 50;
    const rawSentiment = sentimentMap.get(month) ?? 0;
    const sentiment = ((rawSentiment + 1) / 2) * 100;
    const rawRt = rtMap.get(month) ?? maxRt / 2;
    const responseTime = Math.max(0, (1 - rawRt / maxRt) * 100);
    const redZone = intimacy < 30 && sentiment < 30 && responseTime < 30 ? 30 : 0;
    return { month, intimacy: Math.round(intimacy), sentiment: Math.round(sentiment), responseTime: Math.round(responseTime), redZone };
  });
}

// ── Component ────────────────────────────────────────────────

export default function EksCardGallery({
  result,
  participants,
  quantitative,
  qualitative,
}: EksCardGalleryProps) {
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  // Fallback values for fields AI may leave empty
  const duration = result.relationshipDuration || 'Nieznany';
  const deathDate = result.deathDate || 'Nieznana';

  const cards: EksCardDef[] = useMemo(() => [
    { id: 'nekrolog', emoji: '\u26B0\uFE0F', label: 'Nekrolog', available: true },
    { id: 'akt-zgonu', emoji: '\uD83D\uDCDC', label: 'Akt Zgonu', available: true },
    { id: 'paragon', emoji: '\uD83E\uDDFE', label: 'Paragon', available: true },
    { id: 'autopsy', emoji: '\uD83D\uDD2C', label: 'Sekcja', available: true },
    { id: 'forecast', emoji: '\uD83D\uDD2E', label: 'Prognoza', available: true },
    { id: 'decay', emoji: '\uD83D\uDCC9', label: 'Fazy', available: true },
    { id: 'tombstone', emoji: '\uD83E\uDEA6', label: 'Nagrobek', available: true },
    { id: 'golden', emoji: '\u2728', label: 'Złoty Okres', available: true },
    { id: 'unsaid', emoji: '\uD83D\uDC7B', label: 'Niewypowiedziane', available: !!result.unsaidThings },
    { id: 'death-cert', emoji: '\uD83D\uDCCB', label: 'Akt Zgonu V2', available: !!result.deathCertificate },
    { id: 'death-line', emoji: '\uD83D\uDCC8', label: 'Wykres Śmierci', available: true },
  ], [result]);

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function' && typeof navigator.canShare === 'function';

  const captureCardBlob = useCallback(async (): Promise<Blob | null> => {
    const el = captureRef.current;
    if (!el) return null;
    const html2canvas = (await import('html2canvas-pro')).default;
    const canvas = await html2canvas(el, {
      backgroundColor: '#09090b',
      scale: 3,
      useCORS: true,
    });
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  }, []);

  const handleDownload = useCallback(async () => {
    if (!captureRef.current || isDownloading) return;
    setIsDownloading(true);
    try {
      const blob = await captureCardBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `podtekst-eks-${activeCard}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      trackEvent({ name: 'share_card_download', params: { cardType: `eks-${activeCard}` } });
    } finally {
      setIsDownloading(false);
    }
  }, [activeCard, isDownloading, captureCardBlob]);

  const [isSharing, setIsSharing] = useState(false);
  const handleShare = useCallback(async () => {
    if (!captureRef.current || isSharing) return;
    setIsSharing(true);
    try {
      const blob = await captureCardBlob();
      if (!blob) return;
      const file = new File([blob], `podtekst-eks-${activeCard}.png`, { type: 'image/png' });
      if (canNativeShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'PodTeksT \u00B7 Tryb Eks',
          text: 'Moja analiza na PodTeksT',
        });
        trackEvent({ name: 'share_card_share', params: { cardType: `eks-${activeCard}`, method: 'native' } });
      }
    } catch {
      // user cancelled share dialog
    } finally {
      setIsSharing(false);
    }
  }, [activeCard, isSharing, captureCardBlob, canNativeShare]);

  // Escape key closes preview
  useEffect(() => {
    if (!activeCard) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveCard(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeCard]);

  const renderCard = useCallback((cardId: string) => {
    const totalMsgs = Object.values(quantitative.perPerson).reduce((s, p) => s + p.totalMessages, 0);
    switch (cardId) {
      case 'nekrolog':
        return <NekrologCard participants={participants} duration={duration} deathDate={deathDate} causeOfDeath={result.causeOfDeath.primary} epitaph={result.epitaph} />;
      case 'akt-zgonu':
        return <AktZgonuCard participants={participants} duration={duration} deathDate={deathDate} causeOfDeath={result.causeOfDeath.primary} contributingFactors={result.causeOfDeath.contributingFactors} wasItPreventable={result.causeOfDeath.wasItPreventable} />;
      case 'paragon':
        return <ParagonCzasuCard participants={participants} totalMessages={totalMsgs} duration={duration} />;
      case 'autopsy':
        return <AutopsyCard causeOfDeath={result.causeOfDeath.primary} turningPointDate={result.turningPoint.approximateDate} epitaph={result.epitaph} wasItPreventable={result.causeOfDeath.wasItPreventable} healthScore={qualitative?.pass4?.health_score?.overall} />;
      case 'forecast':
        return <ForecastCard willTheyComeBack={result.postBreakupForecast.willTheyComeBack} perPerson={result.postBreakupForecast.perPerson} />;
      case 'decay':
        return <DecayPhasesCard phases={result.phases} />;
      case 'tombstone':
        return <TombstoneCard participants={participants} duration={duration} deathDate={deathDate} epitaph={result.epitaph} />;
      case 'golden':
        return <GoldenAgeCard periodStart={result.goldenAge.periodStart} periodEnd={result.goldenAge.periodEnd} peakIntimacy={result.goldenAge.peakIntimacy} description={result.goldenAge.description} bestQuotes={result.goldenAge.bestQuotes} />;
      case 'unsaid':
        if (!result.unsaidThings) return null;
        return <UnsaidCard perPerson={result.unsaidThings.perPerson} sharedUnsaid={result.unsaidThings.sharedUnsaid} />;
      case 'death-cert':
        if (!result.deathCertificate) return null;
        return <DeathCertificateCard caseNumber={result.deathCertificate.caseNumber} dateOfBirth={result.deathCertificate.dateOfBirth} dateOfDeath={result.deathCertificate.dateOfDeath} placeOfDeath={result.deathCertificate.placeOfDeath} attendingPhysician={result.deathCertificate.attendingPhysician} mannerOfDeath={result.deathCertificate.mannerOfDeath} participants={participants} />;
      case 'death-line': {
        const dlData = buildDeathLineData(quantitative);
        return <DeathLineCard data={dlData} emotionalTimeline={result.emotionalTimeline} />;
      }
      default:
        return null;
    }
  }, [result, participants, quantitative, qualitative, duration, deathDate]);

  return (
    <div className="mb-12">
      <p
        className="font-mono text-[10px] uppercase tracking-widest mb-4"
        style={{ color: '#4a4a4a' }}
      >
        Karty do udostępnienia
      </p>

      {/* Thumbnail grid */}
      <div className="flex flex-wrap justify-center gap-3 mb-6">
        {cards.filter(c => c.available).map((card) => (
          <button
            key={card.id}
            onClick={() => setActiveCard(activeCard === card.id ? null : card.id)}
            className="flex flex-col items-center gap-1 rounded-lg border px-3 py-2.5 transition-all hover:border-[#991b1b40] hover:bg-[#1a0808] active:scale-95"
            style={{
              background: activeCard === card.id ? 'rgba(153,27,27,0.15)' : 'rgba(26,8,8,0.5)',
              border: activeCard === card.id ? '1px solid #991b1b' : '1px solid #2a1010',
              minWidth: 72,
            }}
          >
            <span className="text-lg">{card.emoji}</span>
            <span className="text-[10px] font-mono" style={{ color: activeCard === card.id ? '#dc2626' : '#6b3a3a' }}>
              {card.label}
            </span>
          </button>
        ))}
      </div>

      {/* Active card — full vertical display */}
      <AnimatePresence mode="wait">
        {activeCard && (
          <motion.div
            key={activeCard}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex flex-col items-center gap-4"
          >
            {/* Controls bar */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {canNativeShare && (
                <button
                  onClick={handleShare}
                  disabled={isSharing}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-all hover:scale-[1.02] disabled:opacity-50"
                  style={{
                    background: 'rgba(16,185,129,0.12)',
                    border: '1px solid rgba(16,185,129,0.25)',
                    color: '#10b981',
                  }}
                >
                  {isSharing ? (
                    <><Loader2 className="size-3 animate-spin" /> Udostępnianie...</>
                  ) : (
                    <><Share2 className="size-3" /> Udostępnij</>
                  )}
                </button>
              )}
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{
                  background: 'rgba(153,27,27,0.2)',
                  border: '1px solid rgba(153,27,27,0.3)',
                  color: '#dc2626',
                }}
              >
                {isDownloading ? (
                  <><Loader2 className="size-3 animate-spin" /> Generowanie...</>
                ) : (
                  <><Download className="size-3" /> Pobierz PNG</>
                )}
              </button>
              <button
                onClick={() => setActiveCard(null)}
                className="flex size-6 items-center justify-center rounded-full transition-colors hover:bg-[#2a1010]"
                style={{ border: '1px solid #2a1010', color: '#6b3a3a' }}
                aria-label="Zamknij"
              >
                <X className="size-3" />
              </button>
            </div>

            {/* Card displayed vertically at full size */}
            <div
              className="flex justify-center w-full"
              style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
            >
              {renderCard(activeCard)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden offscreen card for clean full-res capture */}
      {activeCard && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: '-9999px',
            top: 0,
            width: 400,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div ref={captureRef}>
            {renderCard(activeCard)}
          </div>
        </div>
      )}
    </div>
  );
}
