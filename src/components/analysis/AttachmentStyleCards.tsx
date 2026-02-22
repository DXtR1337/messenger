'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/utils';
import type { PersonProfile } from '@/lib/analysis/types';

interface AttachmentStyleCardsProps {
  profiles: Record<string, PersonProfile>;
  participants: string[];
}

const PERSON_DOT_CLASSES = ['bg-chart-a', 'bg-chart-b'] as const;

function getAttachmentStyleColor(style: string): { bgClass: string; textClass: string } {
  const lower = style.toLowerCase();

  if (lower === 'anxious' || lower.includes('lęk') || lower.includes('anxious')) {
    return { bgClass: 'bg-warning-subtle', textClass: 'text-warning' };
  }
  if (lower === 'secure' || lower.includes('bezpiecz') || lower.includes('secure')) {
    return { bgClass: 'bg-success-subtle', textClass: 'text-success' };
  }
  if (lower === 'avoidant' || lower.includes('unik') || lower.includes('avoidant')) {
    return { bgClass: 'bg-danger-subtle', textClass: 'text-danger' };
  }
  // disorganized or other
  return { bgClass: 'bg-accent-subtle', textClass: 'text-accent' };
}

function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function PersonAttachmentCard({
  name,
  profile,
  personIndex,
  delay,
}: {
  name: string;
  profile: PersonProfile;
  personIndex: number;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  const primaryStyle = profile.attachment_indicators.primary_style;
  const { bgClass, textClass } = getAttachmentStyleColor(primaryStyle);
  const indicators = profile.attachment_indicators.indicators ?? [];
  const behavioralIndicators = indicators
    .map((ind) => ind.behavior)
    .slice(0, 3);

  const dotClass = PERSON_DOT_CLASSES[personIndex % PERSON_DOT_CLASSES.length];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
    >
      {/* Name row */}
      <div className="flex items-center gap-1.5 font-semibold text-sm mb-1.5">
        <span className={cn('w-2 h-2 rounded-full shrink-0', dotClass)} />
        <span>{name}</span>
      </div>

      {/* Attachment type badge */}
      <span
        className={cn(
          'font-display text-[13px] font-semibold px-2.5 py-1 rounded-md inline-block mb-2',
          bgClass,
          textClass,
        )}
      >
        {capitalizeFirst(primaryStyle.replace(/_/g, ' '))}
      </span>

      {/* Trait tags */}
      {behavioralIndicators.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {behavioralIndicators.map((indicator, idx) => (
            <span
              key={idx}
              className="text-xs text-muted-foreground px-2 py-0.5 bg-white/[0.04] border border-border rounded"
            >
              {indicator}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function AttachmentStyleCards({
  profiles,
  participants,
}: AttachmentStyleCardsProps) {
  const participantsWithProfiles = participants.filter(
    (name) => profiles[name] !== undefined,
  );

  if (participantsWithProfiles.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 pt-4">
        <h3 className="font-display text-[15px] font-bold">Styl przywiązania</h3>
      </div>
      <div className="px-5 py-4 flex flex-col gap-4">
        {participantsWithProfiles.map((name, index) => {
          const profile = profiles[name];
          if (!profile) return null;

          return (
            <div key={name}>
              {index > 0 && <div className="h-px bg-border my-1 -mt-1 mb-3" />}
              <PersonAttachmentCard
                name={name}
                profile={profile}
                personIndex={index}
                delay={index * 0.1}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
