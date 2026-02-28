'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/utils';
import type { BidResponseResult } from '@/lib/analysis/quant/bid-response';
import PsychDisclaimer from '@/components/shared/PsychDisclaimer';

interface BidResponseCardProps {
  result?: BidResponseResult;
  participants: string[];
}

const PERSON_COLORS = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b'];

function rateColor(rate: number): string {
  if (rate >= 80) return 'text-emerald-400';
  if (rate >= 60) return 'text-amber-400';
  return 'text-red-400';
}

function rateHex(rate: number): string {
  if (rate >= 80) return '#10b981';
  if (rate >= 60) return '#f59e0b';
  return '#ef4444';
}

export default function BidResponseCard({ result, participants }: BidResponseCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  if (!result) return null;

  const overallRate = result.overallResponseRate;
  const entries = participants
    .filter(name => result.perPerson[name])
    .map((name, idx) => ({
      name,
      data: result.perPerson[name],
      color: PERSON_COLORS[idx % PERSON_COLORS.length],
    }));

  if (entries.length === 0) return null;

  return (
    <div ref={ref} className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
            <span className="text-lg">🤝</span>
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-syne)] text-lg font-semibold text-white">Wskaźnik &quot;Turning Toward&quot;</h3>
            <p className="text-sm text-white/50">Odpowiedzi na próby nawiązania kontaktu (Gottman, 1999)</p>
          </div>
        </div>
        <div className="text-right">
          <div
            className={cn('font-mono text-3xl font-black', rateColor(overallRate))}
            style={{ textShadow: `0 0 20px ${rateHex(overallRate)}40` }}
          >
            {overallRate}%
          </div>
          <div className="text-xs text-white/30">norma: 86%</div>
        </div>
      </div>

      {/* Overall bar vs Gottman benchmark */}
      <div className="mb-5">
        <div
          className="relative h-1.5 rounded-full bg-white/[0.04] overflow-hidden"
          style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${rateHex(overallRate)}90, ${rateHex(overallRate)})`,
              boxShadow: `0 0 8px ${rateHex(overallRate)}25`,
            }}
            initial={{ width: 0 }}
            animate={isInView ? { width: `${overallRate}%` } : { width: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          />
          {/* Gottman benchmark line */}
          <div
            className="absolute top-0 bottom-0 w-px bg-white/50"
            style={{ left: `${result.gottmanBenchmark}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-white/30">
          <span>0%</span>
          <span className="absolute" style={{ left: `${result.gottmanBenchmark}%`, transform: 'translateX(-50%)' }}>
            ← Gottman {result.gottmanBenchmark}%
          </span>
          <span>100%</span>
        </div>
        <p className="mt-2 text-xs text-white/50 leading-relaxed">{result.interpretation}</p>
      </div>

      {/* Per-person breakdown */}
      <div className="border-t border-white/[0.04] pt-4 space-y-4">
        <p className="text-xs text-white/30 uppercase tracking-wider">Per osoba</p>
        {entries.map(({ name, data, color }, i) => (
          <motion.div
            key={name}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.25 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2.5 w-2.5 rounded-[3px] flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="text-sm font-medium truncate max-w-[120px] text-white">{name}</span>
            </div>

            {/* Two sub-bars: bids success + response rate */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-28 text-xs text-white/50">Moje próby</span>
                <div
                  className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden"
                  style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${rateHex(data.bidSuccessRate)}90, ${rateHex(data.bidSuccessRate)})`,
                      boxShadow: `0 0 8px ${rateHex(data.bidSuccessRate)}25`,
                    }}
                    initial={{ width: 0 }}
                    animate={isInView ? { width: `${data.bidSuccessRate}%` } : { width: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                  />
                </div>
                <span className={cn('w-8 text-right text-xs font-mono tabular-nums', rateColor(data.bidSuccessRate))}>
                  {data.bidSuccessRate}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-28 text-xs text-white/50">Moje odpowiedzi</span>
                <div
                  className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden"
                  style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${rateHex(data.responseRate)}90, ${rateHex(data.responseRate)})`,
                      boxShadow: `0 0 8px ${rateHex(data.responseRate)}25`,
                    }}
                    initial={{ width: 0 }}
                    animate={isInView ? { width: `${data.responseRate}%` } : { width: 0 }}
                    transition={{ duration: 0.5, delay: 0.35 + i * 0.1 }}
                  />
                </div>
                <span className={cn('w-8 text-right text-xs font-mono tabular-nums', rateColor(data.responseRate))}>
                  {data.responseRate}%
                </span>
              </div>
            </div>

            <div className="mt-1 text-xs text-white/30">
              {data.bidsMade} prób → {data.turnedToward} odpowiedzi
            </div>
          </motion.div>
        ))}
      </div>

      <PsychDisclaimer
        text="'Bid' (próba nawiązania) definiowana heurystycznie: pytania, linki, disclosure starters. 'Turning toward' = odpowiedź w ciągu 4h z treścią nawiązującą do bidu. Norma Gottmana (86%) pochodzi z badań laboratoryjnych par małżeńskich, nie z analizy tekstu. Wyniki zależą od struktury rozmowy — chatboty i asynchroniczne tryby użycia mogą zafałszować wyniki."
        citation="Gottman & Silver, 1999; Driver & Gottman, 2004 (Family Process, 43(3))"
        showGenericFooter
      />
    </div>
  );
}
