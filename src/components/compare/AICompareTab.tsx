'use client';

import { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ComparisonRecord, TraitVariance } from '@/lib/compare';
import {
  TRAIT_DIMENSIONS,
  COMPARISON_COLORS,
  mean,
  stddev,
  cv,
  range,
  classifyStability,
} from '@/lib/compare';

interface Props {
  records: ComparisonRecord[];
  selfName: string;
}

// ── Shared: Collapsible Section ──

function Section({
  title,
  icon,
  children,
  defaultOpen = true,
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
        <span className="flex-1 font-display text-sm font-semibold">{title}</span>
        <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="border-t border-border px-4 pb-4 pt-3">{children}</div>}
    </div>
  );
}

// ── Shared: Score Ring ──

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
        fill="#fafafa" fontSize={size * 0.22} fontWeight="bold" fontFamily="monospace">
        {Math.round(score)}
      </text>
    </svg>
  );
}

// ── Shared: Health Bar ──

function HealthBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? '#10b981' : value >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/[0.03]">
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="w-8 shrink-0 text-right font-mono text-xs text-muted-foreground">{Math.round(value)}</span>
    </div>
  );
}

// ── Shared: Trait Slider ──

function TraitSlider({
  label, selfVal, partnerVal, color,
}: {
  label: string; selfVal: number | null; partnerVal: number | null; color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="relative h-4 flex-1 rounded-full bg-white/[0.03]">
        {selfVal != null && (
          <div
            className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full border-2 border-background"
            style={{ left: `${((selfVal - 1) / 9) * 100}%`, backgroundColor: '#3b82f6' }}
            title={`${selfVal.toFixed(1)}`}
          />
        )}
        {partnerVal != null && (
          <div
            className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full border-2 border-background"
            style={{ left: `${((partnerVal - 1) / 9) * 100}%`, backgroundColor: color }}
            title={`${partnerVal.toFixed(1)}`}
          />
        )}
      </div>
      <div className="flex w-16 shrink-0 gap-1 text-right font-mono text-xs">
        <span className="text-primary">{selfVal?.toFixed(1) ?? '—'}</span>
        <span className="text-muted-foreground">/</span>
        <span style={{ color }}>{partnerVal?.toFixed(1) ?? '—'}</span>
      </div>
    </div>
  );
}

// ── Main Component ──

