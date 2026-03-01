'use client';

import { motion } from 'framer-motion';
import { Scene } from '@/components/analysis/eks/shared';
import type { EksResult, EksExpandedRepeatingPatterns } from '@/lib/analysis/eks-prompts';

interface PatternsSceneProps {
  repeatingPatterns: EksResult['repeatingPatterns'];
  expandedPatterns?: EksExpandedRepeatingPatterns;
}

const RISK_BADGE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  high: { bg: 'rgba(220,38,38,0.12)', border: 'rgba(220,38,38,0.25)', text: '#dc2626' },
  medium: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', text: '#f59e0b' },
  low: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)', text: '#10b981' },
};

const RISK_LABELS: Record<string, string> = {
  high: 'WYSOKIE',
  medium: 'UMIARKOWANE',
  low: 'NISKIE',
};

export default function PatternsScene({ repeatingPatterns, expandedPatterns }: PatternsSceneProps) {
  const hasExpandedPatterns =
    expandedPatterns?.perPerson &&
    Object.keys(expandedPatterns.perPerson).length > 0;

  return (
    <Scene id="eks-patterns">
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        <p
          className="text-xs uppercase tracking-[0.2em] mb-2 text-center"
          style={{ color: '#6b3a3a' }}
        >
          ostrzeżenie
        </p>
        <h3
          className="font-[family-name:var(--font-syne)] text-2xl md:text-3xl font-bold tracking-tight text-center mb-4"
          style={{ color: '#dc2626' }}
        >
          WZORCE KTÓRE POWTÓRZYSZ
        </h3>
        <p
          className="text-center text-sm mb-10 max-w-md mx-auto"
          style={{ color: '#6b3a3a' }}
        >
          Te schematy nie umarły razem z tym związkiem. Przeniesiesz je dalej.
        </p>

        <div className="space-y-8">
          {hasExpandedPatterns ? (
            /* ── V4 expanded patterns ── */
            Object.entries(expandedPatterns!.perPerson).map(([name, patterns], pi) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: pi * 0.15 }}
              >
                <h4
                  className="font-[family-name:var(--font-syne)] text-lg font-bold mb-4"
                  style={{ color: '#dc2626' }}
                >
                  {name}
                </h4>

                <div className="space-y-4">
                  {(Array.isArray(patterns) ? patterns : []).map((p, i) => {
                    const riskStyle = RISK_BADGE_COLORS[p.riskForNextRelationship] ?? RISK_BADGE_COLORS.medium;
                    const riskLabel = RISK_LABELS[p.riskForNextRelationship] ?? p.riskForNextRelationship;

                    return (
                      <div
                        key={i}
                        className="rounded-xl p-5"
                        style={{
                          background: '#1a0808',
                          border: '1px solid #2a1010',
                        }}
                      >
                        {/* Pattern name + risk badge */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-start gap-3">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="flex-shrink-0 mt-0.5" style={{ opacity: 0.5 }}>
                              <path d="M10 2a8 8 0 0 1 8 8h-2a6 6 0 0 0-6-6V2z" stroke="#991b1b" strokeWidth="1.5" fill="none" />
                              <path d="M10 18a8 8 0 0 1-8-8h2a6 6 0 0 0 6 6v2z" stroke="#991b1b" strokeWidth="1.5" fill="none" />
                              <path d="M16 10l2-2 2 2" stroke="#991b1b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                              <path d="M4 10l-2 2-2-2" stroke="#991b1b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                            </svg>
                            <p className="text-sm font-semibold" style={{ color: '#d4a07a' }}>
                              {p.name}
                            </p>
                          </div>
                          <span
                            className="flex-shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest"
                            style={{
                              background: riskStyle.bg,
                              border: `1px solid ${riskStyle.border}`,
                              color: riskStyle.text,
                            }}
                          >
                            {riskLabel}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-xs leading-relaxed mb-3" style={{ color: '#6b3a3a' }}>
                          {p.description}
                        </p>

                        {/* Origin */}
                        {p.originInThisRelationship && (
                          <div className="mb-3">
                            <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: '#4a4a4a' }}>
                              Gdzie się zaczął
                            </p>
                            <p className="text-xs leading-relaxed" style={{ color: '#6b3a3a' }}>
                              {p.originInThisRelationship}
                            </p>
                          </div>
                        )}

                        {/* Frequency in data — progress bar */}
                        {typeof p.frequencyInData === 'number' && p.frequencyInData > 0 && (
                          <div className="mb-3">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: '#4a4a4a' }}>
                                Częstotliwość w danych
                              </span>
                              <span className="font-mono text-[10px] font-bold" style={{ color: '#991b1b' }}>
                                {p.frequencyInData}x
                              </span>
                            </div>
                            <div className="h-1 rounded-full overflow-hidden" style={{ background: '#2a1010' }}>
                              <motion.div
                                className="h-full rounded-full"
                                style={{ background: '#991b1b' }}
                                initial={{ width: 0 }}
                                whileInView={{ width: `${Math.min(100, (p.frequencyInData / 20) * 100)}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8, delay: 0.3 }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Breaking strategy */}
                        {p.breakingStrategy && (
                          <div
                            className="rounded-lg px-3 py-2 mt-2"
                            style={{
                              background: 'rgba(16,185,129,0.06)',
                              border: '1px solid rgba(16,185,129,0.12)',
                            }}
                          >
                            <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: '#10b981' }}>
                              Jak to przerwać
                            </p>
                            <p className="text-xs leading-relaxed" style={{ color: '#10b981' }}>
                              {p.breakingStrategy}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))
          ) : (
            /* ── V2 fallback: original repeatingPatterns ── */
            repeatingPatterns &&
            Object.entries(repeatingPatterns).map(([name, patterns], pi) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: pi * 0.15 }}
              >
                <h4
                  className="font-[family-name:var(--font-syne)] text-lg font-bold mb-4"
                  style={{ color: '#dc2626' }}
                >
                  {name}
                </h4>

                <div className="space-y-4">
                  {(Array.isArray(patterns) ? patterns : []).map((p, i: number) => (
                    <div
                      key={i}
                      className="rounded-xl p-5"
                      style={{
                        background: '#1a0808',
                        border: '1px solid #2a1010',
                      }}
                    >
                      {/* Pattern name with loop icon */}
                      <div className="flex items-start gap-3 mb-3">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="flex-shrink-0 mt-0.5" style={{ opacity: 0.5 }}>
                          <path d="M10 2a8 8 0 0 1 8 8h-2a6 6 0 0 0-6-6V2z" stroke="#991b1b" strokeWidth="1.5" fill="none" />
                          <path d="M10 18a8 8 0 0 1-8-8h2a6 6 0 0 0 6 6v2z" stroke="#991b1b" strokeWidth="1.5" fill="none" />
                          <path d="M16 10l2-2 2 2" stroke="#991b1b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                          <path d="M4 10l-2 2-2-2" stroke="#991b1b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                        </svg>
                        <p className="text-sm font-semibold" style={{ color: '#d4a07a' }}>
                          {typeof p === 'object' && p !== null && 'pattern' in p ? (p as { pattern: string }).pattern : String(p)}
                        </p>
                      </div>

                      {typeof p === 'object' && p !== null && 'origin' in p && (
                        <div className="mb-2">
                          <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: '#4a4a4a' }}>
                            Gdzie się zaczął
                          </p>
                          <p className="text-xs leading-relaxed" style={{ color: '#6b3a3a' }}>
                            {(p as { origin: string }).origin}
                          </p>
                        </div>
                      )}

                      {typeof p === 'object' && p !== null && 'nextRelationshipRisk' in p && (
                        <div
                          className="rounded-lg px-3 py-2 mt-2"
                          style={{
                            background: 'rgba(153,27,27,0.08)',
                            border: '1px solid rgba(153,27,27,0.15)',
                          }}
                        >
                          <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: '#991b1b' }}>
                            Ryzyko w następnym związku
                          </p>
                          <p className="text-xs leading-relaxed" style={{ color: '#dc2626' }}>
                            {(p as { nextRelationshipRisk: string }).nextRelationshipRisk}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </Scene>
  );
}
