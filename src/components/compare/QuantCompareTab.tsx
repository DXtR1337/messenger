'use client';

import { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ComparisonRecord } from '@/lib/compare';
import { cv as computeCV } from '@/lib/compare';
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
  /** When true, value is the same regardless of perspective toggle */
  isRelationship?: boolean;
  /** Tooltip explaining what this metric means */
  tooltip?: string;
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

// rel() helper — marks a metric as relationship-level (same value for self/partner)
function rel(
  label: string,
  extract: (r: ComparisonRecord) => number | null,
  opts?: { format?: (v: number) => string; unit?: string; higherIsBetter?: boolean; tooltip?: string },
): MetricDef {
  return { label, extractSelf: extract, extractPartner: extract, isRelationship: true, ...opts };
}

const SECTIONS: SectionDef[] = [
  {
    key: 'volume', title: 'Wolumen', icon: '📨',
    metrics: [
      { label: 'Wiadomości', extractSelf: (r) => r.self.totalMessages, extractPartner: (r) => r.partner.totalMessages, format: fmt0 },
      { label: 'Słowa', extractSelf: (r) => r.self.totalWords, extractPartner: (r) => r.partner.totalWords, format: fmt0 },
      { label: 'Śr. dł. wiadomości', extractSelf: (r) => r.self.averageMessageLength, extractPartner: (r) => r.partner.averageMessageLength, format: fmt1, unit: ' słów', tooltip: 'Średnia liczba słów na wiadomość' },
      { label: 'Bogactwo słownictwa', extractSelf: (r) => r.self.vocabularyRichness, extractPartner: (r) => r.partner.vocabularyRichness, format: fmt2, tooltip: 'Type-Token Ratio — odsetek unikalnych słów. Wyższy = bogatsze słownictwo' },
      { label: 'Emoji /1k', extractSelf: (r) => r.self.emojiRatePer1k, extractPartner: (r) => r.partner.emojiRatePer1k, format: fmt1, tooltip: 'Liczba emoji na 1000 wiadomości' },
      { label: 'Pytania /1k', extractSelf: (r) => r.self.questionsAskedPer1k, extractPartner: (r) => r.partner.questionsAskedPer1k, format: fmt1 },
      { label: 'Media /1k', extractSelf: (r) => r.self.mediaSharedPer1k, extractPartner: (r) => r.partner.mediaSharedPer1k, format: fmt1 },
      { label: 'Linki /1k', extractSelf: (r) => r.self.linksSharedPer1k, extractPartner: (r) => r.partner.linksSharedPer1k, format: fmt1 },
      { label: 'Reakcje dawane', extractSelf: (r) => r.self.reactionGiveRate, extractPartner: (r) => r.partner.reactionGiveRate, format: fmtPct, unit: '%' },
      { label: 'Reakcje otrzymane', extractSelf: (r) => r.self.reactionReceiveRate, extractPartner: (r) => r.partner.reactionReceiveRate, format: fmtPct, unit: '%' },
      { label: 'Usunięte wiadomości', extractSelf: (r) => r.self.unsentMessages, extractPartner: (r) => r.partner.unsentMessages, format: fmt0 },
    ],
  },
  {
    key: 'timing', title: 'Timing', icon: '⏱️',
    metrics: [
      { label: 'Mediana RT', extractSelf: (r) => r.self.medianResponseTimeMs, extractPartner: (r) => r.partner.medianResponseTimeMs, format: fmtMs, higherIsBetter: false, tooltip: 'Mediana czasu odpowiedzi — połowa odpowiedzi jest szybsza' },
      { label: 'Trimmed Mean RT', extractSelf: (r) => r.self.trimmedMeanMs, extractPartner: (r) => r.partner.trimmedMeanMs, format: fmtMs, higherIsBetter: false, tooltip: 'Średnia czasu odpowiedzi z pominięciem ekstremalnych wartości (10% najwolniejszych i najszybszych)' },
      { label: 'P75 RT', extractSelf: (r) => r.self.p75Ms, extractPartner: (r) => r.partner.p75Ms, format: fmtMs, higherIsBetter: false, tooltip: '75% odpowiedzi jest szybszych niż ta wartość' },
      { label: 'P90 RT', extractSelf: (r) => r.self.p90Ms, extractPartner: (r) => r.partner.p90Ms, format: fmtMs, higherIsBetter: false },
      { label: 'P95 RT', extractSelf: (r) => r.self.p95Ms, extractPartner: (r) => r.partner.p95Ms, format: fmtMs, higherIsBetter: false },
      { label: 'Najszybsza odpowiedź', extractSelf: (r) => r.self.fastestResponseMs, extractPartner: (r) => r.partner.fastestResponseMs, format: fmtMs, higherIsBetter: false },
      { label: 'Trend RT', extractSelf: (r) => r.self.responseTimeTrend, extractPartner: (r) => r.partner.responseTimeTrend, format: fmt2, higherIsBetter: false, tooltip: 'Trend czasu odpowiedzi w czasie. Ujemny = odpowiada coraz szybciej' },
      { label: 'Inicjowanie rozmów', extractSelf: (r) => r.self.conversationInitiations, extractPartner: (r) => r.partner.conversationInitiations, format: fmt0, tooltip: 'Ile razy ta osoba rozpoczęła nową rozmowę' },
      { label: 'Wiadomości nocne', extractSelf: (r) => r.self.lateNightMessages, extractPartner: (r) => r.partner.lateNightMessages, format: fmt0 },
      rel('Najdłuższa cisza', (r) => r.relationship.longestSilenceMs, { format: fmtMs, higherIsBetter: false }),
    ],
  },
  {
    key: 'engagement', title: 'Zaangażowanie', icon: '🔄',
    metrics: [
      { label: 'Double texty', extractSelf: (r) => r.self.doubleTexts, extractPartner: (r) => r.partner.doubleTexts, format: fmt0, tooltip: 'Wysłanie kolejnej wiadomości przed odpowiedzią drugiej osoby' },
      { label: 'Max kolejne wiadomości', extractSelf: (r) => r.self.maxConsecutive, extractPartner: (r) => r.partner.maxConsecutive, format: fmt0 },
      { label: 'Proporcja wiadomości', extractSelf: (r) => r.self.messageRatio, extractPartner: (r) => r.partner.messageRatio, format: fmtPct, unit: '%', tooltip: 'Udział procentowy w łącznej liczbie wiadomości. 50% = idealny balans' },
      rel('Sesje łącznie', (r) => r.relationship.totalSessions, { format: fmt0 }),
      rel('Śr. dł. rozmowy', (r) => r.relationship.avgConversationLength, { format: fmt1, unit: ' wiad.' }),
      rel('Trend wolumenu', (r) => r.relationship.volumeTrend, { format: fmt2, tooltip: 'Kierunek zmian aktywności. Ujemny = rozmowy gasną' }),
      rel('Bursts', (r) => r.relationship.burstsCount, { format: fmt0, tooltip: 'Liczba intensywnych serii wiadomości (>10 wiad. w krótkim czasie)' }),
    ],
  },
  {
    key: 'sentiment', title: 'Sentiment i Emocje', icon: '😊',
    metrics: [
      { label: 'Śr. sentiment', extractSelf: (r) => r.self.sentiment?.avgSentiment ?? null, extractPartner: (r) => r.partner.sentiment?.avgSentiment ?? null, format: fmt2, tooltip: 'Średni sentyment wiadomości. Skala: -1 (negatywny) do +1 (pozytywny)' },
      { label: '% pozytywnych', extractSelf: (r) => r.self.sentiment?.positiveRatio ?? null, extractPartner: (r) => r.partner.sentiment?.positiveRatio ?? null, format: fmtPct, unit: '%' },
      { label: '% negatywnych', extractSelf: (r) => r.self.sentiment?.negativeRatio ?? null, extractPartner: (r) => r.partner.sentiment?.negativeRatio ?? null, format: fmtPct, unit: '%', higherIsBetter: false },
      { label: 'Zmienność emocjonalna', extractSelf: (r) => r.self.sentiment?.emotionalVolatility ?? null, extractPartner: (r) => r.partner.sentiment?.emotionalVolatility ?? null, format: fmt2, higherIsBetter: false, tooltip: 'Jak bardzo emocje skaczą między wiadomościami. Wyższy = bardziej niestabilne' },
      { label: 'Różnorodność emocji', extractSelf: (r) => r.self.granularityScoreV2 ?? r.self.granularityScore, extractPartner: (r) => r.partner.granularityScoreV2 ?? r.partner.granularityScore, format: fmt1, tooltip: 'Emotional Granularity — jak precyzyjnie wyrażane są emocje (Kashdan 2015)' },
      { label: 'Kategorie emocji', extractSelf: (r) => r.self.distinctEmotionCategories, extractPartner: (r) => r.partner.distinctEmotionCategories, format: fmt0 },
    ],
  },
  {
    key: 'style', title: 'Styl Językowy', icon: '✍️',
    metrics: [
      rel('LSM ogólny', (r) => r.relationship.lsm?.overall ?? null, { format: fmt2, tooltip: 'Language Style Matching (Ireland & Pennebaker 2010). 0-1, wyższy = bardziej zsynchronizowany styl' }),
      rel('LSM asymetria', (r) => r.relationship.lsm?.adaptationDirection?.asymmetryScore ?? null, { format: fmt2, higherIsBetter: false, tooltip: 'Kto bardziej dopasowuje styl do rozmówcy. 0 = symetryczne, >0 = jedna strona się bardziej dopasowuje' }),
      { label: 'Zaimki "ja" /1k', extractSelf: (r) => r.self.pronouns?.iRate ?? null, extractPartner: (r) => r.partner.pronouns?.iRate ?? null, format: fmt1, tooltip: 'Pennebaker (2011): wysoki "ja" = skupienie na sobie, niski = dystans' },
      { label: 'Zaimki "my" /1k', extractSelf: (r) => r.self.pronouns?.weRate ?? null, extractPartner: (r) => r.partner.pronouns?.weRate ?? null, format: fmt1, tooltip: 'Wskaźnik poczucia wspólnoty i bliskości' },
      { label: 'Zaimki "ty" /1k', extractSelf: (r) => r.self.pronouns?.youRate ?? null, extractPartner: (r) => r.partner.pronouns?.youRate ?? null, format: fmt1 },
      { label: 'Stosunek ja/my', extractSelf: (r) => r.self.pronouns?.iWeRatio ?? null, extractPartner: (r) => r.partner.pronouns?.iWeRatio ?? null, format: fmt2, higherIsBetter: false, tooltip: 'Stosunek "ja" do "my". Niższy = bardziej relacyjne myślenie' },
      { label: 'Złożoność integracyjna', extractSelf: (r) => r.self.icScore, extractPartner: (r) => r.partner.icScore, format: fmt1, tooltip: 'Integrative Complexity (Suedfeld & Tetlock 1977). Wyższy = bardziej złożone, wielostronne myślenie' },
      { label: 'Focus przeszłość /1k', extractSelf: (r) => r.self.pastRate, extractPartner: (r) => r.partner.pastRate, format: fmt1 },
      { label: 'Focus przyszłość /1k', extractSelf: (r) => r.self.futureRate, extractPartner: (r) => r.partner.futureRate, format: fmt1 },
      { label: 'Future Index', extractSelf: (r) => r.self.futureIndex, extractPartner: (r) => r.partner.futureIndex, format: fmt2, tooltip: 'Orientacja na przyszłość vs przeszłość. 0.5 = zbalansowane, >0.5 = planuje naprzód' },
    ],
  },
  {
    key: 'dynamics', title: 'Dynamika Relacji', icon: '⚖️',
    metrics: [
      rel('Wzajemność ogólna', (r) => r.relationship.reciprocityIndex?.overall ?? null, { format: fmt0, tooltip: 'Ogólny indeks wzajemności 0-100. 50 = idealny balans, skrajne = nierównowaga' }),
      rel('Balance wiadomości', (r) => r.relationship.reciprocityIndex?.messageBalance ?? null, { format: fmt0 }),
      rel('Balance inicjacji', (r) => r.relationship.reciprocityIndex?.initiationBalance ?? null, { format: fmt0 }),
      rel('Symetria RT', (r) => r.relationship.reciprocityIndex?.responseTimeSymmetry ?? null, { format: fmt0, tooltip: 'Jak symetrycznie obie strony odpowiadają na siebie. 50 = idealnie' }),
      rel('Cykle pursuit-withdrawal', (r) => r.relationship.pursuitWithdrawal?.cycleCount ?? null, { format: fmt0, higherIsBetter: false, tooltip: 'Cykle pogoń-wycofanie (Christensen & Heavey 1990). Jedna osoba goni, druga się wycofuje' }),
      rel('Konflikty', (r) => r.relationship.totalConflicts, { format: fmt0, higherIsBetter: false }),
      rel('Intymność (slope)', (r) => r.relationship.intimacyProgression?.overallSlope ?? null, { format: fmt2, tooltip: 'Trend intymności w czasie. Dodatni = rosnąca bliskość' }),
      { label: 'Self-repair /100', extractSelf: (r) => r.self.selfRepairRate, extractPartner: (r) => r.partner.selfRepairRate, format: fmt1, tooltip: 'Autokorekty na 100 wiadomości (Schegloff 1977). Wyższy = więcej refleksji nad własnym przekazem' },
      rel('Mutual Repair Index', (r) => r.relationship.mutualRepairIndex, { format: fmt2, tooltip: 'Jak obie strony naprawiają nieporozumienia. Wyższy = zdrowsza komunikacja' }),
    ],
  },
  {
    key: 'behavioral', title: 'Behawioralne', icon: '🧠',
    metrics: [
      rel('Chronotyp match', (r) => r.relationship.chronotypeMatchScore, { format: fmt0, tooltip: 'Dopasowanie rytmów dobowych 0-100 (Aledavood 2018). 100 = identyczne pory aktywności' }),
      rel('Chronotyp delta', (r) => r.relationship.chronotypeDeltaHours, { format: fmt1, unit: 'h', higherIsBetter: false, tooltip: 'Różnica w porach aktywności w godzinach' }),
      { label: 'CNI', extractSelf: (r) => r.self.cni, extractPartner: (r) => r.partner.cni, format: fmt0, higherIsBetter: false, tooltip: 'Conversational Narcissism Index (Derber 1979). 0-100, wyższy = więcej „shift responses" przejmujących temat na siebie' },
      { label: 'Bid-Response', extractSelf: (r) => r.self.bidResponseRate != null ? r.self.bidResponseRate * 100 : null, extractPartner: (r) => r.partner.bidResponseRate != null ? r.partner.bidResponseRate * 100 : null, format: fmt1, unit: '%', tooltip: 'Gottman „Turning Toward" — % odpowiedzi na oferty emocjonalne. Benchmark: 86% u par szczęśliwych' },
      { label: 'Social jet lag', extractSelf: (r) => r.self.socialJetLagHours, extractPartner: (r) => r.partner.socialJetLagHours, format: fmt1, unit: 'h', higherIsBetter: false, tooltip: 'Różnica aktywności robocze vs weekend (Roenneberg 2012). >2h = znaczący social jet lag' },
      { label: 'Godzina szczytowa', extractSelf: (r) => r.self.peakHour, extractPartner: (r) => r.partner.peakHour, format: (v) => `${Math.round(v)}:00` },
    ],
  },
  {
    key: 'scores', title: 'Wyniki', icon: '🏅',
    metrics: [
      rel('Kompatybilność', (r) => r.relationship.viralScores?.compatibilityScore ?? null, { format: fmt0, tooltip: 'Łączny wskaźnik kompatybilności 0-100 obliczony z metryk ilościowych' }),
      { label: 'Interest', extractSelf: (r) => r.relationship.viralScores?.interestScores?.[r.self.name] ?? null, extractPartner: (r) => r.relationship.viralScores?.interestScores?.[r.partner.name] ?? null, format: fmt0, tooltip: 'Wskaźnik zainteresowania 0-100 — jak bardzo ktoś inwestuje w rozmowę' },
      { label: 'Ghost Risk', extractSelf: (r) => r.relationship.viralScores?.ghostRisk?.[r.self.name]?.score ?? null, extractPartner: (r) => r.relationship.viralScores?.ghostRisk?.[r.partner.name]?.score ?? null, format: fmt0, higherIsBetter: false, tooltip: 'Ryzyko ghostingu 0-100 — prawdopodobieństwo nagłego zniknięcia' },
      rel('Asymetria zaangażowania', (r) => r.relationship.viralScores?.delusionScore ?? null, { format: fmt0, higherIsBetter: false, tooltip: 'Jak nierówno rozłożone jest zaangażowanie obu stron. 0 = idealnie zbalansowane' }),
      rel('Odznaki', (r) => r.relationship.badges.length, { format: fmt0 }),
    ],
  },
];

