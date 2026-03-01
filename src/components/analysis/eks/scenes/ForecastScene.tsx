'use client';

import { motion } from 'framer-motion';
import { Scene } from '@/components/analysis/eks/shared';
import type { EksResult } from '@/lib/analysis/eks-prompts';

interface ForecastSceneProps {
  postBreakupForecast: EksResult['postBreakupForecast'];
}

export default function ForecastScene({ postBreakupForecast }: ForecastSceneProps) {
  return (
    <Scene id="eks-forecast">
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        <p
          className="text-xs uppercase tracking-[0.2em] mb-2 text-center"
          style={{ color: '#6b3a3a' }}
        >
          prognoza
        </p>
        <h3
          className="font-[family-name:var(--font-syne)] text-2xl md:text-3xl font-bold tracking-tight text-center mb-10"
          style={{ color: '#dc2626' }}
        >
          PROGNOZA PO ROZSTANIU
        </h3>

        {postBreakupForecast && (
          <>
            {/* Will they come back percentage */}
            <div className="text-center mb-8">
              <p
                className="font-mono text-[10px] uppercase tracking-widest mb-3"
                style={{ color: '#4a4a4a' }}
              >
                Prawdopodobieństwo powrotu
              </p>
              <motion.p
                className="font-[family-name:var(--font-syne)] text-6xl md:text-8xl font-extrabold eks-scroll-scale-in"
                style={{ color: '#dc2626' }}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, type: 'spring' }}
              >
                {postBreakupForecast.willTheyComeBack}%
              </motion.p>
            </div>

            {/* Reasoning */}
            {postBreakupForecast.comeBackReasoning && (
              <div
                className="rounded-xl p-5 md:p-6 mb-8 max-w-lg mx-auto"
                style={{
                  background: '#1a0808',
                  border: '1px solid #2a1010',
                }}
              >
                <p className="text-sm leading-relaxed" style={{ color: '#d4a07a' }}>
                  {postBreakupForecast.comeBackReasoning}
                </p>
              </div>
            )}

            {/* Per-person cards */}
            {postBreakupForecast.perPerson && (
              <div className="grid gap-6 md:grid-cols-2">
                {Object.entries(postBreakupForecast.perPerson).map(
                  ([name, data], i) => (
                    <motion.div
                      key={name}
                      className="rounded-xl p-5"
                      style={{
                        background: '#1a0808',
                        border: '1px solid #2a1010',
                      }}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: i * 0.15 }}
                    >
                      <h4
                        className="font-[family-name:var(--font-syne)] text-lg font-bold mb-4"
                        style={{ color: '#dc2626' }}
                      >
                        {name}
                      </h4>

                      <div className="space-y-3">
                        {/* Rebound risk */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: '#4a4a4a' }}>
                              Ryzyko rebound
                            </span>
                            <span className="font-mono text-xs font-bold" style={{ color: '#f59e0b' }}>
                              {data.reboundRisk}%
                            </span>
                          </div>
                          <div className="h-1 rounded-full overflow-hidden" style={{ background: '#2a1010' }}>
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${data.reboundRisk}%`,
                                background: '#f59e0b',
                              }}
                            />
                          </div>
                        </div>

                        {/* Growth potential */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: '#4a4a4a' }}>
                              Potencjal wzrostu
                            </span>
                            <span className="font-mono text-xs font-bold" style={{ color: '#10b981' }}>
                              {data.growthPotential}%
                            </span>
                          </div>
                          <div className="h-1 rounded-full overflow-hidden" style={{ background: '#2a1010' }}>
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${data.growthPotential}%`,
                                background: '#10b981',
                              }}
                            />
                          </div>
                        </div>

                        {/* Next relationship prediction */}
                        {data.nextRelationshipPrediction && (
                          <div className="mt-3 pt-3" style={{ borderTop: '1px solid #2a1010' }}>
                            <p
                              className="font-mono text-[10px] uppercase tracking-widest mb-1"
                              style={{ color: '#4a4a4a' }}
                            >
                              Następny związek
                            </p>
                            <p className="text-xs leading-relaxed" style={{ color: '#6b3a3a' }}>
                              {data.nextRelationshipPrediction}
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ),
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Scene>
  );
}
