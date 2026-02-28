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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay }}
      className="flex flex-col gap-3 rounded-lg border border-white/[0.04] bg-white/[0.03] p-4 border-l-2"
      style={{ borderLeftColor: color }}
    >
      <span className="text-sm font-bold" style={{ color }}>
        {person}
      </span>

      <div className="flex items-center gap-2">
        <Clock className="size-4 text-muted-foreground" />
        <span className="font-mono text-lg font-bold text-foreground">
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

  if (!bestTimeToText || !bestTimeToText.perPerson || Object.keys(bestTimeToText.perPerson).length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground">
        Brak danych do wyświetlenia
      </div>
    );
  }

  const sortedParticipants = participants.slice(0, 2);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div>
        <h3 className="font-[family-name:var(--font-syne)] text-base font-semibold text-white">
          Najlepszy czas na wiadomość
        </h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Kiedy każda osoba jest najbardziej aktywna
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
