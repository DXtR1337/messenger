'use client';

import { useState } from 'react';
import type { PersonProfile } from '@/lib/analysis/types';

interface PersonalityDeepDiveProps {
    profiles: Record<string, PersonProfile>;
    participants: string[];
}

function ScoreBar({
    label,
    score,
    maxScore = 10,
    colorClass = 'bg-accent',
}: {
    label: string;
    score: number;
    maxScore?: number;
    colorClass?: string;
}) {
    const pct = Math.min(100, (score / maxScore) * 100);
    return (
        <div className="flex items-center gap-2.5">
            <span className="w-[130px] truncate text-[0.78rem] text-[#888]">{label}</span>
            <div className="flex h-2 flex-1 overflow-hidden rounded-sm bg-[#0a0a0a]">
                <div
                    className={`${colorClass} transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="w-8 text-right font-display text-[0.78rem] text-white">
                {score.toFixed(1)}
            </span>
        </div>
    );
}

function SeverityBadge({ severity }: { severity: string }) {
    const colors: Record<string, string> = {
        none: 'bg-[#10b981]/10 text-[#10b981]',
        mild: 'bg-[#f59e0b]/10 text-[#f59e0b]',
        moderate: 'bg-[#f97316]/10 text-[#f97316]',
        significant: 'bg-[#ef4444]/10 text-[#ef4444]',
        severe: 'bg-[#ef4444]/10 text-[#ef4444]',
    };
    return (
        <span className={`rounded-full px-2.5 py-0.5 text-[0.68rem] font-medium ${colors[severity] ?? 'bg-[#1a1a1a] text-[#888]'}`}>
            {severity}
        </span>
    );
}

function StyleBadge({ label }: { label: string }) {
    return (
        <span className="rounded-md bg-accent/10 px-2.5 py-1 text-[0.72rem] font-medium text-accent">
            {label.replace(/_/g, ' ')}
        </span>
    );
}

function PersonTab({
    profile,
    name,
    colorClass,
}: {
    profile: PersonProfile;
    name: string;
    colorClass: string;
}) {
    const { big_five_approximation: bf, attachment_indicators: ai, communication_profile: cp, emotional_patterns: ep, clinical_observations: co, conflict_resolution: cr, emotional_intelligence: ei } = profile;

    // Big Five mid-point scores
    const bfScores = [
        { label: 'Otwartość', score: (bf.openness.range[0] + bf.openness.range[1]) / 2 },
        { label: 'Sumienność', score: (bf.conscientiousness.range[0] + bf.conscientiousness.range[1]) / 2 },
        { label: 'Ekstrawersja', score: (bf.extraversion.range[0] + bf.extraversion.range[1]) / 2 },
        { label: 'Ugodowość', score: (bf.agreeableness.range[0] + bf.agreeableness.range[1]) / 2 },
        { label: 'Neurotyczność', score: (bf.neuroticism.range[0] + bf.neuroticism.range[1]) / 2 },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2">
            {/* Big Five */}
            <div className="rounded-xl border border-border bg-[#0a0a0a] p-4">
                <h4 className="mb-3 font-display text-[0.82rem] font-bold">Big Five</h4>
                <div className="flex flex-col gap-2.5">
                    {bfScores.map(s => (
                        <ScoreBar key={s.label} label={s.label} score={s.score} colorClass={colorClass} />
                    ))}
                </div>
            </div>

            {/* Emotional Intelligence */}
            {ei && (
                <div className="rounded-xl border border-border bg-[#0a0a0a] p-4">
                    <h4 className="mb-3 font-display text-[0.82rem] font-bold">
                        Inteligencja emocjonalna
                        <span className="ml-2 font-normal text-[#555]">{ei.overall}/10</span>
                    </h4>
                    <div className="flex flex-col gap-2.5">
                        <ScoreBar label="Empatia" score={ei.empathy.score} colorClass={colorClass} />
                        <ScoreBar label="Samoświadomość" score={ei.self_awareness.score} colorClass={colorClass} />
                        <ScoreBar label="Regulacja emocji" score={ei.emotional_regulation.score} colorClass={colorClass} />
                        <ScoreBar label="Umiejętności społ." score={ei.social_skills.score} colorClass={colorClass} />
                    </div>
                </div>
            )}

            {/* Attachment Style */}
            <div className="rounded-xl border border-border bg-[#0a0a0a] p-4">
                <h4 className="mb-2 font-display text-[0.82rem] font-bold">Styl przywiązania</h4>
                <div className="mb-3">
                    <StyleBadge label={ai.primary_style} />
                    <span className="ml-2 text-[0.68rem] text-[#555]">
                        pewność: {ai.confidence}%
                    </span>
                </div>
                <div className="flex flex-col gap-1.5">
                    {ai.indicators.slice(0, 3).map((ind, i) => (
                        <p key={i} className="text-[0.72rem] text-[#888] leading-relaxed">
                            <span className="text-white">•</span> {ind.behavior}
                        </p>
                    ))}
                </div>
            </div>

            {/* Conflict Resolution */}
            {cr && (
                <div className="rounded-xl border border-border bg-[#0a0a0a] p-4">
                    <h4 className="mb-2 font-display text-[0.82rem] font-bold">Styl konfliktowy</h4>
                    <div className="mb-3 flex flex-wrap gap-2">
                        <StyleBadge label={cr.primary_style} />
                        <span className="rounded-md bg-[#1a1a1a] px-2.5 py-1 text-[0.72rem] text-[#888]">
                            powrót: {cr.recovery_speed.replace(/_/g, ' ')}
                        </span>
                    </div>
                    <ScoreBar label="De-eskalacja" score={cr.de_escalation_skills} colorClass={colorClass} />
                    {cr.triggers.length > 0 && (
                        <div className="mt-3">
                            <p className="text-[0.68rem] font-medium text-[#555]">Triggery:</p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                                {cr.triggers.slice(0, 4).map((t, i) => (
                                    <span key={i} className="rounded-md bg-[#161616] px-2 py-0.5 text-[0.68rem] text-[#888]">
                                        {t}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Communication Profile */}
            <div className="rounded-xl border border-border bg-[#0a0a0a] p-4">
                <h4 className="mb-3 font-display text-[0.82rem] font-bold">Profil komunikacyjny</h4>
                <div className="flex flex-col gap-2.5">
                    <ScoreBar label="Asertywność" score={cp.assertiveness} colorClass={colorClass} />
                    <ScoreBar label="Ekspresja emocji" score={cp.emotional_expressiveness} colorClass={colorClass} />
                    <ScoreBar label="Głębokość ujawn." score={cp.self_disclosure_depth} colorClass={colorClass} />
                </div>
                {cp.verbal_tics.length > 0 && (
                    <div className="mt-3">
                        <p className="text-[0.68rem] font-medium text-[#555]">Verbal tics:</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                            {cp.verbal_tics.slice(0, 5).map((tic, i) => (
                                <span key={i} className="rounded-md bg-[#161616] px-2 py-0.5 text-[0.68rem] text-accent/70">
                                    &ldquo;{tic}&rdquo;
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Emotional Patterns */}
            <div className="rounded-xl border border-border bg-[#0a0a0a] p-4">
                <h4 className="mb-2 font-display text-[0.82rem] font-bold">Wzorce emocjonalne</h4>
                <ScoreBar label="Zakres emocji" score={ep.emotional_range} colorClass={colorClass} />
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {ep.dominant_emotions.map((e, i) => (
                        <span key={i} className="rounded-md bg-[#161616] px-2.5 py-1 text-[0.72rem] text-white">
                            {e}
                        </span>
                    ))}
                </div>
                {ep.coping_mechanisms_visible.length > 0 && (
                    <div className="mt-3">
                        <p className="text-[0.68rem] font-medium text-[#555]">Mechanizmy obronne:</p>
                        {ep.coping_mechanisms_visible.slice(0, 3).map((c, i) => (
                            <p key={i} className="mt-1 text-[0.72rem] text-[#888]">• {c}</p>
                        ))}
                    </div>
                )}
            </div>

            {/* Clinical Observations — full width */}
            {co && (
                <div className="col-span-full rounded-xl border border-[#2a1a1a] bg-[#0a0a0a] p-4">
                    <h4 className="mb-3 font-display text-[0.82rem] font-bold">
                        Obserwacje kliniczne
                        <span className="ml-2 text-[0.68rem] font-normal text-[#ef4444]/60">⚠ nie diagnoza</span>
                    </h4>

                    <div className="grid gap-3 md:grid-cols-3">
                        {/* Anxiety */}
                        <div className="rounded-lg bg-[#111] p-3">
                            <div className="mb-1.5 flex items-center justify-between">
                                <span className="text-[0.72rem] font-medium">Lęk</span>
                                <SeverityBadge severity={co.anxiety_markers.severity} />
                            </div>
                            {co.anxiety_markers.patterns.slice(0, 2).map((p, i) => (
                                <p key={i} className="text-[0.68rem] text-[#888]">• {p}</p>
                            ))}
                        </div>

                        {/* Avoidance */}
                        <div className="rounded-lg bg-[#111] p-3">
                            <div className="mb-1.5 flex items-center justify-between">
                                <span className="text-[0.72rem] font-medium">Unikanie</span>
                                <SeverityBadge severity={co.avoidance_markers.severity} />
                            </div>
                            {co.avoidance_markers.patterns.slice(0, 2).map((p, i) => (
                                <p key={i} className="text-[0.68rem] text-[#888]">• {p}</p>
                            ))}
                        </div>

                        {/* Manipulation */}
                        <div className="rounded-lg bg-[#111] p-3">
                            <div className="mb-1.5 flex items-center justify-between">
                                <span className="text-[0.72rem] font-medium">Manipulacja</span>
                                <SeverityBadge severity={co.manipulation_patterns.severity} />
                            </div>
                            {co.manipulation_patterns.types.slice(0, 2).map((t, i) => (
                                <p key={i} className="text-[0.68rem] text-[#888]">• {t}</p>
                            ))}
                        </div>
                    </div>

                    <p className="mt-3 text-[0.62rem] italic text-[#444]">
                        {co.disclaimer}
                    </p>
                </div>
            )}
        </div>
    );
}

export default function PersonalityDeepDive({
    profiles,
    participants,
}: PersonalityDeepDiveProps) {
    const [activeIdx, setActiveIdx] = useState(0);
    const colors = ['bg-chart-a', 'bg-chart-b'];

    const availableParticipants = participants.filter(p => profiles[p]);

    if (availableParticipants.length === 0) return null;

    const activeName = availableParticipants[activeIdx] ?? availableParticipants[0];
    const activeProfile = profiles[activeName];

    return (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
            {/* Header + person tabs */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
                <div>
                    <h3 className="font-display text-[0.93rem] font-bold">Pełen profil psychologiczny</h3>
                    <p className="mt-0.5 text-[0.72rem] text-[#555]">
                        Big Five, styl przywiązania, inteligencja emocjonalna, obserwacje kliniczne
                    </p>
                </div>
                <div className="flex gap-1 rounded-lg bg-[#0a0a0a] p-0.5">
                    {availableParticipants.map((name, idx) => (
                        <button
                            key={name}
                            onClick={() => setActiveIdx(idx)}
                            className={`rounded-md px-3 py-1.5 text-[0.72rem] font-medium transition-colors ${activeIdx === idx
                                    ? 'bg-[#1a1a1a] text-white'
                                    : 'text-[#555] hover:text-[#888]'
                                }`}
                        >
                            <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${colors[idx] ?? 'bg-[#555]'}`} />
                            {name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="p-5">
                {activeProfile && (
                    <PersonTab
                        profile={activeProfile}
                        name={activeName}
                        colorClass={colors[activeIdx] ?? 'bg-accent'}
                    />
                )}
            </div>
        </div>
    );
}