// ── Helpers ──

/** Extract numeric values for a metric across all records */
function extractValues(
  m: MetricDef,
  records: ComparisonRecord[],
  viewMode: 'self' | 'partner',
): number[] {
  return records
    .map((r) => {
      const val = m.isRelationship || viewMode === 'self'
        ? m.extractSelf(r)
        : m.extractPartner(r);
      return val;
    })
    .filter((v): v is number => v != null);
}

/** Check if a metric has meaningful differences across records (CV >= 15%) */
function hasDifferences(values: number[]): boolean {
  if (values.length < 2) return true; // can't compare, show it
  return computeCV(values) >= 15;
}

// ── Collapsible section ──

function CollapsibleSection({
  title,
  icon,
  count,
  totalCount,
  summary,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: string;
  count: number;
  totalCount?: number;
  summary?: string;
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
        <span className="flex-1 font-display text-sm font-semibold">{title}</span>
        {!open && summary && (
          <span className="truncate text-[11px] text-muted-foreground/60">
            {summary}
          </span>
        )}
        <span className="font-mono text-[11px] text-muted-foreground/50">
          {totalCount != null && totalCount !== count ? `${count}/${totalCount}` : count}
        </span>
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="border-t border-border px-4 pb-3">{children}</div>}
    </div>
  );
}