export default function AICompareTab({ records, selfName }: Props) {
  const aiRecords = useMemo(
    () => records.filter((r) => r.hasAI),
    [records],
  );

  const traitRecords = useMemo(
    () => aiRecords.filter((r) => r.selfAI.bigFive),
    [aiRecords],
  );

  // Health records
  const healthRecords = useMemo(
    () => records.filter((r) => r.relationshipAI.healthScore || r.relationship.viralScores),
    [records],
  );

  // Variance (only for traits with interesting variance)
  const variances: TraitVariance[] = useMemo(() => {
    if (traitRecords.length < 3) return [];
    return TRAIT_DIMENSIONS.map((trait) => {
      const values = traitRecords
        .map((r) => trait.extractSelf(r.selfAI))
        .filter((v): v is number => v != null);
      if (values.length < 3) {
        return {
          key: trait.key, label: trait.label, category: trait.category, values,
          mean: mean(values), stdDev: stddev(values), range: range(values),
          cv: cv(values), stability: 'moderate' as const,
        };
      }
      const c2 = cv(values);
      return {
        key: trait.key, label: trait.label, category: trait.category, values,
        mean: mean(values), stdDev: stddev(values), range: range(values),
        cv: c2, stability: classifyStability(c2),
      };
    }).filter((v) => v.cv > 10); // only interesting variance
  }, [traitRecords]);

  if (aiRecords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
        <p className="text-sm text-muted-foreground">
          Uruchom analizę AI w co najmniej jednej rozmowie, aby zobaczyć porównanie AI.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {aiRecords.length}/{records.length} analiz z danymi AI
      </p>

      {/* ── 1. Tone & Dynamics (Pass1) ── */}
      <Section title="Dynamika Tonu" icon="🎭" defaultOpen>
        <div className="space-y-3">
          {aiRecords.map((r, i) => {
            const color = COMPARISON_COLORS[records.indexOf(r) % COMPARISON_COLORS.length];
            const pass1 = r.relationshipAI.pass1;
            const selfTone = pass1?.tone_per_person?.[selfName];
            const dynamic = pass1?.overall_dynamic;
            const relType = pass1?.relationship_type;

            return (
              <div key={r.analysisId} className="flex items-start gap-3 rounded-lg border border-border/50 bg-white/[0.02] p-3">
                <span className="mt-0.5 inline-block size-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm font-semibold">{r.partnerName}</span>
                    {relType && (
                      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-muted-foreground">
                        {relType.category}
                      </span>
                    )}
                    {dynamic && (
                      <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        dynamic.trajectory === 'warming' ? 'bg-[#10b981]/10 text-[#10b981]'
                        : dynamic.trajectory === 'cooling' ? 'bg-[#ef4444]/10 text-[#ef4444]'
                        : dynamic.trajectory === 'volatile' ? 'bg-[#f59e0b]/10 text-[#f59e0b]'
                        : 'bg-white/[0.06] text-muted-foreground'
                      }`}>
                        {dynamic.trajectory === 'warming' ? '↗ ocieplenie'
                        : dynamic.trajectory === 'cooling' ? '↘ ochłodzenie'
                        : dynamic.trajectory === 'volatile' ? '↕ zmienność'
                        : '→ stabilna'}
                      </span>
                    )}
                  </div>
                  {selfTone && (
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>Ton: <span className="text-foreground/80">{selfTone.primary_tone}</span></span>
                      <span>Ciepło: <span className="font-mono text-foreground/80">{selfTone.warmth}/10</span></span>
                      <span>Humor: <span className="text-foreground/80">{selfTone.humor_style === 'absent' ? 'brak' : selfTone.humor_style}</span></span>
                      <span>Formalność: <span className="font-mono text-foreground/80">{selfTone.formality_level}/10</span></span>
                    </div>
                  )}
                  {!pass1 && (
                    <p className="text-xs text-muted-foreground/60">Brak danych Pass 1</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── 2. Health Scores ── */}
      {healthRecords.length > 0 && (
        <Section title="Zdrowie Relacji" icon="❤️" defaultOpen>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {healthRecords.map((r) => {
              const color = COMPARISON_COLORS[records.indexOf(r) % COMPARISON_COLORS.length];
              const hs = r.relationshipAI.healthScore;
              const vs = r.relationship.viralScores;
              const score = hs?.overall ?? vs?.compatibilityScore ?? 0;
              const components = hs?.components;

              return (
                <div key={r.analysisId} className="rounded-lg border border-border/50 bg-white/[0.02] p-3">
                  <div className="flex items-center gap-3">
                    <ScoreRing score={score} color={color} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold" style={{ color }}>{r.partnerName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {hs ? 'Health Score (AI)' : 'Kompatybilność'}
                      </p>
                    </div>
                  </div>
                  {components && (
                    <div className="mt-3 space-y-1.5">
                      <HealthBar label="Balance" value={components.balance} />
                      <HealthBar label="Wzajemność" value={components.reciprocity} />
                      <HealthBar label="Odpowiedzi" value={components.response_pattern} />
                      <HealthBar label="Bezpieczeństwo" value={components.emotional_safety} />
                      <HealthBar label="Rozwój" value={components.growth_trajectory} />
                    </div>
                  )}
                  {!components && vs && (
                    <div className="mt-3 space-y-1.5">
                      <HealthBar label="Kompatybilność" value={vs.compatibilityScore} />
                      {r.relationship.reciprocityIndex && (
                        <HealthBar label="Wzajemność" value={r.relationship.reciprocityIndex.overall} />
                      )}
                      <HealthBar label="Równowaga" value={100 - vs.delusionScore} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── 3. Power Dynamics (Pass2) ── */}
      {aiRecords.some((r) => r.relationshipAI.powerDynamics) && (
        <Section title="Dynamika Władzy" icon="⚖️" defaultOpen={false}>
          <div className="space-y-3">
            {aiRecords.map((r, i) => {
              const color = COMPARISON_COLORS[records.indexOf(r) % COMPARISON_COLORS.length];
              const pd = r.relationshipAI.powerDynamics;
              if (!pd) return null;

              const score = pd.balance_score;
              const absScore = Math.abs(score);
              const barColor = absScore < 20 ? '#10b981' : absScore < 50 ? '#f59e0b' : '#ef4444';
              const leftWidth = 50 + (score / 2);

              return (
                <div key={r.analysisId} className="rounded-lg border border-border/50 bg-white/[0.02] p-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-block size-3 rounded-full" style={{ backgroundColor: color }} />
                    <span className="font-display text-sm font-semibold">{r.partnerName}</span>
                    <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium`} style={{ color: barColor, backgroundColor: `${barColor}15` }}>
                      {absScore < 20 ? 'Zbalansowana' : absScore < 50 ? 'Lekka asymetria' : 'Silna asymetria'}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="w-16 text-right">{selfName}</span>
                      <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-white/[0.03]">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{ width: `${leftWidth}%`, backgroundColor: barColor, opacity: 0.5 }}
                        />
                        <div className="absolute inset-y-0 left-1/2 w-px bg-white/20" />
                      </div>
                      <span className="w-16">{r.partnerName}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Adaptuje się bardziej: <span className="text-foreground/80">{pd.who_adapts_more}</span>
                      <span className="ml-2 text-muted-foreground/60">({pd.adaptation_type})</span>
                    </p>
                  </div>
                </div>
              );
            }).filter(Boolean)}
          </div>
        </Section>
      )}

      {/* ── 4. Red/Green Flags ── */}
      {aiRecords.some((r) => r.relationshipAI.redFlags.length > 0 || r.relationshipAI.greenFlags.length > 0) && (
        <Section title="Flagi" icon="🚩" defaultOpen={false}>
          <div className="space-y-3">
            {aiRecords.map((r) => {
              const color = COMPARISON_COLORS[records.indexOf(r) % COMPARISON_COLORS.length];
              const { redFlags, greenFlags } = r.relationshipAI;
              if (redFlags.length === 0 && greenFlags.length === 0) return null;

              return (
                <div key={r.analysisId} className="rounded-lg border border-border/50 bg-white/[0.02] p-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-block size-3 rounded-full" style={{ backgroundColor: color }} />
                    <span className="font-display text-sm font-semibold">{r.partnerName}</span>
                    <div className="ml-auto flex gap-2 text-xs">
                      {greenFlags.length > 0 && <span className="text-[#10b981]">🟢 {greenFlags.length}</span>}
                      {redFlags.length > 0 && <span className="text-[#ef4444]">🔴 {redFlags.length}</span>}
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    {greenFlags.slice(0, 3).map((f, fi) => (
                      <div key={`g${fi}`} className="rounded-md bg-[#10b981]/[0.04] px-2 py-1 text-xs text-muted-foreground">
                        <span className="text-[#10b981]">+</span> {f.pattern}
                      </div>
                    ))}
                    {redFlags.slice(0, 3).map((f, fi) => (
                      <div key={`r${fi}`} className={`rounded-md px-2 py-1 text-xs text-muted-foreground ${
                        f.severity === 'severe' ? 'bg-[#ef4444]/[0.08]'
                        : f.severity === 'moderate' ? 'bg-[#f59e0b]/[0.06]'
                        : 'bg-white/[0.02]'
                      }`}>
                        <span className="text-[#ef4444]">−</span> {f.pattern}
                        {f.severity && (
                          <span className={`ml-1 text-[10px] ${
                            f.severity === 'severe' ? 'text-[#ef4444]' : f.severity === 'moderate' ? 'text-[#f59e0b]' : 'text-muted-foreground/60'
                          }`}>
                            ({f.severity})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            }).filter(Boolean)}
          </div>
        </Section>
      )}

      {/* ── 5. Trait Sliders (Big Five + EQ + Comm) ── */}
      {traitRecords.length > 0 && (
        <Section title="Cechy Psychologiczne" icon="🧬" defaultOpen={false}>
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block size-2.5 rounded-full bg-primary" /> {selfName}
            <span className="ml-2 inline-block size-2.5 rounded-full bg-[#a855f7]" /> Partner
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {traitRecords.map((r) => {
              const color = COMPARISON_COLORS[records.indexOf(r) % COMPARISON_COLORS.length];
              return (
                <div key={r.analysisId} className="rounded-lg border border-border/50 bg-white/[0.02] p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="inline-block size-3 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-sm font-semibold">{r.partnerName}</span>
                    {r.selfAI.mbti && r.partnerAI.mbti && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {r.selfAI.mbti.type} ↔ {r.partnerAI.mbti.type}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {TRAIT_DIMENSIONS.map((trait) => (
                      <TraitSlider
                        key={trait.key}
                        label={trait.label}
                        selfVal={trait.extractSelf(r.selfAI)}
                        partnerVal={trait.extractPartner(r.partnerAI)}
                        color={color}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── 6. MBTI + Attachment Grid ── */}
      {traitRecords.some((r) => r.selfAI.mbti || r.partnerAI.attachment) && (
        <Section title="MBTI i Przywiązanie" icon="🔗" defaultOpen={false}>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* MBTI Grid */}
            <div>
              <h4 className="mb-2 text-xs font-medium text-muted-foreground">Typy MBTI</h4>
              <div className="space-y-1.5">
                {traitRecords.map((r) => {
                  const color = COMPARISON_COLORS[records.indexOf(r) % COMPARISON_COLORS.length];
                  return (
                    <div key={r.analysisId} className="flex items-center gap-2">
                      <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="w-24 truncate text-xs">{r.partnerName}</span>
                      <span className="font-mono text-xs text-primary">{r.selfAI.mbti?.type ?? '—'}</span>
                      <span className="text-xs text-muted-foreground">↔</span>
                      <span className="font-mono text-xs" style={{ color }}>{r.partnerAI.mbti?.type ?? '—'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Attachment Distribution */}
            <div>
              <h4 className="mb-2 text-xs font-medium text-muted-foreground">Style Przywiązania Partnerów</h4>
              <div className="space-y-1.5">
                {traitRecords.map((r) => {
                  const color = COMPARISON_COLORS[records.indexOf(r) % COMPARISON_COLORS.length];
                  const style = r.partnerAI.attachment?.primary_style?.replace('_', ' ') ?? '—';
                  return (
                    <div key={r.analysisId} className="flex items-center gap-2">
                      <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="w-24 truncate text-xs">{r.partnerName}</span>
                      <span className="text-xs text-foreground/80">{style}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* ── 7. Predictions ── */}
      {aiRecords.some((r) => r.relationshipAI.predictions.length > 0) && (
        <Section title="Prognozy AI" icon="🔮" defaultOpen={false}>
          <div className="space-y-3">
            {aiRecords.map((r) => {
              const color = COMPARISON_COLORS[records.indexOf(r) % COMPARISON_COLORS.length];
              if (r.relationshipAI.predictions.length === 0) return null;

              return (
                <div key={r.analysisId} className="rounded-lg border border-border/50 bg-white/[0.02] p-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-block size-3 rounded-full" style={{ backgroundColor: color }} />
                    <span className="font-display text-sm font-semibold">{r.partnerName}</span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {r.relationshipAI.predictions.slice(0, 3).map((pred, pi) => (
                      <div key={pi} className="flex items-start gap-2">
                        <div className="mt-1 h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-white/[0.03]">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${pred.confidence}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {pred.prediction}
                          <span className="ml-1 font-mono text-primary">({pred.confidence}%)</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }).filter(Boolean)}
          </div>
        </Section>
      )}

      {/* ── 8. Self-Variance (requires ≥3 AI records) ── */}
      {/* Section order: Tone → Health → Power → Flags → Traits → MBTI → Predictions → Variance */}
      {variances.length > 0 && (
        <Section title="Wariacje Cech" icon="🔀" defaultOpen={false}>
          <p className="mb-3 text-xs text-muted-foreground">
            Jak zmienia się profil {selfName} w {traitRecords.length} różnych relacjach
            {' '}(cechy z CV {'>'} 10%)
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {variances.map((v) => {
              const stabilityColor =
                v.stability === 'stable' ? 'text-[#10b981] bg-[#10b981]/10'
                : v.stability === 'moderate' ? 'text-[#f59e0b] bg-[#f59e0b]/10'
                : 'text-[#ef4444] bg-[#ef4444]/10';
              const stabilityLabel =
                v.stability === 'stable' ? 'Stabilna'
                : v.stability === 'moderate' ? 'Umiarkowana'
                : 'Zmienna';
              const barWidth = Math.min(100, v.cv * 2);
              const barColor = v.stability === 'stable' ? '#10b981' : v.stability === 'moderate' ? '#f59e0b' : '#ef4444';

              return (
                <div key={v.key} className="rounded-lg border border-border/50 bg-white/[0.02] p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{v.label}</span>
                    <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${stabilityColor}`}>
                      {stabilityLabel}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>σ = {v.stdDev.toFixed(2)}</span>
                      <span>CV = {v.cv.toFixed(0)}%</span>
                    </div>
                    <div className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.03]">
                      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${barWidth}%`, backgroundColor: barColor }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">Śr: <span className="font-mono text-foreground">{v.mean.toFixed(1)}</span></span>
                      <span className="text-muted-foreground">Zakres: <span className="font-mono">{v.range[0].toFixed(1)}–{v.range[1].toFixed(1)}</span></span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    {v.values.map((val, vi) => (
                      <div
                        key={vi}
                        className="size-2 rounded-full"
                        style={{ backgroundColor: COMPARISON_COLORS[vi % COMPARISON_COLORS.length] }}
                        title={`${traitRecords[vi]?.partnerName}: ${val.toFixed(1)}`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}
