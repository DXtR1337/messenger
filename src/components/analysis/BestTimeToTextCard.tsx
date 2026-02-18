'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Clock } from 'lucide-react';
import type { BestTimeToText } from '@/lib/parsers/types';

interface BestTimeToTextCardProps {
  bestTimeToText: BestTimeToText;
  participants: string[];
}

const PERSON_COLORS = ['#3b82f6', '#a855f7'];

function PersonTimeColumn({
  person,
  data,
  colorIndex,
  delay,
}: {
  person: string;
  data: { bestDay: string; bestHour: number; bestWindow: string; avgResponseMs: number };
  colorIndex: number;
  delay: number;
}) {
  const color = PERSON_COLORS[colorIndex % PERSON_COLORS.length];

  const formatHour = (hour: number): string => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4"
    >
      <span className="text-sm font-bold" style={{ color }}>
        {person}
      </span>

      <div className="flex items-center gap-2">
        <Clock className="size-4 text-muted-foreground" />
        <span className="text-sm text-foreground">
          {data.bestWindow}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Najaktywniejszy dzień</span>
          <span className="font-mono font-medium text-foreground">
            {data.bestDay}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Szczyt aktywności</span>
          <span className="font-mono font-medium text-foreground">
            {formatHour(data.bestHour)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function BestTimeToTextCard({
  bestTimeToText,
  participants,
}: BestTimeToTextCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  const sortedParticipants = participants.slice(0, 2);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
    >
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="px-5 pt-4">
          <h3 className="font-display text-[15px] font-bold">
            Najlepszy czas na wiadomość
          </h3>
          <p className="mt-0.5 text-xs text-text-muted">
            Kiedy każda osoba jest najbardziej aktywna
          </p>
        </div>

        <div className="grid gap-3 px-5 py-4 sm:grid-cols-2">
          {sortedParticipants.map((person, index) => {
            const data = bestTimeToText.perPerson[person];
            if (!data) return null;

            return (
              <PersonTimeColumn
                key={person}
                person={person}
                data={data}
                colorIndex={index}
                delay={index * 0.1}
              />
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