// ── Main component ──

export default function QuantCompareTab({ records, selfName }: Props) {
  const [viewMode, setViewMode] = useState<'self' | 'partner'>('self');
  const [showDiffsOnly, setShowDiffsOnly] = useState(true);

  // Top 5 most divergent metrics across all sections
  const top5 = useMemo(() => {
    if (records.length < 2) return [];
    const candidates: Array<{
      metric: MetricDef;
      sectionTitle: string;
      cvVal: number;
    }> = [];
    for (const section of SECTIONS) {
      for (const metric of section.metrics) {
        const values = extractValues(metric, records, viewMode);
        if (values.length < 2) continue;
        const cvVal = computeCV(values);
        if (cvVal >= 15) {
          candidates.push({ metric, sectionTitle: section.title, cvVal });
        }
      }
    }
    candidates.sort((a, b) => b.cvVal - a.cvVal);
    return candidates.slice(0, 5);
  }, [records, viewMode]);

  // Precompute which metrics pass the diff filter
  const sectionData = useMemo(() => {
    return SECTIONS.map((section) => {
      const metricsWithDiff = section.metrics.map((m) => {
        const values = extractValues(m, records, viewMode);
        const hasDiff = hasDifferences(values);
        return { metric: m, hasDiff, values };
      });

      // Find the metric with highest variance for the summary
      let summaryText = '';
      if (records.length >= 2) {
        let maxCV = 0;
        let maxLabel = '';
        let maxBest = '';
        for (const { metric, values } of metricsWithDiff) {
          if (values.length < 2) continue;
          const cvVal = computeCV(values);
          if (cvVal > maxCV) {
            maxCV = cvVal;
            maxLabel = metric.label;
            const bestIdx = metric.higherIsBetter === false
              ? values.indexOf(Math.min(...values))
              : values.indexOf(Math.max(...values));
            const bestRecord = records[bestIdx];
            if (bestRecord) {
              const bestVal = values[bestIdx];
              const fmt = (metric.format ?? fmt1)(bestVal);
              maxBest = `${maxLabel}: ${fmt}${metric.unit ?? ''} (${bestRecord.partnerName})`;
            }
          }
        }
        summaryText = maxBest || '';
      }

      const visibleMetrics = showDiffsOnly
        ? metricsWithDiff.filter((m) => m.hasDiff)
        : metricsWithDiff;

      return {
        section,
        visibleMetrics,
        totalCount: section.metrics.length,
        summary: summaryText,
      };
    });
  }, [records, viewMode, showDiffsOnly]);

  if (records.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Wybierz analizy, żeby zobaczyć statystyki.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2">
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
                ? 'bg-[#a855f7]/10 text-[#a855f7]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Partner
          </button>
        </div>

        {records.length >= 2 && (
          <button
            onClick={() => setShowDiffsOnly((v) => !v)}
            className={`ml-auto rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              showDiffsOnly
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {showDiffsOnly ? 'Tylko różnice' : 'Pokaż tylko różnice'}
          </button>
        )}

        {!showDiffsOnly && (
          <span className={`text-xs text-muted-foreground ${records.length < 2 ? 'ml-auto' : ''}`}>
            {records.length} relacji
          </span>
        )}
      </div>

      {/* Top 5 Biggest Differences — hero section */}
      {top5.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-gradient-to-b from-primary/[0.04] to-transparent">
          <div className="px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🔥</span>
              <span className="font-display text-sm font-semibold">Największe różnice</span>
              <span className="font-mono text-[11px] text-muted-foreground/50">{top5.length}</span>
            </div>
          </div>
          <div className="border-t border-primary/10 px-4 pb-3">
            <div className="divide-y divide-border/50">
              {top5.map(({ metric: m }) => {
                const values = records.map((r) => {
                  const val = m.isRelationship || viewMode === 'self'
                    ? m.extractSelf(r)
                    : m.extractPartner(r);
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
                    tooltip={m.tooltip}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Sections */}
      {sectionData.map(({ section, visibleMetrics, totalCount, summary }) => {
        if (showDiffsOnly && visibleMetrics.length === 0) return null;

        return (
          <CollapsibleSection
            key={section.key}
            title={section.title}
            icon={section.icon}
            count={visibleMetrics.length}
            totalCount={showDiffsOnly ? totalCount : undefined}
            summary={summary}
          >
            <div className="divide-y divide-border/50">
              {visibleMetrics.map(({ metric: m }) => {
                const values = records.map((r) => {
                  const val = m.isRelationship || viewMode === 'self'
                    ? m.extractSelf(r)
                    : m.extractPartner(r);
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
                    tooltip={m.tooltip}
                  />
                );
              })}
            </div>
          </CollapsibleSection>
        );
      })}
    </div>
  );
}
