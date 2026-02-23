'use client';

import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Check, X, ChevronDown } from 'lucide-react';

interface ComparisonRow {
  feature: string;
  free: string | boolean;
  pro: string | boolean;
  unlimited: string | boolean;
}

const COMPARISON: ComparisonRow[] = [
  { feature: 'Analizy / miesiąc', free: '3', pro: '10', unlimited: 'Bez limitu' },
  { feature: 'Analiza ilościowa (60+ metryk)', free: true, pro: true, unlimited: true },
  { feature: 'AI Pass 1 — Przegląd', free: true, pro: true, unlimited: true },
  { feature: 'AI Pass 2 — Dynamika relacji', free: false, pro: true, unlimited: true },
  { feature: 'AI Pass 3 — Profile osobowości', free: false, pro: true, unlimited: true },
  { feature: 'AI Pass 4 — Synteza + Health Score', free: false, pro: true, unlimited: true },
  { feature: 'Enhanced Roast', free: false, pro: true, unlimited: true },
  { feature: 'Stand-Up Comedy Roast (7 aktów)', free: false, pro: true, unlimited: true },
  { feature: 'Twój Chat w Sądzie (Court Trial)', free: false, pro: true, unlimited: true },
  { feature: 'Honest Dating Profile', free: false, pro: true, unlimited: true },
  { feature: 'Reply Simulator', free: false, pro: true, unlimited: true },
  { feature: 'Translator Podtekstów (Subtext)', free: false, pro: true, unlimited: true },
  { feature: 'CPS Screener (63 pytania)', free: false, pro: true, unlimited: true },
  { feature: 'Delusion Quiz', free: true, pro: true, unlimited: true },
  { feature: 'Share Cards', free: '3/mies', pro: 'Bez limitu', unlimited: 'Bez limitu' },
  { feature: 'Export PDF', free: false, pro: true, unlimited: true },
  { feature: 'Story / Wrapped Mode', free: false, pro: true, unlimited: true },
  { feature: 'Discord Import', free: false, pro: true, unlimited: true },
  { feature: 'Priorytetowe AI (szybsza kolejka)', free: false, pro: false, unlimited: true },
  { feature: 'Wczesny dostęp do nowości', free: false, pro: false, unlimited: true },
];

function CellValue({ value }: { value: string | boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className="mx-auto size-4 text-[#10b981]" />
    ) : (
      <X className="mx-auto size-4 text-[#555555]" />
    );
  }
  return (
    <span className="font-mono text-xs font-medium text-foreground">{value}</span>
  );
}

export default function PricingComparison() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section ref={ref} className="mx-auto max-w-4xl px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.5 }}
      >
        {/* Mobile: collapsible header */}
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex w-full items-center justify-between"
          >
            <div className="text-left">
              <p className="mb-2 font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground">
                SZCZEGÓŁOWE PORÓWNANIE
              </p>
              <h2 className="font-story-display text-xl font-bold tracking-tight text-foreground">
                Porównaj plany
              </h2>
            </div>
            <motion.span
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              className="shrink-0 text-muted-foreground"
            >
              <ChevronDown className="size-5" />
            </motion.span>
          </button>

          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <ComparisonTable />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Desktop: always visible */}
        <div className="hidden lg:block">
          <div>
            <p className="mb-2 font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground">
              SZCZEGÓŁOWE PORÓWNANIE
            </p>
            <h2 className="font-story-display text-xl font-bold tracking-tight text-foreground">
              Porównaj plany
            </h2>
          </div>
          <ComparisonTable />
        </div>
      </motion.div>
    </section>
  );
}

function ComparisonTable() {
  return (
    <div className="mt-8 overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-[#1a1a1a]">
            <th className="pb-4 pr-4 text-sm font-medium text-muted-foreground">
              Funkcja
            </th>
            <th className="pb-4 text-center text-sm font-medium text-muted-foreground">
              Darmowy
            </th>
            <th className="pb-4 text-center text-sm font-medium text-[#a855f7]">
              Pro
            </th>
            <th className="pb-4 text-center text-sm font-medium text-[#3b82f6]">
              Unlimited
            </th>
          </tr>
        </thead>
        <tbody>
          {COMPARISON.map((row, i) => (
            <tr
              key={row.feature}
              className={`border-b border-[#1a1a1a]/50 transition-colors hover:bg-[#111111] ${
                i % 2 === 0 ? 'bg-transparent' : 'bg-[#0a0a0a]'
              }`}
            >
              <td className="py-3 pr-4 text-sm text-foreground">{row.feature}</td>
              <td className="py-3 text-center">
                <CellValue value={row.free} />
              </td>
              <td className="py-3 text-center">
                <CellValue value={row.pro} />
              </td>
              <td className="py-3 text-center">
                <CellValue value={row.unlimited} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
