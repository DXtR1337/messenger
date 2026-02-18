'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Pass1Result } from '@/lib/analysis/types';

interface ToneAnalysisProps {
  pass1: Pass1Result;
  participants: string[];
}

const PERSON_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

const TRAJECTORY_STYLES: Record<string, { label: string; className: string }> = {
  warming: { label: 'Warming', className: 'bg-success/15 text-success border-success/30' },
  stable: { label: 'Stabilny', className: 'bg-primary/15 text-primary border-primary/30' },
  cooling: { label: 'Cooling', className: 'bg-warning/15 text-warning border-warning/30' },
  volatile: { label: 'Niestabilny', className: 'bg-destructive/15 text-destructive border-destructive/30' },
};

function GaugeBar({
  value,
  max,
  label,
  color,
}: {
  value: number;
  max: number;
  label: string;
  color: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const percentage = (value / max) * 100;

  return (
    <div ref={ref} className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">{value}/{max}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={isInView ? { width: `${percentage}%` } : { width: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function PersonToneCard({
  name,
  tone,
  colorIndex,
}: {
  name: string;
  tone: Pass1Result['tone_per_person'][string];
  colorIndex: number;
}) {
  const color = PERSON_COLORS[colorIndex % PERSON_COLORS.length];

  return (
    <Card className="border-border/50">
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center gap-2">
          <span
            className="inline-block size-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <h4 className="font-semibold">{name}</h4>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Primary Tone</p>
          <p className="mt-0.5 text-lg font-medium capitalize">{tone.primary_tone}</p>
          {tone.secondary_tones.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {tone.secondary_tones.map((t) => (
                <Badge key={t} variant="outline" className="text-[10px] capitalize">
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <GaugeBar value={tone.warmth} max={10} label="Warmth" color={color} />
          <GaugeBar value={tone.humor_presence} max={10} label="Humor" color={color} />
          <GaugeBar value={tone.formality_level} max={10} label="Formality" color={color} />
        </div>

        <div>
          <p className="text-xs text-muted-foreground">
            Humor style:{' '}
            <span className="font-medium capitalize text-foreground">
              {tone.humor_style.replace(/_/g, ' ')}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ToneAnalysis({ pass1, participants }: ToneAnalysisProps) {
  const dynamic = pass1?.overall_dynamic;
  const relType = pass1?.relationship_type;
  const trajectoryStyle = TRAJECTORY_STYLES[dynamic?.trajectory ?? 'stable'] ?? TRAJECTORY_STYLES.stable;

  if (!pass1) return null;

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Tone & Style Analysis</CardTitle>
            <div className="flex gap-2">
              {relType && (
                <Badge variant="secondary" className="capitalize">
                  {relType.category}
                  {relType.sub_type && (
                    <span className="ml-1 text-muted-foreground">
                      / {relType.sub_type}
                    </span>
                  )}
                </Badge>
              )}
              <Badge className={cn('border', trajectoryStyle.className)}>
                {trajectoryStyle.label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {dynamic?.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {dynamic.description}
            </p>
          )}

          {dynamic && (
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>
                Energy:{' '}
                <span className="font-medium capitalize text-foreground">
                  {dynamic.energy}
                </span>
              </span>
              <span>
                Równowaga:{' '}
                <span className="font-medium capitalize text-foreground">
                  {dynamic.balance?.replace(/_/g, ' ')}
                </span>
              </span>
              <span>
                Confidence:{' '}
                <span className="font-mono font-medium text-foreground">
                  {dynamic.confidence}%
                </span>
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-person tone cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {participants.map((name, index) => {
          const tone = pass1.tone_per_person?.[name];
          if (!tone) return null;
          return (
            <PersonToneCard key={name} name={name} tone={tone} colorIndex={index} />
          );
        })}
      </div>
    </div>
  );
}
