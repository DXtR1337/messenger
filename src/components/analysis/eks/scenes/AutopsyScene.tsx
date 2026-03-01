'use client';

import { motion } from 'framer-motion';
import { Scene, toArr, EKGDivider } from '@/components/analysis/eks/shared';
import ScrollReveal from '@/components/analysis/eks/ScrollReveal';
import type { EksResult } from '@/lib/analysis/eks-prompts';

interface AutopsySceneProps {
  causeOfDeath: EksResult['causeOfDeath'];
}

export default function AutopsyScene({ causeOfDeath }: AutopsySceneProps) {
  return (
    <>
      <Scene id="eks-cause-of-death">
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          <p
            className="text-xs uppercase tracking-[0.2em] mb-2 text-center"
            style={{ color: '#6b3a3a' }}
          >
            diagnoza
          </p>
          <h3
            className="font-[family-name:var(--font-syne)] text-2xl md:text-3xl font-bold tracking-tight text-center mb-10"
            style={{ color: '#dc2626' }}
          >
            RAPORT Z SEKCJI
          </h3>

          {causeOfDeath && (
            <div
              className="rounded-xl p-6 md:p-8"
              style={{
                background: '#1a0808',
                border: '1px solid #2a1010',
              }}
            >
              {/* Primary cause */}
              <div className="mb-6">
                <p
                  className="font-mono text-[10px] uppercase tracking-widest mb-2"
                  style={{ color: '#991b1b' }}
                >
                  Przyczyna śmierci
                </p>
                <p
                  className="font-[family-name:var(--font-syne)] text-xl md:text-2xl font-bold leading-tight"
                  style={{ color: '#dc2626' }}
                >
                  {causeOfDeath.primary}
                </p>
              </div>

              {/* Divider */}
              <div className="h-px w-full mb-6" style={{ background: '#2a1010' }} />

              {/* Contributing factors */}
              {causeOfDeath.contributingFactors?.length > 0 && (
                <div className="mb-6">
                  <p
                    className="font-mono text-[10px] uppercase tracking-widest mb-3"
                    style={{ color: '#4a4a4a' }}
                  >
                    Czynniki współdziałające
                  </p>
                  <ul className="space-y-2">
                    {toArr(causeOfDeath.contributingFactors).map((factor: string, i: number) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm"
                        style={{ color: '#d4a07a' }}
                      >
                        <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#991b1b' }} />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Divider */}
              <div className="h-px w-full mb-6" style={{ background: '#2a1010' }} />

              {/* Preventability verdict — dramatic deblur reveal */}
              <ScrollReveal blur={12} offsetY={0} threshold={0.5}>
                <div className="text-center">
                  <p
                    className="font-mono text-[10px] uppercase tracking-widest mb-4"
                    style={{ color: '#4a4a4a' }}
                  >
                    Czy można było temu zapobiec?
                  </p>
                  <motion.p
                    className="font-[family-name:var(--font-syne)] text-4xl md:text-5xl font-extrabold mb-4"
                    style={{
                      color: causeOfDeath.wasItPreventable ? '#10b981' : '#991b1b',
                    }}
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, type: 'spring' }}
                  >
                    {causeOfDeath.wasItPreventable ? 'TAK' : 'NIE'}
                  </motion.p>
                {causeOfDeath.preventabilityReasoning && (
                  <p
                    className="text-sm leading-relaxed max-w-lg mx-auto"
                    style={{ color: '#6b3a3a' }}
                  >
                    {causeOfDeath.preventabilityReasoning}
                  </p>
                )}
                </div>
              </ScrollReveal>
            </div>
          )}
        </div>
      </Scene>
      <EKGDivider />
    </>
  );
}
