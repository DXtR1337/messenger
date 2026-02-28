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

type StyleKey = 'secure' | 'anxious' | 'avoidant' | 'disorganized';

const STYLE_CONFIG: Record<StyleKey, { color: string; glow: string; gradient: string; label: string }> = {
  secure:       { color: '#c084fc', glow: 'rgba(192,132,252,0.3)',  gradient: 'from-purple-400/20 to-purple-500/5', label: 'Bezpieczny' },
  anxious:      { color: '#d946ef', glow: 'rgba(217,70,239,0.3)',   gradient: 'from-fuchsia-500/20 to-fuchsia-600/5', label: 'Lękowy' },
  avoidant:     { color: '#e879f9', glow: 'rgba(232,121,249,0.3)',  gradient: 'from-fuchsia-400/20 to-fuchsia-500/5', label: 'Unikający' },
  disorganized: { color: '#a78bfa', glow: 'rgba(167,139,250,0.3)',  gradient: 'from-violet-500/20 to-violet-600/5',  label: 'Zdezorganizowany' },
};

function classifyStyle(style: string): StyleKey {
  const lower = style.toLowerCase();
  if (lower === 'anxious' || lower.includes('lęk') || lower.includes('anxious')) return 'anxious';
  if (lower === 'secure' || lower.includes('bezpiecz') || lower.includes('secure')) return 'secure';
  if (lower === 'avoidant' || lower.includes('unik') || lower.includes('avoidant')) return 'avoidant';
  return 'disorganized';
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
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  const dotClass = PERSON_DOT_CLASSES[personIndex % PERSON_DOT_CLASSES.length];

  const rawStyle = profile.attachment_indicators?.primary_style;
  const isLegacyInsufficient = !rawStyle || rawStyle === 'insufficient_data';
  const displayStyle = isLegacyInsufficient ? 'nieustalony' : rawStyle;
  const confidence = profile.attachment_indicators?.confidence ?? 0;
  const isLowConfidence = confidence > 0 && confidence < 30;
  const indicators = profile.attachment_indicators?.indicators ?? [];
  const behavioralIndicators = indicators
    .map((ind) => ind.behavior)
    .slice(0, 3);

  const styleKey = isLegacyInsufficient ? 'disorganized' : classifyStyle(displayStyle);
  const config = STYLE_CONFIG[styleKey];

  return (
    <motion.div
      ref={ref}
      className="relative"
      initial={{ opacity: 0, y: 12 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Name row */}
      <div className="flex items-center gap-1.5 font-semibold text-sm mb-2">
        <span className={cn('w-2 h-2 rounded-full shrink-0', dotClass)} />
        <span>{name}</span>
      </div>

      {/* Attachment type — badge + confidence bar */}
      <div className="flex items-center gap-3 mb-3">
        <motion.span
          className={cn(
            'font-display text-[13px] font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5',
            `bg-gradient-to-r ${config.gradient}`,
            'border border-purple-500/[0.08]',
          )}
          style={{ color: config.color }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.4, delay: delay + 0.15, type: 'spring', stiffness: 300, damping: 20 }}
        >
          {/* Colored dot indicator */}
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: config.color, boxShadow: `0 0 6px ${config.glow}` }}
          />
          {capitalizeFirst(displayStyle.replace(/_/g, ' '))}
        </motion.span>

        {/* Confidence indicator */}
        {!isLegacyInsufficient && confidence > 0 && (
          <div className="flex items-center gap-2 flex-1">
            <div className="h-1 flex-1 max-w-[80px] rounded-full bg-purple-950/[0.2] overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: config.color }}
                initial={{ width: '0%' }}
                animate={isInView ? { width: `${Math.min(100, confidence)}%` } : { width: '0%' }}
                transition={{ duration: 0.7, delay: delay + 0.3, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <motion.span
              className="text-[10px] font-mono text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.4, delay: delay + 0.5 }}
            >
              {confidence}%
            </motion.span>
          </div>
        )}

        {(isLowConfidence || isLegacyInsufficient) && (
          <motion.span
            className="text-[10px] text-muted-foreground/50 italic"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.4, delay: delay + 0.4 }}
          >
            (ograniczone dane)
          </motion.span>
        )}
      </div>

      {/* Behavioral indicators — slide in with stagger */}
      {behavioralIndicators.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {behavioralIndicators.map((indicator, idx) => (
            <motion.span
              key={idx}
              className="text-xs text-muted-foreground px-2.5 py-1 bg-purple-950/[0.2] border border-purple-500/[0.08] rounded-md"
              initial={{ opacity: 0, x: -8 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
              transition={{ duration: 0.4, delay: delay + 0.35 + idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              {indicator}
            </motion.span>
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
    <div className="rounded-xl border border-purple-500/[0.06] bg-purple-950/[0.08] overflow-hidden">
      <div className="px-5 pt-4">
        <h3 className="font-display text-[15px] font-bold">Styl przywiązania</h3>
        <p className="mt-0.5 text-xs text-text-muted">Dominujący wzorzec więzi na podstawie zachowań komunikacyjnych</p>
      </div>
      <div className="px-5 py-4 flex flex-col gap-4">
        {participantsWithProfiles.map((name, index) => {
          const profile = profiles[name];
          if (!profile) return null;

          return (
            <div key={name}>
              {index > 0 && (
                <div
                  className="h-px my-1 -mt-1 mb-3"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }}
                />
              )}
              <PersonAttachmentCard
                name={name}
                profile={profile}
                personIndex={index}
                delay={index * 0.15}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
