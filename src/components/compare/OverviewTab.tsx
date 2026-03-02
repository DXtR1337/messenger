'use client';

import { useMemo } from 'react';
import type { ComparisonRecord, InsightData } from '@/lib/compare';
import { COMPARISON_COLORS, argMax, argMin, mean, cv as computeCV } from '@/lib/compare';
import Sparkline from './Sparkline';

interface Props {
  records: ComparisonRecord[];
  selfName: string;
}

// ── ScoreRing (reused from AICompareTab pattern) ──

function ScoreRing({ score, color, size = 64 }: { score: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const progress = (score / 100) * c;
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${progress} ${c - progress}`}
        strokeDashoffset={c / 4}
        strokeLinecap="round"
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        fill="#fafafa" fontSize={size * 0.26} fontWeight="bold" fontFamily="monospace">
        {Math.round(score)}
      </text>
    </svg>
  );
}

// ── Hero Callout — biggest difference ──

interface HeroInsight {
  label: string;
  bestName: string;
  worstName: string;
  bestFormatted: string;
  worstFormatted: string;
  deltaPct: number;
}

function computeHeroInsight(records: ComparisonRecord[]): HeroInsight | null {
  if (records.length < 2) return null;

  const candidates: Array<{
    label: string;
    values: number[];
    format: (v: number) => string;
  }> = [
    { label: 'Czas odpowiedzi', values: records.map((r) => r.self.medianResponseTimeMs), format: (v) => v < 60000 ? `${(v / 1000).toFixed(0)}s` : v < 3600000 ? `${(v / 60000).toFixed(0)}min` : `${(v / 3600000).toFixed(1)}h` },
    { label: 'Wiadomości', values: records.map((r) => r.self.totalMessages), format: (v) => v.toLocaleString('pl-PL') },
    { label: 'Double texty', values: records.map((r) => r.self.doubleTexts), format: (v) => `${v}` },
    { label: 'Inicjowanie rozmów', values: records.map((r) => r.self.conversationInitiations), format: (v) => `${v}` },
    { label: 'Wiadomości nocne', values: records.map((r) => r.self.lateNightMessages), format: (v) => `${v}` },
    { label: 'Bogactwo słownictwa', values: records.map((r) => r.self.vocabularyRichness), format: (v) => v.toFixed(3) },
  ];

  let bestCandidate: HeroInsight | null = null;
  let bestCV = 0;

  for (const c of candidates) {
    const valid = c.values.filter((v) => v > 0);
    if (valid.length < 2) continue;
    const cvVal = computeCV(valid);
    if (cvVal > bestCV) {
      bestCV = cvVal;
      const maxIdx = c.values.indexOf(Math.max(...c.values));
      const minIdx = c.values.indexOf(Math.min(...c.values.filter((v) => v > 0)));
      const maxV = c.values[maxIdx];
      const minV = c.values[minIdx];
      if (minV > 0) {
        bestCandidate = {
          label: c.label,
          bestName: records[maxIdx].partnerName,
          worstName: records[minIdx].partnerName,
          bestFormatted: c.format(maxV),
          worstFormatted: c.format(minV),
          deltaPct: Math.round(((maxV - minV) / minV) * 100),
        };
      }
    }
  }

  return bestCandidate;
}

// ── Insight Generation ──

function generateInsights(records: ComparisonRecord[], selfName: string): InsightData[] {
  const insights: InsightData[] = [];
  if (records.length === 0) return insights;

  const medianRTs = records.map((r) => r.self.medianResponseTimeMs);
  const fastestIdx = argMin(medianRTs.map((v) => v || Infinity));
  if (fastestIdx >= 0 && medianRTs[fastestIdx] > 0) {
    const ms = medianRTs[fastestIdx];
    const fmt = ms < 60000 ? `${(ms / 1000).toFixed(0)}s` : ms < 3600000 ? `${(ms / 60000).toFixed(0)}min` : `${(ms / 3600000).toFixed(1)}h`;
    insights.push({
      id: 'fastest_rt', title: 'Najszybsza odpowiedź', value: fmt,
      description: `z ${records[fastestIdx].partnerName}`,
      type: 'positive', icon: '⚡', source: 'quant', relationshipTitle: records[fastestIdx].partnerName,
    });
  }

  const lsmScores = records.map((r) => r.relationship.lsm?.overall ?? -1);
  const bestLsmIdx = argMax(lsmScores);
  if (bestLsmIdx >= 0 && lsmScores[bestLsmIdx] >= 0) {
    insights.push({
      id: 'best_lsm', title: 'Najwyższy LSM', value: lsmScores[bestLsmIdx].toFixed(2),
      description: `z ${records[bestLsmIdx].partnerName}`,
      type: 'positive', icon: '🪞', source: 'quant', relationshipTitle: records[bestLsmIdx].partnerName,
    });
  }

  const recipScores = records.map((r) => r.relationship.reciprocityIndex?.overall ?? -1);
  const bestRecIdx = argMax(recipScores.map((v) => v >= 0 ? 50 - Math.abs(v - 50) : -1));
  if (bestRecIdx >= 0 && recipScores[bestRecIdx] >= 0) {
    insights.push({
      id: 'best_recip', title: 'Najlepsza wzajemność', value: `${Math.round(recipScores[bestRecIdx])}`,
      description: `z ${records[bestRecIdx].partnerName}`,
      type: 'positive', icon: '⚖️', source: 'quant', relationshipTitle: records[bestRecIdx].partnerName,
    });
  }

  const bidRates = records.map((r) => r.self.bidResponseRate ?? -1);
  const bestBidIdx = argMax(bidRates);
  if (bestBidIdx >= 0 && bidRates[bestBidIdx] >= 0) {
    insights.push({
      id: 'best_bid', title: 'Bid-response', value: `${(bidRates[bestBidIdx] * 100).toFixed(0)}%`,
      description: `z ${records[bestBidIdx].partnerName}`,
      type: 'positive', icon: '🤝', source: 'quant', relationshipTitle: records[bestBidIdx].partnerName,
    });
  }

  const chronoScores = records.map((r) => r.relationship.chronotypeMatchScore ?? -1);
  const bestChronoIdx = argMax(chronoScores);
  if (bestChronoIdx >= 0 && chronoScores[bestChronoIdx] >= 0) {
    insights.push({
      id: 'best_chrono', title: 'Chronotyp match', value: `${Math.round(chronoScores[bestChronoIdx])}`,
      description: `z ${records[bestChronoIdx].partnerName}`,
      type: 'positive', icon: '🕐', source: 'quant', relationshipTitle: records[bestChronoIdx].partnerName,
    });
  }

  const cniGaps = records.map((r) => r.relationship.shiftSupport?.cniGap ?? -1);
  const maxCniIdx = argMax(cniGaps);
  if (maxCniIdx >= 0 && cniGaps[maxCniIdx] > 5) {
    insights.push({
      id: 'max_cni', title: 'Narcyzm konw.', value: `Δ${Math.round(cniGaps[maxCniIdx])}`,
      description: `z ${records[maxCniIdx].partnerName}`,
      type: 'warning', icon: '🎤', source: 'quant', relationshipTitle: records[maxCniIdx].partnerName,
    });
  }

  const silences = records.map((r) => r.relationship.longestSilenceMs);
  const longestSilIdx = argMax(silences);
  if (longestSilIdx >= 0 && silences[longestSilIdx] > 0) {
    const ms = silences[longestSilIdx];
    const fmt = ms < 86400000 ? `${(ms / 3600000).toFixed(0)}h` : `${(ms / 86400000).toFixed(0)}d`;
    insights.push({
      id: 'longest_silence', title: 'Najdłuższa cisza', value: fmt,
      description: `z ${records[longestSilIdx].partnerName}`,
      type: 'warning', icon: '🤐', source: 'quant', relationshipTitle: records[longestSilIdx].partnerName,
    });
  }

  const aiRecords = records.filter((r) => r.hasAI);
  if (aiRecords.length > 0) {
    const compatScores = aiRecords.map((r) => r.relationship.viralScores?.compatibilityScore ?? -1);
    const bestCompatIdx = argMax(compatScores);
    if (bestCompatIdx >= 0 && compatScores[bestCompatIdx] >= 0) {
      insights.push({
        id: 'best_compat', title: 'Kompatybilność', value: `${Math.round(compatScores[bestCompatIdx])}%`,
        description: `z ${aiRecords[bestCompatIdx].partnerName}`,
        type: 'positive', icon: '💕', source: 'ai', relationshipTitle: aiRecords[bestCompatIdx].partnerName,
      });
    }
  }

  return insights;
}

// ── Main Component ──

export default function OverviewTab({ records, selfName }: Props) {
  const totalMessages = useMemo(
    () => records.reduce((s, r) => s + r.totalMessages, 0),
    [records],
  );

  const maxDuration = useMemo(
    () => Math.max(...records.map((r) => r.durationDays), 0),
    [records],
  );

  const avgHealth = useMemo(() => {
    const scores = records
      .map((r) => r.relationshipAI.healthScore?.overall ?? r.relationship.viralScores?.compatibilityScore ?? -1)
      .filter((v) => v >= 0);
    return scores.length > 0 ? Math.round(mean(scores)) : null;
  }, [records]);

  // Podium: top 5 by health/compatibility
  const podium = useMemo(() => {
    return records
      .map((r, i) => {
        const monthly = r.relationship.monthlyVolume;
        const sparkData = monthly
          ? Object.values(monthly).map((m) => (m as { total: number }).total).slice(-12)
          : [];
        return {
          record: r,
          colorIndex: i,
          score: r.relationshipAI.healthScore?.overall ?? r.relationship.viralScores?.compatibilityScore ?? -1,
          sparkData,
        };
      })
      .filter((s) => s.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [records]);

  const heroInsight = useMemo(
    () => computeHeroInsight(records),
    [records],
  );

  const insights = useMemo(
    () => generateInsights(records, selfName).slice(0, 8),
    [records, selfName],
  );

  const flags = useMemo(() => {
    const aiRecords = records.filter((r) => r.hasAI);
    if (aiRecords.length === 0) return null;
    const red = aiRecords.reduce((s, r) => s + r.relationshipAI.redFlags.length, 0);
    const green = aiRecords.reduce((s, r) => s + r.relationshipAI.greenFlags.length, 0);
    if (red + green === 0) return null;
    return { red, green, aiCount: aiRecords.length };
  }, [records]);

  const fmtNum = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
    return `${n}`;
  };

  return (
    <div className="space-y-5">
      {/* ── Stat cards grid ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <span className="block font-mono text-2xl font-bold text-foreground">{records.length}</span>
          <span className="text-[11px] text-muted-foreground">relacji</span>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <span className="block font-mono text-2xl font-bold text-foreground">{fmtNum(totalMessages)}</span>
          <span className="text-[11px] text-muted-foreground">wiadomości</span>
        </div>
        {avgHealth != null && (
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <span className="block font-mono text-2xl font-bold text-foreground">{avgHealth}</span>
            <span className="text-[11px] text-muted-foreground">śr. health</span>
          </div>
        )}
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <span className="block font-mono text-2xl font-bold text-foreground">{Math.round(maxDuration)}</span>
          <span className="text-[11px] text-muted-foreground">max dni</span>
        </div>
        {flags && avgHealth == null && (
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-[#10b981]">{flags.green}</span>
              <span className="font-mono text-2xl font-bold text-[#ef4444]">{flags.red}</span>
            </div>
            <span className="text-[11px] text-muted-foreground">flagi (z {flags.aiCount} AI)</span>
          </div>
        )}
      </div>

      {/* ── Hero callout — biggest difference ── */}
      {heroInsight && (
        <div className="rounded-xl border border-primary/20 bg-gradient-to-b from-primary/[0.04] to-transparent p-4">
          <div className="flex items-start gap-3">
            <span className="text-lg">🔍</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-primary/70">Najciekawsza różnica</p>
              <p className="mt-1 text-sm text-foreground">
                <span className="font-semibold">{heroInsight.label}</span>
                {' — '}
                <span className="text-foreground/80">{heroInsight.bestName}</span>
                {' '}
                <span className="font-mono font-bold text-foreground">{heroInsight.bestFormatted}</span>
                {' vs '}
                <span className="text-foreground/80">{heroInsight.worstName}</span>
                {' '}
                <span className="font-mono text-muted-foreground">{heroInsight.worstFormatted}</span>
              </p>
              <span className="mt-1 inline-block rounded-full bg-[#10b981]/10 px-2 py-0.5 font-mono text-[10px] font-medium text-[#10b981]">
                Δ{heroInsight.deltaPct}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Podium with ScoreRings ── */}
      {podium.length >= 2 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="px-4 py-2.5">
            <span className="text-xs font-medium text-muted-foreground">Top relacje</span>
          </div>
          <div className="border-t border-border">
            {/* Top 3 as ScoreRings */}
            {podium.length >= 2 && (
              <div className="flex items-end justify-center gap-6 px-4 py-5 sm:gap-10">
                {podium.slice(0, 3).map((p, i) => {
                  const color = COMPARISON_COLORS[p.colorIndex % COMPARISON_COLORS.length];
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
                  const ringSize = i === 0 ? 80 : 64;

                  return (
                    <div key={p.record.analysisId} className="flex flex-col items-center gap-1.5">
                      <span className="text-sm">{medal}</span>
                      <ScoreRing score={p.score} color={color} size={ringSize} />
                      <span className="max-w-20 truncate text-center text-xs font-medium text-foreground">
                        {p.record.partnerName}
                      </span>
                      {p.sparkData.length >= 2 && (
                        <Sparkline data={p.sparkData} color={color} width={48} height={12} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {/* 4th-5th as compact rows */}
            {podium.slice(3).map((p, i) => {
              const color = COMPARISON_COLORS[p.colorIndex % COMPARISON_COLORS.length];
              return (
                <div
                  key={p.record.analysisId}
                  className="flex items-center gap-3 border-t border-border/50 px-4 py-2"
                >
                  <span className="w-5 shrink-0 text-center text-xs text-muted-foreground/50">{i + 4}</span>
                  <span className="inline-block size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <span className="w-32 shrink-0 truncate text-sm font-medium">{p.record.partnerName}</span>
                  <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.03]">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ width: `${podium[0].score > 0 ? (p.score / podium[0].score) * 100 : 0}%`, backgroundColor: color, opacity: 0.5 }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right font-mono text-xs font-semibold text-foreground">
                    {Math.round(p.score)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Highlights — compact rows ── */}
      {insights.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="px-4 py-2.5">
            <span className="text-xs font-medium text-muted-foreground">Odkrycia</span>
            {flags && (
              <span className="ml-3 inline-flex items-center gap-2 text-xs">
                <span className="text-[#10b981]">🟢 {flags.green}</span>
                <span className="text-[#ef4444]">🔴 {flags.red}</span>
              </span>
            )}
          </div>
          <div className="border-t border-border">
            {insights.map((insight, i) => (
              <div
                key={insight.id}
                className={`flex items-center gap-3 px-4 py-2 ${i > 0 ? 'border-t border-border/50' : ''}`}
              >
                <span className="w-5 shrink-0 text-center text-sm">{insight.icon}</span>
                <span className="flex-1 truncate text-sm text-muted-foreground">
                  {insight.title}
                  <span className="ml-1.5 text-xs text-muted-foreground/60">{insight.description}</span>
                </span>
                <span className="shrink-0 font-mono text-sm font-semibold text-foreground">{insight.value}</span>
                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                  insight.source === 'ai' ? 'bg-[#a855f7]/10 text-[#a855f7]' : 'bg-primary/10 text-primary'
                }`}>
                  {insight.source === 'ai' ? 'AI' : 'Q'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
