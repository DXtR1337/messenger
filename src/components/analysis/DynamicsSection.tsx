'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Shield,
  Scale,
  HeartHandshake,
  Swords,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Pass2Result } from '@/lib/analysis/types';

const FREQUENCY_PL: Record<string, string> = {
  frequent: 'częste',
  occasional: 'okazjonalne',
  rare: 'rzadkie',
};

const SEVERITY_PL: Record<string, string> = {
  mild: 'łagodne',
  moderate: 'umiarkowane',
  severe: 'poważne',
};

interface DynamicsSectionProps {
  pass2: Pass2Result;
  participants: string[];
}

const PERSON_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

function PowerBalanceSlider({
  score,
  participants,
}: {
  score: number;
  participants: string[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  // score: -100 (Person A dominates) to +100 (Person B dominates)
  // Map to 0-100 for positioning
  const position = ((score + 100) / 200) * 100;

  return (
    <div ref={ref} className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block size-2 rounded-full"
            style={{ backgroundColor: PERSON_COLORS[0] }}
          />
          <span className="font-medium">{participants[0] ?? 'Person A'}</span>
        </span>
        <span className="font-mono text-muted-foreground">
          {Math.abs(score) < 15
            ? 'Zrównoważone'
            : score < 0
              ? `${participants[0] ?? 'Person A'} przewodzi`
              : `${participants[1] ?? 'Person B'} przewodzi`}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="font-medium">{participants[1] ?? 'Person B'}</span>
          <span
            className="inline-block size-2 rounded-full"
            style={{ backgroundColor: PERSON_COLORS[1] }}
          />
        </span>
      </div>
      <div className="relative h-3 w-full rounded-full bg-secondary">
        {/* Gradient bar */}
        <div
          className="absolute inset-0 rounded-full opacity-30"
          style={{
            background: `linear-gradient(to right, ${PERSON_COLORS[0]}, transparent 40%, transparent 60%, ${PERSON_COLORS[1]})`,
          }}
        />
        {/* Center mark */}
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-border" />
        {/* Indicator */}
        <motion.div
          className="absolute top-1/2 size-4 -translate-y-1/2 rounded-full border-2 border-foreground bg-background shadow-md"
          initial={{ left: '50%' }}
          animate={isInView ? { left: `${position}%` } : { left: '50%' }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ marginLeft: '-8px' }}
        />
      </div>
    </div>
  );
}

function EmotionalLaborBreakdown({
  emotionalLabor,
  participants,
}: {
  emotionalLabor: Pass2Result['emotional_labor'];
  participants: string[];
}) {
  const getColorIndex = (name: string) => {
    const idx = participants.indexOf(name);
    return idx >= 0 ? idx : 0;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Główny opiekun emocjonalny</span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block size-2 rounded-full"
            style={{ backgroundColor: PERSON_COLORS[getColorIndex(emotionalLabor.primary_caregiver)] }}
          />
          <span className="font-medium text-foreground">{emotionalLabor.primary_caregiver}</span>
        </span>
      </div>

      <div className="space-y-2">
        {emotionalLabor.patterns.map((pattern, index) => (
          <div key={index} className="flex items-center justify-between text-xs">
            <span className="capitalize text-muted-foreground">
              {pattern.type.replace(/_/g, ' ')}
            </span>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px]',
                  pattern.frequency === 'frequent' && 'border-success/30 text-success',
                  pattern.frequency === 'occasional' && 'border-warning/30 text-warning',
                  pattern.frequency === 'rare' && 'border-muted-foreground/30 text-muted-foreground',
                )}
              >
                {FREQUENCY_PL[pattern.frequency] ?? pattern.frequency}
              </Badge>
              <span className="flex items-center gap-1">
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ backgroundColor: PERSON_COLORS[getColorIndex(pattern.performed_by)] }}
                />
                <span className="font-medium text-foreground">{pattern.performed_by}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const SEVERITY_STYLES = {
  mild: 'border-warning/30 bg-warning/10 text-warning',
  moderate: 'border-warning/50 bg-warning/15 text-warning',
  severe: 'border-destructive/50 bg-destructive/15 text-destructive',
};

export default function DynamicsSection({ pass2, participants }: DynamicsSectionProps) {
  const { power_dynamics, emotional_labor, conflict_patterns, red_flags, green_flags } = pass2;

  return (
    <div className="space-y-6">
      {/* Power & Emotional Labor */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Scale className="size-4 text-muted-foreground" />
              Balans sił
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PowerBalanceSlider score={power_dynamics.balance_score} participants={participants} />

            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Kto dostosowuje się bardziej</span>
                <span className="font-medium text-foreground">{power_dynamics.who_adapts_more}</span>
              </div>
              <div className="flex justify-between">
                <span>Typ adaptacji</span>
                <span className="font-medium capitalize text-foreground">
                  {power_dynamics.adaptation_type}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Pewność</span>
                <span className="font-mono font-medium text-foreground">
                  {power_dynamics.confidence}%
                </span>
              </div>
            </div>

            {power_dynamics.evidence.length > 0 && (
              <div className="space-y-1 border-t border-border pt-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Dowody</p>
                {power_dynamics.evidence.map((item, idx) => (
                  <p key={idx} className="text-xs italic text-muted-foreground">
                    &ldquo;{item}&rdquo;
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <HeartHandshake className="size-4 text-muted-foreground" />
              Praca emocjonalna
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmotionalLaborBreakdown emotionalLabor={emotional_labor} participants={participants} />
          </CardContent>
        </Card>
      </div>

      {/* Conflict Patterns */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Swords className="size-4 text-muted-foreground" />
            Wzorce konfliktów
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Częstotliwość: </span>
              <Badge variant="outline" className="ml-1 capitalize text-xs">
                {FREQUENCY_PL[conflict_patterns.conflict_frequency] ?? conflict_patterns.conflict_frequency.replace(/_/g, ' ')}
              </Badge>
            </div>
            {conflict_patterns.typical_trigger && (
              <div>
                <span className="text-muted-foreground">Typowy wyzwalacz: </span>
                <span className="font-medium text-foreground">{conflict_patterns.typical_trigger}</span>
              </div>
            )}
          </div>

          {/* Resolution styles per person */}
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Style rozwiązywania
            </p>
            {Object.entries(conflict_patterns.resolution_style).map(([name, style]) => {
              const colorIndex = participants.indexOf(name);
              return (
                <div key={name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block size-2 rounded-full"
                      style={{
                        backgroundColor: PERSON_COLORS[colorIndex >= 0 ? colorIndex : 0],
                      }}
                    />
                    <span className="text-muted-foreground">{name}</span>
                  </span>
                  <span className="font-medium capitalize text-foreground">
                    {style.replace(/_/g, ' ')}
                  </span>
                </div>
              );
            })}
          </div>

          {conflict_patterns.unresolved_tensions.length > 0 && (
            <div className="space-y-1 border-t border-border pt-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Nierozwiązane napięcia
              </p>
              {conflict_patterns.unresolved_tensions.map((tension, idx) => (
                <p key={idx} className="text-xs text-muted-foreground">
                  {tension}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Red Flags & Green Flags */}
      <div className="grid gap-4 md:grid-cols-2">
        {red_flags.length > 0 && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <AlertTriangle className="size-4 text-destructive" />
                Czerwone flagi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {red_flags.map((flag, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-xs',
                    SEVERITY_STYLES[flag.severity],
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{flag.pattern}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] capitalize',
                        flag.severity === 'severe' && 'border-destructive/50 text-destructive',
                        flag.severity === 'moderate' && 'border-warning/50 text-warning',
                        flag.severity === 'mild' && 'border-warning/30 text-warning',
                      )}
                    >
                      {SEVERITY_PL[flag.severity] ?? flag.severity}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {green_flags.length > 0 && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <CheckCircle2 className="size-4 text-success" />
                Zielone flagi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {green_flags.map((flag, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-success/20 bg-success/5 px-3 py-2 text-xs text-success"
                >
                  <span className="font-medium">{flag.pattern}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
