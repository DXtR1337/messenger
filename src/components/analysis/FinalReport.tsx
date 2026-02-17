'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import {
  FileText,
  Activity,
  Lightbulb,
  TrendingUp,
  Film,
  Cloud,
  Hash,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Pass4Result } from '@/lib/analysis/types';

interface FinalReportProps {
  pass4: Pass4Result;
  participants: string[];
}

const HEALTH_LABELS: Array<{
  key: keyof Pass4Result['health_score']['components'];
  label: string;
}> = [
  { key: 'balance', label: 'Balance' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'emotional_safety', label: 'Emotional Safety' },
  { key: 'growth_trajectory', label: 'Growth' },
  { key: 'communication_quality', label: 'Communication' },
];

function getScoreColor(score: number): string {
  if (score < 40) return 'text-destructive';
  if (score < 70) return 'text-warning';
  return 'text-success';
}

function getProgressColor(score: number): string {
  if (score < 40) return '[&>[data-slot=progress-indicator]]:bg-destructive';
  if (score < 70) return '[&>[data-slot=progress-indicator]]:bg-warning';
  return '[&>[data-slot=progress-indicator]]:bg-success';
}

const SIGNIFICANCE_STYLES = {
  positive: 'border-success/20 bg-success/5 text-success',
  neutral: 'border-primary/20 bg-primary/5 text-primary',
  concerning: 'border-destructive/20 bg-destructive/5 text-destructive',
};

const PRIORITY_STYLES = {
  high: 'bg-destructive/15 text-destructive border-destructive/30',
  medium: 'bg-warning/15 text-warning border-warning/30',
  low: 'bg-muted text-muted-foreground border-border',
};

const DIRECTION_STYLES: Record<string, { label: string; className: string }> = {
  strengthening: { label: 'Strengthening', className: 'text-success' },
  stable: { label: 'Stable', className: 'text-primary' },
  weakening: { label: 'Weakening', className: 'text-warning' },
  volatile: { label: 'Volatile', className: 'text-destructive' },
};

function HealthScoreBreakdown({
  healthScore,
}: {
  healthScore: Pass4Result['health_score'];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  return (
    <div ref={ref} className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Overall Score</span>
        <span className={cn('font-mono text-3xl font-bold', getScoreColor(healthScore.overall))}>
          {healthScore.overall}
        </span>
      </div>

      <div className="space-y-3">
        {HEALTH_LABELS.map((item, index) => {
          const value = healthScore.components[item.key];
          return (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, x: -10 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
              transition={{ duration: 0.3, delay: index * 0.08 }}
              className="space-y-1"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{item.label}</span>
                <span className={cn('font-mono font-medium', getScoreColor(value))}>
                  {value}
                </span>
              </div>
              <Progress value={value} className={cn('h-1.5', getProgressColor(value))} />
            </motion.div>
          );
        })}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {healthScore.explanation}
      </p>
    </div>
  );
}

export default function FinalReport({ pass4, participants }: FinalReportProps) {
  const { executive_summary, health_score, key_findings, relationship_trajectory, insights, conversation_personality } =
    pass4;

  const directionStyle = DIRECTION_STYLES[relationship_trajectory.direction] ?? DIRECTION_STYLES.stable;

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <FileText className="size-4 text-muted-foreground" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <blockquote className="border-l-2 border-primary/30 pl-4 text-sm italic leading-relaxed text-muted-foreground">
            {executive_summary}
          </blockquote>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Health Score */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Activity className="size-4 text-muted-foreground" />
              Conversation Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HealthScoreBreakdown healthScore={health_score} />
          </CardContent>
        </Card>

        {/* Relationship Trajectory */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TrendingUp className="size-4 text-muted-foreground" />
              Relationship Trajectory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Current Phase</p>
                <p className="mt-0.5 text-sm font-medium capitalize">
                  {relationship_trajectory.current_phase}
                </p>
              </div>
              <Badge variant="outline" className={cn('border', directionStyle.className)}>
                {directionStyle.label}
              </Badge>
            </div>

            {relationship_trajectory.inflection_points.length > 0 && (
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Inflection Points
                </p>
                {relationship_trajectory.inflection_points.map((point, idx) => (
                  <div key={idx} className="rounded-lg bg-secondary/50 px-3 py-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{point.description}</span>
                      <span className="font-mono text-muted-foreground">
                        {point.approximate_date}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{point.evidence}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Key Findings */}
      {key_findings.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Lightbulb className="size-4 text-muted-foreground" />
              Key Findings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {key_findings.map((finding, idx) => (
              <div
                key={idx}
                className={cn(
                  'rounded-lg border px-4 py-3',
                  SIGNIFICANCE_STYLES[finding.significance],
                )}
              >
                <p className="text-sm font-medium">{finding.finding}</p>
                <p className="mt-1 text-xs opacity-80">{finding.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Actionable Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.map((insight, idx) => {
              const priorityStyle = PRIORITY_STYLES[insight.priority] ?? PRIORITY_STYLES.low;
              return (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-lg bg-secondary/30 px-4 py-3"
                >
                  <Badge className={cn('mt-0.5 shrink-0 border text-[10px]', priorityStyle)}>
                    {insight.priority}
                  </Badge>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      For <span className="font-medium text-foreground">{insight.for}</span>
                    </p>
                    <p className="mt-0.5 text-sm">{insight.insight}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Conversation Personality */}
      <Card className="border-border/50 bg-gradient-to-br from-card to-secondary/20">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Conversation Personality
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10">
                <Film className="size-5 text-primary" />
              </div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                If a Movie Genre
              </p>
              <p className="mt-1 text-sm font-medium">
                {conversation_personality.if_this_conversation_were_a.movie_genre}
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10">
                <Cloud className="size-5 text-primary" />
              </div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                If Weather
              </p>
              <p className="mt-1 text-sm font-medium">
                {conversation_personality.if_this_conversation_were_a.weather}
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10">
                <Hash className="size-5 text-primary" />
              </div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                In One Word
              </p>
              <p className="mt-1 text-sm font-semibold">
                {conversation_personality.if_this_conversation_were_a.one_word}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
