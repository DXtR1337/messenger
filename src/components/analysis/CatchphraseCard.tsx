'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import type { CatchphraseResult } from '@/lib/parsers/types';

interface CatchphraseCardProps {
  catchphrases: CatchphraseResult;
  participants: string[];
}

const PERSON_COLORS = ['#3b82f6', '#a855f7'];

function PersonCatchphrases({
  person,
  entries,
  colorIndex,
  delay,
}: {
  person: string;
  entries: Array<{ phrase: string; count: number; uniqueness: number }>;
  colorIndex: number;
  delay: number;
}) {
  const color = PERSON_COLORS[colorIndex % PERSON_COLORS.length];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay }}
      className="flex flex-col gap-3"
    >
      <span className="text-sm font-bold" style={{ color }}>
        {person}
      </span>

      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Brak powtarzających się fraz
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {entries.map((entry, index) => (
            <motion.div
              key={entry.phrase}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: delay + index * 0.05 }}
              className="rounded-lg bg-white/[0.03] px-3 py-2"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[15px] font-medium"
                  style={{ color }}
                >
                  &ldquo;{entry.phrase}&rdquo;
                </span>
                {entry.uniqueness > 0.8 && (
                  <Sparkles className="size-3.5 text-amber-400" />
                )}
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">
                {entry.count} razy
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function CatchphraseCard({
  catchphrases,
  participants,
}: CatchphraseCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  const sortedParticipants = participants.slice(0, 2);

  const hasAnyCatchphrases = sortedParticipants.some(
    (person) => (catchphrases.perPerson[person]?.length ?? 0) > 0,
  );

  if (!hasAnyCatchphrases) return null;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div>
        <h3 className="font-[family-name:var(--font-syne)] text-base font-semibold text-white">
          Ulubione frazy
        </h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Unikalne, powtarzające się frazy każdej osoby
        </p>

        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          {sortedParticipants.map((person, index) => (
            <PersonCatchphrases
              key={person}
              person={person}
              entries={catchphrases.perPerson[person] ?? []}
              colorIndex={index}
              delay={index * 0.15}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
