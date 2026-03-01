'use client';

import { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ComparisonRecord } from '@/lib/compare';
import MetricCompareRow from './MetricCompareRow';

interface Props {
  records: ComparisonRecord[];
  selfName: string;
}

interface MetricDef {
  label: string;
  extractSelf: (r: ComparisonRecord) => number | null;
  extractPartner: (r: ComparisonRecord) => number | null;
  format?: (v: number) => string;
  unit?: string;
  higherIsBetter?: boolean;
  /** 'self' = show self values, 'partner' = partner, 'relationship' = single relationship value */
  scope: 'self' | 'partner' | 'relationship';
}

interface SectionDef {
  key: string;
  title: string;
  icon: string;
  metrics: MetricDef[];
}

function fmt0(v: number) { return Math.round(v).toLocaleString('pl-PL'); }
function fmt1(v: number) { return v.toFixed(1); }
function fmt2(v: number) { return v.toFixed(2); }
function fmtPct(v: number) { return `${(v * 100).toFixed(1)}`; }
function fmtMs(v: number) {
  if (v < 60_000) return `${(v / 1000).toFixed(0)}s`;
  if (v < 3_600_000) return `${(v / 60_000).toFixed(0)}m`;
  if (v < 86_400_000) return `${(v / 3_600_000).toFixed(1)}h`;
  return `${(v / 86_400_000).toFixed(1)}d`;
}

