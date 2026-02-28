'use client';

import { useState, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import type { PersonProfile } from '@/lib/analysis/types';
import PsychDisclaimer from '@/components/shared/PsychDisclaimer';
import { PSYCH_CITATIONS } from '@/lib/analysis/citations';

interface PersonalityDeepDiveProps {
    profiles: Record<string, PersonProfile>;
    participants: string[];
}

/* ── Animated score bar ── */
function ScoreBar({
    label,
    score,
    low,
    high,
    maxScore = 10,
    colorClass = 'bg-accent',
    delay = 0,
    animate = false,
}: {
    label: string;
    score?: number;
    low?: number;
    high?: number;
    maxScore?: number;
    colorClass?: string;
    delay?: number;
    animate?: boolean;
}) {
    // Range mode (Big Five) vs single-score mode
    if (low !== undefined && high !== undefined) {
        const lowPct = Math.min(100, (low / maxScore) * 100);
        const highPct = Math.min(100, (high / maxScore) * 100);
        return (
            <div className="flex items-center gap-2.5">
                <span className="w-[130px] truncate text-[13px] text-muted-foreground">{label}</span>
                <div className="relative flex h-2 flex-1 overflow-hidden rounded-sm bg-muted">
                    <motion.div
                        className={`${colorClass} absolute inset-y-0 rounded-sm`}
                        initial={animate ? { left: `${lowPct}%`, width: '0%' } : undefined}
                        animate={{ left: `${lowPct}%`, width: `${highPct - lowPct}%` }}
                        transition={animate ? { duration: 0.8, delay: delay, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
                    />
                </div>
                <motion.span
                    className="w-12 text-right font-display text-[13px] text-white"
                    initial={animate ? { opacity: 0 } : undefined}
                    animate={{ opacity: 1 }}
                    transition={animate ? { duration: 0.4, delay: delay + 0.5 } : { duration: 0 }}
                >
                    {low}–{high}
                </motion.span>
            </div>
        );
    }

    const pct = Math.min(100, ((score ?? 0) / maxScore) * 100);
    return (
        <div className="flex items-center gap-2.5">
            <span className="w-[130px] truncate text-[13px] text-muted-foreground">{label}</span>
            <div className="flex h-2 flex-1 overflow-hidden rounded-sm bg-muted">
                <motion.div
                    className={`${colorClass} rounded-sm`}
                    initial={animate ? { width: '0%' } : undefined}
                    animate={{ width: `${pct}%` }}
                    transition={animate ? { duration: 0.8, delay: delay, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
                />
            </div>
            <motion.span
                className="w-8 text-right font-display text-[13px] text-white"
                initial={animate ? { opacity: 0 } : undefined}
                animate={{ opacity: 1 }}
                transition={animate ? { duration: 0.4, delay: delay + 0.5 } : { duration: 0 }}
            >
                {(score ?? 0).toFixed(1)}
            </motion.span>
        </div>
    );
}

/* ── Frequency badge ── */
function FrequencyBadge({ value }: { value?: string }) {
    const colors: Record<string, string> = {
        not_observed: 'bg-violet-500/10 text-violet-400',
        occasional: 'bg-purple-500/10 text-purple-400',
        recurring: 'bg-fuchsia-500/10 text-fuchsia-400',
        pervasive: 'bg-fuchsia-400/10 text-fuchsia-300',
        // Legacy backward compat
        none: 'bg-violet-500/10 text-violet-400',
        mild: 'bg-purple-500/10 text-purple-400',
        moderate: 'bg-fuchsia-500/10 text-fuchsia-400',
        significant: 'bg-fuchsia-400/10 text-fuchsia-300',
        severe: 'bg-fuchsia-400/10 text-fuchsia-300',
    };
    const labels: Record<string, string> = {
        not_observed: 'nie zaobserwowano',
        occasional: 'sporadyczne',
        recurring: 'powracające',
        pervasive: 'wszechobecne',
        // Legacy backward compat
        none: 'nie zaobserwowano',
        mild: 'sporadyczne',
        moderate: 'powracające',
        significant: 'wszechobecne',
        severe: 'wszechobecne',
    };
    const key = value ?? 'not_observed';
    return (
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[key] ?? 'bg-secondary text-muted-foreground'}`}>
            {labels[key] ?? key}
        </span>
    );
}

function StyleBadge({ label }: { label: string }) {
    return (
        <span className="rounded-md bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
            {label.replace(/_/g, ' ')}
        </span>
    );
}

/* ── Stagger card wrapper ── */
function StaggerCard({
    children,
    index,
    isInView,
    className = '',
}: {
    children: React.ReactNode;
    index: number;
    isInView: boolean;
    className?: string;
}) {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{
                duration: 0.5,
                delay: 0.15 + index * 0.08,
                ease: [0.22, 1, 0.36, 1],
            }}
        >
            {children}
        </motion.div>
    );
}

/* ── MBTI dimension letter with evidence ── */
const MBTI_DIM_COLORS: Record<string, string> = {
    E: 'from-fuchsia-500/20 to-fuchsia-600/5',
    I: 'from-indigo-500/20 to-indigo-600/5',
    S: 'from-violet-500/20 to-violet-600/5',
    N: 'from-purple-500/20 to-purple-600/5',
    T: 'from-indigo-400/20 to-indigo-500/5',
    F: 'from-fuchsia-400/20 to-fuchsia-500/5',
    J: 'from-purple-400/20 to-purple-500/5',
    P: 'from-violet-400/20 to-violet-500/5',
};

function PersonTab({
    profile,
    name,
    colorClass,
}: {
    profile: PersonProfile;
    name: string;
    colorClass: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: '-60px' });

    const { big_five_approximation: bf, attachment_indicators: ai, communication_profile: cp, emotional_patterns: ep, clinical_observations: co, conflict_resolution: cr, emotional_intelligence: ei } = profile;

    // Big Five as ranges (not midpoints) — AI returns [low, high] estimates
    const bfTrait = (trait: { score?: number; range?: [number, number] } | undefined) => {
        if (!trait || typeof trait !== 'object') return null;
        if (Array.isArray(trait.range) && trait.range.length === 2 && trait.range[0] > 0 && trait.range[1] > 0) {
            return { low: trait.range[0], high: trait.range[1] };
        }
        const s = trait.score;
        if (typeof s === 'number' && s > 0) {
            return { low: Math.max(1, s - 1), high: Math.min(10, s + 1) };
        }
        return null;
    };
    const bfRaw = bf ? [
        { label: 'Otwartość', data: bfTrait(bf.openness) },
        { label: 'Sumienność', data: bfTrait(bf.conscientiousness) },
        { label: 'Ekstrawersja', data: bfTrait(bf.extraversion) },
        { label: 'Ugodowość', data: bfTrait(bf.agreeableness) },
        { label: 'Neurotyczność', data: bfTrait(bf.neuroticism) },
    ] : [];
    const bfScores = bfRaw.some(s => s.data) ? bfRaw.map(s => ({ label: s.label, ...(s.data ?? { low: 5, high: 5 }) })) : [];

    let cardIdx = 0;

    return (
        <div ref={ref}>
            {/* MBTI Badge */}
            {profile.mbti && (
                <motion.div
                    className="mb-4 flex items-center gap-4 rounded-xl border border-purple-500/[0.06] bg-purple-950/[0.1] p-4"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                    {/* Type badge — letters stagger in */}
                    <div className={`flex size-16 items-center justify-center rounded-xl ${colorClass}/10`}>
                        <span className="font-display text-2xl font-black tracking-tight">
                            {profile.mbti.type.split('').map((letter, i) => (
                                <motion.span
                                    key={i}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                                    transition={{ duration: 0.3, delay: 0.3 + i * 0.08 }}
                                >
                                    {letter}
                                </motion.span>
                            ))}
                        </span>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h4 className="font-display text-sm font-bold">Typ MBTI</h4>
                            <motion.span
                                className="text-xs text-text-muted"
                                initial={{ opacity: 0 }}
                                animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                                transition={{ duration: 0.4, delay: 0.6 }}
                            >
                                pewność: {profile.mbti.confidence}%
                            </motion.span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {(['ie', 'sn', 'tf', 'jp'] as const).map((dim, i) => {
                                const d = profile.mbti!.reasoning[dim];
                                const gradient = MBTI_DIM_COLORS[d.letter] ?? 'from-white/10 to-white/5';
                                return (
                                    <motion.div
                                        key={dim}
                                        className={`min-h-[60px] overflow-hidden rounded-md bg-gradient-to-b ${gradient} px-2 py-1 text-center border border-purple-500/[0.06]`}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                                        transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
                                    >
                                        <span className="font-display text-sm font-bold">{d.letter}</span>
                                        <p className="line-clamp-3 text-[10px] leading-tight text-muted-foreground">{d.evidence}</p>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
            {/* Big Five */}
            {bfScores.length > 0 && (
            <StaggerCard index={cardIdx++} isInView={isInView} className="rounded-xl border border-purple-500/[0.06] bg-purple-950/[0.1] p-4">
                <h4 className="mb-3 font-display text-[13px] font-bold">Big Five</h4>
                <div className="flex flex-col gap-2.5">
                    {bfScores.map((s, i) => (
                        <ScoreBar key={s.label} label={s.label} low={s.low} high={s.high} colorClass={colorClass} animate={isInView} delay={0.3 + i * 0.1} />
                    ))}
                </div>
            </StaggerCard>
            )}

            {/* Emotional Intelligence */}
            {ei && (
                <StaggerCard index={cardIdx++} isInView={isInView} className="rounded-xl border border-purple-500/[0.06] bg-purple-950/[0.1] p-4">
                    <h4 className="mb-3 font-display text-[13px] font-bold">
                        Inteligencja emocjonalna
                        <motion.span
                            className="ml-2 font-mono font-normal text-accent"
                            initial={{ opacity: 0 }}
                            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                            transition={{ duration: 0.5, delay: 0.8 }}
                        >
                            {ei.overall}/10
                        </motion.span>
                    </h4>
                    <div className="flex flex-col gap-2.5">
                        <ScoreBar label="Empatia" score={ei.empathy.score} colorClass={colorClass} animate={isInView} delay={0.3} />
                        <ScoreBar label="Samoświadomość" score={ei.self_awareness.score} colorClass={colorClass} animate={isInView} delay={0.4} />
                        <ScoreBar label="Regulacja emocji" score={ei.emotional_regulation.score} colorClass={colorClass} animate={isInView} delay={0.5} />
                        <ScoreBar label="Umiejętności społ." score={ei.social_skills.score} colorClass={colorClass} animate={isInView} delay={0.6} />
                    </div>
                </StaggerCard>
            )}

            {/* Attachment Style */}
            {ai && (
            <StaggerCard index={cardIdx++} isInView={isInView} className="rounded-xl border border-purple-500/[0.06] bg-purple-950/[0.1] p-4">
                <h4 className="mb-2 font-display text-[13px] font-bold">Styl przywiązania</h4>
                <div className="mb-3">
                    <StyleBadge label={ai.primary_style} />
                    <span className="ml-2 text-xs text-text-muted">
                        pewność: {ai.confidence}%
                    </span>
                </div>
                <div className="flex flex-col gap-1.5">
                    {ai.indicators.slice(0, 3).map((ind, i) => (
                        <motion.p
                            key={i}
                            className="text-xs text-muted-foreground leading-relaxed"
                            initial={{ opacity: 0, x: -8 }}
                            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
                            transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
                        >
                            <span className="text-white">•</span> {ind.behavior}
                        </motion.p>
                    ))}
                </div>
            </StaggerCard>
            )}

            {/* Conflict Resolution */}
            {cr && (
                <StaggerCard index={cardIdx++} isInView={isInView} className="rounded-xl border border-purple-500/[0.06] bg-purple-950/[0.1] p-4">
                    <h4 className="mb-2 font-display text-[13px] font-bold">Styl konfliktowy</h4>
                    <div className="mb-3 flex flex-wrap gap-2">
                        <StyleBadge label={cr.primary_style} />
                        <span className="rounded-md bg-purple-950/[0.15] border border-purple-500/[0.08] px-2.5 py-1 text-xs text-muted-foreground">
                            powrót: {cr.recovery_speed.replace(/_/g, ' ')}
                        </span>
                    </div>
                    <ScoreBar label="De-eskalacja" score={cr.de_escalation_skills} colorClass={colorClass} animate={isInView} delay={0.4} />
                    {cr.triggers.length > 0 && (
                        <div className="mt-3">
                            <p className="text-xs font-medium text-text-muted">Triggery:</p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                                {cr.triggers.slice(0, 4).map((t, i) => (
                                    <motion.span
                                        key={i}
                                        className="rounded-md bg-purple-950/[0.15] border border-purple-500/[0.08] px-2 py-0.5 text-xs text-muted-foreground"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                                        transition={{ duration: 0.3, delay: 0.6 + i * 0.08 }}
                                    >
                                        {t}
                                    </motion.span>
                                ))}
                            </div>
                        </div>
                    )}
                </StaggerCard>
            )}

            {/* Communication Profile */}
            {cp && (
            <StaggerCard index={cardIdx++} isInView={isInView} className="rounded-xl border border-purple-500/[0.06] bg-purple-950/[0.1] p-4">
                <h4 className="mb-3 font-display text-[13px] font-bold">Profil komunikacyjny</h4>
                <div className="flex flex-col gap-2.5">
                    <ScoreBar label="Asertywność" score={cp.assertiveness} colorClass={colorClass} animate={isInView} delay={0.3} />
                    <ScoreBar label="Ekspresja emocji" score={cp.emotional_expressiveness} colorClass={colorClass} animate={isInView} delay={0.4} />
                    <ScoreBar label="Głębokość ujawn." score={cp.self_disclosure_depth} colorClass={colorClass} animate={isInView} delay={0.5} />
                </div>
                {cp.verbal_tics?.length > 0 && (
                    <div className="mt-3">
                        <p className="text-xs font-medium text-text-muted">Nawyki werbalne:</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                            {cp.verbal_tics.slice(0, 5).map((tic, i) => (
                                <motion.span
                                    key={i}
                                    className="rounded-md bg-purple-950/[0.15] border border-purple-500/[0.08] px-2 py-0.5 text-xs text-accent/70"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.3, delay: 0.6 + i * 0.08 }}
                                >
                                    &ldquo;{tic}&rdquo;
                                </motion.span>
                            ))}
                        </div>
                    </div>
                )}
            </StaggerCard>
            )}

            {/* Emotional Patterns */}
            {ep && (
            <StaggerCard index={cardIdx++} isInView={isInView} className="rounded-xl border border-purple-500/[0.06] bg-purple-950/[0.1] p-4">
                <h4 className="mb-2 font-display text-[13px] font-bold">Wzorce emocjonalne</h4>
                <ScoreBar label="Zakres emocji" score={ep.emotional_range} colorClass={colorClass} animate={isInView} delay={0.3} />
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {ep.dominant_emotions.map((e, i) => (
                        <motion.span
                            key={i}
                            className="rounded-md bg-purple-950/[0.15] border border-purple-500/[0.08] px-2.5 py-1 text-xs text-white"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.3, delay: 0.4 + i * 0.06 }}
                        >
                            {e}
                        </motion.span>
                    ))}
                </div>
                {ep.coping_mechanisms_visible?.length > 0 && (
                    <div className="mt-3">
                        <p className="text-xs font-medium text-text-muted">Mechanizmy obronne:</p>
                        {ep.coping_mechanisms_visible.slice(0, 3).map((c, i) => (
                            <motion.p
                                key={i}
                                className="mt-1 text-xs text-muted-foreground"
                                initial={{ opacity: 0, x: -8 }}
                                animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
                                transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
                            >
                                • {c}
                            </motion.p>
                        ))}
                    </div>
                )}
            </StaggerCard>
            )}

            {/* Clinical Observations — full width */}
            {co && (
                <StaggerCard index={cardIdx++} isInView={isInView} className="col-span-full rounded-xl border border-fuchsia-500/20 bg-fuchsia-950/[0.08] p-4">
                    <h4 className="mb-3 font-display text-[13px] font-bold">
                        Obserwacje kliniczne
                        <span className="ml-2 text-xs font-normal text-fuchsia-400/60">⚠ nie diagnoza</span>
                    </h4>

                    <div className="grid gap-3 md:grid-cols-3">
                        {/* Anxiety */}
                        <motion.div
                            className="rounded-lg bg-purple-950/[0.1] border border-purple-500/[0.06] p-3"
                            initial={{ opacity: 0, y: 10 }}
                            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                            transition={{ duration: 0.4, delay: 0.5 }}
                        >
                            <div className="mb-1.5 flex items-center justify-between">
                                <span className="text-xs font-medium">Lęk</span>
                                <FrequencyBadge value={co.anxiety_markers.frequency ?? co.anxiety_markers.severity} />
                            </div>
                            {co.anxiety_markers.patterns.slice(0, 2).map((p, i) => (
                                <p key={i} className="text-xs text-muted-foreground">• {p}</p>
                            ))}
                        </motion.div>

                        {/* Avoidance */}
                        <motion.div
                            className="rounded-lg bg-purple-950/[0.1] border border-purple-500/[0.06] p-3"
                            initial={{ opacity: 0, y: 10 }}
                            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                            transition={{ duration: 0.4, delay: 0.6 }}
                        >
                            <div className="mb-1.5 flex items-center justify-between">
                                <span className="text-xs font-medium">Unikanie</span>
                                <FrequencyBadge value={co.avoidance_markers.frequency ?? co.avoidance_markers.severity} />
                            </div>
                            {co.avoidance_markers.patterns.slice(0, 2).map((p, i) => (
                                <p key={i} className="text-xs text-muted-foreground">• {p}</p>
                            ))}
                        </motion.div>

                        {/* Power Imbalance */}
                        <motion.div
                            className="rounded-lg bg-purple-950/[0.1] border border-purple-500/[0.06] p-3"
                            initial={{ opacity: 0, y: 10 }}
                            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                            transition={{ duration: 0.4, delay: 0.7 }}
                        >
                            <div className="mb-1.5 flex items-center justify-between">
                                <span className="text-xs font-medium">Wpływ i empatia</span>
                                <FrequencyBadge value={co.manipulation_patterns.frequency ?? co.manipulation_patterns.severity} />
                            </div>
                            {co.manipulation_patterns.types.slice(0, 2).map((t, i) => (
                                <p key={i} className="text-xs text-muted-foreground">• {t}</p>
                            ))}
                        </motion.div>
                    </div>

                    <div className="mt-3 flex items-start gap-2 rounded-md bg-purple-500/5 border border-purple-500/10 px-3 py-2">
                        <span className="mt-0.5 text-purple-400">⚠</span>
                        <p className="text-xs leading-relaxed text-purple-200/60">
                            {co.disclaimer}
                        </p>
                    </div>
                </StaggerCard>
            )}
            </div>
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
        <div className="overflow-hidden rounded-xl border border-purple-500/[0.06] bg-purple-950/[0.08]">
            {/* Header + person tabs */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-purple-500/[0.06]">
                <div>
                    <h3 className="font-display text-[15px] font-bold">Profil komunikacyjny</h3>
                    <p className="mt-0.5 text-xs text-text-muted">
                        Big Five, styl przywiązania, inteligencja emocjonalna, wzorce behawioralne
                    </p>
                </div>
                <div className="flex gap-1 rounded-lg bg-purple-950/[0.2] border border-purple-500/[0.08] p-0.5">
                    {availableParticipants.map((name, idx) => (
                        <button
                            key={name}
                            onClick={() => setActiveIdx(idx)}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 ${activeIdx === idx
                                    ? 'bg-purple-950/[0.3] text-white shadow-sm'
                                    : 'text-text-muted hover:text-muted-foreground hover:bg-purple-950/[0.15]'
                                }`}
                        >
                            <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${colors[idx] ?? 'bg-text-muted'}`} />
                            {name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content with crossfade */}
            <div className="p-5">
                <AnimatePresence mode="wait">
                    {activeProfile && (
                        <motion.div
                            key={activeName}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <PersonTab
                                profile={activeProfile}
                                name={activeName}
                                colorClass={colors[activeIdx] ?? 'bg-accent'}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
                <PsychDisclaimer
                    text="Profil oparty na analizie tekstu AI (Gemini). Big Five wymaga standaryzowanego kwestionariusza (NEO-PI-R) do wiarygodnej oceny."
                    citation={`${PSYCH_CITATIONS.bigFiveShort}; ${PSYCH_CITATIONS.attachmentShort}`}
                    showGenericFooter
                />
            </div>
        </div>
    );
}
