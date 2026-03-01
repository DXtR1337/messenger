'use client';

import { useMemo } from 'react';
import type { ComparisonRecord } from '@/lib/compare';
import { mean, TRAIT_DIMENSIONS } from '@/lib/compare';

interface Props {
  records: ComparisonRecord[];
  selfName: string;
}

function StatRow({ label, value, unit = '' }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-sm font-medium">
        {value}{unit}
      </span>
    </div>
  );
}

function ProfileSection({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function UserProfileTab({ records, selfName }: Props) {
  const aiRecords = useMemo(
    () => records.filter((r) => r.hasAI && r.selfAI.bigFive),
    [records],
  );

  // Aggregate quant stats
  const quantProfile = useMemo(() => {
    if (records.length === 0) return null;

    const avgMsgLen = mean(records.map((r) => r.self.averageMessageLength));
    const avgVocab = mean(records.map((r) => r.self.vocabularyRichness));
    const avgEmojiRate = mean(records.map((r) => r.self.emojiRatePer1k));
    const avgQuestionRate = mean(records.map((r) => r.self.questionsAskedPer1k));
    const avgMediaRate = mean(records.map((r) => r.self.mediaSharedPer1k));
    const avgReactionGive = mean(records.map((r) => r.self.reactionGiveRate));
    const avgReactionRecv = mean(records.map((r) => r.self.reactionReceiveRate));
    const avgMedianRT = mean(records.map((r) => r.self.medianResponseTimeMs).filter((v) => v > 0));
    const avgP90 = mean(records.map((r) => r.self.p90Ms).filter((v): v is number => v != null));
    const avgLSM = mean(records.map((r) => r.relationship.lsm?.overall ?? 0).filter((v) => v > 0));
    const avgIRate = mean(records.map((r) => r.self.pronouns?.iRate ?? 0).filter((v) => v > 0));
    const avgWeRate = mean(records.map((r) => r.self.pronouns?.weRate ?? 0).filter((v) => v > 0));
    const avgYouRate = mean(records.map((r) => r.self.pronouns?.youRate ?? 0).filter((v) => v > 0));
    const avgIC = mean(records.map((r) => r.self.icScore ?? 0).filter((v) => v > 0));
    const avgSentiment = mean(records.map((r) => r.self.sentiment?.avgSentiment ?? 0));
    const avgGranularity = mean(records.map((r) => r.self.granularityScoreV2 ?? r.self.granularityScore ?? 0).filter((v) => v > 0));
    const avgVolatility = mean(records.map((r) => r.self.sentiment?.emotionalVolatility ?? 0).filter((v) => v > 0));
    const avgCNI = mean(records.map((r) => r.self.cni ?? 0).filter((v) => v > 0));
    const avgSelfRepair = mean(records.map((r) => r.self.selfRepairRate ?? 0).filter((v) => v > 0));
    const avgBidResponse = mean(records.map((r) => r.self.bidResponseRate ?? 0).filter((v) => v > 0));
    const totalMessages = records.reduce((s, r) => s + r.self.totalMessages, 0);
    const totalRelationships = records.length;

    // Chronotype mode
    const chronoCategories = records.map((r) => r.self.chronotypeCategory).filter(Boolean) as string[];
    const chronoMap = new Map<string, number>();
    for (const c of chronoCategories) chronoMap.set(c, (chronoMap.get(c) ?? 0) + 1);
    let chronoMode = '';
    let chronoMax = 0;
    for (const [c, n] of chronoMap) { if (n > chronoMax) { chronoMode = c; chronoMax = n; } }

    // Avg peak hour
    const peakHours = records.map((r) => r.self.peakHour).filter((v): v is number => v != null);
    const avgPeakHour = peakHours.length > 0 ? mean(peakHours) : null;

    // Unique badges
    const allBadges = new Set<string>();
    for (const r of records) {
      for (const b of r.relationship.badges) allBadges.add(b.id);
    }

    return {
      avgMsgLen, avgVocab, avgEmojiRate, avgQuestionRate, avgMediaRate,
      avgReactionGive, avgReactionRecv, avgMedianRT, avgP90, avgLSM,
      avgIRate, avgWeRate, avgYouRate, avgIC, avgSentiment, avgGranularity,
      avgVolatility, avgCNI, avgSelfRepair, avgBidResponse,
      totalMessages, totalRelationships, chronoMode, avgPeakHour,
      uniqueBadges: allBadges.size,
    };
  }, [records]);

  // Aggregate AI Big Five
  const avgBigFive = useMemo(() => {
    if (aiRecords.length === 0) return null;
    return TRAIT_DIMENSIONS
      .filter((t) => t.category === 'big5')
      .map((t) => {
        const values = aiRecords.map((r) => t.extractSelf(r.selfAI)).filter((v): v is number => v != null);
        return {
          key: t.key,
          label: t.label,
          avg: values.length > 0 ? mean(values) : null,
        };
      });
  }, [aiRecords]);

  // MBTI distribution
  const mbtiDist = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of aiRecords) {
      const type = r.selfAI.mbti?.type;
      if (type) map.set(type, (map.get(type) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [aiRecords]);

  // Attachment distribution
  const attachDist = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of aiRecords) {
      const style = r.selfAI.attachment?.primary_style;
      if (style && style !== 'insufficient_data') map.set(style, (map.get(style) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [aiRecords]);

  if (!quantProfile) return null;

  const fmtMs = (ms: number) =>
    ms < 60000 ? `${(ms / 1000).toFixed(0)}s`
    : ms < 3600000 ? `${(ms / 60000).toFixed(0)}min`
    : `${(ms / 3600000).toFixed(1)}h`;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-gradient-to-br from-blue-500/5 to-purple-500/5 p-5">
        <h2 className="text-lg font-bold">
          Profil <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{selfName}</span>
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Agregat z {quantProfile.totalRelationships} relacji &bull; {quantProfile.totalMessages.toLocaleString('pl-PL')} wiadomości łącznie
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Communication */}
        <ProfileSection title="Komunikacja" icon="💬">
          <div className="divide-y divide-border/50">
            <StatRow label="Śr. dł. wiadomości" value={quantProfile.avgMsgLen.toFixed(1)} unit=" słów" />
            <StatRow label="Bogactwo słownictwa" value={quantProfile.avgVocab.toFixed(2)} />
            <StatRow label="Emoji /1k" value={quantProfile.avgEmojiRate.toFixed(1)} />
            <StatRow label="Pytania /1k" value={quantProfile.avgQuestionRate.toFixed(1)} />
            <StatRow label="Media /1k" value={quantProfile.avgMediaRate.toFixed(1)} />
            <StatRow label="Reakcje ↑" value={`${(quantProfile.avgReactionGive * 100).toFixed(1)}`} unit="%" />
            <StatRow label="Reakcje ↓" value={`${(quantProfile.avgReactionRecv * 100).toFixed(1)}`} unit="%" />
          </div>
        </ProfileSection>

        {/* Timing */}
        <ProfileSection title="Timing" icon="⏱️">
          <div className="divide-y divide-border/50">
            <StatRow label="Śr. mediana RT" value={fmtMs(quantProfile.avgMedianRT)} />
            {quantProfile.avgP90 > 0 && <StatRow label="Śr. P90 RT" value={fmtMs(quantProfile.avgP90)} />}
            {quantProfile.chronoMode && (
              <StatRow label="Chronotyp" value={
                quantProfile.chronoMode === 'early_bird' ? '🐦 Skowronek'
                : quantProfile.chronoMode === 'night_owl' ? '🦉 Sowa'
                : '⏰ Pośredni'
              } />
            )}
            {quantProfile.avgPeakHour != null && (
              <StatRow label="Śr. godzina szczytu" value={`${Math.round(quantProfile.avgPeakHour)}:00`} />
            )}
          </div>
        </ProfileSection>

        {/* Language */}
        <ProfileSection title="Styl językowy" icon="✍️">
          <div className="divide-y divide-border/50">
            {quantProfile.avgLSM > 0 && <StatRow label="Śr. LSM" value={quantProfile.avgLSM.toFixed(2)} />}
            {quantProfile.avgIRate > 0 && <StatRow label='"ja" /1k' value={quantProfile.avgIRate.toFixed(1)} />}
            {quantProfile.avgWeRate > 0 && <StatRow label='"my" /1k' value={quantProfile.avgWeRate.toFixed(1)} />}
            {quantProfile.avgYouRate > 0 && <StatRow label='"ty" /1k' value={quantProfile.avgYouRate.toFixed(1)} />}
            {quantProfile.avgIC > 0 && <StatRow label="Złożoność IC" value={quantProfile.avgIC.toFixed(0)} />}
          </div>
        </ProfileSection>

        {/* Emotions */}
        <ProfileSection title="Emocje" icon="😊">
          <div className="divide-y divide-border/50">
            <StatRow label="Śr. sentiment" value={quantProfile.avgSentiment.toFixed(2)} />
            {quantProfile.avgGranularity > 0 && <StatRow label="Różnorodność emocji" value={quantProfile.avgGranularity.toFixed(1)} />}
            {quantProfile.avgVolatility > 0 && <StatRow label="Zmienność" value={quantProfile.avgVolatility.toFixed(2)} />}
          </div>
        </ProfileSection>

        {/* Behavioral */}
        <ProfileSection title="Behawioralne" icon="🧠">
          <div className="divide-y divide-border/50">
            {quantProfile.avgCNI > 0 && <StatRow label="CNI" value={quantProfile.avgCNI.toFixed(0)} />}
            {quantProfile.avgSelfRepair > 0 && <StatRow label="Self-repair /100" value={quantProfile.avgSelfRepair.toFixed(1)} />}
            {quantProfile.avgBidResponse > 0 && <StatRow label="Bid-response" value={`${(quantProfile.avgBidResponse * 100).toFixed(0)}`} unit="%" />}
            <StatRow label="Unikalne odznaki" value={`${quantProfile.uniqueBadges}`} />
          </div>
        </ProfileSection>

        {/* AI Profile (when available) */}
        {aiRecords.length > 0 && avgBigFive && (
          <ProfileSection title="Big Five (agregat)" icon="🎭">
            <div className="space-y-2">
              {avgBigFive.map((b) => (
                b.avg != null && (
                  <div key={b.key} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 text-xs text-muted-foreground">{b.label}</span>
                    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-secondary/30">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-blue-500"
                        style={{ width: `${(b.avg / 10) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right font-mono text-xs">{b.avg.toFixed(1)}</span>
                  </div>
                )
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Na podstawie {aiRecords.length} analiz AI
            </p>
          </ProfileSection>
        )}

        {/* MBTI distribution */}
        {mbtiDist.length > 0 && (
          <ProfileSection title="MBTI" icon="🧬">
            <div className="space-y-1.5">
              {mbtiDist.map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold">{type}</span>
                  <span className="text-xs text-muted-foreground">
                    {count}× ({((count / aiRecords.length) * 100).toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>
          </ProfileSection>
        )}

        {/* Attachment distribution */}
        {attachDist.length > 0 && (
          <ProfileSection title="Styl przywiązania" icon="🔗">
            <div className="space-y-1.5">
              {attachDist.map(([style, count]) => (
                <div key={style} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{style.replace('_', ' ')}</span>
                  <span className="text-xs text-muted-foreground">
                    {count}× ({((count / aiRecords.length) * 100).toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>
          </ProfileSection>
        )}
      </div>
    </div>
  );
}
