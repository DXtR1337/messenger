'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Brain, Link2, MessageCircle, Heart, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PersonProfile, BigFiveApproximation } from '@/lib/analysis/types';

interface PersonalityProfilesProps {
  profiles: Record<string, PersonProfile>;
  participants: string[];
}

const PERSON_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

const BIG_FIVE_LABELS: Array<{ key: keyof BigFiveApproximation; label: string }> = [
  { key: 'openness', label: 'Otwartość' },
  { key: 'conscientiousness', label: 'Sumienność' },
  { key: 'extraversion', label: 'Ekstrawersja' },
  { key: 'agreeableness', label: 'Ugodowość' },
  { key: 'neuroticism', label: 'Neurotyczność' },
];

const ATTACHMENT_STYLES: Record<string, { label: string; className: string }> = {
  secure: { label: 'Bezpieczny', className: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  anxious: { label: 'Lękowy', className: 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30' },
  avoidant: { label: 'Unikający', className: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
  disorganized: {
    label: 'Zdezorganizowany',
    className: 'bg-fuchsia-400/15 text-fuchsia-300 border-fuchsia-400/30',
  },
  insufficient_data: {
    label: 'Brak danych',
    className: 'bg-muted text-muted-foreground border-border',
  },
};

function BigFiveRangeBar({
  trait,
  low,
  high,
  color,
  delay,
}: {
  trait: string;
  low: number;
  high: number;
  color: string;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  // Map 1-10 to percentage
  const leftPct = ((low - 1) / 9) * 100;
  const widthPct = ((high - low) / 9) * 100;

  return (
    <div ref={ref} className="space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{trait}</span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {low}-{high}
        </span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-secondary">
        <motion.div
          className="absolute h-full rounded-full"
          style={{ backgroundColor: color, opacity: 0.8 }}
          initial={{ left: `${leftPct}%`, width: 0 }}
          animate={
            isInView
              ? { left: `${leftPct}%`, width: `${Math.max(widthPct, 3)}%` }
              : { left: `${leftPct}%`, width: 0 }
          }
          transition={{ duration: 0.6, delay, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function ProfileCard({
  name,
  profile,
  colorIndex,
}: {
  name: string;
  profile: PersonProfile;
  colorIndex: number;
}) {
  const color = PERSON_COLORS[colorIndex % PERSON_COLORS.length];
  const attachmentStyle =
    ATTACHMENT_STYLES[profile.attachment_indicators?.primary_style ?? 'insufficient_data'] ??
    ATTACHMENT_STYLES.insufficient_data;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span
            className="inline-block size-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-base font-semibold">{name}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Big Five */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Brain className="size-3.5" />
            <span className="uppercase tracking-wider">Przybliżenie Wielkiej Piątki</span>
          </div>
          <div className="space-y-2">
            {BIG_FIVE_LABELS.map((trait, idx) => {
              const data = profile.big_five_approximation[trait.key];
              return (
                <BigFiveRangeBar
                  key={trait.key}
                  trait={trait.label}
                  low={data.range[0]}
                  high={data.range[1]}
                  color={color}
                  delay={idx * 0.08}
                />
              );
            })}
          </div>
        </div>

        {/* Attachment Style */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link2 className="size-3.5" />
            <span className="uppercase tracking-wider">Styl przywiązania</span>
          </div>
          <Badge className={cn('border', attachmentStyle.className)}>
            {attachmentStyle.label}
          </Badge>
          {(profile.attachment_indicators?.indicators?.length ?? 0) > 0 && (
            <div className="space-y-1 pt-1">
              {profile.attachment_indicators!.indicators.slice(0, 3).map((ind, idx) => (
                <p key={idx} className="text-xs text-muted-foreground">
                  {ind.behavior}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Communication Style */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MessageCircle className="size-3.5" />
            <span className="uppercase tracking-wider">Styl komunikacji</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-[10px] capitalize">
              {profile.communication_profile.style}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              Asertywność: {profile.communication_profile.assertiveness}/10
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              Ekspresyjność: {profile.communication_profile.emotional_expressiveness}/10
            </Badge>
            <Badge variant="outline" className="text-[10px] capitalize">
              {profile.communication_profile.question_to_statement_ratio.replace(/_/g, ' ')}
            </Badge>
          </div>
          {profile.communication_profile.verbal_tics.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Nawyki słowne:{' '}
              {profile.communication_profile.verbal_tics.map((tic, idx) => (
                <span key={idx}>
                  <span className="font-mono text-foreground">&ldquo;{tic}&rdquo;</span>
                  {idx < profile.communication_profile.verbal_tics.length - 1 ? ', ' : ''}
                </span>
              ))}
            </p>
          )}
        </div>

        {/* Communication Needs */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Heart className="size-3.5" />
            <span className="uppercase tracking-wider">Potrzeby komunikacyjne</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {profile.communication_needs.primary}
            </Badge>
            <Badge variant="outline" className="capitalize text-[10px]">
              {profile.communication_needs.secondary}
            </Badge>
          </div>
          {profile.communication_needs.unmet_needs_signals.length > 0 && (
            <div className="space-y-1 pt-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Sygnały niezaspokojonych potrzeb
              </p>
              {profile.communication_needs.unmet_needs_signals.map((signal, idx) => (
                <p key={idx} className="text-xs text-purple-400">
                  {signal}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Emotional Patterns */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Zap className="size-3.5" />
            <span className="uppercase tracking-wider">Wzorce emocjonalne</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.emotional_patterns.dominant_emotions.map((emotion) => (
              <Badge key={emotion} variant="outline" className="text-[10px] capitalize">
                {emotion}
              </Badge>
            ))}
          </div>
          {profile.emotional_patterns.coping_mechanisms_visible.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Mechanizmy radzenia sobie:{' '}
              {profile.emotional_patterns.coping_mechanisms_visible.join(', ')}
            </p>
          )}
          {profile.emotional_patterns.stress_indicators.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Wskaźniki stresu:{' '}
              {profile.emotional_patterns.stress_indicators.join(', ')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PersonalityProfiles({ profiles, participants }: PersonalityProfilesProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Profile osobowości</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {participants.map((name, index) => {
          const profile = profiles[name];
          if (!profile) return null;
          return (
            <ProfileCard key={name} name={name} profile={profile} colorIndex={index} />
          );
        })}
      </div>
    </div>
  );
}