const SECTIONS: SectionDef[] = [
  {
    key: 'volume', title: 'Wolumen i Zaangażowanie', icon: '📨',
    metrics: [
      { label: 'Wiadomości (self)', scope: 'self', extractSelf: (r) => r.self.totalMessages, extractPartner: (r) => r.partner.totalMessages, format: fmt0 },
      { label: 'Wiadomości (partner)', scope: 'partner', extractSelf: (r) => r.self.totalMessages, extractPartner: (r) => r.partner.totalMessages, format: fmt0 },
      { label: 'Słowa (self)', scope: 'self', extractSelf: (r) => r.self.totalWords, extractPartner: (r) => r.partner.totalWords, format: fmt0 },
      { label: 'Śr. dł. wiadomości [słowa] (self)', scope: 'self', extractSelf: (r) => r.self.averageMessageLength, extractPartner: (r) => r.partner.averageMessageLength, format: fmt1 },
      { label: 'Śr. dł. wiadomości [słowa] (partner)', scope: 'partner', extractSelf: (r) => r.self.averageMessageLength, extractPartner: (r) => r.partner.averageMessageLength, format: fmt1 },
      { label: 'Bogactwo słownictwa (self)', scope: 'self', extractSelf: (r) => r.self.vocabularyRichness, extractPartner: (r) => r.partner.vocabularyRichness, format: fmt2 },
      { label: 'Bogactwo słownictwa (partner)', scope: 'partner', extractSelf: (r) => r.self.vocabularyRichness, extractPartner: (r) => r.partner.vocabularyRichness, format: fmt2 },
      { label: 'Emoji /1k (self)', scope: 'self', extractSelf: (r) => r.self.emojiRatePer1k, extractPartner: (r) => r.partner.emojiRatePer1k, format: fmt1 },
      { label: 'Pytania /1k (self)', scope: 'self', extractSelf: (r) => r.self.questionsAskedPer1k, extractPartner: (r) => r.partner.questionsAskedPer1k, format: fmt1 },
      { label: 'Media /1k (self)', scope: 'self', extractSelf: (r) => r.self.mediaSharedPer1k, extractPartner: (r) => r.partner.mediaSharedPer1k, format: fmt1 },
      { label: 'Linki /1k (self)', scope: 'self', extractSelf: (r) => r.self.linksSharedPer1k, extractPartner: (r) => r.partner.linksSharedPer1k, format: fmt1 },
      { label: 'Reakcje ↑ rate (self)', scope: 'self', extractSelf: (r) => r.self.reactionGiveRate, extractPartner: (r) => r.partner.reactionGiveRate, format: fmtPct, unit: '%' },
      { label: 'Reakcje ↓ rate (self)', scope: 'self', extractSelf: (r) => r.self.reactionReceiveRate, extractPartner: (r) => r.partner.reactionReceiveRate, format: fmtPct, unit: '%' },
      { label: 'Usunięte wiadomości (self)', scope: 'self', extractSelf: (r) => r.self.unsentMessages, extractPartner: (r) => r.partner.unsentMessages, format: fmt0 },
    ],
  },
  {
    key: 'timing', title: 'Timing i Responsywność', icon: '⏱️',
    metrics: [
      { label: 'Mediana RT (self)', scope: 'self', extractSelf: (r) => r.self.medianResponseTimeMs, extractPartner: (r) => r.partner.medianResponseTimeMs, format: fmtMs, higherIsBetter: false },
      { label: 'Mediana RT (partner)', scope: 'partner', extractSelf: (r) => r.self.medianResponseTimeMs, extractPartner: (r) => r.partner.medianResponseTimeMs, format: fmtMs, higherIsBetter: false },
      { label: 'Trimmed Mean RT (self)', scope: 'self', extractSelf: (r) => r.self.trimmedMeanMs, extractPartner: (r) => r.partner.trimmedMeanMs, format: fmtMs, higherIsBetter: false },
      { label: 'P75 RT (self)', scope: 'self', extractSelf: (r) => r.self.p75Ms, extractPartner: (r) => r.partner.p75Ms, format: fmtMs, higherIsBetter: false },
      { label: 'P90 RT (self)', scope: 'self', extractSelf: (r) => r.self.p90Ms, extractPartner: (r) => r.partner.p90Ms, format: fmtMs, higherIsBetter: false },
      { label: 'P95 RT (self)', scope: 'self', extractSelf: (r) => r.self.p95Ms, extractPartner: (r) => r.partner.p95Ms, format: fmtMs, higherIsBetter: false },
      { label: 'Najszybsza odp. (self)', scope: 'self', extractSelf: (r) => r.self.fastestResponseMs, extractPartner: (r) => r.partner.fastestResponseMs, format: fmtMs, higherIsBetter: false },
      { label: 'Trend RT (self)', scope: 'self', extractSelf: (r) => r.self.responseTimeTrend, extractPartner: (r) => r.partner.responseTimeTrend, format: fmt2, higherIsBetter: false },
      { label: 'Inicjowanie rozmów (self)', scope: 'self', extractSelf: (r) => r.self.conversationInitiations, extractPartner: (r) => r.partner.conversationInitiations, format: fmt0 },
      { label: 'Inicjowanie rozmów (partner)', scope: 'partner', extractSelf: (r) => r.self.conversationInitiations, extractPartner: (r) => r.partner.conversationInitiations, format: fmt0 },
      { label: 'Wiadomości nocne (self)', scope: 'self', extractSelf: (r) => r.self.lateNightMessages, extractPartner: (r) => r.partner.lateNightMessages, format: fmt0 },
      { label: 'Najdłuższa cisza', scope: 'relationship', extractSelf: (r) => r.relationship.longestSilenceMs, extractPartner: (r) => r.relationship.longestSilenceMs, format: fmtMs, higherIsBetter: false },
    ],
  },
  {
    key: 'engagement', title: 'Zaangażowanie i Wzorce', icon: '🔄',
    metrics: [
      { label: 'Double texty (self)', scope: 'self', extractSelf: (r) => r.self.doubleTexts, extractPartner: (r) => r.partner.doubleTexts, format: fmt0 },
      { label: 'Max kolejne wiad. (self)', scope: 'self', extractSelf: (r) => r.self.maxConsecutive, extractPartner: (r) => r.partner.maxConsecutive, format: fmt0 },
      { label: 'Proporcja wiadomości (self)', scope: 'self', extractSelf: (r) => r.self.messageRatio, extractPartner: (r) => r.partner.messageRatio, format: fmtPct, unit: '%' },
      { label: 'Sesje (łącznie)', scope: 'relationship', extractSelf: (r) => r.relationship.totalSessions, extractPartner: (r) => r.relationship.totalSessions, format: fmt0 },
      { label: 'Śr. dł. rozmowy', scope: 'relationship', extractSelf: (r) => r.relationship.avgConversationLength, extractPartner: (r) => r.relationship.avgConversationLength, format: fmt1, unit: ' wiad.' },
      { label: 'Trend wolumenu', scope: 'relationship', extractSelf: (r) => r.relationship.volumeTrend, extractPartner: (r) => r.relationship.volumeTrend, format: fmt2 },
      { label: 'Bursts', scope: 'relationship', extractSelf: (r) => r.relationship.burstsCount, extractPartner: (r) => r.relationship.burstsCount, format: fmt0 },
    ],
  },
  {
    key: 'sentiment', title: 'Sentiment i Emocje', icon: '😊',
    metrics: [
      { label: 'Śr. sentiment (self)', scope: 'self', extractSelf: (r) => r.self.sentiment?.avgSentiment ?? null, extractPartner: (r) => r.partner.sentiment?.avgSentiment ?? null, format: fmt2 },
      { label: 'Śr. sentiment (partner)', scope: 'partner', extractSelf: (r) => r.self.sentiment?.avgSentiment ?? null, extractPartner: (r) => r.partner.sentiment?.avgSentiment ?? null, format: fmt2 },
      { label: '% pozytywnych (self)', scope: 'self', extractSelf: (r) => r.self.sentiment?.positiveRatio ?? null, extractPartner: (r) => r.partner.sentiment?.positiveRatio ?? null, format: fmtPct, unit: '%' },
      { label: '% negatywnych (self)', scope: 'self', extractSelf: (r) => r.self.sentiment?.negativeRatio ?? null, extractPartner: (r) => r.partner.sentiment?.negativeRatio ?? null, format: fmtPct, unit: '%', higherIsBetter: false },
      { label: 'Zmienność emocjonalna (self)', scope: 'self', extractSelf: (r) => r.self.sentiment?.emotionalVolatility ?? null, extractPartner: (r) => r.partner.sentiment?.emotionalVolatility ?? null, format: fmt2, higherIsBetter: false },
      { label: 'Różnorodność emocji (self)', scope: 'self', extractSelf: (r) => r.self.granularityScoreV2 ?? r.self.granularityScore, extractPartner: (r) => r.partner.granularityScoreV2 ?? r.partner.granularityScore, format: fmt1 },
      { label: 'Kategorie emocji (self)', scope: 'self', extractSelf: (r) => r.self.distinctEmotionCategories, extractPartner: (r) => r.partner.distinctEmotionCategories, format: fmt0 },
    ],
  },
  {
    key: 'style', title: 'Styl Językowy', icon: '✍️',
    metrics: [
      { label: 'LSM (ogólny)', scope: 'relationship', extractSelf: (r) => r.relationship.lsm?.overall ?? null, extractPartner: (r) => r.relationship.lsm?.overall ?? null, format: fmt2 },
      { label: 'LSM asymetria', scope: 'relationship', extractSelf: (r) => r.relationship.lsm?.adaptationDirection?.asymmetryScore ?? null, extractPartner: (r) => r.relationship.lsm?.adaptationDirection?.asymmetryScore ?? null, format: fmt2, higherIsBetter: false },
      { label: 'Zaimki "ja" /1k (self)', scope: 'self', extractSelf: (r) => r.self.pronouns?.iRate ?? null, extractPartner: (r) => r.partner.pronouns?.iRate ?? null, format: fmt1 },
      { label: 'Zaimki "my" /1k (self)', scope: 'self', extractSelf: (r) => r.self.pronouns?.weRate ?? null, extractPartner: (r) => r.partner.pronouns?.weRate ?? null, format: fmt1 },
      { label: 'Zaimki "ty" /1k (self)', scope: 'self', extractSelf: (r) => r.self.pronouns?.youRate ?? null, extractPartner: (r) => r.partner.pronouns?.youRate ?? null, format: fmt1 },
      { label: 'Stosunek ja/my (self)', scope: 'self', extractSelf: (r) => r.self.pronouns?.iWeRatio ?? null, extractPartner: (r) => r.partner.pronouns?.iWeRatio ?? null, format: fmt2, higherIsBetter: false },
      { label: 'Złożoność integr. (self)', scope: 'self', extractSelf: (r) => r.self.icScore, extractPartner: (r) => r.partner.icScore, format: fmt1 },
      { label: 'Focus przeszłość /1k (self)', scope: 'self', extractSelf: (r) => r.self.pastRate, extractPartner: (r) => r.partner.pastRate, format: fmt1 },
      { label: 'Focus przyszłość /1k (self)', scope: 'self', extractSelf: (r) => r.self.futureRate, extractPartner: (r) => r.partner.futureRate, format: fmt1 },
      { label: 'Future Index (self)', scope: 'self', extractSelf: (r) => r.self.futureIndex, extractPartner: (r) => r.partner.futureIndex, format: fmt2 },
    ],
  },
  {
    key: 'dynamics', title: 'Dynamika Relacji', icon: '⚖️',
    metrics: [
      { label: 'Wzajemność (ogólna)', scope: 'relationship', extractSelf: (r) => r.relationship.reciprocityIndex?.overall ?? null, extractPartner: (r) => r.relationship.reciprocityIndex?.overall ?? null, format: fmt0 },
      { label: 'Balance wiadomości', scope: 'relationship', extractSelf: (r) => r.relationship.reciprocityIndex?.messageBalance ?? null, extractPartner: (r) => r.relationship.reciprocityIndex?.messageBalance ?? null, format: fmt0 },
      { label: 'Balance inicjacji', scope: 'relationship', extractSelf: (r) => r.relationship.reciprocityIndex?.initiationBalance ?? null, extractPartner: (r) => r.relationship.reciprocityIndex?.initiationBalance ?? null, format: fmt0 },
      { label: 'Symetria RT', scope: 'relationship', extractSelf: (r) => r.relationship.reciprocityIndex?.responseTimeSymmetry ?? null, extractPartner: (r) => r.relationship.reciprocityIndex?.responseTimeSymmetry ?? null, format: fmt0 },
      { label: 'Cykle pursuit-withdrawal', scope: 'relationship', extractSelf: (r) => r.relationship.pursuitWithdrawal?.cycleCount ?? null, extractPartner: (r) => r.relationship.pursuitWithdrawal?.cycleCount ?? null, format: fmt0, higherIsBetter: false },
      { label: 'Konflikty (łącznie)', scope: 'relationship', extractSelf: (r) => r.relationship.totalConflicts, extractPartner: (r) => r.relationship.totalConflicts, format: fmt0, higherIsBetter: false },
      { label: 'Intymność (slope)', scope: 'relationship', extractSelf: (r) => r.relationship.intimacyProgression?.overallSlope ?? null, extractPartner: (r) => r.relationship.intimacyProgression?.overallSlope ?? null, format: fmt2 },
      { label: 'Self-repair rate (self)', scope: 'self', extractSelf: (r) => r.self.selfRepairRate, extractPartner: (r) => r.partner.selfRepairRate, format: fmt1 },
      { label: 'Mutual Repair Index', scope: 'relationship', extractSelf: (r) => r.relationship.mutualRepairIndex, extractPartner: (r) => r.relationship.mutualRepairIndex, format: fmt2 },
    ],
  },
  {
    key: 'behavioral', title: 'Behawioralne', icon: '🧠',
    metrics: [
      { label: 'Chronotyp matchScore', scope: 'relationship', extractSelf: (r) => r.relationship.chronotypeMatchScore, extractPartner: (r) => r.relationship.chronotypeMatchScore, format: fmt0 },
      { label: 'Chronotyp delta [h]', scope: 'relationship', extractSelf: (r) => r.relationship.chronotypeDeltaHours, extractPartner: (r) => r.relationship.chronotypeDeltaHours, format: fmt1, unit: 'h', higherIsBetter: false },
      { label: 'CNI (self)', scope: 'self', extractSelf: (r) => r.self.cni, extractPartner: (r) => r.partner.cni, format: fmt0, higherIsBetter: false },
      { label: 'CNI (partner)', scope: 'partner', extractSelf: (r) => r.self.cni, extractPartner: (r) => r.partner.cni, format: fmt0, higherIsBetter: false },
      { label: 'Bid-Response rate (self)', scope: 'self', extractSelf: (r) => r.self.bidResponseRate != null ? r.self.bidResponseRate * 100 : null, extractPartner: (r) => r.partner.bidResponseRate != null ? r.partner.bidResponseRate * 100 : null, format: fmt1, unit: '%' },
      { label: 'Przesunięcie aktywności [h] (self)', scope: 'self', extractSelf: (r) => r.self.socialJetLagHours, extractPartner: (r) => r.partner.socialJetLagHours, format: fmt1, unit: 'h', higherIsBetter: false },
      { label: 'Godzina szczytowa (self)', scope: 'self', extractSelf: (r) => r.self.peakHour, extractPartner: (r) => r.partner.peakHour, format: (v) => `${Math.round(v)}:00` },
    ],
  },
  {
    key: 'scores', title: 'Wyniki i Odznaki', icon: '🏅',
    metrics: [
      { label: 'Kompatybilność', scope: 'relationship', extractSelf: (r) => r.relationship.viralScores?.compatibilityScore ?? null, extractPartner: (r) => r.relationship.viralScores?.compatibilityScore ?? null, format: fmt0 },
      { label: 'Interest (self)', scope: 'self', extractSelf: (r) => r.relationship.viralScores?.interestScores[r.self.name] ?? null, extractPartner: (r) => r.relationship.viralScores?.interestScores[r.partner.name] ?? null, format: fmt0 },
      { label: 'Ghost Risk (self)', scope: 'self', extractSelf: (r) => r.relationship.viralScores?.ghostRisk[r.self.name]?.score ?? null, extractPartner: (r) => r.relationship.viralScores?.ghostRisk[r.partner.name]?.score ?? null, format: fmt0, higherIsBetter: false },
      { label: 'Asymetria zaangażowania', scope: 'relationship', extractSelf: (r) => r.relationship.viralScores?.delusionScore ?? null, extractPartner: (r) => r.relationship.viralScores?.delusionScore ?? null, format: fmt0, higherIsBetter: false },
      { label: 'Odznaki (count)', scope: 'relationship', extractSelf: (r) => r.relationship.badges.length, extractPartner: (r) => r.relationship.badges.length, format: fmt0 },
    ],
  },
];

