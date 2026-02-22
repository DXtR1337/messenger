'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import type { PersonProfile, Pass1Result } from '@/lib/analysis/types';

interface CommunicationStyleMetersProps {
  profiles: Record<string, PersonProfile>;
  pass1?: Pass1Result;
  participants: string[];
}

function clamp(min: number, value: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getDirectnessPosition(profile: PersonProfile): number {
  const style = profile.communication_profile.style;
  const base = style === 'direct' ? 75 : style === 'indirect' ? 25 : 50;
  const assertiveness = profile.communication_profile.assertiveness ?? 5;
  return clamp(0, base + (assertiveness - 5) * 5, 100);
}

function getEmotionalnessPosition(profile: PersonProfile): number {
  const expressiveness = profile.communication_profile.emotional_expressiveness ?? 5;
  return clamp(0, expressiveness * 10, 100);
}

function getConflictPosition(profile: PersonProfile): number {
  const cr = profile.conflict_resolution;
  if (!cr?.primary_style) return 50;

  // Base range per conflict style (center of each range)
  const baseMap: Record<string, number> = {
    avoidant: 20,
    passive_aggressive: 35,
    humor_deflection: 40,
    collaborative: 50,
    direct_confrontation: 70,
    explosive: 85,
  };

  const base = baseMap[cr.primary_style] ?? 50;

  // Modulate by de_escalation_skills (0-10): higher skills shift left (calmer),
  // lower skills shift right (more confrontational). Adjustment = (5 - skills) * 2
  const deEscalation = cr.de_escalation_skills ?? 5;
  const adjustment = (5 - deEscalation) * 2;

  return clamp(0, base + adjustment, 100);
}

function getFormalityPosition(
  profile: PersonProfile | undefined,
  participantName: string,
  pass1?: Pass1Result,
): number {
  const formalityLevel = pass1?.tone_per_person?.[participantName]?.formality_level;
  const selfDisclosure = profile?.communication_profile?.self_disclosure_depth;

  // Primary signal: formality_level (0-10 scale) mapped to 0-100
  const primary = formalityLevel != null ? formalityLevel * 10 : 50;

  // Secondary signal: higher self-disclosure = less formal (negative adjustment)
  const disclosureAdjustment = selfDisclosure != null ? -selfDisclosure * 2 : 0;

  return clamp(5, primary + disclosureAdjustment, 95);
}

interface MeterAxis {
  label: string;
  leftLabel: string;
  rightLabel: string;
  getPosition: (
    profile: PersonProfile,
    participantName: string,
    pass1?: Pass1Result,
  ) => number;
}

const METER_AXES: MeterAxis[] = [
  {
    label: 'Bezpośredniość',
    leftLabel: 'Pośrednia',
    rightLabel: 'Bezpośrednia',
    getPosition: (profile) => getDirectnessPosition(profile),
  },
  {
    label: 'Emocjonalność',
    leftLabel: 'Powściągliwy',
    rightLabel: 'Ekspresyjny',
    getPosition: (profile) => getEmotionalnessPosition(profile),
  },
  {
    label: 'Konflikt',
    leftLabel: 'Unikanie',
    rightLabel: 'Konfrontacja',
    getPosition: (profile) => getConflictPosition(profile),
  },
  {
    label: 'Formalność',
    leftLabel: 'Nieformalna',
    rightLabel: 'Formalna',
    getPosition: (profile, name, pass1) => getFormalityPosition(profile, name, pass1),
  },
];

function StyleMeter({
  label,
  leftLabel,
  rightLabel,
  posA,
  posB,
  delay,
}: {
  label: string;
  leftLabel: string;
  rightLabel: string;
  posA: number;
  posB: number;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  return (
    <div ref={ref} className="mb-[18px] last:mb-0">
      <div className="text-[13px] font-semibold mb-2">{label}</div>
      <div className="h-1 bg-white/[0.06] rounded-sm relative mb-1">
        {/* Person A dot (blue, on top) */}
        <motion.div
          className="w-3.5 h-3.5 rounded-full absolute top-1/2 -translate-y-1/2 -translate-x-1/2 border-2 border-card z-[2] bg-chart-a"
          initial={{ left: '50%', opacity: 0 }}
          animate={
            isInView
              ? { left: `${posA}%`, opacity: 1 }
              : { left: '50%', opacity: 0 }
          }
          transition={{ duration: 0.7, delay, ease: 'easeOut' }}
        />
        {/* Person B dot (purple, behind) */}
        <motion.div
          className="w-3.5 h-3.5 rounded-full absolute top-1/2 -translate-y-1/2 -translate-x-1/2 border-2 border-card z-[1] bg-chart-b"
          initial={{ left: '50%', opacity: 0 }}
          animate={
            isInView
              ? { left: `${posB}%`, opacity: 1 }
              : { left: '50%', opacity: 0 }
          }
          transition={{ duration: 0.7, delay: delay + 0.08, ease: 'easeOut' }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-text-muted">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}

export default function CommunicationStyleMeters({
  profiles,
  pass1,
  participants,
}: CommunicationStyleMetersProps) {
  const personA = participants[0];
  const personB = participants[1];

  const profileA = personA ? profiles[personA] : undefined;
  const profileB = personB ? profiles[personB] : undefined;

  if (!profileA && !profileB) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 pt-4">
        <h3 className="font-display text-[15px] font-bold">Styl komunikacji</h3>
      </div>
      <div className="px-5 py-4">
        {METER_AXES.map((axis, index) => {
          const posA = profileA
            ? axis.getPosition(profileA, personA ?? '', pass1)
            : 50;
          const posB = profileB
            ? axis.getPosition(profileB, personB ?? '', pass1)
            : 50;

          return (
            <StyleMeter
              key={axis.label}
              label={axis.label}
              leftLabel={axis.leftLabel}
              rightLabel={axis.rightLabel}
              posA={posA}
              posB={posB}
              delay={index * 0.1}
            />
          );
        })}
      </div>
      <div className="flex gap-4 px-5 pb-3 mt-1">
        <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
          <span className="inline-block h-2 w-2 rounded-full bg-chart-a" />
          {personA}
        </span>
        {personB && (
          <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
            <span className="inline-block h-2 w-2 rounded-full bg-chart-b" />
            {personB}
          </span>
        )}
      </div>
    </div>
  );
}
