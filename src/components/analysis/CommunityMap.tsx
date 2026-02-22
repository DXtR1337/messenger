'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link2, CheckCircle2 } from 'lucide-react';
import type { Community } from '@/lib/analysis/team-roles';
import { getPersonColor } from './PersonNavigator';
import { cn } from '@/lib/utils';

interface CommunityMapProps {
  communities: Community[];
  participants: string[];
}

const COMMUNITY_COLORS = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ef4444'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
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

export default function CommunityMap({ communities, participants }: CommunityMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  if (communities.length === 0) return null;

  const isSingleCommunity = communities.length === 1;

  return (
    <div ref={ref} className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="px-5 pt-4">
        <h3 className="font-display text-[15px] font-bold text-foreground">
          Podgrupy i koalicje
        </h3>
        <p className="mt-0.5 text-xs text-text-muted">
          {isSingleCommunity
            ? 'Struktura społeczna grupy'
            : `${communities.length} wykryte podgrupy w konwersacji`}
        </p>
      </div>

      {isSingleCommunity ? (
        <motion.div
          className="px-5 py-4"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Jedna zintegrowana grupa
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Wszyscy uczestnicy tworzą spójną społeczność bez wyraźnych podziałów
              </p>
            </div>
          </div>

          {/* Show member chips even for single community */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {communities[0].members.map((member) => {
              const idx = participants.indexOf(member);
              const safeIdx = idx >= 0 ? idx : 0;
              const color = getPersonColor(safeIdx);

              return (
                <span
                  key={member}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium"
                  style={{ color }}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {member}
                </span>
              );
            })}
          </div>
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          {communities.map((community, cIdx) => {
            const communityColor = COMMUNITY_COLORS[cIdx % COMMUNITY_COLORS.length];

            return (
              <motion.div
                key={community.label}
                variants={cardVariants}
                className="rounded-lg border bg-background p-3"
                style={{ borderLeftColor: communityColor, borderLeftWidth: 3 }}
              >
                {/* Community header */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">
                    {community.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Spójność: {community.cohesion}%
                  </span>
                </div>

                {/* Member chips */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {community.members.map((member) => {
                    const idx = participants.indexOf(member);
                    const safeIdx = idx >= 0 ? idx : 0;
                    const color = getPersonColor(safeIdx);
                    const isBridge = community.bridgePerson === member;

                    return (
                      <span
                        key={member}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                          isBridge
                            ? 'border-amber-500/40 bg-amber-500/10'
                            : 'border-border'
                        )}
                        style={{ color }}
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        {member}
                        {isBridge && (
                          <Link2 className="ml-0.5 size-3 text-amber-500" />
                        )}
                      </span>
                    );
                  })}
                </div>

                {/* Bridge person callout */}
                {community.bridgePerson && (
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-500/80">
                    <Link2 className="size-3" />
                    <span>
                      <span className="font-medium">{community.bridgePerson}</span>
                      {' — łącznik między podgrupami'}
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
