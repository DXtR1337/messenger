'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, AlertTriangle, Shield, Scale } from 'lucide-react';
import type { CourtResult, CourtCharge, PersonVerdict } from '@/lib/analysis/court-prompts';

interface CourtVerdictProps {
  result: CourtResult;
}

function SeverityBadge({ severity }: { severity: CourtCharge['severity'] }) {
  const configs: Record<string, { label: string; bg: string; text: string; border: string }> = {
    wykroczenie: { label: 'WYKROCZENIE', bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
    występek: { label: 'WYSTĘPEK', bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
    zbrodnia: { label: 'ZBRODNIA', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  };
  const config = configs[severity] ?? configs.wykroczenie;

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[0.6rem] font-bold uppercase tracking-widest ${config.bg} ${config.text} ${config.border}`}>
      {config.label}
    </span>
  );
}

function VerdictBadge({ verdict }: { verdict: PersonVerdict['verdict'] }) {
  const configs: Record<string, { label: string; bg: string; text: string; border: string }> = {
    winny: { label: 'WINNY', bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
    niewinny: { label: 'NIEWINNY', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    warunkowo: { label: 'WARUNKOWO', bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  };
  const config = configs[verdict] ?? configs.warunkowo;

  return (
    <span className={`inline-flex items-center rounded-md border px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest ${config.bg} ${config.text} ${config.border}`}>
      {config.label}
    </span>
  );
}

function CollapsibleSection({ title, icon, children, defaultOpen = false }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-[#1a1a1a] bg-[#0d0d0d]">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-[#111111]"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#fafafa]">{title}</span>
        </div>
        {open ? <ChevronUp className="size-4 text-[#555555]" /> : <ChevronDown className="size-4 text-[#555555]" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[#1a1a1a] p-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChargeCard({ charge, index }: { charge: CourtCharge; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.1 }}
      className="rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] p-4"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="font-mono text-[0.6rem] font-bold tracking-wider text-[#555555]">{charge.id.toUpperCase()}</span>
            <SeverityBadge severity={charge.severity} />
          </div>
          <h4 className="text-sm font-bold text-[#fafafa]">{charge.charge}</h4>
          <p className="mt-1 font-mono text-[0.6rem] tracking-wide text-[#555555]">{charge.article}</p>
        </div>
      </div>
      <p className="mb-3 font-mono text-[0.65rem] text-[#888888]">
        Oskarżony: <span className="font-bold text-[#fafafa]">{charge.defendant}</span>
      </p>
      {Array.isArray(charge.evidence) && charge.evidence.length > 0 && (
        <div className="space-y-1.5">
          <p className="font-mono text-[0.55rem] font-bold uppercase tracking-[0.15em] text-[#555555]">DOWODY</p>
          {charge.evidence.map((ev, i) => (
            <div key={i} className="rounded border border-[#1a1a1a] bg-[#080808] px-3 py-2">
              <p className="text-xs leading-relaxed text-[#888888]">&ldquo;{ev}&rdquo;</p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function PersonVerdictCard({ personVerdict }: { personVerdict: PersonVerdict }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-display text-base font-bold text-[#fafafa]">{personVerdict.name}</h4>
        <VerdictBadge verdict={personVerdict.verdict} />
      </div>
      <div className="space-y-3">
        <div>
          <span className="font-mono text-[0.55rem] font-bold uppercase tracking-[0.15em] text-[#555555]">ZARZUT</span>
          <p className="mt-0.5 text-sm text-[#fafafa]">{personVerdict.mainCharge}</p>
        </div>
        <div>
          <span className="font-mono text-[0.55rem] font-bold uppercase tracking-[0.15em] text-[#555555]">KARA</span>
          <p className="mt-0.5 font-mono text-sm font-semibold text-amber-400">{personVerdict.sentence}</p>
        </div>
        <div className="mt-3 rounded border border-[#1a1a1a] bg-[#080808] px-3 py-2">
          <p className="text-xs leading-relaxed text-[#555555]">{personVerdict.funFact}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function CourtVerdictDisplay({ result }: CourtVerdictProps) {
  // Defensive: Gemini might return malformed data
  const charges = Array.isArray(result?.charges) ? result.charges : [];
  const perPersonEntries = result?.perPerson && typeof result.perPerson === 'object'
    ? Object.values(result.perPerson).filter(Boolean)
    : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-[#111111] to-[#0a0a0a] p-6 text-center">
        <p className="mb-2 font-mono text-[0.6rem] font-bold uppercase tracking-[0.25em] text-amber-400/60">
          {result?.courtName ?? 'SĄD OKRĘGOWY DS. EMOCJONALNYCH I OBYCZAJOWYCH'}
        </p>
        <h3 className="font-mono text-xl font-bold tracking-wide text-[#fafafa]">{result?.caseNumber ?? 'SPRAWA'}</h3>
        <div className="mx-auto mt-3 h-px w-16 bg-amber-500/20" />
      </div>

      {/* Charges */}
      {charges.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 font-mono text-[0.65rem] font-bold uppercase tracking-[0.15em] text-[#888888]">
            <AlertTriangle className="size-3.5 text-red-400" />
            ZARZUTY ({charges.length})
          </h3>
          {charges.map((charge, i) => (
            <ChargeCard key={charge.id ?? i} charge={charge} index={i} />
          ))}
        </div>
      )}

      {/* Prosecution */}
      {result?.prosecution && (
        <CollapsibleSection
          title="MOWA OSKARŻYCIELA"
          icon={<AlertTriangle className="size-3.5 text-red-400" />}
          defaultOpen
        >
          <p className="text-sm leading-relaxed text-[#888888]">{result.prosecution}</p>
        </CollapsibleSection>
      )}

      {/* Defense */}
      {result?.defense && (
        <CollapsibleSection
          title="MOWA OBROŃCY"
          icon={<Shield className="size-3.5 text-emerald-400" />}
        >
          <p className="text-sm leading-relaxed text-[#888888]">{result.defense}</p>
        </CollapsibleSection>
      )}

      {/* Verdict */}
      {result?.verdict && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent p-6"
        >
          <div className="mb-4 flex items-center gap-2">
            <Scale className="size-4 text-amber-400" />
            <h3 className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.2em] text-amber-400">WYROK</h3>
          </div>
          <p className="mb-3 text-base font-bold leading-snug text-[#fafafa]">{result.verdict.summary}</p>
          <p className="text-sm leading-relaxed text-[#888888]">{result.verdict.reasoning}</p>
        </motion.div>
      )}

      {/* Per-person verdicts */}
      {perPersonEntries.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.15em] text-[#888888]">
            WYROKI INDYWIDUALNE
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {perPersonEntries.map((pv) => (
              <PersonVerdictCard key={pv.name} personVerdict={pv} />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
