'use client';

import { motion } from 'framer-motion';
import type { StoredAnalysis } from '@/lib/analysis/types';

interface ComparisonScoresProps {
  analysisA: StoredAnalysis;
  analysisB: StoredAnalysis;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#3b82f6';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function ScoreGauge({
  score,
  label,
  accentColor,
  delay,
}: {
  score: number | null;
  label: string;
  accentColor: string;
  delay: number;
}) {
  if (score === null) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="relative flex items-center justify-center" style={{ width: 100, height: 100 }}>
          <svg width={100} height={100} viewBox="0 0 100 100">
            <circle
              cx={50}
              cy={50}
              r={42}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={6}
            />
          </svg>
          <span className="absolute font-mono text-sm text-text-muted">&mdash;</span>
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    );
  }

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex items-center justify-center" style={{ width: 100, height: 100 }}>
        <svg width={100} height={100} viewBox="0 0 100 100">
          <circle
            cx={50}
            cy={50}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={6}
          />
          <motion.circle
            cx={50}
            cy={50}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut', delay }}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <span className="absolute font-mono text-xl font-bold" style={{ color }}>
          {score}
        </span>
      </div>
      <span className="text-xs font-medium" style={{ color: accentColor }}>
        {label}
      </span>
    </div>
  );
}

interface ScoreRowData {
  title: string;
  scoreA: number | null;
  scoreB: number | null;
}

export default function ComparisonScores({ analysisA, analysisB }: ComparisonScoresProps) {
  const healthA = analysisA.qualitative?.pass4?.health_score?.overall ?? null;
  const healthB = analysisB.qualitative?.pass4?.health_score?.overall ?? null;

  const compatA = analysisA.quantitative.viralScores?.compatibilityScore ?? null;
  const compatB = analysisB.quantitative.viralScores?.compatibilityScore ?? null;

  const delusionA = analysisA.quantitative.viralScores?.delusionScore ?? null;
  const delusionB = analysisB.quantitative.viralScores?.delusionScore ?? null;

  const scoreRows: ScoreRowData[] = [];

  if (healthA !== null || healthB !== null) {
    scoreRows.push({ title: 'Health Score', scoreA: healthA, scoreB: healthB });
  }
  if (compatA !== null || compatB !== null) {
    scoreRows.push({ title: 'Compatibility Score', scoreA: compatA, scoreB: compatB });
  }
  if (delusionA !== null || delusionB !== null) {
    scoreRows.push({ title: 'Delusion Score', scoreA: delusionA, scoreB: delusionB });
  }

  if (scoreRows.length === 0) return null;

  const titleA = analysisA.title.length > 20
    ? analysisA.title.slice(0, 18) + '...'
    : analysisA.title;
  const titleB = analysisB.title.length > 20
    ? analysisB.title.slice(0, 18) + '...'
    : analysisB.title;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="px-5 pt-4 pb-2">
        <h3 className="font-display text-[15px] font-bold">Wyniki punktowe</h3>
        <p className="mt-0.5 text-xs text-text-muted">
          Porównanie kluczowych wyników obu analiz
        </p>
      </div>

      <div className="space-y-6 px-5 py-4">
        {scoreRows.map((row, rowIndex) => (
          <div key={row.title}>
            <h4 className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {row.title}
            </h4>
            <div className="flex items-center justify-center gap-8">
              <div className="flex flex-col items-center gap-1">
                <ScoreGauge
                  score={row.scoreA}
                  label={titleA}
                  accentColor="#3b82f6"
                  delay={0.2 + rowIndex * 0.15}
                />
              </div>
              <div className="text-lg text-text-muted">vs</div>
              <div className="flex flex-col items-center gap-1">
                <ScoreGauge
                  score={row.scoreB}
                  label={titleB}
                  accentColor="#a855f7"
                  delay={0.3 + rowIndex * 0.15}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
