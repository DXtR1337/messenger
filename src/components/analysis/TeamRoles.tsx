'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import type { TeamAnalysis, TeamRoleType } from '@/lib/analysis/team-roles';
import { getPersonColor } from './PersonNavigator';
import { cn } from '@/lib/utils';

interface TeamRolesProps {
  teamAnalysis: TeamAnalysis;
  participants: string[];
}

const ROLE_EMOJI: Record<TeamRoleType, string> = {
  lider: '\u{1F451}',
  mediator: '\u{1F91D}',
  prowokator: '\u{1F525}',
  lurker: '\u{1F47B}',
  nucleus: '\u{269B}\uFE0F',
  outsider: '\u{1F6F0}\uFE0F',
};

const ROLE_LABEL: Record<TeamRoleType, string> = {
  lider: 'Lider',
  mediator: 'Mediator',
  prowokator: 'Prowokator',
  lurker: 'Lurker',
  nucleus: 'Rdzeń',
  outsider: 'Outsider',
};

const ROLE_DESCRIPTION: Record<TeamRoleType, string> = {
  lider: 'Centrum uwagi i decyzji',
  mediator: 'Łączy ludzi, nie dominuje',
  prowokator: 'Zamieszanie to jego żywioł',
  lurker: 'Czyta, ale nie pisze',
  nucleus: 'Serce tight-knit grupy',
  outsider: 'Na obrzeżach rozmowy',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3 },
  },
};

export default function TeamRoles({ teamAnalysis, participants }: TeamRolesProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  const { roles } = teamAnalysis;

  if (roles.length === 0) return null;

  return (
    <div ref={ref} className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="px-5 pt-4">
        <h3 className="font-display text-[15px] font-bold text-foreground">
          Role w grupie
        </h3>
        <p className="mt-0.5 text-xs text-text-muted">
          Kto kim jest w dynamice grupowej
        </p>
      </div>

      <motion.div
        className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3"
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
      >
        {roles.map((role) => {
          const participantIndex = participants.indexOf(role.name);
          const safeIndex = participantIndex >= 0 ? participantIndex : 0;
          const personColor = getPersonColor(safeIndex);
          const confidence = Math.max(0, Math.min(100, role.confidence));

          return (
            <motion.div
              key={role.name}
              variants={cardVariants}
              className="rounded-lg border border-border bg-background p-3"
            >
              {/* Header row: emoji + name + role label */}
              <div className="flex items-center gap-2">
                <span className="text-2xl leading-none" role="img" aria-label={ROLE_LABEL[role.role]}>
                  {ROLE_EMOJI[role.role]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="truncate text-sm font-bold"
                      style={{ color: personColor }}
                    >
                      {role.name}
                    </span>
                    <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs text-text-muted">
                      {ROLE_LABEL[role.role]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Role description */}
              <p className="mt-2 text-xs text-muted-foreground">
                {ROLE_DESCRIPTION[role.role]}
              </p>

              {/* Evidence bullets */}
              {role.evidence.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                  {role.evidence.map((ev, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-1.5 text-[11px] text-text-muted"
                    >
                      <span className="mt-1 shrink-0 size-1 rounded-full bg-text-muted" />
                      <span>{ev}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Confidence bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] text-text-muted">
                  <span>Pewność</span>
                  <span className="font-mono">{confidence}%</span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-border">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, #3b82f6, #a855f7)`,
                    }}
                    initial={{ width: 0 }}
                    animate={isInView ? { width: `${confidence}%` } : { width: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
