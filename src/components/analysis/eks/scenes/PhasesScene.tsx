'use client';

import { motion } from 'framer-motion';
import { Scene, toArr, getPhaseColor, PHASE_COLORS } from '@/components/analysis/eks/shared';
import type { EksPhase } from '@/lib/analysis/eks-prompts';

export default function PhasesScene({
  phases,
  sceneRef,
}: {
  phases: EksPhase[];
  sceneRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <Scene id="eks-phases">
      <div ref={sceneRef} className="max-w-3xl mx-auto px-4 md:px-6">
        <p
          className="text-xs uppercase tracking-[0.2em] mb-2 text-center"
          style={{ color: '#6b3a3a' }}
        >
          preparaty mikroskopowe
        </p>
        <h3
          className="font-[family-name:var(--font-syne)] text-2xl md:text-3xl font-bold tracking-tight text-center mb-12"
          style={{ color: '#dc2626' }}
        >
          FAZY ROZPADU
        </h3>

        {/* Vertical timeline */}
        <div className="relative">
          {/* Vertical connecting line — scroll-animated look */}
          <div
            className="absolute left-4 md:left-6 top-0 bottom-0 w-px"
            style={{
              background: `linear-gradient(to bottom, ${PHASE_COLORS[0]}, ${PHASE_COLORS[1]}, ${PHASE_COLORS[2]}, ${PHASE_COLORS[3]}, ${PHASE_COLORS[4]})`,
            }}
          />

          <div className="space-y-8 eks-phase-stagger">
            {(Array.isArray(phases) ? phases : []).map((phase: EksPhase, i: number) => {
              const phaseColor = getPhaseColor(i, phases.length);
              return (
                <motion.div
                  key={i}
                  className="relative pl-12 md:pl-16"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                >
                  {/* Timeline dot */}
                  <div
                    className="absolute left-2.5 md:left-4.5 top-2 w-3 h-3 rounded-full border-2"
                    style={{
                      borderColor: phaseColor,
                      background: `${phaseColor}40`,
                      boxShadow: `0 0 8px ${phaseColor}30`,
                    }}
                  />

                  {/* Phase card — frosted glass specimen slide */}
                  <div
                    className="eks-specimen-card rounded-xl p-5 md:p-6"
                    style={{
                      background: 'rgba(26, 8, 8, 0.6)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: `1px solid ${phaseColor}25`,
                      boxShadow: `inset 0 1px 0 ${phaseColor}10, 0 0 20px ${phaseColor}08`,
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <h4
                        className="font-[family-name:var(--font-syne)] text-lg font-bold"
                        style={{ color: phaseColor }}
                      >
                        {phase.name}
                      </h4>
                      <span
                        className="font-mono text-[10px] uppercase tracking-widest"
                        style={{ color: '#4a4a4a' }}
                      >
                        {phase.periodStart} &mdash; {phase.periodEnd}
                      </span>
                    </div>

                    <p
                      className="text-sm leading-relaxed mb-4"
                      style={{ color: '#d4a07a' }}
                    >
                      {phase.description}
                    </p>

                    {/* Symptoms */}
                    {toArr(phase.symptoms).length > 0 && (
                      <div className="mb-4">
                        <p
                          className="font-mono text-[10px] uppercase tracking-widest mb-2"
                          style={{ color: '#4a4a4a' }}
                        >
                          Objawy
                        </p>
                        <ul className="space-y-1">
                          {toArr(phase.symptoms).map((symptom: string, si: number) => (
                            <li
                              key={si}
                              className="flex items-start gap-2 text-xs"
                              style={{ color: '#6b3a3a' }}
                            >
                              <span style={{ color: phaseColor }}>&#8226;</span>
                              {symptom}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Key quotes — intercepted transmissions */}
                    {toArr(phase.keyQuotes).length > 0 && (
                      <div className="space-y-2">
                        {toArr(phase.keyQuotes).map((quote: string, qi: number) => (
                          <div
                            key={qi}
                            className="rounded-lg px-3 py-2 text-xs font-mono"
                            style={{
                              background: `${phaseColor}06`,
                              borderLeft: `2px solid ${phaseColor}40`,
                              color: '#d4a07a',
                            }}
                          >
                            <span style={{ color: phaseColor, opacity: 0.6, fontSize: '0.6rem', letterSpacing: '0.1em' }}>
                              [PRZECHWYCONO]{' '}
                            </span>
                            <span className="italic">&ldquo;{quote}&rdquo;</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </Scene>
  );
}
