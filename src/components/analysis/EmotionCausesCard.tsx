'use client';

import type { EmotionCausesResult } from '@/lib/analysis/emotion-causes-prompts';
import PsychDisclaimer from '@/components/shared/PsychDisclaimer';
import { PSYCH_CITATIONS } from '@/lib/analysis/citations';

interface EmotionCausesCardProps {
  result: EmotionCausesResult;
  participants: string[];
}

const PERSON_COLORS = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b'];

const EMOTION_EMOJIS: Record<string, string> = {
  radość: '😄',
  smutek: '😔',
  złość: '😠',
  strach: '😨',
  zaskoczenie: '😲',
  frustracja: '😤',
  czułość: '🥰',
  pustka: '🫥',
};

const EMOTION_COLORS: Record<string, string> = {
  radość: 'text-yellow-400',
  smutek: 'text-blue-400',
  złość: 'text-red-400',
  strach: 'text-purple-400',
  zaskoczenie: 'text-orange-400',
  frustracja: 'text-red-400',
  czułość: 'text-pink-400',
  pustka: 'text-gray-400',
};

export default function EmotionCausesCard({ result, participants }: EmotionCausesCardProps) {
  if (!result.causePairs || result.causePairs.length === 0) return null;

  const getPersonColor = (name: string) => {
    const idx = participants.indexOf(name);
    return PERSON_COLORS[idx >= 0 ? idx % PERSON_COLORS.length : 0];
  };

  // Compute trigger totals for "Trigger Ratio" display
  const totalInterpersonal = Object.values(result.triggerMap).reduce((sum, targets) => {
    return sum + Object.entries(targets)
      .filter(([k]) => k !== 'external')
      .reduce((s, [, v]) => s + v, 0);
  }, 0);

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/10">
          <span className="text-lg">🗺️</span>
        </div>
        <div>
          <h3 className="font-display text-sm font-bold">Mapa Emocji i Triggerów</h3>
          <p className="text-xs text-muted-foreground">Co wywołuje emocje u kogo</p>
        </div>
      </div>

      {/* Trigger Responsibility per person */}
      {totalInterpersonal > 0 && (
        <div className="mb-5 flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
            Odpowiedzialność emocjonalna
          </p>
          {participants
            .filter(p => result.emotionalResponsibility?.[p] !== undefined)
            .map(name => {
              const pct = Math.round((result.emotionalResponsibility[name] ?? 0) * 100);
              const color = getPersonColor(name);
              return (
                <div key={name} className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="w-24 truncate text-xs text-white">{name}</span>
                  <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono text-[10px] text-muted-foreground">
                    {pct}%
                  </span>
                </div>
              );
            })}
        </div>
      )}

      {/* Dominant trigger summary */}
      {result.dominantTrigger && (
        <div className="mb-4 rounded-lg bg-muted px-3 py-2">
          <p className="text-[11px] text-muted-foreground">{result.dominantTrigger}</p>
        </div>
      )}

      {/* Cause Pairs list */}
      <div className="mb-4">
        <p className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
          Zidentyfikowane pary emocja–przyczyna
        </p>
        <div className="flex flex-col gap-2.5">
          {result.causePairs.slice(0, 6).map((pair, i) => (
            <div
              key={i}
              className="flex gap-2.5 rounded-lg bg-muted/50 p-2.5"
            >
              {/* Emotion icon + holder */}
              <div className="shrink-0 text-center">
                <span className="text-lg">{EMOTION_EMOJIS[pair.emotion] ?? '💭'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: getPersonColor(pair.emotionHolder) }}
                  >
                    {pair.emotionHolder}
                  </span>
                  <span className={`text-[11px] font-medium ${EMOTION_COLORS[pair.emotion] ?? 'text-muted-foreground'}`}>
                    czuje {pair.emotion}
                  </span>
                  {pair.type === 'interpersonal' && (
                    <>
                      <span className="text-[10px] text-muted-foreground">bo</span>
                      <span
                        className="text-[11px] font-medium"
                        style={{ color: getPersonColor(pair.triggerSender) }}
                      >
                        {pair.triggerSender}
                      </span>
                    </>
                  )}
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground leading-relaxed">
                  {pair.trigger}
                </p>
                {pair.snippet && (
                  <p className="mt-0.5 text-[10px] italic text-muted-foreground/60 truncate">
                    &ldquo;{pair.snippet}&rdquo;
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interpretation */}
      {result.interpretation && (
        <div className="mb-4 rounded-lg bg-muted px-3 py-2">
          <p className="text-[11px] text-muted-foreground leading-relaxed">{result.interpretation}</p>
        </div>
      )}

      <PsychDisclaimer
        text="Ekstrakcja przyczyn emocji bazuje na jawnych ekspresyjach emocjonalnych w tekście (Poria et al., 2021). Model nie wnioskuje o ukrytych emocjach. Wyniki zależą od tego, jak otwarcie uczestnicy wyrażali emocje w tej rozmowie."
        citation={`${PSYCH_CITATIONS.poria2021Short}`}
      />
    </div>
  );
}
