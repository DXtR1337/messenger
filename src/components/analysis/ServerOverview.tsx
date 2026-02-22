'use client';

import type { QuantitativeAnalysis, ParsedConversation } from '@/lib/parsers/types';
import { getPersonColor } from './PersonNavigator';

interface ServerOverviewProps {
  quantitative: QuantitativeAnalysis;
  conversation: ParsedConversation;
  participants: string[];
}

function formatMs(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}min`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

function KPI({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3 text-center">
      <div className="font-mono text-[10px] uppercase tracking-widest text-text-muted">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold text-foreground">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-text-muted">{sub}</div>}
    </div>
  );
}

export default function ServerOverview({ quantitative, conversation, participants }: ServerOverviewProps) {
  const { metadata } = conversation;
  const sorted = [...participants].sort((a, b) => {
    return (quantitative.perPerson[b]?.totalMessages ?? 0) - (quantitative.perPerson[a]?.totalMessages ?? 0);
  });

  // Most active person
  const topPerson = sorted[0];
  const topCount = quantitative.perPerson[topPerson]?.totalMessages ?? 0;

  // Total words
  const totalWords = Object.values(quantitative.perPerson).reduce((sum, pm) => sum + pm.totalWords, 0);

  // Average response time across all participants
  const responseTimes = Object.values(quantitative.timing.perPerson)
    .map((t) => t.medianResponseTimeMs)
    .filter((t) => t > 0 && t < Infinity);
  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0;

  // Total sessions
  const sessions = quantitative.engagement.totalSessions;

  // Activity balance — Gini coefficient approximation
  const msgCounts = sorted.map((name) => quantitative.perPerson[name]?.totalMessages ?? 0);
  const totalMsgs = msgCounts.reduce((a, b) => a + b, 0);
  const n = msgCounts.length;
  let giniSum = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      giniSum += Math.abs(msgCounts[i] - msgCounts[j]);
    }
  }
  const gini = n > 1 ? giniSum / (2 * n * Math.max(totalMsgs, 1)) : 0;
  const balanceLabel = gini < 0.2 ? 'Bardzo zbalansowany' : gini < 0.4 ? 'Zbalansowany' : gini < 0.6 ? 'Nierównomierny' : 'Zdominowany';

  // Top 5 activity share visualization
  const top5 = sorted.slice(0, 5);
  const othersCount = sorted.slice(5).reduce((sum, name) => sum + (quantitative.perPerson[name]?.totalMessages ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <KPI label="Uczestnicy" value={String(participants.length)} />
        <KPI label="Wiadomości" value={metadata.totalMessages.toLocaleString('pl-PL')} sub={`${metadata.durationDays} dni`} />
        <KPI label="Słowa" value={totalWords.toLocaleString('pl-PL')} />
        <KPI label="Sesje" value={String(sessions)} sub={`śr. ${Math.round(totalMsgs / Math.max(sessions, 1))}/sesję`} />
        <KPI label="Śr. czas odp." value={avgResponseTime > 0 ? formatMs(avgResponseTime) : 'n/a'} />
      </div>

      {/* Activity distribution */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">Rozkład aktywności</span>
          <span className="text-[10px] text-text-muted">{balanceLabel} (Gini: {gini.toFixed(2)})</span>
        </div>

        {/* Stacked bar */}
        <div className="flex h-6 w-full overflow-hidden rounded-lg">
          {top5.map((name, i) => {
            const count = quantitative.perPerson[name]?.totalMessages ?? 0;
            const pct = (count / Math.max(totalMsgs, 1)) * 100;
            const color = getPersonColor(sorted.indexOf(name));
            return (
              <div
                key={name}
                className="relative h-full transition-all duration-300"
                style={{ width: `${pct}%`, backgroundColor: color }}
                title={`${name}: ${count.toLocaleString('pl-PL')} (${pct.toFixed(1)}%)`}
              >
                {pct > 8 && (
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow-sm">
                    {name.slice(0, 6)}
                  </span>
                )}
              </div>
            );
          })}
          {othersCount > 0 && (
            <div
              className="relative h-full bg-border"
              style={{ width: `${(othersCount / Math.max(totalMsgs, 1)) * 100}%` }}
              title={`Pozostali: ${othersCount.toLocaleString('pl-PL')}`}
            >
              {((othersCount / Math.max(totalMsgs, 1)) * 100) > 8 && (
                <span className="absolute inset-0 flex items-center justify-center text-[9px] text-text-muted">
                  +{sorted.length - 5}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {top5.map((name) => {
            const count = quantitative.perPerson[name]?.totalMessages ?? 0;
            const pct = ((count / Math.max(totalMsgs, 1)) * 100).toFixed(1);
            const color = getPersonColor(sorted.indexOf(name));
            return (
              <div key={name} className="flex items-center gap-1 text-[10px]">
                <div className="size-2 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-text-muted">{name}: {pct}%</span>
              </div>
            );
          })}
          {othersCount > 0 && (
            <div className="flex items-center gap-1 text-[10px]">
              <div className="size-2 rounded-sm bg-border" />
              <span className="text-text-muted">
                +{sorted.length - 5}: {((othersCount / Math.max(totalMsgs, 1)) * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Network density (if available) */}
      {quantitative.networkMetrics && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-background px-3 py-2">
            <div className="font-mono text-[10px] uppercase tracking-widest text-text-muted">Gęstość sieci</div>
            <div className="mt-0.5 font-display text-lg font-bold text-foreground">
              {(quantitative.networkMetrics.density * 100).toFixed(0)}%
            </div>
          </div>
          <div className="rounded-lg border border-border bg-background px-3 py-2">
            <div className="font-mono text-[10px] uppercase tracking-widest text-text-muted">Centrum sieci</div>
            <div className="mt-0.5 truncate font-display text-lg font-bold text-foreground">
              {quantitative.networkMetrics.mostConnected}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-background px-3 py-2">
            <div className="font-mono text-[10px] uppercase tracking-widest text-text-muted">Nr 1</div>
            <div className="mt-0.5 truncate font-display text-lg font-bold text-foreground">
              {topPerson} ({topCount.toLocaleString('pl-PL')})
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
