'use client';

import { useMemo } from 'react';
import type { ComparisonRecord, InsightData } from '@/lib/compare';
import { argMax, argMin, mean } from '@/lib/compare';

interface Props {
  records: ComparisonRecord[];
  selfName: string;
}

function InsightCard({ insight }: { insight: InsightData }) {
  const bgColor =
    insight.type === 'positive' ? 'bg-emerald-500/5 border-emerald-500/20'
    : insight.type === 'warning' ? 'bg-amber-500/5 border-amber-500/20'
    : insight.type === 'info' ? 'bg-blue-500/5 border-blue-500/20'
    : 'bg-secondary/30 border-border';

  return (
    <div className={`rounded-xl border p-4 ${bgColor}`}>
      <div className="flex items-start gap-3">
        <span className="text-lg">{insight.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{insight.title}</p>
          <p className="mt-0.5 font-mono text-lg font-bold">{insight.value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{insight.description}</p>
          {insight.relationshipTitle && (
            <p className="mt-1 text-xs text-muted-foreground/70">
              {insight.relationshipTitle}
            </p>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
          insight.source === 'ai' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'
        }`}>
          {insight.source === 'ai' ? 'AI' : 'Quant'}
        </span>
      </div>
    </div>
  );
}

function generateInsights(records: ComparisonRecord[], selfName: string): InsightData[] {
  const insights: InsightData[] = [];
  if (records.length === 0) return insights;

  // ─── Quant insights (always available) ───

  // Fastest response
  const medianRTs = records.map((r) => r.self.medianResponseTimeMs);
  const fastestIdx = argMin(medianRTs.map((v) => v || Infinity));
  if (fastestIdx >= 0 && medianRTs[fastestIdx] > 0) {
    const ms = medianRTs[fastestIdx];
    const fmt = ms < 60000 ? `${(ms / 1000).toFixed(0)}s` : ms < 3600000 ? `${(ms / 60000).toFixed(0)}min` : `${(ms / 3600000).toFixed(1)}h`;
    insights.push({
      id: 'fastest_rt', title: 'Najszybsza odpowiedź', value: fmt,
      description: `${selfName} odpowiada najszybciej w rozmowie z ${records[fastestIdx].partnerName}`,
      type: 'positive', icon: '⚡', source: 'quant', relationshipTitle: records[fastestIdx].partnerName,
    });
  }

  // Highest LSM
  const lsmScores = records.map((r) => r.relationship.lsm?.overall ?? -1);
  const bestLsmIdx = argMax(lsmScores);
  if (bestLsmIdx >= 0 && lsmScores[bestLsmIdx] >= 0) {
    insights.push({
      id: 'best_lsm', title: 'Najwyższy LSM', value: lsmScores[bestLsmIdx].toFixed(2),
      description: `Najwyższe dopasowanie językowe z ${records[bestLsmIdx].partnerName}`,
      type: 'positive', icon: '🪞', source: 'quant', relationshipTitle: records[bestLsmIdx].partnerName,
    });
  }

  // Best reciprocity
  const recipScores = records.map((r) => r.relationship.reciprocityIndex?.overall ?? -1);
  const bestRecIdx = argMax(recipScores.map((v) => v >= 0 ? 50 - Math.abs(v - 50) : -1));
  if (bestRecIdx >= 0 && recipScores[bestRecIdx] >= 0) {
    insights.push({
      id: 'best_recip', title: 'Najlepsza wzajemność', value: `${Math.round(recipScores[bestRecIdx])}`,
      description: `Najbardziej zbalansowana relacja z ${records[bestRecIdx].partnerName}`,
      type: 'positive', icon: '⚖️', source: 'quant', relationshipTitle: records[bestRecIdx].partnerName,
    });
  }

  // Best bid-response
  const bidRates = records.map((r) => r.self.bidResponseRate ?? -1);
  const bestBidIdx = argMax(bidRates);
  if (bestBidIdx >= 0 && bidRates[bestBidIdx] >= 0) {
    insights.push({
      id: 'best_bid', title: 'Najwyższy bid-response', value: `${(bidRates[bestBidIdx] * 100).toFixed(0)}%`,
      description: `Najwyższy wskaźnik "turning toward" z ${records[bestBidIdx].partnerName}`,
      type: 'positive', icon: '🤝', source: 'quant', relationshipTitle: records[bestBidIdx].partnerName,
    });
  }

  // Chronotype match
  const chronoScores = records.map((r) => r.relationship.chronotypeMatchScore ?? -1);
  const bestChronoIdx = argMax(chronoScores);
  if (bestChronoIdx >= 0 && chronoScores[bestChronoIdx] >= 0) {
    insights.push({
      id: 'best_chrono', title: 'Chronotyp match', value: `${Math.round(chronoScores[bestChronoIdx])}/100`,
      description: `Najlepsza kompatybilność chronotypów z ${records[bestChronoIdx].partnerName}`,
      type: 'positive', icon: '🕐', source: 'quant', relationshipTitle: records[bestChronoIdx].partnerName,
    });
  }

  // Highest CNI gap (narcissism)
  const cniGaps = records.map((r) => r.relationship.shiftSupport?.cniGap ?? -1);
  const maxCniIdx = argMax(cniGaps);
  if (maxCniIdx >= 0 && cniGaps[maxCniIdx] > 5) {
    insights.push({
      id: 'max_cni', title: 'Narcyzm konwersacyjny', value: `Δ${Math.round(cniGaps[maxCniIdx])}`,
      description: `Największa różnica CNI z ${records[maxCniIdx].partnerName}`,
      type: 'warning', icon: '🎤', source: 'quant', relationshipTitle: records[maxCniIdx].partnerName,
    });
  }

  // Emotional granularity
  const granScores = records.map((r) => r.self.granularityScoreV2 ?? r.self.granularityScore ?? -1);
  const bestGranIdx = argMax(granScores);
  if (bestGranIdx >= 0 && granScores[bestGranIdx] > 0) {
    insights.push({
      id: 'best_gran', title: 'Różnorodność emocji', value: `${granScores[bestGranIdx].toFixed(1)}`,
      description: `Najwyższa różnorodność słownictwa emocjonalnego w rozmowie z ${records[bestGranIdx].partnerName}`,
      type: 'info', icon: '🎨', source: 'quant', relationshipTitle: records[bestGranIdx].partnerName,
    });
  }

  // Highest IC
  const icScores = records.map((r) => r.self.icScore ?? -1);
  const bestIcIdx = argMax(icScores);
  if (bestIcIdx >= 0 && icScores[bestIcIdx] > 0) {
    insights.push({
      id: 'best_ic', title: 'Złożoność poznawcza', value: `${icScores[bestIcIdx].toFixed(0)}`,
      description: `Najwyższy wskaźnik złożoności poznawczej w rozmowie z ${records[bestIcIdx].partnerName}`,
      type: 'info', icon: '🧩', source: 'quant', relationshipTitle: records[bestIcIdx].partnerName,
    });
  }

  // Future orientation
  const futureIdxs = records.map((r) => r.self.futureIndex ?? -1);
  const mostFutureIdx = argMax(futureIdxs);
  if (mostFutureIdx >= 0 && futureIdxs[mostFutureIdx] > 0) {
    insights.push({
      id: 'most_future', title: 'Orientacja przyszłościowa', value: `${(futureIdxs[mostFutureIdx] * 100).toFixed(0)}%`,
      description: `Największy focus na przyszłość z ${records[mostFutureIdx].partnerName}`,
      type: 'info', icon: '🔮', source: 'quant', relationshipTitle: records[mostFutureIdx].partnerName,
    });
  }

  // Best repair
  const repairScores = records.map((r) => r.relationship.mutualRepairIndex ?? -1);
  const bestRepairIdx = argMax(repairScores);
  if (bestRepairIdx >= 0 && repairScores[bestRepairIdx] > 0) {
    insights.push({
      id: 'best_repair', title: 'Najlepszy repair', value: `${repairScores[bestRepairIdx].toFixed(2)}`,
      description: `Najwyższy mutual repair index z ${records[bestRepairIdx].partnerName}`,
      type: 'positive', icon: '🔧', source: 'quant', relationshipTitle: records[bestRepairIdx].partnerName,
    });
  }

  // Longest silence
  const silences = records.map((r) => r.relationship.longestSilenceMs);
  const longestSilIdx = argMax(silences);
  if (longestSilIdx >= 0 && silences[longestSilIdx] > 0) {
    const ms = silences[longestSilIdx];
    const fmt = ms < 86400000 ? `${(ms / 3600000).toFixed(0)}h` : `${(ms / 86400000).toFixed(0)}d`;
    insights.push({
      id: 'longest_silence', title: 'Najdłuższa cisza', value: fmt,
      description: `Najdłuższa przerwa w rozmowie z ${records[longestSilIdx].partnerName}`,
      type: 'warning', icon: '🤐', source: 'quant', relationshipTitle: records[longestSilIdx].partnerName,
    });
  }

  // Pursuit-withdrawal
  const pwCycles = records.map((r) => r.relationship.pursuitWithdrawal?.cycleCount ?? 0);
  const maxPwIdx = argMax(pwCycles);
  if (maxPwIdx >= 0 && pwCycles[maxPwIdx] > 0) {
    insights.push({
      id: 'max_pw', title: 'Pursuit-withdrawal', value: `${pwCycles[maxPwIdx]} cykli`,
      description: `Najwięcej cykli goni-ucieka z ${records[maxPwIdx].partnerName}`,
      type: 'warning', icon: '🔄', source: 'quant', relationshipTitle: records[maxPwIdx].partnerName,
    });
  }

  // Badge champion
  const badgeCounts = records.map((r) => r.relationship.badges.length);
  const bestBadgeIdx = argMax(badgeCounts);
  if (bestBadgeIdx >= 0 && badgeCounts[bestBadgeIdx] > 0) {
    insights.push({
      id: 'badge_champ', title: 'Odznaka champion', value: `${badgeCounts[bestBadgeIdx]} odznak`,
      description: `Najwięcej odznak w rozmowie z ${records[bestBadgeIdx].partnerName}`,
      type: 'positive', icon: '🏅', source: 'quant', relationshipTitle: records[bestBadgeIdx].partnerName,
    });
  }

  // Most productive time
  const bestHours = records.map((r) => r.self.bestHour).filter((h): h is number => h != null);
  if (bestHours.length > 0) {
    const counts = new Map<number, number>();
    for (const h of bestHours) counts.set(h, (counts.get(h) ?? 0) + 1);
    let modeHour = bestHours[0];
    let modeCount = 0;
    for (const [h, c] of counts) { if (c > modeCount) { modeHour = h; modeCount = c; } }
    insights.push({
      id: 'best_time', title: 'Najlepsza pora', value: `${modeHour}:00`,
      description: `Najczęstsza optymalna godzina na pisanie wiadomości`,
      type: 'info', icon: '⏰', source: 'quant',
    });
  }

  // Weekday-Weekend Messaging Shift (formerly "Social jet lag")
  const jetLags = records.map((r) => r.self.socialJetLagHours ?? -1);
  const maxJetIdx = argMax(jetLags);
  if (maxJetIdx >= 0 && jetLags[maxJetIdx] > 0.5) {
    insights.push({
      id: 'max_jetlag', title: 'Przesunięcie aktywności', value: `${jetLags[maxJetIdx].toFixed(1)}h`,
      description: `Największe przesunięcie aktywności tydzień/weekend w rozmowie z ${records[maxJetIdx].partnerName}`,
      type: 'warning', icon: '😴', source: 'quant', relationshipTitle: records[maxJetIdx].partnerName,
    });
  }

  // ─── AI insights (when available) ───
  const aiRecords = records.filter((r) => r.hasAI);

  if (aiRecords.length > 0) {
    // Highest compatibility
    const compatScores = aiRecords.map((r) => r.relationship.viralScores?.compatibilityScore ?? -1);
    const bestCompatIdx = argMax(compatScores);
    if (bestCompatIdx >= 0 && compatScores[bestCompatIdx] >= 0) {
      insights.push({
        id: 'best_compat', title: 'Najwyższa kompatybilność', value: `${Math.round(compatScores[bestCompatIdx])}%`,
        description: `Najwyższy score kompatybilności z ${aiRecords[bestCompatIdx].partnerName}`,
        type: 'positive', icon: '💕', source: 'ai', relationshipTitle: aiRecords[bestCompatIdx].partnerName,
      });
    }

    // Average health
    const healthScores = aiRecords.map((r) => r.relationshipAI.healthScore?.overall ?? -1).filter((v) => v >= 0);
    if (healthScores.length > 0) {
      insights.push({
        id: 'avg_health', title: 'Średni Health Score', value: `${Math.round(mean(healthScores))}/100`,
        description: `Średnie zdrowie relacji z ${healthScores.length} analiz AI`,
        type: mean(healthScores) >= 60 ? 'positive' : 'warning', icon: '❤️', source: 'ai',
      });
    }

    // Red/Green flags
    const totalRed = aiRecords.reduce((s, r) => s + r.relationshipAI.redFlags.length, 0);
    const totalGreen = aiRecords.reduce((s, r) => s + r.relationshipAI.greenFlags.length, 0);
    if (totalRed + totalGreen > 0) {
      insights.push({
        id: 'flags', title: 'Red/Green Flags', value: `🟢${totalGreen} / 🔴${totalRed}`,
        description: `Łącznie z ${aiRecords.length} analiz AI`,
        type: totalGreen > totalRed ? 'positive' : 'warning', icon: '🚩', source: 'ai',
      });
    }
  }

  return insights;
}

export default function InsightsTab({ records, selfName }: Props) {
  const insights = useMemo(
    () => generateInsights(records, selfName),
    [records, selfName],
  );

  if (insights.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Brak wystarczających danych do wygenerowania wniosków.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {insights.length} automatycznych odkryć z {records.length} relacji
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>
    </div>
  );
}
