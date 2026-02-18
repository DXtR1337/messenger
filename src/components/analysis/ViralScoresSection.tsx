'use client';

import { useMemo, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import type { QuantitativeAnalysis } from '@/lib/parsers/types';

interface ViralScoresSectionProps {
  quantitative: QuantitativeAnalysis;
  participants: string[];
}

const PERSON_COLORS = ['#3b82f6', '#a855f7'];

function CompatibilityGauge({ score }: { score: number }) {
  const radius = 54;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80
      ? '#10b981'
      : score >= 60
        ? '#3b82f6'
        : score >= 40
          ? '#f59e0b'
          : '#ef4444';

  const verdict =
    score >= 80
      ? 'Idealne dopasowanie!'
      : score >= 60
        ? 'Dobra kompatybilność'
        : score >= 40
          ? 'Przeciętna kompatybilność'
          : 'Niska kompatybilność';

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg width="128" height="128" viewBox="0 0 128 128">
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-muted"
          />
          <motion.circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
            transform="rotate(-90 64 64)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-3xl font-bold" style={{ color }}>
            {score}
          </span>
        </div>
      </div>
      <span className="text-sm font-medium" style={{ color }}>
        {verdict}
      </span>
    </div>
  );
}

function InterestBars({
  interestScores,
  participants,
}: {
  interestScores: Record<string, number>;
  participants: string[];
}) {
  return (
    <div className="flex flex-col gap-4">
      {participants.map((person, index) => {
        const score = interestScores[person] ?? 0;
        const color = PERSON_COLORS[index % PERSON_COLORS.length];

        return (
          <div key={person} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color }}>
                {person}
              </span>
              <span className="font-mono text-sm font-bold text-foreground">
                {score}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GhostRiskMeter({
  person,
  score,
  factors,
  colorIndex,
}: {
  person: string;
  score: number;
  factors: string[];
  colorIndex: number;
}) {
  const riskColor =
    score < 30 ? '#10b981' : score <= 60 ? '#f59e0b' : '#ef4444';
  const riskLabel =
    score < 30 ? 'niskie' : score <= 60 ? 'srednie' : 'wysokie';
  const personColor = PERSON_COLORS[colorIndex % PERSON_COLORS.length];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: personColor }}>
          {person}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="font-mono text-lg font-bold" style={{ color: riskColor }}>
            {score}
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">({riskLabel})</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: riskColor }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
        />
      </div>
      {factors.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {factors.map((factor) => (
            <span
              key={factor}
              className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              {factor}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function DelusionDisplay({
  score,
  delusionHolder,
}: {
  score: number;
  delusionHolder?: string;
}) {
  const emoji = score < 20 ? '\u{1F9D8}' : score <= 50 ? '\u{1F914}' : '\u{1F921}';
  const label =
    score < 20
      ? 'Realistyczna para'
      : score <= 50
        ? 'Lekka deluzja'
        : 'Pełna deluzja';
  const color = score < 20 ? '#10b981' : score <= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="text-5xl">{emoji}</span>
      <span className="font-mono text-2xl font-bold" style={{ color }}>
        {score}
      </span>
      <span className="text-sm font-medium" style={{ color }}>
        {label}
      </span>
      {delusionHolder && score >= 20 && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{delusionHolder}</span>
          {' '}patrzy przez różowe okulary
        </p>
      )}
    </div>
  );
}

export default function ViralScoresSection({
  quantitative,
  participants,
}: ViralScoresSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  if (!quantitative.viralScores) return null;

  const {
    compatibilityScore,
    interestScores,
    ghostRisk,
    delusionScore,
    delusionHolder,
  } = quantitative.viralScores;

  const sortedParticipants = useMemo(() => {
    return participants.slice(0, 2);
  }, [participants]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
    >
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Gradient top border */}
        <div
          className="h-1"
          style={{
            background: 'linear-gradient(90deg, #3b82f6, #a855f7)',
          }}
        />

        <div className="px-5 pt-4 pb-1">
          <h3 className="font-display text-[15px] font-bold">Viral Scores</h3>
          <p className="mt-0.5 text-xs text-text-muted">
            Kluczowe wskaźniki dynamiki relacji
          </p>
        </div>

        <div className="px-5 py-4">
          {/* Row 1: Compatibility + Interest */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Compatibility Score */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Kompatybilność
              </h4>
              <CompatibilityGauge score={compatibilityScore} />
            </div>

            {/* Interest Scores */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Poziom zainteresowania
              </h4>
              <InterestBars
                interestScores={interestScores}
                participants={sortedParticipants}
              />
            </div>
          </div>

          {/* Row 2: Ghost Risk + Delusion */}
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            {/* Ghost Risk */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Ryzyko ghostingu
              </h4>
              <div className="space-y-4">
                {sortedParticipants.map((person, index) => {
                  const data = ghostRisk[person];
                  if (!data) return null;
                  return (
                    <GhostRiskMeter
                      key={person}
                      person={person}
                      score={data.score}
                      factors={data.factors}
                      colorIndex={index}
                    />
                  );
                })}
              </div>
            </div>

            {/* Delusion Score */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Skala deluzji
              </h4>
              <DelusionDisplay
                score={delusionScore}
                delusionHolder={delusionHolder}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
