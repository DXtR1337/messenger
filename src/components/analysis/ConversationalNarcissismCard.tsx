'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/utils';
import type { ShiftSupportResult } from '@/lib/analysis/quant/shift-support';
import PsychDisclaimer from '@/components/shared/PsychDisclaimer';

interface ConversationalNarcissismCardProps {
  result?: ShiftSupportResult;
  participants: string[];
}

const PERSON_COLORS = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b'];

function cniLabel(cni: number): string {
  if (cni >= 70) return 'Wysoki CNI';
  if (cni >= 45) return 'Umiarkowany';
  return 'Niski CNI';
}

function cniColor(cni: number): string {
  if (cni >= 70) return 'text-red-400';
  if (cni >= 45) return 'text-amber-400';
  return 'text-emerald-400';
}

function cniHex(cni: number): string {
  if (cni >= 70) return '#ef4444';
  if (cni >= 45) return '#f59e0b';
  return '#10b981';
}

export default function ConversationalNarcissismCard({
  result,
  participants,
}: ConversationalNarcissismCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  if (!result) return null;

  const entries = participants
    .filter(name => result.perPerson[name])
    .map((name, idx) => ({ name, data: result.perPerson[name], color: PERSON_COLORS[idx % PERSON_COLORS.length] }));

  if (entries.length === 0) return null;

  return (
    <div ref={ref} className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10">
            <span className="text-lg">🪞</span>
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-syne)] text-lg font-semibold text-white">Konwersacyjny narcyzm</h3>
            <p className="text-sm text-white/50">Shift-response vs support-response (Derber, 1979)</p>
          </div>
        </div>
        {result.cniGap > 15 && (
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.03] text-amber-400">
            gap {result.cniGap}pkt
          </span>
        )}
      </div>

      {/* Per-person gauges */}
      <div className="space-y-4">
        {entries.map(({ name, data, color }, i) => (
          <motion.div
            key={name}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Name + CNI score */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: color }} />
                <span className="text-sm font-medium truncate max-w-[140px] text-white">{name}</span>
                <span className={cn('bg-white/[0.04] border border-white/[0.03] rounded px-2 py-0.5 text-xs font-medium', cniColor(data.cni))}>
                  {cniLabel(data.cni)}
                </span>
              </div>
              <span
                className={cn('font-mono text-3xl font-black tabular-nums', cniColor(data.cni))}
                style={{ textShadow: `0 0 20px ${cniHex(data.cni)}40` }}
              >
                {data.cni}
              </span>
            </div>

            {/* CNI bar */}
            <div
              className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden"
              style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${cniHex(data.cni)}90, ${cniHex(data.cni)})`,
                  boxShadow: `0 0 8px ${cniHex(data.cni)}25`,
                }}
                initial={{ width: 0 }}
                animate={isInView ? { width: `${data.cni}%` } : { width: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
              />
            </div>

            {/* Shift / Support breakdown */}
            <div className="mt-2 flex items-center gap-4 text-xs text-white/50">
              <span>
                Shift:{' '}
                <span className="text-red-400 font-mono font-semibold">{data.shiftCount}</span>
              </span>
              <span>
                Support:{' '}
                <span className="text-emerald-400 font-mono font-semibold">{data.supportCount}</span>
              </span>
              <span className="ml-auto">
                wskaźnik:{' '}
                <span className="text-white font-mono font-semibold">{(data.shiftRatio * 100).toFixed(0)}%</span>
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <div className="border-t border-white/[0.04] pt-4 mt-4 grid grid-cols-2 gap-2 text-xs text-white/50">
        <div>
          <span className="text-red-400 font-medium">Shift-response</span>: przekierowuje na siebie
        </div>
        <div>
          <span className="text-emerald-400 font-medium">Support-response</span>: pogłębia temat partnera
        </div>
      </div>

      <PsychDisclaimer
        text="Wskaźnik CNI oparty na heurystykach leksykalnych (overlap słów, pytania, self-start tokens) — nie zastępuje pełnej analizy dyskursu. Konstrukt potwierdzony w 6 badaniach Vangelisti, Knapp & Daly (1990), ale oryginalnie dla rozmów twarzą w twarz. Wyniki indykatywne, nie diagnostyczne."
        citation="Derber, 1979; Vangelisti, Knapp & Daly, 1990 (Communication Monographs, 57(4))"
        showGenericFooter
      />
    </div>
  );
}
