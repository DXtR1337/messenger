'use client';

import { useState, useMemo } from 'react';
import { Users } from 'lucide-react';
import type { QuantitativeAnalysis } from '@/lib/parsers/types';
import { getPersonColor } from './PersonNavigator';

interface ParticipantPickerProps {
  participants: string[];
  quantitative: QuantitativeAnalysis;
  onPairSelected: (pair: [string, string]) => void;
}

export default function ParticipantPicker({
  participants,
  quantitative,
  onPairSelected,
}: ParticipantPickerProps) {
  const sorted = useMemo(
    () =>
      [...participants].sort(
        (a, b) =>
          (quantitative.perPerson[b]?.totalMessages ?? 0) -
          (quantitative.perPerson[a]?.totalMessages ?? 0),
      ),
    [participants, quantitative],
  );

  const [personA, setPersonA] = useState(sorted[0] ?? '');
  const [personB, setPersonB] = useState(sorted[1] ?? '');

  const indexA = sorted.indexOf(personA);
  const indexB = sorted.indexOf(personB);
  const colorA = getPersonColor(indexA >= 0 ? indexA : 0);
  const colorB = getPersonColor(indexB >= 0 ? indexB : 1);

  const handleA = (name: string) => {
    setPersonA(name);
    onPairSelected([name, personB]);
  };

  const handleB = (name: string) => {
    setPersonB(name);
    onPairSelected([personA, name]);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Users className="size-4 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Wybierz parę do kart
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <div
            className="size-2.5 shrink-0 rounded-full"
            style={{ background: colorA }}
          />
          <select
            value={personA}
            onChange={(e) => handleA(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-sm text-foreground outline-none transition-colors hover:border-border-hover focus:border-blue-500"
          >
            {sorted.map((name) => (
              <option key={name} value={name} disabled={name === personB}>
                {name} ({quantitative.perPerson[name]?.totalMessages ?? 0} msg)
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs font-bold text-muted-foreground">VS</span>

        <div className="flex items-center gap-2">
          <div
            className="size-2.5 shrink-0 rounded-full"
            style={{ background: colorB }}
          />
          <select
            value={personB}
            onChange={(e) => handleB(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-sm text-foreground outline-none transition-colors hover:border-border-hover focus:border-purple-500"
          >
            {sorted.map((name) => (
              <option key={name} value={name} disabled={name === personA}>
                {name} ({quantitative.perPerson[name]?.totalMessages ?? 0} msg)
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
