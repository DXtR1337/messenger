'use client';

import type { PersonMetrics, QuantitativeAnalysis, ParsedConversation } from '@/lib/parsers/types';
import { getPersonColor } from './PersonNavigator';

interface PersonProfileProps {
  name: string;
  index: number;
  quantitative: QuantitativeAnalysis;
  conversation: ParsedConversation;
}

function formatMs(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}min`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-widest text-text-muted">{label}</div>
      <div className="mt-0.5 font-display text-lg font-bold text-foreground">{value}</div>
      {sub && <div className="text-[10px] text-text-muted">{sub}</div>}
    </div>
  );
}

export default function PersonProfile({ name, index, quantitative, conversation }: PersonProfileProps) {
  const color = getPersonColor(index);
  const pm = quantitative.perPerson[name];
  const totalMessages = conversation.metadata.totalMessages;

  if (!pm) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-text-muted">
        Brak danych dla {name}
      </div>
    );
  }

  const pct = ((pm.totalMessages / Math.max(totalMessages, 1)) * 100).toFixed(1);
  const timing = quantitative.timing.perPerson[name];
  const doubleTexts = quantitative.engagement.doubleTexts[name] ?? 0;
  const maxConsecutive = quantitative.engagement.maxConsecutive[name] ?? 0;
  const lateNight = quantitative.timing.lateNightMessages[name] ?? 0;
  const initiations = quantitative.timing.conversationInitiations[name] ?? 0;
  const ghostRisk = quantitative.viralScores?.ghostRisk?.[name];
  const interestScore = quantitative.viralScores?.interestScores?.[name];
  const catchphrases = quantitative.catchphrases?.perPerson[name];
  const bestTime = quantitative.bestTimeToText?.perPerson[name];

  // Get badges for this person
  const personBadges = quantitative.badges?.filter((b) => b.holder === name) ?? [];

  return (
    <div className="space-y-4">
      {/* Profile Header */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          <div
            className="flex size-12 items-center justify-center rounded-xl text-xl font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">{name}</h2>
            <p className="text-sm text-text-muted">
              {pm.totalMessages.toLocaleString('pl-PL')} wiadomości ({pct}%)
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <StatBox label="Wiadomości" value={pm.totalMessages.toLocaleString('pl-PL')} sub={`${pct}% konwersacji`} />
        <StatBox label="Słowa" value={pm.totalWords.toLocaleString('pl-PL')} sub={`śr. ${pm.averageMessageLength.toFixed(1)}/msg`} />
        <StatBox label="Emoji" value={String(pm.emojiCount)} sub={pm.topEmojis.slice(0, 3).map((e) => e.emoji).join(' ')} />
        <StatBox label="Pytania" value={String(pm.questionsAsked)} />
        <StatBox label="Double texty" value={String(doubleTexts)} sub={`max ${maxConsecutive} z rzędu`} />
        <StatBox label="Nocne msg" value={String(lateNight)} sub="22:00-04:00" />
        <StatBox label="Inicjacje" value={String(initiations)} />
        {timing && (
          <StatBox
            label="Czas odpowiedzi"
            value={formatMs(timing.medianResponseTimeMs)}
            sub={`mediana (najszybciej: ${formatMs(timing.fastestResponseMs)})`}
          />
        )}
        {/* Discord-specific stats */}
        {pm.mentionsReceived !== undefined && (
          <StatBox label="Wzmianki (@)" value={String(pm.mentionsReceived)} sub="otrzymane @mentions" />
        )}
        {pm.repliesSent !== undefined && (
          <StatBox label="Odpowiedzi" value={String(pm.repliesSent)} sub="wysłane reply" />
        )}
        {pm.editedMessages !== undefined && (
          <StatBox label="Edycje" value={String(pm.editedMessages)} sub="edytowane po wysłaniu" />
        )}
      </div>

      {/* Viral Scores */}
      {(ghostRisk || interestScore !== undefined) && (
        <div className="grid grid-cols-2 gap-2">
          {interestScore !== undefined && (
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <div className="font-mono text-[10px] uppercase tracking-widest text-text-muted">Interest Score</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold text-foreground">{interestScore}</span>
                <span className="text-xs text-text-muted">/100</span>
              </div>
            </div>
          )}
          {ghostRisk && (
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <div className="font-mono text-[10px] uppercase tracking-widest text-text-muted">Ghost Risk</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className={`font-display text-2xl font-bold ${ghostRisk.score > 60 ? 'text-red-400' : ghostRisk.score > 30 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {ghostRisk.score}
                </span>
                <span className="text-xs text-text-muted">/100</span>
              </div>
              {ghostRisk.factors.length > 0 && (
                <div className="mt-1 text-[10px] text-text-muted">
                  {ghostRisk.factors.slice(0, 2).join(' / ')}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Top Words */}
      {pm.topWords.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-text-muted">Top słowa</div>
          <div className="flex flex-wrap gap-1.5">
            {pm.topWords.slice(0, 12).map((w) => (
              <span
                key={w.word}
                className="rounded-md border border-border px-2 py-0.5 text-xs text-foreground"
              >
                {w.word} <span className="text-text-muted">({w.count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Catchphrases */}
      {catchphrases && catchphrases.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-text-muted">Catchphrases</div>
          <div className="space-y-1">
            {catchphrases.slice(0, 5).map((cp) => (
              <div key={cp.phrase} className="flex items-center gap-2 text-sm">
                <span className="text-foreground">&ldquo;{cp.phrase}&rdquo;</span>
                <span className="text-[10px] text-text-muted">&times;{cp.count}</span>
                <div className="flex gap-px">
                  {Array.from({ length: Math.min(Math.round(cp.uniqueness * 10), 10) }, (_, i) => (
                    <div key={i} className="h-1.5 w-1 rounded-sm" style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Best Time to Text */}
      {bestTime && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-text-muted">
            Kiedy pisać do {name}
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-text-muted">Dzień:</span>{' '}
              <span className="font-medium text-foreground">{bestTime.bestDay}</span>
            </div>
            <div>
              <span className="text-text-muted">Godzina:</span>{' '}
              <span className="font-medium text-foreground">{bestTime.bestHour}:00</span>
            </div>
            <div>
              <span className="text-text-muted">Okno:</span>{' '}
              <span className="font-medium text-foreground">{bestTime.bestWindow}</span>
            </div>
          </div>
        </div>
      )}

      {/* Badges */}
      {personBadges.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-text-muted">Odznaki</div>
          <div className="flex flex-wrap gap-2">
            {personBadges.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
              >
                <span>{b.emoji}</span>
                <span className="font-medium text-foreground">{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