function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-secondary/30"
      >
        <span className="text-base">{icon}</span>
        <span className="flex-1 text-sm font-semibold">{title}</span>
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="border-t border-border px-4 pb-3">{children}</div>}
    </div>
  );
}

export default function QuantCompareTab({ records, selfName }: Props) {
  const [viewMode, setViewMode] = useState<'self' | 'partner'>('self');

  const renderMetrics = useMemo(() => {
    return (metrics: MetricDef[]) =>
      metrics.map((m) => {
        const values = records.map((r) => {
          let val: number | null;
          if (m.scope === 'relationship') {
            val = m.extractSelf(r);
          } else if (m.scope === 'self' || viewMode === 'self') {
            val = m.extractSelf(r);
          } else {
            val = m.extractPartner(r);
          }
          return {
            name: r.partnerName,
            value: val,
            formatted: val != null ? (m.format ?? fmt1)(val) : '—',
          };
        });

        return (
          <MetricCompareRow
            key={m.label}
            label={m.label}
            values={values}
            higherIsBetter={m.higherIsBetter}
            unit={m.unit}
          />
        );
      });
  }, [records, viewMode]);

  if (records.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Wybierz analizy, żeby zobaczyć statystyki.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* View toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Perspektywa:</span>
        <div className="flex rounded-lg border border-border">
          <button
            onClick={() => setViewMode('self')}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              viewMode === 'self'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {selfName}
          </button>
          <button
            onClick={() => setViewMode('partner')}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              viewMode === 'partner'
                ? 'bg-purple-500/10 text-purple-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Partner
          </button>
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          {records.length} relacji
        </span>
      </div>

      {/* Sections */}
      {SECTIONS.map((section, si) => (
        <CollapsibleSection
          key={section.key}
          title={section.title}
          icon={section.icon}
          defaultOpen={si < 2}
        >
          <div className="divide-y divide-border/50">
            {renderMetrics(section.metrics)}
          </div>
        </CollapsibleSection>
      ))}
    </div>
  );
}
